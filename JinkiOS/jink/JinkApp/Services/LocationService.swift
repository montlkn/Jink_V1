import Foundation
import CoreLocation
import CoreMotion
import Combine

@Observable
final class LocationService: NSObject {
    var location: CLLocation? = nil
    var heading: CLHeading? = nil
    var authorizationStatus: CLAuthorizationStatus = .notDetermined
    
    var devicePitch: Double = 0
    var deviceRoll: Double = 0

    private let locationManager = CLLocationManager()
    private let motionManager = CMMotionManager()

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 5
    }

    func requestPermission() {
        locationManager.requestWhenInUseAuthorization()
    }

    func startUpdating() {
        locationManager.startUpdatingLocation()
        locationManager.startUpdatingHeading()
        
        if motionManager.isAccelerometerAvailable {
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
    }

    func stopUpdating() {
        locationManager.stopUpdatingLocation()
        locationManager.stopUpdatingHeading()
        motionManager.stopAccelerometerUpdates()
    }

    /// Compass bearing in degrees (0–360)
    var compassBearing: Double {
        heading?.trueHeading ?? heading?.magneticHeading ?? 0
    }
}

extension LocationService: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        location = locations.last
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        heading = newHeading
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
