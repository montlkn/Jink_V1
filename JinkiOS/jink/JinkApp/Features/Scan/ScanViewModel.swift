import Foundation
import UIKit
import CoreLocation

@Observable
final class ScanViewModel {
    var isScanning = false
    var scanResult: ScanAPIResponse? = nil
    var errorMessage: String? = nil
    var showResult = false
    
    // New state properties
    var loadingMessage = ""
    var notFound = false
    var scanPhoto: UIImage? = nil
    var showRetryButton = false

    let locationService: LocationService

    init(locationService: LocationService) {
        self.locationService = locationService
    }

    func scan(image: UIImage, userId: String) async {
        guard let location = locationService.location else {
            errorMessage = "Waiting for GPS…"
            return
        }

        self.scanPhoto = image
        isScanning = true
        errorMessage = nil
        notFound = false
        showRetryButton = false
        loadingMessage = "Checking nearby buildings..."

        let bearing = locationService.compassBearing
        let pitch = locationService.devicePitch
        let lat = location.coordinate.latitude
        let lng = location.coordinate.longitude

        let gpsAccuracy = location.horizontalAccuracy

        // 2. Try GPSGridCacheService
        if let cached = GPSGridCacheService.shared.findByGPS(lat: lat, lng: lng, radiusM: 30) {
             let match = ScanMatch(
                 bin: cached.bin, bbl: cached.bbl, name: cached.name, address: cached.address,
                 architect: cached.architect, yearBuilt: cached.yearBuilt,
                 style: cached.style, materials: cached.materials, use: cached.use,
                 confidence: 1.0, latitude: cached.latitude, longitude: cached.longitude
             )
             let result = ScanAPIResponse(matches: [match], verificationMethod: "cache_hit")
             await handleVerifiedScan(result: result, userId: userId, subtype: "cache_hit")
             self.scanResult = result
             self.showResult = true
             isScanning = false
             return
        }

        // 3. Progressive messages
        let messageTask = Task {
            let messages = [
                (3, "Analyzing architecture..."),
                (8, "Running deep scan..."),
                (15, "Still working...")
            ]
            
            for (delay, msg) in messages {
                if Task.isCancelled { break }
                try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                if Task.isCancelled { break }
                await MainActor.run {
                    self.loadingMessage = msg
                    if delay == 15 { self.showRetryButton = true }
                }
            }
        }

        do {
            let result = try await ScanAPIService.shared.scan(
                image: image,
                lat: lat,
                lng: lng,
                bearing: bearing,
                pitch: pitch,
                gpsAccuracy: gpsAccuracy
            )

            messageTask.cancel()

            if result.verified {
                await handleVerifiedScan(result: result, userId: userId, subtype: "api_scan")
                self.scanResult = result
                self.showResult = true
            } else {
                print("[ScanViewModel] Scan successful but no buildings found in cone.")
                self.scanResult = result
                self.notFound = true
            }
        } catch {
            print("[ScanViewModel] Scan API Error: \(error)")
            messageTask.cancel()
            errorMessage = error.localizedDescription
            // Do NOT set notFound = true here, so we stay on ScanView and show the error toast
        }
        
        isScanning = false
    }

    private func handleVerifiedScan(result: ScanAPIResponse, userId: String, subtype: String) async {
        let topMatch = result.topMatch
        try? await AestheticService.shared.insertScanEvent(
            userId: userId,
            buildingBbl: topMatch?.bbl,
            aestheticVector: nil,
            subtype: subtype
        )
        try? await XPService.shared.awardXP(userId: userId, amount: 50)
        
        // Trigger real-time progress updates (Streaks, Achievements, Stamps, Algo)
        await ProgressService.shared.processScan(userId: userId, match: topMatch)
        
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    /// Check if a building is within the scan cone (±30°, 40m)
    func isInScanCone(buildingLat: Double, buildingLng: Double) -> Bool {
        guard let location = locationService.location else { return false }

        let buildingLocation = CLLocation(latitude: buildingLat, longitude: buildingLng)
        let distance = location.distance(from: buildingLocation)
        guard distance <= 40 else { return false } // Increased from 20m for GPS drift

        let bearing = locationService.compassBearing
        let angleToBldg = location.coordinate.bearing(to: CLLocationCoordinate2D(latitude: buildingLat, longitude: buildingLng))
        let diff = abs(bearing - angleToBldg).truncatingRemainder(dividingBy: 360)
        let normalizedDiff = min(diff, 360 - diff)
        return normalizedDiff <= 30
    }
}

