import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { log } from "@/lib/log";
import { questsActions } from "./mutations";
import { useQuestsData } from "./useQuestsData";

export function QuestsView(): JSX.Element {
  const state = useQuestsData();

  const handleComplete = useCallback(
    async (questId: string) => {
      if (state.status !== "ready") {
        return;
      }

      try {
        await questsActions.complete({ userId: state.value.userId, questId });
        await state.refresh();
      } catch (error) {
        log.error("Failed to complete quest", error);
      }
    },
    [state]
  );

  if (state.status === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#666" />
        <Text style={styles.metaText}>Loading quests…</Text>
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Unable to load quests right now.</Text>
        <Button title="Try again" onPress={() => state.refresh().catch(() => null)} />
      </View>
    );
  }

  const { quests, xp } = state.value;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.heading}>Progress</Text>
        <Text style={styles.metric}>Level {xp.level}</Text>
        <Text style={styles.metaText}>
          {xp.xp} XP • Next level at {xp.xpForNextLevel} XP
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Active Quests</Text>
        {quests.items.length === 0 ? (
          <Text style={styles.metaText}>No active quests yet. Check back soon.</Text>
        ) : (
          quests.items.map((quest) => {
            const onCompletePress = () => {
              if (!quest.id) {
                return;
              }
              void handleComplete(quest.id);
            };

            return (
              <View key={`${quest.type}-${quest.id ?? "unknown"}`} style={styles.questCard}>
                <Text style={styles.questType}>{quest.type.toUpperCase()}</Text>
                <Text style={styles.questTitle}>{quest.title ?? "Untitled quest"}</Text>
                {quest.description ? (
                  <Text style={styles.questDescription}>{quest.description}</Text>
                ) : null}
                <Text style={styles.questMeta}>
                  {quest.progress} / {quest.total || 1} completed
                </Text>
                <Text style={styles.questMeta}>Reward {quest.xpReward} XP</Text>
                {quest.additionalRewards.length > 0 ? (
                  <View style={styles.rewardsRow}>
                    {quest.additionalRewards.map((reward, index) => (
                      <Text key={`${reward.label}-${index}`} style={styles.rewardChip}>
                        {reward.label}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {quest.completed ? (
                  <Text style={styles.completedLabel}>Completed</Text>
                ) : (
                  <Button title="Complete quest" onPress={onCompletePress} disabled={!quest.id} />
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 24,
  },
  section: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  metric: {
    fontSize: 32,
    fontWeight: "700",
    color: "#38BDF8",
  },
  metaText: {
    marginTop: 4,
    fontSize: 14,
    color: "#CBD5F5",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#F87171",
    marginBottom: 12,
    textAlign: "center",
  },
  questCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    gap: 6,
  },
  questType: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F1F5F9",
  },
  questDescription: {
    fontSize: 14,
    color: "#CBD5F5",
  },
  questMeta: {
    fontSize: 13,
    color: "#94A3B8",
  },
  rewardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  rewardChip: {
    fontSize: 12,
    color: "#38BDF8",
    backgroundColor: "#0F172A",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  completedLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#4ADE80",
  },
});
