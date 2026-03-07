import Auth
import Foundation
import Supabase

@Observable
final class AppState {
    var isLoggedIn: Bool = false
    var currentUser: User? = nil
    var isReady: Bool = false

    init() {
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
                case .signedIn:
                    self.currentUser = session?.user
                    self.isLoggedIn = true
                case .signedOut:
                    self.currentUser = nil
                    self.isLoggedIn = false
                default:
                    break
                }
            }
        }
    }

    func signOut() async throws {
        try await SupabaseService.shared.client.auth.signOut()
    }
}
