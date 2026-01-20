import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import React from "react";
import {
  Pressable,
  PressableStateCallbackType,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Path,
} from "react-native-svg";

type PausePillButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

const PausePillButton = ({ onPress, style }: PausePillButtonProps) => {
  const pressableStyle = ({
    pressed,
  }: PressableStateCallbackType): StyleProp<ViewStyle> => [
    styles.container,
    pressed ? styles.pressed : null,
    style,
  ];

  return (
    <Pressable onPress={onPress} style={pressableStyle} hitSlop={8}>
      <Svg
        width={116}
        height={48}
        viewBox="0 0 116 48"
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="pausePillGradient" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%" stopColor={theme.colors.white} stopOpacity={0.92} />
            <Stop offset="100%" stopColor={theme.colors.border} stopOpacity={0.96} />
          </LinearGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={116}
          height={48}
          rx={24}
          fill="url(#pausePillGradient)"
        />
        <Rect
          x={0.75}
          y={0.75}
          width={114.5}
          height={46.5}
          rx={23.25}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={1.5}
          fill="none"
        />
      </Svg>
      <View style={styles.content}>
        <Svg width={16} height={16} viewBox="0 0 16 16" style={styles.icon}>
          <Path
            d="M9.35 2.4 8.08 1.1 3.08 6.1a1.2 1.2 0 0 0 0 1.7l5 5 1.27-1.3L5.74 6.96l3.61-3.82Z"
            fill={theme.colors.text}
            fillOpacity={0.75}
          />
        </Svg>
        <Text style={styles.label}>Pause</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 116,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
    backgroundColor: "transparent",
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.94,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: theme.colors.text,
    textTransform: "uppercase",
  },
});

export default PausePillButton;
