import Foundation

// Unified list model for display (covers both hardcoded + stored lists)
struct DisplayList: Identifiable, Hashable {
    static func == (lhs: DisplayList, rhs: DisplayList) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    let id: String
    let name: String
    let tagline: String
    let mood: String
    let buildings: [DisplayBuilding]
    let isHardcoded: Bool
}

struct DisplayBuilding: Identifiable {
    let id: String
    let bin: String
    let name: String
    let address: String
    let latitude: Double?
    let longitude: Double?
}

@Observable
final class ListsViewModel {
    var lists: [DisplayList] = []
    var isLoading = false
    var showCreateSheet = false
    var newListName = ""
    var newListTagline = ""
    var newListMood = ""

    private let storage = ListStorageService.shared

    func load() {
        isLoading = true

        var allLists: [DisplayList] = []

        // Hardcoded lists from PassportContent
        for def in PassportContent.passportLists {
            let buildings = def.buildings.map {
                DisplayBuilding(id: $0.id, bin: $0.bin, name: $0.name, address: $0.address, latitude: $0.latitude, longitude: $0.longitude)
            }
            allLists.append(DisplayList(id: def.id, name: def.name, tagline: def.tagline, mood: def.mood, buildings: buildings, isHardcoded: true))
        }

        // User-created stored lists
        for stored in storage.getAllLists() {
            let buildings = storage.getBuildings(for: stored.id).map {
                DisplayBuilding(id: $0.id, bin: $0.bin, name: $0.name, address: $0.address, latitude: $0.latitude, longitude: $0.longitude)
            }
            allLists.append(DisplayList(id: stored.id, name: stored.name, tagline: stored.tagline, mood: stored.mood, buildings: buildings, isHardcoded: false))
        }

        lists = allLists
        isLoading = false
    }

    func createList() {
        guard !newListName.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        _ = storage.createList(name: newListName, tagline: newListTagline, mood: newListMood)
        newListName = ""
        newListTagline = ""
        newListMood = ""
        showCreateSheet = false
        load()
    }

    func deleteList(id: String) {
        storage.deleteList(id: id)
        load()
    }

    func addBuilding(_ building: StoredBuilding, to listId: String) {
        storage.addBuilding(building, to: listId)
        load()
    }

    func removeBuilding(buildingId: String, from listId: String) {
        storage.removeBuilding(buildingId: buildingId, from: listId)
        load()
    }

    func reorderBuildings(listId: String, orderedIds: [String]) {
        storage.updateOrder(listId: listId, buildingIds: orderedIds)
        load()
    }
}
