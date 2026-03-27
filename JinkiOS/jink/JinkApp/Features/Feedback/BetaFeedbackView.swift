import SwiftUI
import Auth

struct BetaFeedbackView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var featureIdea = ""
    @State private var painPoint = ""
    @State private var isSubmitting = false
    @State private var didSubmit = false

    private var canSubmit: Bool {
        !featureIdea.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
        !painPoint.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("BETA FEEDBACK")
                        .font(.system(size: 11, weight: .semibold, design: .monospaced))
                        .foregroundStyle(AppColors.accent)
                    Text("Help shape Jink")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(.primary)
                }
                Spacer()
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 28)
            .padding(.bottom, 24)

            if didSubmit {
                Spacer()
                VStack(spacing: 12) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(AppColors.accent)
                    Text("Thanks for the feedback.")
                        .font(.system(size: 18, weight: .semibold))
                    Text("We read every response.")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                }
                Spacer()
            } else {
                ScrollView {
                    VStack(spacing: 20) {
                        feedbackField(
                            label: "WHAT WOULD YOU BUILD?",
                            placeholder: "Feature ideas, missing pieces, dream features...",
                            text: $featureIdea
                        )

                        feedbackField(
                            label: "WHAT'S FRUSTRATING?",
                            placeholder: "Bugs, friction, things that don't make sense...",
                            text: $painPoint
                        )
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                }

                Button(action: submitFeedback) {
                    Group {
                        if isSubmitting {
                            ProgressView()
                                .tint(.black)
                        } else {
                            Text("Submit")
                                .font(.system(size: 16, weight: .semibold))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(canSubmit ? AppColors.accent : Color.gray.opacity(0.3))
                    .foregroundStyle(canSubmit ? .black : .secondary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(!canSubmit || isSubmitting)
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
            }
        }
        .background(Color(.systemBackground))
    }

    @ViewBuilder
    private func feedbackField(label: String, placeholder: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(.secondary)
            TextEditor(text: text)
                .frame(minHeight: 100)
                .padding(12)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(alignment: .topLeading) {
                    if text.wrappedValue.isEmpty {
                        Text(placeholder)
                            .font(.system(size: 14))
                            .foregroundStyle(.tertiary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 20)
                            .allowsHitTesting(false)
                    }
                }
        }
    }

    private func submitFeedback() {
        guard let userId = appState.currentUser?.id.uuidString else { return }
        isSubmitting = true
        Task {
            do {
                try await FeedbackService.shared.submit(
                    userId: userId,
                    featureIdea: featureIdea.trimmingCharacters(in: .whitespacesAndNewlines),
                    painPoint: painPoint.trimmingCharacters(in: .whitespacesAndNewlines)
                )
                await MainActor.run {
                    didSubmit = true
                    isSubmitting = false
                }
                try? await Task.sleep(for: .seconds(1.5))
                await MainActor.run { dismiss() }
            } catch {
                await MainActor.run { isSubmitting = false }
                print("[BetaFeedbackView] Submit error: \(error)")
            }
        }
    }
}

#Preview {
    BetaFeedbackView()
        .environment(AppState())
}
