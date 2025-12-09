import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface TactileViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: "light" | "dark" | "default" | "extraLight" | "regular" | "prominent";
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * A container that provides a "Tactile" / "Matte" frosted effect.
 * Uses BlurView on iOS and a translucent fallback on Android.
 */
export const TactileView: React.FC<TactileViewProps> = ({
  children,
  style,
  intensity = 30,
  tint = "light",
  contentContainerStyle,
}) => {
  const isAndroid = Platform.OS === "android";

  if (isAndroid) {
    return (
      <View style={[styles.androidContainer, style]}>
        <View style={[styles.contentContainer, contentContainerStyle]}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.iosContainer, style]}>
       <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
       <View style={[styles.contentContainer, contentContainerStyle]}>
         {children}
       </View>
    </View>
  );
};

const styles = StyleSheet.create({
  iosContainer: {
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1.5,
  },
  androidContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderWidth: 1.5,
    elevation: 4,
  },
  contentContainer: {
    flex: 1,
    zIndex: 1,
  },
});
