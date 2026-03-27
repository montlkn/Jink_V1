import SwiftUI
import Auth

// MARK: - Add To List Sheet

struct AddToListSheet: View {
    let bin: String
    let buildingName: String
    let address: String
    var aestheticVector: [String: Double]? = nil
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    @State private var vm = ListsViewModel()
    @State private var isCreatingNew = false
    @State private var newListName = ""
    @FocusState private var newListFieldFocused: Bool

    var body: some View {
        NavigationStack {
            List {
                // New List row
                Section {
                    if isCreatingNew {
                        HStack {
                            TextField("List name", text: $newListName)
                                .focused($newListFieldFocused)
                                .onSubmit { createAndAdd() }
                            Button("Add") { createAndAdd() }
                                .disabled(newListName.trimmingCharacters(in: .whitespaces).isEmpty)
                        }
                    } else {
                        Button(action: {
                            isCreatingNew = true
                            newListFieldFocused = true
                        }) {
                            Label("New List", systemImage: "plus.circle.fill")
                                .foregroundStyle(AppColors.accent)
                        }
                    }
                }

                // Existing lists
                if vm.isLoading {
                    ProgressView()
                } else {
                    ForEach(vm.lists.filter { !$0.isHardcoded }) { list in
                        Button(action: { addToList(list) }) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(list.name).font(.subheadline.bold())
                                    Text("\(list.buildings.count) buildings")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Image(systemName: "plus.circle")
                                    .foregroundStyle(AppColors.accent)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .navigationTitle("Add to List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
            .onAppear { vm.load() }
        }
    }

    private func createAndAdd() {
        let trimmed = newListName.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        let newList = ListStorageService.shared.createList(name: trimmed)
        let building = StoredBuilding(bin: bin, name: buildingName, address: address)
        ListStorageService.shared.addBuilding(building, to: newList.id)
        fireAestheticEvent()
        dismiss()
    }

    private func addToList(_ list: DisplayList) {
        let building = StoredBuilding(bin: bin, name: buildingName, address: address)
        vm.addBuilding(building, to: list.id)
        fireAestheticEvent()
        dismiss()
    }

    private func fireAestheticEvent() {
        if let userId = appState.currentUser?.id.uuidString {
            Task {
                try? await AestheticService.shared.insertEvent(
                    userId: userId,
                    eventType: "building_save",
                    buildingBbl: bin,
                    aestheticVector: aestheticVector,
                    subtype: nil,
                    baseWeight: 1.5
                )
                // Process the event into the profile (triggers the RPC aggregation)
                _ = await AestheticService.shared.processProfile(userId: userId)
                await appState.refreshAestheticProfile()
                await MainActor.run { appState.passportRefreshTrigger += 1 }
            }
        }
    }
}
