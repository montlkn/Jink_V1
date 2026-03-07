import SwiftUI
import CoreLocation

struct TourNavView: View {
    @Bindable var vm: TourViewModel
    @Environment(LocationService.self) private var locationService
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if vm.state == .completed {
                TourCompleteView(vm: vm, onDone: { dismiss() })
            } else {
                tourActiveBody
            }
        }
    }

    private var tourActiveBody: some View {
        ZStack {
            // Background ambient glow
            if vm.isNearCurrentCheckpoint {
                Color.green.opacity(0.08).ignoresSafeArea()
            }

            VStack(spacing: 0) {
                // Progress bar
                progressBar

                if let checkpoint = vm.currentCheckpoint {
                    ScrollView {
                        VStack(spacing: 16) {
                            // Checkpoint card
                            CheckpointCard(
                                checkpoint: checkpoint,
                                isNear: vm.isNearCurrentCheckpoint,
                                onAbout: { vm.showAboutSheet = true }
                            )

                            // Stop counter
                            HStack {
                                Text("Stop \(vm.currentCheckpointIndex + 1) of \(vm.tour?.checkpoints.count ?? 0)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text(vm.elapsedLabel)
                                    .font(.caption.monospaced())
                                    .foregroundStyle(.secondary)
                                Text("·")
                                    .foregroundStyle(.secondary)
                                Text(vm.distanceLabel)
                                    .font(.caption.monospaced())
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.horizontal)

                            // Action buttons
                            VStack(spacing: 10) {
                                Button(action: handlePrimaryAction) {
                                    HStack {
                                        Image(systemName: vm.isNearCurrentCheckpoint ? "checkmark.circle.fill" : "arrow.right.circle.fill")
                                        Text(checkpoint.action)
                                    }
                                    .font(.headline)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(vm.isNearCurrentCheckpoint ? Color.green : AppColors.accent, in: RoundedRectangle(cornerRadius: 12))
                                    .foregroundStyle(.white)
                                }

                                Button(action: { vm.advanceCheckpoint() }) {
                                    Text("Skip This Stop")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding(.horizontal)

                            // End tour button
                            Button(role: .destructive) {
                                vm.endTour()
                            } label: {
                                Text("End Tour Early")
                                    .font(.caption)
                                    .foregroundStyle(.red.opacity(0.7))
                            }
                            .padding(.bottom)
                        }
                        .padding(.top, 8)
                    }
                }
            }
        }
        .navigationTitle(vm.tour?.name ?? "Tour")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                }
            }
        }
        .sheet(isPresented: $vm.showAboutSheet) {
            if let checkpoint = vm.currentCheckpoint {
                AboutCheckpointSheet(checkpoint: checkpoint)
            }
        }
        .onChange(of: locationService.location) { _, newLocation in
            if let newLocation {
                vm.updateLocation(newLocation)
            }
        }
        .onAppear {
            if let location = locationService.location {
                vm.updateLocation(location)
            }
        }
    }

    private var progressBar: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(Color(.systemGray5))
                    .frame(height: 3)
                Rectangle()
                    .fill(AppColors.accent)
                    .frame(width: geo.size.width * vm.progressFraction, height: 3)
                    .animation(.easeInOut, value: vm.progressFraction)
            }
        }
        .frame(height: 3)
    }

    private func handlePrimaryAction() {
        if vm.isNearCurrentCheckpoint {
            vm.verifyLocation()
        }
        // If not near, user needs to walk to the checkpoint
    }
}

// MARK: - Checkpoint Card

struct CheckpointCard: View {
    let checkpoint: TourCheckpoint
    let isNear: Bool
    let onAbout: () -> Void

    var typeColor: Color {
        switch checkpoint.type {
        case .building: return AppColors.accent
        case .waypoint: return .orange
        case .viewpoint: return .purple
        }
    }

    var typeIcon: String {
        switch checkpoint.type {
        case .building: return "building.2.fill"
        case .waypoint: return "flag.fill"
        case .viewpoint: return "eye.fill"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label(checkpoint.type.rawValue.capitalized, systemImage: typeIcon)
                    .font(.caption.bold())
                    .foregroundStyle(typeColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(typeColor.opacity(0.12), in: Capsule())

                Spacer()

                if isNear {
                    Label("YOU'RE HERE", systemImage: "location.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.green)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green.opacity(0.12), in: Capsule())
                }
            }

            Text(checkpoint.name)
                .font(.title3.bold())

            if let address = checkpoint.address {
                Text(address)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(checkpoint.narrative)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(4)

            Button(action: onAbout) {
                HStack {
                    Image(systemName: "info.circle")
                    Text("About This Stop")
                }
                .font(.caption.bold())
                .foregroundStyle(AppColors.accent)
            }
        }
        .padding(16)
        .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(isNear ? Color.green : Color.clear, lineWidth: 2)
        )
        .animation(.easeInOut, value: isNear)
        .padding(.horizontal)
    }
}

// MARK: - About Checkpoint Sheet

struct AboutCheckpointSheet: View {
    let checkpoint: TourCheckpoint
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(checkpoint.name)
                        .font(.title2.bold())
                        .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Narrative")
                            .font(.caption.bold())
                            .foregroundStyle(.secondary)
                            .padding(.horizontal)
                        Text(checkpoint.narrative)
                            .font(.body)
                            .padding(.horizontal)
                    }

                    Divider()

                    VStack(alignment: .leading, spacing: 8) {
                        Label("Fun Fact", systemImage: "lightbulb.fill")
                            .font(.caption.bold())
                            .foregroundStyle(.orange)
                            .padding(.horizontal)
                        Text(checkpoint.funFact)
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("About This Stop")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
