import SwiftUI

struct ListsView: View {
    @State private var vm = ListsViewModel()
    @State private var selectedList: DisplayList? = nil
    @State private var editMode = false
    @Environment(\.dismiss) private var dismiss

    let columns = [GridItem(.flexible(), spacing: 16), GridItem(.flexible(), spacing: 16)]

    var body: some View {
        ZStack {
            Color(uiColor: .systemBackground).ignoresSafeArea()
            
            VStack(spacing: 0) {
                if editMode {
                    Text("SELECT TO DELETE")
                        .font(.caption.bold())
                        .foregroundStyle(AppColors.accent)
                        .tracking(1)
                        .padding(.vertical, 8)
                }

                Group {
                    if vm.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if vm.lists.isEmpty {
                        emptyState
                    } else {
                        ScrollView {
                            LazyVGrid(columns: columns, spacing: 16) {
                                ForEach(vm.lists) { list in
                                    ListCardView(list: list, isEditing: editMode) {
                                        if editMode {
                                            confirmDelete(list)
                                        } else {
                                            selectedList = list
                                        }
                                    }
                                }
                            }
                            .padding(16)
                        }
                    }
                }
            }
            
            // Floating Create Button
            if !editMode && !vm.lists.isEmpty {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button(action: { vm.showCreateSheet = true }) {
                            Image(systemName: "plus")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 56, height: 56)
                                .background(AppColors.accent)
                                .clipShape(Circle())
                                .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
                        }
                        .padding(24)
                    }
                }
            }
        }
        .navigationTitle("Lists")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: { 
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        editMode.toggle()
                    }
                }) {
                    Text(editMode ? "Done" : "Edit")
                        .fontWeight(.medium)
                }
            }
        }
        .sheet(isPresented: $vm.showCreateSheet) {
            CreateListSheet(vm: vm)
        }
        .navigationDestination(item: $selectedList) { list in
            ListDetailView(list: list, vm: vm)
        }
        .onAppear { vm.load() }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "albums")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            
            Text("NO LISTS YET")
                .font(.headline)
            
            Text("Create your first list")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            Button(action: { vm.showCreateSheet = true }) {
                HStack(spacing: 8) {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .bold))
                    Text("CREATE LIST")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(AppColors.accent)
                .cornerRadius(8)
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.bottom, 60)
    }

    private func confirmDelete(_ list: DisplayList) {
        if list.isHardcoded {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return
        }
        
        let alert = UIAlertController(
            title: "Delete List?",
            message: "Remove \"\(list.name)\" from your passport? This action cannot be undone.",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Delete", style: .destructive) { _ in
            vm.deleteList(id: list.id)
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        })
        
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let root = scene.windows.first?.rootViewController {
            root.present(alert, animated: true)
        }
    }
}

// MARK: - List Card

struct ListCardView: View {
    let list: DisplayList
    let isEditing: Bool
    let action: () -> Void

    var previewBuildings: [DisplayBuilding] {
        Array(list.buildings.prefix(4))
    }
    
    private var strokeColor: Color {
        if isEditing {
            return list.isHardcoded ? Color.secondary.opacity(0.2) : AppColors.accent
        } else {
            return AppColors.accent
        }
    }

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                // Card Header
                HStack {
                    Text("REF")
                        .font(.caption2.bold())
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(list.id.prefix(4).uppercased())
                        .font(.caption2.bold().monospaced())
                        .foregroundStyle(AppColors.accent)
                }

                // Preview Grid
                ZStack {
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 2), GridItem(.flexible(), spacing: 2)], spacing: 2) {
                        ForEach(0..<4, id: \.self) { idx in
                            ZStack {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color(uiColor: .systemBackground))
                                
                                if idx < previewBuildings.count {
                                    Text(String(previewBuildings[idx].name.prefix(1)))
                                        .font(.subheadline.bold())
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .aspectRatio(1, contentMode: .fit)
                        }
                    }
                    .padding(2)
                    .background(Color(uiColor: .separator))
                    .cornerRadius(8)
                    
                    if isEditing && !list.isHardcoded {
                        Color.black.opacity(0.1)
                            .cornerRadius(8)
                        
                        Image(systemName: "trash.fill")
                            .foregroundStyle(.white)
                            .padding(8)
                            .background(AppColors.accent)
                            .clipShape(Circle())
                            .offset(x: 35, y: -35)
                    }
                }

                // Card Body
                VStack(alignment: .leading, spacing: 4) {
                    Text(list.name)
                        .font(.subheadline.bold())
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    Text(list.tagline.isEmpty ? "No description" : list.tagline)
                        .font(.caption2)
                        .italic()
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                    
                    HStack {
                        Text("\(list.buildings.count) ENTRIES")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(AppColors.accent)
                        Spacer()
                        Image(systemName: "arrow.right")
                            .font(.caption2.bold())
                            .foregroundStyle(AppColors.accent)
                    }
                    .padding(.top, 4)
                    .overlay(Divider().padding(.top, -4), alignment: .top)
                }
            }
            .padding(12)
            .background(Color(uiColor: .secondarySystemBackground))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(strokeColor, lineWidth: 2)
                    .modifier(DashedStrokeModifier(active: isEditing && !list.isHardcoded))
            )
        }
        .buttonStyle(.plain)
    }
}

struct DashedStrokeModifier: ViewModifier {
    let active: Bool
    func body(content: Content) -> some View {
        if active {
            content.overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(AppColors.accent, style: StrokeStyle(lineWidth: 2, dash: [5]))
            )
        } else {
            content
        }
    }
}

// MARK: - Create List Sheet

struct CreateListSheet: View {
    @Bindable var vm: ListsViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color(uiColor: .systemGroupedBackground).ignoresSafeArea()
                
                VStack(spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("LIST DETAILS")
                            .font(.caption.bold())
                            .foregroundStyle(AppColors.accent)
                            .padding(.horizontal, 20)
                        
                        VStack(spacing: 0) {
                            TacticalField(label: "NAME", text: $vm.newListName, placeholder: "e.g. Modernist Masterpieces")
                            Divider().padding(.leading, 16)
                            TacticalField(label: "TAGLINE", text: $vm.newListTagline, placeholder: "A short summary")
                            Divider().padding(.leading, 16)
                            TacticalField(label: "DETAILS", text: $vm.newListMood, placeholder: "e.g. Bold geometry and raw concrete", isMultiline: true)
                        }
                        .background(Color(uiColor: .secondarySystemBackground))
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(uiColor: .separator), lineWidth: 1))
                        .padding(.horizontal, 20)
                    }
                    .padding(.top, 20)
                    
                    Spacer()
                    
                    Button(action: {
                        vm.createList()
                        dismiss()
                    }) {
                        Text("CREATE LIST")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(vm.newListName.isEmpty ? Color.secondary : AppColors.accent)
                            .cornerRadius(12)
                    }
                    .disabled(vm.newListName.isEmpty)
                    .padding(20)
                }
            }
            .navigationTitle("New List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

struct TacticalField: View {
    let label: String
    @Binding var text: String
    let placeholder: String
    var isMultiline: Bool = false
    
    var body: some View {
        HStack(alignment: isMultiline ? .top : .center, spacing: 16) {
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(.secondary)
                .frame(width: 80, alignment: .leading)
                .padding(.top, isMultiline ? 12 : 0)
            
            if isMultiline {
                TextField(placeholder, text: $text, axis: .vertical)
                    .font(.system(size: 14, design: .monospaced))
                    .lineLimit(3...5)
                    .padding(.vertical, 12)
            } else {
                TextField(placeholder, text: $text)
                    .font(.system(size: 14, design: .monospaced))
                    .frame(height: 44)
            }
        }
        .padding(.horizontal, 16)
    }
}
