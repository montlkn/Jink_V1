import { StyleSheet, Text, View } from "react-native";

/**
 * XP Multiplier Indicator Component
 * Displays white text showing the current walk duration XP multiplier
 */
const XpBonusIndicator = ({ multiplier, color }) => {
  // Don't render if no multiplier bonus (1.0x)
  if (multiplier <= 1.0) {
    return null;
  }

  return (
    <View style={[styles.container, color && { backgroundColor: color }]}>
      <Text style={styles.text}>{multiplier}x XP</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2196F3", // Default blue
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

export default XpBonusIndicator;
