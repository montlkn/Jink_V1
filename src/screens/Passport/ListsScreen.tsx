import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { passportLists, type PassportListDefinition } from "@/constants/passportContent";
import { screens, type RootParams } from "@/navigation/routes";
import { PassportBackdrop, PassportInfoButton } from "@/features/passport/components";

type Navigation = NativeStackNavigationProp<RootParams, typeof screens.PassportLists>;

type ListCardProps = {
  item: PassportListDefinition;
  editMode: boolean;
  onPress: (listId: string) => void;
  onDelete: (listId: string) => void;
};

function ListCard({ item, editMode, onPress, onDelete }: ListCardProps) {
  const preview = useMemo(() => item.buildings.slice(0, 4), [item.buildings]);

  return (
    <TouchableOpacity
      style={[styles.card, editMode && styles.cardEditing]}
      activeOpacity={editMode ? 1 : 0.85}
      onPress={() => (!editMode ? onPress(item.id) : undefined)}
    >
      {editMode ? (
        <TouchableOpacity
          style={styles.deleteBadge}
          activeOpacity={0.7}
          onPress={() => onDelete(item.id)}
        >
          <Ionicons name="trash" size={16} color="#fff" />
        </TouchableOpacity>
      ) : null}
      <View style={styles.previewGrid}>
        {preview.map((building) => (
          <View key={building.id} style={styles.previewTile}>
            <View style={styles.previewTileInner}>
              <Text style={styles.previewInitial}>{building.name[0] ?? "?"}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardLabel}>List:</Text>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardTagline}>&quot;{item.tagline}&quot;</Text>
        <Text style={styles.cardMeta}>{item.buildings.length} building{item.buildings.length === 1 ? "" : "s"}</Text>
        <Text style={styles.cardPrompt}>→ {item.prompt.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ListsScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const [lists, setLists] = useState<PassportListDefinition[]>(passportLists);
  const [editMode, setEditMode] = useState(false);

  const toggleEdit = useCallback(() => {
    setEditMode((prev) => !prev);
  }, []);

  const handleInfo = useCallback(() => {
    Alert.alert(
      "Saved Lists",
      "Lists help you group buildings by vibe, walk plan, or study theme. Expand a list to reorder entries, trim any you no longer need, and keep your passport ready for the next derive."
    );
  }, []);

  const handlePress = useCallback(
    (listId: string) => {
      if (editMode) {
        return;
      }
      navigation.navigate(screens.PassportListDetail, { listId });
    },
    [editMode, navigation]
  );

  const confirmDelete = useCallback(
    (listId: string) => {
      const target = lists.find((list) => list.id === listId);
      if (!target) {
        return;
      }

      Alert.alert(
        "Delete list?",
        `Remove "${target.name}" from your passport? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              setLists((current) => current.filter((list) => list.id !== listId));
            },
          },
        ]
      );
    },
    [lists]
  );

  return (
    <SafeAreaView style={styles.container}>
      <PassportBackdrop tailColor="#FDF7F0" />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <PassportInfoButton onPress={handleInfo} accessibilityLabel="Learn about saved lists" />
        </View>
        <Text style={styles.headerTitle}>Lists</Text>
        <TouchableOpacity
          style={[styles.editButton, editMode && styles.editButtonActive]}
          onPress={toggleEdit}
          activeOpacity={0.85}
        >
          <Text style={[styles.editButtonText, editMode && styles.editButtonTextActive]}>
            {editMode ? "Done" : "Edit"}
          </Text>
        </TouchableOpacity>
      </View>
      {editMode ? <Text style={styles.editModeText}>Tap trash to delete lists</Text> : null}
      <Text style={styles.subheader}>
        Curate building lineups by vibe. Tap a list to expand the dossier or long-press inside to
        reorganize buildings.
      </Text>

      {lists.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="albums-outline" size={36} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No lists yet</Text>
          <Text style={styles.emptyCopy}>Create a collection from a walk or stamp unlock to see it here.</Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ListCard item={item} editMode={editMode} onPress={handlePress} onDelete={confirmDelete} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF7F0",
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
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
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  editButton: {
    minWidth: 88,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D6D3D1",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  editButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
    shadowOpacity: 0.12,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#111827",
    textTransform: "uppercase",
    textAlign: "center",
  },
  editButtonTextActive: {
    color: "#F5F5F4",
  },
  editModeText: {
    fontSize: 10,
    color: "#4B5563",
    letterSpacing: 0.3,
    textAlign: "center",
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  subheader: {
    fontSize: 14,
    color: "#52525B",
    paddingHorizontal: 20,
    marginBottom: 20,
    zIndex: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  column: {
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    minHeight: 240,
  },
  cardEditing: {
    borderColor: "#F87171",
  },
  deleteBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2,
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -2,
    marginBottom: 8,
  },
  previewTile: {
    width: "50%",
    padding: 2,
  },
  previewTileInner: {
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#E7E2D9",
    alignItems: "center",
    justifyContent: "center",
  },
  previewInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4B5563",
  },
  cardBody: {
    gap: 6,
    paddingTop: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  cardTagline: {
    fontSize: 13,
    color: "#374151",
    fontStyle: "italic",
  },
  cardMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  cardPrompt: {
    fontSize: 13,
    color: "#1D4ED8",
    fontWeight: "700",
    marginTop: 6,
  },
  emptyState: {
    marginTop: 48,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  emptyCopy: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
});
