import { useMemo } from "react";
import { Image, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { SvgUri } from "react-native-svg";


type PassportInfoButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

type SecurityPatternProps = {
  width: number;
  height: number;
  color?: string;
  opacity?: number;
};

/**
 * Shared "More Info" pill button used across passport sub-screens.
 */
export function SecurityPattern({ width, height, color = "#000", opacity = 0.6 }: SecurityPatternProps) {
  // This is a placeholder for the actual SecurityPattern implementation
  // For now, it just renders a simple colored rectangle
  return (
    <View style={{ width, height, backgroundColor: color, opacity }} />
  );
}

export function PassportInfoButton({ onPress, style, accessibilityLabel }: PassportInfoButtonProps) {
  const iconSource = useMemo(() => {
    try {
      const resolved = Image.resolveAssetSource(require("../../../assets/icons/More_Info_Button2.svg"));
      return resolved?.uri ?? null;
    } catch {
      return null;
    }
  }, []);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? "More information"}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      {iconSource ? (
        <SvgUri uri={iconSource} width={44} height={44} />
      ) : (
        <View style={styles.fallback}>
          <View style={styles.fallbackDot} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  fallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1F2937",
  },
});

export default PassportInfoButton;
