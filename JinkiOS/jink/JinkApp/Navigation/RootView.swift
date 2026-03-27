import SwiftUI
import Supabase

struct RootView: View {
    @Environment(AppState.self) private var appState
    @State private var locationService = LocationService()
    @State private var selectedTab: Tab = .walk
    @State private var showOnboarding = false
    @State private var showFeedback = false

    // DEBUG: set true to force onboarding overlay without signing out
    private let debugForceOnboarding = true

    enum Tab { case scan, walk, passport }

    var body: some View {
        ZStack {
            TabView(selection: $selectedTab) {
                ScanView()
                    .tabItem { Label("Scan", systemImage: "camera.viewfinder") }
                    .tag(Tab.scan)

                WalkStartView()
                    .tabItem { Label("Jink", systemImage: "figure.walk") }
                    .tag(Tab.walk)

                PassportView()
                    .tabItem { Label("Passport", systemImage: "book.closed") }
                    .tag(Tab.passport)
            }
            .tint(AppColors.accent)
            .environment(locationService)

            // Coach marks overlay — sits on top of the real app
            if showOnboarding {
                OnboardingCarouselView(isPresented: $showOnboarding)
                    .transition(.opacity)
            }
        }
        .sheet(isPresented: $showFeedback) {
            BetaFeedbackView()
        }
        .onReceive(NotificationCenter.default.publisher(for: .deviceDidShake)) { _ in
            showFeedback = true
        }
        .onAppear { locationService.requestPermission() }
        .task {
            if debugForceOnboarding {
                showOnboarding = true
                return
            }
            if let userId = appState.currentUser?.id.uuidString {
                await checkOnboarding(userId: userId)
            }
        }
    }

    private func checkOnboarding(userId: String) async {
        // Check local UserDefaults first — skip RPC if already seen
        if UserDefaults.standard.bool(forKey: "onboarding_seen") { return }

        do {
            let result: Bool = try await SupabaseService.shared.client
                .rpc("user_needs_onboarding", params: ["p_user_id": AnyJSON.string(userId)])
                .execute()
                .value
            if result { showOnboarding = true }
        } catch {
            print("[RootView] Onboarding check error: \(error)")
        }
    }
}

#Preview {
    RootView()
        .environment(AppState())
}
