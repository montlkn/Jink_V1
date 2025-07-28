/*
  File: /src/screens/Scan/CameraScreen.js
  Description: The screen that displays the live camera feed for building identification.
*/
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { Ionicons } from '@expo/vector-icons';

const CameraScreen = ({ navigation }) => {
  const camera = useRef(null);
  const devices = useCameraDevices();
  const device = devices.back; // Use the back camera

  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'authorized');
    })();
  }, []);

  const takePhoto = async () => {
    if (camera.current && hasPermission) {
      try {
        const photo = await camera.current.takePhoto({
          qualityPrioritization: 'speed',
          flash: 'off',
          enableShutterSound: false
        });
        console.log('Photo taken:', photo.path);
        // Next, we would navigate to a processing screen with the photo path
        // For now, we just log it.
        Alert.alert("Photo Captured!", `Path: ${photo.path}`);
      } catch (error) {
        console.error("Failed to take photo", error);
        Alert.alert("Error", "Could not take photo.");
      }
    }
  };

  if (device == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Loading Camera...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera permission.</Text>
        <Text style={styles.errorText}>Please grant camera access in your device settings.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />
      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
});

export default CameraScreen;
