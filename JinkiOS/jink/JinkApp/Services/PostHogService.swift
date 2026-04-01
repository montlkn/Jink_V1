import Foundation

/// Lightweight PostHog analytics wrapper.
/// All calls are no-ops when PostHog is not initialized (e.g. missing API key).
final class PostHogService {
    static let shared = PostHogService()
    private var isConfigured = false

    private init() {}

    func configure() {
        guard let key = Bundle.main.infoDictionary?["POSTHOG_API_KEY"] as? String, !key.isEmpty else {
            print("[PostHogService] No POSTHOG_API_KEY — analytics disabled")
            return
        }
        // PostHog iOS SDK init — requires posthog-ios SPM package
        // PostHogSDK.shared.setup(PostHogConfig(apiKey: key, host: "https://us.i.posthog.com"))
        isConfigured = true
        print("[PostHogService] Configured")
    }

    func identify(userId: String) {
        guard isConfigured else { return }
        // PostHogSDK.shared.identify(userId)
        print("[PostHogService] identify: \(userId)")
    }

    func capture(_ event: String, properties: [String: Any] = [:]) {
        guard isConfigured else { return }
        // PostHogSDK.shared.capture(event, properties: properties)
        print("[PostHogService] \(event) \(properties.isEmpty ? "" : "\(properties)")")
    }

    func reset() {
        guard isConfigured else { return }
        // PostHogSDK.shared.reset()
    }
}
