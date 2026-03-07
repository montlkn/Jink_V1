/**
 * DirectionalGlow Component
 *
 * Hot/cold navigation indicator with:
 * - Kalman-filtered heading for smooth movement (no jitter)
 * - Subtle breathing animation (10-20% opacity only)
 * - Single smooth gradient (no visible concentric rings)
 * - Smooth color transitions between hot/cold states
 * - Enhanced proximity feedback with text hints
 * - Geofence arrival detection (30m triggers callback)
 * - Haptic feedback on state changes
 */

import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { AngularKalmanFilter } from '../../utils/KalmanFilter';

interface DirectionalGlowProps {
  targetBearing: number;
  userHeading: number;
  distanceMeters: number;
  isActive?: boolean;
  // Callback when user enters geofence (within 30m)
  onGeofenceEnter?: () => void;
  // Show text hints like "Getting warmer..."
  showHints?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GLOW_SIZE = 500;

// Color palette
const COLORS = {
  hot: theme.colors.error,      // Red - on track
  warm: theme.colors.warning,     // Orange - getting warm
  cool: theme.colors.info,     // Light blue - off track
  cold: theme.colors.secondary,     // Blue - way off track
  arrived: theme.colors.success,  // Green - arrived
};

// Geofence radius in meters
const GEOFENCE_RADIUS = 30;

export const DirectionalGlow: React.FC<DirectionalGlowProps> = ({
  targetBearing,
  userHeading,
  distanceMeters,
  isActive = true,
  onGeofenceEnter,
  showHints = true,
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
  const hintOpacity = useRef(new Animated.Value(0)).current;

  // Previous color for smooth transitions
  const [currentColor, setCurrentColor] = useState(COLORS.cold);
  const [hintText, setHintText] = useState<string | null>(null);

  // Track if we've entered the geofence (to avoid repeated callbacks)
  const hasEnteredGeofence = useRef(false);
  const lastHapticState = useRef<string>('cold');

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

  // Determine color and state based on alignment and distance
  const { targetColor, state } = useMemo(() => {
    if (distanceMeters < GEOFENCE_RADIUS) return { targetColor: COLORS.arrived, state: 'arrived' };
    if (distanceMeters < 50 && absAngleDiff < 30) return { targetColor: COLORS.hot, state: 'very_close' };
    if (absAngleDiff < 15) return { targetColor: COLORS.hot, state: 'hot' };
    if (absAngleDiff < 40) return { targetColor: COLORS.warm, state: 'warm' };
    if (absAngleDiff < 90) return { targetColor: COLORS.cool, state: 'cool' };
    return { targetColor: COLORS.cold, state: 'cold' };
  }, [absAngleDiff, distanceMeters]);

  // Geofence detection
  useEffect(() => {
    if (!isActive || !onGeofenceEnter) return;

    if (distanceMeters < GEOFENCE_RADIUS && !hasEnteredGeofence.current) {
      hasEnteredGeofence.current = true;
      // Strong haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onGeofenceEnter();
    } else if (distanceMeters > GEOFENCE_RADIUS * 1.5) {
      // Reset when user moves away
      hasEnteredGeofence.current = false;
    }
  }, [distanceMeters, isActive, onGeofenceEnter]);

  // Haptic feedback on state changes
  useEffect(() => {
    if (!isActive) return;

    const currentState = state;
    const prevState = lastHapticState.current;

    if (currentState !== prevState) {
      lastHapticState.current = currentState;

      // Provide haptic feedback on warming up
      if (currentState === 'arrived') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (currentState === 'very_close' && prevState !== 'arrived') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (currentState === 'hot' && (prevState === 'warm' || prevState === 'cool' || prevState === 'cold')) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (currentState === 'warm' && (prevState === 'cool' || prevState === 'cold')) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [state, isActive]);

  // Update hint text
  useEffect(() => {
    if (!showHints || !isActive) {
      setHintText(null);
      return;
    }

    let newHint: string | null = null;

    if (state === 'arrived') {
      newHint = "You've arrived! Scan to verify.";
    } else if (state === 'very_close') {
      newHint = "Almost there!";
    } else if (state === 'hot') {
      newHint = "You're on track!";
    } else if (state === 'warm') {
      newHint = "Getting warmer...";
    } else if (state === 'cool') {
      newHint = "Turn around...";
    } else {
      newHint = null; // No hint for cold
    }

    if (newHint !== hintText) {
      setHintText(newHint);

      // Animate hint in
      if (newHint) {
        Animated.sequence([
          Animated.timing(hintOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.delay(2000),
          Animated.timing(hintOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
      }
    }
  }, [state, showHints, isActive, hintText, hintOpacity]);

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

      {/* Text hint overlay */}
      {showHints && hintText && (
        <Animated.View style={[styles.hintContainer, { opacity: hintOpacity }]}>
          <View style={[styles.hintBubble, { backgroundColor: currentColor + 'E6' }]}>
            <Text style={styles.hintText}>{hintText}</Text>
          </View>
        </Animated.View>
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
  hintContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1001,
  },
  hintBubble: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default DirectionalGlow;
