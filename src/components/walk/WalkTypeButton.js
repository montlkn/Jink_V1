import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

const WalkTypeButton = ({ title, color, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 15,
    minWidth: 150,
  },
  buttonText: {
    color: "#000",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});

export default WalkTypeButton;
