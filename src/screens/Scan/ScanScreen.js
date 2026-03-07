import { useAuth } from '@/auth/authProvider';
import { log } from '@/lib/log';
// eslint-disable-next-line no-restricted-imports
import { awardXp } from '@/services/gateways';
import { screens } from "@/navigation/routes";
import { theme } from '@/theme/tokens';
import { APP_COLORS } from '@/constants/appColors';
import * as Location from 'expo-location';
import { Accelerometer, Magnetometer } from 'expo-sensors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import BreathingGlow from '../../components/glow/BreathingGlow';
import ArchetypeOrb from '../../features/orb/ArchetypeOrb';
import {
    PositionFusion,
    calculatePositionConfidence,
    detectMovementType,
} from '../../utils/sensorFusion';
// eslint-disable-next-line no-restricted-imports
import { fetchBuildingBySearch, fetchContributedBuildingBySearch, fetchNearbyBuildingsFromDB } from '@/services/buildingService';
// eslint-disable-next-line no-restricted-imports
import { verifyBuilding } from '@/services/buildingVerificationService';
// eslint-disable-next-line no-restricted-imports
import { createAestheticEvent } from '@/services/gateways/aestheticEventGateway';
// eslint-disable-next-line no-restricted-imports
import { fetchContributionsByLocation } from '@/services/contributionsService';
// eslint-disable-next-line no-restricted-imports
import { initializeGridCache, findBuildingByGPS, findBuildingByAddress, findBuildingByBIN, shouldRefreshCache } from '@/services/gpsGridCacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetworkStatus } from '@/utils/networkStatus';

export default function ScanScreen({ navigation, route }) {
  const { session } = useAuth();
  const { isOnline } = useNetworkStatus();

  // Vision Camera hooks for device selection and permissions
  const { hasPermission, requestPermission } = useCameraPermission();
  
  // Get multi-cam device with ultra-wide + wide for lens switching
  const device = useCameraDevice('back', {
    physicalDevices: ['ultra-wide-angle-camera', 'wide-angle-camera'],
  });
  
  // Camera zoom state - controls which physical lens is used
  // minZoom = ultra-wide, neutralZoom = wide (1x)
  const [zoom, setZoom] = useState(1); // Start at 1x (neutralZoom)
  const minZoom = device?.minZoom ?? 1;
  const maxZoom = Math.min(device?.maxZoom ?? 1, 5); // Cap at 5x
  const neutralZoom = device?.neutralZoom ?? 1;
  
  // Calculate current lens label based on zoom
  const currentLensLabel = useMemo(() => {
    if (zoom < neutralZoom) return '0.5x';
    if (zoom >= 2) return '2x';
    return '1x';
  }, [zoom, neutralZoom]);

  // BATCHED sensor state - single state object instead of 7 separate ones
  const [sensorState, setSensorState] = useState({
    position: null,
    heading: 0,
    pitch: 0,
    altitude: null,
    confidence: 0,
    gpsAccuracy: null,
    movementType: 'stationary',
  });

  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('Checking nearby buildings...');
  const [showRetry, setShowRetry] = useState(false);
  const [nearbyBuildings, setNearbyBuildings] = useState([]);

  // Progressive loading messages during scan
  const scanTimersRef = useRef([]);
  useEffect(() => {
    if (isScanning) {
      setScanMessage('Checking nearby buildings...');
      setShowRetry(false);

      const t1 = setTimeout(() => setScanMessage('Analyzing architecture...'), 3000);
      const t2 = setTimeout(() => setScanMessage('Running deep scan...'), 8000);
      const t3 = setTimeout(() => {
        setScanMessage('Still working...');
        setShowRetry(true);
      }, 15000);
      const t4 = setTimeout(() => {
        // Hard timeout — abort and show retry
        setIsScanning(false);
        setScanMessage('Scan timed out.');
        setShowRetry(true);
      }, 30000);

      scanTimersRef.current = [t1, t2, t3, t4];
    } else {
      scanTimersRef.current.forEach(clearTimeout);
      scanTimersRef.current = [];
      setShowRetry(false);
    }
    return () => {
      scanTimersRef.current.forEach(clearTimeout);
      scanTimersRef.current = [];
    };
  }, [isScanning]);

  // Verification mode params from WalkNav
  const verificationMode = route.params?.verificationMode || false;
  const expectedBuilding = route.params?.expectedBuilding;
  const walkId = route.params?.walkId;

  const fusionRef = useRef(null);
  const lastGPSTime = useRef(Date.now());
  const cameraRef = useRef(null);

  // Refs for batching sensor updates - accumulate then flush once per frame
  const pendingSensorUpdates = useRef({});
  const frameRequestId = useRef(null);

  const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

  // Flush batched sensor updates once per frame (16ms) instead of per sensor tick
  const flushSensorUpdates = useCallback(() => {
    frameRequestId.current = null;
    const updates = pendingSensorUpdates.current;
    if (Object.keys(updates).length > 0) {
      setSensorState(prev => ({ ...prev, ...updates }));
      pendingSensorUpdates.current = {};
    }
  }, []);

  const queueSensorUpdate = useCallback((updates) => {
    Object.assign(pendingSensorUpdates.current, updates);
    if (!frameRequestId.current) {
      frameRequestId.current = requestAnimationFrame(flushSensorUpdates);
    }
  }, [flushSensorUpdates]);

  // Toggle between ultra-wide (minZoom) and wide (neutralZoom) lenses
  const toggleLens = useCallback(() => {
    if (zoom < neutralZoom) {
      // Currently on ultra-wide, switch to wide
      setZoom(neutralZoom);
      log.info('[scan] Switched to wide lens (1x)', { zoom: neutralZoom });
    } else {
      // Currently on wide, switch to ultra-wide
      setZoom(minZoom);
      log.info('[scan] Switched to ultra-wide lens (0.5x)', { zoom: minZoom });
    }
  }, [zoom, minZoom, neutralZoom]);

  // Handle camera initialization
  const handleCameraInitialized = useCallback(() => {
    log.info('[scan] Camera initialized', { 
      minZoom, 
      maxZoom, 
      neutralZoom,
      physicalDevices: device?.physicalDevices 
    });
    // Start at neutral zoom (1x)
    setZoom(neutralZoom);
  }, [minZoom, maxZoom, neutralZoom, device?.physicalDevices]);

  // Initialize sensor fusion on mount
  useEffect(() => {
    try {
      fusionRef.current = new PositionFusion();
    } catch (error) {
      log.error('[scan] Error initializing PositionFusion', error);
    }
    return () => {
      if (frameRequestId.current) {
        cancelAnimationFrame(frameRequestId.current);
      }
    };
  }, []);

  // OPTIMIZED: Magnetometer at 500ms instead of 250ms, batched updates
  useEffect(() => {
    try {
      Magnetometer.setUpdateInterval(500); // Was 250ms - halved update rate
      const magSub = Magnetometer.addListener((data) => {
        const { x, y } = data;
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        angle = 90 - angle;
        const normalized = ((angle % 360) + 360) % 360;
        queueSensorUpdate({ heading: normalized });
      });
      return () => magSub.remove();
    } catch (error) {
      log.error('[scan] Magnetometer error', error);
    }
  }, [queueSensorUpdate]);

  // OPTIMIZED: Accelerometer at 500ms instead of 100ms, batched updates
  useEffect(() => {
    try {
      Accelerometer.setUpdateInterval(500); // Was 100ms - 5x slower
      const accelSub = Accelerometer.addListener((data) => {
        const movement = detectMovementType(data);
        const { x, y, z } = data;
        const calculatedPitch = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
        queueSensorUpdate({ movementType: movement, pitch: calculatedPitch });
      });
      return () => accelSub.remove();
    } catch (error) {
      log.error('[scan] Accelerometer error', error);
    }
  }, [queueSensorUpdate]);

  // OPTIMIZED: Confidence score at 3s instead of 1s
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceGPS = Date.now() - lastGPSTime.current;
      const conf = calculatePositionConfidence({
        hasGPS: sensorState.position !== null,
        gpsAccuracy: sensorState.gpsAccuracy || 50,
        hasBarometer: false,
        hasIMU: true,
        timeSinceLastGPS: timeSinceGPS,
      });
      queueSensorUpdate({ confidence: conf });
    }, 3000); // Was 1000ms

    return () => clearInterval(interval);
  }, [sensorState.position, sensorState.gpsAccuracy, queueSensorUpdate]);
  // OPTIMIZED: Location watcher with reduced frequency and batched updates
  useEffect(() => {
    if (!fusionRef.current) return;

    let locationSubscription = null;
    let isMounted = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !isMounted) return;

        // Get initial position with timeout
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High, // Was BestForNavigation - less battery
        });

        if (!isMounted) return;

        const fusion = fusionRef.current;
        if (fusion) {
          fusion.updateGPS(
            initial.coords.latitude,
            initial.coords.longitude,
            initial.coords.altitude,
            initial.coords.accuracy
          );
        }

        queueSensorUpdate({
          position: initial.coords,
          gpsAccuracy: initial.coords.accuracy,
          altitude: initial.coords.altitude ?? null,
        });
        lastGPSTime.current = Date.now();

        // OPTIMIZED: Watch at 5s/10m instead of 1s/1m
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High, // Was BestForNavigation
            timeInterval: 5000, // Was 1000ms
            distanceInterval: 10, // Was 1m
          },
          (loc) => {
            if (!isMounted) return;
            const fusion = fusionRef.current;
            if (fusion) {
              fusion.updateGPS(
                loc.coords.latitude,
                loc.coords.longitude,
                loc.coords.altitude,
                loc.coords.accuracy
              );
            }
            queueSensorUpdate({
              position: loc.coords,
              gpsAccuracy: loc.coords.accuracy,
              altitude: loc.coords.altitude ?? null,
            });
            lastGPSTime.current = Date.now();

            // Initialize/refresh GPS grid cache when location updates significantly
            if (shouldRefreshCache(loc.coords.latitude, loc.coords.longitude)) {
              initializeGridCache(loc.coords.latitude, loc.coords.longitude)
                .catch(err => log.warn('[scan] Failed to refresh grid cache', err));
            }
          }
        );
      } catch (error) {
        log.error('[scan] Error getting location', error);
      }
    })();

    return () => {
      isMounted = false;
      locationSubscription?.remove();
    };
  }, [queueSensorUpdate]);

  // Fetch nearby buildings for cone of vision verification (verification mode only)
  useEffect(() => {
    if (!verificationMode || !sensorState.position) return;

    const fetchNearby = async () => {
      try {
        const buildings = await fetchNearbyBuildingsFromDB({
          latitude: sensorState.position.latitude,
          longitude: sensorState.position.longitude,
          radiusKm: 0.05, // 50m radius for verification
          limit: 50,
        });

        setNearbyBuildings(buildings);
        log.info('[scan] Fetched nearby buildings for cone of vision', {
          count: buildings.length,
        });
      } catch (error) {
        log.error('[scan] Error fetching nearby buildings', error);
      }
    };

    fetchNearby();
  }, [verificationMode, sensorState.position]);

  // Destructure for cleaner access in handlers
  const { position, heading, pitch, altitude, confidence, gpsAccuracy, movementType } = sensorState;

  // Handle photo capture
  const handleCapture = async () => {
    if (!cameraRef.current || !position) return;

    setIsScanning(true);
    let photo = null; // Declare in outer scope so it's accessible in error handling

    try {
      // Vision-camera uses takePhoto() instead of takePictureAsync()
      const capturedPhoto = await cameraRef.current.takePhoto({
        qualityPrioritization: 'speed',
      });
      
      // Vision-camera returns {path} instead of {uri}
      photo = {
        uri: `file://${capturedPhoto.path}`,
        width: capturedPhoto.width,
        height: capturedPhoto.height,
      };

      // Use multi-tier verification system
      if (verificationMode && expectedBuilding) {
        log.info('[scan] Starting multi-tier verification', {
          expectedBuilding: expectedBuilding.name,
          nearbyBuildingsCount: nearbyBuildings.length,
        });

        const verificationResult = await verifyBuilding({
          photo,
          position,
          heading,
          pitch,
          expectedBuilding,
          nearbyBuildings,
        });

        log.info('[scan] Verification result', {
          verified: verificationResult.verified,
          confidence: verificationResult.confidence,
          method: verificationResult.method,
          candidates: verificationResult.candidateBuildings?.length || 0,
        });

        if (verificationResult.verified) {
          // Track successful verification
          if (session?.user?.id && walkId) {
            createAestheticEvent({
              userId: session.user.id,
              eventType: 'building_scan',
              eventSubtype: 'repeat',
              buildingBbl: expectedBuilding.bin,
              payload: {
                verification_method: verificationResult.method,
                confidence: verificationResult.confidence,
                walk_id: walkId,
                candidates_count: verificationResult.candidateBuildings?.length || 0,
              },
            }).catch((err) => log.warn('[scan] Failed to track verification', err));
          }

          // Return to WalkNav with verification result
          navigation.navigate(screens.WalkNav, {
            scanResult: {
              verified: true,
              buildingBin: expectedBuilding.bin,
              buildingData: verificationResult.buildingData || expectedBuilding,
              verificationMethod: verificationResult.method,
              confidence: verificationResult.confidence,
            },
          });
        } else {
          // Verification failed - show helpful message
          let failureMessage = `We couldn't verify you're at ${expectedBuilding.name || 'the building'}.`;

          if (verificationResult.candidateBuildings && verificationResult.candidateBuildings.length > 0) {
            failureMessage += ` We detected ${verificationResult.candidateBuildings.length} nearby buildings. Try pointing your camera more directly at the building.`;
          } else {
            failureMessage += ' Make sure you\'re close to the building (within 20m) and pointing your camera at it.';
          }

          navigation.navigate(screens.NotFound, {
            message: failureMessage,
            returnScreen: screens.WalkNav,
            position: position,
            capturedPhotoUri: photo?.uri,
          });
        }
        return;
      }

      // Normal scan mode - use tiered lookup strategy
      log.info('[scan] Starting tiered scan (Cache → GPS → CLIP)');

      // TIER 0: Check GPS Grid Cache FIRST (instant, 0ms)
      const cachedBuilding = findBuildingByGPS(position.latitude, position.longitude, 0.03);
      if (cachedBuilding && cachedBuilding.name) {
        log.info('[scan] INSTANT CACHE HIT!', { building: cachedBuilding.name });

        // Award XP
        await awardXp({ amount: 50, source: 'building_scan' });

        // Track event
        try {
          if (session?.user?.id && cachedBuilding.bbl) {
            await createAestheticEvent({
              userId: session.user.id,
              eventType: 'building_scan',
              eventSubtype: 'cache_hit',
              buildingBbl: cachedBuilding.bbl,
              payload: { scan_method: 'gps_cache' },
            });
          }
        } catch (error) {
          log.warn('[scan] Failed to create aesthetic event', error);
        }

        navigation.navigate(screens.BuildingInfo, { buildingData: cachedBuilding });
        return;
      }

      // TIER 1-3: Run GPS lookups and CLIP truly in parallel using Promise.allSettled
      // This fixes the broken Promise.race logic - now both run simultaneously

      // Start all lookups in parallel
      const gpsLookupPromise = (async () => {
        try {
          // Check user-contributed buildings table (by GPS proximity)
          log.info('[scan] Starting user_contributed_buildings lookup');
          const contributedMatch = await fetchContributedBuildingBySearch({
            lat: position.latitude,
            lng: position.longitude,
            radiusKm: 0.03, // 30m radius
          });

          if (contributedMatch && contributedMatch.name) {
             return { type: 'contributed', data: contributedMatch };
          }
        } catch (err) {
          log.warn('[scan] Contributed lookup failed', err);
        }

        try {
          // Try reverse geocoding + address lookup
          log.info('[scan] Starting address lookup');
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: position.latitude,
            longitude: position.longitude,
          });

          if (reverseGeocode && reverseGeocode.length > 0) {
            const geo = reverseGeocode[0];
            const streetAddress = `${geo.streetNumber || ''} ${geo.street || ''}`.trim();

            if (streetAddress) {
              // Try cache first for address
              const cachedAddressMatch = findBuildingByAddress(streetAddress, position.latitude, position.longitude);
              if (cachedAddressMatch && cachedAddressMatch.name) {
                return { type: 'address_cache', data: cachedAddressMatch, address: streetAddress };
              }

              // Fall back to DB lookup
              const addressMatch = await fetchBuildingBySearch({
                address: streetAddress,
                lat: position.latitude,
                lng: position.longitude,
                radiusKm: 0.05, // 50m radius
              });

              if (addressMatch && addressMatch.name) {
                return { type: 'address', data: addressMatch, address: streetAddress };
              }
            }
          }
        } catch (err) {
          log.warn('[scan] Address lookup failed', err);
        }
        return null;
      })();

      // Start CLIP verification in parallel (doesn't block GPS)
      const clipPromise = verifyBuilding({
        photo,
        position,
        heading,
        pitch,
        expectedBuilding: null,
        nearbyBuildings: nearbyBuildings || [],
      });

      // Wait for BOTH to complete (or fail/timeout) - truly parallel
      const [gpsResult, clipResult] = await Promise.allSettled([gpsLookupPromise, clipPromise]);

      // Process results - prefer GPS (faster user experience) over CLIP
      const gpsMatch = gpsResult.status === 'fulfilled' ? gpsResult.value : null;
      const clipMatch = clipResult.status === 'fulfilled' ? clipResult.value : null;

      // Use GPS result if available
      let result = gpsMatch;

      // If no GPS match, use CLIP result
      if (!result && clipMatch && clipMatch.verified) {
        result = clipMatch;
      }

      // Handle the winner
      if (result && result.type === 'contributed') {
        const contributedMatch = result.data;
        log.info('[scan] FAST MATCH: User-contributed building found!', {
            building: contributedMatch.name,
            source: 'user_contribution',
        });

        // Award XP
        await awardXp({ amount: 50, source: 'building_scan' });

        // Track event
        try {
            if (session?.user?.id && contributedMatch.bbl) {
              await createAestheticEvent({
                userId: session.user.id,
                eventType: 'building_scan',
                eventSubtype: 'contributed_match',
                buildingBbl: contributedMatch.bbl,
                payload: {
                  scan_method: 'user_contribution',
                  contributed_by: contributedMatch.contributed_by,
                },
              });
            }
        } catch (error) {
            log.warn('[scan] Failed to create aesthetic event', error);
        }

        navigation.navigate(screens.BuildingInfo, { buildingData: contributedMatch });
        return;
      }

      if (result && (result.type === 'address' || result.type === 'address_cache')) {
        const addressMatch = result.data;
        log.info('[scan] FAST MATCH: Address lookup match found!', {
            building: addressMatch.name,
            address: result.address,
            fromCache: result.type === 'address_cache',
        });

        // Award XP
        await awardXp({ amount: 50, source: 'building_scan' });

        // Track event
        try {
            if (session?.user?.id && addressMatch.bbl) {
                await createAestheticEvent({
                userId: session.user.id,
                eventType: 'building_scan',
                eventSubtype: result.type === 'address_cache' ? 'address_cache_hit' : 'address_match',
                buildingBbl: addressMatch.bbl,
                payload: {
                    scan_method: result.type === 'address_cache' ? 'address_cache' : 'address_lookup',
                    address: result.address,
                },
                });
            }
        } catch (error) {
            log.warn('[scan] Failed to create aesthetic event', error);
        }

        navigation.navigate(screens.BuildingInfo, { buildingData: addressMatch });
        return;
      }

      // Check if CLIP returned a match
      if (clipMatch && clipMatch.verified && clipMatch.buildingData) {
        log.info('[scan] CLIP match found!', {
          building: clipMatch.buildingData.name,
          method: clipMatch.method,
          confidence: clipMatch.confidence,
        });

        // Award XP for successful scan
        await awardXp({ amount: 50, source: 'building_scan' });

        // Track aesthetic event
        try {
          if (session?.user?.id && clipMatch.buildingData?.bbl) {
            await createAestheticEvent({
              userId: session.user.id,
              eventType: 'building_scan',
              eventSubtype: 'clip_match',
              buildingBbl: clipMatch.buildingData.bbl,
              payload: {
                scan_method: clipMatch.method,
                confidence: clipMatch.confidence,
              },
            });
          }
        } catch (error) {
          log.warn('[scan] Failed to create aesthetic event', error);
        }

        navigation.navigate(screens.BuildingInfo, { buildingData: clipMatch.buildingData });
        return;
      }

      log.info('[scan] No parallel match found, trying reverse geocode + address lookup (legacy fallback)');

      // Tier 3: Try reverse geocoding + address lookup from building database
      let streetAddress = null;
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: position.latitude,
          longitude: position.longitude,
        });

        if (reverseGeocode && reverseGeocode.length > 0) {
          const geo = reverseGeocode[0];
          streetAddress = `${geo.streetNumber || ''} ${geo.street || ''}`.trim();
          
          log.info('[scan] Reverse geocode result', {
            streetAddress,
            city: geo.city,
            region: geo.region,
          });

          if (streetAddress) {
            // Pass GPS coords to filter by proximity (prevent matching wrong building on same street)
            const addressMatch = await fetchBuildingBySearch({ 
              address: streetAddress,
              lat: position.latitude,
              lng: position.longitude,
              radiusKm: 0.05, // 50m radius
            });
            
            if (addressMatch && addressMatch.name) {
              log.info('[scan] Address lookup match found!', {
                building: addressMatch.name,
                address: streetAddress,
              });

              // Award XP for successful scan
              await awardXp({ amount: 50, source: 'building_scan' });

              // Track aesthetic event
              try {
                if (session?.user?.id && addressMatch.bbl) {
                  await createAestheticEvent({
                    userId: session.user.id,
                    eventType: 'building_scan',
                    eventSubtype: 'address_match',
                    buildingBbl: addressMatch.bbl,
                    payload: {
                      scan_method: 'address_lookup',
                      address: streetAddress,
                    },
                  });
                }
              } catch (error) {
                log.warn('[scan] Failed to create aesthetic event', error);
              }

              navigation.navigate(screens.BuildingInfo, { buildingData: addressMatch });
              return;
            }
          }
        }
      } catch (geoError) {
        log.warn('[scan] Reverse geocode failed', geoError);
      }

      log.info('[scan] All lookups failed, falling back to GPS-based backend query');

      // Fallback: GPS-based backend query (original flow)
      const formData = new FormData();
      formData.append('photo', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'scan.jpg',
      });
      formData.append('gps_lat', position.latitude.toString());
      formData.append('gps_lng', position.longitude.toString());
      formData.append('compass_bearing', heading.toString());
      formData.append('phone_pitch', pitch.toString());
      formData.append('phone_roll', '0');
      formData.append('altitude', (altitude || 0).toString());
      formData.append('confidence', Math.round(confidence).toString());
      formData.append('movement_type', movementType);
      formData.append('gps_accuracy', (position.accuracy || 10).toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      log.info('[scan] Sending request to:', `${BACKEND_URL}/api/scan`);

      const response = await fetch(`${BACKEND_URL}/api/scan`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();

      if (!response.ok) {
        log.error('[scan] Scan API error', response.status, responseText);
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (_e) {
        log.error('[scan] Failed to parse response as JSON:', responseText);
        throw new Error('Invalid response from scan API');
      }

      log.info('[scan] Parsed API response:', JSON.stringify(data, null, 2));

      // Normal scan mode - navigate to building info
      if (data.building && data.building.name) {
        // Award XP for successful scan (50 XP base)
        await awardXp({ amount: 50, source: 'building_scan' });

        // Track aesthetic event for building scan
        try {
          if (session?.user?.id && data.building?.bbl) {
            // Check if this is first-time scan
            const scannedBuildings = await AsyncStorage.getItem('@scanned_buildings');
            const scannedList = scannedBuildings ? JSON.parse(scannedBuildings) : [];
            const isFirstTime = !scannedList.includes(data.building.bbl);

            await createAestheticEvent({
              userId: session.user.id,
              eventType: 'building_scan',
              eventSubtype: isFirstTime ? 'first_time' : 'repeat',
              buildingBbl: data.building.bbl,
              payload: {
                scan_method: 'camera',
                gps_lat: position.latitude,
                gps_lng: position.longitude,
                confidence: Math.round(confidence),
              },
            });

            // Track scanned buildings for future scans
            if (isFirstTime) {
              scannedList.push(data.building.bbl);
              await AsyncStorage.setItem('@scanned_buildings', JSON.stringify(scannedList));
            }
          }
        } catch (error) {
          log.warn('[scan] Failed to create aesthetic event', error);
          // Non-blocking error - don't prevent navigation
        }

        // Successfully identified building
        navigation.navigate(screens.BuildingInfo, { buildingData: data.building });
      } else {
        // Could not identify building - check for user contributions first
        try {
          // First, check local storage for user's pending contributions
          const pendingContributions = await AsyncStorage.getItem('@pending_contributions');
          if (pendingContributions) {
            const contributions = JSON.parse(pendingContributions);
            
            // Find contributions near current position (within ~50m)
            const nearbyLocalContribution = contributions.find(contrib => {
              if (!contrib.gps_lat || !contrib.gps_lng) return false;
              const latDiff = Math.abs(contrib.gps_lat - position.latitude);
              const lngDiff = Math.abs(contrib.gps_lng - position.longitude);
              // Roughly 50m in degrees (~0.00045)
              return latDiff < 0.00045 && lngDiff < 0.00045;
            });
            
            if (nearbyLocalContribution) {
              log.info('[scan] Found local pending contribution for this location', nearbyLocalContribution);
              
              // Navigate to BuildingInfo with locally contributed data
              navigation.navigate(screens.BuildingInfo, {
                buildingData: {
                  name: nearbyLocalContribution.building_name || nearbyLocalContribution.address || 'Pending Contribution',
                  address: nearbyLocalContribution.address,
                  bin: nearbyLocalContribution.bin,
                  year_built: nearbyLocalContribution.year_built,
                  architect: nearbyLocalContribution.architect,
                  architectural_style: nearbyLocalContribution.style,
                  // Mark as user-contributed
                  source: 'local_contribution',
                  contribution_status: 'pending',
                },
              });
              return;
            }
          }

          // Use direct Supabase lookup instead of Modal API
          const contributions = await fetchContributionsByLocation(
            position.latitude,
            position.longitude,
            50 // 50 meter radius
          );

          if (contributions && contributions.length > 0) {
            // Found user-contributed data! Show it to the user
            const contribution = contributions[0];
            log.info('[scan] Found user contribution for this location', contribution);

            // Navigate to BuildingInfo with contributed data
            navigation.navigate(screens.BuildingInfo, {
              buildingData: {
                name: contribution.building_name || contribution.address || 'User Contributed Building',
                address: contribution.address,
                bin: contribution.bin,
                bbl: contribution.bbl,
                year_built: contribution.year_built,
                architect: contribution.architect,
                architectural_style: contribution.architectural_style,
                photo_url: contribution.photo_url,
                // Mark as user-contributed
                source: 'user_contribution',
                contribution_id: contribution.id,
                contribution_status: contribution.status,
              },
            });
            return;
          }
        } catch (contributionError) {
          log.warn('[scan] Failed to check for contributions', contributionError);
          // Continue to NotFound flow
        }

        // No contributions found - offer contribution flow
        navigation.navigate(screens.NotFound, {
          message: data.message || "We couldn't identify this building.",
          buildingBIN: data.building?.bin || null,
          position: position,
          capturedPhotoUri: photo.uri, // Pass the photo for multi-angle capture
        });
      }
    } catch (error) {
      log.error('[scan] Scan failed', error);

      // Handle specific error types
      let message = 'An error occurred while scanning. Please try again.';

      if (error.name === 'AbortError') {
        message = 'The scan timed out. The backend may be waking up from sleep. Please wait 30 seconds and try again.';
      } else if (error.message && error.message.includes('Network request failed')) {
        message = 'Could not connect to the scanning service. Please check your internet connection.';
      } else if (error.message) {
        message = error.message;
      }

      // Navigate to NotFound screen on error - still offer contribution
      navigation.navigate(screens.NotFound, {
        message,
        position: position,
        capturedPhotoUri: photo?.uri, // Pass photo if available
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Request permission on mount if not granted
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.white} />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.white} />
        <Text style={styles.text}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        zoom={zoom}
        onInitialized={handleCameraInitialized}
      />

      {/* Verification Mode Banner */}
      {verificationMode && expectedBuilding && (
        <View style={styles.verificationBanner}>
          <Text style={styles.verificationText}>📍 Verify: {expectedBuilding.name}</Text>
          <Text style={styles.verificationSubtext}>Scan the building to confirm you're here</Text>
        </View>
      )}

      {/* Offline Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>You're offline — scans may fail</Text>
        </View>
      )}

      {/* Sensor Panel */}
      <View style={styles.sensorPanel}>
        <Text style={styles.sensorText}>
          📍 {position ? `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}` : 'Acquiring...'}
        </Text>
        <Text style={styles.sensorText}>
          🧭 Heading: {Math.round(heading)}°
        </Text>
        <Text style={styles.sensorText}>
          🗻 Altitude: {altitude != null ? `${altitude.toFixed(1)}m` : '—'}
        </Text>
        <Text style={styles.sensorText}>
          🎯 Confidence: {confidence}%
        </Text>
        <Text style={styles.sensorText}>
          🚶 {movementType}
        </Text>
        <Text style={[
          styles.sensorText, 
          gpsAccuracy && gpsAccuracy > 25 && styles.sensorTextWarning,
          gpsAccuracy && gpsAccuracy <= 10 && styles.sensorTextGood
        ]}>
          📡 GPS: {gpsAccuracy ? `±${Math.round(gpsAccuracy * 3.28)}ft` : 'Acquiring...'}
          {gpsAccuracy && gpsAccuracy > 25 ? ' ⚠️ Low' : ''}
        </Text>
      </View>

      {/* Lens Switcher - toggles between ultra-wide and wide */}
      {Platform.OS === 'ios' && device?.physicalDevices?.length > 1 && (
        <View style={styles.lensPanel}>
          <TouchableOpacity 
            style={styles.lensButton}
            onPress={toggleLens}
            activeOpacity={0.7}
          >
            <Text style={styles.lensButtonText}>
              {currentLensLabel}
            </Text>
          </TouchableOpacity>
          <Text style={styles.lensHint}>
            {zoom < neutralZoom ? 'Ultra Wide' : 'Wide'}
          </Text>
        </View>
      )}

      {/* Crosshair */}
      <View style={styles.crosshair}>
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
      </View>

      {/* Capture Button */}
      <View style={styles.controls}>
        <View style={styles.captureButtonContainer}>
          {/* Breathing glow behind camera button */}
          {position && !isScanning && (
            <BreathingGlow
              color={theme.colors.white}
              size={160}
              duration={2000}
              minOpacity={0.2}
              maxOpacity={0.5}
              minScale={0.9}
              maxScale={1.1}
            />
          )}
          <TouchableOpacity
            style={[
              styles.captureButton,
              (!position || (gpsAccuracy && gpsAccuracy > 25)) && styles.captureButtonDisabled
            ]}
            onPress={handleCapture}
            disabled={isScanning || !position || (gpsAccuracy && gpsAccuracy > 25)}
          >
            {isScanning ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Image source={require('../../../assets/icons/camera_icon.png')} style={styles.captureIcon} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Overlay with Orb */}
      {(isScanning || showRetry) && (
        <View style={styles.loadingOverlay}>
          <ArchetypeOrb size={260} />
          <Text style={styles.loadingText}>{scanMessage}</Text>
          {showRetry && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setShowRetry(false);
                handleCapture();
              }}
            >
              <Text style={styles.retryButtonText}>Retry Scan</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  camera: {
    flex: 1,
  },
  sensorPanel: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 8,
    zIndex: 10,
  },
  sensorText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.monospace,
    marginBottom: 4,
  },
  sensorTextWarning: {
    color: APP_COLORS.error,
  },
  sensorTextGood: {
    color: APP_COLORS.success,
  },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -30,
    zIndex: 5,
  },
  crosshairH: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: theme.colors.white,
    opacity: 0.8,
  },
  crosshairV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    backgroundColor: theme.colors.white,
    opacity: 0.8,
  },
  resultPanel: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 16,
    borderRadius: 12,
    zIndex: 10,
  },
  resultTitle: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.xlg,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultText: {
    color: theme.colors.muted,
    fontSize: 14,
    marginBottom: 4,
  },
  controls: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  captureButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  captureButton: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureIcon: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  text: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.base,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    marginTop: 30,
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
  },
  offlineBanner: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(198, 40, 40, 0.9)',
    padding: 10,
    borderRadius: 8,
    zIndex: 14,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  verificationBanner: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    padding: 16,
    borderRadius: 12,
    zIndex: 15,
    alignItems: 'center',
  },
  verificationText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.base,
    fontWeight: 'bold',
  },
  verificationSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  // Lens switcher styles
  lensPanel: {
    position: 'absolute',
    top: 60,
    right: 20,
    alignItems: 'center',
    zIndex: 12,
  },
  lensButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lensButtonDisabled: {
    opacity: 0.4,
  },
  lensButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
  },
  lensHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
});
