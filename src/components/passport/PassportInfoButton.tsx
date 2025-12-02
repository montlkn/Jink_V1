import { useMemo } from "react";
import { Image, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { SvgUri } from "react-native-svg";


type PassportInfoButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Info (?) button for passport screens.
 * SVG is 96x96 with visual pill at (26,26) size 44x44.
 * Container is 44x44 positioned at top-right, with SVG offset to show the pill correctly.
 */
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
      <View style={styles.svgWrapper}>
        {iconSource ? (
          <SvgUri uri={iconSource} width={96} height={96} style={styles.svg} />
        ) : (
          <View style={styles.fallback}>
            <View style={styles.fallbackDot} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  svgWrapper: {
    width: 96,
    height: 96,
    position: "absolute",
    left: -26,
    top: -26,
  },
  svg: {
    // SVG renders at its native size
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
