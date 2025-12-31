import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface TactileViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: "light" | "dark" | "default" | "extraLight" | "regular" | "prominent";
  contentContainerStyle?: StyleProp<ViewStyle>;
  variant?: "raised" | "inset"; // NEW: Controls embossed direction
}

/**
 * A container that provides a "Tactile" effect.
 * - "raised" = traditional blur/frosted (default)
 * - "inset" = embossed/recessed into the surface (pressed in)
 */
export const TactileView: React.FC<TactileViewProps> = ({
  children,
  style,
  intensity = 20,
  tint = "light",
  contentContainerStyle,
  variant = "inset", // Default to inset for embossed look
}) => {
  const isAndroid = Platform.OS === "android";
  const isInset = variant === "inset";

  // Inset style uses inner shadow simulation with borders
  const insetStyles = isInset ? styles.insetContainer : styles.raisedContainer;

  if (isAndroid) {
    return (
      <View style={[insetStyles, styles.androidBase, style]}>
        <View style={[styles.contentContainer, contentContainerStyle]}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={[insetStyles, styles.iosBase, style]}>
       {!isInset && (
         <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
       )}
       <View style={[styles.contentContainer, contentContainerStyle]}>
         {children}
       </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Base styles shared across platforms
  iosBase: {
    overflow: "hidden",
  },
  androidBase: {
    overflow: "hidden",
  },
  
  // Raised: Traditional frosted glass (light on top, shadow below)
  raisedContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderTopColor: "rgba(255, 255, 255, 0.4)",
    borderLeftColor: "rgba(255, 255, 255, 0.3)",
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    borderRightColor: "rgba(0, 0, 0, 0.08)",
    borderWidth: 1.5,
  },
  
  // Inset: Embossed DOWN into the surface (shadow on top, light on bottom)
  insetContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.06)", // Slightly darker = recessed
    borderTopColor: "rgba(0, 0, 0, 0.15)", // Shadow on top edge
    borderLeftColor: "rgba(0, 0, 0, 0.1)", // Shadow on left edge
    borderBottomColor: "rgba(255, 255, 255, 0.5)", // Light on bottom edge
    borderRightColor: "rgba(255, 255, 255, 0.35)", // Light on right edge
    borderWidth: 1.5,
  },
  
  contentContainer: {
    flex: 1,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
