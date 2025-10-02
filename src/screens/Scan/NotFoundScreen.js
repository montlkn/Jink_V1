import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

export default function NotFoundScreen({ route, navigation }) {
  const { message } = route.params || {};

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🏗️</Text>
        <Text style={styles.title}>Building Not Found</Text>
        <Text style={styles.message}>
          {message || "We couldn't identify this building. Please try again with a clearer view or different angle."}
        </Text>

        <View style={styles.tipSection}>
          <Text style={styles.tipTitle}>Tips for better results:</Text>
          <Text style={styles.tipText}>• Get closer to the building</Text>
          <Text style={styles.tipText}>• Ensure good lighting</Text>
          <Text style={styles.tipText}>• Capture distinctive features</Text>
          <Text style={styles.tipText}>• Make sure you're in NYC</Text>
        </View>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.navigate("Main", { screen: "Camera" })}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate("Main", { screen: "Home" })}
        >
          <Text style={styles.homeButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  tipSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    marginBottom: 30,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  tipText: {
    fontSize: 15,
    color: "#666",
    marginBottom: 8,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  homeButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  homeButtonText: {
    color: "#333",
    fontSize: 18,
    fontWeight: "600",
  },
});
