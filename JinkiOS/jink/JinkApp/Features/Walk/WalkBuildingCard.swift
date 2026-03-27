import SwiftUI

// MARK: - BuildingCard (streamlined — no radar, no directions block)

struct WalkBuildingCard: View {
    let vm: WalkViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Next Stop")
                .font(.caption.bold())
                .foregroundStyle(.secondary)
                .kerning(1)
                .textCase(.uppercase)

            Text(vm.currentStop?.displayName ?? "Generating your route…")
                .font(.title3.bold())
                .lineLimit(2)

            // Style tag — wraps to second line instead of truncating
            if let style = vm.currentStop?.style {
                HStack(spacing: 8) {
                    Text(style.uppercased())
                        .font(.caption2.bold())
                        .foregroundStyle(AppColors.accent)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(AppColors.accent.opacity(0.1), in: Capsule())
                        .fixedSize(horizontal: false, vertical: true)

                    if let matched = vm.currentStop?.matchedAesthetic {
                        Text("\(matched.uppercased()) MATCH")
                            .font(.caption2.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color(white: 0.2), in: Capsule())
                    }
                }
            } else if let matched = vm.currentStop?.matchedAesthetic {
                Text("\(matched.uppercased()) MATCH")
                    .font(.caption2.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(white: 0.2), in: Capsule())
            }

            // Gemini Insight Block (One sentence)
            if vm.isFetchingInsight {
                Text("Analyzing architecture...")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .italic()
                    .padding(.vertical, 2)
            } else if let insight = vm.currentStopInsight {
                Text("\(insight)")
                    .font(.caption.italic())
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .padding(.vertical, 2)
            }

            // Single distance · time badge
            if let dist = vm.distanceToCurrentStop {
                let isTooFar = dist > 80_467 // > ~50 miles
                HStack(spacing: 4) {
                    Image(systemName: isTooFar ? "exclamationmark.triangle.fill" : "location.fill")
                        .font(.caption2)
                    Text(isTooFar ? "Not near route — use for testing" : "\(vm.distanceString) · \(vm.etaString)")
                        .font(.caption.bold())
                }
                .foregroundStyle(isTooFar ? .orange : AppColors.accent)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background((isTooFar ? Color.orange : AppColors.accent).opacity(0.1))
                .clipShape(Capsule())
                .overlay(Capsule().stroke((isTooFar ? Color.orange : AppColors.accent).opacity(0.3), lineWidth: 1))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.1), radius: 16, x: 0, y: 8)
    }
}
