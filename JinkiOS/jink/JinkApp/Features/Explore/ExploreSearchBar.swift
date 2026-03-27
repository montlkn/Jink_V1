import SwiftUI

struct ExploreSearchBar: View {
    @Binding var searchText: String
    let onSearch: () -> Void
    @State private var localText: String = ""

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)
            
            TextField("Search buildings, styles, architects...", text: $localText)
                .submitLabel(.search)
                .onSubmit {
                    searchText = localText
                    onSearch()
                }
            
            if !localText.isEmpty {
                Button(action: {
                    localText = ""
                    searchText = ""
                    onSearch()
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .onAppear {
            localText = searchText
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.primary.opacity(0.1), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        .padding(.horizontal)
    }
}
