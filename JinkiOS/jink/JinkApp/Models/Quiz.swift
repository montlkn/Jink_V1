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

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let intId = try? c.decode(Int.self, forKey: .id) {
            id = String(intId)
        } else {
            id = try c.decode(String.self, forKey: .id)
        }
        questionText = try c.decode(String.self, forKey: .questionText)
        imageUrl = try? c.decodeIfPresent(String.self, forKey: .imageUrl)
        questionOrder = try c.decode(Int.self, forKey: .questionOrder)
        options = try c.decode([QuestionOption].self, forKey: .options)
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

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let intId = try? c.decode(Int.self, forKey: .id) {
            id = String(intId)
        } else {
            id = try c.decode(String.self, forKey: .id)
        }
        optionText = try? c.decodeIfPresent(String.self, forKey: .optionText)
        imageUrl = try? c.decodeIfPresent(String.self, forKey: .imageUrl)
        aestheticScores = (try? c.decode([String: Double].self, forKey: .aestheticScores)) ?? [:]
    }
}
