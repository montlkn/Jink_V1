import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import XPDetailModal from "@/components/modals/XPDetailModal";
import PassportHeader from "@/components/passport/PassportHeader";
import PassportStamp from "@/components/passport/PassportStamp";
import XPCircleBadge from "@/components/passport/XPCircleBadge";
import { log } from "@/lib/log";
import { passportActions } from "./mutations";
import { usePassportData } from "./usePassportData";
import type { PassportUiData } from "./selectors";
import { screens, type RootParams } from "@/navigation/routes";

const visas = [
  { id: "1", name: "Midtown", district: "Marvels District", validUntil: "2025" },
  { id: "2", name: "Downtown", district: "Deco Quarter", validUntil: "2025" },
  { id: "3", name: "Brooklyn", district: "Brutalist Zone", validUntil: "2025" },
];

type PassportNavigation = NativeStackNavigationProp<RootParams, typeof screens.Passport>;

export function PassportView(): JSX.Element {
  const navigation = useNavigation<PassportNavigation>();
  const passportState = usePassportData();
  const [xpModalVisible, setXpModalVisible] = useState(false);

  const handleLogout = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
    try {
      await passportActions.signOut();
    } catch (error) {
      log.error("[passport] Logout failed", error);
    }
  }, []);

  const handleCardPress = useCallback(
    (category: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
      if (category === "Past Walks") {
        navigation.navigate(screens.PastWalksNolli);
        return;
      }
      log.debug(`[passport] Pressed ${category}`);
    },
    [navigation]
  );

  const content = useMemo(() => {
    if (passportState.status === "loading") {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.centeredText}>Loading passport…</Text>
        </View>
      );
    }

    if (passportState.status === "error") {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Unable to load passport</Text>
          <Text style={styles.centeredText}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={passportState.refresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return <PassportContent data={passportState.value} onCardPress={handleCardPress} onShowXp={() => setXpModalVisible(true)} />;
  }, [handleCardPress, passportState]);

  const refreshControl =
    passportState.status === "ready" || passportState.status === "error" ? (
      <RefreshControl refreshing={passportState.refreshing} onRefresh={passportState.refresh} />
    ) : undefined;

  const xpDetails = passportState.status === "ready" ? passportState.value : null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {content}
        <View style={{ height: 100 }} />
      </ScrollView>

      {passportState.status === "ready" ? (
        <PassportHeader
          passportNumber={passportState.value.passportNumber}
          issueDate={passportState.value.issueDateLabel ?? undefined}
          onLogout={handleLogout}
        />
      ) : null}

      {xpDetails ? (
        <XPDetailModal
          visible={xpModalVisible}
          onClose={() => setXpModalVisible(false)}
          currentXP={xpDetails.xpTotal}
          level={xpDetails.level}
          xpForNextLevel={xpDetails.xpForNextLevel}
        />
      ) : null}
    </View>
  );
}

type PassportContentProps = {
  data: PassportUiData;
  onCardPress: (category: string) => void;
  onShowXp: () => void;
};

function PassportContent({ data, onCardPress, onShowXp }: PassportContentProps) {
  const progressPercent = Math.round(data.xpProgress * 100);
  const stampsPreview = data.stamps.slice(0, 5);
  const achievementsPreview = data.achievements.slice(0, 3);

  return (
    <>
      <TouchableOpacity
        style={styles.epCard}
        onPress={onShowXp}
        activeOpacity={0.8}
      >
        <View style={styles.epCardLeft}>
          <XPCircleBadge
            currentXP={data.xpTotal}
            level={data.level}
            xpForNextLevel={data.xpForNextLevel}
            onPress={onShowXp}
          />
        </View>
        <View style={styles.epCardContent}>
          <View style={styles.epCardHeader}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.epCardType}>BEARER STATUS</Text>
          </View>
          <Text style={styles.epCardTitle}>Explorer · Level {data.level}</Text>
          <View style={styles.bearerInfo}>
            <Text style={styles.bearerLabel}>XPERIENCE POINTS:</Text>
            <Text style={styles.bearerValue}>
              {data.xpTotal.toLocaleString()} / {data.xpForNextLevel.toLocaleString()} XP
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progressPercent, 100)}%` }]} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#999" style={styles.chevron} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.categoryCard, styles.stampsCard]}
        onPress={() => onCardPress("Stamps")}
        activeOpacity={0.8}
      >
        <CardHeader icon="bookmark" tint="#E74C3C" label="STAMPS" count={data.stamps.length} />
        <Text style={styles.cardTitle}>Passport Stamps</Text>
        <Text style={styles.cardDescription}>
          {data.stamps.length > 0
            ? `${data.stamps.length} stamp${data.stamps.length !== 1 ? "s" : ""} collected`
            : "Complete quests or scan buildings to earn stamps"}
        </Text>
        {data.stamps.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stampScrollContainer}>
            {stampsPreview.map((stamp) => (
              <PassportStamp key={stamp.id} stamp={stamp.name} date="2025" />
            ))}
            {data.stamps.length > stampsPreview.length ? (
              <View style={styles.moreStampsIndicator}>
                <Text style={styles.moreStampsText}>+{data.stamps.length - stampsPreview.length} more</Text>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.categoryCard, styles.achievementsCard]}
        onPress={() => onCardPress("Achievements")}
        activeOpacity={0.8}
      >
        <CardHeader icon="ribbon" tint="#9B59B6" label="ACHIEVEMENTS" count={data.achievements.length} />
        <Text style={styles.cardTitle}>Achievements</Text>
        <Text style={styles.cardDescription}>
          {data.achievements.length > 0
            ? `${data.achievements.length} achievement${data.achievements.length !== 1 ? "s" : ""} unlocked`
            : "Complete quests or hit milestones to unlock achievements"}
        </Text>
        {data.achievements.length > 0 ? (
          <View style={styles.previewContainer}>
            {achievementsPreview.map((achievement) => (
              <View key={achievement.id} style={styles.achievementPreview}>
                <Text style={styles.achievementPreviewText}>{achievement.name.substring(0, 8)}</Text>
              </View>
            ))}
            {data.achievements.length > achievementsPreview.length ? (
              <View style={styles.achievementPreview}>
                <Text style={styles.achievementPreviewText}>+{data.achievements.length - achievementsPreview.length}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.categoryCard, styles.listsCard]}
        onPress={() => onCardPress("Lists")}
        activeOpacity={0.8}
      >
        <CardHeader icon="list" tint="#1ABC9C" label="LISTS" count={data.lists.length} />
        <Text style={styles.cardTitle}>Saved Lists</Text>
        <Text style={styles.cardDescription}>
          {data.lists.length > 0
            ? `${data.lists.length} list${data.lists.length !== 1 ? "s" : ""} saved`
            : "Create lists to plan future walks or study themes"}
        </Text>
        {data.lists.length > 0 ? (
          <View style={styles.listPreviewContainer}>
            {data.lists.slice(0, 3).map((list) => (
              <View key={list.id} style={styles.listPreviewItem}>
                <Ionicons name="checkbox-outline" size={14} color="#666" />
                <Text numberOfLines={1} style={styles.listPreviewText}>{list.name}</Text>
              </View>
            ))}
            {data.lists.length > 3 ? (
              <View style={styles.listPreviewItem}>
                <Ionicons name="add-circle-outline" size={14} color="#666" />
                <Text style={styles.listPreviewText}>+{data.lists.length - 3} more</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.categoryCard, styles.visasCard]}
        onPress={() => onCardPress("Visas")}
        activeOpacity={0.8}
      >
        <CardHeader icon="map" tint="#3498DB" label="TRAVEL VISAS" count={visas.length} />
        <Text style={styles.cardTitle}>Neighborhood Visas</Text>
        <Text style={styles.cardDescription}>
          {visas.length} district{visas.length !== 1 ? "s" : ""} authorized for exploration
        </Text>
        <View style={styles.visaPreviewContainer}>
          {visas.map((visa) => (
            <View key={visa.id} style={styles.visaItem}>
              <View style={styles.visaHeader}>
                <Ionicons name="document-text" size={16} color="#3498DB" />
                <Text style={styles.visaName}>{visa.name}</Text>
              </View>
              <Text style={styles.visaDistrict}>{visa.district}</Text>
              <Text style={styles.visaValidity}>Valid until {visa.validUntil}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.categoryCard, styles.walksCard]}
        onPress={() => onCardPress("Past Walks")}
        activeOpacity={0.8}
      >
        <CardHeader icon="footsteps" tint="#2ECC71" label="PAST WALKS" count={2} />
        <Text style={styles.cardTitle}>Past Walks</Text>
        <Text style={styles.cardDescription}>2 walks completed</Text>
        <View style={styles.listPreviewContainer}>
          <View style={styles.listPreviewItem}>
            <Ionicons name="trail-sign" size={14} color="#666" />
            <Text style={styles.listPreviewText}>A Walk Through SoHo&apos;s Cast-Iron District</Text>
          </View>
          <View style={styles.listPreviewItem}>
            <Ionicons name="trail-sign" size={14} color="#666" />
            <Text style={styles.listPreviewText}>Midtown&apos;s Modernist Marvels</Text>
          </View>
        </View>
      </TouchableOpacity>
    </>
  );
}

type CardHeaderProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tint: string;
  label: string;
  count: number;
};

function CardHeader({ icon, tint, label, count }: CardHeaderProps) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.cardHeaderLeft}>
        <Ionicons name={icon} size={24} color={tint} />
        <Text style={[styles.cardType, { color: tint }]}>{label}</Text>
      </View>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8F8" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 160, paddingBottom: 20 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 160,
  },
  centeredText: {
    fontSize: 14,
    color: "#666",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#B91C1C",
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111827",
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  epCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  epCardLeft: { marginRight: 16 },
  epCardContent: { flex: 1 },
  epCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  epCardType: { fontSize: 10, fontWeight: "bold", color: "#FFD700", marginLeft: 6 },
  epCardTitle: { fontSize: 16, fontWeight: "bold", color: "#000", marginBottom: 8 },
  bearerInfo: { flexDirection: "row", alignItems: "baseline", marginBottom: 4, gap: 6 },
  bearerLabel: { fontSize: 9, fontWeight: "600", color: "#888" },
  bearerValue: { fontSize: 12, color: "#333", fontWeight: "500" },
  progressBar: { height: 8, backgroundColor: "#E0E0E0", borderRadius: 4 },
  progressFill: { height: "100%", backgroundColor: "#FFD700", borderRadius: 4 },
  chevron: { marginLeft: 8 },
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
  },
  stampsCard: { borderColor: "#E74C3C" },
  achievementsCard: { borderColor: "#9B59B6" },
  visasCard: { borderColor: "#3498DB" },
  walksCard: { borderColor: "#2ECC71" },
  listsCard: { borderColor: "#1ABC9C" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center" },
  cardType: { fontSize: 12, fontWeight: "bold", marginLeft: 8 },
  countBadge: { backgroundColor: "#F0F0F0", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  countText: { fontSize: 12, fontWeight: "600", color: "#666" },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#000", marginBottom: 8 },
  cardDescription: { fontSize: 14, color: "#555", marginBottom: 16 },
  stampScrollContainer: { marginTop: 4 },
  moreStampsIndicator: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  moreStampsText: { fontSize: 13, fontWeight: "600", color: "#888" },
  previewContainer: { flexDirection: "row", gap: 10 },
  achievementPreview: {
    backgroundColor: "rgba(155, 89, 182, 0.12)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  achievementPreviewText: { fontSize: 13, fontWeight: "600", color: "#6C3FA7" },
  listPreviewContainer: { gap: 8 },
  listPreviewItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  listPreviewText: { fontSize: 14, color: "#444", flexShrink: 1 },
  visaPreviewContainer: { gap: 12 },
  visaItem: { backgroundColor: "rgba(52, 152, 219, 0.1)", padding: 16, borderRadius: 12 },
  visaHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  visaName: { fontSize: 14, fontWeight: "600", color: "#1F497D" },
  visaDistrict: { fontSize: 12, color: "#555" },
  visaValidity: { fontSize: 12, color: "#1F497D", fontWeight: "600" },
});
