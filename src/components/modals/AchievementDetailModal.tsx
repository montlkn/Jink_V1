import React from "react";
import { Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import type { AchievementDefinition } from "@/constants/passportContent";

type AchievementDetailModalProps = {
  visible: boolean;
  achievement: AchievementDefinition | null;
  onClose: () => void;
};

export function AchievementDetailModal({ visible, achievement, onClose }: AchievementDetailModalProps): JSX.Element {
  if (!achievement) return <></>;

  const statusColor = achievement.missable ? "#F97316" : "#10B981";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ width: 36 }} />
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.iconSection}>
                <View style={styles.iconBadge}>
                  <Ionicons name="ribbon" size={48} color="#6B21A8" />
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1a` }]}>
                  <Ionicons name={achievement.missable ? "flash" : "checkmark-circle"} size={16} color={statusColor} />
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {achievement.missable ? "Missable" : "Stable"}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <View style={styles.xpBadge}>
                  <Text style={styles.xpText}>{achievement.xp.toLocaleString()} XP</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Purpose</Text>
                <Text style={styles.description}>{achievement.purpose}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>How to Unlock</Text>
                <Text style={styles.description}>{achievement.verification}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.footerNote}>
                  {achievement.missable
                    ? "⚠️ This achievement has a limited-time window. Keep an eye on streak timers."
                    : "✓ This achievement can be earned anytime."}
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
  iconSection: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0E8FB",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  achievementTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  xpBadge: {
    alignSelf: "center",
    backgroundColor: "#1D4ED8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  xpText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
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
  footerNote: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
    textAlign: "center",
  },
});

export default AchievementDetailModal;
