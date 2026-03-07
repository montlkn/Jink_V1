/**
 * SkylineOverlay Component
 *
 * AR viewpoint experience at designated tour viewpoints:
 * - Camera opens
 * - Building labels overlay on recognized structures
 * - Tap label → mini info card
 * - "I found them all" to proceed
 *
 * This is the "wow" moment for demos.
 */

import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { APP_COLORS } from '@/constants/appColors';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import * as Haptics from 'expo-haptics';
import { Magnetometer } from 'expo-sensors';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AngularKalmanFilter } from '../../utils/KalmanFilter';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Building data for AR overlay
interface ARBuilding {
  bin: string;
  name: string;
  shortName?: string;
  // Relative bearing from viewpoint (0 = straight ahead)
  bearing: number;
  // Vertical position (0 = horizon, positive = above)
  elevation: number;
  // Building info for mini card
  info?: {
    architect?: string;
    year?: string;
    style?: string;
    height?: string;
  };
}

interface SkylineOverlayProps {
  // Buildings to label
  buildings: ARBuilding[];
  // User's current heading
  userHeading?: number;
  // Callback when user completes the viewpoint
  onComplete: () => void;
  // Callback when user taps a building label
  onBuildingTap?: (building: ARBuilding) => void;
  // Base bearing of the viewpoint (where user should face)
  viewpointBearing?: number;
}

export const SkylineOverlay: React.FC<SkylineOverlayProps> = ({
  buildings,
  userHeading: externalHeading,
  onComplete,
  onBuildingTap,
  viewpointBearing = 0,
}) => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const [internalHeading, setInternalHeading] = useState(0);
  const [foundBuildings, setFoundBuildings] = useState<Set<string>>(new Set());
  const [selectedBuilding, setSelectedBuilding] = useState<ARBuilding | null>(null);

  // Animation
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const labelPulse = useRef(new Animated.Value(1)).current;

  // Heading filter
  const headingFilterRef = useRef(new AngularKalmanFilter(0.08, 1.5, 0));

  // Use external heading if provided, otherwise internal
  const userHeading = externalHeading ?? internalHeading;

  // Magnetometer for heading (if not provided externally)
  useEffect(() => {
    if (externalHeading !== undefined) return;

    let isMounted = true;

    try {
      Magnetometer.setUpdateInterval(200);
      const subscription = Magnetometer.addListener((data) => {
        if (!isMounted) return;
        const { x, y } = data;
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        angle = 90 - angle;
        const rawHeading = ((angle % 360) + 360) % 360;
        const smoothHeading = headingFilterRef.current.updateAngle(rawHeading);
        setInternalHeading(smoothHeading);
      });

      return () => {
        isMounted = false;
        subscription.remove();
      };
    } catch (error) {
      console.error('[SkylineOverlay] Magnetometer error', error);
    }
  }, [externalHeading]);

  // Request camera permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Pulse animation for unfound labels
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(labelPulse, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(labelPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [labelPulse]);

  // Calculate label positions based on heading
  const labelPositions = useMemo(() => {
    return buildings.map((building) => {
      // Calculate relative angle from user heading
      let relativeAngle = building.bearing + viewpointBearing - userHeading;

      // Normalize to -180 to 180
      while (relativeAngle > 180) relativeAngle -= 360;
      while (relativeAngle < -180) relativeAngle += 360;

      // Convert to screen position
      // Field of view is approximately 60 degrees
      const FOV = 60;
      const normalizedX = relativeAngle / FOV; // -1 to 1 when in view
      const screenX = SCREEN_WIDTH / 2 + normalizedX * (SCREEN_WIDTH / 2);

      // Vertical position (with some randomness for visual interest)
      const baseY = SCREEN_HEIGHT * 0.35; // Horizon line
      const screenY = baseY - building.elevation * 100;

      // Check if in view
      const isInView = Math.abs(relativeAngle) < FOV / 2;

      return {
        ...building,
        screenX,
        screenY,
        isInView,
        isFound: foundBuildings.has(building.bin),
      };
    });
  }, [buildings, userHeading, viewpointBearing, foundBuildings]);

  // Handle label tap
  const handleLabelTap = useCallback(
    (building: ARBuilding) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Mark as found
      setFoundBuildings((prev) => new Set([...prev, building.bin]));

      // Show info card
      setSelectedBuilding(building);
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      onBuildingTap?.(building);
    },
    [cardOpacity, onBuildingTap]
  );

  // Close info card
  const handleCloseCard = useCallback(() => {
    Animated.timing(cardOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setSelectedBuilding(null);
    });
  }, [cardOpacity]);

  // Check if all buildings found
  const allFound = foundBuildings.size >= buildings.length;

  // Handle complete
  const handleComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  }, [onComplete]);

  if (!hasPermission || !device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>CAMERA ACCESS</Text>
        <Text style={styles.permissionText}>
          Camera permission needed for the AR skyline experience.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>GRANT ACCESS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera view */}
      <Camera style={styles.camera} device={device} isActive={true} />

      {/* AR Overlay */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Horizon guide line */}
        <View style={styles.horizonLine} />

        {/* Building labels */}
        {labelPositions.map((building) =>
          building.isInView ? (
            <Animated.View
              key={building.bin}
              style={[
                styles.labelContainer,
                {
                  left: building.screenX - 60,
                  top: building.screenY,
                  transform: [{ scale: building.isFound ? 1 : labelPulse }],
                },
              ]}
            >
              <Pressable
                style={[
                  styles.label,
                  building.isFound && styles.labelFound,
                ]}
                onPress={() => handleLabelTap(building)}
              >
                <View style={styles.labelPointer} />
                <Text
                  style={[
                    styles.labelText,
                    building.isFound && styles.labelTextFound,
                  ]}
                  numberOfLines={1}
                >
                  {building.shortName || building.name}
                </Text>
                {building.isFound && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </Pressable>
            </Animated.View>
          ) : null
        )}

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {foundBuildings.size}/{buildings.length} Found
          </Text>
        </View>

        {/* Direction hint */}
        {labelPositions.some((b) => !b.isInView && !b.isFound) && (
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>
              Pan {labelPositions.find((b) => !b.isInView && !b.isFound)?.screenX ?? 0 < SCREEN_WIDTH / 2 ? 'left' : 'right'} to find more buildings
            </Text>
          </View>
        )}

        {/* Complete button */}
        <View style={styles.completeContainer}>
          <TouchableOpacity
            style={[
              styles.completeButton,
              allFound ? styles.completeButtonActive : styles.completeButtonInactive,
            ]}
            onPress={handleComplete}
            disabled={!allFound}
          >
            <Text style={styles.completeButtonText}>
              {allFound ? "I FOUND THEM ALL" : `Find ${buildings.length - foundBuildings.size} more`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info card modal */}
      {selectedBuilding && (
        <Animated.View style={[styles.cardContainer, { opacity: cardOpacity }]}>
          <Pressable style={styles.cardBackdrop} onPress={handleCloseCard} />
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{selectedBuilding.name}</Text>
              <TouchableOpacity onPress={handleCloseCard}>
                <Text style={styles.cardClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedBuilding.info && (
              <View style={styles.cardBody}>
                {selectedBuilding.info.architect && (
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>ARCHITECT</Text>
                    <Text style={styles.cardValue}>{selectedBuilding.info.architect}</Text>
                  </View>
                )}
                {selectedBuilding.info.year && (
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>BUILT</Text>
                    <Text style={styles.cardValue}>{selectedBuilding.info.year}</Text>
                  </View>
                )}
                {selectedBuilding.info.style && (
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>STYLE</Text>
                    <Text style={styles.cardValue}>{selectedBuilding.info.style}</Text>
                  </View>
                )}
                {selectedBuilding.info.height && (
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>HEIGHT</Text>
                    <Text style={styles.cardValue}>{selectedBuilding.info.height}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  horizonLine: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.35,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  labelContainer: {
    position: 'absolute',
    width: 120,
    alignItems: 'center',
  },
  label: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: APP_COLORS.info,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelFound: {
    borderColor: APP_COLORS.success,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  labelPointer: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: APP_COLORS.info,
  },
  labelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  labelTextFound: {
    color: APP_COLORS.success,
  },
  checkmark: {
    color: APP_COLORS.success,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  progressContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  progressText: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  hintContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  completeContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
  },
  completeButton: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  completeButtonActive: {
    backgroundColor: APP_COLORS.success,
  },
  completeButtonInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  cardBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    width: SCREEN_WIDTH - 60,
    maxWidth: 320,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  cardClose: {
    fontSize: 20,
    color: theme.colors.muted,
    padding: 4,
  },
  cardBody: {
    padding: 16,
  },
  cardRow: {
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    color: theme.colors.text,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 12,
    letterSpacing: 2,
  },
  permissionText: {
    fontSize: 16,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default SkylineOverlay;
