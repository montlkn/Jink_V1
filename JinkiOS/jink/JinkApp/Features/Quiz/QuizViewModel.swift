import Foundation
import Supabase

// MARK: - QuizResponse record

private struct QuizResponseRow: Encodable {
    let userId: String
    let questionId: String
    let selectedOptionId: String
    let responseTimeMs: Int
    let responseTimestamp: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case questionId = "question_id"
        case selectedOptionId = "selected_option_id"
        case responseTimeMs = "response_time_ms"
        case responseTimestamp = "response_timestamp"
    }
}

// MARK: - QuizViewModel

@Observable
final class QuizViewModel {
    var questions: [QuizQuestion] = []
    var currentIndex: Int = 0
    var selectedOptionId: String? = nil
    var responses: [(questionId: String, optionId: String, timeMs: Int)] = []
    var isLoading = false
    var isSubmitting = false
    var isDone = false
    var errorMessage: String? = nil
    var isFirstQuizSubmission = false

    private var questionStartTime: Date = Date()
    private static let savedIndexKey = "quiz_saved_index"
    private static let savedResponsesKey = "quiz_saved_responses"

    var currentQuestion: QuizQuestion? { questions[safe: currentIndex] }
    var progress: Double { questions.isEmpty ? 0 : Double(currentIndex) / Double(questions.count) }
    var isLastQuestion: Bool { currentIndex == questions.count - 1 }
    var canGoBack: Bool { currentIndex > 0 }

    func fetchQuestions(userId: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let fetched: [QuizQuestion] = try await SupabaseService.shared.client
                .from("quiz_questions")
                .select("id, question_text, image_url, question_order, question_options(id, option_text, image_url, aesthetic_scores)")
                .order("question_order", ascending: true)
                .execute()
                .value
            questions = fetched
            restoreSavedProgress()
            questionStartTime = Date()
        } catch {
            errorMessage = error.userMessage
            print("[QuizViewModel] Fetch error: \(error)")
        }
    }

    func selectOption(_ optionId: String) {
        selectedOptionId = optionId
    }

    func advance() {
        guard let question = currentQuestion, let optionId = selectedOptionId else { return }
        let timeMs = Int(Date().timeIntervalSince(questionStartTime) * 1000)
        // Replace if already answered this question
        if let idx = responses.firstIndex(where: { $0.questionId == question.id }) {
            responses[idx] = (questionId: question.id, optionId: optionId, timeMs: timeMs)
        } else {
            responses.append((questionId: question.id, optionId: optionId, timeMs: timeMs))
        }
        if currentIndex < questions.count - 1 {
            currentIndex += 1
            selectedOptionId = nil
            questionStartTime = Date()
        }
        saveProgress()
    }

    func goBack() {
        guard canGoBack else { return }
        currentIndex -= 1
        // Restore previous selection if any
        let prevQuestion = questions[currentIndex]
        selectedOptionId = responses.first(where: { $0.questionId == prevQuestion.id })?.optionId
        questionStartTime = Date()
    }

    func submit(userId: String) async {
        // Record the last answer
        if let question = currentQuestion, let optionId = selectedOptionId {
            let timeMs = Int(Date().timeIntervalSince(questionStartTime) * 1000)
            if let idx = responses.firstIndex(where: { $0.questionId == question.id }) {
                responses[idx] = (questionId: question.id, optionId: optionId, timeMs: timeMs)
            } else {
                responses.append((questionId: question.id, optionId: optionId, timeMs: timeMs))
            }
        }

        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }

        do {
            // Detect first-time submission before upserting
            let existingCount = (try? await SupabaseService.shared.client
                .from("quiz_responses")
                .select("user_id", head: true, count: .exact)
                .eq("user_id", value: userId)
                .execute()
                .count) ?? 0
            isFirstQuizSubmission = (existingCount == 0)

            let now = ISO8601DateFormatter().string(from: Date())
            let rows = responses.map { r in
                QuizResponseRow(
                    userId: userId,
                    questionId: r.questionId,
                    selectedOptionId: r.optionId,
                    responseTimeMs: r.timeMs,
                    responseTimestamp: now
                )
            }
            try await SupabaseService.shared.client
                .from("quiz_responses")
                .upsert(rows, onConflict: "user_id,question_id")
                .execute()

            // Call RPC to calculate aesthetic profile — retry up to 2 times on failure
            var rpcError: Error?
            for attempt in 1...3 {
                do {
                    try await SupabaseService.shared.client
                        .rpc("calculate_aesthetic_profile", params: ["p_user_id": AnyJSON.string(userId)])
                        .execute()
                    rpcError = nil
                    break
                } catch {
                    rpcError = error
                    print("[QuizViewModel] calculate_aesthetic_profile attempt \(attempt) failed: \(error)")
                    if attempt < 3 {
                        try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                    }
                }
            }
            if let rpcError {
                // Responses saved — profile will recalculate on next scan/load. Don't block completion.
                print("[QuizViewModel] Profile RPC failed after 3 attempts: \(rpcError). Proceeding.")
            }

            PostHogService.shared.capture("quiz_completed", properties: ["first_time": isFirstQuizSubmission])
            clearSavedProgress()
            isDone = true
        } catch {
            errorMessage = error.userMessage
            print("[QuizViewModel] Submit error: \(error)")
        }
    }

    // MARK: - Progress Persistence

    private func saveProgress() {
        UserDefaults.standard.set(currentIndex, forKey: Self.savedIndexKey)
        let encoded = responses.map { ["q": $0.questionId, "o": $0.optionId, "t": String($0.timeMs)] }
        UserDefaults.standard.set(encoded, forKey: Self.savedResponsesKey)
    }

    private func restoreSavedProgress() {
        let savedIndex = UserDefaults.standard.integer(forKey: Self.savedIndexKey)
        guard savedIndex > 0, savedIndex < questions.count else { return }
        guard let saved = UserDefaults.standard.array(forKey: Self.savedResponsesKey) as? [[String: String]] else { return }

        // Verify saved responses match current question IDs
        let questionIds = Set(questions.map(\.id))
        var restored: [(questionId: String, optionId: String, timeMs: Int)] = []
        for entry in saved {
            guard let q = entry["q"], let o = entry["o"], let t = entry["t"],
                  let timeMs = Int(t), questionIds.contains(q) else { continue }
            restored.append((questionId: q, optionId: o, timeMs: timeMs))
        }
        guard !restored.isEmpty else { return }

        responses = restored
        currentIndex = savedIndex
        selectedOptionId = responses.first(where: { $0.questionId == questions[safe: savedIndex]?.id })?.optionId
        print("[QuizViewModel] Restored progress: question \(savedIndex + 1)/\(questions.count)")
    }

    private func clearSavedProgress() {
        UserDefaults.standard.removeObject(forKey: Self.savedIndexKey)
        UserDefaults.standard.removeObject(forKey: Self.savedResponsesKey)
    }
}

// MARK: - Safe subscript

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
