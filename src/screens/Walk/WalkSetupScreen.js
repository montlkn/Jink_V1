/*
  File: /src/screens/Walk/WalkSetupScreen.js
  Description: The screen where users configure and start their "Dérive" or walk.
*/
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, View } from "react-native";
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
      console.log("Requesting location permissions...");
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log("Location permission status:", status);
      if (status !== "granted") {
        Alert.alert("Permission to access location was denied");
        return;
      }

      const {
        coords: { latitude, longitude },
      } = await Location.getCurrentPositionAsync({});
      console.log("Current location:", { latitude, longitude });
      setLocation({ latitude, longitude });
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
      navigation.navigate("WalkNavScreen", {
        places: nearbyPlaces,
        location: location,
      });
    } catch (error) {
      console.error("Error fetching nearby places:", error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TimeSlider min={0} max={90} initialValue={time} setValue={SetTime} />
        <View style={styles.buttonsContainer}>
          <WalkTypeButton
            title="WALK"
            color="rgba(100, 255, 150, 0.3)"
            onPress={() => handleClick()}
          />
          <Text>{time}</Text>
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
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  buttonsContainer: {
    height: "20%",
    justifyContent: "space-around",
  },
});

export default WalkSetupScreen;
