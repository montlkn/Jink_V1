import SwiftUI

struct WalkStartView: View {
    @Environment(AppState.self) private var appState
    @Environment(LocationService.self) private var locationService
    @State private var vm: WalkViewModel
    @State private var selectedRoute: WalkRouteType = .aesthetic
    @State private var navigateToNav = false

    init() {
        _vm = State(initialValue: WalkViewModel(locationService: LocationService()))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "figure.walk.circle")
                        .font(.system(size: 56))
                        .foregroundStyle(AppColors.passport.walk)
                    Text("Start a Walk")
                        .font(.largeTitle.bold())
                }
                .padding(.top, 40)

                // Route type picker
                VStack(spacing: 12) {
                    ForEach(WalkRouteType.allCases, id: \.self) { route in
                        RouteTypeCard(
                            route: route,
                            isSelected: selectedRoute == route
                        ) {
                            selectedRoute = route
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        }
                    }
                }
                .padding(.horizontal)

                Spacer()

                // Start button
                Button {
                    Task { await startWalk() }
                } label: {
                    HStack {
                        if vm.errorMessage != nil {
                            Image(systemName: "exclamationmark.triangle")
                        }
                        Text(vm.isWalkActive ? "Starting…" : "Start Walk")
                            .font(.headline)
                        Image(systemName: "arrow.right")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(AppColors.passport.walk, in: RoundedRectangle(cornerRadius: 14))
                    .foregroundStyle(.white)
                }
                .padding()
                .disabled(vm.isWalkActive)

                NavigationLink(destination: WalkNavView(vm: vm), isActive: $navigateToNav) {
                    EmptyView()
                }
            }
            .navigationTitle("")
            .navigationBarHidden(true)
            .onAppear {
                vm = WalkViewModel(locationService: locationService)
            }
            .alert("Error", isPresented: .constant(vm.errorMessage != nil), actions: {
                Button("OK") { vm.errorMessage = nil }
            }, message: {
                Text(vm.errorMessage ?? "")
            })
        }
    }

    private func startWalk() async {
        guard let userId = appState.currentUser?.id.uuidString else { return }
        await vm.startWalk(routeType: selectedRoute, userId: userId)
        if vm.isWalkActive { navigateToNav = true }
    }
}

struct RouteTypeCard: View {
    let route: WalkRouteType
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                Image(systemName: iconName)
                    .font(.title2)
                    .foregroundStyle(isSelected ? .white : AppColors.passport.walk)
                    .frame(width: 40)
                VStack(alignment: .leading, spacing: 2) {
                    Text(route.displayName)
                        .font(.headline)
                        .foregroundStyle(isSelected ? .white : .primary)
                    Text(route.description)
                        .font(.caption)
                        .foregroundStyle(isSelected ? .white.opacity(0.8) : .secondary)
                }
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.white)
                }
            }
            .padding()
            .background(
                isSelected
                ? AppColors.passport.walk
                : Color(.secondarySystemBackground),
                in: RoundedRectangle(cornerRadius: 12)
            )
        }
        .buttonStyle(.plain)
    }

    private var iconName: String {
        switch route {
        case .aesthetic: return "eye"
        case .behavioral: return "person.2"
        case .wildcard: return "shuffle"
        }
    }
}
