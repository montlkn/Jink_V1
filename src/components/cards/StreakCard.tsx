import { ELEMENT_COLORS } from "@/constants/elementColors";
import { getStreakMultiplier } from "@/theme/designConstants";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type StreakCardProps = {
  streakCount: number;
};

export function StreakCard({ streakCount }: StreakCardProps): JSX.Element {
  const streakInfo = getStreakMultiplier(streakCount);

  return (
    <View style={styles.dataBlock}>
      <View style={styles.blockHeader}>
        <View style={styles.badge}>
          <Text style={styles.blockLabel}>STREAK METRICS</Text>
        </View>
        <Ionicons name="flame" size={12} color="#FFFFFF" />
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusValue}>
          {streakCount} DAY{streakCount !== 1 ? "S" : ""}
        </Text>
        <Text style={styles.multiplierText}>
          {streakInfo.multiplier} MULTIPLIER
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dataBlock: {
    backgroundColor: ELEMENT_COLORS.streak.card,
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: ELEMENT_COLORS.streak.card,
  },
  blockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#FFFFFF",
  },
  blockLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: ELEMENT_COLORS.streak.card,
    letterSpacing: 1,
    textTransform: "uppercase",
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
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  multiplierText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});

export default StreakCard;
