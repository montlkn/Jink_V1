import SwiftUI

// MARK: - Models

private struct ArchiveImage: Identifiable {
    let id: String   // IO ID
    let url: URL
}

private struct ArchiveListResponse: Decodable {
    struct Item: Decodable {
        let io_id: String
        let url: String
    }
    let count: Int
    let images: [Item]
}

// MARK: - Archival Photo Section

struct ArchivalPhotoSection: View {
    let bbl: String

    @State private var images: [ArchiveImage] = []
    @State private var isLoading = true
    @State private var hasError = false
    @State private var selectedImage: ArchiveImage? = nil

    private var proxyBase: String {
        #if targetEnvironment(simulator)
        return "http://127.0.0.1:8788"
        #else
        return "https://nyc-archive-proxy.archivalimages.workers.dev"
        #endif
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("1940s TAX PHOTOS")
                .font(.system(size: 12, weight: .bold, design: .monospaced))
                .foregroundStyle(.secondary)

            if isLoading {
                HStack {
                    ProgressView()
                    Text("Fetching from NYC Archives...")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 8)

            } else if hasError || images.isEmpty {
                Text("No archival photos found for this building.")
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)

            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(images) { img in
                            Button {
                                selectedImage = img
                            } label: {
                                AsyncImage(url: img.url) { phase in
                                    switch phase {
                                    case .success(let image):
                                        image
                                            .resizable()
                                            .scaledToFill()
                                    case .failure:
                                        Color.clear  // hide failed images silently
                                    default:
                                        Color(.systemGray5)
                                            .overlay(ProgressView())
                                    }
                                }
                                .frame(width: 160, height: 160)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 2)
                }

                Text("Source: NYC Municipal Archives, 1939–1941")
                    .font(.system(size: 10).monospaced())
                    .foregroundStyle(.tertiary)
                    .textCase(.uppercase)
            }
        }
        .task { await loadImages() }
        .fullScreenCover(item: $selectedImage) { img in
            ArchivalPhotoViewer(url: img.url)
        }
    }

    private func loadImages() async {
        // Clean BBL: strip .0 suffix, ensure 10-digit format for archive proxy
        let cleanBbl = bbl
            .replacingOccurrences(of: ".0", with: "")
            .trimmingCharacters(in: .whitespaces)
        
        // BBL must be at least 10 chars (1 borough + 5 block + 4 lot) for the proxy to parse
        guard cleanBbl.count >= 10,
              let listUrl = URL(string: "\(proxyBase)/list?bbl=\(cleanBbl)") else {
            hasError = true; isLoading = false; return
        }
        do {
            let (data, _) = try await URLSession.shared.data(from: listUrl)
            let response = try JSONDecoder().decode(ArchiveListResponse.self, from: data)
            let loaded = response.images.compactMap { item -> ArchiveImage? in
                guard let url = URL(string: item.url) else { return nil }
                return ArchiveImage(id: item.io_id, url: url)
            }
            images = loaded
        } catch {
            hasError = true
        }
        isLoading = false
    }
}

// MARK: - Full Screen Viewer

struct ArchivalPhotoViewer: View {
    let url: URL
    @Environment(\.dismiss) private var dismiss
    @State private var scale: CGFloat = 1.0
    @State private var offset: CGSize = .zero

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image
                            .resizable()
                            .scaledToFit()
                            .scaleEffect(scale)
                            .offset(offset)
                            .gesture(
                                MagnificationGesture()
                                    .onChanged { val in scale = max(1.0, val.magnitude) }
                            )
                            .simultaneousGesture(
                                DragGesture()
                                    .onChanged { val in if scale > 1.0 { offset = val.translation } }
                                    .onEnded { _ in }
                            )
                    } else if phase.error != nil {
                        Text("Failed to load image.")
                            .foregroundStyle(.white)
                    } else {
                        ProgressView().tint(.white)
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(.white)
                        .font(.headline)
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
    }
}
