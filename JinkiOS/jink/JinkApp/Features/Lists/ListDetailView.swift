import SwiftUI

struct ListDetailView: View {
    let list: DisplayList
    @Bindable var vm: ListsViewModel
    @State private var showAddBuilding = false
    @State private var isEditing = false
    @Environment(\.dismiss) private var dismiss

    // Edit fields
    @State private var editName = ""
    @State private var editTagline = ""
    @State private var editMood = ""

    var body: some View {
        VStack(spacing: 0) {
            List {
                Section {
                    heroCard
                        .listRowInsets(EdgeInsets(top: 20, leading: 20, bottom: 20, trailing: 20))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                }
                
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("TARGET LIST")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.secondary)
                            .tracking(1)
                        
                        Rectangle()
                            .fill(Color(uiColor: .separator))
                            .frame(height: 2)
                    }
                    .padding(.top, 8)
                    .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 12, trailing: 20))
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                    
                    if list.buildings.isEmpty {
                        emptyState
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                    } else {
                        ForEach(Array(list.buildings.enumerated()), id: \.element.id) { index, building in
                            ZStack {
                                NavigationLink(destination: BuildingInfoView(bin: building.bin, name: building.name, address: building.address)) {
                                    EmptyView()
                                }
                                .opacity(0)
                                
                                ListBuildingCard(building: building, index: index)
                            }
                            .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 12, trailing: 20))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                if !list.isHardcoded {
                                    Button(role: .destructive) {
                                        vm.removeBuilding(buildingId: building.id, from: list.id)
                                    } label: {
                                        Label("Remove", systemImage: "trash")
                                    }
                                }
                            }
                        }
                        .onMove { from, to in
                            guard !list.isHardcoded else { return }
                            var ids = list.buildings.map { $0.id }
                            ids.move(fromOffsets: from, toOffset: to)
                            vm.reorderBuildings(listId: list.id, orderedIds: ids)
                        }
                    }
                }
            }
            .listStyle(.plain)
            .background(Color(uiColor: .systemBackground))
            .environment(\.editMode, .constant(.inactive)) // Keep interactive links
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 16) {
                    if !list.isHardcoded {
                        Button(action: { showAddBuilding = true }) {
                            Image(systemName: "plus.circle")
                                .font(.system(size: 20))
                                .foregroundStyle(AppColors.accent)
                        }
                    }
                    
                    Menu {
                        Text("Each list is a curated itinerary.")
                    } label: {
                        Image(systemName: "info.circle")
                            .font(.system(size: 20))
                    }
                }
            }
        }
        .sheet(isPresented: $showAddBuilding) {
            AddBuildingSheet { building in
                vm.addBuilding(building, to: list.id)
            }
        }
        .onAppear {
            editName = list.name
            editTagline = list.tagline
            editMood = list.mood
        }
    }

    // MARK: - Subviews

    private var heroCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("SUBJECT")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(AppColors.accent)
                    .tracking(1)
                
                Spacer()
                
                if !list.isHardcoded {
                    Button(action: toggleEditing) {
                        Text(isEditing ? "DONE" : "EDIT")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(isEditing ? AppColors.accent : .primary)
                            .tracking(1)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(isEditing ? AppColors.accent : .primary, lineWidth: 1)
                            )
                    }
                }
            }
            .padding(.bottom, 4)

            if isEditing {
                TextField("List name", text: $editName)
                    .font(.system(size: 24, weight: .bold, design: .monospaced))
                
                TextField("Tagline", text: $editTagline)
                    .font(.system(size: 16, design: .monospaced))
                    .foregroundStyle(.secondary)
                    .italic()
            } else {
                Text(list.name)
                    .font(.system(size: 24, weight: .bold, design: .monospaced))
                
                if !list.tagline.isEmpty {
                    Text("\"\(list.tagline)\"")
                        .font(.system(size: 16, design: .monospaced))
                        .foregroundStyle(.secondary)
                        .italic()
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Text("\(list.buildings.count) TARGETS")
                        .font(.system(size: 14, weight: .bold))
                        .tracking(1)
                }
                .padding(.top, 8)
                .overlay(Rectangle().frame(height: 1).padding(.top, -8).foregroundStyle(Color(uiColor: .separator)), alignment: .top)

                if isEditing {
                    TextField("Description", text: $editMood, axis: .vertical)
                        .font(.system(size: 14, design: .monospaced))
                        .foregroundStyle(.secondary)
                        .lineLimit(3...6)
                } else if !list.mood.isEmpty {
                    Text(list.mood)
                        .font(.system(size: 14, design: .monospaced))
                        .foregroundStyle(.secondary)
                        .lineSpacing(4)
                }
            }
        }
        .padding(20)
        .background(Color(uiColor: .secondarySystemBackground))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppColors.accent, lineWidth: 2)
        )
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "building.2")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            
            Text("NO BUILDINGS YET")
                .font(.system(size: 16, weight: .bold))
                .tracking(1)
            
            Text(!list.isHardcoded ? "Tap + to add buildings to this list" : "This list is empty")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            if !list.isHardcoded {
                Button(action: { showAddBuilding = true }) {
                    HStack(spacing: 8) {
                        Image(systemName: "plus")
                            .font(.system(size: 14, weight: .bold))
                        Text("ADD BUILDING")
                            .font(.system(size: 14, weight: .bold))
                            .tracking(1)
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(AppColors.accent)
                    .cornerRadius(8)
                }
                .padding(.top, 8)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }

    // MARK: - Actions

    private func toggleEditing() {
        if isEditing {
            // Save edits
            guard !editName.trimmingCharacters(in: .whitespaces).isEmpty else { return }
            ListStorageService.shared.updateMetadata(
                listId: list.id,
                name: editName,
                tagline: editTagline,
                mood: editMood
            )
            vm.load()
        } else {
            // Start editing
            editName = list.name
            editTagline = list.tagline
            editMood = list.mood
        }
        isEditing.toggle()
    }
}

// MARK: - ListBuildingCard

struct ListBuildingCard: View {
    let building: DisplayBuilding
    let index: Int

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Color.primary)
                    .frame(width: 32, height: 32)
                
                Text(String(format: "%02d", index + 1))
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Color(uiColor: .systemBackground))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(building.name)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.primary)
                
                Text(building.address)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.secondary)
            }
            
            Spacer()
            
            Image(systemName: "line.3.horizontal")
                .foregroundStyle(.tertiary)
                .font(.title3)
        }
        .padding(16)
        .background(Color(uiColor: .secondarySystemBackground))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(uiColor: .separator), lineWidth: 1)
        )
    }
}

// MARK: - Add Building Sheet

struct AddBuildingSheet: View {
    let onAdd: (StoredBuilding) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var buildingName = ""
    @State private var buildingAddress = ""
    @State private var buildingBin = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Building Info") {
                    TextField("Building Name", text: $buildingName)
                    TextField("Address", text: $buildingAddress)
                    TextField("BIN (optional)", text: $buildingBin)
                }
            }
            .navigationTitle("Add Building")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Add") {
                        let building = StoredBuilding(
                            bin: buildingBin,
                            name: buildingName,
                            address: buildingAddress
                        )
                        onAdd(building)
                        dismiss()
                    }
                    .disabled(buildingName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}
