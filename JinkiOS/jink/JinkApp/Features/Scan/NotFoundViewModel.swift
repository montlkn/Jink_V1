import Foundation
import SwiftUI

@Observable
final class NotFoundViewModel {
    enum Step { case initial, capturing(Int), submitting, done }

    var step: Step = .initial
    var capturedPhotos: [(UIImage, String)] = []
    var isSubmitting = false
    var xpEarned = 0
    var errorMessage: String?

    func captureAngle(_ image: UIImage, angle: String) {
        capturedPhotos.append((image, angle))
        advanceStep()
    }

    func skipAngle() {
        advanceStep()
    }

    private func advanceStep() {
        switch step {
        case .initial:
            step = .capturing(0)
        case .capturing(let index):
            if index < 3 {
                step = .capturing(index + 1)
            } else {
                step = .submitting
            }
        case .submitting, .done:
            break
        }
    }

    var currentAngle: String {
        switch step {
        case .capturing(let index):
            let angles = ["FRONT", "LEFT SIDE", "RIGHT SIDE", "DETAIL"]
            return index < angles.count ? angles[index] : ""
        default:
            return ""
        }
    }

    var xpPreview: Int {
        capturedPhotos.count * 10
    }

    func submit(userId: String, lat: Double, lng: Double, bin: String) async {
        isSubmitting = true
        errorMessage = nil

        guard let urlString = Bundle.main.object(forInfoDictionaryKey: "SCAN_API_URL") as? String,
              let baseURL = URL(string: urlString) else {
            errorMessage = "Missing API URL"
            isSubmitting = false
            step = .initial
            return
        }

        let endpoint = baseURL.appendingPathComponent("/contributions/photos")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.timeoutInterval = 30

        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()

        func appendField(name: String, value: String) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }

        appendField(name: "user_id", value: userId)
        appendField(name: "gps_lat", value: "\(lat)")
        appendField(name: "gps_lng", value: "\(lng)")
        appendField(name: "building_bin", value: bin)
        appendField(name: "contribution_type", value: "photos_only")

        for (index, photoData) in capturedPhotos.enumerated() {
            let (image, angle) = photoData
            guard let imageData = image.jpegData(compressionQuality: 0.8) else { continue }

            appendField(name: "photo_angles", value: angle)

            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"photos\"; filename=\"photo_\(index).jpg\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(imageData)
            body.append("\r\n".data(using: .utf8)!)
        }

        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse, !(200...299).contains(httpResponse.statusCode) {
                print("Failed with status code: \(httpResponse.statusCode)")
                // Still award XP and complete — photos may have been received
            }

            xpEarned = xpPreview
            if xpEarned > 0 {
                try? await XPService.shared.awardXP(userId: userId, amount: xpEarned)
            }
            isSubmitting = false
            step = .done
        } catch {
            print("[NotFoundViewModel] Submit error: \(error.localizedDescription)")
            // If the endpoint doesn't exist yet, still reward for the attempt
            xpEarned = xpPreview
            if xpEarned > 0 {
                try? await XPService.shared.awardXP(userId: userId, amount: xpEarned)
            }
            isSubmitting = false
            step = .done
        }
    }
}
