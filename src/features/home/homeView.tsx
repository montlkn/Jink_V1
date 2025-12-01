import StreakCard from "@/components/cards/StreakCard";
import AuraBreakdownModal, {
    type AuraSegment,
} from "@/components/modals/AuraBreakdownModal";
import XPDetailModal from "@/components/modals/XPDetailModal";
import XPGlassBadge from "@/components/passport/XPGlassBadge";
import QuestCard from "@/components/quests/QuestCard";
import QuestDetailModal from "@/components/quests/QuestDetailModal";
import { getArchetypeColorSafe } from "@/constants/archetypeColors";
import { DEFAULT_TASTE_ACTION } from "@/features/home/tasteActions";
import ArchetypeOrb from "@/features/orb/ArchetypeOrb";
import { screens, type RootParams } from "@/navigation/routes";
import HomeTasteLine from "@/screens/HomeView/HomeTasteLine";
import { useOrbTransition } from "@/state/orbTransitionContext";
import { DESIGNER_REPUBLIC_THEME } from "@/theme/designer_republic";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import type { HomeQuest } from "./homeSelectors";
import { useHomeData } from "./useHomeData";

const ORB_SIZE = 360;



type HomeNavigation = NativeStackNavigationProp<RootParams, typeof screens.Home>;

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

function HomeSkeleton() {
  return (
    <View style={styles.container}>
      <View style={{ marginTop: 60, alignItems: 'center' }}>
        <SkeletonBlock style={{ width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2 }} />
      </View>
      <View style={{ marginTop: 24, marginHorizontal: 20 }}>
        <SkeletonBlock style={{ height: 80, borderRadius: 16 }} />
      </View>
      <View style={{ marginTop: 12, marginHorizontal: 20 }}>
        <SkeletonBlock style={{ height: 120, marginBottom: 16 }} />
        <SkeletonBlock style={{ height: 120, marginBottom: 12 }} />
        <SkeletonBlock style={{ height: 120, marginBottom: 12 }} />
      </View>
    </View>
  );
}

export function HomeView(): JSX.Element {
  const navigation = useNavigation<HomeNavigation>();
  const dataState = useHomeData();
  const [xpModalVisible, setXpModalVisible] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<HomeQuest | null>(null);
  const [questModalVisible, setQuestModalVisible] = useState(false);
  const [auraModalVisible, setAuraModalVisible] = useState(false);

  const {
    registerHomeOrbLayout,
    setOrbData,
    transitionProgress,
    isTransitioning,
  } = useOrbTransition();
  const orbContainerRef = useRef<any>(null);

  const isReady = dataState.status === "ready";
  const readyValue = isReady ? dataState.value : null;
  const readyArchetypes = readyValue?.archetypeData ?? null;

  useEffect(() => {
    if (!isReady) {
      return;
    }
    setOrbData(Array.isArray(readyArchetypes) ? readyArchetypes : []);
  }, [isReady, readyArchetypes, setOrbData]);

  const {
    archetypeData,
    userData,
    timers,
    questCollection,
    tasteAction,
    streakCount,
  } = useMemo(() => {
    if (!readyValue) {
      return {
        summaryLoading: false,
        archetypeData: [],
        userData: { xp: 0, level: 1, xpForNextLevel: 100 },
        timers: { daily: "", weekly: "" },
        questCollection: null,
        tasteAction: DEFAULT_TASTE_ACTION,
        streakCount: 0,
      };
    }

    return {
      summaryLoading: readyValue.summaryLoading,
      archetypeData: readyValue.archetypeData,
      userData: {
        xp: readyValue.userXP,
        level: readyValue.userLevel,
        xpForNextLevel: readyValue.xpForNextLevel,
      },
      timers: readyValue.timers,
      questCollection: readyValue.quests,
        tasteAction:
          readyValue.tasteAction &&
          typeof readyValue.tasteAction.headline === "string" &&
          readyValue.tasteAction.headline.trim().length > 0
            ? readyValue.tasteAction
            : DEFAULT_TASTE_ACTION,
      streakCount: readyValue.streakCount ?? 0,
    };
  }, [readyValue]);

  const questItems = useMemo<HomeQuest[]>(() => {
    if (!questCollection?.items?.length) {
      return [];
    }

    return questCollection.items.map((quest) => ({
      id: quest.id,
      type: quest.type,
      questType: quest.questType,
      title: quest.title,
      description: quest.description,
      xpReward: quest.xpReward,
      additionalRewards: quest.additionalRewards,
      progress: quest.progress,
      total: quest.total || 1,
      completed: quest.completed,
    }));
  }, [questCollection]);

  const fallbackQuests = useMemo<HomeQuest[]>(() => {
    const placeholders: HomeQuest[] = [
      {
        id: "daily-placeholder",
        type: "daily",
        questType: "placeholder",
        title: "SYNC REQUIRED",
        description: "CALIBRATE YOUR PROFILE TO RECEIVE DAILY OBJECTIVES.",
        xpReward: 0,
        additionalRewards: [] as HomeQuest["additionalRewards"],
        progress: 0,
        total: 1,
        completed: false,
      },
      {
        id: "weekly-placeholder",
        type: "weekly",
        questType: "placeholder",
        title: "WEEKLY EXPEDITION LOCKED",
        description: "COMPLETE A DAILY STREAK TO UNLOCK WEEKLY CHALLENGES.",
        xpReward: 0,
        additionalRewards: [] as HomeQuest["additionalRewards"],
        progress: 0,
        total: 1,
        completed: false,
      },
    ];
    return placeholders;
  }, []);

  const questsToRender: HomeQuest[] = questItems.length ? questItems : fallbackQuests;

  const auraSegments = useMemo<AuraSegment[]>(() => {
    if (!Array.isArray(archetypeData)) return [];
    return archetypeData.map((segment) => {
      const rawName = segment?.name ?? segment?.archetype ?? "";
      const name = typeof rawName === "string" ? rawName : String(rawName ?? "");
      const rawScore = segment?.score;
      const score = typeof rawScore === "number" && Number.isFinite(rawScore) ? rawScore : 0;
      const rawPercentage = segment?.percentage;
      const percentage =
        typeof rawPercentage === "number" && Number.isFinite(rawPercentage)
          ? rawPercentage
          : score;
      const colorCandidate = segment?.color;
      const color =
        typeof colorCandidate === "string" && colorCandidate.trim().length > 0
          ? colorCandidate
          : getArchetypeColorSafe(name);

      return {
        name,
        percentage,
        score,
        color,
      } as AuraSegment;
    });
  }, [archetypeData]);

  const handleQuestPress = (quest: HomeQuest | null) => {
    if (!quest) {
      return;
    }
    setSelectedQuest(quest);
    setQuestModalVisible(true);
  };

  const handleStartQuest = useCallback(
    (params?: RootParams[typeof screens.Quests]) => {
      navigation.navigate(screens.Quests, params);
    },
    [navigation]
  );

  const handleOrbLayout = useCallback(() => {
    if (!orbContainerRef.current) return;
    const node =
      typeof (orbContainerRef.current as any).measureInWindow === "function"
        ? orbContainerRef.current
        : (orbContainerRef.current as any).getNode?.();
    if (!node || typeof node.measureInWindow !== "function") {
      return;
    }
    node.measureInWindow((x: number, y: number, width: number, height: number) => {
      registerHomeOrbLayout({ x, y, width, height });
    });
  }, [registerHomeOrbLayout]);

  const handleHandleOrbPress = useCallback(() => {
    setAuraModalVisible(true);
  }, []);

  const contentFade = useMemo(
    () =>
      transitionProgress.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [1, 0.35, 0],
        extrapolate: "clamp",
      }),
    [transitionProgress]
  );

  const orbOpacity = isTransitioning ? 0 : 1;
  const questTimeRemaining = useMemo(() => {
    if (!selectedQuest) {
      return "";
    }
    return selectedQuest.type === "daily" ? timers.daily : timers.weekly;
  }, [selectedQuest, timers.daily, timers.weekly]);
  if (dataState.status === "loading") {
    return <HomeSkeleton />;
  }

  if (dataState.status === "error") {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Unable to load your home experience.</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.xpBadgeContainer, { opacity: contentFade }]}>
          <XPGlassBadge
            currentXP={userData.xp}
            level={userData.level}
            xpForNextLevel={userData.xpForNextLevel}
            onPress={() => setXpModalVisible(true)}
          />
        </Animated.View>

        <Animated.View
          ref={orbContainerRef}
          onLayout={handleOrbLayout}
          style={[styles.orbSection, { opacity: orbOpacity }]}
        >
          <View style={styles.orbWrapper}>
            <ArchetypeOrb
              archetypeData={archetypeData}
              xpLevel={userData.level}
              xpProgress={
                userData.xpForNextLevel > 0
                  ? userData.xp / userData.xpForNextLevel
                  : 0
              }
              size={ORB_SIZE}
              onPress={handleHandleOrbPress}
              interactive
              lod="standard"
            />
          </View>
        </Animated.View>

        <Animated.View style={[styles.summaryContainer, { opacity: contentFade }]}>

          <HomeTasteLine action={tasteAction} />
        </Animated.View>

        <Animated.View style={{ opacity: contentFade }}>
          <View style={styles.section}>
            {/* Streak Card */}
            <View style={styles.streakCardWrapper}>
              <StreakCard streakCount={streakCount} />
            </View>

            {/* Quest Cards */}
            {questsToRender.map((quest) => (
              <View key={`${quest.type}-${quest.id ?? "unknown"}`} style={styles.questCardWrapper}>
                <QuestCard
                  type={quest.type}
                  title={quest.title ?? ""}
                  description={quest.description ?? ""}
                  epReward={quest.xpReward}
                  xpReward={quest.xpReward}
                  progress={quest.progress}
                  total={quest.total || 1}
                  additionalRewards={quest.additionalRewards}
                  completed={quest.completed}
                  onPress={() => handleQuestPress(quest)}
                />
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <XPDetailModal
        visible={xpModalVisible}
        onClose={() => setXpModalVisible(false)}
        currentXP={userData.xp}
        level={userData.level}
        xpForNextLevel={userData.xpForNextLevel}
      />

      <QuestDetailModal
        visible={questModalVisible}
        onClose={() => setQuestModalVisible(false)}
        quest={selectedQuest}
        onStartQuest={handleStartQuest}
        timeRemaining={questTimeRemaining}
      />

      <AuraBreakdownModal
        visible={auraModalVisible}
        segments={auraSegments}
        onClose={() => setAuraModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DESIGNER_REPUBLIC_THEME.colors.background },
  scrollContent: { paddingBottom: 100, paddingTop: 60 },
  xpBadgeContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
  },
  orbSection: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    // No shadow here - the orb glow provides the effect
    // Critical: allow glow to extend beyond bounds
    overflow: "visible",
  },
  orbWrapper: {
    // Let ArchetypeOrb handle its own sizing (includes glow)
    alignItems: "center",
    justifyContent: "center",
    // Critical: no overflow hidden - glow needs to extend
    overflow: "visible",
  },
  summaryContainer: {
    marginTop: 24,
    marginHorizontal: 20,
    // Allow HomeTasteLine glow to extend
    overflow: "visible",
  },
  summaryLoadingText: {
    fontSize: 15,
    lineHeight: 20,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  section: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  streakCardWrapper: {
    marginBottom: 16,
  },
  questCardWrapper: {
    marginBottom: 12,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: {
    fontSize: 16,
    color: "#444",
  },
  skeletonBlock: {
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
  },
});
