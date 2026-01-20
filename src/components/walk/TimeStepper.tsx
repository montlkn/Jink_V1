import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, View } from "react-native";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";

type TimeStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  width?: number;
  height?: number;
  opacity?: any; // Animated.Value
};

// Button dimensions - new SVGs are 135x113 with 83x61 button inside
const BUTTON_WIDTH = 135;
const BUTTON_HEIGHT = 113;

// TimeButton component - handles SVG button rendering
const TimeButton = ({ iconPath, onPress }: { iconPath: any; onPress: () => void }) => {
  const iconSource = useMemo(() => {
    try {
      const resolved = Image.resolveAssetSource(iconPath);
      return resolved?.uri ?? null;
    } catch {
      return null;
    }
  }, [iconPath]);

  // Try loading SvgUri dynamically
  const [SvgUri, setSvgUri] = useState<any>(null);

  useEffect(() => {
    import('react-native-svg')
      .then(module => {
        setSvgUri(() => module.SvgUri);
      })
      .catch(() => {
        setSvgUri(null);
      });
  }, []);

  return (
    <Pressable onPress={onPress}>
      <View style={{ width: BUTTON_WIDTH, height: BUTTON_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
        {iconSource && SvgUri ? (
          <SvgUri uri={iconSource} width={BUTTON_WIDTH} height={BUTTON_HEIGHT} />
        ) : (
          <View style={{ width: 83, height: 61, backgroundColor: theme.colors.border, borderRadius: 30 }} />
        )}
      </View>
    </Pressable>
  );
};

export default function TimeStepper({
  value,
  onChange,
  min = 5,
  max = 95,
  step = 1,
  width = 83,
  height = 61,
  opacity,
}: TimeStepperProps) {
  const handleDecrement = useCallback(() => {
    if (value > min) {
      onChange(value - step);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [value, min, step, onChange]);

  const handleIncrement = useCallback(() => {
    if (value < max) {
      onChange(value + step);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [value, max, step, onChange]);

  return (
    <Animated.View style={[styles.container, opacity ? { opacity } : undefined]}>
      {/* Minus Button */}
      <TimeButton
        iconPath={require('../../../assets/icons/walk/Minus_Button.svg')}
        onPress={handleDecrement}
      />

      {/* Plus Button */}
      <TimeButton
        iconPath={require('../../../assets/icons/walk/Plus_Button.svg')}
        onPress={handleIncrement}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No absolute positioning needed, parent controls layout
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
    zIndex: 20,
  }
});
