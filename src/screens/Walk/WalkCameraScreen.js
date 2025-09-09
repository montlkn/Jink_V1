import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import React, { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function WalkCameraScreen() {
  const cameraRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [hasMediaPerm, setHasMediaPerm] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [isTaking, setIsTaking] = useState(false);

  useEffect(() => {
    (async () => {
      const med = await MediaLibrary.requestPermissionsAsync();
      setHasMediaPerm(med.status === "granted");
      if (!permission?.granted) await requestPermission();
    })();
  }, [permission, requestPermission]);

  if (!permission)
    return (
      <View style={styles.center}>
        <Text>Checking permissions…</Text>
      </View>
    );
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Camera permission needed.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || isTaking) return;
    try {
      setIsTaking(true);
      const result = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setPhoto(result);
    } finally {
      setIsTaking(false);
    }
  };

  const savePhoto = async () => {
    if (photo && hasMediaPerm) {
      await MediaLibrary.saveToLibraryAsync(photo.uri);
    }
  };

  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo.uri }} style={styles.preview} />
        <View style={styles.actions}>
          <TouchableOpacity style={styles.btn} onPress={() => setPhoto(null)}>
            <Text style={styles.btnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={savePhoto}>
            <Text style={styles.btnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🔒 Always back camera */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        ratio="16:9"
      />
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.shutter}
          onPress={takePicture}
          disabled={isTaking}
        >
          <Text style={styles.shutterText}>{isTaking ? "…" : "●"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  controls: {
    position: "absolute",
    bottom: 32,
    width: "100%",
    alignItems: "center",
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  shutterText: { color: "#fff", fontSize: 28, marginTop: -2 },
  preview: { flex: 1, resizeMode: "contain" },
  actions: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  btn: {
    backgroundColor: "#111",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  btnText: { color: "#fff", fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
