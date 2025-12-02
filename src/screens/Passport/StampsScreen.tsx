import { stampCollection, type StampDefinition } from "@/constants/passportContent";
import { InlineFlipCard, PassportBackButton, PassportInfoButton, PassportStamp } from "@/features/passport";
import { screens, type RootParams } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

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
  expanded: boolean;
  onLongPress: (id: string) => void;
  onPress: (id: string) => void;
};

function StampCard({ item, pinned, expanded, onLongPress, onPress }: StampCardProps) {
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

  const handlePress = () => {
    onPress(item.id);
  };

  const FrontContent = (
    <View style={{ flex: 1, padding: 12, justifyContent: 'space-between', backgroundColor: theme.colors.surface }}>
      <View style={styles.cardHeader}>
        <View style={[styles.rarityIndicator, { backgroundColor: strokeColor }]} />
        {pinned && <Ionicons name="star" size={10} color={theme.colors.accent} />}
      </View>
      
      <View style={styles.stampWrapper}>
        <PassportStamp stamp={item.title} date={item.issuedAt} size={80} />
      </View>

      <View style={styles.cardBody}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {item.title}
        </Text>
        
        <Text style={[styles.rarityText, { color: strokeColor }]}>{rarityLabel[item.rarity]}</Text>
        <Text style={styles.dateText}>{formatDate(item.issuedAt)}</Text>
      </View>
    </View>
  );

  const BackContent = (
    <View style={{ flex: 1, padding: 12, justifyContent: 'space-between', backgroundColor: strokeColor }}>
      <View style={styles.cardHeader}>
        <View style={[styles.rarityIndicator, { backgroundColor: '#FFFFFF' }]} />
        <Ionicons name="information-circle" size={12} color="#FFFFFF" />
      </View>

      <View style={[styles.cardBody, { justifyContent: 'center', flex: 1 }]}>
        <Text style={[styles.cardTitle, { fontSize: 12, textAlign: 'center', marginBottom: 8, color: '#FFFFFF' }]}>
          {item.title}
        </Text>
        
        <View style={styles.miniInfo}>
            <Text style={[styles.rarityText, { color: '#FFFFFF', marginBottom: 4 }]}>
              {rarityLabel[item.rarity]}
            </Text>
            
            <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            
            <Text numberOfLines={3} style={[styles.miniDescription, { color: '#FFFFFF' }]}>{item.description}</Text>
            
            <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            
            <Text style={[styles.dateText, { color: 'rgba(255,255,255,0.8)' }]}>{formatDate(item.issuedAt)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPressActivate}
      delayLongPress={500}
      style={[
        styles.cardTouchable,
        { 
          borderColor: pinned ? theme.colors.accent : theme.colors.border,
          width: '48%',
          height: 180, // Fixed height for consistent flip
        },
        isLongPressing && styles.cardTouchablePressing,
      ]}
    >
      <InlineFlipCard 
        isOpen={expanded}
        front={FrontContent}
        back={BackContent}
        style={{ height: '100%' }}
      />
    </TouchableOpacity>
  );
}

export default function StampsScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const [pinned, setPinned] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const handlePress = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
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
        <View style={styles.headerLeft}>
          <PassportBackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>PASSPORT STAMPS</Text>
        </View>
        <View style={styles.headerRight}>
          <PassportInfoButton
            onPress={handleInfo}
            accessibilityLabel="Learn about passport stamps"
          />
        </View>
      </View>

      <Text style={styles.subheader}>
        {sortedStamps.length} RECORDED // LONG-PRESS TO PIN
      </Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.gridContainer}>
          {sortedStamps.map((item) => (
            <StampCard
              key={item.id}
              item={item}
              pinned={Boolean(pinned[item.id])}
              expanded={expandedId === item.id}
              onLongPress={handleLongPress}
              onPress={handlePress}
            />
          ))}
        </View>
      </ScrollView>
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
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: 1,
    textAlign: "center",
  },
  headerRight: {
    width: 44,
    alignItems: "flex-end",
  },
  subheader: {
    fontSize: 10,
    color: theme.colors.muted,
    paddingHorizontal: 20,
    paddingVertical: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardTouchable: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardTouchablePressing: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rarityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 12,
  },
  stampWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    flex: 1,
  },
  cardBody: {
    gap: 2,
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
  miniInfo: {
    alignItems: 'center',
    width: '100%',
  },
  miniDescription: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.text,
    fontFamily: "Courier",
    textAlign: 'center',
    marginVertical: 4,
  },
  divider: {
    width: '40%',
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 6,
  },
});
