import PassportHeader from "@/components/passport/PassportHeader";
import {
  achievementLedger,
  passportLists as passportListContent,
  stampCollection,
  visaCarousel,
} from "@/constants/passportContent";
import { usePassportData } from "@/hooks/usePassportData";
import { log } from "@/lib/log";
import { screens, type RootParams } from "@/navigation/routes";
import { getStreakMultiplier } from "@/theme/designConstants";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { width: _width } = Dimensions.get("window");

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
        case "Past Jinks":
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

    return <PassportContent data={passportState.value} onCardPress={handleCardPress} />;
  }, [handleCardPress, passportState, handleRefresh]);


  const refreshControl =
    passportState.status === "ready" || passportState.status === "error" ? (
      <RefreshControl 
        refreshing={passportState.refreshing} 
        onRefresh={handleRefresh}
        tintColor={theme.colors.primary}
      />
    ) : undefined;

  return (
    <View style={styles.container}>
      {passportState.status === "ready" ? (
        <PassportHeader
          issueDate={passportState.value.issueDateLabel ?? undefined}
          totalBuildingsScanned={passportState.value.totalBuildingsScanned}
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
    </View>
  );
}



type PassportContentProps = {
  data: PassportUiData;
  onCardPress: (category: string) => void;
};

// ... existing imports

function PassportContent({ data, onCardPress }: PassportContentProps) {
  // These state variables are prepared for future dropdown expansion feature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_expanded, _setExpanded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_showXPModal, _setShowXPModal] = useState(false);
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _progressPercent = Math.round(data.xpProgress * 100);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _remainingXP = data.xpForNextLevel - data.xpTotal;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _streakInfo = getStreakMultiplier(data.dailyStreak ?? 0); // Assuming data has streak, or pass it in

  // Circle SVG properties for dropdown
  const size = 80;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _strokeDashoffset = circumference - (data.xpProgress) * circumference;

  const stampSource = data.stamps.length > 0 ? data.stamps : stampCollection.map((stamp) => ({ id: stamp.id, name: stamp.title }));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _stampsPreview = stampSource.slice(0, 3);
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
        onPress={() => _setShowXPModal(true)}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={require("../../../assets/cards/bearer_status_card.png")}
          style={{
            width: '100%',
            aspectRatio: 390/180,
            padding: 0,
            justifyContent: 'center',
          }}
          resizeMode="contain"
        >

          {/* Bearer Status: Text is baked into image for now, removing dynamic overlays to prevent duplication */}
        </ImageBackground>
      </TouchableOpacity>

      {/* Grid Layout for Categories */}
      <View style={styles.gridRow}>
        {/* Stamps */}
        <TouchableOpacity
          style={{ width: '48%' }}
          onPress={() => onCardPress("Stamps")}
          activeOpacity={0.8}
        >
          <ImageBackground
             source={require("../../../assets/cards/stamps_card.png")}
             style={{ width: '100%', aspectRatio: 186/140, padding: 0, justifyContent: 'center' }}
             resizeMode="contain"
          >
             <View style={{ padding: 16, width: '100%', height: '100%', justifyContent: 'center' }}>
                <Text style={{ fontFamily: theme.typography.fontFamily.bold, fontSize: 36, color: '#111', marginTop: 20 }}>{stampCount}</Text>
             </View>
          </ImageBackground>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ width: '48%', marginLeft: 8 }}
          onPress={() => onCardPress("Achievements")}
          activeOpacity={0.8}
        >
          <ImageBackground
             source={require("../../../assets/cards/awards_card.png")}
             style={{ width: '100%', aspectRatio: 186/140, padding: 0, justifyContent: 'center' }}
             resizeMode="contain"
          >
             <View style={{ padding: 16, width: '100%', height: '100%', justifyContent: 'center' }}>
                <Text style={{ fontFamily: theme.typography.fontFamily.bold, fontSize: 36, color: '#111', marginTop: 20 }}>{achievementCount}</Text>
             </View>
          </ImageBackground>
        </TouchableOpacity>
      </View>

      <View style={[styles.gridRow, { marginTop: 8 }]}>
        {/* Lists */}
        <TouchableOpacity
          style={{ width: '48%' }}
          onPress={() => onCardPress("Lists")}
          activeOpacity={0.8}
        >
          <ImageBackground
             source={require("../../../assets/cards/lists_card.png")}
             style={{ width: '100%', aspectRatio: 186/140, padding: 0, justifyContent: 'center' }}
             resizeMode="contain"
          >
             <View style={{ padding: 16, width: '100%', height: '100%', justifyContent: 'center' }}>
                <Text style={{ fontFamily: theme.typography.fontFamily.bold, fontSize: 36, color: '#111', marginTop: 20 }}>{listCount}</Text>
             </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* Visas */}
        <TouchableOpacity
          style={{ width: '48%', marginLeft: 8 }}
          onPress={() => onCardPress("Visas")}
          activeOpacity={0.8}
        >
          <ImageBackground
             source={require("../../../assets/cards/visas_card.png")}
             style={{ width: '100%', aspectRatio: 186/140, padding: 0, justifyContent: 'center' }}
             resizeMode="contain"
          >
             <View style={{ padding: 16, width: '100%', height: '100%', justifyContent: 'center' }}>
                <Text style={{ fontFamily: theme.typography.fontFamily.bold, fontSize: 36, color: '#111', marginTop: 20 }}>{visaCarousel.length}</Text>
             </View>
          </ImageBackground>
        </TouchableOpacity>
      </View>

      {/* Past Jinks - Full Width */}
      <TouchableOpacity
        style={{ marginTop: 8 }}
        onPress={() => onCardPress("Past Jinks")}
        activeOpacity={0.8}
      >
          <ImageBackground
             source={require("../../../assets/cards/past_walks_card.png")}
             style={{ width: '100%', aspectRatio: 390/280, padding: 0}}
             resizeMode="contain"
          >
             <View style={{ padding: 20, paddingTop: 40, width: '100%', height: '100%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
                   <Text style={{ fontFamily: 'Courier', fontSize: 10, fontWeight: 'bold', color: '#111', opacity: 0.8 }}>{data.walks.length.toString().padStart(2, '0')}</Text>
                </View>
                
                <View style={{ gap: 14 }}>
                   {data.walks.slice(0, 5).map((walk: any) => (
                     <View key={walk.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                       <Text style={{ fontFamily: 'Courier', fontSize: 10, color: '#111', opacity: 0.8 }}>
                         {walk.date} | {walk.duration} | {walk.buildingCount} Buildings
                       </Text>
                       <Text style={{ fontFamily: theme.typography.fontFamily.bold, fontSize: 12, color: '#111' }}>{walk.style}</Text>
                     </View>
                   ))}
                   {data.walks.length === 0 && (
                      <Text style={{ fontFamily: 'Courier', fontSize: 12, color: '#111', opacity: 0.6, textAlign: 'center', marginTop: 20 }}>NO ENTRIES RECORDED</Text>
                   )}
                </View>
             </View>
          </ImageBackground>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#ece9da" 
  },
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingTop: 0, 
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
    gap: 8,
  },
  dataBlock: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderLeftWidth: 2,
    borderRadius: 12,
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
    borderRadius: 12,
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
  },
  gridItem: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderTopWidth: 2,
    borderRadius: 12,
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
    borderRadius: 12,
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
