import SwiftUI
import Auth

// MARK: - OnboardingQuizView

struct OnboardingQuizView: View {
    @Environment(AppState.self) private var appState
    @State private var vm = QuizViewModel()
    @State private var showResults = false

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView("Loading quiz…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if vm.questions.isEmpty {
                    VStack(spacing: 16) {
                        Text("Could not load quiz.")
                            .foregroundStyle(.secondary)
                        if let err = vm.errorMessage {
                            Text(err).font(.caption).foregroundStyle(.red)
                        }
                        Button("Retry") {
                            Task {
                                if let userId = appState.currentUser?.id.uuidString {
                                    await vm.fetchQuestions(userId: userId)
                                }
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let question = vm.currentQuestion {
                    QuizQuestionView(
                        vm: vm,
                        question: question,
                        onNext: {
                            if vm.isLastQuestion {
                                Task {
                                    if let userId = appState.currentUser?.id.uuidString {
                                        await vm.submit(userId: userId)
                                        if vm.isDone { showResults = true }
                                    }
                                }
                            } else {
                                vm.advance()
                            }
                        }
                    )
                }
            }
            .navigationDestination(isPresented: $showResults) {
                QuizResultsView()
            }
            .navigationBarHidden(true)
        }
        .task {
            if let userId = appState.currentUser?.id.uuidString {
                await vm.fetchQuestions(userId: userId)
            }
        }
    }
}

// MARK: - QuizQuestionView

private struct QuizQuestionView: View {
    @Bindable var vm: QuizViewModel
    let question: QuizQuestion
    let onNext: () -> Void

    let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        VStack(spacing: 0) {
            // Progress bar + counter
            VStack(spacing: 8) {
                HStack {
                    if vm.canGoBack {
                        Button(action: { vm.goBack() }) {
                            Image(systemName: "chevron.left")
                                .font(.body.bold())
                                .foregroundStyle(.primary)
                        }
                    } else {
                        Spacer().frame(width: 24)
                    }
                    Spacer()
                    Text("Q \(vm.currentIndex + 1) OF \(vm.questions.count)")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                        .kerning(1)
                    Spacer()
                    Spacer().frame(width: 24)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color(.systemGray5))
                        Capsule()
                            .fill(AppColors.accent)
                            .frame(width: geo.size.width * vm.progress)
                            .animation(.spring(duration: 0.4), value: vm.progress)
                    }
                }
                .frame(height: 4)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 12)

            ScrollView {
                VStack(spacing: 20) {
                    // Question text
                    Text(question.questionText.uppercased())
                        .font(.system(.headline, design: .monospaced, weight: .bold))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)

                    // Optional question image
                    if let imageUrl = question.imageUrl, let url = URL(string: imageUrl) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let img):
                                img.resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 180)
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                            default:
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color(.systemGray5))
                                    .frame(height: 180)
                            }
                        }
                        .padding(.horizontal, 20)
                    }

                    // 2×2 option grid
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(question.options) { option in
                            OptionCard(
                                option: option,
                                isSelected: vm.selectedOptionId == option.id,
                                onTap: { vm.selectOption(option.id) }
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.bottom, 100)
            }

            // Next / Submit button
            VStack {
                Button(action: onNext) {
                    if vm.isSubmitting {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                    } else {
                        Text(vm.isLastQuestion ? "SUBMIT" : "NEXT →")
                            .font(.headline.bold())
                            .kerning(1)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .foregroundStyle(.white)
                            .background(
                                vm.selectedOptionId != nil ? AppColors.accent : Color(.systemGray4),
                                in: Capsule()
                            )
                    }
                }
                .disabled(vm.selectedOptionId == nil || vm.isSubmitting)
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
            }
            .background(.ultraThinMaterial)
        }
    }
}

// MARK: - OptionCard

private struct OptionCard: View {
    let option: QuestionOption
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                if let imageUrl = option.imageUrl, let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let img):
                            img.resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(maxWidth: .infinity)
                                .frame(height: 90)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        default:
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color(.systemGray5))
                                .frame(height: 90)
                        }
                    }
                }

                if let text = option.optionText {
                    Text(text)
                        .font(.caption.bold())
                        .multilineTextAlignment(.center)
                        .lineLimit(3)
                        .foregroundStyle(isSelected ? AppColors.accent : .primary)
                        .padding(.horizontal, 8)
                }
            }
            .padding(10)
            .frame(maxWidth: .infinity, minHeight: 60)
            .background(
                isSelected ? AppColors.accent.opacity(0.1) : Color(.systemGray6),
                in: RoundedRectangle(cornerRadius: 12)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? AppColors.accent : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }
}
