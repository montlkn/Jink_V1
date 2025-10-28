import React from "react";
import { SafeAreaView, StyleSheet, Text } from "react-native";

const ListDetailScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>List details coming soon.</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F8F8",
    padding: 24,
  },
  text: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
});

export default ListDetailScreen;
