import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, View } from "react-native";
import { getNearbyPlaces } from "../../api/buildingsApi";
import TimerDisplay from "../../components/walk/TimerDisplay";
import TimeSlider from "../../components/walk/TimeSlider";

const WalkStartScreen = ({ navigation }) => {
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
      console.log(nearbyPlaces);
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
        <View style={styles.clockWrapper}>
          <TimerDisplay value={time} label="minutes" />
        </View>
        <View style={styles.sliderWrapper}>
          <TimeSlider
            min={0}
            max={90}
            initialValue={time}
            setValue={SetTime}
            onPress={handleClick}
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
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  clockWrapper: {
    alignItems: "center",
  },
  sliderWrapper: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
});

export default WalkStartScreen;
