import {
  type BuildingSearchResult,
  createDebouncedSearch,
} from "@/services/buildingSearchService";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ModalCloseButton from "./ModalCloseButton";

type AddBuildingModalProps = {
  visible: boolean;
  onClose: () => void;
  onAddBuilding: (building: BuildingSearchResult) => Promise<boolean>;
  existingBuildingIds: string[]; // BINs or IDs of buildings already in list
};

function SearchResultItem({
  item,
  onAdd,
  isAdded,
  isAdding,
}: {
  item: BuildingSearchResult;
  onAdd: () => void;
  isAdded: boolean;
  isAdding: boolean;
}) {
  return (
    <View style={styles.resultItem}>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.resultAddress} numberOfLines={1}>
          {item.address}
        </Text>
        {(item.style || item.year) && (
          <Text style={styles.resultMeta}>
            {[item.style, item.year].filter(Boolean).join(" • ")}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.addButton,
          isAdded && styles.addButtonAdded,
          isAdding && styles.addButtonAdding,
        ]}
        onPress={onAdd}
        disabled={isAdded || isAdding}
        activeOpacity={0.7}
      >
        {isAdding ? (
          <ActivityIndicator size="small" color={theme.colors.accent} />
        ) : isAdded ? (
          <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
        ) : (
          <Ionicons name="add" size={20} color={theme.colors.background} />
        )}
      </TouchableOpacity>
    </View>
  );
}

export function AddBuildingModal({
  visible,
  onClose,
  onAddBuilding,
  existingBuildingIds,
}: AddBuildingModalProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BuildingSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<TextInput>(null);

  // Create debounced search
  const debouncedSearch = useMemo(
    () =>
      createDebouncedSearch(
        (newResults) => setResults(newResults),
        (isLoading) => setLoading(isLoading),
        300
      ),
    []
  );

  // Search when query changes
  useEffect(() => {
    debouncedSearch.search(query);
  }, [query, debouncedSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Focus input when modal opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Reset state when modal closes
      setQuery("");
      setResults([]);
      setAddedIds(new Set());
    }
  }, [visible]);

  const handleAddBuilding = useCallback(
    async (building: BuildingSearchResult) => {
      setAddingId(building.id);
      try {
        const added = await onAddBuilding(building);
        if (added) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
          setAddedIds((prev) => new Set([...prev, building.id, building.bin]));
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null);
        }
      } catch (error) {
        console.error("[AddBuildingModal] Add error:", error);
      } finally {
        setAddingId(null);
      }
    },
    [onAddBuilding]
  );

  const isAlreadyInList = useCallback(
    (building: BuildingSearchResult) => {
      return (
        existingBuildingIds.includes(building.id) ||
        existingBuildingIds.includes(building.bin) ||
        addedIds.has(building.id) ||
        addedIds.has(building.bin)
      );
    },
    [existingBuildingIds, addedIds]
  );

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const renderItem = useCallback(
    ({ item }: { item: BuildingSearchResult }) => (
      <SearchResultItem
        item={item}
        onAdd={() => handleAddBuilding(item)}
        isAdded={isAlreadyInList(item)}
        isAdding={addingId === item.id}
      />
    ),
    [handleAddBuilding, isAlreadyInList, addingId]
  );

  const keyExtractor = useCallback((item: BuildingSearchResult) => item.id, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ADD BUILDING</Text>
              <View style={styles.headerRight}>
                <ModalCloseButton onPress={handleClose} />
              </View>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={18} color={theme.colors.muted} style={styles.searchIcon} />
                <TextInput
                  ref={inputRef}
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search by name or address..."
                  placeholderTextColor={theme.colors.muted}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery("")} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.resultsContainer}>
              {loading && results.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.accent} />
                  <Text style={styles.loadingText}>SEARCHING...</Text>
                </View>
              ) : results.length === 0 && query.length >= 2 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={36} color={theme.colors.muted} />
                  <Text style={styles.emptyText}>NO BUILDINGS FOUND</Text>
                  <Text style={styles.emptySubtext}>Try a different search term</Text>
                </View>
              ) : query.length < 2 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="business-outline" size={36} color={theme.colors.muted} />
                  <Text style={styles.emptyText}>SEARCH BUILDINGS</Text>
                  <Text style={styles.emptySubtext}>Enter at least 2 characters</Text>
                </View>
              ) : (
                <FlatList
                  data={results}
                  renderItem={renderItem}
                  keyExtractor={keyExtractor}
                  contentContainerStyle={styles.resultsList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  ListFooterComponent={
                    loading ? (
                      <View style={styles.loadingMore}>
                        <ActivityIndicator size="small" color={theme.colors.accent} />
                      </View>
                    ) : null
                  }
                />
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContainer: {
    flex: 1,
    marginTop: 60,
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: theme.colors.accent,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 2,
  },
  headerRight: {
    zIndex: 1,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: "Courier",
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultInfo: {
    flex: 1,
    marginRight: 12,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 2,
  },
  resultMeta: {
    fontSize: 10,
    color: theme.colors.accent,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonAdded: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  addButtonAdding: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.colors.muted,
    letterSpacing: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 1,
  },
  emptySubtext: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: "center",
  },
});

export default AddBuildingModal;
