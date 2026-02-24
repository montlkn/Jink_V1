import Foundation
import UIKit
import CoreLocation

@Observable
final class ScanViewModel {
    var isScanning = false
    var scanResult: ScanAPIResponse? = nil
    var errorMessage: String? = nil
    var showResult = false

    private let locationService: LocationService

    init(locationService: LocationService) {
        self.locationService = locationService
    }

    func scan(image: UIImage, userId: String) async {
        guard let location = locationService.location else {
            errorMessage = "Waiting for GPS…"
            return
        }

        isScanning = true
        errorMessage = nil
        defer { isScanning = false }

        let bearing = locationService.compassBearing
        let lat = location.coordinate.latitude
        let lng = location.coordinate.longitude

        do {
            let result = try await ScanAPIService.shared.scan(
                image: image,
                lat: lat,
                lng: lng,
                bearing: bearing
            )

            if result.verified {
                // Insert aesthetic event
                try await AestheticService.shared.insertScanEvent(
                    userId: userId,
                    buildingBbl: result.building?.bbl,
                    aestheticVector: result.building?.aestheticProfile.map { profile in
                        var dict: [String: Double] = [:]
                        for item in profile.all { dict[item.name.lowercased()] = item.score }
                        return dict
                    }
                )
                // Award XP
                try await XPService.shared.awardXP(userId: userId, amount: 50)

                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            }

            self.scanResult = result
            self.showResult = true
        } catch {
            errorMessage = error.localizedDescription
        }
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
