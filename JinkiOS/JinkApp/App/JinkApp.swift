import SwiftUI
import Supabase

@main
struct JinkApp: App {
    @State private var appState = AppState()

    init() {
        SupabaseService.shared.configure()
    }

    var body: some Scene {
        WindowGroup {
            if appState.isLoggedIn {
                RootView()
                    .environment(appState)
            } else {
                AuthView()
                    .environment(appState)
            }
        }
    }
}
