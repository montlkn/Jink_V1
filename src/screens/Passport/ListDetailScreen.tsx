import { APP_COLORS } from "@/constants/appColors";
import { passportLists, type BuildingDetail } from "@/constants/passportContent";
import { PassportBackButton, PassportInfoButton } from "@/features/passport";
import { screens, type RootParams } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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
        <Ionicons name="trash" size={20} color="#fff" />
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

export default function ListDetailScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
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
      "LIST DETAILS",
      "Each list is a curated itinerary. Long-press any building tile to drag it to a new position."
    );
  }, []);

  const handleDelete = useCallback((buildingId: string) => {
    setBuildings((current) => current.filter((building) => building.id !== buildingId));
  }, []);

  const handleDragEnd = useCallback(({ data }: { data: BuildingDetail[] }) => {
    setBuildings(data);
  }, []);

  const handleBuildingPress = useCallback((building: BuildingDetail) => {
    navigation.navigate(screens.BuildingInfo, { buildingData: building });
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
          <View style={styles.headerRight}>
            <PassportInfoButton
              onPress={handleInfo}
              accessibilityLabel="Learn about this list"
            />
          </View>
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
                  <Text style={styles.heroLabel}>SUBJECT</Text>
                  <TouchableOpacity
                    style={styles.editToggle}
                    onPress={() => setIsEditing(!isEditing)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.editToggleText, isEditing && styles.editToggleTextActive]}>
                      {isEditing ? "DONE" : "EDIT"}
                    </Text>
                  </TouchableOpacity>
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
    borderBottomColor: theme.colors.border,
  },

  headerLeft: {
    zIndex: 1,
  },
  headerRight: {
    zIndex: 1,
  },
  headerTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: -1,
  },
  headerTitle: {
    fontSize: 16,
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
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 10,
    color: theme.colors.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
  },
  editToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  streakText: {
    fontSize: 14,
    fontWeight: "bold",
    color: APP_COLORS.passport.streak,
    letterSpacing: 1,
  },
  editToggleText: {
    fontSize: 10,
    fontWeight: "bold",
    color: theme.colors.primary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  editToggleTextActive: {
    color: theme.colors.accent,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    fontFamily: "Courier",
    padding: 0,
    margin: 0,
  },
  heroTagline: {
    fontSize: 14,
    color: theme.colors.muted,
    fontStyle: "italic",
    fontFamily: "Courier",
    padding: 0,
    margin: 0,
  },
  heroTaglineText: {
    fontSize: 14,
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
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  heroMood: {
    fontSize: 12,
    color: theme.colors.muted,
    fontFamily: "Courier",
    padding: 0,
    margin: 0,
    minHeight: 60,
  },
  heroMoodText: {
    fontSize: 12,
    color: theme.colors.muted,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 12,
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
    borderRadius: 0,
  },
  buildingIndex: {
    fontSize: 10,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  buildingBody: {
    flex: 1,
    gap: 4,
  },
  buildingName: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  buildingMeta: {
    fontSize: 10,
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
});
