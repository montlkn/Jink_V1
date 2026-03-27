import SwiftUI

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
