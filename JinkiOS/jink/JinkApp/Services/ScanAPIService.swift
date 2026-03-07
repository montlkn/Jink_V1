import Foundation
import UIKit

struct ScanAPIRequest: Encodable, Sendable {
    let lat: Double
    let lng: Double
    let bearing: Double
    // image sent as multipart
}

struct ScanAPIResponse: Decodable {
    let building: BuildingResult?
    let confidence: Double?
    let message: String?

    // Derived: verified if the API returned a building with a bin
    var verified: Bool { building?.bin != nil }

    init(building: BuildingResult?, confidence: Double?, message: String?) {
        self.building = building
        self.confidence = confidence
        self.message = message
    }

    enum CodingKeys: String, CodingKey {
        case building, confidence, message
    }
}

struct BuildingResult: Decodable {
    let bin: String?
    let bbl: String?
    let name: String?
    let address: String?
    let architect: String?
    let yearBuilt: Int?
    let style: String?
    let description: String?
    let aestheticProfile: AestheticProfile?
    let latitude: Double?
    let longitude: Double?

    enum CodingKeys: String, CodingKey {
        case bin, bbl, name, address, architect
        case yearBuilt = "year_built"
        case style, description
        case aestheticProfile = "aesthetic_profile"
        case latitude = "geocoded_lat"
        case longitude = "geocoded_lng"
    }
}

final class ScanAPIService {
    static let shared = ScanAPIService()
    private init() {}

    private var apiURL: URL {
        guard
            let urlString = Bundle.main.object(forInfoDictionaryKey: "SCAN_API_URL") as? String,
            let url = URL(string: urlString)
        else {
            fatalError("Missing SCAN_API_URL in Info.plist")
        }
        return url
    }

    func scan(image: UIImage, lat: Double, lng: Double, bearing: Double, pitch: Double, altitude: Double) async throws -> ScanAPIResponse {
        let delays = [1.0, 2.0, 4.0]
        var attempt = 0
        var lastError: Error?

        while attempt < delays.count + 1 {
            do {
                return try await performScan(image: image, lat: lat, lng: lng, bearing: bearing, pitch: pitch, altitude: altitude)
            } catch {
                lastError = error
                if attempt < delays.count {
                    try await Task.sleep(nanoseconds: UInt64(delays[attempt] * 1_000_000_000))
                } else {
                    break
                }
                attempt += 1
            }
        }
        throw lastError ?? URLError(.unknown)
    }

    private func performScan(image: UIImage, lat: Double, lng: Double, bearing: Double, pitch: Double, altitude: Double) async throws -> ScanAPIResponse {
        let endpoint = apiURL.appendingPathComponent("/api/scan")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.timeoutInterval = 45

        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        guard let imageData = image.jpegData(compressionQuality: 0.85) else {
            throw URLError(.unknown)
        }

        var body = Data()

        func appendField(_ name: String, _ value: String) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }

        // Photo field — API expects "photo" not "image"
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"photo\"; filename=\"scan.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)

        appendField("gps_lat", "\(lat)")
        appendField("gps_lng", "\(lng)")
        appendField("compass_bearing", "\(bearing)")
        appendField("phone_pitch", "\(pitch)")
        appendField("phone_roll", "0")
        appendField("altitude", "\(altitude)")

        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        let (data, _) = try await URLSession.shared.data(for: request)
        let decoder = JSONDecoder()
        return try decoder.decode(ScanAPIResponse.self, from: data)
    }
}
