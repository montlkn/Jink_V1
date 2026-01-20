import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { useMemo } from "react";
import { Image, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { SvgUri } from "react-native-svg";

type ModalCloseButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared close button for modals using the Back_Pill.svg icon
 */
export function ModalCloseButton({ onPress, style }: ModalCloseButtonProps) {
  const iconSource = useMemo(() => {
    try {
      const resolved = Image.resolveAssetSource(require("../../../assets/icons/Close_Pill.svg"));
      return resolved?.uri ?? null;
    } catch {
      return null;
    }
  }, []);



  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={1.0}
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      {iconSource ? (
        <SvgUri uri={iconSource} width={64} height={64} />
      ) : (
        <View style={styles.fallback} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: {
    width: 64,
    height: 64,
    backgroundColor: theme.colors.border,
    borderRadius: 22,
  },
});

export default ModalCloseButton;
