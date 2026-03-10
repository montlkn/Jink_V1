import SwiftUI
import Supabase

@Observable
final class SimilarBuildingsViewModel {
    var buildings: [Building] = []
    var isLoading = false
    var errorMessage: String? = nil

    func loadSimilar(to aesthetic: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let data = try await SupabaseService.shared.client
                .from("buildings_full_merge_scanning")
                .select("bin, building_name, address, primary_aesthetic, year_built, geocoded_lat, geocoded_lng")
                .eq("primary_aesthetic", value: aesthetic)
                .limit(20)
                .execute()
            
            let decoder = JSONDecoder()
            let decoded = try decoder.decode([Building].self, from: data.data)
            buildings = decoded.filter { $0.name != nil && $0.name != "0" }
        } catch {
            errorMessage = error.localizedDescription
            print("[SimilarBuildingsViewModel] Error: \(error)")
        }
    }
}

struct SimilarBuildingsView: View {
    let aesthetic: String
    @State private var vm = SimilarBuildingsViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView()
                } else if let error = vm.errorMessage {
                    Text(error).foregroundStyle(.red)
                } else if vm.buildings.isEmpty {
                    Text("No similar buildings found.")
                        .foregroundStyle(.secondary)
                } else {
                    List(vm.buildings) { building in
                        NavigationLink(destination: BuildingInfoView(
                            bin: building.bin,
                            name: building.name ?? "",
                            address: building.address ?? "",
                            latitude: building.latitude,
                            longitude: building.longitude
                        )) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(building.name ?? "Building")
                                    .font(.headline)
                                if let address = building.address {
                                    Text(address)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Similar Buildings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .task {
                await vm.loadSimilar(to: aesthetic)
            }
        }
    }
}