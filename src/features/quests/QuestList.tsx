import React from "react";
import { ActivityIndicator, Button, StyleSheet, Text, View } from "react-native";
import QuestCard from "@/components/quests/QuestCard";
import type { QuestItem } from "./selectors";
import { questsActions } from "./mutations";
import { useQuestsData } from "./useQuestsData";

type QuestListProps = {
  userId?: string;
  initialQuests?: { items: QuestItem[] } | null;
  onQuestPress?: (quest: QuestItem) => void;
  showCompleteAction?: boolean;
};

export function QuestList({
  userId,
  initialQuests,
  onQuestPress,
  showCompleteAction = false,
}: QuestListProps): JSX.Element | null {
  const state = useQuestsData(userId);

  const renderQuestItems = (questItems: QuestItem[], onComplete?: (quest: QuestItem) => void | Promise<void>) => (
    <View style={styles.container}>
      {questItems.map((quest) => {
        const canComplete = Boolean(onComplete) && Boolean(quest.id) && !quest.completed && showCompleteAction;
        return (
          <View key={`${quest.type}-${quest.id ?? "unknown"}`} style={styles.cardWrapper}>
            <QuestCard
              type={quest.type}
              title={quest.title ?? ""}
              description={quest.description ?? ""}
              epReward={quest.xpReward}
              xpReward={quest.xpReward}
              progress={quest.progress}
              total={quest.total || 1}
              completed={quest.completed}
              additionalRewards={quest.additionalRewards}
              onPress={onQuestPress ? () => onQuestPress(quest) : undefined}
            />
            {showCompleteAction && !quest.completed ? (
              <View style={styles.completeButtonWrapper}>
                <Button
                  title="Complete quest"
                  onPress={() => {
                    if (!canComplete || !onComplete) {
                      return;
                    }
                    void onComplete(quest);
                  }}
                  disabled={!canComplete}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  if (state.status === "loading") {
    const fallbackItems = (initialQuests?.items ?? []) as QuestItem[];
    if (fallbackItems.length) {
      return renderQuestItems(fallbackItems);
    }
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#888" />
        <Text style={styles.loadingText}>Loading quests…</Text>
      </View>
    );
  }

  if (state.status === "error") {
    const fallbackItems = (initialQuests?.items ?? []) as QuestItem[];
    if (fallbackItems.length) {
      return renderQuestItems(fallbackItems);
    }
    return null;
  }

  const { quests, userId: resolvedUserId } = state.value;

  if (!quests.items.length) {
    const fallbackItems = (initialQuests?.items ?? []) as QuestItem[];
    if (fallbackItems.length) {
      return renderQuestItems(fallbackItems);
    }
    return null;
  }

  const handleComplete = showCompleteAction && resolvedUserId
    ? async (quest: QuestItem) => {
        if (!quest.id) {
          return;
        }

        try {
          await questsActions.complete({
            userId: resolvedUserId,
            questId: quest.id,
          });
          await state.refresh();
        } catch (error) {
          console.error("Failed to complete quest from QuestList", error);
        }
      }
    : undefined;

  return renderQuestItems(quests.items, handleComplete);
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  loadingText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  cardWrapper: {
    gap: 8,
  },
  completeButtonWrapper: {
    alignSelf: "flex-start",
  },
});
