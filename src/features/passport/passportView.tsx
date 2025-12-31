import PassportHeader from "@/components/passport/PassportHeader";
import QuestCard from "@/components/quests/QuestCard";
import QuestDetailModal from "@/components/quests/QuestDetailModal";
import AestheticAuraSheet, { type AuraSegment } from "@/components/sheets/AestheticAuraSheet";
import { getArchetypeColor } from "@/constants/archetypeColors";
import {
    passportLists as passportListContent
} from "@/constants/passportContent";
import ArchetypeOrb from "@/features/orb/ArchetypeOrb";
import { useAestheticProfile } from "@/hooks/useAestheticProfile";
import { usePassportData } from "@/hooks/usePassportData";
import { useQuestsData } from "@/hooks/useQuestsData";
import { log } from "@/lib/log";
import { screens, type RootParams } from "@/navigation/routes";
import { useOrbTransition } from "@/state/orbTransitionContext";
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
  const questsState = useQuestsData();
  const { profile } = useAestheticProfile();
  const { orbData } = useOrbTransition();
  const [selectedQuest, setSelectedQuest] = useState<any>(null);
  const [questModalVisible, setQuestModalVisible] = useState(false);
  const [auraModalVisible, setAuraModalVisible] = useState(false);

  // Debug: log profile to understand its structure
  console.log('[PassportView] profile:', JSON.stringify(profile, null, 2));

  // Prepare aura segments for modal - get top 3 from normalized_scores OR archetype_scores
  const auraSegments: AuraSegment[] = useMemo(() => {
    // Try normalized_scores first (from AestheticProfile type), fallback to archetype_scores
    const profileAny = profile as any;
    const normalizedScores = profile?.normalized_scores;
    const rawScores = profileAny?.archetype_scores;
    
    const scores = normalizedScores || rawScores;
    
    if (!scores) {
      console.log('[PassportView] No scores found in profile');
      return [];
    }
    
    const isNormalized = !!normalizedScores;
    console.log('[PassportView] Building aura segments from:', Object.keys(scores), 'isNormalized:', isNormalized);
    
    // Calculate total for raw scores to compute percentage
    let totalScore = 1;
    if (!isNormalized) {
        totalScore = Object.values(scores).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0) || 1;
    }

    return Object.entries(scores)
      .map(([name, val]) => {
        const scoreVal = Number(val) || 0;
        
        let percentage = 0;
        let displayScore = 0;
        
        if (isNormalized) {
            // Value is 0.0 - 1.0
            percentage = Math.round(scoreVal * 100);
            displayScore = Math.round(scoreVal * 100); // Use percentage as score for normalized data
        } else {
            // Value is raw score
            percentage = Math.round((scoreVal / totalScore) * 100);
            displayScore = Math.round(scoreVal);
        }

        return {
            name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
            percentage: percentage,
            score: displayScore,
            color: getArchetypeColor(name),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // Top 3 only
  }, [profile]);

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
    questsState.refresh();
  }, [passportState, questsState]);

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

  const handleQuestPress = useCallback((quest: any) => {
    if (!quest) return;
    setSelectedQuest(quest);
    setQuestModalVisible(true);
  }, []);

  const handleStartQuest = useCallback(
    (params?: RootParams[typeof screens.Quests]) => {
      navigation.navigate(screens.Quests, params);
    },
    [navigation]
  );

  const content = useMemo(() => {
    // Show skeleton for idle, loading states
    if (passportState.status === "idle" || passportState.status === "loading" || questsState.status === "loading") {
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

    return (
      <PassportContent
        data={passportState.value}
        questsData={questsState.status === "ready" ? questsState.value : null}
        onCardPress={handleCardPress}
        onQuestPress={handleQuestPress}
        onOrbPress={() => setAuraModalVisible(true)}
        orbData={orbData || []}
      />
    );
  }, [handleCardPress, handleQuestPress, passportState, questsState, handleRefresh, orbData]);


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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ top: 200 }} 
      >
        {content}
        <View style={{ height: 100 }} />
      </ScrollView>

      {passportState.status === "ready" ? (
        <PassportHeader
          style={styles.absoluteHeader}
          issueDate={passportState.value.issueDateLabel ?? undefined}
          totalBuildingsScanned={passportState.value.totalBuildingsScanned}
          onLogout={handleLogout}
        />
      ) : null}

      <QuestDetailModal
        visible={questModalVisible}
        onClose={() => setQuestModalVisible(false)}
        quest={selectedQuest}
        onStartQuest={handleStartQuest}
      />

      <AestheticAuraSheet
        visible={auraModalVisible}
        segments={auraSegments}
        onClose={() => setAuraModalVisible(false)}
      />
    </View>
  );
}



type PassportContentProps = {
  data: PassportUiData;
  questsData: any;
  onCardPress: (category: string) => void;
  onQuestPress: (quest: any) => void;
  onOrbPress: () => void;
  orbData: any[];
};

// ... existing imports

function PassportContent({ data, questsData, onCardPress, onQuestPress, onOrbPress, orbData }: PassportContentProps) {
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

  // Use real counts from database queries
  const stampCount = data.stampCount;
  const achievementCount = data.achievementCount;
  const visaCount = data.visaCount;

  const listSource =
    data.lists.length > 0
      ? data.lists
      : passportListContent.map((list) => ({ id: list.id, name: list.name }));
  const listCount = listSource.length;

  // Extract quest data
  const dailyQuest = questsData?.quests?.daily || {
    type: 'daily',
    title: "Daily Quest",
    description: "Complete your daily objective",
    xpReward: 100,
    progress: 0,
    total: 1,
    additionalRewards: [],
    completed: false,
  };
  const weeklyQuest = questsData?.quests?.weekly || {
    type: 'weekly',
    title: "Weekly Quest",
    description: "Complete your weekly challenge",
    xpReward: 500,
    progress: 0,
    total: 1,
    additionalRewards: [],
    completed: false,
  };
  // Use shared orb data from context (same as WalkStart screen)
  const archetypeData = orbData || [];

  return (
    <View style={styles.dashboardGrid}>
      {/* Orb Section */}
      <View style={styles.orbSection}>
        <ArchetypeOrb
          archetypeData={archetypeData}
          size={280}
          interactive={true}
          showGlow={true}
          glowOpacityMultiplier={0.2}
          onPress={onOrbPress}
        />
      </View>

      {/* Daily Quest Card - Always visible */}
      <View style={styles.questCardWrapper}>
        <QuestCard
          type="daily"
          title={dailyQuest.title || "Daily Quest"}
          description={dailyQuest.description || "Complete your daily objective"}
          xpReward={dailyQuest.xpReward}
          progress={dailyQuest.progress}
          total={dailyQuest.total || 1}
          additionalRewards={dailyQuest.additionalRewards || []}
          completed={dailyQuest.completed}
          onPress={() => onQuestPress(dailyQuest)}
        />
      </View>

      {/* Weekly Quest Card - Always visible */}
      <View style={styles.questCardWrapper}>
        <QuestCard
          type="weekly"
          title={weeklyQuest.title || "Weekly Quest"}
          description={weeklyQuest.description || "Complete your weekly challenge"}
          xpReward={weeklyQuest.xpReward}
          progress={weeklyQuest.progress}
          total={weeklyQuest.total || 1}
          additionalRewards={weeklyQuest.additionalRewards || []}
          completed={weeklyQuest.completed}
          onPress={() => onQuestPress(weeklyQuest)}
        />
      </View>

      {/* Bearer XP Status Section */}
      <View style={styles.questCardWrapper}>
        <TouchableOpacity
          onPress={() => _setShowXPModal(true)}
          activeOpacity={0.9}
        >
          <ImageBackground
            source={require("../../../assets/cards/bearer_status_card.png")}
            style={{
              width: '100%',
              aspectRatio: 390/150,
              padding: 0,
              justifyContent: 'center',
            }}
            resizeMode="contain"
          >
  
            {/* Level Display */}
            {/* Level Display */}
            <View style={{ position: 'absolute', top: 50, left: 104 }}>
              <Text style={{ fontFamily: theme.typography.fontFamily.bold, fontSize: 30, color: '#111' }}>{data.level}</Text>
            </View>
  
            {/* XP Progress Bar */}
            <View style={{ position: 'absolute', bottom: 28, left: 24, right: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                 <Text style={{ fontFamily: 'Courier', fontSize: 10, fontWeight: 'bold', color: '#111', opacity: 0.6 }}>XP PROGRESS</Text>
                 <Text style={{ fontFamily: 'Courier', fontSize: 10, fontWeight: 'bold', color: '#111', opacity: 0.6 }}>{Math.round(data.xpProgress * 100)}%</Text>
              </View>
              <View style={{ height: 6, width: '100%', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.round(data.xpProgress * 100)}%`, backgroundColor: '#111', borderRadius: 3 }} />
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      </View>

      {/* Grid Layout for Categories */}
      <View style={styles.questCardWrapper}>
        <View style={styles.gridRow}>
          {/* Stamps */}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => onCardPress("Stamps")}
            activeOpacity={0.8}
          >
            <ImageBackground
               source={require("../../../assets/cards/stamps_card.png")}
               style={{ width: '100%', aspectRatio: 186/110, padding: 0, justifyContent: 'center' }}
               resizeMode="contain"
            >
               <View style={{ padding: 16, width: '100%', height: '100%', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: theme.typography.fontFamily.bold, fontSize: 36, color: '#111', marginTop: 20 }}>{stampCount}</Text>
               </View>
            </ImageBackground>
          </TouchableOpacity>
  
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => onCardPress("Achievements")}
            activeOpacity={0.8}
          >
            <ImageBackground
               source={require("../../../assets/cards/awards_card.png")}
               style={{ width: '100%', aspectRatio: 186/110, padding: 0, justifyContent: 'center' }}
               resizeMode="contain"
            >
               <View style={{ padding: 16, width: '100%', height: '100%', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: theme.typography.fontFamily.bold, fontSize: 36, color: '#111', marginTop: 20 }}>{achievementCount}</Text>
               </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.questCardWrapper}>
        <View style={styles.gridRow}>
          {/* Lists */}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => onCardPress("Lists")}
            activeOpacity={0.8}
          >
            <ImageBackground
               source={require("../../../assets/cards/lists_card.png")}
               style={{ width: '100%', aspectRatio: 186/110, padding: 0, justifyContent: 'center' }}
               resizeMode="contain"
            >
               <View style={{ padding: 16, width: '100%', height: '100%', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: theme.typography.fontFamily.bold, fontSize: 36, color: '#111', marginTop: 20 }}>{listCount}</Text>
               </View>
            </ImageBackground>
          </TouchableOpacity>
  
          {/* Visas */}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => onCardPress("Visas")}
            activeOpacity={0.8}
          >
            <ImageBackground
               source={require("../../../assets/cards/visas_card.png")}
               style={{ width: '100%', aspectRatio: 186/110, padding: 0, justifyContent: 'center' }}
               resizeMode="contain"
            >
               <View style={{ padding: 16, width: '100%', height: '100%', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: theme.typography.fontFamily.bold, fontSize: 36, color: '#111', marginTop: 20 }}>{visaCount}</Text>
               </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>
      </View>

      {/* Past Jinks - Full Width */}
      <View style={styles.questCardWrapper}>
        <TouchableOpacity
          onPress={() => onCardPress("Past Jinks")}
          style={{ width: '100%' }}
          activeOpacity={0.8}
        >
            <ImageBackground
               source={require("../../../assets/cards/past_walks_card.png")}
               style={{ width: '100%', aspectRatio: 390/220, padding: 0}}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#ece9da" 
  },
  scrollContent: { 
    paddingHorizontal: 12, 
    paddingTop: 220, // Space for absolute header
    paddingBottom: 16,
    gap: 12,
  },
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
    gap: 12,
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
    gap: 12,
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
  orbSection: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    overflow: "visible",
  },
  questCardWrapper: {
    paddingHorizontal: 10, // Aligns solid card with visual width of image cards
  },
});
