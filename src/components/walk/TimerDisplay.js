import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";

const clampValue = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 0;
  return Math.max(0, Math.min(99, Math.round(numeric)));
};

const formatValue = (value, minDigits) =>
  clampValue(value).toString().padStart(minDigits, "0");

const AnimatedTimeDisplay = ({ value, minDigits, size, duration }) => {
  const animated = useRef(new Animated.Value(1)).current;
  const [displayValue, setDisplayValue] = useState(clampValue(value));

  useEffect(() => {
    const next = clampValue(value);
    if (next === displayValue) return;

    setDisplayValue(next);
    animated.stopAnimation();
    animated.setValue(0);

    Animated.timing(animated, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [value, displayValue, duration, animated]);

  const formatted = formatValue(displayValue, minDigits);
  const scale = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [1.15, 1],
  });
  const opacity = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 1],
  });
  const containerStyle = {
    minHeight: size * 1.25,
    minWidth: size * (minDigits + 1),
    paddingHorizontal: size * 0.1,
  };
  const textStyle = {
    fontSize: size,
    lineHeight: size * 1.1,
    letterSpacing: Math.max(2, Math.round(size * 0.06)),
  };

  return (
    <View style={[styles.stack, containerStyle]}>
      <Animated.Text
        style={[
          styles.valueText,
          textStyle,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        {formatted}
      </Animated.Text>
    </View>
  );
};

const TimerDisplay = ({
  value = 0,
  minDigits = 2,
  size = 56,
  duration = 320,
  label,
  style,
}) => {
  const wrapperStyle = {
    minWidth: size * (minDigits + 1),
    paddingHorizontal: Math.max(12, size * 0.2),
  };

  return (
    <View style={[styles.wrapper, wrapperStyle, style]}>
      <AnimatedTimeDisplay
        value={value}
        minDigits={minDigits}
        size={size}
        duration={duration}
      />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    margin: 16,
  },
  stack: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  valueText: {
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: theme.colors.muted,
    fontWeight: "600",
  },
});

export default TimerDisplay;
