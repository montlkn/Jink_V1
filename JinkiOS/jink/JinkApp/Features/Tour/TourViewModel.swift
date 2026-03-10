import Foundation
import CoreLocation

enum TourState {
    case notStarted
    case active
    case completed
}

@Observable
final class TourViewModel: NSObject {
    var tour: TourDefinition?
    var currentCheckpointIndex: Int = 0
    var visitedCheckpointIds: Set<String> = []
    var state: TourState = .notStarted
    var elapsedSeconds: Int = 0
    var totalDistanceMeters: Double = 0
    var xpEarned: Int = 0
    var isNearCurrentCheckpoint: Bool = false
    var showAboutSheet: Bool = false
    var userLocation: CLLocation? = nil

    private var startTime: Date? = nil
    private var timer: Timer? = nil
    private var lastLocation: CLLocation? = nil

    // MARK: - Computed

    var currentCheckpoint: TourCheckpoint? {
        guard let tour, currentCheckpointIndex < tour.checkpoints.count else { return nil }
        return tour.checkpoints[currentCheckpointIndex]
    }

    var progressFraction: Double {
        guard let tour, !tour.checkpoints.isEmpty else { return 0 }
        return Double(visitedCheckpointIds.count) / Double(tour.checkpoints.count)
    }

    var elapsedLabel: String {
        let h = elapsedSeconds / 3600
        let m = (elapsedSeconds % 3600) / 60
        let s = elapsedSeconds % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%d:%02d", m, s)
    }

    var distanceLabel: String {
        let miles = totalDistanceMeters / 1609.34
        return String(format: "%.2f mi", miles)
    }

    // MARK: - Tour Control

    func startTour(_ tour: TourDefinition) {
        self.tour = tour
        currentCheckpointIndex = 0
        visitedCheckpointIds = []
        state = .active
        startTime = Date()
        elapsedSeconds = 0
        totalDistanceMeters = 0
        xpEarned = 0
        isNearCurrentCheckpoint = false

        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            self?.elapsedSeconds += 1
        }
    }

    func verifyLocation() {
        guard let checkpoint = currentCheckpoint else { return }
        guard isNearCurrentCheckpoint else { return }
        markCheckpointVisited(checkpoint.id)
    }

    func advanceCheckpoint() {
        guard let tour else { return }
        if currentCheckpointIndex < tour.checkpoints.count - 1 {
            let checkpoint = tour.checkpoints[currentCheckpointIndex]
            markCheckpointVisited(checkpoint.id)
            currentCheckpointIndex += 1
            isNearCurrentCheckpoint = false
        } else {
            endTour()
        }
    }

    func endTour() {
        timer?.invalidate()
        timer = nil
        state = .completed
        xpEarned = tour?.xpReward ?? 0
    }

    // MARK: - Location Update

    func updateLocation(_ location: CLLocation) {
        userLocation = location

        // Accumulate distance
        if let last = lastLocation {
            totalDistanceMeters += location.distance(from: last)
        }
        lastLocation = location

        // Check proximity to current checkpoint
        if let checkpoint = currentCheckpoint {
            let target = CLLocation(latitude: checkpoint.latitude, longitude: checkpoint.longitude)
            let distance = location.distance(from: target)
            isNearCurrentCheckpoint = distance <= 60 // Increased from 30m to handle NYC GPS drift
        }
    }

    private func markCheckpointVisited(_ id: String) {
        visitedCheckpointIds.insert(id)
        guard let tour else { return }
        // If all visited, end tour
        if visitedCheckpointIds.count >= tour.checkpoints.count {
            endTour()
        } else if let nextIdx = tour.checkpoints.firstIndex(where: { !visitedCheckpointIds.contains($0.id) }) {
            currentCheckpointIndex = nextIdx
        }
    }
}
