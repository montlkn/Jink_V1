/**
 * DirectionalGlow Component
 *
 * Hot/cold navigation indicator with:
 * - Kalman-filtered heading for smooth movement (no jitter)
 * - Subtle breathing animation (10-20% opacity only)
 * - Single smooth gradient (no visible concentric rings)
 * - Smooth color transitions between hot/cold states
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { AngularKalmanFilter } from '../../utils/KalmanFilter';

interface DirectionalGlowProps {
  targetBearing: number;
  userHeading: number;
  distanceMeters: number;
  isActive?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GLOW_SIZE = 500;

// Color palette
const COLORS = {
  hot: '#FF3B30',      // Red - on track
  warm: '#FF9500',     // Orange - getting warm
  cool: '#5AC8FA',     // Light blue - off track
  cold: '#007AFF',     // Blue - way off track
  arrived: '#34C759',  // Green - arrived
};

export const DirectionalGlow: React.FC<DirectionalGlowProps> = ({
  targetBearing,
  userHeading,
  distanceMeters,
  isActive = true,
}) => {
  // Kalman filters for smooth heading/bearing transitions
  const headingFilterRef = useRef(new AngularKalmanFilter(0.05, 2.0, userHeading));
  const bearingFilterRef = useRef(new AngularKalmanFilter(0.05, 2.0, targetBearing));
  
  // Smoothed values
  const [smoothHeading, setSmoothHeading] = useState(userHeading);
  const [smoothBearing, setSmoothBearing] = useState(targetBearing);
  
  // Animation values
  const breathOpacity = useRef(new Animated.Value(0.15)).current;
  const positionX = useRef(new Animated.Value(0)).current;
  const positionY = useRef(new Animated.Value(0)).current;
  
  // Previous color for smooth transitions
  const [currentColor, setCurrentColor] = useState(COLORS.cold);

  // Apply Kalman filtering to heading
  useEffect(() => {
    const filtered = headingFilterRef.current.updateAngle(userHeading);
    setSmoothHeading(filtered);
  }, [userHeading]);

  // Apply Kalman filtering to bearing
  useEffect(() => {
    const filtered = bearingFilterRef.current.updateAngle(targetBearing);
    setSmoothBearing(filtered);
  }, [targetBearing]);

  // Calculate smoothed angle difference
  const angleDiff = useMemo(() => {
    let diff = smoothBearing - smoothHeading;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
  }, [smoothBearing, smoothHeading]);

  const absAngleDiff = Math.abs(angleDiff);

  // Determine color based on alignment (with smooth transitions)
  const targetColor = useMemo(() => {
    if (distanceMeters < 30) return COLORS.arrived;
    if (absAngleDiff < 15) return COLORS.hot;
    if (absAngleDiff < 40) return COLORS.warm;
    if (absAngleDiff < 90) return COLORS.cool;
    return COLORS.cold;
  }, [absAngleDiff, distanceMeters]);

  // Animate color changes
  useEffect(() => {
    if (targetColor !== currentColor) {
      setCurrentColor(targetColor);
    }
  }, [targetColor, currentColor]);

  // Calculate glow position with smooth animation
  const glowPosition = useMemo(() => {
    if (absAngleDiff < 90) {
      // Target is ahead - place glow at top
      const horizontalShift = (angleDiff / 90) * (SCREEN_WIDTH * 0.4);
      return {
        x: SCREEN_WIDTH / 2 + horizontalShift - GLOW_SIZE / 2,
        y: -GLOW_SIZE / 2.5,
      };
    } else {
      // Target is behind - place glow at sides
      if (angleDiff > 0) {
        // Right side
        const verticalShift = ((angleDiff - 90) / 90) * (SCREEN_HEIGHT * 0.3);
        return {
          x: SCREEN_WIDTH - GLOW_SIZE / 4,
          y: SCREEN_HEIGHT * 0.2 + verticalShift,
        };
      } else {
        // Left side
        const verticalShift = ((-angleDiff - 90) / 90) * (SCREEN_HEIGHT * 0.3);
        return {
          x: -GLOW_SIZE * 0.75,
          y: SCREEN_HEIGHT * 0.2 + verticalShift,
        };
      }
    }
  }, [angleDiff, absAngleDiff]);

  // Animate position smoothly
  useEffect(() => {
    Animated.parallel([
      Animated.timing(positionX, {
        toValue: glowPosition.x,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(positionY, {
        toValue: glowPosition.y,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [glowPosition, positionX, positionY]);

  // Subtle breathing animation (10-20% opacity only)
  useEffect(() => {
    if (!isActive) {
      breathOpacity.setValue(0);
      return;
    }

    // Fade in gently
    Animated.timing(breathOpacity, {
      toValue: 0.15,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Slower, more subtle breathing cycle (3.5 seconds)
    const breathDuration = 3500;
    const breathAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathOpacity, {
          toValue: 0.20, // Max 20% opacity
          duration: breathDuration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathOpacity, {
          toValue: 0.10, // Min 10% opacity
          duration: breathDuration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    breathAnim.start();

    return () => breathAnim.stop();
  }, [isActive, breathOpacity]);

  if (!isActive) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Single smooth glow - no visible rings */}
      <Animated.View
        style={[
          styles.glowOrb,
          {
            width: GLOW_SIZE,
            height: GLOW_SIZE,
            borderRadius: GLOW_SIZE / 2,
            opacity: breathOpacity,
            transform: [
              { translateX: positionX },
              { translateY: positionY },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[
            currentColor + '80', // 50% at center
            currentColor + '40', // 25% 
            currentColor + '15', // 8%
            currentColor + '08', // 3%
            'transparent',
          ]}
          locations={[0, 0.3, 0.5, 0.7, 1]}
          style={[styles.gradient, { borderRadius: GLOW_SIZE / 2 }]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Very subtle screen tint when on track - using nested View for opacity */}
      {absAngleDiff < 25 && distanceMeters > 30 && (
        <View
          style={[
            styles.screenTint,
            {
              backgroundColor: currentColor,
              opacity: 0.03, // Very subtle 3% tint
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
  },
  gradient: {
    flex: 1,
  },
  screenTint: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
});

export default DirectionalGlow;
