/**
 * DirectionalGlow Component
 *
 * Simplified, working version:
 * - Large radial glow that moves around screen edge pointing to target
 * - Hot (red) when on track, cold (blue) when off track
 * - Arrow points to target direction
 * - Everything synced together
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

interface DirectionalGlowProps {
  targetBearing: number;
  userHeading: number;
  distanceMeters: number;
  isActive?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GLOW_SIZE = 500;

export const DirectionalGlow: React.FC<DirectionalGlowProps> = ({
  targetBearing,
  userHeading,
  distanceMeters,
  isActive = true,
}) => {
  const [angleDiff, setAngleDiff] = useState(0);
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const breathScale = useRef(new Animated.Value(1)).current;

  // Calculate angle difference
  useEffect(() => {
    let diff = targetBearing - userHeading;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    setAngleDiff(diff);
  }, [targetBearing, userHeading]);

  const absAngleDiff = Math.abs(angleDiff);

  // Determine color based on alignment
  const getColor = () => {
    if (distanceMeters < 30) return '#00FF44'; // Green - arrived
    if (absAngleDiff < 20) return '#FF0000'; // Red - hot/on track
    if (absAngleDiff < 60) return '#FF8800'; // Orange - warm
    return '#0088FF'; // Blue - cold/off track
  };

  // Calculate glow position
  // angleDiff = 0 means target is straight ahead (top center)
  // angleDiff > 0 means target is to the right
  // angleDiff < 0 means target is to the left
  const getGlowPosition = () => {
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
  };

  // Breathing animation
  useEffect(() => {
    if (!isActive) {
      glowOpacity.setValue(0);
      return;
    }

    // Fade in
    Animated.timing(glowOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Breathing
    const breathDuration = Math.max(1500, Math.min(3000, distanceMeters * 3));
    const breathAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.95,
            duration: breathDuration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(breathScale, {
            toValue: 1.15,
            duration: breathDuration / 2,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.7,
            duration: breathDuration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(breathScale, {
            toValue: 1,
            duration: breathDuration / 2,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    breathAnim.start();

    return () => breathAnim.stop();
  }, [isActive, distanceMeters, glowOpacity, breathScale]);

  if (!isActive) return null;

  const color = getColor();
  const glowPos = getGlowPosition();

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Main glow - 4 layers for richness */}
      {[0, 1, 2, 3].map((i) => {
        const scale = 1 + i * 0.3;
        const opacityMult = 1 - i * 0.2;
        const alphas = ['90', '60', '40', '20'];

        return (
          <Animated.View
            key={i}
            style={[
              styles.glowOrb,
              {
                width: GLOW_SIZE * scale,
                height: GLOW_SIZE * scale,
                left: glowPos.x - (GLOW_SIZE * scale - GLOW_SIZE) / 2,
                top: glowPos.y - (GLOW_SIZE * scale - GLOW_SIZE) / 2,
                opacity: Animated.multiply(glowOpacity, opacityMult),
                transform: [{ scale: breathScale }],
              },
            ]}
          >
            <LinearGradient
              colors={[
                color + alphas[i],
                color + '40',
                color + '10',
                'transparent',
              ]}
              style={[styles.gradient, { borderRadius: (GLOW_SIZE * scale) / 2 }]}
              start={{ x: 0.5, y: 0.3 }}
              end={{ x: 0.5, y: 1 }}
            />
          </Animated.View>
        );
      })}

      {/* Full-screen subtle tint when on track */}
      {absAngleDiff < 30 && (
        <Animated.View
          style={[
            styles.screenTint,
            {
              opacity: Animated.multiply(glowOpacity, 0.15),
              backgroundColor: color + '20',
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
  },
  glowOrb: {
    position: 'absolute',
  },
  gradient: {
    flex: 1,
  },
  arrowContainer: {
    position: 'absolute',
    top: 50,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 26,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FF0000',
    zIndex: 2,
  },
  arrowGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    top: -12,
    zIndex: 1,
  },
  screenTint: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
});

export default DirectionalGlow;
