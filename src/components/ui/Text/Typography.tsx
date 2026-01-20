import React from "react";
import { Text as RNText, TextProps as RNTextProps, TextStyle } from "react-native";
import { theme, TYPOGRAPHY } from "@/theme/tokens";

interface BaseTextProps extends RNTextProps {
  children: React.ReactNode;
  color?: string;
  align?: "left" | "center" | "right" | "justify";
}

interface HeadingProps extends BaseTextProps {
  level?: 1 | 2 | 3 | 4;
}

interface BodyProps extends BaseTextProps {
  size?: "small" | "body" | "medium" | "large";
  weight?: "regular" | "medium" | "semibold" | "bold";
}

interface LabelProps extends BaseTextProps {
  bold?: boolean;
  uppercase?: boolean;
}

/**
 * Heading component for titles and headers
 * Levels: 1 (hero), 2 (heading), 3 (title), 4 (large)
 */
export const Heading: React.FC<HeadingProps> = ({
  level = 1,
  children,
  color = theme.colors.text,
  align = "left",
  style,
  ...props
}) => {
  const getFontSize = () => {
    switch (level) {
      case 1:
        return theme.typography.fontSize.xxl; // 32
      case 2:
        return theme.typography.fontSize.xl; // 24
      case 3:
        return theme.typography.fontSize.lg; // 18
      case 4:
        return theme.typography.fontSize.base; // 16
      default:
        return theme.typography.fontSize.xl;
    }
  };

  const headingStyle: TextStyle = {
    fontSize: getFontSize(),
    fontWeight: "bold",
    color,
    textAlign: align,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: level === 1 ? theme.typography.letterSpacing.widest : theme.typography.letterSpacing.normal,
  };

  return (
    <RNText style={[headingStyle, style]} {...props}>
      {children}
    </RNText>
  );
};

/**
 * Body component for regular text content
 * Sizes: small (10), body (12), medium (14), large (16)
 */
export const Body: React.FC<BodyProps> = ({
  size = "body",
  weight = "regular",
  children,
  color = theme.colors.text,
  align = "left",
  style,
  ...props
}) => {
  const getFontSize = () => {
    switch (size) {
      case "small":
        return theme.typography.fontSize.xs; // 10
      case "body":
        return theme.typography.fontSize.sm; // 12
      case "medium":
        return theme.typography.fontSize.md; // 14
      case "large":
        return theme.typography.fontSize.base; // 16
      default:
        return theme.typography.fontSize.sm;
    }
  };

  const getFontWeight = () => {
    switch (weight) {
      case "regular":
        return TYPOGRAPHY.weights.regular;
      case "medium":
        return TYPOGRAPHY.weights.medium;
      case "semibold":
        return TYPOGRAPHY.weights.semibold;
      case "bold":
        return TYPOGRAPHY.weights.bold;
      default:
        return TYPOGRAPHY.weights.regular;
    }
  };

  const bodyStyle: TextStyle = {
    fontSize: getFontSize(),
    fontWeight: getFontWeight(),
    color,
    textAlign: align,
    fontFamily: theme.typography.fontFamily.regular,
  };

  return (
    <RNText style={[bodyStyle, style]} {...props}>
      {children}
    </RNText>
  );
};

/**
 * Label component for labels, captions, and small UI text
 * Default: bold, uppercase
 */
export const Label: React.FC<LabelProps> = ({
  bold = true,
  uppercase = true,
  children,
  color = theme.colors.muted,
  align = "left",
  style,
  ...props
}) => {
  const labelStyle: TextStyle = {
    fontSize: theme.typography.fontSize.xs, // 10
    fontWeight: bold ? "bold" : "normal",
    color,
    textAlign: align,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: uppercase ? "uppercase" : "none",
    fontFamily: bold ? theme.typography.fontFamily.bold : theme.typography.fontFamily.regular,
  };

  return (
    <RNText style={[labelStyle, style]} {...props}>
      {children}
    </RNText>
  );
};

/**
 * Mono component for monospace text (code, technical displays)
 */
export const Mono: React.FC<BaseTextProps> = ({
  children,
  color = theme.colors.text,
  align = "left",
  style,
  ...props
}) => {
  const monoStyle: TextStyle = {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.monospace,
    color,
    textAlign: align,
  };

  return (
    <RNText style={[monoStyle, style]} {...props}>
      {children}
    </RNText>
  );
};
