import SwiftUI

struct RootView: View {
    @Environment(AppState.self) private var appState
    @State private var locationService = LocationService()
    @State private var selectedTab: Tab = .scan

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
                    Label("Walk", systemImage: "figure.walk")
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
    }
}

#Preview {
    RootView()
        .environment(AppState())
}
