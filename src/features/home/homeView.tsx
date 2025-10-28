import ArchetypeOrb from "@/features/orb/ArchetypeOrb";
import AuraBreakdownModal from "@/components/modals/AuraBreakdownModal";
import XPDetailModal from "@/components/modals/XPDetailModal";
import XPGlassBadge from "@/components/passport/XPGlassBadge";
import QuestDetailModal from "@/components/quests/QuestDetailModal";
import QuestCard from "@/components/quests/QuestCard";
import type { HomeQuest } from "./homeSelectors";
import { useOrbTransition } from "@/state/orbTransitionContext";
import { screens, type RootParams } from "@/navigation/routes";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useHomeData } from "./useHomeData";

const ORB_SIZE = 360;

type HomeNavigation = NativeStackNavigationProp<RootParams, typeof screens.Home>;
export function HomeView(): JSX.Element {
  const navigation = useNavigation<HomeNavigation>();
  const dataState = useHomeData();
  const [auraVisible, setAuraVisible] = useState(false);
  const [xpModalVisible, setXpModalVisible] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<HomeQuest | null>(null);
  const [questModalVisible, setQuestModalVisible] = useState(false);

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

  const { summaryLoading, summaryText, archetypeData, userData, timers, questCollection } = useMemo(() => {
    if (!readyValue) {
      return {
        summaryLoading: false,
        summaryText: "",
        archetypeData: [],
        userData: { xp: 0, level: 1, xpForNextLevel: 100 },
        timers: { daily: "", weekly: "" },
        questCollection: null,
      };
    }

    const summaryTextValue =
      readyValue.tasteSummary.text || readyValue.tasteSummary.title || "";

    return {
      summaryLoading: readyValue.summaryLoading,
      summaryText: summaryTextValue,
      archetypeData: readyValue.archetypeData,
      userData: {
        xp: readyValue.userXP,
        level: readyValue.userLevel,
        xpForNextLevel: readyValue.xpForNextLevel,
      },
      timers: readyValue.timers,
      questCollection: readyValue.quests,
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
        title: "Sync up for today's quest",
        description: "We'll drop a fresh daily objective once your profile is calibrated.",
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
        title: "Weekly expedition incoming",
        description: "Stick around—weekly quests unlock after your first daily streak.",
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
    setAuraVisible(true);
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
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#999" />
      </SafeAreaView>
    );
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

        {(summaryLoading || summaryText) && (
          <Animated.View style={[styles.summaryContainer, { opacity: contentFade }]}>
            {summaryLoading ? (
              <Text style={styles.summaryLoadingText}>Calibrating your recent focus…</Text>
            ) : (
              <Text style={styles.summaryText}>{summaryText}</Text>
            )}
          </Animated.View>
        )}

        <Animated.View style={{ opacity: contentFade }}>
          <View style={styles.section}>
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

      <AuraBreakdownModal
        visible={auraVisible}
        onClose={() => setAuraVisible(false)}
        segments={archetypeData}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8F8" },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 24,
  },
  orbWrapper: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(8, 12, 20, 0)",
  },
  summaryContainer: {
    marginTop: 24,
    marginHorizontal: 32,
    maxWidth: 340,
    alignSelf: "center",
  },
  summaryText: {
    fontSize: 15,
    fontStyle: "italic",
    lineHeight: 24,
    color: "#1A1A1A",
    textAlign: "justify",
    fontWeight: "500",
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
  questCardWrapper: {
    marginBottom: 12,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: {
    fontSize: 16,
    color: "#444",
  },
});
