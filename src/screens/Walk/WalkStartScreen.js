import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef } from "react";
import {
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ArchetypeOrbScene from "../../components/three/ArchetypeOrbScene";
import { useOrbTransition } from "../../state/orbTransitionContext";

const WalkStartScreen = ({ navigation }) => {
  const { orbData } = useOrbTransition();
  const entryScale = useRef(new Animated.Value(0.85)).current;

  useFocusEffect(
    useCallback(() => {
      entryScale.setValue(0.85);
      Animated.spring(entryScale, {
        toValue: 1,
        speed: 14,
        bounciness: 6,
        useNativeDriver: true,
      }).start();

      return () => {
        entryScale.stopAnimation();
      };
    }, [entryScale])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View style={{ transform: [{ scale: entryScale }] }}>
          <ArchetypeOrbScene archetypeData={orbData} size={320} />
        </Animated.View>
        <Pressable
          style={styles.startButton}
          onPress={() => {
            navigation.navigate("WalkSetupScreen");
          }}
        >
          <Text style={styles.startText}>Start Jink...</Text>
        </Pressable>
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
  startButton: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 28,
    backgroundColor: "#111",
  },
  startText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
});

export default WalkStartScreen;
