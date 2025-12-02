import React from "react";
import { Image, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import { SvgUri } from "react-native-svg";

type PassportEditButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
  accessibilityLabel?: string;
};

/**
 * Edit button for passport screens.
 * SVG is 104x96 (wider pill shape) with visual pill at (26,26) size 52x44.
 * Container is 52x44 positioned at top-right, with SVG offset to show the pill correctly.
 * Shows Edit_Pill.svg when enabled, Edit_Pill_Disabled.svg when disabled.
 */
export function PassportEditButton({ onPress, disabled = false, style, tintColor = "#C62828", accessibilityLabel }: PassportEditButtonProps) {
  const iconSource = React.useMemo(() => {
    try {
      const iconPath = disabled 
        ? require("../../../assets/icons/Edit_Pill_Disabled.svg")
        : require("../../../assets/icons/Edit_Pill.svg");
      const resolved = Image.resolveAssetSource(iconPath);
      return resolved?.uri ?? null;
    } catch {
      return null;
    }
  }, [disabled]);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || "Edit"}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <View style={styles.svgWrapper}>
        {iconSource ? (
          <SvgUri uri={iconSource} width={104} height={96} style={styles.svg} />
        ) : (
          <View style={styles.fallback} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 52,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  svgWrapper: {
    width: 104,
    height: 96,
    position: "absolute",
    left: -26,
    top: -26,
  },
  svg: {
    // SVG renders at its native size
  },
  fallback: {
    width: 52,
    height: 44,
    backgroundColor: "#E5E5E5",
    borderRadius: 22,
  },
});

export default PassportEditButton;
