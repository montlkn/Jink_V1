import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

type FilterOption = {
  label: string;
  value: boolean;
};

type FilterMenuProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: FilterOption[];
  selectedValue: boolean;
  onSelect: (value: boolean) => void;
};

export function FilterMenu({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
}: FilterMenuProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      scale.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.cubic) });
      opacity.value = withTiming(0, { duration: 100 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleSelect = useCallback(
    (value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(value);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.menuContainer, animatedStyle]}>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.divider} />

              {options.map((option, index) => (
                <View key={option.label}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && styles.menuItemPressed,
                      option.value === selectedValue && styles.menuItemActive,
                    ]}
                    onPress={() => handleSelect(option.value)}
                  >
                    <Text
                      style={[
                        styles.menuItemText,
                        option.value === selectedValue &&
                          styles.menuItemTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {option.value === selectedValue && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </Pressable>
                  {index < options.length - 1 && (
                    <View style={styles.itemDivider} />
                  )}
                </View>
              ))}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60, // Position at the filter button
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    minWidth: 280,
    maxWidth: 320,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 12,
    textTransform: "uppercase",
    fontFamily: theme.typography.fontFamily.bold,
  },
  divider: {
    height: 2,
    backgroundColor: theme.colors.accent,
    marginBottom: 12,
    alignSelf: "center",
    width: 40,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderRadius: 8,
  },
  menuItemPressed: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  menuItemActive: {
    backgroundColor: `${theme.colors.accent}15`,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    flex: 1,
  },
  menuItemTextActive: {
    color: theme.colors.accent,
    fontWeight: "700",
  },
  itemDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 8,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.accent,
    marginLeft: 8,
  },
});
