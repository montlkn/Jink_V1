/*
  File: /src/screens/Walk/WalkSetupScreen.js
  Description: The screen where users configure and start their "Dérive" or walk.
*/
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, View } from "react-native";
import { walksActions } from "@/features/walks";
import { log } from "@/lib/log";
import TimeSlider from "../../components/walk/TimeSlider";
import WalkTypeButton from "../../components/walk/WalkTypeButton";
import { screens } from "@/navigation/routes";

const WalkSetupScreen = ({ navigation }) => {
  const [location, setLocation] = useState({
    latitude: 40.7128,
    longitude: -74.006,
  }); // Default location

  const [time, setTime] = useState(45);

  useEffect(() => {
    (async () => {
      log.debug("[walkSetup] Requesting location permissions...");
      const { status } = await Location.requestForegroundPermissionsAsync();
      log.debug("[walkSetup] Location permission status", status);
      if (status !== "granted") {
        Alert.alert("Permission to access location was denied");
        return;
      }

      const {
        coords: { latitude, longitude },
      } = await Location.getCurrentPositionAsync({});
      log.debug("[walkSetup] Current location", { latitude, longitude });
      setLocation({ latitude, longitude });
    })();
  }, []);

  // Call my function from buildings api to get nearby places
  const handleClick = async () => {
    try {
      const nearbyPlaces = await walksActions.fetchNearbyBuildings({
        latitude: location.latitude,
        longitude: location.longitude,
        radius: 1000,
      }); // 1000 meters radius
      navigation.navigate(screens.WalkNav, {
        places: nearbyPlaces,
        location,
        durationMinutes: time,
      });
    } catch (error) {
      log.error("Error fetching nearby places:", error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TimeSlider min={5} max={90} initialValue={time} setValue={setTime} />
        <View style={styles.buttonsContainer}>
          <WalkTypeButton
            title="RANDOM"
            color="rgba(100, 255, 150, 0.3)"
            onPress={() => handleClick()}
          />
          <WalkTypeButton
            title="PERSONALISED"
            color="rgba(150, 100, 255, 0.3)"
            onPress={() => log.debug("Start Personalised Walk")}
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
