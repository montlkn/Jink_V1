import React from "react";
import { Image, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import { SvgUri } from "react-native-svg";

type PassportEditButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
  accessibilityLabel?: string;
};

export function PassportEditButton({ onPress, style, tintColor = "#C62828", accessibilityLabel }: PassportEditButtonProps) {
  const iconSource = React.useMemo(() => {
    try {
      const resolved = Image.resolveAssetSource(require("../../../assets/icons/Edit_Pill.svg"));
      return resolved?.uri ?? null;
    } catch {
      return null;
    }
  }, []);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || "Edit"}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      {iconSource ? (
        <SvgUri uri={iconSource} width={80} height={80} />
      ) : (
        <View style={styles.fallback} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    left: -16,
    top: -16,
  },
  fallback: {
    width: 80,
    height: 80,
    backgroundColor: "#E5E5E5",
    borderRadius: 22,
  },
});
