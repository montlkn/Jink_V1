import SwiftUI

struct ArchetypeLegend: View {
    @State private var expanded = false

    private let entries: [(name: String, color: Color)] = [
        ("Classicist",      AppColors.archetypes.classicist),
        ("Romantic",        AppColors.archetypes.romantic),
        ("Stylist",         AppColors.archetypes.stylist),
        ("Modernist",       AppColors.archetypes.modernist),
        ("Industrialist",   AppColors.archetypes.industrialist),
        ("Visionary",       AppColors.archetypes.visionary),
        ("Pop Culturalist", AppColors.archetypes.popCulturalist),
        ("Vernacularist",   AppColors.archetypes.vernacularist),
        ("Austerist",       AppColors.archetypes.austerist),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if expanded {
                VStack(alignment: .leading, spacing: 5) {
                    ForEach(entries, id: \.name) { entry in
                        HStack(spacing: 6) {
                            RoundedRectangle(cornerRadius: 2).fill(entry.color).frame(width: 12, height: 12)
                            Text(entry.name).font(.system(size: 10, weight: .medium)).foregroundStyle(.primary)
                        }
                    }
                }
                .padding(10)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 10))
                .padding(.bottom, 6)
            }
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { expanded.toggle() }
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "square.grid.2x2.fill").font(.caption2)
                    Text(expanded ? "Hide Legend" : "Legend").font(.caption.bold())
                }
                .foregroundStyle(.primary)
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(.regularMaterial, in: Capsule())
            }
        }
    }
}