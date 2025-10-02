import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Accelerometer, Magnetometer } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  PositionFusion,
  calculatePositionConfidence,
  detectMovementType,
} from '../../utils/sensorFusion';
import SimpleLoadingOrb from '../../components/SimpleLoadingOrb';

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [position, setPosition] = useState(null);
  const [heading, setHeading] = useState(0);
  const [altitude, setAltitude] = useState(null);
  const [floor, setFloor] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [movementType, setMovementType] = useState('stationary');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);

  const fusionRef = useRef(null);
  const lastGPSTime = useRef(Date.now());
  const cameraRef = useRef(null);

  const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

  // Initialize sensor fusion on mount
  useEffect(() => {
    try {
      fusionRef.current = new PositionFusion();
    } catch (error) {
      console.error('Error initializing PositionFusion:', error);
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
      console.error('Magnetometer error:', error);
    }
  }, []);

  // Accelerometer (Movement Detection)
  useEffect(() => {
    try {
      Accelerometer.setUpdateInterval(100);
      const accelSub = Accelerometer.addListener((data) => {
        const movement = detectMovementType(data);
        setMovementType(movement);
      });

      return () => accelSub.remove();
    } catch (error) {
      console.error('Accelerometer error:', error);
    }
  }, []);

  // Update confidence score
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceGPS = Date.now() - lastGPSTime.current;
      const conf = calculatePositionConfidence({
        hasGPS: position !== null,
        gpsAccuracy: 10,
        hasBarometer: altitude !== null,
        hasIMU: true,
        timeSinceLastGPS: timeSinceGPS,
      });
      setConfidence(conf);
    }, 1000);

    return () => clearInterval(interval);
  }, [position, altitude]);

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
            console.error('Error in barometer listener:', error);
          }
        });
      } catch (error) {
        console.error('Barometer setup failed:', error);
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
              lastGPSTime.current = Date.now();
            }
          );
        }
      } catch (error) {
        console.error('Error getting location:', error);
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

  // Handle photo capture
  const handleCapture = async () => {
    if (!cameraRef.current || !position) return;

    setIsScanning(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      // Create FormData for multipart/form-data upload
      const formData = new FormData();

      // Add photo as a file
      formData.append('photo', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'scan.jpg',
      });

      // Add required fields
      formData.append('gps_lat', position.latitude.toString());
      formData.append('gps_lng', position.longitude.toString());
      formData.append('compass_bearing', heading.toString());

      // Add optional fields
      formData.append('phone_pitch', '0');
      formData.append('phone_roll', '0');
      formData.append('altitude', (altitude || 0).toString());
      formData.append('floor', floor.toString());
      formData.append('confidence', Math.round(confidence).toString());
      formData.append('movement_type', movementType);
      formData.append('gps_accuracy', (position.accuracy || 10).toString());

      const response = await fetch(`${BACKEND_URL}/api/scan`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();

      // Navigate based on result
      if (data.building && data.building.name) {
        // Successfully identified building
        navigation.navigate('BuildingInfo', { buildingData: data.building });
      } else {
        // Could not identify building
        navigation.navigate('NotFound', {
          message: data.message || "We couldn't identify this building."
        });
      }
    } catch (error) {
      console.error('Scan failed:', error);
      // Navigate to NotFound screen on error
      navigation.navigate('NotFound', {
        message: 'An error occurred while scanning. Please try again.'
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

      {/* Sensor Panel */}
      <View style={styles.sensorPanel}>
        <Text style={styles.sensorText}>
          📍 {position ? `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}` : 'Acquiring...'}
        </Text>
        <Text style={styles.sensorText}>
          🧭 Heading: {Math.round(heading)}°
        </Text>
        <Text style={styles.sensorText}>
          📏 Floor: {floor} ({altitude ? `${altitude.toFixed(1)}m` : '—'})
        </Text>
        <Text style={styles.sensorText}>
          🎯 Confidence: {confidence}%
        </Text>
        <Text style={styles.sensorText}>
          🚶 {movementType}
        </Text>
      </View>

      {/* Crosshair */}
      <View style={styles.crosshair}>
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
      </View>

      {/* Capture Button */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.captureButton, !position && styles.captureButtonDisabled]}
          onPress={handleCapture}
          disabled={isScanning || !position}
        >
          {isScanning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>
      </View>

      {/* Loading Overlay with Orb */}
      {isScanning && (
        <View style={styles.loadingOverlay}>
          <SimpleLoadingOrb size={260} />
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
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
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
});
