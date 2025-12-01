import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, View } from "react-native";

type TimeStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  buttonSize?: number;
  opacity?: any; // Animated.Value
};

// TimeButton component - handles SVG button rendering
const TimeButton = ({ iconPath, onPress, size = 64 }: { iconPath: any; onPress: () => void; size?: number }) => {
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

  // SVG is 100x100 in the source file, so calculate scale
  const scale = size / 60;

  return (
    <Pressable onPress={onPress} style={{ opacity: 0.5 }}>
      <View style={{ width: size, height: size, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
        {iconSource && SvgUri ? (
          <View style={{ transform: [{ scale }] }}>
            <SvgUri uri={iconSource} width={100} height={100} />
          </View>
        ) : (
          <View style={{ width: size, height: size, backgroundColor: '#E5E5E5', borderRadius: size / 2 }} />
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
  buttonSize = 64,
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
    <>
      {/* Minus Button */}
      <Animated.View style={[styles.minusButton, opacity ? { opacity } : undefined]}>
        <TimeButton
          iconPath={require('../../../assets/icons/Minus_Button.svg')}
          onPress={handleDecrement}
          size={buttonSize}
        />
      </Animated.View>

      {/* Plus Button */}
      <Animated.View style={[styles.plusButton, opacity ? { opacity } : undefined]}>
        <TimeButton
          iconPath={require('../../../assets/icons/Plus_Button.svg')}
          onPress={handleIncrement}
          size={buttonSize}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  minusButton: {
    position: "absolute",
    left: 80,
    top: 20,
    alignSelf: "center",
  },
  plusButton: {
    position: "absolute",
    right: 80,
    top: 20,
    alignSelf: "center",
  },
});
