import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { TactileView } from "./TactileView";

interface TactileButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  scaleTo?: number;
  disabled?: boolean;
}

/**
 * A pressable Tactile element with scale animation and haptics.
 */
export const TactileButton: React.FC<TactileButtonProps> = ({
  children,
  onPress,
  style,
  intensity = 30,
  scaleTo = 0.95,
  disabled = false,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, {
      toValue: scaleTo,
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
    if (onPress) {
      onPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <Animated.View style={[{ transform: [{ scale }] }]}>
        <TactileView style={[styles.container, style]} intensity={intensity}>
           <View style={styles.center}>
             {children}
           </View>
        </TactileView>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  }
});
