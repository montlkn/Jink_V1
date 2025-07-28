/*
  File: /src/screens/Scan/CameraScreen.js
  Description: The screen that displays the live camera feed for building identification using expo-camera.
*/

import { Camera } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CameraScreen = ({ navigation }) => {
  console.log(navigation);
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.back);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const takePhoto = async () => {
    if (cameraRef.current && hasPermission) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          skipProcessing: true,
        });

        console.log("Photo taken:", photo.uri);
        Alert.alert("Photo Captured!", `Path: ${photo.uri}`);
        // You could navigate to a processing screen or store the URI
      } catch (error) {
        console.error("Failed to take photo", error);
        Alert.alert("Error", "Could not take photo.");
      }
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera permission.</Text>
        <Text style={styles.errorText}>
          Please grant access in your device settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        type={type}
        ratio="16:9"
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
    backgroundColor: "#000",
  },
  errorText: {
    color: "white",
    textAlign: "center",
    marginTop: 20,
  },
  bottomControls: {
    position: "absolute",
    bottom: 50,
    width: "100%",
    alignItems: "center",
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
});

export default CameraScreen;
