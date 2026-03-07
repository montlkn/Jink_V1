import SwiftUI
import Supabase

// MARK: - WalkSummaryView

struct WalkSummaryView: View {
    let stats: WalkCompletionStats
    let onDone: () -> Void

    @State private var walkLabel: String = ""
    @State private var isSavingLabel = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // XP Card
                    VStack(spacing: 8) {
                        Text("+\(stats.xpEarned) XP")
                            .font(.system(size: 48, weight: .black, design: .rounded))
                            .foregroundStyle(AppColors.accent)

                        Text("JINK COMPLETE")
                            .font(.caption.bold())
                            .foregroundStyle(.secondary)
                            .kerning(2)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                    .background(AppColors.accent.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
                    .overlay(RoundedRectangle(cornerRadius: 20).stroke(AppColors.accent.opacity(0.2), lineWidth: 1))
                    .padding(.horizontal)

                    // Stats Row
                    HStack(spacing: 12) {
                        SummaryStatCell(
                            value: "\(stats.visitedCount)/\(stats.totalCount)",
                            label: "BUILDINGS",
                            icon: "building.2.fill",
                            color: AppColors.accent
                        )
                        if let km = stats.distanceKm {
                            SummaryStatCell(
                                value: String(format: "%.1f km", km),
                                label: "DISTANCE",
                                icon: "figure.walk",
                                color: AppColors.passport.walk
                            )
                        }
                        if let min = stats.durationMinutes {
                            SummaryStatCell(
                                value: "\(min) min",
                                label: "DURATION",
                                icon: "clock",
                                color: AppColors.passport.achievement
                            )
                        }
                    }
                    .padding(.horizontal)

                    // Walk Name Input
                    VStack(alignment: .leading, spacing: 8) {
                        Text("NAME THIS WALK")
                            .font(.caption.bold())
                            .foregroundStyle(.secondary)
                            .kerning(1)
                        TextField("Optional walk name…", text: $walkLabel)
                            .textFieldStyle(.roundedBorder)
                            .onChange(of: walkLabel) { _, new in
                                if new.count > 50 { walkLabel = String(new.prefix(50)) }
                            }
                    }
                    .padding(.horizontal)

                    // Buildings List
                    VStack(alignment: .leading, spacing: 8) {
                        Text("STOPS")
                            .font(.caption.bold())
                            .foregroundStyle(.secondary)
                            .kerning(1)
                            .padding(.horizontal)

                        VStack(spacing: 6) {
                            ForEach(stats.buildings) { stop in
                                let visited = stats.visitedIds.contains(stop.id)
                                HStack(spacing: 12) {
                                    Image(systemName: visited ? "checkmark.circle.fill" : "xmark.circle")
                                        .foregroundStyle(visited ? AppColors.passport.achievement : .secondary)
                                        .frame(width: 20)

                                    Text(stop.name)
                                        .font(.subheadline)
                                        .foregroundStyle(visited ? .primary : .secondary)

                                    Spacer()

                                    if visited {
                                        Text("+25 XP")
                                            .font(.caption.bold())
                                            .foregroundStyle(AppColors.accent)
                                    }
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 10))
                            }
                        }
                        .padding(.horizontal)
                    }

                    // Done Button
                    Button {
                        Task {
                            if !walkLabel.isEmpty {
                                await saveLabel()
                            }
                            onDone()
                            dismiss()
                        }
                    } label: {
                        if isSavingLabel {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                        } else {
                            Text("DONE")
                                .font(.headline.bold())
                                .kerning(1)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .foregroundStyle(.white)
                                .background(AppColors.accent, in: Capsule())
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 24)
                }
                .padding(.top, 24)
            }
            .navigationTitle("Walk Complete")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func saveLabel() async {
        guard let walkId = stats.walkId, !walkLabel.isEmpty else { return }
        isSavingLabel = true
        defer { isSavingLabel = false }
        do {
            try await SupabaseService.shared.client
                .from("walks")
                .update(["custom_label": walkLabel])
                .eq("id", value: walkId)
                .execute()
        } catch {
            print("[WalkSummaryView] Failed to save label: \(error)")
        }
    }
}

// MARK: - SummaryStatCell

private struct SummaryStatCell: View {
    let value: String
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            Text(value)
                .font(.headline.bold().monospacedDigit())
            Text(label)
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(.secondary)
                .kerning(0.5)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(color.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
    }
}
