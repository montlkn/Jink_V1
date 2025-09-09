import React from "react";
import { StyleSheet, Text, View } from "react-native";

const TimeSlider = ({ min, max, initialValue }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{min}</Text>
      <View style={styles.track}>
        <View style={styles.thumb} />
      </View>
      <Text style={styles.label}>{max}</Text>
      <Text style={[styles.label, styles.valueLabel]}>{initialValue}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: "60%",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  track: {
    width: 4,
    height: "100%",
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    position: "absolute",
  },
  thumb: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#000",
    position: "absolute",
    left: -10,
    top: "50%", // We will make this dynamic with a real slider library later
  },
  label: {
    fontSize: 16,
    color: "#888",
    fontWeight: "500",
  },
  valueLabel: {
    position: "absolute",
    left: 30,
    top: "49%",
    fontSize: 20,
    color: "#000",
    fontWeight: "bold",
  },
});

export default TimeSlider;
