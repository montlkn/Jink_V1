/**
 * RadarMiniMap Component
 *
 * Video game style HUD element for spatial orientation:
 * - Small circular radar (corner of screen)
 * - Red dot = target building direction
 * - Your heading indicator (like a compass rose)
 * - Faint dots for other nearby buildings
 * - Pulses when you're close
 * - NOT a street map, just spatial orientation
 *
 * Bridges the gap between "no map" and "totally lost."
 */

import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { APP_COLORS } from '@/constants/appColors';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface RadarMiniMapProps {
  // Current user location
  userLat: number;
  userLng: number;
  // User's heading (compass direction they're facing)
  userHeading: number;
  // Target building location
  targetLat?: number;
  targetLng?: number;
  // Optional: other nearby buildings for faint dots
  nearbyBuildings?: Array<{ lat: number; lng: number; name?: string }>;
  // Distance to target in meters
  distanceToTarget?: number;
  // Size of the radar
  size?: number;
  // Is navigation active?
  isActive?: boolean;
}

// Calculate bearing from point A to point B (in degrees, 0-360)
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

// Calculate distance between two points (in km)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const RadarMiniMap: React.FC<RadarMiniMapProps> = ({
  userLat,
  userLng,
  userHeading,
  targetLat,
  targetLng,
  nearbyBuildings = [],
  distanceToTarget,
  size = 100,
  isActive = true,
}) => {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation when close to target
  useEffect(() => {
    if (!isActive) {
      pulseAnim.setValue(1);
      return;
    }

    const isClose = distanceToTarget !== undefined && distanceToTarget < 50; // 50m

    if (isClose) {
      // Fast pulse when close
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive, distanceToTarget, pulseAnim]);

  // Radar scan line animation
  useEffect(() => {
    if (!isActive) return;

    const scanAnimation = Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    scanAnimation.start();

    return () => scanAnimation.stop();
  }, [isActive, scanLineAnim]);

  // Calculate target position on radar
  const targetPosition = useMemo(() => {
    if (targetLat === undefined || targetLng === undefined) return null;

    // Calculate bearing to target
    const bearing = calculateBearing(userLat, userLng, targetLat, targetLng);

    // Relative angle (accounting for user heading)
    // When user faces the target, it should appear at top of radar
    const relativeAngle = bearing - userHeading;
    const angleRad = ((relativeAngle - 90) * Math.PI) / 180; // -90 to put "forward" at top

    // Calculate distance ratio (clamp to radar radius)
    const distance = distanceToTarget !== undefined ? distanceToTarget : 100;
    const maxDistance = 200; // 200m = edge of radar
    const distanceRatio = Math.min(distance / maxDistance, 0.9); // Keep inside radar

    const radius = (size / 2) * 0.8; // 80% of half-size
    const x = radius * distanceRatio * Math.cos(angleRad);
    const y = radius * distanceRatio * Math.sin(angleRad);

    return { x, y, distance };
  }, [userLat, userLng, targetLat, targetLng, userHeading, distanceToTarget, size]);

  // Calculate nearby building positions
  const nearbyPositions = useMemo(() => {
    return nearbyBuildings.slice(0, 5).map((building) => {
      const bearing = calculateBearing(userLat, userLng, building.lat, building.lng);
      const relativeAngle = bearing - userHeading;
      const angleRad = ((relativeAngle - 90) * Math.PI) / 180;

      const distance = haversineDistance(userLat, userLng, building.lat, building.lng) * 1000;
      const maxDistance = 200;
      const distanceRatio = Math.min(distance / maxDistance, 0.9);

      const radius = (size / 2) * 0.8;
      const x = radius * distanceRatio * Math.cos(angleRad);
      const y = radius * distanceRatio * Math.sin(angleRad);

      return { x, y, name: building.name };
    });
  }, [userLat, userLng, nearbyBuildings, userHeading, size]);

  // Target dot size based on distance
  const targetDotSize = useMemo(() => {
    if (distanceToTarget === undefined) return 8;
    if (distanceToTarget < 30) return 14;
    if (distanceToTarget < 50) return 12;
    if (distanceToTarget < 100) return 10;
    return 8;
  }, [distanceToTarget]);

  if (!isActive) return null;

  const center = size / 2;
  const scanRotation = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Radar background */}
      <View style={[styles.radarBg, { width: size, height: size, borderRadius: size / 2 }]}>
        {/* Concentric circles */}
        <View style={[styles.ring, styles.ringOuter, { width: size * 0.8, height: size * 0.8, borderRadius: size * 0.4 }]} />
        <View style={[styles.ring, styles.ringMiddle, { width: size * 0.5, height: size * 0.5, borderRadius: size * 0.25 }]} />
        <View style={[styles.ring, styles.ringInner, { width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1 }]} />

        {/* Cross hairs */}
        <View style={[styles.crosshairH, { width: size * 0.8, left: size * 0.1 }]} />
        <View style={[styles.crosshairV, { height: size * 0.8, top: size * 0.1 }]} />

        {/* Scan line */}
        <Animated.View
          style={[
            styles.scanLine,
            {
              width: size / 2 - 4,
              left: center,
              top: center,
              transform: [{ rotate: scanRotation }],
            },
          ]}
        />

        {/* User position (center dot with direction indicator) */}
        <View style={[styles.userDot, { left: center - 4, top: center - 4 }]} />
        <View
          style={[
            styles.userDirection,
            {
              left: center - 3,
              top: center - 12,
            },
          ]}
        />

        {/* Nearby building dots (faint) */}
        {nearbyPositions.map((pos, idx) => (
          <View
            key={idx}
            style={[
              styles.nearbyDot,
              {
                left: center + pos.x - 3,
                top: center + pos.y - 3,
              },
            ]}
          />
        ))}

        {/* Target dot (bright, pulsing) */}
        {targetPosition && (
          <Animated.View
            style={[
              styles.targetDot,
              {
                width: targetDotSize,
                height: targetDotSize,
                borderRadius: targetDotSize / 2,
                left: center + targetPosition.x - targetDotSize / 2,
                top: center + targetPosition.y - targetDotSize / 2,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}

        {/* North indicator */}
        <View style={[styles.northIndicator, { top: 4 }]}>
          <View style={styles.northArrow} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  radarBg: {
    backgroundColor: theme.colors.text + '15',
    borderWidth: 2,
    borderColor: theme.colors.text + '30',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: theme.colors.text + '20',
  },
  ringOuter: {},
  ringMiddle: {},
  ringInner: {},
  crosshairH: {
    position: 'absolute',
    height: 1,
    backgroundColor: theme.colors.text + '15',
    top: '50%',
  },
  crosshairV: {
    position: 'absolute',
    width: 1,
    backgroundColor: theme.colors.text + '15',
    left: '50%',
  },
  scanLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: APP_COLORS.info + '40',
    transformOrigin: 'left center',
  },
  userDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: theme.colors.text,
  },
  userDirection: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: theme.colors.white,
  },
  nearbyDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.muted + '60',
  },
  targetDot: {
    position: 'absolute',
    backgroundColor: APP_COLORS.error,
    shadowColor: APP_COLORS.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  northIndicator: {
    position: 'absolute',
    alignItems: 'center',
  },
  northArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: APP_COLORS.info + '80',
  },
});

export default RadarMiniMap;
