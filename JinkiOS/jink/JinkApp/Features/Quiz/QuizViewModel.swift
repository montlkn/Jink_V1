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

    private var questionStartTime: Date = Date()

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
            questionStartTime = Date()
        } catch {
            errorMessage = error.localizedDescription
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
                .insert(rows)
                .execute()

            // Call RPC to calculate aesthetic profile
            try await SupabaseService.shared.client
                .rpc("calculate_aesthetic_profile", params: ["p_user_id": AnyJSON.string(userId)])
                .execute()

            isDone = true
        } catch {
            errorMessage = error.localizedDescription
            print("[QuizViewModel] Submit error: \(error)")
        }
    }
}

// MARK: - Safe subscript

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
