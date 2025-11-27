import XPDetailModal from "@/components/modals/XPDetailModal";
import PassportHeader from "@/components/passport/PassportHeader";
import { SecurityPattern } from "@/components/passport/SecurityPattern";
import { ELEMENT_COLORS } from "@/constants/elementColors";
import {
  achievementLedger,
  passportLists as passportListContent,
  stampCollection,
  visaCarousel,
} from "@/constants/passportContent";
import { log } from "@/lib/log";
import { screens, type RootParams } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { passportActions } from "./mutations";
import type { PassportUiData } from "./selectors";
import { usePassportData } from "./usePassportData";

const { width } = Dimensions.get("window");

type PassportNavigation = NativeStackNavigationProp<RootParams, typeof screens.Passport>;

function SkeletonBlock({ style }: { style: any }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.skeletonBlock, style, animatedStyle]} />;
}

function PassportSkeleton() {
  return (
    <View style={styles.dashboardGrid}>
      <SkeletonBlock style={{ height: 120 }} />
      <SkeletonBlock style={{ height: 80 }} />
      <View style={styles.gridRow}>
        <SkeletonBlock style={{ flex: 1, height: 140 }} />
        <SkeletonBlock style={{ flex: 1, height: 140 }} />
      </View>
      <View style={styles.gridRow}>
        <SkeletonBlock style={{ flex: 1, height: 140 }} />
        <SkeletonBlock style={{ flex: 1, height: 140 }} />
      </View>
      <SkeletonBlock style={{ height: 100 }} />
    </View>
  );
}

export function PassportView(): JSX.Element {
  const navigation = useNavigation<PassportNavigation>();
  const passportState = usePassportData();
  const [xpModalVisible, setXpModalVisible] = useState(false);

  const handleLogout = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
    try {
      await passportActions.signOut();
    } catch (error) {
      log.error("[passport] Logout failed", error);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    passportState.refresh();
  }, [passportState]);

  const handleCardPress = useCallback(
    (category: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
      switch (category) {
        case "Stamps":
          navigation.navigate(screens.PassportStamps);
          return;
        case "Achievements":
          navigation.navigate(screens.PassportAchievements);
          return;
        case "Lists":
          navigation.navigate(screens.PassportLists);
          return;
        case "Visas":
          navigation.navigate(screens.PassportVisas);
          return;
        case "Past Walks":
          navigation.navigate(screens.PastWalksNolli);
          return;
        default:
          log.debug(`[passport] Pressed ${category}`);
      }
    },
    [navigation]
  );

  const content = useMemo(() => {
    if (passportState.status === "loading") {
      return <PassportSkeleton />;
    }

    if (passportState.status === "error") {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>SYSTEM ERROR</Text>
          <Text style={styles.centeredText}>CONNECTION FAILED</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>RETRY CONNECTION</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return <PassportContent data={passportState.value} onCardPress={handleCardPress} onShowXp={() => setXpModalVisible(true)} />;
  }, [handleCardPress, passportState, handleRefresh]);

  const refreshControl =
    passportState.status === "ready" || passportState.status === "error" ? (
      <RefreshControl 
        refreshing={passportState.refreshing} 
        onRefresh={handleRefresh}
        tintColor={theme.colors.primary}
      />
    ) : undefined;

  const xpDetails = passportState.status === "ready" ? passportState.value : null;

  return (
    <View style={styles.container}>
      {passportState.status === "ready" ? (
        <PassportHeader
          issueDate={passportState.value.issueDateLabel ?? undefined}
          onLogout={handleLogout}
        />
      ) : null}
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {content}
        <View style={{ height: 100 }} />
      </ScrollView>

      {xpDetails ? (
        <XPDetailModal
          visible={xpModalVisible}
          onClose={() => setXpModalVisible(false)}
          currentXP={xpDetails.xpTotal}
          level={xpDetails.level}
          xpForNextLevel={xpDetails.xpForNextLevel}
        />
      ) : null}
    </View>
  );
}

type PassportContentProps = {
  data: PassportUiData;
  onCardPress: (category: string) => void;
  onShowXp: () => void;
};

function PassportContent({ data, onCardPress, onShowXp }: PassportContentProps) {
  const progressPercent = Math.round(data.xpProgress * 100);
  const stampSource = data.stamps.length > 0 ? data.stamps : stampCollection.map((stamp) => ({ id: stamp.id, name: stamp.title }));
  const stampsPreview = stampSource.slice(0, 3);
  const stampCount = stampSource.length;

  const achievementSource =
    data.achievements.length > 0
      ? data.achievements
      : achievementLedger.map((achievement) => ({ id: achievement.id, name: achievement.title }));
  const achievementCount = achievementSource.length;

  const listSource =
    data.lists.length > 0
      ? data.lists
      : passportListContent.map((list) => ({ id: list.id, name: list.name }));
  const listCount = listSource.length;

  return (
    <View style={styles.dashboardGrid}>
      {/* Bearer XP Status Section */}
      <TouchableOpacity
        style={[styles.dataBlock, { backgroundColor: ELEMENT_COLORS.passport.bearer, overflow: 'hidden' }]}
        onPress={onShowXp}
        activeOpacity={0.8}
      >
        <SecurityPattern width={width - 40} height={120} color="#FFFFFF" opacity={0.15} />
        <View style={styles.blockHeader}>
          <Text style={[styles.blockLabel, { color: '#FFFFFF' }]}>BEARER XP STATUS</Text>
          <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
        </View>

        <View style={styles.statusRow}>
          <View>
            <Text style={[styles.statusValue, { color: '#FFFFFF' }]}>LEVEL {data.level}</Text>
            <Text style={[styles.statusSub, { color: '#FFFFFF', opacity: 0.9 }]}>EXPLORER CLASS</Text>
          </View>
          <View style={[styles.xpContainer, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
            <Text style={[styles.xpText, { color: '#FFFFFF' }]}>{data.xpTotal.toLocaleString()} XP</Text>
          </View>
        </View>

        <View style={[styles.progressBarContainer, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <View style={[styles.progressBarFill, { backgroundColor: '#FFFFFF', width: `${Math.min(progressPercent, 100)}%` }]} />
        </View>
      </TouchableOpacity>



      {/* Grid Layout for Categories */}
      <View style={styles.gridRow}>
        {/* Stamps */}
        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: ELEMENT_COLORS.passport.stamps, overflow: 'hidden' }]}
          onPress={() => onCardPress("Stamps")}
          activeOpacity={0.8}
        >
          <SecurityPattern width={(width - 56) / 2} height={140} color="#FFFFFF" opacity={0.15} />
          <Text style={[styles.gridLabel, { color: '#FFFFFF' }]}>STAMPS</Text>
          <Text style={[styles.gridValue, { color: '#FFFFFF' }]}>{stampCount}</Text>
          <View style={styles.miniPreview}>
            {stampsPreview.map((stamp, i) => (
              <View key={stamp.id} style={[styles.miniDot, { backgroundColor: '#FFFFFF', opacity: 1 - (i * 0.3) }]} />
            ))}
          </View>
        </TouchableOpacity>

        {/* Achievements */}
        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: ELEMENT_COLORS.passport.achievements, overflow: 'hidden' }]}
          onPress={() => onCardPress("Achievements")}
          activeOpacity={0.8}
        >
          <SecurityPattern width={(width - 56) / 2} height={140} color="#FFFFFF" opacity={0.15} />
          <Text style={[styles.gridLabel, { color: '#FFFFFF' }]}>AWARDS</Text>
          <Text style={[styles.gridValue, { color: '#FFFFFF' }]}>{achievementCount}</Text>
          <Text style={[styles.gridSub, { color: '#FFFFFF', opacity: 0.8 }]}>UNLOCKED</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gridRow}>
        {/* Lists */}
        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: ELEMENT_COLORS.passport.lists, overflow: 'hidden' }]}
          onPress={() => onCardPress("Lists")}
          activeOpacity={0.8}
        >
          <SecurityPattern width={(width - 56) / 2} height={140} color="#FFFFFF" opacity={0.15} />
          <Text style={[styles.gridLabel, { color: '#FFFFFF' }]}>LISTS</Text>
          <Text style={[styles.gridValue, { color: '#FFFFFF' }]}>{listCount}</Text>
          <Text style={[styles.gridSub, { color: '#FFFFFF', opacity: 0.8 }]}>SAVED</Text>
        </TouchableOpacity>

        {/* Visas */}
        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: ELEMENT_COLORS.passport.visas, overflow: 'hidden' }]}
          onPress={() => onCardPress("Visas")}
          activeOpacity={0.8}
        >
          <SecurityPattern width={(width - 56) / 2} height={140} color="#FFFFFF" opacity={0.15} />
          <Text style={[styles.gridLabel, { color: '#FFFFFF' }]}>VISAS</Text>
          <Text style={[styles.gridValue, { color: '#FFFFFF' }]}>{visaCarousel.length}</Text>
          <Text style={[styles.gridSub, { color: '#FFFFFF', opacity: 0.8 }]}>GRANTED</Text>
        </TouchableOpacity>
      </View>

      {/* Past Jinks - Full Width */}
      <TouchableOpacity
        style={[styles.dataBlock, { backgroundColor: ELEMENT_COLORS.passport.walks, overflow: 'hidden' }]}
        onPress={() => onCardPress("Past Jinks")}
        activeOpacity={0.8}
      >
        <SecurityPattern width={width - 40} height={180} color="#FFFFFF" opacity={0.15} />
        <View style={styles.blockHeader}>
          <Text style={[styles.blockLabel, { color: '#FFFFFF' }]}>PAST JINKS</Text>
          <Text style={[styles.logCount, { color: '#FFFFFF', opacity: 0.8 }]}>05 ENTRIES</Text>
        </View>
        <View style={[styles.logEntry, { borderBottomColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <Text style={[styles.logDate, { color: '#FFFFFF', opacity: 0.8 }]}>2025.11.24</Text>
          <Text style={[styles.logTitle, { color: '#FFFFFF' }]}>SOHO CAST IRON</Text>
        </View>
        <View style={[styles.logEntry, { borderBottomColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <Text style={[styles.logDate, { color: '#FFFFFF', opacity: 0.8 }]}>2025.11.20</Text>
          <Text style={[styles.logTitle, { color: '#FFFFFF' }]}>MIDTOWN MODERN</Text>
        </View>
        <View style={[styles.logEntry, { borderBottomColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <Text style={[styles.logDate, { color: '#FFFFFF', opacity: 0.8 }]}>2025.11.18</Text>
          <Text style={[styles.logTitle, { color: '#FFFFFF' }]}>FINANCIAL DISTRICT</Text>
        </View>
        <View style={[styles.logEntry, { borderBottomColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <Text style={[styles.logDate, { color: '#FFFFFF', opacity: 0.8 }]}>2025.11.15</Text>
          <Text style={[styles.logTitle, { color: '#FFFFFF' }]}>GREENWICH VILLAGE</Text>
        </View>
        <View style={[styles.logEntry, { borderBottomColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <Text style={[styles.logDate, { color: '#FFFFFF', opacity: 0.8 }]}>2025.11.12</Text>
          <Text style={[styles.logTitle, { color: '#FFFFFF' }]}>UPPER WEST SIDE</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background 
  },
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 20 
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 160,
  },
  centeredText: {
    fontSize: 12,
    color: theme.colors.muted,
    letterSpacing: 2,
    fontWeight: "bold",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.text,
  },
  retryButtonText: {
    fontSize: 10,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 1,
  },
  dashboardGrid: {
    gap: 16,
  },
  dataBlock: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderLeftWidth: 2,
  },
  blockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  blockLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: theme.colors.muted,
    letterSpacing: 1,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 1,
  },
  statusSub: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.accent,
    letterSpacing: 1,
    marginTop: 4,
  },
  xpContainer: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  xpText: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.colors.text,
    fontFamily: "Courier",
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: theme.colors.background,
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.colors.accent,
  },
  multiplierText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.muted,
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: "row",
    gap: 16,
  },
  gridItem: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderTopWidth: 2,
    minHeight: 100,
    justifyContent: "space-between",
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 8,
  },
  gridValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  gridSub: {
    fontSize: 9,
    fontWeight: "600",
    color: theme.colors.muted,
    letterSpacing: 1,
    alignSelf: "flex-end",
  },
  miniPreview: {
    flexDirection: "row",
    gap: 4,
    alignSelf: "flex-end",
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 0,
  },
  logCount: {
    fontSize: 10,
    fontWeight: "bold",
    color: theme.colors.muted,
  },
  logEntry: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  logDate: {
    fontSize: 10,
    color: theme.colors.muted,
    fontFamily: "Courier",
  },
  logTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  skeletonBlock: {
    backgroundColor: theme.colors.surface,
    borderRadius: 2,
  },
});
