/* File: /src/screens/Passport/PassportScreen.js
  Description: The main screen for the user's profile, collections, and achievements.
  Uses common components like SectionHeader and ListItem.
*/
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../api/supabaseClient";
import XPDetailModal from "../../components/modals/XPDetailModal";
import PassportHeader from "../../components/passport/PassportHeader";
import PassportStamp from "../../components/passport/PassportStamp";
import XPCircleBadge from "../../components/passport/XPCircleBadge";
import {
  getUserAchievements,
  getUserStamps,
  getUserXP,
  getXPForNextLevel,
} from "../../services/questService";
import { useUserStore } from "../../state/userStore";

// Mock data for visas (architectural neighborhoods)
const visas = [
  {
    id: "1",
    name: "Midtown",
    district: "Marvels District",
    validUntil: "2025",
  },
  { id: "2", name: "Downtown", district: "Deco Quarter", validUntil: "2025" },
  { id: "3", name: "Brooklyn", district: "Brutalist Zone", validUntil: "2025" },
];

const PassportScreen = ({ navigation }) => {
  const [stamps, setStamps] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [xpModalVisible, setXpModalVisible] = useState(false);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [xpForNextLevel, setXpForNextLevel] = useState(100);
  const [userId, setUserId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const logout = useUserStore((state) => state.logout);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Get user session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        // Format passport number: AR-XXXX-XXXX (AR for Architecture)
        const id = session.user.id.replace(/-/g, "").toUpperCase();
        const formattedId = `AR-${id.substring(0, 4)}-${id.substring(4, 8)}`;
        setUserId(formattedId);

        // Get issue date from user creation
        if (session.user.created_at) {
          const date = new Date(session.user.created_at);
          const formatted = date
            .toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
            .toUpperCase();
          setIssueDate(formatted);
        }
      }

      const [userStamps, userAchievements, epData] = await Promise.all([
        getUserStamps(),
        getUserAchievements(),
        getUserXP(),
      ]);

      // Set XP data
      setUserXP(epData.ep || epData.xp || 0);
      setUserLevel(epData.level || 1);
      setXpForNextLevel(getXPForNextLevel(epData.level || 1));

      // Convert stamps array to objects for display
      setStamps(
        userStamps.map((stamp, index) => ({
          id: index.toString(),
          name: stamp,
        }))
      );

      // Convert achievements array to objects for display
      setAchievements(
        userAchievements.map((achievement, index) => ({
          id: index.toString(),
          name: achievement,
        }))
      );
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = (category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log(`Pressed ${category}`);
  };

  const handleLogout = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await supabase.auth.signOut();
      logout();
      // Navigation will be handled by auth state listener
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* BEARER IDENTIFICATION CARD */}
        <TouchableOpacity
          style={styles.epCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setXpModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.epCardLeft}>
            <XPCircleBadge
              currentXP={userXP}
              level={userLevel}
              xpForNextLevel={xpForNextLevel}
              onPress={() => setXpModalVisible(true)}
            />
          </View>
          <View style={styles.epCardContent}>
            <View style={styles.epCardHeader}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.epCardType}>BEARER STATUS</Text>
            </View>
            <Text style={styles.epCardTitle}>Explorer · Level {userLevel}</Text>
            <View style={styles.bearerInfo}>
              <Text style={styles.bearerLabel}>XPERIENCE POINTS:</Text>
              <Text style={styles.bearerValue}>
                {userXP.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min((userXP / xpForNextLevel) * 100, 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={24}
            color="#999"
            style={styles.chevron}
          />
        </TouchableOpacity>

        {/* STAMPS CARD */}
        <TouchableOpacity
          style={[styles.categoryCard, styles.stampsCard]}
          onPress={() => handleCardPress("Stamps")}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="bookmark" size={24} color="#E74C3C" />
              <Text style={[styles.cardType, { color: "#E74C3C" }]}>
                STAMPS
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{stamps.length}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>Passport Stamps</Text>
          <Text style={styles.cardDescription}>
            {stamps.length > 0
              ? `${stamps.length} stamp${
                  stamps.length !== 1 ? "s" : ""
                } collected`
              : "Complete quests to earn stamps"}
          </Text>
          {stamps.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.stampScrollContainer}
            >
              {stamps.slice(0, 5).map((stamp, index) => (
                <PassportStamp key={stamp.id} stamp={stamp.name} />
              ))}
              {stamps.length > 5 && (
                <View style={styles.moreStampsIndicator}>
                  <Text style={styles.moreStampsText}>
                    +{stamps.length - 5} more
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </TouchableOpacity>

        {/* ACHIEVEMENTS CARD */}
        <TouchableOpacity
          style={[styles.categoryCard, styles.achievementsCard]}
          onPress={() => handleCardPress("Achievements")}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="ribbon" size={24} color="#9B59B6" />
              <Text style={[styles.cardType, { color: "#9B59B6" }]}>
                ACHIEVEMENTS
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{achievements.length}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>Achievements</Text>
          <Text style={styles.cardDescription}>
            {achievements.length > 0
              ? `${achievements.length} achievement${
                  achievements.length !== 1 ? "s" : ""
                } unlocked`
              : "Complete quests to unlock achievements"}
          </Text>
          {achievements.length > 0 && (
            <View style={styles.previewContainer}>
              {achievements.slice(0, 3).map((achievement, index) => (
                <View key={achievement.id} style={styles.achievementPreview}>
                  <Text style={styles.achievementPreviewText}>
                    {achievement.name.substring(0, 8)}
                  </Text>
                </View>
              ))}
              {achievements.length > 3 && (
                <View style={styles.achievementPreview}>
                  <Text style={styles.achievementPreviewText}>
                    +{achievements.length - 3}
                  </Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* VISAS CARD */}
        <TouchableOpacity
          style={[styles.categoryCard, styles.visasCard]}
          onPress={() => handleCardPress("Visas")}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="map" size={24} color="#3498DB" />
              <Text style={[styles.cardType, { color: "#3498DB" }]}>
                TRAVEL VISAS
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{visas.length}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>Neighborhood Visas</Text>
          <Text style={styles.cardDescription}>
            {visas.length} district{visas.length !== 1 ? "s" : ""} authorized
            for exploration
          </Text>
          <View style={styles.visaPreviewContainer}>
            {visas.map((visa, index) => (
              <View key={visa.id} style={styles.visaItem}>
                <View style={styles.visaHeader}>
                  <Ionicons name="document-text" size={16} color="#3498DB" />
                  <Text style={styles.visaName}>{visa.name}</Text>
                </View>
                <Text style={styles.visaDistrict}>{visa.district}</Text>
                <Text style={styles.visaValidity}>
                  Valid until {visa.validUntil}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* PAST WALKS CARD */}
        <TouchableOpacity
          style={[styles.categoryCard, styles.walksCard]}
          onPress={() => handleCardPress("Past Walks")}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="footsteps" size={24} color="#2ECC71" />
              <Text style={[styles.cardType, { color: "#2ECC71" }]}>
                PAST WALKS
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>2</Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>Past Walks</Text>
          <Text style={styles.cardDescription}>2 walks completed</Text>
          <View style={styles.listPreviewContainer}>
            <View style={styles.listPreviewItem}>
              <Ionicons name="trail-sign" size={14} color="#666" />
              <Text style={styles.listPreviewText}>
                A Walk Through SoHo&apos;s Cast-Iron District
              </Text>
            </View>
            <View style={styles.listPreviewItem}>
              <Ionicons name="trail-sign" size={14} color="#666" />
              <Text style={styles.listPreviewText}>
                Midtown&apos;s Modernist Marvels
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Passport Cover Header */}
      <PassportHeader
        passportNumber={userId}
        issueDate={issueDate}
        onLogout={handleLogout}
      />

      {/* XP Detail Modal */}
      <XPDetailModal
        visible={xpModalVisible}
        onClose={() => setXpModalVisible(false)}
        currentXP={userXP}
        level={userLevel}
        xpForNextLevel={xpForNextLevel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 160,
    paddingBottom: 20,
  },
  // XP Card Styles
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
  epCardLeft: {
    marginRight: 16,
  },
  epCardContent: {
    flex: 1,
  },
  epCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  epCardType: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFD700",
    letterSpacing: 1.5,
    marginLeft: 6,
  },
  epCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  bearerInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
    gap: 6,
  },
  bearerLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#888",
    letterSpacing: 0.5,
  },
  bearerValue: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
  },
  epCardDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 4,
  },
  chevron: {
    marginLeft: 8,
  },
  // Category Card Styles (similar to QuestCard)
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
  stampsCard: {
    borderColor: "#E74C3C",
  },
  achievementsCard: {
    borderColor: "#9B59B6",
  },
  visasCard: {
    borderColor: "#3498DB",
  },
  walksCard: {
    borderColor: "#2ECC71",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardType: {
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
    marginLeft: 8,
  },
  countBadge: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 16,
  },
  // Preview Styles
  previewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stampScrollContainer: {
    marginTop: 8,
  },
  moreStampsIndicator: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#E74C3C",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  moreStampsText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#E74C3C",
  },
  achievementPreview: {
    backgroundColor: "#F5F0FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#9B59B6",
  },
  achievementPreviewText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9B59B6",
  },
  listPreviewContainer: {
    gap: 8,
  },
  listPreviewItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  listPreviewText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  // Visa Styles
  visaPreviewContainer: {
    gap: 12,
  },
  visaItem: {
    backgroundColor: "#F0F8FF",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3498DB",
  },
  visaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  visaName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#3498DB",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  visaDistrict: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  visaValidity: {
    fontSize: 10,
    color: "#999",
    fontStyle: "italic",
  },
});

export default PassportScreen;
