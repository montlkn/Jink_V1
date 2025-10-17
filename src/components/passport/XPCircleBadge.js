import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const XPCircleBadge = ({ currentXP = 1250, level = 5, xpForNextLevel = 2000, onPress }) => {
  const [scale] = useState(new Animated.Value(1));
  const progressPercent = (currentXP / xpForNextLevel) * 100;

  // Circle SVG properties
  const size = 70;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

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

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={handlePress} style={styles.container}>
        {/* SVG Progress Circle */}
        <Svg width={size} height={size} style={styles.svg}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E0E0E0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#FFD700"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.centerContent}>
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
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 35,
    margin: 5,
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 1,
  },
});

export default XPCircleBadge;
