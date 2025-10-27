import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useWalksData } from "./useWalksData";

const formatDateTime = (iso: string | undefined) => {
  if (!iso) {
    return "Unknown";
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDistance = (distanceKm: number | undefined) => {
  if (!Number.isFinite(distanceKm)) {
    return "—";
  }
  return `${distanceKm.toFixed(1)} km`;
};

export function WalksView(): JSX.Element {
  const walksState = useWalksData();

  const handleRefresh = useCallback(() => {
    void walksState.refresh({ force: true }).catch((error) => {
      console.error("[walks] Refresh failed", error);
    });
  }, [walksState]);

  if (walksState.status === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.meta}>Loading walks…</Text>
      </View>
    );
  }

  if (walksState.status === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Unable to load your walks.</Text>
        <Text style={styles.meta}>Check your connection and try again.</Text>
        <Pressable onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const { summaries, selectedWalk, selectedWalkId, isSelecting } = walksState.value;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Recent Walks</Text>
        <Pressable onPress={handleRefresh} style={styles.refreshLink}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {summaries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.meta}>No walks yet. Start a jink to build history.</Text>
        </View>
      ) : (
        summaries.map((summary) => {
          const isActive = summary.id === selectedWalkId;
          return (
            <Pressable
              key={summary.id}
              onPress={() => {
                if (summary.id) {
                  void walksState.select(summary.id).catch((error) => {
                    console.error("[walks] Select walk failed", error);
                  });
                }
              }}
              style={[styles.summaryCard, isActive && styles.summaryCardActive]}
            >
              <View style={styles.summaryHeader}>
                <Text style={[styles.summaryTitle, isActive && styles.summaryTitleActive]}>
                  {summary.borough ?? "Untitled Walk"}
                </Text>
                <Text style={styles.summaryDistance}>{formatDistance(summary.distanceKm)}</Text>
              </View>
              <Text style={styles.summaryMeta}>{formatDateTime(summary.startedAt)}</Text>
            </Pressable>
          );
        })
      )}

      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>Selected walk</Text>
          {isSelecting ? <ActivityIndicator size="small" color="#38BDF8" /> : null}
        </View>
        {selectedWalk ? (
          <>
            <Text style={styles.detailMeta}>Walk ID: {selectedWalk.walkId}</Text>
            <Text style={styles.detailMeta}>Route points: {selectedWalk.route?.length ?? 0}</Text>
            <Text style={styles.detailMeta}>
              Buildings: {selectedWalk.buildings?.length ?? 0}
            </Text>
          </>
        ) : (
          <Text style={styles.meta}>Select a walk to preview its geometry.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  refreshLink: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#38BDF8",
  },
  refreshButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#0F172A",
  },
  refreshButtonText: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
  meta: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#EF4444",
    textAlign: "center",
  },
  emptyState: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  summaryCardActive: {
    borderColor: "#38BDF8",
    backgroundColor: "rgba(56, 189, 248, 0.08)",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  summaryTitleActive: {
    color: "#0F172A",
  },
  summaryDistance: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  summaryMeta: {
    fontSize: 13,
    color: "#64748B",
  },
  detailCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CBD5F5",
    backgroundColor: "#0F172A",
    gap: 6,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E2E8F0",
  },
  detailMeta: {
    fontSize: 13,
    color: "#94A3B8",
  },
});

export default WalksView;
