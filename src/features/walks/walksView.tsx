import { log } from "@/lib/log";
import { useCallback } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { APP_COLORS } from "@/constants/appColors";

import { useWalksData } from "@/hooks/useWalksData";

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
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) {
    return "—";
  }
  const feet = distanceKm * 3280.84;
  
  // Show in feet for distances under 0.5 miles (2640 feet)
  if (feet < 2640) {
    return `${Math.round(feet)} ft`;
  }
  
  // Otherwise show in miles for longer distances
  const miles = distanceKm * 0.621371;
  return `${miles.toFixed(1)} mi`;
};

export function WalksView(): JSX.Element {
  const walksState = useWalksData();

  const handleRefresh = useCallback(() => {
    void walksState.refresh({ force: true }).catch((error) => {
      log.error("[walks] Refresh failed", error);
    });
  }, [walksState]);

  if (walksState.status === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
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
                    log.error("[walks] Select walk failed", error);
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
          {isSelecting ? <ActivityIndicator size="small" color={theme.colors.secondary} /> : null}
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
    color: theme.colors.text,
  },
  refreshLink: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.secondary,
  },
  refreshButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.text,
  },
  refreshButtonText: {
    color: theme.colors.white,
    fontWeight: "600",
  },
  meta: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_COLORS.error,
    textAlign: "center",
  },
  emptyState: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
    gap: 6,
  },
  summaryCardActive: {
    borderColor: theme.colors.secondary,
    backgroundColor: theme.colors.secondary + '14',
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  summaryTitleActive: {
    color: theme.colors.text,
  },
  summaryDistance: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  summaryMeta: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  detailCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.text,
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
    color: theme.colors.white,
  },
  detailMeta: {
    fontSize: 13,
    color: theme.colors.white + 'B3',
  },
});

export default WalksView;
