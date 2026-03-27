import Foundation
import CoreLocation
import CoreMotion
import Combine
import UIKit
import CoreMotion
import Combine

@Observable
final class LocationService: NSObject {
    var location: CLLocation? = nil
    var heading: CLHeading? = nil
    var authorizationStatus: CLAuthorizationStatus = .notDetermined
    
    var devicePitch: Double = 0
    var deviceRoll: Double = 0

    /// Smoothed compass bearing in degrees (0–360).
    /// Uses exponential moving average with circular interpolation to eliminate jitter.
    private(set) var smoothedHeading: Double = 0
    private var hasInitialHeading = false
    /// Smoothing factor: lower = smoother but laggier. 0.15 is responsive without jitter.
    private let headingSmoothingFactor: Double = 0.15

    private let locationManager = CLLocationManager()
    private let motionManager = CMMotionManager()
    private var isUpdating = false
    private var isBackgrounded = false
    private var observers: [AnyCancellable] = []

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 5
        setupBackgroundObservers()
    }

    private func setupBackgroundObservers() {
        NotificationCenter.default.publisher(for: UIApplication.didEnterBackgroundNotification)
            .sink { [weak self] _ in self?.handleBackgrounding(true) }
            .store(in: &observers)
            
        NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)
            .sink { [weak self] _ in self?.handleBackgrounding(false) }
            .store(in: &observers)
    }

    private func handleBackgrounding(_ background: Bool) {
        isBackgrounded = background
        guard isUpdating else { return }
        
        if background {
            // Pause high-drain sensors in background
            locationManager.stopUpdatingHeading()
            motionManager.stopAccelerometerUpdates()
            locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation // Keep high accuracy for walking track
        } else {
            // Resume full fidelity
            locationManager.desiredAccuracy = kCLLocationAccuracyBest
            locationManager.startUpdatingHeading()
            startAccelerometerIfNeeded()
        }
    }

    func requestPermission() {
        locationManager.requestWhenInUseAuthorization()
    }

    func startUpdating() {
        isUpdating = true
        locationManager.startUpdatingLocation()
        
        guard !isBackgrounded else { return } // Don't start heading/motion if already backgrounded
        
        locationManager.startUpdatingHeading()
        startAccelerometerIfNeeded()
    }

    private func startAccelerometerIfNeeded() {
        guard motionManager.isAccelerometerAvailable, !motionManager.isAccelerometerActive else { return }
        motionManager.accelerometerUpdateInterval = 0.5
        motionManager.startAccelerometerUpdates(to: .main) { [weak self] data, error in
            guard let data = data else { return }
            let x = data.acceleration.x
            let y = data.acceleration.y
            let z = data.acceleration.z
            
            self?.devicePitch = atan2(y, sqrt(x * x + z * z)) * 180 / .pi
            self?.deviceRoll = atan2(x, sqrt(y * y + z * z)) * 180 / .pi
        }
    }

    func stopUpdating() {
        isUpdating = false
        locationManager.stopUpdatingLocation()
        locationManager.stopUpdatingHeading()
        motionManager.stopAccelerometerUpdates()
    }

    /// Compass bearing in degrees (0–360) — returns smoothed value
    var compassBearing: Double { smoothedHeading }

    /// Apply exponential moving average with angular interpolation
    private func updateSmoothedHeading(raw: Double) {
        guard hasInitialHeading else {
            smoothedHeading = raw
            hasInitialHeading = true
            return
        }
        // Shortest angular difference (-180…180)
        var delta = raw - smoothedHeading
        if delta > 180 { delta -= 360 }
        if delta < -180 { delta += 360 }
        // EMA step
        var result = smoothedHeading + headingSmoothingFactor * delta
        // Normalize to 0…360
        if result < 0 { result += 360 }
        if result >= 360 { result -= 360 }
        smoothedHeading = result
    }
}

extension LocationService: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        location = locations.last
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        heading = newHeading
        let raw = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magneticHeading
        updateSmoothedHeading(raw: raw)
    }

    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        authorizationStatus = status
        if status == .authorizedWhenInUse || status == .authorizedAlways {
            startUpdating()
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("[LocationService] Error: \(error.localizedDescription)")
    }
}

// MARK: - Geo Math Helpers

extension CLLocationCoordinate2D {
    func bearing(to other: CLLocationCoordinate2D) -> Double {
        let lat1 = latitude * .pi / 180
        let lat2 = other.latitude * .pi / 180
        let dLng = (other.longitude - longitude) * .pi / 180
        let y = sin(dLng) * cos(lat2)
        let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLng)
        return (atan2(y, x) * 180 / .pi + 360).truncatingRemainder(dividingBy: 360)
    }

    func distance(to other: CLLocationCoordinate2D) -> Double {
        let R = 6_371_000.0
        let lat1 = latitude * .pi / 180
        let lat2 = other.latitude * .pi / 180
        let dLat = (other.latitude - latitude) * .pi / 180
        let dLon = (other.longitude - longitude) * .pi / 180
        let sinDLat = sin(dLat / 2)
        let sinDLon = sin(dLon / 2)
        let x = sinDLat * sinDLat + cos(lat1) * cos(lat2) * sinDLon * sinDLon
        return R * 2 * atan2(sqrt(x), sqrt(1 - x))
    }
}
