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

type InfoMenuProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
};

export function InfoMenu({ visible, onClose, title, content }: InfoMenuProps) {
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
              <Text style={styles.content}>{content}</Text>
              
              <Pressable
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
                onPress={handleClose}
              >
                <Text style={styles.closeButtonText}>GOT IT</Text>
              </Pressable>
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
    paddingTop: 60, // Position at the info button
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    minWidth: 280,
    maxWidth: 320,
    padding: 20,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 12,
    fontFamily: theme.typography.fontFamily.bold,
  },
  divider: {
    height: 2,
    backgroundColor: theme.colors.accent,
    marginBottom: 16,
    alignSelf: "center",
    width: 40,
  },
  content: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonPressed: {
    opacity: 0.8,
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.colors.background,
    letterSpacing: 1.5,
  },
});
