import type { AchievementDefinition } from "@/constants/passportContent";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
// BlurView removed - using solid overlay instead
import { Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ModalCloseButton from "./ModalCloseButton";

type AchievementDetailModalProps = {
  visible: boolean;
  achievement: AchievementDefinition | null;
  onClose: () => void;
};

export function AchievementDetailModal({ visible, achievement, onClose }: AchievementDetailModalProps): JSX.Element {
  if (!achievement) return <></>;

  const statusColor = achievement.missable ? theme.colors.accent : theme.colors.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>

        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ width: 36 }} />
              <ModalCloseButton onPress={onClose} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.iconSection}>
                <View style={[styles.iconBadge, { borderColor: statusColor }]}>
                  <Ionicons name="ribbon" size={30} color={statusColor} />
                </View>
                <View style={[styles.statusBadge, { backgroundColor: theme.colors.background, borderColor: statusColor }]}>
                  <Ionicons name={achievement.missable ? "flash" : "checkmark-circle"} size={12} color={statusColor} />
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {achievement.missable ? "MISSABLE" : "STABLE"}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.achievementTitle}>{achievement.title.toUpperCase()}</Text>
                <View style={[styles.xpBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.xpText}>{achievement.xp.toLocaleString()} XP</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>PURPOSE</Text>
                <Text style={styles.description}>{achievement.purpose}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>HOW TO UNLOCK</Text>
                <Text style={styles.description}>{achievement.verification}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.footerNote}>
                  {achievement.missable
                    ? "WARNING: LIMITED TIME WINDOW DETECTED."
                    : "STATUS: PERMANENT RECORD AVAILABLE."}
                </Text>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(245, 245, 245, 0.92)",
  },
  modalContainer: {
    width: '85%',
    maxWidth: 380,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: theme.colors.border,
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
    padding: 8,
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
    width: 60,
    height: 60,
    borderRadius: 0,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    transform: [{ rotate: "45deg" }],
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginTop: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  achievementTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 1,
  },
  xpBadge: {
    alignSelf: "center",
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  xpText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Courier",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: theme.colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    fontFamily: "Courier",
  },
  footerNote: {
    fontSize: 10,
    color: theme.colors.muted,
    fontStyle: "italic",
    textAlign: "center",
    fontFamily: "Courier",
  },
});

export default AchievementDetailModal;
