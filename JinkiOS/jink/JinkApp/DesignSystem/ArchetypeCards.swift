import SwiftUI

// MARK: - Archetype Cards & Rows

struct ArchetypeCardView: View {
    let name: String
    let tagline: String
    let vibes: [String]
    let color: Color
    let score: Double
    let bio: String

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Circle().fill(.white).frame(width: 12, height: 12)
                VStack(alignment: .leading, spacing: 2) {
                    Text(name.uppercased())
                        .font(.system(size: 14, weight: .black))
                        .kerning(1)
                        .foregroundStyle(.white)
                    Text(String(format: "%.0f%% affinity", score * 100))
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(.white.opacity(0.8))
                }
                Spacer()
                Image(systemName: "chevron.right").font(.caption).foregroundStyle(.white.opacity(0.5))
            }

            Text(bio)
                .font(.system(size: 15, weight: .medium))
                .lineSpacing(4)
                .foregroundStyle(.white.opacity(0.9))
                .fixedSize(horizontal: false, vertical: true)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(.white.opacity(0.25))
                    Capsule().fill(.white).frame(width: geo.size.width * score)
                }
                .frame(height: 4)
            }
            .frame(height: 4)
        }
        .padding(20)
        .background(color)
        .cornerRadius(16)
        .padding(.horizontal)
    }
}

struct ArchetypeRowView: View {
    let name: String
    let score: Double
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            HStack {
                Circle().fill(.white).frame(width: 8, height: 8)
                Text(name).font(.subheadline).foregroundStyle(.white)
                Spacer()
                Text(String(format: "%.0f%%", score * 100))
                    .font(.caption.bold()).foregroundStyle(.white)
                Image(systemName: "chevron.right").font(.caption2).foregroundStyle(.white.opacity(0.5))
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(.white.opacity(0.25))
                    Capsule().fill(.white).frame(width: geo.size.width * score)
                }
                .frame(height: 4)
            }
            .frame(height: 4)
        }
        .padding(12)
        .background(color)
        .cornerRadius(8)
    }
}
