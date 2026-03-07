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

    private let locationService: LocationService

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
        let altitude = location.altitude
        let lat = location.coordinate.latitude
        let lng = location.coordinate.longitude

        // 2. Try GPSGridCacheService
        if let cached = GPSGridCacheService.shared.findByGPS(lat: lat, lng: lng, radiusM: 20) {
             let result = ScanAPIResponse(building: BuildingResult(
                 bin: cached.bin, bbl: cached.bbl, name: cached.name, address: cached.address,
                 architect: cached.architect, yearBuilt: Int(cached.yearBuilt ?? "0"),
                 style: cached.style, description: cached.description,
                 aestheticProfile: cached.aestheticProfile, latitude: cached.latitude, longitude: cached.longitude
             ), confidence: 1.0, message: "Cached")
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
                altitude: altitude
            )

            messageTask.cancel()

            if result.verified {
                // Insert aesthetic event
                try? await AestheticService.shared.insertScanEvent(
                    userId: userId,
                    buildingBbl: result.building?.bbl,
                    aestheticVector: result.building?.aestheticProfile.map { profile in
                        var dict: [String: Double] = [:]
                        for item in profile.all { dict[item.name.lowercased()] = item.score }
                        return dict
                    }
                )
                // Award XP
                try? await XPService.shared.awardXP(userId: userId, amount: 50)

                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                
                self.scanResult = result
                self.showResult = true
            } else {
                self.scanResult = result
                self.notFound = true
            }
        } catch {
            messageTask.cancel()
            errorMessage = error.localizedDescription
            self.notFound = true
        }
        
        isScanning = false
    }

    /// Check if a building is within the scan cone (±30°, 20m)
    func isInScanCone(buildingLat: Double, buildingLng: Double) -> Bool {
        guard let location = locationService.location else { return false }

        let buildingLocation = CLLocation(latitude: buildingLat, longitude: buildingLng)
        let distance = location.distance(from: buildingLocation)
        guard distance <= 20 else { return false }

        let bearing = locationService.compassBearing
        let angleToBldg = location.coordinate.bearing(to: CLLocationCoordinate2D(latitude: buildingLat, longitude: buildingLng))
        let diff = abs(bearing - angleToBldg).truncatingRemainder(dividingBy: 360)
        let normalizedDiff = min(diff, 360 - diff)
        return normalizedDiff <= 30
    }
}

// MARK: - Bearing helper
extension CLLocationCoordinate2D {
    func bearing(to other: CLLocationCoordinate2D) -> Double {
        let lat1 = latitude * .pi / 180
        let lat2 = other.latitude * .pi / 180
        let dLng = (other.longitude - longitude) * .pi / 180
        let y = sin(dLng) * cos(lat2)
        let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLng)
        return atan2(y, x) * 180 / .pi
    }
}
