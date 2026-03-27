import SwiftUI

// MARK: - Building Detail Sheet

struct BuildingDetailSheet: View {
    let building: Building
    let vm: ExploreViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var aiOneLiner: String? = nil
    @State private var loadingOneLiner = false

    private var score: Double { vm.matchScore(for: building) }
    private var accentColor: Color { archetypeColor(for: building.primaryAesthetic ?? building.style) }

    private var displayName: String {
        guard let name = building.name, !name.isEmpty, name != "0" else {
            return building.address ?? "Unknown Building"
        }
        let cleaned = name.replacingOccurrences(of: "Court Name: ", with: "").replacingOccurrences(of: "Court Name:", with: "").trimmingCharacters(in: .whitespaces)
        return cleaned.isEmpty ? (building.address ?? "Unknown Building") : cleaned
    }

    private var showAddressLine: Bool {
        let name = displayName
        return building.address != nil && name != building.address
    }

    private var cleanYear: String? {
        guard let raw = building.yearBuilt, !raw.isEmpty, raw != "0" else { return nil }
        if let d = Double(raw), d > 1000 { return String(Int(d)) }
        return raw
    }

    private var cleanDescription: String? {
        guard let d = building.description, !d.isEmpty, Double(d) == nil else { return nil }
        return d
    }

    private var headerTitle: String {
        if let dominant = building.aestheticProfile?.dominant?.name { return dominant }
        if let primary = building.primaryAesthetic, primary != "0" && !primary.isEmpty { return primary }
        if let style = building.style, style != "0" && !style.isEmpty { return style }
        return "Building"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // ── Header (Category) ────────────────────────
                HStack {
                    HStack(spacing: 6) {
                        Circle().fill(accentColor).frame(width: 8, height: 8)
                        Text(headerTitle.uppercased())
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundStyle(accentColor)
                    }
                    Spacer()
                }

                // ── Title & Thumbnail Row ─────────────────────────────
                HStack(alignment: .top, spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(displayName)
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(.primary)
                            .fixedSize(horizontal: false, vertical: true)

                        if showAddressLine, let address = building.address {
                            Text(address)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                    
                    // Thumbnail with Fallback
                    AsyncImage(url: URL(string: "https://pub-234fc67c039149b2b46b864a1357763d.r2.dev/\(building.bin)/0deg_40pitch.jpg")) { phase in
                        if let img = phase.image {
                            img.resizable().scaledToFill()
                        } else if phase.error != nil {
                            AsyncImage(url: URL(string: "https://pub-234fc67c039149b2b46b864a1357763d.r2.dev/\(building.bin)/0deg_0pitch.jpg")) { phase2 in
                                if let img2 = phase2.image { img2.resizable().scaledToFill() }
                                else { Rectangle().fill(Color(.systemGray6)).overlay(Image(systemName: "photo").foregroundStyle(.secondary)) }
                            }
                        } else { Rectangle().fill(Color(.systemGray6)).overlay(ProgressView().scaleEffect(0.5)) }
                    }
                    .frame(width: 65, height: 65)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .shadow(color: .black.opacity(0.1), radius: 4, y: 2)
                }

                // ── Meta grid ────────────────────────────────────────
                VStack(spacing: 0) {
                    if let year = cleanYear {
                        MetaRow(label: "BUILT", value: year)
                        Divider().opacity(0.2)
                    }
                    if let arch = building.architect, !arch.isEmpty && arch != "0" {
                        MetaRow(label: "ARCHITECT", value: arch)
                        Divider().opacity(0.2)
                    }
                    if let style = building.style ?? building.secondaryAesthetic, !style.isEmpty && style != "0" {
                        MetaRow(label: "STYLE", value: style)
                        Divider().opacity(0.2)
                    }
                    if let mat = building.materials, !mat.isEmpty && mat != "0" && mat.lowercased() != "unknown" {
                        MetaRow(label: "MATERIALS", value: mat)
                    }
                }
                .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 12))

                // ── Description / AI one-liner ───────────────────────
                if let line = aiOneLiner {
                    Text(line)
                        .font(.body)
                        .foregroundStyle(.primary.opacity(0.8))
                        .fixedSize(horizontal: false, vertical: true)
                } else if let desc = cleanDescription {
                    Text(desc)
                        .font(.body)
                        .foregroundStyle(.primary.opacity(0.8))
                        .fixedSize(horizontal: false, vertical: true)
                } else if loadingOneLiner {
                    HStack(spacing: 8) {
                        ProgressView().scaleEffect(0.75)
                        Text("Analysing the architecture…")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                // ── Match score ──────────────────────────────────────
                if !vm.userAestheticVector.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("MATCH SCORE")
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundStyle(accentColor)
                            Spacer()
                            Text("\(Int(score * 100))%")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(accentColor)
                        }
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 3).fill(Color(.systemGray5)).frame(height: 5)
                                RoundedRectangle(cornerRadius: 3).fill(accentColor)
                                    .frame(width: geo.size.width * score, height: 5)
                            }
                        }
                        .frame(height: 5)
                        if !topArchetypeNames.isEmpty {
                            Text("Matches your \(topArchetypeNames) taste")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                
                // ── Archival Photos ──────────────────────────────────
                if let bbl = building.bbl, !bbl.isEmpty {
                    ArchivalPhotoSection(bbl: bbl)
                }

                // ── Directions ───────────────────────────────────────
                if let lat = building.latitude, let lng = building.longitude {
                    Button {
                        if let url = URL(string: "maps://?daddr=\(lat),\(lng)&dirflg=w") {
                            UIApplication.shared.open(url)
                        }
                    } label: {
                        Label("Walking Directions", systemImage: "arrow.triangle.turn.up.right.circle.fill")
                            .font(.system(size: 15, weight: .semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                            .background(accentColor, in: RoundedRectangle(cornerRadius: 14))
                            .foregroundStyle(.white)
                    }
                }
                
                Spacer(minLength: 40)
            }
            .padding(22)
        }
        .task(id: building.bin) {
            guard cleanDescription == nil else { return }
            loadingOneLiner = true
            aiOneLiner = await GeminiOneLiner.fetch(for: building)
            loadingOneLiner = false
        }
    }

    private var topArchetypeNames: String {
        vm.userAestheticVector.sorted { $0.value > $1.value }.prefix(2).map { $0.key.capitalized }.joined(separator: " & ")
    }
}

// MARK: - Meta Row

struct MetaRow: View {
    let label: String
    let value: String
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(label).font(.system(size: 10, weight: .semibold, design: .monospaced)).foregroundStyle(.secondary).frame(width: 80, alignment: .leading)
            Text(value).font(.system(size: 13, weight: .medium)).foregroundStyle(.primary).fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }.padding(.horizontal, 14).padding(.vertical, 10)
    }
}

// MARK: - Gemini one-liner

enum GeminiOneLiner {
    static func fetch(for building: Building) async -> String? {
        let parts: [String] = [
            building.address.map { "Address: \($0)" },
            building.yearBuilt.flatMap { y -> String? in
                guard let d = Double(y), d > 1000 else { return nil }
                return "Built: \(Int(d))"
            },
            building.architect.map { "Architect: \($0)" },
            building.style.map { "Style: \($0)" },
            building.primaryAesthetic.map { "Aesthetic: \($0)" },
            building.materials.map { "Materials: \($0)" },
        ].compactMap { $0 }
        guard !parts.isEmpty else { return nil }
        let prompt = """
        Write exactly one punchy, captivating sentence (max 25 words) for an architecture enthusiast about this NYC building.
        CRITICAL INSTRUCTIONS:
        - NEVER start with "This building", "Located at", or "Built in".
        - Maintain a highly knowledgeable, professional, and authoritative architectural tone.
        - Do NOT use exclamation marks, conversational filler, or overly enthusiastic language.
        - DO NOT output any markdown (no asterisks or bold text).
        - Provide ONLY the sentence, no preamble.
        - Use ONLY the provided Data. Do NOT invent or assume specific physical features (like gargoyles, statues, or window counts) unless they are explicitly listed in the Style or Materials fields.
        Data: \(parts.joined(separator: ", "))
        """
        return await GeminiService.generate(prompt: prompt, maxTokens: 80)
    }
}


