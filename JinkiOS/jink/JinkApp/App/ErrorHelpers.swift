import Foundation

extension Error {
    var userMessage: String {
        let raw = localizedDescription
        // Map common backend/network errors to readable messages
        if raw.contains("URLError") || raw.contains("network") || raw.contains("timed out") || raw.contains("offline") {
            return "Network error — check your connection and try again."
        }
        if raw.contains("401") || raw.contains("JWT") || raw.contains("token") {
            return "Session expired — please sign in again."
        }
        if raw.contains("JSON") || raw.contains("decode") || raw.contains("unexpected") {
            return "Something went wrong. Please try again."
        }
        if raw.contains("409") || raw.contains("duplicate") || raw.contains("conflict") {
            return "This action was already completed."
        }
        if raw.count > 100 {
            return "Something went wrong. Please try again."
        }
        return raw
    }
}
