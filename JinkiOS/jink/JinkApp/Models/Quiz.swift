import Foundation

// MARK: - QuizQuestion

struct QuizQuestion: Decodable, Identifiable {
    let id: String
    let questionText: String
    let imageUrl: String?
    let questionOrder: Int
    let options: [QuestionOption]

    enum CodingKeys: String, CodingKey {
        case id
        case questionText = "question_text"
        case imageUrl = "image_url"
        case questionOrder = "question_order"
        case options = "question_options"
    }
}

// MARK: - QuestionOption

struct QuestionOption: Decodable, Identifiable {
    let id: String
    let optionText: String?
    let imageUrl: String?
    let aestheticScores: [String: Double]

    enum CodingKeys: String, CodingKey {
        case id
        case optionText = "option_text"
        case imageUrl = "image_url"
        case aestheticScores = "aesthetic_scores"
    }
}
