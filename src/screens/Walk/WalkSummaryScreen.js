import React from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import TimeSlider from "../../components/walk/TimeSlider";
import WalkTypeButton from "../../components/walk/WalkTypeButton";

const WalkSetupScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TimeSlider min={5} max={90} initialValue={45} />
        <View style={styles.buttonsContainer}>
          <WalkTypeButton
            title="RANDOM"
            color="rgba(100, 255, 150, 0.3)"
            onPress={() => console.log("Start Random Walk")}
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
