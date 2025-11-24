import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
import DraggableFlatList, { type RenderItemParams } from "react-native-draggable-flatlist";
import * as Haptics from "expo-haptics";
import { passportLists, type BuildingDetail } from "@/constants/passportContent";
import { screens, type RootParams } from "@/navigation/routes";
import { PassportBackdrop, PassportInfoButton } from "@/features/passport";

type Route = RouteProp<RootParams, typeof screens.PassportListDetail>;

type BuildingCardProps = {
  building: BuildingDetail;
  index: number;
  drag: () => void;
  isActive: boolean;
  onDelete: (buildingId: string) => void;
};

function BuildingCard({ building, index, drag, isActive, onDelete }: BuildingCardProps) {
  const swipeRef = useRef<Swipeable | null>(null);

  const handleDelete = useCallback(() => {
    // Haptic feedback on delete
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null);
    swipeRef.current?.close();
    onDelete(building.id);
  }, [building.id, onDelete]);

  const handleSwipeOpen = useCallback(() => {
    // Light haptic when swipe reveals delete button
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
  }, []);

  const renderRightActions = useCallback(
    () => (
      <TouchableOpacity style={styles.swipeDelete} activeOpacity={0.85} onPress={handleDelete}>
        <Ionicons name="trash" size={20} color="#fff" />
      </TouchableOpacity>
    ),
    [handleDelete]
  );

  const handleLongPress = useCallback(() => {
    // Haptic feedback on long press before dragging
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
        style={[styles.buildingCard, isActive && styles.buildingCardActive]}
      >
        <View style={styles.buildingBadge}>
          <Text style={styles.buildingIndex}>{String(index + 1).padStart(2, "0")}</Text>
        </View>
        <View style={styles.buildingPreview}>
          <Text style={styles.buildingPreviewInitial}>{building.name[0] ?? "?"}</Text>
        </View>
        <View style={styles.buildingBody}>
          <Text style={styles.buildingName}>{building.name}</Text>
          <Text style={styles.buildingMeta}>
            {building.address} • {building.style} • {building.year}
          </Text>
          <Text style={styles.buildingSummary}>{building.summary}</Text>
        </View>
        <Ionicons name="reorder-three" size={22} color="#9CA3AF" style={styles.dragHandle} />
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function ListDetailScreen(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<Route>();

  const list = useMemo(() => {
    if (!route.params?.listId) {
      return passportLists[0];
    }
    const match = passportLists.find((entry) => entry.id === route.params?.listId);
    return match ?? passportLists[0];
  }, [route.params?.listId]);

  const [buildings, setBuildings] = useState<BuildingDetail[]>(list.buildings);
  const [listName, setListName] = useState(list.name);
  const [listTagline, setListTagline] = useState(list.tagline);
  const [listMood, setListMood] = useState(list.mood);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setBuildings(list.buildings);
  }, [list]);

  const handleInfo = useCallback(() => {
    Alert.alert(
      "List Dossier",
      "Each list is a curated itinerary. Long-press any building tile to drag it to a new position, or swipe left to remove ones you no longer need."
    );
  }, []);

  const handleDelete = useCallback((buildingId: string) => {
    setBuildings((current) => current.filter((building) => building.id !== buildingId));
  }, []);

  const handleDragEnd = useCallback(({ data }: { data: BuildingDetail[] }) => {
    setBuildings(data);
  }, []);

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
        />
      );
    },
    [handleDelete]
  );

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.container}>
        <PassportBackdrop tailColor="#F7F4F0" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{listName}</Text>
          <PassportInfoButton
            style={styles.infoButton}
            onPress={handleInfo}
            accessibilityLabel="Learn about this list"
          />
        </View>

        <DraggableFlatList
          data={buildings}
          keyExtractor={(item) => item.id}
          renderItem={renderBuilding}
          onDragEnd={handleDragEnd}
          activationDistance={12}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <Text style={styles.heroLabel}>List dossier</Text>
                  <TouchableOpacity
                    style={styles.editToggle}
                    onPress={() => setIsEditing(!isEditing)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isEditing ? "checkmark" : "pencil"}
                      size={14}
                      color={isEditing ? "#10B981" : "#6366F1"}
                    />
                    <Text style={[styles.editToggleText, isEditing && styles.editToggleTextActive]}>
                      {isEditing ? "Done" : "Edit"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isEditing ? (
                  <TextInput
                    style={styles.heroTitle}
                    value={listName}
                    onChangeText={setListName}
                    placeholder="List name"
                    placeholderTextColor="#9CA3AF"
                    autoFocus
                  />
                ) : (
                  <Text style={styles.heroTitle}>{listName}</Text>
                )}

                {isEditing ? (
                  <View style={styles.taglineRow}>
                    <Text style={styles.quoteLeft}>&quot;</Text>
                    <TextInput
                      style={styles.heroTagline}
                      value={listTagline}
                      onChangeText={setListTagline}
                      placeholder="Tagline"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text style={styles.quoteRight}>&quot;</Text>
                  </View>
                ) : (
                  <Text style={styles.heroTaglineText}>&quot;{listTagline}&quot;</Text>
                )}

                <View style={styles.heroMetaRow}>
                  <Ionicons name="business" size={16} color="#1D4ED8" />
                  <Text style={styles.heroMeta}>
                    {buildings.length} building{buildings.length === 1 ? "" : "s"}
                  </Text>
                </View>

                {isEditing ? (
                  <TextInput
                    style={styles.heroMood}
                    value={listMood}
                    onChangeText={setListMood}
                    placeholder="Description"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    textAlignVertical="top"
                  />
                ) : (
                  <Text style={styles.heroMoodText}>{listMood}</Text>
                )}
              </View>
              <Text style={styles.sectionTitle}>Buildings in this list</Text>
              <View style={styles.divider} />
            </View>
          }
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: "#F7F4F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    zIndex: 3,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "center",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  infoButton: {
    marginBottom: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: "#E0E7FF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    gap: 8,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 12,
    color: "#6366F1",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "600",
  },
  editToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  editToggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6366F1",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  editToggleTextActive: {
    color: "#10B981",
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    fontFamily: "Courier",
    padding: 0,
    margin: 0,
  },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quoteLeft: {
    fontSize: 15,
    color: "#1F2937",
    fontStyle: "italic",
  },
  quoteRight: {
    fontSize: 15,
    color: "#1F2937",
    fontStyle: "italic",
  },
  heroTagline: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    fontStyle: "italic",
    fontFamily: "Courier",
    padding: 0,
    margin: 0,
  },
  heroTaglineText: {
    fontSize: 15,
    color: "#1F2937",
    fontStyle: "italic",
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  heroMeta: {
    fontSize: 13,
    color: "#1F2937",
  },
  heroMood: {
    fontSize: 13,
    color: "#4B5563",
    fontFamily: "Courier",
    padding: 0,
    margin: 0,
    minHeight: 60,
  },
  heroMoodText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E4E4E7",
    marginBottom: 16,
  },
  buildingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  buildingCardActive: {
    borderColor: "#6366F1",
    shadowOpacity: 0.15,
  },
  buildingBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  buildingIndex: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },
  buildingPreview: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  buildingPreviewInitial: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4B5563",
  },
  buildingBody: {
    flex: 1,
    gap: 4,
  },
  buildingName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  buildingMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  buildingSummary: {
    fontSize: 13,
    color: "#1F2937",
  },
  dragHandle: {
    marginLeft: 8,
    color: "#9CA3AF",
  },
  swipeDelete: {
    justifyContent: "center",
    alignItems: "center",
    width: 64,
    backgroundColor: "#DC2626",
    borderRadius: 16,
    marginBottom: 14,
  },
});
