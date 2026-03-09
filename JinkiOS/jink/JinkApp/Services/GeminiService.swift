import Foundation

enum GeminiService {
    private static var apiKey: String {
        Bundle.main.object(forInfoDictionaryKey: "GEMINI_API_KEY") as? String ?? ""
    }

    /// Calls Gemini 2.0 Flash Lite and returns the first text response, or nil on failure.
    static func generate(prompt: String, maxTokens: Int = 200, temperature: Double = 0.8) async -> String? {
        guard !apiKey.isEmpty, apiKey != "REPLACE_WITH_YOUR_KEY" else {
            print("[GeminiService] ⚠️ No API key configured")
            return nil
        }
        guard let url = URL(string: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=\(apiKey)") else { return nil }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.timeoutInterval = 10

        let body: [String: Any] = [
            "contents": [["parts": [["text": prompt]]]],
            "generationConfig": ["maxOutputTokens": maxTokens, "temperature": temperature]
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: body) else { return nil }
        req.httpBody = data

        do {
            let (res, _) = try await URLSession.shared.data(for: req)
            if let json = try? JSONSerialization.jsonObject(with: res) as? [String: Any],
               let candidates = json["candidates"] as? [[String: Any]],
               let content = candidates.first?["content"] as? [String: Any],
               let parts = content["parts"] as? [[String: Any]],
               let text = parts.first?["text"] as? String {
                return text.trimmingCharacters(in: .whitespacesAndNewlines)
            }
        } catch {
            print("[GeminiService] ❌ \(error)")
        }
        return nil
    }
}
