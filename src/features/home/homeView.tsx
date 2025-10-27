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
import { useNavigation } from "@react-navigation/native";
import ArchetypeOrb from "@/components/ArchetypeOrb";
import AuraBreakdownModal from "@/components/modals/AuraBreakdownModal";
import XPDetailModal from "@/components/modals/XPDetailModal";
import XPGlassBadge from "@/components/passport/XPGlassBadge";
import QuestCard from "@/components/quests/QuestCard";
import QuestDetailModal from "@/components/quests/QuestDetailModal";
import { useOrbTransition } from "@/state/orbTransitionContext";
import type { HomeQuest } from "./useHomeData";
import { useHomeData } from "./useHomeData";

const ORB_SIZE = 360;

export function HomeView(): JSX.Element {
  const navigation = useNavigation<any>();
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

  useEffect(() => {
    if (dataState.status !== "ready") {
      return;
    }
    setOrbData(dataState.value.archetypeData);
  }, [dataState, setOrbData]);

  const { summaryLoading, summaryText, archetypeData, userData, quests, timers } =
    useMemo(() => {
      if (dataState.status !== "ready") {
        return {
          summaryLoading: false,
          summaryText: "",
          archetypeData: [],
          userData: { xp: 0, level: 1, xpForNextLevel: 100 },
          quests: { daily: null, weekly: null },
          timers: { daily: "", weekly: "" },
        };
      }

      const summaryTextValue =
        dataState.value.tasteSummary.text || dataState.value.tasteSummary.title || "";

      return {
        summaryLoading: dataState.value.summaryLoading,
        summaryText: summaryTextValue,
        archetypeData: dataState.value.archetypeData,
        userData: {
          xp: dataState.value.userXP,
          level: dataState.value.userLevel,
          xpForNextLevel: dataState.value.xpForNextLevel,
        },
        quests: {
          daily: dataState.value.quests.daily,
          weekly: dataState.value.quests.weekly,
        },
        timers: dataState.value.timers,
      };
    }, [dataState]);

  const handleQuestPress = useCallback((quest: HomeQuest | null) => {
    if (!quest) return;
    setSelectedQuest(quest);
    setQuestModalVisible(true);
  }, []);

  const handleStartQuest = useCallback(
    (screen: string) => {
      navigation.navigate(screen);
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
          {quests.daily && (
            <View style={styles.section}>
              <QuestCard
                type="daily"
                title={quests.daily.title ?? ""}
                description={quests.daily.description ?? ""}
                epReward={quests.daily.xpReward}
                xpReward={quests.daily.xpReward}
                additionalRewards={quests.daily.additionalRewards}
                progress={quests.daily.progress}
                total={quests.daily.total ?? 0}
                completed={quests.daily.completed}
                onPress={() => handleQuestPress(quests.daily)}
              />
            </View>
          )}

          {quests.weekly && (
            <View style={styles.section}>
              <QuestCard
                type="weekly"
                title={quests.weekly.title ?? ""}
                description={quests.weekly.description ?? ""}
                epReward={quests.weekly.xpReward}
                xpReward={quests.weekly.xpReward}
                additionalRewards={quests.weekly.additionalRewards}
                progress={quests.weekly.progress}
                total={quests.weekly.total ?? 0}
                completed={quests.weekly.completed}
                onPress={() => handleQuestPress(quests.weekly)}
              />
            </View>
          )}
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
    fontSize: 17,
    lineHeight: 24,
    color: "#1A1A1A",
    textAlign: "center",
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: {
    fontSize: 16,
    color: "#444",
  },
});
