import SwiftUI
import Supabase

@main
struct JinkApp: App {
    @State private var appState: AppState

    init() {
        SupabaseService.shared.configure()
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
                    try? await SupabaseService.shared.client.auth.session(from: url)
                }
            }
        }
    }
}
