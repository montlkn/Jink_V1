import SwiftUI

struct TourCompleteView: View {
    let vm: TourViewModel
    let onDone: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                // Celebration header
                VStack(spacing: 12) {
                    let starImage = Image(systemName: "star.circle.fill")
                        .font(.system(size: 72))
                        .foregroundStyle(Color(hex: "#FFD700"))
                    
                    if #available(iOS 18.0, *) {
                        starImage
                            .symbolEffect(.bounce, options: .repeating.speed(0.5))
                            .padding(.top, 32)
                    } else {
                        starImage
                            .padding(.top, 32)
                    }

                    Text("Tour Complete!")
                        .font(.largeTitle.bold())

                    if let badgeName = vm.tour?.badgeName {
                        HStack(spacing: 6) {
                            Image(systemName: "rosette")
                                .foregroundStyle(AppColors.accent)
                            Text("Badge Earned: \(badgeName)")
                                .font(.subheadline.bold())
                                .foregroundStyle(AppColors.accent)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(AppColors.accent.opacity(0.12), in: Capsule())
                    }
                }

                // XP earned
                VStack(spacing: 4) {
                    Text("+\(vm.xpEarned)")
                        .font(.system(size: 48, weight: .black, design: .rounded))
                        .foregroundStyle(AppColors.accent)
                    Text("XP EARNED")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                        .kerning(2)
                }
                .padding(.vertical, 20)
                .frame(maxWidth: .infinity)
                .background(AppColors.accent.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppColors.accent.opacity(0.3), lineWidth: 1))
                .padding(.horizontal)

                // Stats
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    TourStatCard(value: "\(vm.visitedCheckpointIds.count)", label: "Stops", icon: "mappin.circle.fill")
                    TourStatCard(value: vm.distanceLabel, label: "Distance", icon: "figure.walk")
                    TourStatCard(value: vm.elapsedLabel, label: "Duration", icon: "clock.fill")
                }
                .padding(.horizontal)

                // Tour summary
                if let tour = vm.tour {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Summary")
                            .font(.headline)
                        Text(tour.summaryText)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                    .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)
                }

                Button(action: onDone) {
                    Text("Back to Passport")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(AppColors.accent, in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(.white)
                }
                .padding(.horizontal)
                .padding(.bottom, 32)
            }
        }
        .navigationTitle("Tour Complete")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
    }
}

struct TourStatCard: View {
    let value: String
    let label: String
    let icon: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(AppColors.accent)
            Text(value)
                .font(.headline.bold().monospacedDigit())
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 10))
    }
}
