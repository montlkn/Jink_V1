import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
const WalkNavScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text> here are your builings</Text>
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

export default WalkNavScreen;
