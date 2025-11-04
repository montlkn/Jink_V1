import React from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import PassportStamp from "@/components/passport/PassportStamp";
import type { StampDefinition } from "@/constants/passportContent";

type StampDetailModalProps = {
  visible: boolean;
  stamp: StampDefinition | null;
  onClose: () => void;
};

const rarityColors: Record<StampDefinition["rarity"], string> = {
  common: "#6B7280",
  rare: "#2563EB",
  epic: "#7C3AED",
  legendary: "#DC2626",
};

const rarityLabels: Record<StampDefinition["rarity"], string> = {
  common: "Common",
  rare: "Rare (Quest)",
  epic: "Epic (Achievement)",
  legendary: "Legendary",
};

export function StampDetailModal({ visible, stamp, onClose }: StampDetailModalProps): JSX.Element {
  if (!stamp) return <></>;

  const rarityColor = rarityColors[stamp.rarity];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ width: 36 }} />
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Stamp Display */}
              <View style={styles.stampContainer}>
                <PassportStamp stamp={stamp.title} date={stamp.issuedAt} />
              </View>

              {/* Title & Rarity */}
              <View style={styles.section}>
                <Text style={styles.stampTitle}>{stamp.title}</Text>
                <View style={[styles.rarityBadge, { borderColor: rarityColor, backgroundColor: `${rarityColor}14` }]}>
                  <Text style={[styles.rarityText, { color: rarityColor }]}>
                    {rarityLabels[stamp.rarity]}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Description</Text>
                <Text style={styles.description}>{stamp.description}</Text>
              </View>

              {/* Source */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Source</Text>
                <Text style={styles.sourceText}>{stamp.source}</Text>
              </View>

              {/* Issue Date */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Issued</Text>
                <Text style={styles.dateText}>
                  {new Date(stamp.issuedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "90%",
    maxHeight: "80%",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    maxHeight: 500,
  },
  stampContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  stampTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  rarityBadge: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  rarityText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
  },
  sourceText: {
    fontSize: 14,
    color: "#4B5563",
  },
  dateText: {
    fontSize: 14,
    color: "#4B5563",
  },
});

export default StampDetailModal;
