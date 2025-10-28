import React from "react";
import { SafeAreaView, StyleSheet, Text } from "react-native";

const ContributionScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Share Your Discovery</Text>
      <Text style={styles.subtitle}>
        This screen will let you submit building photos and notes soon.
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F8F8",
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
  },
});

export default ContributionScreen;
