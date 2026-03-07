import Foundation

// MARK: - Stored List Models

struct StoredList: Identifiable, Codable {
    let id: String
    var name: String
    var tagline: String
    var mood: String
    var buildingIds: [String]
    let createdAt: Date

    init(id: String = UUID().uuidString, name: String, tagline: String = "", mood: String = "", buildingIds: [String] = [], createdAt: Date = Date()) {
        self.id = id
        self.name = name
        self.tagline = tagline
        self.mood = mood
        self.buildingIds = buildingIds
        self.createdAt = createdAt
    }
}

struct StoredBuilding: Identifiable, Codable {
    let id: String
    let bin: String
    let name: String
    let address: String
    let latitude: Double?
    let longitude: Double?
    let addedAt: Date

    init(id: String = UUID().uuidString, bin: String, name: String, address: String, latitude: Double? = nil, longitude: Double? = nil, addedAt: Date = Date()) {
        self.id = id
        self.bin = bin
        self.name = name
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
        self.addedAt = addedAt
    }
}

// MARK: - ListStorageService

@Observable
final class ListStorageService {
    static let shared = ListStorageService()

    private let listsKey = "jink_stored_lists"
    private let buildingsKey = "jink_list_buildings"

    private var lists: [StoredList] = []
    private var buildingsByListId: [String: [StoredBuilding]] = [:]

    private init() {
        loadFromDisk()
    }

    // MARK: - Read

    func getAllLists() -> [StoredList] {
        return lists
    }

    func getBuildings(for listId: String) -> [StoredBuilding] {
        return buildingsByListId[listId] ?? []
    }

    // MARK: - Create

    func createList(name: String, tagline: String = "", mood: String = "") -> StoredList {
        let list = StoredList(name: name, tagline: tagline, mood: mood)
        lists.append(list)
        buildingsByListId[list.id] = []
        saveToDisk()
        return list
    }

    // MARK: - Delete

    func deleteList(id: String) {
        lists.removeAll { $0.id == id }
        buildingsByListId.removeValue(forKey: id)
        saveToDisk()
    }

    // MARK: - Update Metadata

    func updateMetadata(listId: String, name: String, tagline: String, mood: String) {
        guard let idx = lists.firstIndex(where: { $0.id == listId }) else { return }
        lists[idx].name = name
        lists[idx].tagline = tagline
        lists[idx].mood = mood
        saveToDisk()
    }

    // MARK: - Buildings

    func addBuilding(_ building: StoredBuilding, to listId: String) {
        var buildings = buildingsByListId[listId] ?? []
        guard !buildings.contains(where: { $0.bin == building.bin }) else { return }
        buildings.append(building)
        buildingsByListId[listId] = buildings
        if let idx = lists.firstIndex(where: { $0.id == listId }) {
            if !lists[idx].buildingIds.contains(building.id) {
                lists[idx].buildingIds.append(building.id)
            }
        }
        saveToDisk()
    }

    func removeBuilding(buildingId: String, from listId: String) {
        buildingsByListId[listId]?.removeAll { $0.id == buildingId }
        if let idx = lists.firstIndex(where: { $0.id == listId }) {
            lists[idx].buildingIds.removeAll { $0 == buildingId }
        }
        saveToDisk()
    }

    func updateOrder(listId: String, buildingIds: [String]) {
        guard var buildings = buildingsByListId[listId] else { return }
        let lookup = Dictionary(uniqueKeysWithValues: buildings.map { ($0.id, $0) })
        buildings = buildingIds.compactMap { lookup[$0] }
        buildingsByListId[listId] = buildings
        if let idx = lists.firstIndex(where: { $0.id == listId }) {
            lists[idx].buildingIds = buildingIds
        }
        saveToDisk()
    }

    // MARK: - Persistence

    private func saveToDisk() {
        let encoder = JSONEncoder()
        if let listsData = try? encoder.encode(lists) {
            UserDefaults.standard.set(listsData, forKey: listsKey)
        }
        if let buildingsData = try? encoder.encode(buildingsByListId) {
            UserDefaults.standard.set(buildingsData, forKey: buildingsKey)
        }
    }

    private func loadFromDisk() {
        let decoder = JSONDecoder()
        if let listsData = UserDefaults.standard.data(forKey: listsKey),
           let decoded = try? decoder.decode([StoredList].self, from: listsData) {
            lists = decoded
        }
        if let buildingsData = UserDefaults.standard.data(forKey: buildingsKey),
           let decoded = try? decoder.decode([String: [StoredBuilding]].self, from: buildingsData) {
            buildingsByListId = decoded
        }
    }
}
