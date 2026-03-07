import SwiftUI

struct TourSelectView: View {
    @State private var selectedTour: TourDefinition? = nil
    @State private var vm = TourViewModel()

    var tours: [TourDefinition] { PassportContent.allTours }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                ForEach(tours) { tour in
                    TourCard(tour: tour)
                        .onTapGesture {
                            vm.startTour(tour)
                            selectedTour = tour
                        }
                }
            }
            .padding()
        }
        .navigationTitle("Tours")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(item: $selectedTour) { _ in
            TourNavView(vm: vm)
        }
    }
}

// MARK: - Tour Card

struct TourCard: View {
    let tour: TourDefinition

    var difficultyColor: Color {
        switch tour.difficulty.lowercased() {
        case "easy": return .green
        case "hard": return .red
        default: return .orange
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(tour.name)
                        .font(.headline)
                        .lineLimit(2)
                    Text(tour.subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text(tour.difficulty)
                    .font(.caption.bold())
                    .foregroundStyle(difficultyColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(difficultyColor.opacity(0.15), in: Capsule())
            }

            HStack(spacing: 20) {
                TourStatPill(icon: "clock", value: "\(tour.durationMinutes) min")
                TourStatPill(icon: "figure.walk", value: String(format: "%.1f mi", tour.distanceMiles))
                TourStatPill(icon: "mappin", value: "\(tour.checkpoints.count) stops")
                TourStatPill(icon: "star.fill", value: "+\(tour.xpReward) XP")
            }

            HStack {
                Spacer()
                Label("Start Tour", systemImage: "play.fill")
                    .font(.subheadline.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(AppColors.accent, in: Capsule())
            }
        }
        .padding(16)
        .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppColors.accent.opacity(0.3), lineWidth: 1))
    }
}

struct TourStatPill: View {
    let icon: String
    let value: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10))
                .foregroundStyle(AppColors.accent)
            Text(value)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.secondary)
        }
    }
}
