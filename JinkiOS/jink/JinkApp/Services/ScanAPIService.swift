import Foundation
import UIKit

struct ScanAPIRequest: Encodable, Sendable {
    let lat: Double
    let lng: Double
    let bearing: Double
    // image sent as multipart
}

struct ScanAPIResponse: Decodable {
    let scanId: String?
    let matches: [ScanMatch]
    let showPicker: Bool?
    let canContribute: Bool?
    let verificationMethod: String?
    let processingTimeMs: Int?

    /// Best match = first match (highest confidence)
    var topMatch: ScanMatch? { matches.first }

    /// Verified if we have at least one match with a non-empty BIN
    var verified: Bool {
        guard let top = topMatch else { return false }
        return !top.bin.isEmpty
    }

    /// Memberwise init for cache-hit construction
    init(scanId: String? = nil, matches: [ScanMatch], showPicker: Bool? = false,
         canContribute: Bool? = true, verificationMethod: String? = nil, processingTimeMs: Int? = nil) {
        self.scanId = scanId
        self.matches = matches
        self.showPicker = showPicker
        self.canContribute = canContribute
        self.verificationMethod = verificationMethod
        self.processingTimeMs = processingTimeMs
    }

    enum CodingKeys: String, CodingKey {
        case scanId = "scan_id"
        case matches
        case showPicker = "show_picker"
        case canContribute = "can_contribute"
        case verificationMethod = "verification_method"
        case processingTimeMs = "processing_time_ms"
    }
}

struct ScanMatch: Decodable {
    let bin: String
    let bbl: String?
    let name: String?
    let address: String?
    let architect: String?
    let yearBuilt: String?
    let style: String?
    let materials: String?
    let use: String?
    let distanceMeters: Double?
    let bearingDifference: Double?
    let confidence: Double?
    let isLandmark: Bool?
    let latitude: Double?
    let longitude: Double?

    enum CodingKeys: String, CodingKey {
        case bin, bbl, name, address, architect, style, materials, use, confidence
        case yearBuilt = "year_built"
        case distanceMeters = "distance_meters"
        case bearingDifference = "bearing_difference"
        case isLandmark = "is_landmark"
        case latitude = "geocoded_lat"
        case longitude = "geocoded_lng"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        // BIN can be int, double, or string
        if let binInt = try? container.decode(Int.self, forKey: .bin) {
            self.bin = String(binInt)
        } else if let binDouble = try? container.decode(Double.self, forKey: .bin) {
            self.bin = String(Int(binDouble))
        } else {
            self.bin = (try? container.decode(String.self, forKey: .bin)) ?? ""
        }
        self.bbl = try? container.decodeIfPresent(String.self, forKey: .bbl)
        self.name = try? container.decodeIfPresent(String.self, forKey: .name)
        self.address = try? container.decodeIfPresent(String.self, forKey: .address)
        self.architect = try? container.decodeIfPresent(String.self, forKey: .architect)
        self.style = try? container.decodeIfPresent(String.self, forKey: .style)
        self.materials = try? container.decodeIfPresent(String.self, forKey: .materials)
        self.use = try? container.decodeIfPresent(String.self, forKey: .use)
        self.confidence = try? container.decodeIfPresent(Double.self, forKey: .confidence)
        self.distanceMeters = try? container.decodeIfPresent(Double.self, forKey: .distanceMeters)
        self.bearingDifference = try? container.decodeIfPresent(Double.self, forKey: .bearingDifference)
        self.isLandmark = try? container.decodeIfPresent(Bool.self, forKey: .isLandmark)
        self.latitude = try? container.decodeIfPresent(Double.self, forKey: .latitude)
        self.longitude = try? container.decodeIfPresent(Double.self, forKey: .longitude)
        // yearBuilt: API sends as int, double, or string (e.g. "1901.0")
        if let yearInt = try? container.decode(Int.self, forKey: .yearBuilt) {
            self.yearBuilt = String(yearInt)
        } else if let yearDouble = try? container.decode(Double.self, forKey: .yearBuilt) {
            self.yearBuilt = String(Int(yearDouble))
        } else {
            let raw = try? container.decodeIfPresent(String.self, forKey: .yearBuilt)
            // Trim ".0" suffix from strings like "1901.0"
            if let raw, raw.hasSuffix(".0") {
                self.yearBuilt = String(raw.dropLast(2))
            } else {
                self.yearBuilt = raw
            }
        }
    }

    /// Memberwise init for constructing from cached Building
    init(bin: String, bbl: String? = nil, name: String? = nil, address: String? = nil,
         architect: String? = nil, yearBuilt: String? = nil, style: String? = nil,
         materials: String? = nil, use: String? = nil, distanceMeters: Double? = nil,
         bearingDifference: Double? = nil, confidence: Double? = nil, isLandmark: Bool? = nil,
         latitude: Double? = nil, longitude: Double? = nil) {
        self.bin = bin; self.bbl = bbl; self.name = name; self.address = address
        self.architect = architect; self.yearBuilt = yearBuilt; self.style = style
        self.materials = materials; self.use = use; self.distanceMeters = distanceMeters
        self.bearingDifference = bearingDifference; self.confidence = confidence
        self.isLandmark = isLandmark; self.latitude = latitude; self.longitude = longitude
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

    func scan(image: UIImage, lat: Double, lng: Double, bearing: Double, pitch: Double, gpsAccuracy: Double) async throws -> ScanAPIResponse {
        let delays = [1.0, 2.0, 4.0]
        var attempt = 0
        var lastError: Error?

        while attempt < delays.count + 1 {
            do {
                return try await performScan(image: image, lat: lat, lng: lng, bearing: bearing, pitch: pitch, gpsAccuracy: gpsAccuracy)
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

    private func performScan(image: UIImage, lat: Double, lng: Double, bearing: Double, pitch: Double, gpsAccuracy: Double) async throws -> ScanAPIResponse {
        let baseString = apiURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let endpoint = URL(string: "\(baseString)/api/scan") else { throw URLError(.badURL) }
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.timeoutInterval = 45

        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        guard let resizedImage = image.resized(toMaxDimension: 1200),
              let imageData = resizedImage.jpegData(compressionQuality: 0.85) else {
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
        appendField("gps_accuracy", String(format: "%.1f", gpsAccuracy))

        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode != 200 {
            let body = String(data: data, encoding: .utf8) ?? "no body"
            throw NSError(domain: "ScanAPI", code: http.statusCode,
                          userInfo: [NSLocalizedDescriptionKey: "HTTP \(http.statusCode): \(body)"])
        }
        let decoder = JSONDecoder()
        return try decoder.decode(ScanAPIResponse.self, from: data)
    }
}

extension UIImage {
    func resized(toMaxDimension maxDimension: CGFloat) -> UIImage? {
        let maxDim = max(size.width, size.height)
        if maxDim <= maxDimension { return self }
        let scale = maxDimension / maxDim
        let newWidth = size.width * scale
        let newHeight = size.height * scale
        let newSize = CGSize(width: newWidth, height: newHeight)
        
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1.0
        let renderer = UIGraphicsImageRenderer(size: newSize, format: format)
        return renderer.image { _ in
            self.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }
}
