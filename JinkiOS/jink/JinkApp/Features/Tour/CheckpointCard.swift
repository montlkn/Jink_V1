import SwiftUI

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
                        .foregroundStyle(AppColors.accent)
                    Text("About This Stop")
                        .font(.caption.bold())
                        .foregroundStyle(AppColors.accent)
                }
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
