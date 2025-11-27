import { useMemo } from "react";
import { Image, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { SvgUri } from "react-native-svg";

type PassportLogoutButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function PassportLogoutButton({ onPress, style, accessibilityLabel }: PassportLogoutButtonProps) {
  const iconSource = useMemo(() => {
    try {
      const resolved = Image.resolveAssetSource(require("../../../assets/icons/Log_Out_Pill.svg"));
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
      accessibilityLabel={accessibilityLabel || "Log Out"}
    >
      {iconSource ? (
        <View style={styles.svgContainer}>
          <SvgUri uri={iconSource} width="100%" height="100%" />
        </View>
      ) : (
        <View style={styles.fallback} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 90,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: -8,
  },
  svgContainer: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.0 }], // Zoom in on the SVG content
  },
  fallback: {
    width: 140,
    height: 70,
    backgroundColor: "#ccc",
    borderRadius: 35,
  },
});

export default PassportLogoutButton;
