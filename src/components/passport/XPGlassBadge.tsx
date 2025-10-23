import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import XPGlassOrb from '../three/orb/XPGlassOrb';

type Props = {
  currentXP: number;
  level: number;
  xpForNextLevel: number;
  onPress?: () => void;
};

const XPGlassBadge = ({ currentXP = 1250, level = 5, xpForNextLevel = 2000, onPress }: Props) => {
  const [scale] = useState(new Animated.Value(1));
  const progressPercent = (currentXP / xpForNextLevel);

  const handlePress = () => {
    // Trigger haptic feedback immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Call onPress after short delay for animation feedback
    setTimeout(() => {
      if (onPress) onPress();
    }, 150);

    // Play animation feedback
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }),
    ]).start();
  };

  const size = 70;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        style={styles.container}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {/* 3D Glass Orb with gyro and rainbow highlights */}
        <View style={styles.orbContainer} pointerEvents="none">
          <XPGlassOrb
            size={size}
            level={level}
            progress={progressPercent}
          />
        </View>

        {/* Center content overlay - Level text and star */}
        <View style={styles.centerContent} pointerEvents="none">
          <Ionicons name="star" size={18} color="#FFD700" />
          <Text style={styles.levelText}>{level}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 70,
    height: 70,
    position: 'relative',
  },
  orbContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 70,
    height: 70,
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none', // Allow touches to pass through to the orb
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 1,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
});

export default XPGlassBadge;
