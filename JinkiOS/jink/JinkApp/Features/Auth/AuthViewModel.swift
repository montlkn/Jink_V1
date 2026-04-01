import Foundation
import Supabase

@Observable
final class AuthViewModel {
    var email = ""
    var password = ""
    var isLoading = false
    var errorMessage: String? = nil
    var showMagicLinkSent = false

    private var client: SupabaseClient { SupabaseService.shared.client }

    func signIn() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await client.auth.signIn(email: email, password: password)
        } catch {
            errorMessage = error.userMessage
        }
    }

    func signUp() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await client.auth.signUp(email: email, password: password)
        } catch {
            errorMessage = error.userMessage
        }
    }

    func sendMagicLink() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await client.auth.signInWithOTP(email: email)
            showMagicLinkSent = true
        } catch {
            errorMessage = error.userMessage
        }
    }
}
