/**
 * TourNavScreen
 *
 * Guided tour navigation - different from regular Jink walks:
 * - Linear progression (checkpoints in order)
 * - Narrative panel at bottom (expandable)
 * - "Next" disabled until checkpoint reached
 * - Same compass-based navigation (not a map!)
 * - Clear progress: "Stop 3 of 8"
 */

import { useAuth } from '@/auth/authProvider';
import { Compass, PausePillButton } from '@/features/walks';
import { log } from '@/lib/log';
import { goBack, navigate } from '@/navigation/nav';
import { screens } from '@/navigation/routes';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { APP_COLORS } from '@/constants/appColors';
import { calculateWalkingETA, formatDistance, haversineDistance } from '@/utils/buildingUtils';
import { AngularKalmanFilter } from '@/utils/KalmanFilter';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { DirectionalGlow } from '../../components/glow/DirectionalGlow';
import { RadarMiniMap } from '../../components/walk/RadarMiniMap';
import {
  getActiveTour,
  getCurrentCheckpoint,
  getTourProgress,
  advanceCheckpoint,
  endTour,
  checkpointToBuildingData,
  type TourCheckpoint,
} from '../../data/tourBuildingLookup';
import type { Tour } from '../../data/tours/brooklynBridge';

// Calculate bearing from point A to point B
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

// Get cardinal direction from bearing
function getCardinalDirection(bearing: number): string {
  const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

interface TourNavScreenProps {
  route: any;
  navigation: any;
}

export default function TourNavScreen({ route, navigation }: TourNavScreenProps): JSX.Element {
  const { session } = useAuth() as any;
  const tour = getActiveTour();

  // Navigation state
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userHeading, setUserHeading] = useState(0);
  const [checkpointIndex, setCheckpointIndex] = useState(0);
  const [showNarrative, setShowNarrative] = useState(false);
  const [arrivedAtCheckpoint, setArrivedAtCheckpoint] = useState(false);

  // Refs
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const magnetometerSubscriptionRef = useRef<any>(null);
  const headingFilterRef = useRef(new AngularKalmanFilter(0.08, 1.5, 0));

  // Bottom sheet animation
  const bottomSheetY = useRef(new Animated.Value(0)).current;

  // Close sheet with animation
  const closeSheet = useCallback(() => {
    Animated.timing(bottomSheetY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowNarrative(false);
    });
  }, [bottomSheetY]);

  // Pan responder for drag-to-dismiss
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to vertical drags down
          return gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        },
        onPanResponderMove: (_, gestureState) => {
          // Only allow dragging down (positive dy)
          if (gestureState.dy > 0) {
            bottomSheetY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          // If dragged down more than 100px or with velocity, close
          if (gestureState.dy > 100 || gestureState.vy > 0.5) {
            closeSheet();
          } else {
            // Snap back
            Animated.spring(bottomSheetY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 8,
            }).start();
          }
        },
      }),
    [bottomSheetY, closeSheet]
  );

  // Current checkpoint
  const checkpoint = useMemo(() => {
    if (!tour) return null;
    return tour.checkpoints[checkpointIndex] || null;
  }, [tour, checkpointIndex]);

  // Progress info
  const progress = getTourProgress();

  // Distance to current checkpoint
  const distanceToCheckpoint = useMemo(() => {
    if (!currentLocation || !checkpoint) return null;
    return haversineDistance(currentLocation, checkpoint.location);
  }, [currentLocation, checkpoint]);

  const distanceMeters = distanceToCheckpoint ? distanceToCheckpoint * 1000 : 1000;

  // Target bearing
  const targetBearing = useMemo(() => {
    if (!currentLocation || !checkpoint) return 0;
    return calculateBearing(
      currentLocation.lat,
      currentLocation.lng,
      checkpoint.location.lat,
      checkpoint.location.lng
    );
  }, [currentLocation, checkpoint]);

  // Location tracking
  useEffect(() => {
    let isMounted = true;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          log.warn('[TourNav] Location permission not granted');
          return;
        }

        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (isMounted) {
          setCurrentLocation({
            lat: initial.coords.latitude,
            lng: initial.coords.longitude,
          });
        }

        locationSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 5,
          },
          (loc) => {
            if (isMounted) {
              setCurrentLocation({
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
              });
            }
          }
        );
      } catch (error) {
        log.error('[TourNav] Location tracking error', error);
      }
    };

    startLocationTracking();

    return () => {
      isMounted = false;
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, []);

  // Magnetometer for heading
  useEffect(() => {
    let isMounted = true;

    try {
      Magnetometer.setUpdateInterval(200);
      magnetometerSubscriptionRef.current = Magnetometer.addListener((data) => {
        if (!isMounted) return;
        const { x, y } = data;
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        angle = 90 - angle;
        const rawHeading = ((angle % 360) + 360) % 360;
        const smoothHeading = headingFilterRef.current.updateAngle(rawHeading);
        setUserHeading(smoothHeading);
      });
    } catch (error) {
      log.error('[TourNav] Magnetometer error', error);
    }

    return () => {
      isMounted = false;
      if (magnetometerSubscriptionRef.current) {
        magnetometerSubscriptionRef.current.remove();
      }
    };
  }, []);

  // Check if arrived at checkpoint
  useEffect(() => {
    if (distanceMeters < 30 && !arrivedAtCheckpoint) {
      setArrivedAtCheckpoint(true);
    }
  }, [distanceMeters, arrivedAtCheckpoint]);

  // Handle geofence enter
  const handleGeofenceEnter = useCallback(() => {
    setArrivedAtCheckpoint(true);
    log.info('[TourNav] Arrived at checkpoint:', checkpoint?.name);
  }, [checkpoint]);

  // Handle checkpoint action
  const handleCheckpointAction = useCallback(() => {
    if (!checkpoint) return;

    if (checkpoint.type === 'building') {
      // Navigate to scan for verification
      navigate(screens.Scan, {
        verificationMode: true,
        expectedBuilding: {
          bin: checkpoint.bin,
          name: checkpoint.name,
          lat: checkpoint.location.lat,
          lng: checkpoint.location.lng,
        },
        tourMode: true,
        returnScreen: screens.TourNav,
      });
    } else if (checkpoint.type === 'viewpoint') {
      // Navigate to AR overlay
      navigate(screens.SkylineAR, {
        checkpoint,
        tourId: tour?.id,
      });
    } else {
      // Waypoint - just advance
      handleNextCheckpoint();
    }
  }, [checkpoint, tour]);

  // Handle next checkpoint
  const handleNextCheckpoint = useCallback(() => {
    const next = advanceCheckpoint();
    if (next) {
      setCheckpointIndex((prev) => prev + 1);
      setArrivedAtCheckpoint(false);
      setShowNarrative(true);
    } else {
      // Tour complete
      handleTourComplete();
    }
  }, []);

  // Handle tour complete
  const handleTourComplete = useCallback(() => {
    log.info('[TourNav] Tour completed!');

    navigate(screens.TourComplete, {
      tour,
      stats: {
        checkpointsVisited: checkpointIndex + 1,
        totalCheckpoints: tour?.checkpoints.length || 0,
      },
    });

    endTour();
  }, [tour, checkpointIndex]);

  // Handle pause/exit
  const handlePause = useCallback(() => {
    Alert.alert(
      'Exit Tour?',
      'Your progress will be lost.',
      [
        { text: 'Continue Tour', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            endTour();
            goBack();
          },
        },
      ]
    );
  }, []);

  // Toggle narrative modal
  const toggleNarrative = useCallback(() => {
    if (!showNarrative) {
      // Opening - start from bottom, animate up
      bottomSheetY.setValue(SCREEN_HEIGHT);
      setShowNarrative(true);
      Animated.spring(bottomSheetY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      // Closing - animate down then hide
      Animated.timing(bottomSheetY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setShowNarrative(false);
      });
    }
  }, [showNarrative, bottomSheetY]);

  if (!tour || !checkpoint) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading tour...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formattedDistance = distanceToCheckpoint ? formatDistance(distanceToCheckpoint) : null;
  const eta = distanceToCheckpoint ? calculateWalkingETA(distanceToCheckpoint) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Directional Glow */}
      <DirectionalGlow
        targetBearing={targetBearing}
        userHeading={userHeading}
        distanceMeters={distanceMeters}
        isActive={!arrivedAtCheckpoint}
        onGeofenceEnter={handleGeofenceEnter}
        showHints={true}
      />

      <View style={styles.screen}>
        {/* Header - Pause on left, Progress on right (like Jink) */}
        <View style={styles.header}>
          <PausePillButton onPress={handlePause} />
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>
              {progress.current} of {progress.total}
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.body}>
          {/* Checkpoint Info Card with Radar - add top margin */}
          <View style={[styles.checkpointCard, { marginTop: 12 }]}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardLeftContent}>
                <View style={styles.checkpointHeader}>
                  <View style={styles.checkpointTypeTag}>
                    <Text style={styles.checkpointTypeText}>
                      {checkpoint.type.toUpperCase()}
                    </Text>
                  </View>
                  {arrivedAtCheckpoint && (
                    <View style={styles.arrivedTag}>
                      <Text style={styles.arrivedText}>ARRIVED</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.checkpointName}>{checkpoint.name}</Text>

                {formattedDistance && eta && !arrivedAtCheckpoint && (
                  <View style={styles.distanceRow}>
                    <Text style={styles.distanceText}>
                      {formattedDistance} away · {eta}
                    </Text>
                  </View>
                )}

                {/* Additional checkpoint info */}
                {checkpoint.buildingData && (
                  <View style={styles.buildingMeta}>
                    {checkpoint.buildingData.architect && (
                      <Text style={styles.metaText}>
                        🏛 {checkpoint.buildingData.architect}
                      </Text>
                    )}
                    {checkpoint.buildingData.yearBuilt && (
                      <Text style={styles.metaText}>
                        📅 {checkpoint.buildingData.yearBuilt}
                      </Text>
                    )}
                    {checkpoint.buildingData.style && (
                      <Text style={styles.metaText}>
                        ✨ {checkpoint.buildingData.style}
                      </Text>
                    )}
                  </View>
                )}

                {/* Action hint */}
                <Text style={styles.actionHint}>{checkpoint.action}</Text>
              </View>

              {/* Radar inside card on right */}
              {currentLocation && (
                <RadarMiniMap
                  userLat={currentLocation.lat}
                  userLng={currentLocation.lng}
                  userHeading={userHeading}
                  targetLat={checkpoint.location.lat}
                  targetLng={checkpoint.location.lng}
                  distanceToTarget={distanceMeters}
                  size={70}
                  isActive={true}
                />
              )}
            </View>
          </View>

          {/* Compass */}
          <View style={styles.compassSection}>
            {currentLocation ? (
              <>
                <Compass
                  buildings={[{
                    lat: checkpoint.location.lat,
                    lng: checkpoint.location.lng,
                    latitude: checkpoint.location.lat,
                    longitude: checkpoint.location.lng,
                    name: checkpoint.name,
                  }] as any}
                  buildingIndex={0}
                  size={240}
                />
                {/* Direction hint */}
                <Text style={styles.directionHint}>
                  {distanceMeters < 50
                    ? "You're almost there!"
                    : `Head ${getCardinalDirection(targetBearing)} toward ${checkpoint.name}`}
                </Text>
              </>
            ) : (
              <ActivityIndicator size="large" color={theme.colors.text} />
            )}
          </View>


          {/* Narrative Modal - bottom sheet with drag to dismiss */}
          <Modal
            visible={showNarrative}
            animationType="none"
            transparent={true}
            onRequestClose={toggleNarrative}
          >
            {/* Tap outside to close */}
            <Pressable style={styles.modalOverlay} onPress={closeSheet}>
              {/* Bottom sheet with drag gesture */}
              <Animated.View
                style={[
                  styles.modalContent,
                  { transform: [{ translateY: bottomSheetY }] },
                ]}
              >
                <Pressable onPress={(e) => e.stopPropagation()}>
                  {/* Drag handle area */}
                  <View {...panResponder.panHandlers} style={styles.modalDragHandle}>
                    <View style={styles.modalDragBar} />
                  </View>

                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {checkpoint.type === 'viewpoint' ? 'Viewpoint Info' : 'About This Stop'}
                    </Text>
                  </View>
                </Pressable>

                <ScrollView
                  style={styles.modalScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScrollContent}
                  bounces={false}
                >
                  <Text style={styles.modalNarrativeText}>{checkpoint.narrative}</Text>
                  {checkpoint.funFact && (
                    <View style={styles.modalFunFactBox}>
                      <Text style={styles.modalFunFactLabel}>💡 Fun fact</Text>
                      <Text style={styles.modalFunFactText}>{checkpoint.funFact}</Text>
                    </View>
                  )}

                  {/* Building details if available */}
                  {checkpoint.buildingData && (
                    <View style={styles.modalBuildingDetails}>
                      {checkpoint.buildingData.architect && (
                        <View style={styles.modalDetailRow}>
                          <Text style={styles.modalDetailLabel}>Architect</Text>
                          <Text style={styles.modalDetailValue}>{checkpoint.buildingData.architect}</Text>
                        </View>
                      )}
                      {checkpoint.buildingData.yearBuilt && (
                        <View style={styles.modalDetailRow}>
                          <Text style={styles.modalDetailLabel}>Year Built</Text>
                          <Text style={styles.modalDetailValue}>{checkpoint.buildingData.yearBuilt}</Text>
                        </View>
                      )}
                      {checkpoint.buildingData.style && (
                        <View style={styles.modalDetailRow}>
                          <Text style={styles.modalDetailLabel}>Style</Text>
                          <Text style={styles.modalDetailValue}>{checkpoint.buildingData.style}</Text>
                        </View>
                      )}
                      {checkpoint.buildingData.height && (
                        <View style={styles.modalDetailRow}>
                          <Text style={styles.modalDetailLabel}>Height</Text>
                          <Text style={styles.modalDetailValue}>{checkpoint.buildingData.height}</Text>
                        </View>
                      )}
                      {checkpoint.buildingData.materials && (
                        <View style={styles.modalDetailRow}>
                          <Text style={styles.modalDetailLabel}>Materials</Text>
                          <Text style={styles.modalDetailValue}>{checkpoint.buildingData.materials}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            </Pressable>
          </Modal>

          {/* Footer with About + Action Button */}
          <View style={styles.footer}>
            {/* About this stop button */}
            <TouchableOpacity onPress={toggleNarrative} style={styles.narrativeButton}>
              <Text style={styles.narrativeButtonText}>
                {checkpoint.type === 'viewpoint' ? 'VIEWPOINT INFO' : 'ABOUT THIS STOP'}
              </Text>
              <Text style={styles.narrativeButtonIcon}>↑</Text>
            </TouchableOpacity>

            {/* Main action button */}
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                arrivedAtCheckpoint ? styles.actionButtonActive : styles.actionButtonDisabled,
                pressed && arrivedAtCheckpoint && styles.actionButtonPressed,
              ]}
              onPress={handleCheckpointAction}
              disabled={!arrivedAtCheckpoint}
            >
              <Text style={styles.actionButtonText}>
                {checkpoint.type === 'building'
                  ? 'Scan to Verify'
                  : checkpoint.type === 'viewpoint'
                  ? 'View Skyline'
                  : 'Continue'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.muted,
    fontSize: theme.typography.fontSize.md,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBadge: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  progressText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
  },
  checkpointCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: theme.colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeftContent: {
    flex: 1,
    marginRight: 12,
  },
  checkpointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkpointTypeTag: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  checkpointTypeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 1,
  },
  arrivedTag: {
    backgroundColor: APP_COLORS.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  arrivedText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '700',
    color: APP_COLORS.success,
    letterSpacing: 1,
  },
  checkpointName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  buildingMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  metaText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
  },
  actionHint: {
    fontSize: theme.typography.fontSize.sm,
    color: APP_COLORS.info,
    fontWeight: '600',
    marginTop: 10,
  },
  distanceRow: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: APP_COLORS.info + '15',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  distanceText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: APP_COLORS.info,
  },
  compassSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    flex: 1,
  },
  directionHint: {
    marginTop: 12,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  narrativeButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  narrativeButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: APP_COLORS.info,
    letterSpacing: 0.5,
  },
  narrativeButtonIcon: {
    fontSize: 14,
    color: APP_COLORS.info,
    marginLeft: 6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalDragHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalDragBar: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalNarrativeText: {
    fontSize: 17,
    lineHeight: 28,
    color: theme.colors.text,
  },
  modalFunFactBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: APP_COLORS.warning + '12',
    borderRadius: 12,
  },
  modalFunFactLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: APP_COLORS.warning,
    marginBottom: 8,
  },
  modalFunFactText: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
  modalBuildingDetails: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalDetailLabel: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  modalDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: 'center',
  },
  actionButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonActive: {
    backgroundColor: theme.colors.text,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  actionButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  actionButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  waypointHint: {
    marginTop: 8,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
  },
});
