import Foundation
import UIKit

struct ScanAPIRequest: Encodable {
    let lat: Double
    let lng: Double
    let bearing: Double
    // image sent as multipart
}

struct ScanAPIResponse: Decodable {
    let verified: Bool
    let building: BuildingResult?
    let confidence: Double?
    let message: String?
}

struct BuildingResult: Decodable {
    let bbl: String?
    let name: String?
    let address: String?
    let architect: String?
    let yearBuilt: Int?
    let style: String?
    let description: String?
    let aestheticProfile: AestheticProfile?

    enum CodingKeys: String, CodingKey {
        case bbl, name, address, architect
        case yearBuilt = "year_built"
        case style, description
        case aestheticProfile = "aesthetic_profile"
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

    func scan(image: UIImage, lat: Double, lng: Double, bearing: Double) async throws -> ScanAPIResponse {
        let endpoint = apiURL.appendingPathComponent("/scan")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.timeoutInterval = 30

        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        guard let imageData = image.jpegData(compressionQuality: 0.85) else {
            throw URLError(.cannotEncodeRawData)
        }

        var body = Data()
        // Image field
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"scan.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)

        // lat
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"lat\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(lat)\r\n".data(using: .utf8)!)

        // lng
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"lng\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(lng)\r\n".data(using: .utf8)!)

        // bearing
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"bearing\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(bearing)\r\n".data(using: .utf8)!)

        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        let (data, _) = try await URLSession.shared.data(for: request)
        let decoder = JSONDecoder()
        return try decoder.decode(ScanAPIResponse.self, from: data)
    }
}
