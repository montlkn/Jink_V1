import SwiftUI
import Auth

// MARK: - Image cache

/// Disk+memory cached image loader so quiz images don't re-download on every question.
@Observable
private final class CachedImageLoader {
    var image: UIImage? = nil
    private static let cache: URLCache = {
        URLCache(memoryCapacity: 20 * 1024 * 1024,   // 20 MB memory
                 diskCapacity: 100 * 1024 * 1024,     // 100 MB disk
                 diskPath: "quiz_images")
    }()

    func load(url: URL) {
        let req = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad, timeoutInterval: 30)
        if let cached = Self.cache.cachedResponse(for: req),
           let img = UIImage(data: cached.data) {
            image = img
            return
        }
        Task {
            do {
                let (data, response) = try await URLSession.shared.data(for: req)
                let cached = CachedURLResponse(response: response, data: data)
                Self.cache.storeCachedResponse(cached, for: req)
                if let img = UIImage(data: data) {
                    await MainActor.run { image = img }
                }
            } catch {}
        }
    }
}

private struct CachedAsyncImage: View {
    let url: URL
    @State private var loader = CachedImageLoader()

    var body: some View {
        Group {
            if let img = loader.image {
                Image(uiImage: img)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } else {
                Color(.systemGray6)
                    .overlay(ProgressView().scaleEffect(0.7))
            }
        }
        .task(id: url.absoluteString) { loader.load(url: url) }
    }
}

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

    // Image questions: 2-col grid. Text-only: single column.
    private var hasImages: Bool { question.options.contains { $0.imageUrl != nil } }
    private var columns: [GridItem] {
        hasImages
            ? [GridItem(.flexible()), GridItem(.flexible())]
            : [GridItem(.flexible())]
    }

    var body: some View {
        VStack(spacing: 0) {
            // ── Progress ─────────────────────────────────────────
            VStack(spacing: 10) {
                HStack {
                    if vm.canGoBack {
                        Button { vm.goBack() } label: {
                            Image(systemName: "chevron.left")
                                .font(.body.bold())
                                .foregroundStyle(.primary)
                        }
                    } else {
                        Spacer().frame(width: 28)
                    }
                    Spacer()
                    Text("\(vm.currentIndex + 1) / \(vm.questions.count)")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                    Spacer()
                    Spacer().frame(width: 28)
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
            .padding(.bottom, 16)

            // ── Content ───────────────────────────────────────────
            ScrollView {
                VStack(spacing: 24) {
                    // Question text
                    Text(question.questionText)
                        .font(.system(size: 28, weight: .bold))
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.horizontal, 20)

                    // Options
                    LazyVGrid(columns: columns, spacing: hasImages ? 14 : 10) {
                        ForEach(question.options) { option in
                            OptionCard(
                                option: option,
                                isSelected: vm.selectedOptionId == option.id,
                                hasImages: hasImages,
                                onTap: {
                                    vm.selectOption(option.id)
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                                        onNext()
                                    }
                                }
                            )
                        }
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.bottom, 32)
            }

            // ── Bottom bar ────────────────────────────────────────
            Group {
                if vm.isLastQuestion {
                    Button(action: onNext) {
                        if vm.isSubmitting {
                            ProgressView().frame(maxWidth: .infinity).padding(.vertical, 16)
                        } else {
                            Text("SUBMIT")
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
                    .padding(.vertical, 14)
                } else if vm.canGoBack {
                    Button { vm.goBack() } label: {
                        HStack(spacing: 5) {
                            Image(systemName: "chevron.left")
                            Text("Back")
                        }
                        .font(.subheadline.bold())
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                    }
                    .padding(.horizontal, 20)
                } else {
                    Spacer().frame(height: 52)
                }
            }
            .background(.ultraThinMaterial)
        }
    }
}

// MARK: - OptionCard

private struct OptionCard: View {
    let option: QuestionOption
    let isSelected: Bool
    let hasImages: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                if let imageUrl = option.imageUrl, let url = URL(string: imageUrl) {
                    CachedAsyncImage(url: url)
                        .frame(maxWidth: .infinity)
                        // aspect fit so image is never cropped — height determined by content
                        .aspectRatio(contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: isSelected ? 11 : 11))
                }

                if let text = option.optionText, !text.isEmpty {
                    Text(text)
                        .font(.system(size: hasImages ? 14 : 17, weight: .semibold))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(isSelected ? AppColors.accent : .primary)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.horizontal, 10)
                        .padding(.vertical, hasImages ? 8 : 14)
                        .frame(maxWidth: .infinity)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(
                        isSelected ? AppColors.accent : Color(.systemGray4),
                        lineWidth: isSelected ? 2.5 : 1
                    )
            )
            .animation(.easeOut(duration: 0.15), value: isSelected)
        }
        .buttonStyle(.plain)
    }
}
