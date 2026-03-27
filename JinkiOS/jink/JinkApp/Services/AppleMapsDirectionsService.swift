import Foundation
import MapKit
import CoreLocation

// MARK: - Route Models

struct WalkingRoute {
    let distance: Double              // meters
    let expectedTravelTime: TimeInterval // seconds
    let steps: [RouteStep]
    let polylineCoordinates: [CLLocationCoordinate2D]
}

struct RouteStep {
    let instruction: String
    let distance: Double              // meters
    let polylineCoordinates: [CLLocationCoordinate2D]
}

// MARK: - AppleMapsDirectionsService

/// Wraps MKDirections to provide walking routes between two coordinates.
/// Cancels any in-flight request when a new one is made.
final class AppleMapsDirectionsService {
    static let shared = AppleMapsDirectionsService()
    private var currentDirectionsTask: MKDirections?

    private init() {}

    /// Request walking directions from origin to destination.
    /// Cancels any previously in-flight request.
    func requestWalkingRoute(
        from origin: CLLocationCoordinate2D,
        to destination: CLLocationCoordinate2D
    ) async throws -> WalkingRoute {
        // Cancel any in-flight request
        currentDirectionsTask?.cancel()

        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: origin))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: destination))
        request.transportType = .walking

        let directions = MKDirections(request: request)
        currentDirectionsTask = directions

        let response = try await directions.calculate()

        guard let route = response.routes.first else {
            throw AppleMapsError.noRouteFound
        }

        // Extract polyline coordinates
        let polyCoords = route.polyline.coordinates

        // Convert MKRoute.Step → RouteStep
        let steps: [RouteStep] = route.steps.compactMap { step in
            guard !step.instructions.isEmpty else { return nil }
            return RouteStep(
                instruction: step.instructions,
                distance: step.distance,
                polylineCoordinates: step.polyline.coordinates
            )
        }

        return WalkingRoute(
            distance: route.distance,
            expectedTravelTime: route.expectedTravelTime,
            steps: steps,
            polylineCoordinates: polyCoords
        )
    }
}

// MARK: - Error

enum AppleMapsError: LocalizedError {
    case noRouteFound

    var errorDescription: String? {
        switch self {
        case .noRouteFound: return "No walking route found."
        }
    }
}

// MARK: - MKPolyline Coordinate Extraction

private extension MKPolyline {
    var coordinates: [CLLocationCoordinate2D] {
        var coords = [CLLocationCoordinate2D](repeating: kCLLocationCoordinate2DInvalid, count: pointCount)
        getCoordinates(&coords, range: NSRange(location: 0, length: pointCount))
        return coords
    }
}
