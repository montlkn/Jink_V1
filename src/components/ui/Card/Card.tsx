import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { theme, SPACING, SHADOWS, BORDER_RADIUS, BORDERS } from "@/theme/tokens";

type CardVariant = "default" | "flat" | "elevated" | "outlined";
type BorderSide = "left" | "top" | "all" | "none";

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  borderSide?: BorderSide;
  borderColor?: string;
  borderWidth?: number;
  padding?: keyof typeof SPACING;
  style?: StyleProp<ViewStyle>;
}

/**
 * Unified Card component with consistent styling
 *
 * Variants:
 * - default: White background with subtle shadow
 * - flat: White background, no shadow
 * - elevated: White background with prominent shadow
 * - outlined: Transparent background with border
 *
 * Border sides: left, top, all, none
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  borderSide = "none",
  borderColor,
  borderWidth,
  padding = "base",
  style,
}) => {
  const getBorderStyle = (): ViewStyle => {
    const color = borderColor || theme.colors.border;
    const width = borderWidth !== undefined ? borderWidth : BORDERS.medium;

    switch (borderSide) {
      case "left":
        return { borderLeftWidth: width, borderLeftColor: color };
      case "top":
        return { borderTopWidth: width, borderTopColor: color };
      case "all":
        return { borderWidth: width, borderColor: color };
      case "none":
      default:
        return {};
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "elevated":
        return { ...SHADOWS.medium, backgroundColor: theme.colors.surface };
      case "outlined":
        return {
          backgroundColor: "transparent",
          borderWidth: BORDERS.thin,
          borderColor: theme.colors.border,
        };
      case "flat":
        return { backgroundColor: theme.colors.surface };
      case "default":
      default:
        return { ...SHADOWS.small, backgroundColor: theme.colors.surface };
    }
  };

  const containerStyles: ViewStyle = {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[padding],
    ...getVariantStyle(),
    ...getBorderStyle(),
  };

  return <View style={[styles.card, containerStyles, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
});
