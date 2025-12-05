import { useAuth } from '@/auth/authProvider';
import { questsActions } from '@/features/quests';
import { log } from '@/lib/log';
import { screens } from "@/navigation/routes";
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Accelerometer, Magnetometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ScanScreen({ navigation, route }) {
  const { session } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [position, setPosition] = useState(null);
  const [heading, setHeading] = useState(0);
  const [pitch, setPitch] = useState(0); // Phone pitch for cone of vision
  const [altitude, setAltitude] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState(null); // GPS accuracy in meters
  const [movementType, setMovementType] = useState('stationary');
  const [isScanning, setIsScanning] = useState(false);
  const [nearbyBuildings, setNearbyBuildings] = useState([]); // For cone of vision verification

  // Verification mode params from WalkNav
  const verificationMode = route.params?.verificationMode || false;
  const expectedBuilding = route.params?.expectedBuilding;
  const walkId = route.params?.walkId;
  // const _returnScreen = route.params?.returnScreen;

  const fusionRef = useRef(null);
  const lastGPSTime = useRef(Date.now());
  const cameraRef = useRef(null);

  const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

  // Initialize sensor fusion on mount
  useEffect(() => {
    try {
      fusionRef.current = new PositionFusion();
    } catch (error) {
      log.error('[scan] Error initializing PositionFusion', error);
    }
  }, []);

  // Magnetometer (Compass)
  useEffect(() => {
    try {
      Magnetometer.setUpdateInterval(250);
      const magSub = Magnetometer.addListener((data) => {
        const { x, y } = data;
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        angle = 90 - angle;
        const normalized = ((angle % 360) + 360) % 360;
        setHeading(normalized);
      });

      return () => magSub.remove();
    } catch (error) {
      log.error('[scan] Magnetometer error', error);
    }
  }, []);

  // Accelerometer (Movement Detection + Pitch)
  useEffect(() => {
    try {
      Accelerometer.setUpdateInterval(100);
      const accelSub = Accelerometer.addListener((data) => {
        const movement = detectMovementType(data);
        setMovementType(movement);

        // Calculate pitch (phone tilt angle)
        // pitch = atan2(y, sqrt(x² + z²)) * 180/π
        // Positive = tilted up, Negative = tilted down
        const { x, y, z } = data;
        const calculatedPitch = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
        setPitch(calculatedPitch);
      });

      return () => accelSub.remove();
    } catch (error) {
      log.error('[scan] Accelerometer error', error);
    }
  }, []);

  // Update confidence score
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceGPS = Date.now() - lastGPSTime.current;
      const conf = calculatePositionConfidence({
        hasGPS: position !== null,
        gpsAccuracy: gpsAccuracy || 50, // Use actual GPS accuracy
        hasBarometer: false,
        hasIMU: true,
        timeSinceLastGPS: timeSinceGPS,
      });
      setConfidence(conf);
    }, 1000);

    return () => clearInterval(interval);
  }, [position, gpsAccuracy]);

  // Barometer (Altitude/Floor detection) - DISABLED
  // Crashes on this device - floor will default to 0
  // Not essential for building identification
  /*
  useEffect(() => {
    let subscription = null;

    const setupBarometer = () => {
      try {
        Barometer.setUpdateInterval(1000);
        subscription = Barometer.addListener((barometerData) => {
          try {
            const fusion = fusionRef.current;
            if (!fusion) return;
            const { pressure } = barometerData;
            if (pressure) {
              const altData = fusion.updateBarometer(pressure);
              setAltitude(altData.relativeAltitude);
              setFloor(altData.floor);
            }
          } catch (error) {
          log.error('[scan] Error in barometer listener', error);
          }
        });
      } catch (error) {
        log.error('[scan] Barometer setup failed', error);
      }
    };

    const timer = setTimeout(setupBarometer, 500);
    return () => {
      clearTimeout(timer);
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);
  **/

  // Get location and watch for updates
  useEffect(() => {
    if (!fusionRef.current) {
      return;
    }

    let locationSubscription = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
          // Get initial position
          const initial = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });

          const fusion = fusionRef.current;
          if (fusion) {
            fusion.updateGPS(
              initial.coords.latitude,
              initial.coords.longitude,
              initial.coords.altitude,
              initial.coords.accuracy
            );
          }

          setPosition(initial.coords);
          setGpsAccuracy(initial.coords.accuracy);
          setAltitude(initial.coords.altitude ?? null);
          lastGPSTime.current = Date.now();

          // Watch for position updates
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 1000,
              distanceInterval: 1,
            },
            (loc) => {
              const fusion = fusionRef.current;
              if (fusion) {
                fusion.updateGPS(
                  loc.coords.latitude,
                  loc.coords.longitude,
                  loc.coords.altitude,
                  loc.coords.accuracy
                );
              }

              setPosition(loc.coords);
              setGpsAccuracy(loc.coords.accuracy);
              setAltitude(loc.coords.altitude ?? null);
              lastGPSTime.current = Date.now();
            }
          );
        }
      } catch (error) {
      log.error('[scan] Error getting location', error);
      }
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Fetch nearby buildings for cone of vision verification (verification mode only)
  useEffect(() => {
    if (!verificationMode || !position) return;

    const fetchNearby = async () => {
      try {
        const buildings = await fetchNearbyBuildingsFromDB({
          latitude: position.latitude,
          longitude: position.longitude,
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
  }, [verificationMode, position]);

  // Handle photo capture
  const handleCapture = async () => {
    if (!cameraRef.current || !position) return;

    setIsScanning(true);
    let photo = null; // Declare in outer scope so it's accessible in error handling

    try {
      photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
      });

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

      // Normal scan mode - try CLIP/multi-tier verification first, fallback to backend GPS
      log.info('[scan] Starting parallel scan (GPS lookups + CLIP)');

      // 1. Start GPS-based lookups immediately (Parallel Task)
      const gpsLookupPromise = (async () => {
        try {
          // Tier 2: Check user-contributed buildings table (by GPS proximity)
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
          // Tier 3: Try reverse geocoding + address lookup
          log.info('[scan] Starting address lookup');
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: position.latitude,
            longitude: position.longitude,
          });

          if (reverseGeocode && reverseGeocode.length > 0) {
            const geo = reverseGeocode[0];
            const streetAddress = `${geo.streetNumber || ''} ${geo.street || ''}`.trim();
            
            if (streetAddress) {
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

      // 2. Start CLIP verification (Parallel Task - needs photo)
      const clipPromise = verifyBuilding({
        photo,
        position,
        heading,
        pitch,
        expectedBuilding: null,
        nearbyBuildings: nearbyBuildings || [],
      });

      // 3. Race them! Prioritize GPS if fast, but wait for CLIP if GPS fails
      // We create a race where if GPS returns a match, we use it.
      // If GPS returns null, we wait for CLIP.
      
      const result = await Promise.race([
        gpsLookupPromise.then(res => res ? res : clipPromise),
        clipPromise
      ]);

      // Handle the winner
      if (result && result.type === 'contributed') {
        const contributedMatch = result.data;
        log.info('[scan] FAST MATCH: User-contributed building found!', {
            building: contributedMatch.name,
            source: 'user_contribution',
        });

        // Award XP
        await questsActions.awardXp({ amount: 50, source: 'building_scan' });

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

      if (result && result.type === 'address') {
        const addressMatch = result.data;
        log.info('[scan] FAST MATCH: Address lookup match found!', {
            building: addressMatch.name,
            address: result.address,
        });

        // Award XP
        await questsActions.awardXp({ amount: 50, source: 'building_scan' });

        // Track event
        try {
            if (session?.user?.id && addressMatch.bbl) {
                await createAestheticEvent({
                userId: session.user.id,
                eventType: 'building_scan',
                eventSubtype: 'address_match',
                buildingBbl: addressMatch.bbl,
                payload: {
                    scan_method: 'address_lookup',
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

      // If we are here, it means either CLIP won, or GPS failed and we fell back to CLIP
      // Check CLIP result (which might be the result of the race or awaited after GPS failed)
      const clipResult = result && result.verified ? result : await clipPromise;

      if (clipResult && clipResult.verified && clipResult.buildingData) {
        log.info('[scan] CLIP match found!', {
          building: clipResult.buildingData.name,
          method: clipResult.method,
          confidence: clipResult.confidence,
        });

        // Award XP for successful scan
        await questsActions.awardXp({ amount: 50, source: 'building_scan' });

        // Track aesthetic event
        try {
          if (session?.user?.id && clipResult.buildingData?.bbl) {
            await createAestheticEvent({
              userId: session.user.id,
              eventType: 'building_scan',
              eventSubtype: 'clip_match',
              buildingBbl: clipResult.buildingData.bbl,
              payload: {
                scan_method: clipResult.method,
                confidence: clipResult.confidence,
              },
            });
          }
        } catch (error) {
          log.warn('[scan] Failed to create aesthetic event', error);
        }

        navigation.navigate(screens.BuildingInfo, { buildingData: clipResult.buildingData });
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
              await questsActions.awardXp({ amount: 50, source: 'building_scan' });

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
        await questsActions.awardXp({ amount: 50, source: 'building_scan' });

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

          // Then try the backend API for synced contributions
          const contributionsResponse = await fetch(
            `${BACKEND_URL}/api/contributions/by-location?gps_lat=${position.latitude}&gps_lng=${position.longitude}&radius_meters=50`
          );
          const contributionsData = await contributionsResponse.json();

          if (contributionsData.contributions && contributionsData.contributions.length > 0) {
            // Found user-contributed data! Show it to the user
            const contribution = contributionsData.contributions[0];
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

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      />

      {/* Verification Mode Banner */}
      {verificationMode && expectedBuilding && (
        <View style={styles.verificationBanner}>
          <Text style={styles.verificationText}>📍 Verify: {expectedBuilding.name}</Text>
          <Text style={styles.verificationSubtext}>Scan the building to confirm you're here</Text>
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
              color="#FFFFFF" 
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
              <ActivityIndicator color="#fff" />
            ) : (
              <Image source={require('../../../assets/icons/camera_icon.png')} style={styles.captureIcon} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Overlay with Orb */}
      {isScanning && (
        <View style={styles.loadingOverlay}>
          <ArchetypeOrb size={260} />
          <Text style={styles.loadingText}>Identifying building...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  sensorTextWarning: {
    color: '#FF6B6B', // Red for low accuracy
  },
  sensorTextGood: {
    color: '#51CF66', // Green for good accuracy
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
    backgroundColor: '#fff',
    opacity: 0.8,
  },
  crosshairV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    backgroundColor: '#fff',
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
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultText: {
    color: '#ccc',
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
    color: '#fff',
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 30,
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
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verificationSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
});
