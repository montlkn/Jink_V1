/*
  File: /src/screens/Walk/WalkSetupScreen.js
  Description: The screen where users configure and start their "Dérive" or walk.
*/
import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, View } from "react-native";
import { getNearbyPlaces } from "../../api/buildingsApi.js";
import TimeSlider from "../../components/walk/TimeSlider";
import WalkTypeButton from "../../components/walk/WalkTypeButton";
const WalkSetupScreen = ({ navigation }) => {
  const [location, setLocation] = useState({
    latitude: 40.7128,
    longitude: -74.006,
  }); // Default location
  const [time, SetTime] = useState(45);
  const [data, setData] = useState([]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission to access location was denied");
        return;
      }

      const {
        coords: { latitude, longitude },
      } = await Location.getCurrentPositionAsync({});

      setLocation({ latitude, longitude });
      console.log("📍 Current Location:", latitude, longitude);
    })();
  }, []);

  // Call my function from buildings api to get nearby places
  const handleClick = async () => {
    try {
      const nearbyPlaces = await getNearbyPlaces(
        location.latitude,
        location.longitude,
        1000
      ); // 1000 meters radius
      setData(nearbyPlaces);
    } catch (error) {
      console.error("Error fetching nearby places:", error);
    }
  };
  useEffect(() => {
    if (data?.length) {
      console.log("✅ Received nearby places:", data);
    }
  }, [data]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TimeSlider min={5} max={90} initialValue={time} />
        <View style={styles.buttonsContainer}>
          <WalkTypeButton
            title="RANDOM"
            color="rgba(100, 255, 150, 0.3)"
            onPress={() => handleClick()}
          />
          <WalkTypeButton
            title="PERSONALISED"
            color="rgba(150, 100, 255, 0.3)"
            onPress={() => console.log("Start Personalised Walk")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  buttonsContainer: {
    height: "50%",
    justifyContent: "space-around",
  },
});

export default WalkSetupScreen;
