import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BuildingDetail } from "@/constants/passportContent";

const LISTS_METADATA_KEY = "@lists_metadata";
const LIST_BUILDINGS_PREFIX = "@list_buildings_";

export type ListMetadata = {
  id: string;
  name: string;
  tagline: string;
  mood: string;
  buildingCount: number;
  previewBuildings: string[]; // First 4 building names for preview
};

export type ListWithBuildings = ListMetadata & {
  buildings: BuildingDetail[];
};

/**
 * Generate a simple unique ID for new lists
 */
function generateListId(): string {
  return `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all list metadata (lightweight, for ListsScreen)
 */
export async function getAllListsMetadata(): Promise<ListMetadata[]> {
  try {
    const json = await AsyncStorage.getItem(LISTS_METADATA_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch (error) {
    console.error("[listStorageService] Error getting lists metadata:", error);
    return [];
  }
}

/**
 * Get buildings for a specific list (full data, for ListDetailScreen)
 */
export async function getListBuildings(listId: string): Promise<BuildingDetail[]> {
  try {
    const json = await AsyncStorage.getItem(`${LIST_BUILDINGS_PREFIX}${listId}`);
    if (!json) return [];
    return JSON.parse(json);
  } catch (error) {
    console.error("[listStorageService] Error getting list buildings:", error);
    return [];
  }
}

/**
 * Get a full list with buildings
 */
export async function getListWithBuildings(listId: string): Promise<ListWithBuildings | null> {
  try {
    const allMetadata = await getAllListsMetadata();
    const metadata = allMetadata.find((m) => m.id === listId);
    if (!metadata) return null;

    const buildings = await getListBuildings(listId);
    return { ...metadata, buildings };
  } catch (error) {
    console.error("[listStorageService] Error getting list with buildings:", error);
    return null;
  }
}

/**
 * Create a new list
 */
export async function createList(params: {
  name: string;
  tagline: string;
  mood: string;
}): Promise<ListMetadata> {
  const newList: ListMetadata = {
    id: generateListId(),
    name: params.name,
    tagline: params.tagline,
    mood: params.mood,
    buildingCount: 0,
    previewBuildings: [],
  };

  const allMetadata = await getAllListsMetadata();
  allMetadata.push(newList);

  await AsyncStorage.setItem(LISTS_METADATA_KEY, JSON.stringify(allMetadata));
  await AsyncStorage.setItem(`${LIST_BUILDINGS_PREFIX}${newList.id}`, JSON.stringify([]));

  console.log("[listStorageService] Created list:", newList.id);
  return newList;
}

/**
 * Update list metadata (name, tagline, mood)
 */
export async function updateListMetadata(
  listId: string,
  updates: Partial<Pick<ListMetadata, "name" | "tagline" | "mood">>
): Promise<void> {
  const allMetadata = await getAllListsMetadata();
  const index = allMetadata.findIndex((m) => m.id === listId);
  if (index === -1) return;

  allMetadata[index] = { ...allMetadata[index], ...updates };
  await AsyncStorage.setItem(LISTS_METADATA_KEY, JSON.stringify(allMetadata));
  console.log("[listStorageService] Updated list metadata:", listId);
}

/**
 * Delete a list and its buildings
 */
export async function deleteList(listId: string): Promise<void> {
  const allMetadata = await getAllListsMetadata();
  const filtered = allMetadata.filter((m) => m.id !== listId);

  await AsyncStorage.setItem(LISTS_METADATA_KEY, JSON.stringify(filtered));
  await AsyncStorage.removeItem(`${LIST_BUILDINGS_PREFIX}${listId}`);
  console.log("[listStorageService] Deleted list:", listId);
}

/**
 * Add a building to a list
 * Returns false if building already exists in list (by BIN or id)
 */
export async function addBuildingToList(
  listId: string,
  building: BuildingDetail
): Promise<boolean> {
  const buildings = await getListBuildings(listId);

  // Check for duplicates by BIN or id
  const exists = buildings.some(
    (b) => (b.bin && b.bin === building.bin) || b.id === building.id
  );
  if (exists) {
    console.log("[listStorageService] Building already in list:", building.bin || building.id);
    return false;
  }

  buildings.push(building);
  await AsyncStorage.setItem(`${LIST_BUILDINGS_PREFIX}${listId}`, JSON.stringify(buildings));

  // Update metadata
  await updateListMetadataAfterBuildingChange(listId, buildings);
  console.log("[listStorageService] Added building to list:", listId, building.name);
  return true;
}

/**
 * Remove a building from a list
 */
export async function removeBuildingFromList(
  listId: string,
  buildingId: string
): Promise<void> {
  const buildings = await getListBuildings(listId);
  const filtered = buildings.filter((b) => b.id !== buildingId && b.bin !== buildingId);

  await AsyncStorage.setItem(`${LIST_BUILDINGS_PREFIX}${listId}`, JSON.stringify(filtered));
  await updateListMetadataAfterBuildingChange(listId, filtered);
  console.log("[listStorageService] Removed building from list:", listId, buildingId);
}

/**
 * Update the order of buildings in a list
 */
export async function updateListOrder(
  listId: string,
  buildings: BuildingDetail[]
): Promise<void> {
  await AsyncStorage.setItem(`${LIST_BUILDINGS_PREFIX}${listId}`, JSON.stringify(buildings));
  await updateListMetadataAfterBuildingChange(listId, buildings);
  console.log("[listStorageService] Updated list order:", listId);
}

/**
 * Helper to update metadata after building changes
 */
async function updateListMetadataAfterBuildingChange(
  listId: string,
  buildings: BuildingDetail[]
): Promise<void> {
  const allMetadata = await getAllListsMetadata();
  const index = allMetadata.findIndex((m) => m.id === listId);
  if (index === -1) return;

  allMetadata[index].buildingCount = buildings.length;
  allMetadata[index].previewBuildings = buildings.slice(0, 4).map((b) => b.name || "?");

  await AsyncStorage.setItem(LISTS_METADATA_KEY, JSON.stringify(allMetadata));
}

/**
 * Clear all lists (for testing/reset)
 */
export async function clearAllLists(): Promise<void> {
  const allMetadata = await getAllListsMetadata();

  // Remove all building data
  await Promise.all(
    allMetadata.map((m) => AsyncStorage.removeItem(`${LIST_BUILDINGS_PREFIX}${m.id}`))
  );

  // Clear metadata
  await AsyncStorage.removeItem(LISTS_METADATA_KEY);
  console.log("[listStorageService] Cleared all lists");
}
