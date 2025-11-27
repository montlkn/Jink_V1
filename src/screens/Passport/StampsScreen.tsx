import { stampCollection, type StampDefinition } from "@/constants/passportContent";
import { PassportBackButton, PassportInfoButton, PassportStamp, StampDetailModal } from "@/features/passport";
import { screens, type RootParams } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
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

type Navigation = NativeStackNavigationProp<RootParams, typeof screens.PassportStamps>;

const rarityPalette: Record<StampDefinition["rarity"], string> = {
  common: theme.colors.muted,
  rare: theme.colors.secondary,
  epic: theme.colors.primary,
  legendary: theme.colors.accent,
};

const rarityLabel: Record<StampDefinition["rarity"], string> = {
  common: "COMMON",
  rare: "RARE",
  epic: "EPIC",
  legendary: "LEGENDARY",
};

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
  };

  const handlePressOut = () => {
    setIsLongPressing(false);
  };

  const handleLongPressActivate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
    onLongPress(item.id);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(item)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPressActivate}
      delayLongPress={500}
      style={[
        styles.cardTouchable,
        { borderColor: pinned ? theme.colors.accent : theme.colors.border },
        isLongPressing && styles.cardTouchablePressing,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.rarityIndicator, { backgroundColor: strokeColor }]} />
        {pinned && <Ionicons name="star" size={10} color={theme.colors.accent} />}
      </View>
      
      <View style={styles.stampWrapper}>
        <PassportStamp stamp={item.title} date={item.issuedAt} size={80} />
      </View>

      <View style={styles.cardBody}>
        <Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text>
        <Text style={[styles.rarityText, { color: strokeColor }]}>{rarityLabel[item.rarity]}</Text>
        <Text style={styles.dateText}>{formatDate(item.issuedAt)}</Text>
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

      if (wasUnpinned) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
      }

      return next;
    });
  }, []);

  const handleInfo = useCallback(() => {
    Alert.alert(
      "PASSPORT STAMPS",
      "COLLECT STAMPS TO TRACK YOUR AESTHETIC JOURNEY."
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <PassportBackButton onPress={() => navigation.goBack()} style={styles.backButton} />
        <Text style={styles.headerTitle}>PASSPORT STAMPS</Text>
        <PassportInfoButton
          style={styles.infoButton}
          onPress={handleInfo}
          accessibilityLabel="Learn about passport stamps"
        />
      </View>

      <Text style={styles.subheader}>
        {sortedStamps.length} RECORDED // LONG-PRESS TO PIN
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
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 44,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: 1,
    textAlign: "center",
  },
  infoButton: {
    width: 44,
  },
  subheader: {
    fontSize: 10,
    color: theme.colors.muted,
    paddingHorizontal: 20,
    paddingVertical: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    // Removed Courier
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  column: {
    justifyContent: "space-between",
  },
  cardTouchable: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    flex: 1,
    marginHorizontal: 4,
    minHeight: 180,
    padding: 12,
  },
  cardTouchablePressing: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rarityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 0,
  },
  stampWrapper: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginBottom: 12,
  },
  cardBody: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: "Courier",
  },
  dateText: {
    fontSize: 10,
    color: theme.colors.muted,
    fontFamily: "Courier",
  },
});
