import { APP_COLORS } from "@/constants/appColors";
import { passportLists, type BuildingDetail } from "@/constants/passportContent";
import {
    AddBuildingModal,
    InfoMenu,
    PassportBackButton,
    PassportInfoButton,
    addBuildingToList,
    getListWithBuildings,
    removeBuildingFromList,
    updateListMetadata,
    updateListOrder,
    type BuildingSearchResult,
} from "@/features/passport";
import { screens, type RootParams } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import DraggableFlatList, { type RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";



type BuildingCardProps = {
  building: BuildingDetail;
  index: number;
  drag: () => void;
  isActive: boolean;
  onDelete: (buildingId: string) => void;
  onPress: (building: BuildingDetail) => void;
};

function BuildingCard({ building, index, drag, isActive, onDelete, onPress }: BuildingCardProps) {
  const swipeRef = useRef<Swipeable | null>(null);

  const handleDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null);
    swipeRef.current?.close();
    onDelete(building.id);
  }, [building.id, onDelete]);

  const handleSwipeOpen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
  }, []);

  const renderRightActions = useCallback(
    () => (
      <TouchableOpacity style={styles.swipeDelete} activeOpacity={0.85} onPress={handleDelete}>
        <Ionicons name="trash" size={20} color={theme.colors.white} />
      </TouchableOpacity>
    ),
    [handleDelete]
  );

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
    drag();
  }, [drag]);

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      onSwipeableOpen={handleSwipeOpen}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        delayLongPress={500}
        onLongPress={handleLongPress}
        onPress={() => onPress(building)}
        style={[styles.buildingCard, isActive && styles.buildingCardActive]}
      >
        <View style={styles.buildingBadge}>
          <Text style={styles.buildingIndex}>{String(index + 1).padStart(2, "0")}</Text>
        </View>
        <View style={styles.buildingBody}>
          <Text style={styles.buildingName}>{building.name}</Text>
          <Text style={styles.buildingMeta}>
            {building.address} • {building.year}
          </Text>
        </View>
        <Ionicons name="reorder-three" size={22} color={theme.colors.muted} style={styles.dragHandle} />
      </TouchableOpacity>
    </Swipeable>
  );
}



type Route = RouteProp<RootParams, typeof screens.PassportListDetail>;
type Navigation = NativeStackNavigationProp<RootParams>;

// Helper to check if a list ID is from storage (not hardcoded)
function isStoredListId(listId: string): boolean {
  return listId.startsWith("list_");
}

// Convert BuildingSearchResult to BuildingDetail
function searchResultToBuildingDetail(result: BuildingSearchResult): BuildingDetail {
  return {
    id: result.id || result.bin,
    bin: result.bin,
    name: result.name,
    address: result.address,
    style: result.style || "",
    year: result.year || "",
    summary: "",
    architect: result.architect,
    materials: result.materials,
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

export default function ListDetailScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();

  const listId = route.params?.listId ?? "";
  const isStoredList = isStoredListId(listId);

  // For hardcoded lists, use passportLists
  const hardcodedList = useMemo(() => {
    if (isStoredList) return null;
    const match = passportLists.find((entry) => entry.id === listId);
    return match ?? passportLists[0];
  }, [listId, isStoredList]);

  const [buildings, setBuildings] = useState<BuildingDetail[]>(hardcodedList?.buildings ?? []);
  const [listName, setListName] = useState(hardcodedList?.name ?? "");
  const [listTagline, setListTagline] = useState(hardcodedList?.tagline ?? "");
  const [listMood, setListMood] = useState(hardcodedList?.mood ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(isStoredList);

  const loadStoredList = useCallback(async () => {
    try {
      setLoading(true);
      const storedList = await getListWithBuildings(listId);
      if (storedList) {
        setListName(storedList.name);
        setListTagline(storedList.tagline);
        setListMood(storedList.mood);
        setBuildings(storedList.buildings);
      }
    } catch (error) {
      console.error("[ListDetailScreen] Error loading list:", error);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  // Load stored list data
  useEffect(() => {
    if (isStoredList) {
      loadStoredList();
    }
  }, [isStoredList, listId, loadStoredList]);

  // Sync hardcoded list when it changes
  useEffect(() => {
    if (hardcodedList) {
      setBuildings(hardcodedList.buildings);
      setListName(hardcodedList.name);
      setListTagline(hardcodedList.tagline);
      setListMood(hardcodedList.mood);
    }
  }, [hardcodedList]);

  const handleInfo = useCallback(() => {
    setShowInfoMenu(true);
  }, []);

  const handleDelete = useCallback(async (buildingId: string) => {
    setBuildings((current) => current.filter((building) => building.id !== buildingId && building.bin !== buildingId));

    // Persist for stored lists
    if (isStoredList) {
      await removeBuildingFromList(listId, buildingId);
    }
  }, [isStoredList, listId]);

  const handleDragEnd = useCallback(async ({ data }: { data: BuildingDetail[] }) => {
    setBuildings(data);

    // Persist for stored lists
    if (isStoredList) {
      await updateListOrder(listId, data);
    }
  }, [isStoredList, listId]);

  const handleAddBuilding = useCallback(async (searchResult: BuildingSearchResult): Promise<boolean> => {
    if (!isStoredList) {
      // Can't add to hardcoded lists
      return false;
    }

    const building = searchResultToBuildingDetail(searchResult);
    const added = await addBuildingToList(listId, building);

    if (added) {
      setBuildings((current) => [...current, building]);
    }

    return added;
  }, [isStoredList, listId]);

  // Get existing building IDs for duplicate checking
  const existingBuildingIds = useMemo(() => {
    return buildings.map((b) => b.bin || b.id).filter(Boolean) as string[];
  }, [buildings]);

  // Save metadata when editing ends
  const handleEditingEnd = useCallback(async () => {
    setIsEditing(false);
    if (isStoredList) {
      await updateListMetadata(listId, {
        name: listName,
        tagline: listTagline,
        mood: listMood,
      });
    }
  }, [isStoredList, listId, listName, listTagline, listMood]);

  const handleBuildingPress = useCallback((building: BuildingDetail) => {
    navigation.navigate(screens.BuildingInfo, { buildingData: building, skipAestheticTracking: true });
  }, [navigation]);

  const renderBuilding = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<BuildingDetail>) => {
      const currentIndex = getIndex() ?? 0;
      return (
        <BuildingCard
          building={item}
          index={currentIndex}
          drag={drag}
          isActive={isActive}
          onDelete={handleDelete}
          onPress={handleBuildingPress}
        />
      );
    },
    [handleDelete, handleBuildingPress]
  );

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <PassportBackButton onPress={() => navigation.goBack()} />
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{listName}</Text>
          </View>
          <View style={styles.headerRightGroup}>
            {isStoredList && (
              <TouchableOpacity
                style={styles.headerAddButton}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={22} color={theme.colors.accent} />
              </TouchableOpacity>
            )}
            <PassportInfoButton
              onPress={handleInfo}
              accessibilityLabel="Learn about this list"
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : (
          <DraggableFlatList
            data={buildings}
            keyExtractor={(item) => item.id}
            renderItem={renderBuilding}
            onDragEnd={handleDragEnd}
            activationDistance={12}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={48} color={theme.colors.muted} />
                <Text style={styles.emptyText}>NO BUILDINGS YET</Text>
                <Text style={styles.emptySubtext}>
                  {isStoredList ? "Tap + to add buildings to this list" : "This list is empty"}
                </Text>
                {isStoredList && (
                  <TouchableOpacity
                    style={styles.emptyAddButton}
                    onPress={() => setShowAddModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={18} color={theme.colors.background} />
                    <Text style={styles.emptyAddText}>ADD BUILDING</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            ListHeaderComponent={
            <View>
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <Text style={styles.heroLabel}>SUBJECT</Text>
                  {isStoredList && (
                    <TouchableOpacity
                      style={styles.editToggle}
                      onPress={() => isEditing ? handleEditingEnd() : setIsEditing(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.editToggleText, isEditing && styles.editToggleTextActive]}>
                        {isEditing ? "DONE" : "EDIT"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isEditing ? (
                  <TextInput
                    style={styles.heroTitle}
                    value={listName}
                    onChangeText={setListName}
                    placeholder="List name"
                    placeholderTextColor={theme.colors.muted}
                    autoFocus
                  />
                ) : (
                  <Text style={styles.heroTitle}>{listName}</Text>
                )}

                {isEditing ? (
                  <TextInput
                    style={styles.heroTagline}
                    value={listTagline}
                    onChangeText={setListTagline}
                    placeholder="Tagline"
                    placeholderTextColor={theme.colors.muted}
                  />
                ) : (
                  <Text style={styles.heroTaglineText}>&quot;{listTagline}&quot;</Text>
                )}

                <View style={styles.heroMetaRow}>
                  <Text style={styles.heroMeta}>
                    {buildings.length} TARGETS
                  </Text>
                </View>

                {isEditing ? (
                  <TextInput
                    style={styles.heroMood}
                    value={listMood}
                    onChangeText={setListMood}
                    placeholder="Description"
                    placeholderTextColor={theme.colors.muted}
                    multiline
                    textAlignVertical="top"
                  />
                ) : (
                  <Text style={styles.heroMoodText}>{listMood}</Text>
                )}
              </View>
              <Text style={styles.sectionTitle}>TARGET LIST</Text>
              <View style={styles.divider} />
            </View>
          }
          ListFooterComponent={<View style={{ height: 40 }} />}
          />
        )}

        <InfoMenu
          visible={showInfoMenu}
          onClose={() => setShowInfoMenu(false)}
          title="LIST DETAILS"
          content="Each list is a curated itinerary. Long-press any building tile to drag it to a new position."
        />

        {/* Add Building Modal */}
        <AddBuildingModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAddBuilding={handleAddBuilding}
          existingBuildingIds={existingBuildingIds}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderRadius: 12,
    borderBottomColor: theme.colors.border,
  },

  headerLeft: {
    width: 44,
    alignItems: "flex-start",
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 2,
    fontFamily: theme.typography.fontFamily.bold,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    gap: 8,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
  },
  editToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 6,
    borderColor: theme.colors.primary,
  },
  streakText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: "bold",
    color: APP_COLORS.passport.streak,
    letterSpacing: 1,
  },
  editToggleText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: "bold",
    color: theme.colors.primary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  editToggleTextActive: {
    color: theme.colors.accent,
  },
  heroTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: "bold",
    color: theme.colors.text,
    fontFamily: "Courier",
    padding: 0,
    margin: 0,
  },
  heroTagline: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.muted,
    fontStyle: "italic",
    fontFamily: "Courier",
    padding: 0,
    margin: 0,
  },
  heroTaglineText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.muted,
    fontStyle: "italic",
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
  },
  heroMeta: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  heroMood: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    fontFamily: "Courier",
    padding: 0,
    margin: 0,
    minHeight: 60,
  },
  heroMoodText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: "bold",
    color: theme.colors.muted,
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  divider: {
    height: 2,
    backgroundColor: theme.colors.border,
    marginBottom: 16,
  },
  buildingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    borderRadius: 12,
  },
  buildingCardActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.background,
  },
  buildingBadge: {
    width: 24,
    height: 24,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  buildingIndex: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  buildingBody: {
    flex: 1,
    gap: 4,
  },
  buildingName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  buildingMeta: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    fontWeight: "bold",
  },
  dragHandle: {
    marginLeft: 8,
  },
  swipeDelete: {
    justifyContent: "center",
    alignItems: "center",
    width: 64,
    backgroundColor: theme.colors.primary,
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 1,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    textAlign: "center",
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyAddText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: "bold",
    color: theme.colors.background,
    letterSpacing: 1,
  },
});
