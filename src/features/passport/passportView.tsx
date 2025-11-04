import XPDetailModal from "@/components/modals/XPDetailModal";
import PassportHeader from "@/components/passport/PassportHeader";
import PassportStamp from "@/components/passport/PassportStamp";
import XPCircleBadge from "@/components/passport/XPCircleBadge";
import {
  achievementLedger,
  passportLists as passportListContent,
  stampCollection,
  visaCarousel,
} from "@/constants/passportContent";
import { log } from "@/lib/log";
import { screens, type RootParams } from "@/navigation/routes";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
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
import { passportActions } from "./mutations";
import type { PassportUiData } from "./selectors";
import { usePassportData } from "./usePassportData";

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
      switch (category) {
        case "Stamps":
          navigation.navigate(screens.PassportStamps);
          return;
        case "Achievements":
          navigation.navigate(screens.PassportAchievements);
          return;
        case "Lists":
          navigation.navigate(screens.PassportLists);
          return;
        case "Visas":
          navigation.navigate(screens.PassportVisas);
          return;
        case "Past Walks":
          navigation.navigate(screens.PastWalksNolli);
          return;
        default:
          log.debug(`[passport] Pressed ${category}`);
      }
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
  const stampSource = data.stamps.length > 0 ? data.stamps : stampCollection.map((stamp) => ({ id: stamp.id, name: stamp.title }));
  const stampsPreview = stampSource.slice(0, 3);
  const stampCount = stampSource.length;

  const achievementSource =
    data.achievements.length > 0
      ? data.achievements
      : achievementLedger.map((achievement) => ({ id: achievement.id, name: achievement.title }));
  const achievementsPreview = achievementSource.slice(0, 3);
  const achievementCount = achievementSource.length;

  const listSource =
    data.lists.length > 0
      ? data.lists
      : passportListContent.map((list) => ({ id: list.id, name: list.name }));
  const listCount = listSource.length;
  const listPreview = listSource.slice(0, 3);

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

      <View style={styles.streakCard}>
        <View style={styles.streakIcon}>
          <Ionicons name="flame" size={32} color={data.dailyStreak >= 3 ? "#FF6B35" : "#9CA3AF"} />
        </View>
        <View style={styles.streakContent}>
          <View style={styles.streakHeader}>
            <Ionicons name="calendar" size={14} color="#FF6B35" />
            <Text style={styles.streakLabel}>DAILY STREAK</Text>
          </View>
          <Text style={styles.streakTitle}>{data.dailyStreak} Day{data.dailyStreak !== 1 ? "s" : ""}</Text>
          <Text style={styles.streakMultiplier}>
            {data.streakMultiplier > 1 ? `${data.streakMultiplier}x XP Multiplier` : "Keep going to earn multipliers!"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.categoryCard, styles.stampsCard]}
        onPress={() => onCardPress("Stamps")}
        activeOpacity={0.8}
      >
        <CardHeader icon="bookmark" tint="#E74C3C" label="STAMPS" count={stampCount} />
        <Text style={styles.cardTitle}>Passport Stamps</Text>
        <Text style={styles.cardDescription}>
          {stampCount > 0
            ? `${stampCount} stamp${stampCount !== 1 ? "s" : ""} collected`
            : "Complete quests or scan buildings to earn stamps"}
        </Text>
        {stampCount > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stampScrollContainer}>
            {stampsPreview.map((stamp) => (
              <PassportStamp key={stamp.id} stamp={stamp.name} date="2025" />
            ))}
            {stampCount > stampsPreview.length ? (
              <View style={styles.moreStampsIndicator}>
                <Text style={styles.moreStampsText}>+{stampCount - stampsPreview.length} more</Text>
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
        <CardHeader icon="ribbon" tint="#9B59B6" label="ACHIEVEMENTS" count={achievementCount} />
        <Text style={styles.cardTitle}>Achievements</Text>
        <Text style={styles.cardDescription}>
          {achievementCount > 0
            ? `${achievementCount} achievement${achievementCount !== 1 ? "s" : ""} unlocked`
            : "Complete quests or hit milestones to unlock achievements"}
        </Text>
        {achievementCount > 0 ? (
          <View style={styles.previewContainer}>
            {achievementsPreview.map((achievement) => (
              <View key={achievement.id} style={styles.achievementPreview}>
                <Text style={styles.achievementPreviewText}>{achievement.name.substring(0, 8)}</Text>
              </View>
            ))}
            {achievementCount > achievementsPreview.length ? (
              <View style={styles.achievementPreview}>
                <Text style={styles.achievementPreviewText}>+{achievementCount - achievementsPreview.length}</Text>
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
        <CardHeader icon="list" tint="#1ABC9C" label="LISTS" count={listCount} />
        <Text style={styles.cardTitle}>Saved Lists</Text>
        <Text style={styles.cardDescription}>
          {listCount > 0
            ? `${listCount} list${listCount !== 1 ? "s" : ""} saved`
            : "Create lists to plan future walks or study themes"}
        </Text>
        {listCount > 0 ? (
          <View style={styles.listPreviewContainer}>
            {listPreview.map((list) => (
              <View key={list.id} style={styles.listPreviewItem}>
                <Ionicons name="checkbox-outline" size={14} color="#666" />
                <Text numberOfLines={1} style={styles.listPreviewText}>{list.name}</Text>
              </View>
            ))}
            {listCount > 3 ? (
              <View style={styles.listPreviewItem}>
                <Ionicons name="add-circle-outline" size={14} color="#666" />
                <Text style={styles.listPreviewText}>+{listCount - 3} more</Text>
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
        <CardHeader icon="map" tint="#3498DB" label="TRAVEL VISAS" count={visaCarousel.length} />
        <Text style={styles.cardTitle}>Neighborhood Visas</Text>
        <Text style={styles.cardDescription}>
          {visaCarousel.length} district{visaCarousel.length !== 1 ? "s" : ""} have been explored.
        </Text>
        <View style={styles.visaPreviewContainer}>
          {visaCarousel.slice(0, 3).map((visa) => (
            <View key={visa.id} style={[styles.visaItem, { borderLeftColor: visa.accent }]}>
              <View style={styles.visaHeader}>
                <Ionicons name="document-text" size={16} color={visa.accent} />
                <Text style={[styles.visaName, { color: visa.accent }]}>{visa.title}</Text>
              </View>
              <Text style={styles.visaDistrict}>{visa.neighborhood}</Text>
              <Text style={styles.visaValidity}>{visa.requirement}</Text>
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
    padding: 16,
    marginBottom: 12,
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
  streakCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  streakIcon: {
    marginRight: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  streakContent: { flex: 1 },
  streakHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  streakLabel: { fontSize: 10, fontWeight: "bold", color: "#FF6B35", marginLeft: 6 },
  streakTitle: { fontSize: 18, fontWeight: "bold", color: "#000", marginBottom: 4 },
  streakMultiplier: { fontSize: 12, color: "#666", fontWeight: "500" },
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center" },
  cardType: { fontSize: 12, fontWeight: "bold", marginLeft: 8 },
  countBadge: { backgroundColor: "#F0F0F0", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  countText: { fontSize: 12, fontWeight: "600", color: "#666" },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#000", marginBottom: 6 },
  cardDescription: { fontSize: 14, color: "#555", marginBottom: 12 },
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
  visaItem: {
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3498DB",
  },
  visaHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  visaName: { fontSize: 14, fontWeight: "600" },
  visaDistrict: { fontSize: 12, color: "#475569" },
  visaValidity: { fontSize: 12, color: "#1D4ED8", fontWeight: "600" },
});
