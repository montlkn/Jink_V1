import SwiftUI

// MARK: - NavFooter (Verify removed — AR handles it)

struct WalkNavFooter: View {
    let vm: WalkViewModel
    let completeAction: () -> Void
    let adHocScanAction: () -> Void
    /// Current Apple Maps route instruction, shown above Skip
    var routeInstruction: String? = nil

    var body: some View {
        VStack(spacing: 24) {
            // Route instruction pill
            if let instruction = routeInstruction {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.triangle.turn.up.right.diamond.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(AppColors.accent)
                        Text("NEXT ROUTE")
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundStyle(AppColors.accent)
                    }
                    
                    Text(instruction)
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                        .minimumScaleFactor(0.5)
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppColors.accent.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppColors.accent.opacity(0.15), lineWidth: 1))
                .padding(.bottom, 8)
            }

            // Unified Action Row (Bottom Left Layout)
            HStack(spacing: 16) {
                // Ad-hoc Scan
                Button(action: adHocScanAction) {
                    Image(systemName: "camera.viewfinder")
                        .font(.title2)
                        .foregroundStyle(AppColors.accent)
                        .frame(width: 56, height: 56)
                        .background(Color(.systemBackground), in: Circle())
                        .overlay(Circle().stroke(AppColors.accent, lineWidth: 2))
                }

                // Skip Current Stop
                Button(action: { vm.skipBuilding() }) {
                    Image(systemName: "forward.end.fill")
                        .font(.title2)
                        .foregroundStyle(.primary)
                        .frame(width: 50, height: 50)
                        .background(Color(.systemBackground).opacity(0.9), in: Circle())
                        .overlay(Circle().stroke(Color.primary.opacity(0.2), lineWidth: 1))
                }
                .disabled(vm.buildings.isEmpty)
                
                // Undo Skip (Back to previous)
                Button(action: { vm.undoSkipBuilding() }) {
                    Image(systemName: "arrow.uturn.backward")
                        .font(.title2)
                        .foregroundStyle(vm.currentBuildingIndex > 0 ? .primary : Color.primary.opacity(0.3))
                        .frame(width: 50, height: 50)
                        .background(Color(.systemBackground).opacity(0.9), in: Circle())
                        .overlay(Circle().stroke(Color.primary.opacity(0.2), lineWidth: 1))
                }
                .disabled(vm.currentBuildingIndex == 0)

                Spacer()
            }

            // "End Walk Early" — only after visiting at least one building
            if !vm.visitedBuildingIds.isEmpty {
                Button(action: completeAction) {
                    if vm.isCompleting {
                        ProgressView().tint(Color(red: 1, green: 0.27, blue: 0.27))
                    } else {
                        Text("End Walk Early")
                            .font(.subheadline.bold())
                            .foregroundStyle(Color(red: 1, green: 0.27, blue: 0.27))
                    }
                }
                .disabled(vm.isCompleting)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
        .animation(.spring(duration: 0.35), value: vm.visitedBuildingIds.isEmpty)
    }
}

// MARK: - XPSummarySheet

struct XPSummarySheet: View {
    let xpEarned: Int
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "star.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(AppColors.accent)
                .symbolRenderingMode(.multicolor)

            Text("Walk Complete!")
                .font(.largeTitle.bold())

            Text("+\(xpEarned) XP")
                .font(.title.bold())
                .foregroundStyle(AppColors.accent)

            Button("Done") { dismiss() }
                .buttonStyle(.borderedProminent)
                .tint(AppColors.passport.walk)
        }
        .padding(40)
        .presentationDetents([.medium])
    }
}
