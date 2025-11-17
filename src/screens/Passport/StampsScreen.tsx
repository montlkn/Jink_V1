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
import * as Haptics from "expo-haptics";
import { stampCollection, type StampDefinition } from "@/constants/passportContent";
import { screens, type RootParams } from "@/navigation/routes";
import {
  PassportBackdrop,
  PassportInfoButton,
  PassportStamp,
  StampDetailModal,
} from "@/features/passport/components";

type Navigation = NativeStackNavigationProp<RootParams, typeof screens.PassportStamps>;

const rarityPalette: Record<StampDefinition["rarity"], string> = {
  common: "#6B7280",
  rare: "#2563EB",
  epic: "#7C3AED",
  legendary: "#DC2626",
};

const rarityLabel: Record<StampDefinition["rarity"], string> = {
  common: "Common",
  rare: "Rare (Quest)",
  epic: "Epic (Achievement)",
  legendary: "Legendary",
};

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type StampCardProps = {
  item: StampDefinition;
  pinned: boolean;
  onLongPress: (id: string) => void;
  onPress: (item: StampDefinition) => void;
};

function StampCard({ item, pinned, onLongPress, onPress }: StampCardProps) {
  const strokeColor = rarityPalette[item.rarity];
  const [isLongPressing, setIsLongPressing] = React.useState(false);

  const handlePressIn = () => {
    setIsLongPressing(true);
    // Light haptic on press to indicate interactivity
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
  };

  const handlePressOut = () => {
    setIsLongPressing(false);
  };

  const handleLongPressActivate = () => {
    // Medium haptic when long press activates
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
    onLongPress(item.id);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPressActivate}
      delayLongPress={500}
      style={[
        styles.cardTouchable,
        isLongPressing && styles.cardTouchablePressing,
      ]}
    >
      <View style={styles.stampWrapper}>
        <PassportStamp stamp={item.title} date={item.issuedAt} />
        {pinned ? (
          <View style={[styles.pinBadge, { backgroundColor: strokeColor }]}>
            <Ionicons name="star" size={16} color="#fff" />
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.rarityBadge, { borderColor: strokeColor }]}>
            <Text style={[styles.rarityText, { color: strokeColor }]}>{rarityLabel[item.rarity]}</Text>
          </View>
          <Text style={styles.cardMeta}>{item.source}</Text>
          <Text numberOfLines={3} style={styles.cardDescription}>{item.description}</Text>
        </View>
        <Text style={styles.cardFooter}>Issued {formatDate(item.issuedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function StampsScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const [pinned, setPinned] = useState<Record<string, boolean>>({});
  const [selectedStamp, setSelectedStamp] = useState<StampDefinition | null>(null);

  const sortedStamps = useMemo(
    () =>
      [...stampCollection].sort((a, b) => {
        if (a.rarity === b.rarity) {
          return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
        }
        const rarityOrder: StampDefinition["rarity"][] = ["legendary", "epic", "rare", "common"];
        return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
      }),
    []
  );

  const handleLongPress = useCallback((id: string) => {
    setPinned((prev) => {
      const next = { ...prev };
      const wasUnpinned = !next[id];
      next[id] = !next[id];

      // Success haptic with different feedback for pin vs unpin
      if (wasUnpinned) {
        // Heavier haptic for pinning
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      } else {
        // Lighter haptic for unpinning
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
      }

      return next;
    });
  }, []);

  const handleInfo = useCallback(() => {
    Alert.alert(
      "Passport Stamps",
      "Stamps record every discovery, quest finish, and curated honor you unlock. Collect them to track your aesthetic journey and reveal hidden bonuses when sets are completed."
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <PassportBackdrop tailColor="#F8F5EE" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Passport Stamps</Text>
        <PassportInfoButton
          style={styles.infoButton}
          onPress={handleInfo}
          accessibilityLabel="Learn about passport stamps"
        />
      </View>

      <Text style={styles.subheader}>
        {sortedStamps.length} stamp{sortedStamps.length !== 1 ? "s" : ""} recorded · Long-press any
        tile to toggle its pinned state.
      </Text>

      <FlatList
        data={sortedStamps}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <StampCard
            item={item}
            pinned={Boolean(pinned[item.id])}
            onLongPress={handleLongPress}
            onPress={setSelectedStamp}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <StampDetailModal
        visible={selectedStamp !== null}
        stamp={selectedStamp}
        onClose={() => setSelectedStamp(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F5EE",
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
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  infoButton: {
    marginBottom: 2,
  },
  subheader: {
    fontSize: 14,
    color: "#475569",
    paddingHorizontal: 20,
    marginBottom: 12,
    zIndex: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  column: {
    justifyContent: "space-between",
  },
  cardTouchable: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#E0E7FF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    minHeight: 260,
  },
  cardTouchablePressing: {
    transform: [{ scale: 0.98 }],
    borderColor: "#A5B4FC",
    shadowOpacity: 0.12,
  },
  stampWrapper: {
    alignItems: "center",
    marginBottom: 12,
  },
  pinBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cardBody: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingBottom: 4,
    gap: 12,
  },
  cardTop: { gap: 10 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  rarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
  },
  rarityText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardMeta: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: "#374151",
    minHeight: 48,
  },
  cardFooter: {
    fontSize: 12,
    color: "#475569",
    fontStyle: "italic",
    marginTop: 4,
  },
});
