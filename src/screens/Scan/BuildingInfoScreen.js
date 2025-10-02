import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";

export default function BuildingInfoScreen({ route, navigation }) {
  const { buildingData } = route.params || {};

  if (!buildingData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No building data available</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{buildingData.name || "Building"}</Text>
        {buildingData.address && (
          <Text style={styles.address}>{buildingData.address}</Text>
        )}
      </View>

      {buildingData.image_url && (
        <Image source={{ uri: buildingData.image_url }} style={styles.image} />
      )}

      <View style={styles.infoSection}>
        {buildingData.architect && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Architect:</Text>
            <Text style={styles.infoValue}>{buildingData.architect}</Text>
          </View>
        )}

        {buildingData.year_built && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Year Built:</Text>
            <Text style={styles.infoValue}>{buildingData.year_built}</Text>
          </View>
        )}

        {buildingData.style && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Architectural Style:</Text>
            <Text style={styles.infoValue}>{buildingData.style}</Text>
          </View>
        )}

        {buildingData.height && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Height:</Text>
            <Text style={styles.infoValue}>{buildingData.height}</Text>
          </View>
        )}

        {buildingData.floors && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Floors:</Text>
            <Text style={styles.infoValue}>{buildingData.floors}</Text>
          </View>
        )}

        {buildingData.confidence && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Confidence:</Text>
            <Text style={styles.infoValue}>
              {Math.round(buildingData.confidence)}%
            </Text>
          </View>
        )}
      </View>

      {buildingData.description && (
        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionTitle}>Description</Text>
          <Text style={styles.description}>{buildingData.description}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => navigation.navigate("Main", { screen: "Camera" })}
      >
        <Text style={styles.doneButtonText}>Scan Another Building</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
  },
  image: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: "#f0f0f0",
  },
  infoSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    width: 140,
  },
  infoValue: {
    fontSize: 16,
    color: "#666",
    flex: 1,
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#444",
  },
  doneButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 40,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginTop: 40,
  },
  backButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
