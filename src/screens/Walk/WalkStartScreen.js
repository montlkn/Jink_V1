import React from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const WalkStartScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text>PRESS ME AND</Text>

        <Pressable
          onPress={() => {
            console.log("Starting Walk Setup");
            navigation.navigate("WalkSetupScreen");
          }}
        >
          <Image source={require("../../../assets/images/ellipse.png")} />
        </Pressable>
        <Text>LETS TAKE A WALK</Text>
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
    paddingVertical: 20,
  },
});

export default WalkStartScreen;
