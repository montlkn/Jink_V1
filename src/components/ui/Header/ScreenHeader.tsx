import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { theme, SPACING } from "@/theme/tokens";

type HeaderVariant = "standard" | "passport" | "modal" | "transparent";

interface ScreenHeaderProps {
  title: string;
  variant?: HeaderVariant;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitle?: string;
  showBorder?: boolean;
}

/**
 * Unified ScreenHeader component with consistent styling
 *
 * Variants:
 * - standard: Regular screen header with border
 * - passport: Three-part layout for passport screens (44px left/right slots)
 * - modal: Modal header with different padding
 * - transparent: No background, no border
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  variant = "standard",
  leftAction,
  rightAction,
  style,
  titleStyle,
  subtitle,
  showBorder = true,
}) => {
  const containerStyles = [
    styles.container,
    variant === "passport" && styles.passportContainer,
    variant === "modal" && styles.modalContainer,
    variant === "transparent" && styles.transparentContainer,
    showBorder && variant !== "transparent" && styles.withBorder,
    style,
  ];

  const titleStyles = [
    styles.title,
    variant === "passport" && styles.passportTitle,
    variant === "modal" && styles.modalTitle,
    titleStyle,
  ];

  return (
    <View style={containerStyles}>
      {/* Left Action */}
      <View style={[styles.leftSlot, variant === "passport" && styles.passportSlot]}>
        {leftAction}
      </View>

      {/* Center Content */}
      <View style={styles.centerSlot}>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <Text style={titleStyles} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Right Action */}
      <View style={[styles.rightSlot, variant === "passport" && styles.passportSlot]}>
        {rightAction}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
    paddingBottom: SPACING.md,
    backgroundColor: theme.colors.surface,
  },
  passportContainer: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
    paddingBottom: SPACING.md,
  },
  modalContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.base,
  },
  transparentContainer: {
    backgroundColor: "transparent",
  },
  withBorder: {
    borderBottomWidth: theme.layout.borderWidth.thin,
    borderBottomColor: theme.colors.border,
  },
  leftSlot: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  passportSlot: {
    width: 44,
  },
  centerSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.sm,
  },
  rightSlot: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  title: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 1,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily.bold,
  },
  passportTitle: {
    fontSize: theme.typography.fontSize.base,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    letterSpacing: theme.typography.letterSpacing.wide,
    textTransform: "uppercase",
    marginBottom: 4,
  },
});
