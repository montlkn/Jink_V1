import SwiftUI
import Supabase

struct RootView: View {
    @Environment(AppState.self) private var appState
    @State private var locationService = LocationService()
    @State private var selectedTab: Tab = .walk
    @State private var showOnboardingQuiz = false

    enum Tab { case scan, walk, passport }

    var body: some View {
        TabView(selection: $selectedTab) {
            ScanView()
                .tabItem {
                    Label("Scan", systemImage: "camera.viewfinder")
                }
                .tag(Tab.scan)

            WalkStartView()
                .tabItem {
                    Label("Jink", systemImage: "figure.walk")
                }
                .tag(Tab.walk)

            PassportView()
                .tabItem {
                    Label("Passport", systemImage: "book.closed")
                }
                .tag(Tab.passport)
        }
        .tint(AppColors.accent)
        .environment(locationService)
        .onAppear {
            locationService.requestPermission()
        }
        .task {
            if let userId = appState.currentUser?.id.uuidString {
                await checkOnboarding(userId: userId)
            }
        }
        .fullScreenCover(isPresented: $showOnboardingQuiz) {
            OnboardingCarouselView()
        }
    }

    private func checkOnboarding(userId: String) async {
        do {
            struct NeedsOnboardingResult: Decodable { let userNeedsOnboarding: Bool }
            let result: Bool = try await SupabaseService.shared.client
                .rpc("user_needs_onboarding", params: ["p_user_id": AnyJSON.string(userId)])
                .execute()
                .value
            if result {
                showOnboardingQuiz = true
            }
        } catch {
            print("[RootView] Onboarding check error: \(error)")
        }
    }
}

#Preview {
    RootView()
        .environment(AppState())
}
