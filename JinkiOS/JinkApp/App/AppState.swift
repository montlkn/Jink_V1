import Foundation
import Supabase

@Observable
final class AppState {
    var isLoggedIn: Bool = false
    var currentUser: User? = nil

    init() {
        Task {
            await checkSession()
            listenForAuthChanges()
        }
    }

    private func checkSession() async {
        do {
            let session = try await SupabaseService.shared.client.auth.session
            await MainActor.run {
                self.currentUser = session.user
                self.isLoggedIn = true
            }
        } catch {
            await MainActor.run {
                self.isLoggedIn = false
                self.currentUser = nil
            }
        }
    }

    private func listenForAuthChanges() {
        Task {
            for await (event, session) in SupabaseService.shared.client.auth.authStateChanges {
                await MainActor.run {
                    switch event {
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
    }

    func signOut() async throws {
        try await SupabaseService.shared.client.auth.signOut()
    }
}
