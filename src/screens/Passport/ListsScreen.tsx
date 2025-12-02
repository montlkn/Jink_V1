import { passportLists, type PassportListDefinition } from "@/constants/passportContent";
import { PassportBackButton, PassportEditButton } from "@/features/passport";
import { screens, type RootParams } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import {
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

export default function ListsScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const [lists, setLists] = useState<PassportListDefinition[]>(passportLists);
  const [editMode, setEditMode] = useState(false);

  const toggleEdit = useCallback(() => {
    setEditMode((prev) => !prev);
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
        "DELETE LIST?",
        `Remove "${target.name}" from your passport? This action cannot be undone.`,
        [
          { text: "CANCEL", style: "cancel" },
          {
            text: "DELETE",
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

      {lists.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="albums-outline" size={36} color={theme.colors.muted} />
          <Text style={styles.emptyTitle}>NO DATA</Text>
          <Text style={styles.emptyCopy}>CREATE NEW LIST</Text>
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
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 2,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily.bold,
  },
  headerRight: {
    width: 52,
    alignItems: "flex-end",
  },
  editButtonText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    color: theme.colors.primary,
    textTransform: "uppercase",
  },
  editButtonTextActive: {
    color: theme.colors.background,
  },
  editModeText: {
    fontSize: 10,
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
    fontSize: 8,
    color: theme.colors.muted,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  cardId: {
    fontSize: 8,
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
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.muted,
  },
  cardBody: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  cardTagline: {
    fontSize: 10,
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
    fontSize: 9,
    color: theme.colors.accent,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  emptyState: {
    marginTop: 48,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 1,
  },
  emptyCopy: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: "center",
    letterSpacing: 1,
  },
});
