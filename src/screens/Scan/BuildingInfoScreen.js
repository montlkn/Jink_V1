import { log } from "@/lib/log";
import { screens } from "@/navigation/routes";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export default function BuildingInfoScreen({ route, navigation }) {
  const { buildingData } = route.params || {};
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedBin, setSelectedBin] = useState(buildingData?.bin || null);

  const handleConfirmBuilding = async (bin) => {
    if (!buildingData?.scan_id) {
      log.error('[BuildingInfo] No scan_id available for confirmation');
      return;
    }

    setIsConfirming(true);
    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append('confirmed_bin', bin);
      formData.append('confirmation_time_ms', (Date.now() - startTime).toString());

      const response = await fetch(`${BACKEND_URL}/api/scans/${buildingData.scan_id}/confirm`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      log.info('[BuildingInfo] Building confirmed:', result);

      setIsConfirmed(true);
      setSelectedBin(bin);

      // Show success message
      if (result.reembedding?.added_to_references) {
        Alert.alert(
          'Building Confirmed',
          'Thanks! Your photo has been added to our database to improve future scans.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Building Confirmed', [{ text: 'OK' }]);
      }
    } catch (error) {
      log.error('[BuildingInfo] Failed to confirm building:', error);
      Alert.alert('Error', 'Failed to confirm building. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

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

  // Check if this is a scan result (has bin, scan_id) vs old format (has name)
  const isScanResult = buildingData.bin && buildingData.scan_id;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {buildingData.name || buildingData.address || "Building Identified"}
        </Text>
        {buildingData.address && !buildingData.name && (
          <Text style={styles.address}>{buildingData.address}</Text>
        )}
      </View>

      {buildingData.image_url && (
        <Image source={{ uri: buildingData.image_url }} style={styles.image} />
      )}

      {/* Scan Result Info */}
      {isScanResult && (
        <View style={styles.scanResultSection}>
          <Text style={styles.sectionTitle}>Scan Result</Text>

          <View style={styles.confidenceBar}>
            <View style={[styles.confidenceFill, { width: `${buildingData.confidence}%` }]} />
          </View>
          <Text style={styles.confidenceText}>
            {Math.round(buildingData.confidence)}% Match Confidence
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BIN:</Text>
            <Text style={styles.infoValue}>{buildingData.bin}</Text>
          </View>

          {buildingData.bbl && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>BBL:</Text>
              <Text style={styles.infoValue}>{buildingData.bbl}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>{buildingData.address}</Text>
          </View>

          {buildingData.processing_time_ms && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Processing:</Text>
              <Text style={styles.infoValue}>{buildingData.processing_time_ms}ms</Text>
            </View>
          )}
        </View>
      )}

      {/* Alternative Matches (if show_picker is true) */}
      {isScanResult && buildingData.show_picker && buildingData.all_matches?.length > 1 && (
        <View style={styles.alternativesSection}>
          <Text style={styles.sectionTitle}>Not the right building?</Text>
          <Text style={styles.alternativesHint}>Select the correct one below:</Text>

          {buildingData.all_matches.slice(1).map((match, index) => (
            <TouchableOpacity
              key={match.bin}
              style={[
                styles.alternativeItem,
                selectedBin === match.bin && styles.alternativeItemSelected
              ]}
              onPress={() => setSelectedBin(match.bin)}
              disabled={isConfirmed}
            >
              <View style={styles.alternativeInfo}>
                <Text style={styles.alternativeAddress}>{match.address}</Text>
                <Text style={styles.alternativeConfidence}>
                  {Math.round(match.confidence)}% confidence
                </Text>
              </View>
              {selectedBin === match.bin && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Confirmation Button */}
      {isScanResult && !isConfirmed && (
        <TouchableOpacity
          style={[styles.confirmButton, isConfirming && styles.confirmButtonDisabled]}
          onPress={() => handleConfirmBuilding(selectedBin || buildingData.bin)}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              Confirm This Building
            </Text>
          )}
        </TouchableOpacity>
      )}

      {isConfirmed && (
        <View style={styles.confirmedBadge}>
          <Text style={styles.confirmedText}>✓ Confirmed</Text>
        </View>
      )}

      {/* Legacy building info fields */}
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

        {!isScanResult && buildingData.confidence && (
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
        onPress={() => navigation.navigate(screens.Main, { screen: screens.WalkCamera })}
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
  scanResultSection: {
    backgroundColor: "#f0f8ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
    marginBottom: 12,
  },
  alternativesSection: {
    backgroundColor: "#fff3e0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FF9800",
  },
  alternativesHint: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  alternativeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  alternativeItemSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f8ff",
  },
  alternativeInfo: {
    flex: 1,
  },
  alternativeAddress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  alternativeConfidence: {
    fontSize: 12,
    color: "#666",
  },
  checkmark: {
    fontSize: 20,
    color: "#007AFF",
    fontWeight: "bold",
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  confirmedBadge: {
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  confirmedText: {
    color: "#4CAF50",
    fontSize: 18,
    fontWeight: "600",
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
