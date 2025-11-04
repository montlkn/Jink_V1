import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { achievementLedger, type AchievementDefinition } from "@/constants/passportContent";
import { screens, type RootParams } from "@/navigation/routes";
import PassportBackdrop from "@/components/passport/PassportBackdrop";
import PassportInfoButton from "@/components/passport/PassportInfoButton";
import AchievementDetailModal from "@/components/modals/AchievementDetailModal";

type Navigation = NativeStackNavigationProp<RootParams, typeof screens.PassportAchievements>;

type AchievementCardProps = {
  item: AchievementDefinition;
  onPress: (item: AchievementDefinition) => void;
};

function AchievementCard({ item, onPress }: AchievementCardProps) {
  const missable = item.missable;
  const statusColor = missable ? "#F97316" : "#10B981";

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => onPress(item)}>
      <View style={styles.badgeRow}>
        <View style={styles.iconBadge}>
          <Ionicons name="ribbon" size={18} color="#6B21A8" />
        </View>
        <View style={[styles.missableBadge, { backgroundColor: `${statusColor}1a` }]}>
          <Ionicons name={missable ? "flash" : "checkmark-circle"} size={14} color={statusColor} />
          <Text style={[styles.missableText, { color: statusColor }]}>
            {missable ? "Missable" : "Stable"}
          </Text>
        </View>
      </View>
      <View style={styles.cardText}>
        <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
        <Text numberOfLines={2} style={styles.purpose}>{item.purpose}</Text>
        <Text style={styles.verificationLabel}>How it verifies</Text>
        <Text numberOfLines={3} style={styles.verification}>{item.verification}</Text>
      </View>
      <View style={styles.xpSection}>
        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>{item.xp.toLocaleString()} XP</Text>
        </View>
        <Text style={styles.footerNote} numberOfLines={2}>
          {missable ? "Keep an eye on streak timers." : "Awarded once per profile."}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AchievementsScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementDefinition | null>(null);

  const handleInfo = useCallback(() => {
    Alert.alert(
      "Achievements",
      "Achievements signal milestone skill and streaks. Unlock them by scanning buildings, completing derives, and pursuing special challenges. Missable achievements show limited-time windows, while stable ones can be earned anytime."
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <PassportBackdrop tailColor="#F9F5F0" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <PassportInfoButton
          style={styles.infoButton}
          onPress={handleInfo}
          accessibilityLabel="Achievements details"
        />
      </View>
      <Text style={styles.subheader}>
        Track your skill markers, rare streaks, and milestone unlocks. Missable achievements expire—stay
        sharp.
      </Text>

      <FlatList
        data={achievementLedger}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <AchievementCard item={item} onPress={setSelectedAchievement} />}
        showsVerticalScrollIndicator={false}
      />

      <AchievementDetailModal
        visible={selectedAchievement !== null}
        achievement={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F5F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    zIndex: 3,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  infoButton: {
    marginBottom: 2,
  },
  subheader: {
    fontSize: 14,
    color: "#475569",
    paddingHorizontal: 20,
    marginBottom: 12,
    zIndex: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  column: {
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#E5D9F6",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
    minHeight: 240,
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0E8FB",
  },
  missableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  missableText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  purpose: {
    fontSize: 13,
    color: "#374151",
  },
  cardText: {
    flex: 1,
    gap: 8,
  },
  verificationLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  verification: {
    fontSize: 12,
    color: "#475569",
  },
  xpSection: {
    marginTop: 12,
    gap: 6,
    flexDirection: "column",
    alignItems: "flex-start",
  },
  xpBadge: {
    backgroundColor: "#1D4ED8",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  xpText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  footerNote: {
    fontSize: 11,
    color: "#6B7280",
  },
});
