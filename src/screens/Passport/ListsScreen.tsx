import { passportLists, type PassportListDefinition } from "@/constants/passportContent";
import {
    CreateListModal,
    PassportBackButton,
    PassportEditButton,
    createList,
    deleteList,
    getAllListsMetadata,
    type ListMetadata,
} from "@/features/passport";
import { screens, type RootParams } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

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
      
      <View style={styles.cardHeader}>
        <Text style={styles.cardLabel}>LIST REF</Text>
        <Text style={styles.cardId}>{item.id.substring(0, 4).toUpperCase()}</Text>
      </View>

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
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardTagline}>{item.tagline}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.cardMeta}>{item.buildings.length} ENTRIES</Text>
          <Ionicons name="arrow-forward" size={12} color={theme.colors.accent} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Convert ListMetadata to PassportListDefinition format for display
function metadataToListDefinition(metadata: ListMetadata): PassportListDefinition {
  return {
    id: metadata.id,
    name: metadata.name,
    tagline: metadata.tagline,
    prompt: "",
    mood: metadata.mood,
    buildings: metadata.previewBuildings.map((name, index) => ({
      id: `preview_${index}`,
      name,
      address: "",
      style: "",
      year: "",
      summary: "",
    })),
  };
}

export default function ListsScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const [lists, setLists] = useState<PassportListDefinition[]>([]);
  const [storedListIds, setStoredListIds] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load lists from storage on focus
  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [])
  );

  const loadLists = async () => {
    try {
      setLoading(true);
      const storedLists = await getAllListsMetadata();
      const storedIds = new Set(storedLists.map((l) => l.id));
      setStoredListIds(storedIds);

      // Combine stored lists with hardcoded passportLists (for backwards compatibility)
      const storedAsDefinitions = storedLists.map(metadataToListDefinition);

      // Filter out any passportLists that might have been saved (by ID match)
      const hardcodedOnly = passportLists.filter((p) => !storedIds.has(p.id));

      setLists([...storedAsDefinitions, ...hardcodedOnly]);
    } catch (error) {
      console.error("[ListsScreen] Error loading lists:", error);
      setLists(passportLists);
    } finally {
      setLoading(false);
    }
  };

  const toggleEdit = useCallback(() => {
    setEditMode((prev) => !prev);
  }, []);

  const handleCreateList = useCallback(async (name: string, tagline: string, mood: string) => {
    const newList = await createList({ name, tagline, mood });
    await loadLists();
    // Navigate to the new list
    navigation.navigate(screens.PassportListDetail, { listId: newList.id });
  }, [navigation]);



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

      // Check if this is a stored list (can be deleted) or hardcoded (cannot)
      const isStoredList = storedListIds.has(listId);

      if (!isStoredList) {
        Alert.alert(
          "CANNOT DELETE",
          "This is a default list and cannot be deleted.",
          [{ text: "OK" }]
        );
        return;
      }

      Alert.alert(
        "DELETE LIST?",
        `Remove "${target.name}" from your passport? This action cannot be undone.`,
        [
          { text: "CANCEL", style: "cancel" },
          {
            text: "DELETE",
            style: "destructive",
            onPress: async () => {
              await deleteList(listId);
              await loadLists();
            },
          },
        ]
      );
    },
    [lists, storedListIds]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <PassportBackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>LISTS</Text>
        </View>
        <View style={styles.headerRight}>
          <PassportEditButton
            onPress={toggleEdit}
            disabled={editMode}
          />
        </View>
      </View>

      {editMode ? <Text style={styles.editModeText}>SELECT TO DELETE</Text> : null}

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : lists.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="albums-outline" size={36} color={theme.colors.muted} />
          <Text style={styles.emptyTitle}>NO LISTS YET</Text>
          <Text style={styles.emptyCopy}>Create your first list</Text>
          <TouchableOpacity
            style={styles.emptyCreateButton}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={theme.colors.background} />
            <Text style={styles.emptyCreateText}>CREATE LIST</Text>
          </TouchableOpacity>
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

      {/* Floating Add Button */}
      {!loading && lists.length > 0 && !editMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={theme.colors.background} />
        </TouchableOpacity>
      )}

      {/* Create List Modal */}
      <CreateListModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    width: 44,
    alignItems: "flex-start",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: theme.typography.letterSpacing.widest,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily.bold,
  },
  headerRight: {
    width: 52,
    alignItems: "flex-end",
  },
  editButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: "bold",
    letterSpacing: 1,
    color: theme.colors.primary,
    textTransform: "uppercase",
  },
  editButtonTextActive: {
    color: theme.colors.background,
  },
  editModeText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    letterSpacing: 1,
    textAlign: "center",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    fontWeight: "bold",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  column: {
    justifyContent: "space-between",
    gap: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    marginBottom: 16,
    flex: 1,
    maxWidth: '48%',
    borderWidth: 2,
    borderColor: theme.colors.accent,
    minHeight: 200,
    borderRadius: 12,
  },
  cardEditing: {
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  deleteBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    borderWidth: 1,
    borderColor: theme.colors.background,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.muted,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  cardId: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.accent,
    fontWeight: "bold",
    fontFamily: "Courier",
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 2,
    borderRadius: 8,
  },
  previewTile: {
    width: "50%",
    padding: 1,
  },
  previewTileInner: {
    aspectRatio: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  previewInitial: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: "bold",
    color: theme.colors.muted,
  },
  cardBody: {
    gap: 4,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  cardTagline: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    fontStyle: "italic",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 4,
  },
  cardMeta: {
    fontSize: theme.typography.fontSize.xxxs,
    color: theme.colors.accent,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 1,
  },
  emptyCopy: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    textAlign: "center",
    letterSpacing: 1,
  },
  emptyCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyCreateText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: "bold",
    color: theme.colors.background,
    letterSpacing: 1,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
