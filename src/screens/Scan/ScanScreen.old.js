import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Magnetometer, Barometer, Accelerometer, Gyroscope } from 'expo-sensors';
import * as Device from 'expo-device';
import {
  PositionFusion,
  calculatePositionConfidence,
  detectMovementType,
} from '../../utils/sensorFusion';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const IS_SIMULATOR = !Device.isDevice;

export default function ScanScreen() {
  console.log('ScanScreen: Component rendering');

  // Camera & Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef(null);

  // Sensor data
  const [position, setPosition] = useState(null);
  const [heading, setHeading] = useState(0);
  const [altitude, setAltitude] = useState(null);
  const [floor, setFloor] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [movementType, setMovementType] = useState('stationary');

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);

  // Sensor fusion instance - wrapped in try/catch
  const fusionRef = useRef(null);
  const lastGPSTime = useRef(Date.now());

  // Initialize fusion safely
  useEffect(() => {
    try {
      console.log('ScanScreen: Initializing sensor fusion');
      fusionRef.current = new PositionFusion();
    } catch (error) {
      console.error('ScanScreen: Error initializing sensor fusion:', error);
    }
  }, []);

  // Request permissions
  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(locationStatus === 'granted');
    })();
  }, [cameraPermission, requestCameraPermission]);

  // GPS tracking
  useEffect(() => {
    if (!locationPermission) return;

    let locationSub;
    (async () => {
      // Initial position
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const fusion = fusionRef.current;
      fusion.updateGPS(
        initial.coords.latitude,
        initial.coords.longitude,
        initial.coords.altitude,
        initial.coords.accuracy
      );

      setPosition({
        latitude: initial.coords.latitude,
        longitude: initial.coords.longitude,
      });

      lastGPSTime.current = Date.now();

      // Watch position
      locationSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (loc) => {
          const fused = fusion.updateGPS(
            loc.coords.latitude,
            loc.coords.longitude,
            loc.coords.altitude,
            loc.coords.accuracy
          );

          setPosition(fused);
          lastGPSTime.current = Date.now();
        }
      );
    })();

    return () => locationSub?.remove();
  }, [locationPermission]);

  // Compass (Magnetometer)
  useEffect(() => {
    if (!locationPermission) return;

    Magnetometer.setUpdateInterval(250);
    const magSub = Magnetometer.addListener((data) => {
      const { x, y } = data;
      let angle = Math.atan2(y, x) * (180 / Math.PI);
      angle = 90 - angle;
      const normalized = ((angle % 360) + 360) % 360;
      setHeading(normalized);
    });

    return () => magSub.remove();
  }, [locationPermission]);

  // Barometer (Altitude/Floor detection)
  useEffect(() => {
    if (!locationPermission) return;

    Barometer.isAvailableAsync().then((available) => {
      if (!available) {
        console.warn('Barometer not available on this device');
        return;
      }

      Barometer.setUpdateInterval(500);
      const baroSub = Barometer.addListener((data) => {
        const fusion = fusionRef.current;
        const altData = fusion.updateBarometer(data.pressure * 10); // Convert to hPa

        setAltitude(altData.relativeAltitude);
        setFloor(altData.floor);
      });

      return () => baroSub?.remove();
    });
  }, [locationPermission]);

  // IMU (Dead Reckoning + Movement Detection)
  useEffect(() => {
    if (!locationPermission) return;

    let accelSub, gyroSub;

    Accelerometer.setUpdateInterval(100);
    Gyroscope.setUpdateInterval(100);

    accelSub = Accelerometer.addListener((data) => {
      // Detect movement type
      const movement = detectMovementType(data);
      setMovementType(movement);

      // Update fusion with IMU data (dead reckoning)
      const fusion = fusionRef.current;
      const deadReckoned = fusion.updateIMU(data, { x: 0, y: 0, z: 0 });

      // Only use dead reckoning if GPS is stale (>5 seconds)
      const timeSinceGPS = Date.now() - lastGPSTime.current;
      if (deadReckoned && timeSinceGPS > 5000) {
        setPosition(deadReckoned);
      }
    });

    gyroSub = Gyroscope.addListener((data) => {
      // Gyroscope data could be used for better orientation tracking
      // For now, we rely on magnetometer for heading
    });

    return () => {
      accelSub?.remove();
      gyroSub?.remove();
    };
  }, [locationPermission]);

  // Update confidence score
  useEffect(() => {
    const timeSinceGPS = Date.now() - lastGPSTime.current;
    const conf = calculatePositionConfidence({
      hasGPS: position !== null,
      gpsAccuracy: 10, // Would get from actual GPS data
      hasBarometer: altitude !== null,
      hasIMU: true,
      timeSinceLastGPS: timeSinceGPS,
    });
    setConfidence(conf);
  }, [position, altitude]);

  // Calibrate barometer on first GPS lock
  useEffect(() => {
    if (position && !fusionRef.current.groundAltitude) {
      // Trigger calibration with next barometer reading
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }).then(
        (loc) => {
          if (loc.coords.altitude) {
            console.log('Calibrating barometer with GPS altitude:', loc.coords.altitude);
          }
        }
      );
    }
  }, [position]);

  const handleCapture = async () => {
    if (!cameraRef.current || !position) return;

    setIsScanning(true);

    try {
      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      // Prepare scan payload with full sensor data
      const scanData = {
        latitude: position.latitude,
        longitude: position.longitude,
        bearing: heading,
        altitude: altitude || 0,
        floor: floor,
        pitch: 0, // Would get from device orientation
        roll: 0,
        confidence: confidence,
        movement_type: movementType,
        image: photo.base64,
      };

      // Send to backend
      const response = await fetch(`${BACKEND_URL}/api/identify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scanData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setResult(data);

      console.log('Scan result:', data);
    } catch (error) {
      console.error('Scan failed:', error);
      Alert.alert('Scan Error', error.message);
    } finally {
      setIsScanning(false);
    }
  };

  if (!cameraPermission || locationPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!cameraPermission.granted || !locationPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera and Location permissions required</Text>
        <TouchableOpacity
          style={{ marginTop: 20, padding: 10, backgroundColor: '#333', borderRadius: 5 }}
          onPress={requestCameraPermission}
        >
          <Text style={styles.text}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Simulator fallback
  if (IS_SIMULATOR) {
    return (
      <View style={styles.container}>
        <View style={styles.simulatorPlaceholder}>
          <Text style={styles.simulatorText}>📷 Camera Preview</Text>
          <Text style={styles.simulatorSubtext}>
            Camera scanning is not available in the iOS Simulator.
          </Text>
          <Text style={styles.simulatorSubtext}>
            Please test on a real device to use this feature.
          </Text>

          {/* Show sensor data if available */}
          {position && (
            <View style={styles.sensorPanel}>
              <Text style={styles.sensorText}>
                📍 {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
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
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
      />

      {/* Sensor overlay - positioned absolutely on top of camera */}
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

      {/* Result */}
      {result && (
        <View style={styles.resultPanel}>
          <Text style={styles.resultTitle}>{result.building?.name || 'Unknown Building'}</Text>
          <Text style={styles.resultText}>
            {result.building?.address}
          </Text>
          <Text style={styles.resultText}>
            Confidence: {(result.confidence * 100).toFixed(1)}%
          </Text>
        </View>
      )}

      {/* Capture button */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.captureButton, !cameraReady && styles.captureButtonDisabled]}
          onPress={handleCapture}
          disabled={!cameraReady || isScanning || !position}
        >
          {isScanning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sensorPanel: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 8,
    zIndex: 10,
    pointerEvents: 'none',
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
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
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
    textAlign: 'center',
  },
  simulatorPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  simulatorText: {
    color: '#fff',
    fontSize: 48,
    marginBottom: 20,
  },
  simulatorSubtext: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
});