import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

type InlineFlipCardProps = {
  isOpen: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
  style?: ViewStyle;
};

export function InlineFlipCard({ isOpen, front, back, style }: InlineFlipCardProps): JSX.Element {
  const rotateY = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      // Flip to back (180deg)
      rotateY.value = withTiming(180, { duration: 500 });
    } else {
      // Flip to front (0deg)
      rotateY.value = withTiming(0, { duration: 500 });
    }
  }, [isOpen, rotateY]);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(rotateY.value, [0, 180], [0, 180]);
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateValue}deg` },
      ],
      zIndex: rotateY.value <= 90 ? 2 : 0,
      backfaceVisibility: 'hidden',
      position: rotateY.value <= 90 ? 'relative' : 'absolute',
      opacity: rotateY.value <= 90 ? 1 : 0,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(rotateY.value, [0, 180], [180, 360]);
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateValue}deg` },
      ],
      zIndex: rotateY.value > 90 ? 2 : 0,
      backfaceVisibility: 'hidden',
      position: rotateY.value > 90 ? 'relative' : 'absolute',
      opacity: rotateY.value > 90 ? 1 : 0,
    };
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.face, frontAnimatedStyle]}>
        {front}
      </Animated.View>
      <Animated.View style={[styles.face, backAnimatedStyle]}>
        {back}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Container doesn't enforce height, it adapts to the relative child
  },
  face: {
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
});

export default InlineFlipCard;
