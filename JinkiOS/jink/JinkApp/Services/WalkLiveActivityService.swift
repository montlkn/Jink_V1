import ActivityKit
import Foundation

// MARK: - WalkLiveActivityService

final class WalkLiveActivityService {
    static let shared = WalkLiveActivityService()
    private init() {}

    private var activity: Activity<WalkActivityAttributes>?

    func start(walkId: String, totalBuildings: Int, initialState: WalkActivityState) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            print("[WalkLiveActivity] Live Activities not enabled on this device")
            return
        }

        let attributes = WalkActivityAttributes(walkId: walkId, totalBuildings: totalBuildings)
        let content = ActivityContent(state: initialState, staleDate: nil)

        do {
            activity = try Activity<WalkActivityAttributes>.request(
                attributes: attributes,
                content: content,
                pushType: nil
            )
            print("[WalkLiveActivity] Started activity: \(activity?.id ?? "unknown")")
        } catch {
            print("[WalkLiveActivity] Failed to start: \(error)")
        }
    }

    func update(state: WalkActivityState) async {
        guard let activity else { return }
        let content = ActivityContent(state: state, staleDate: nil)
        await activity.update(content)
    }

    func end() {
        Task {
            await activity?.end(nil, dismissalPolicy: .immediate)
            activity = nil
            print("[WalkLiveActivity] Ended activity")
        }
    }
}
