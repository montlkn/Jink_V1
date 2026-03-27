import SwiftUI

// MARK: - NavHeader

struct WalkNavHeader: View {
    let vm: WalkViewModel
    let onPause: () -> Void
    var xpScale: Double = 1

    var body: some View {
        HStack {
            Button(action: onPause) {
                HStack(spacing: 6) {
                    Image(systemName: "pause.fill")
                        .font(.caption.bold())
                    Text("PAUSE")
                        .font(.caption.bold())
                        .kerning(1)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(.regularMaterial, in: Capsule())
            }
            .foregroundStyle(.primary)

            Spacer()

            HStack(spacing: 8) {
                if vm.walkXP > 0 {
                    Text("+\(vm.walkXP) XP")
                        .font(.caption.bold())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(AppColors.accent, in: Capsule())
                        .scaleEffect(xpScale)
                        .transition(.scale.combined(with: .opacity))
                }

                if !vm.buildings.isEmpty {
                    Text("\(vm.currentBuildingIndex + 1) of \(vm.buildings.count)")
                        .font(.caption.bold())
                        .foregroundStyle(.primary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(.regularMaterial, in: Capsule())
                        .overlay(Capsule().stroke(Color.primary.opacity(0.15), lineWidth: 1))
                }
            }
            .animation(.spring(duration: 0.3), value: vm.walkXP)
        }
    }
}
