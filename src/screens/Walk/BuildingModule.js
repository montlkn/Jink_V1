import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function BuildingDetailsScreen({ route }) {
  const { building } = route.params;
  const [imageError, setImageError] = useState(false);

  const name = building.des_addres ?? "Unknown";
  const address = building.des_addres ?? "Unknown address";
  const photoUri =
    !imageError && building.photo_url ? { uri: building.photo_url } : undefined;

  const materials = useMemo(() => {
    return [building.mat_prim, building.mat_sec, building.mat_third]
      .filter(Boolean)
      .join(" · ");
  }, [building.mat_prim, building.mat_sec, building.mat_third]);

  const infoRows = [
    { label: "Architect", value: building.arch_build },
    { label: "Year", value: building.date_combo },
    { label: "Primary Style", value: building.style_prim },
    { label: "Historic District", value: building.hist_dist },
    { label: "Original Use", value: building.use_orig },
    { label: "Building Type", value: building.build_type },
    { label: "Materials", value: materials || undefined },
  ].filter((r) => r.value && r.value.trim().length > 0);

  const openInMaps = async () => {
    if (building.lat == null || building.lng == null) {
      Alert.alert("Location unavailable", "No coordinates for this place.");
      return;
    }
    const { lat, lng } = building;
    const label = encodeURIComponent(name);
    const url =
      Platform.select({
        ios: `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
        default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=`,
      }) || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    const supported = await Linking.canOpenURL(url);
    if (supported) Linking.openURL(url);
    else Alert.alert("Unable to open maps");
  };

  const copyAddress = async () => {
    await Clipboard.setStringAsync(address);
    Alert.alert("Copied", "Address copied to clipboard.");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <Text style={styles.title}>{name}</Text>
      <View style={styles.addrRow}>
        <Text style={styles.address}>{address}</Text>
        <View style={styles.addrActions}>
          <Chip onPress={copyAddress} label="Copy" />
          <Chip onPress={openInMaps} label="Open in Maps" />
        </View>
      </View>

      {/* Photo */}
      <View style={styles.card}>
        {photoUri ? (
          <Image
            source={photoUri}
            style={styles.photo}
            resizeMode="cover"
            onError={() => setImageError(true)}
            accessible
            accessibilityLabel={`Photo of ${name}`}
          />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Text style={styles.photoFallbackText}>No photo available</Text>
          </View>
        )}
        {!!building.photo_attribution && (
          <Text style={styles.photoCaption}>{building.photo_attribution}</Text>
        )}
      </View>

      {/* Quick facts */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Info</Text>
        {infoRows.length === 0 ? (
          <Text style={styles.muted}>No additional details.</Text>
        ) : (
          infoRows.map((row) => (
            <Row key={row.label} label={row.label} value={row.value} />
          ))
        )}
      </View>

      {/* Coordinates (optional) */}
      {building.lat != null && building.lng != null && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Row label="Latitude" value={String(building.lat)} />
          <Row label="Longitude" value={String(building.lng)} />
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

/** --- Small presentational helpers --- */

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Chip({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
}

/** --- Styles --- */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#0B0B0C",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  address: {
    fontSize: 16,
    color: "#D1D5DB",
    flexShrink: 1,
  },
  addrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  addrActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: "auto",
  },
  card: {
    backgroundColor: "#151518",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#222228",
  },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },
  photoFallback: {
    backgroundColor: "#222228",
    alignItems: "center",
    justifyContent: "center",
  },
  photoFallbackText: {
    color: "#9CA3AF",
  },
  photoCaption: {
    marginTop: 8,
    fontSize: 12,
    color: "#9CA3AF",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#26262B",
  },
  rowLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  rowValue: {
    color: "#E5E7EB",
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#2A2A31",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#3A3A44",
  },
  chipText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "600",
  },
});
