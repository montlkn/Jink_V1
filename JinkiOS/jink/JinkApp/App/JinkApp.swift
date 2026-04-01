import SwiftUI
import Supabase

@main
struct JinkApp: App {
    @State private var appState: AppState
    @State private var deepLinkError: String? = nil

    init() {
        SupabaseService.shared.configure()
        PostHogService.shared.configure()
        // Sentry init — add sentry-cocoa via SPM then uncomment:
        // if let dsn = Bundle.main.infoDictionary?["SENTRY_DSN"] as? String, !dsn.isEmpty {
        //     SentrySDK.start { options in
        //         options.dsn = dsn
        //         options.tracesSampleRate = 0.2
        //         options.enableSwiftAsyncStacktrace = true
        //     }
        // }
        WalkViewModel.cleanUpOrphanedWalk()
        _appState = State(initialValue: AppState())
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if !appState.isReady {
                    Color.clear
                } else if appState.isLoggedIn {
                    RootView()
                } else {
                    AuthView()
                }
            }
            .environment(appState)
            .onOpenURL { url in
                Task {
                    do {
                        try await SupabaseService.shared.client.auth.session(from: url)
                    } catch {
                        deepLinkError = "Sign-in link expired or invalid. Please request a new one."
                        print("[JinkApp] Deep link auth error: \(error)")
                    }
                }
            }
            .alert("Sign In Failed", isPresented: Binding(get: { deepLinkError != nil }, set: { if !$0 { deepLinkError = nil } })) {
                Button("OK") { deepLinkError = nil }
            } message: {
                Text(deepLinkError ?? "")
            }
        }
    }
}
