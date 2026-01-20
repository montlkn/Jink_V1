import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from "react-native";
import { theme, BUTTON_SIZES, SHADOWS } from "@/theme/tokens";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "pill";
type ButtonSize = "small" | "medium" | "large";

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  backgroundColor?: string; // Allow custom background color override
}

/**
 * Unified Button component with consistent styling and behavior
 *
 * Variants:
 * - primary: Solid background with primary color
 * - secondary: Solid background with secondary color
 * - outline: Transparent background with border
 * - ghost: Transparent background, no border
 * - pill: Primary color with fully rounded corners
 *
 * Sizes: small, medium, large (from BUTTON_SIZES)
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  backgroundColor,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const sizeConfig = BUTTON_SIZES[size === "small" || size === "large" ? size : "medium"];

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 100,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePress = () => {
    if (onPress && !disabled) {
      onPress();
    }
  };

  // Determine background color based on variant
  const getBackgroundColor = () => {
    if (backgroundColor) return backgroundColor;
    if (disabled) return theme.colors.muted;

    switch (variant) {
      case "primary":
        return theme.colors.primary;
      case "secondary":
        return theme.colors.secondary;
      case "pill":
        return theme.colors.primary;
      case "outline":
      case "ghost":
        return "transparent";
      default:
        return theme.colors.primary;
    }
  };

  // Determine text color based on variant
  const getTextColor = () => {
    if (disabled) return theme.colors.white;

    switch (variant) {
      case "primary":
      case "secondary":
      case "pill":
        return theme.colors.white;
      case "outline":
        return theme.colors.primary;
      case "ghost":
        return theme.colors.text;
      default:
        return theme.colors.white;
    }
  };

  // Determine border style
  const getBorderStyle = () => {
    if (variant === "outline") {
      return {
        borderWidth: theme.layout.borderWidth.medium,
        borderColor: disabled ? theme.colors.muted : theme.colors.primary,
      };
    }
    return {};
  };

  const buttonStyles: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    height: sizeConfig.height,
    paddingHorizontal: sizeConfig.paddingHorizontal,
    paddingVertical: sizeConfig.paddingVertical,
    borderRadius: variant === "pill" ? BUTTON_SIZES.pill.borderRadius : sizeConfig.borderRadius,
    width: fullWidth ? "100%" : undefined,
    ...getBorderStyle(),
    ...(variant === "primary" || variant === "secondary" ? SHADOWS.small : {}),
  };

  const buttonTextStyles: TextStyle = {
    color: getTextColor(),
    fontSize: sizeConfig.fontSize,
    fontWeight: "600",
    letterSpacing: 0.5,
    textAlign: "center",
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{ opacity: disabled ? 0.6 : 1, width: fullWidth ? "100%" : undefined }}
    >
      <Animated.View style={[styles.button, buttonStyles, { transform: [{ scale }] }, style]}>
        {typeof children === "string" ? (
          <Text style={[buttonTextStyles, textStyle]}>{children}</Text>
        ) : (
          children
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
});
