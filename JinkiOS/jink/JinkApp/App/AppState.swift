import Auth
import Foundation
import Supabase

@Observable
final class AppState {
    var isLoggedIn: Bool = false
    var currentUser: User? = nil
    var isReady: Bool = false
    var aestheticProfile: AestheticProfile? = nil
    var passportRefreshTrigger: Int = 0

    init() {
        PostHogService.shared.capture("app_opened")
        // Safety fallback: mark ready after 3s even if auth stream stalls
        Task {
            try? await Task.sleep(for: .seconds(3))
            await MainActor.run {
                if !self.isReady { self.isReady = true }
            }
        }
        Task {
            await listenForAuthChanges()
        }
    }

    private func listenForAuthChanges() async {
        for await (event, session) in SupabaseService.shared.client.auth.authStateChanges {
            await MainActor.run {
                switch event {
                case .initialSession:
                    self.currentUser = session?.user
                    self.isLoggedIn = session != nil
                    self.isReady = true
                case .signedIn, .tokenRefreshed, .userUpdated:
                    self.currentUser = session?.user
                    self.isLoggedIn = true
                    if let userId = session?.user.id.uuidString {
                        PostHogService.shared.identify(userId: userId)
                    }
                case .signedOut:
                    self.currentUser = nil
                    self.isLoggedIn = false
                    PostHogService.shared.reset()
                default:
                    break
                }
            }
        }
    }

    func refreshAestheticProfile() async {
        guard let userId = currentUser?.id.uuidString else { return }
        // Try processing unprocessed events first; fall back to fetch
        let processed = await AestheticService.shared.processProfile(userId: userId)
        let fetched = await AestheticService.shared.fetchProfile(userId: userId)
        let updated = processed ?? fetched
        await MainActor.run { self.aestheticProfile = updated }
    }

    func signOut() async throws {
        try await SupabaseService.shared.client.auth.signOut()
    }
}
