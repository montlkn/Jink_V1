import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type TimeStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  style?: any;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function TimeStepper({
  value,
  onChange,
  min = 5,
  max = 90,
  step = 1,
  style,
}: TimeStepperProps) {
  const leftScale = useSharedValue(1);
  const rightScale = useSharedValue(1);

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    if (newValue !== value) {
      onChange(newValue);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      leftScale.value = withSpring(1, { damping: 8, stiffness: 400 });
    }
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    if (newValue !== value) {
      onChange(newValue);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      rightScale.value = withSpring(1, { damping: 8, stiffness: 400 });
    }
  };

  const leftPressIn = () => {
    leftScale.value = withTiming(0.85, { duration: 100 });
  };

  const leftPressOut = () => {
    leftScale.value = withSpring(1, { damping: 8, stiffness: 400 });
  };

  const rightPressIn = () => {
    rightScale.value = withTiming(0.85, { duration: 100 });
  };

  const rightPressOut = () => {
    rightScale.value = withSpring(1, { damping: 8, stiffness: 400 });
  };

  const leftAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: leftScale.value }],
  }));

  const rightAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rightScale.value }],
  }));

  const isAtMin = value <= min;
  const isAtMax = value >= max;

  return (
    <View style={[styles.container, style]}>
      <AnimatedPressable
        onPress={handleDecrement}
        onPressIn={leftPressIn}
        onPressOut={leftPressOut}
        disabled={isAtMin}
        style={[
          styles.button,
          styles.leftButton,
          leftAnimatedStyle,
          isAtMin && styles.buttonDisabled,
        ]}
        hitSlop={8}
      >
        <Text style={[styles.buttonText, isAtMin && styles.buttonTextDisabled]}>
          −
        </Text>
      </AnimatedPressable>

      <View style={styles.divider} />

      <AnimatedPressable
        onPress={handleIncrement}
        onPressIn={rightPressIn}
        onPressOut={rightPressOut}
        disabled={isAtMax}
        style={[
          styles.button,
          styles.rightButton,
          rightAnimatedStyle,
          isAtMax && styles.buttonDisabled,
        ]}
        hitSlop={8}
      >
        <Text style={[styles.buttonText, isAtMax && styles.buttonTextDisabled]}>
          +
        </Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    opacity: 0.3,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56,
  },
  leftButton: {
    borderTopLeftRadius: 23,
    borderBottomLeftRadius: 23,
  },
  rightButton: {
    borderTopRightRadius: 23,
    borderBottomRightRadius: 23,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#111",
    lineHeight: 24,
  },
  buttonTextDisabled: {
    color: "#999",
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "#E0E0E0",
  },
});
