import { StyleSheet, Text, View } from "react-native";

/**
 * XP Multiplier Indicator Component
 * Displays white text showing the current walk duration XP multiplier
 */
const XpBonusIndicator = ({ multiplier }) => {
  // Don't render if no multiplier bonus (1.0x)
  if (multiplier <= 1.0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{multiplier}x XP</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.2)", // Subtle background for contrast
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontSize: 16, // Much smaller
    fontWeight: "700",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default XpBonusIndicator;
