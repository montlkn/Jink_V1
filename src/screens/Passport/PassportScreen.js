/* File: /src/screens/Passport/PassportScreen.js
  Description: The main screen for the user's profile, collections, and achievements.
  Uses common components like SectionHeader and ListItem.
*/
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ListItem from "../../components/common/ListItem";
import SectionHeader from "../../components/common/SectionHeader";
import {
  getUserAchievements,
  getUserStamps,
} from "../../services/questService";

// Mock data for lists (not yet implemented in backend)
import { MaterialIcons } from "@expo/vector-icons"; // add this import
import { supabase } from "../../api/supabaseClient";

// Mock data for demonstration
const stamps = [
  { id: "1", image: "stamp_ny.png" },
  { id: "2", image: "stamp_sofia.png" },
  { id: "3", image: "stamp_ny_2.png" },
];

const achievements = [
  { id: "1", image: "seal_1.png" },
  { id: "2", image: "seal_2.png" },
  { id: "3", image: "seal_3.png" },
];

const lists = [
  { id: "1", name: "Midtown Marvels" },
  { id: "2", name: "Downtown Deco" },
  { id: "3", name: "Brutalist Bests" },
];

const PassportScreen = ({ navigation }) => {
  const [stamps, setStamps] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    console.log("Logged out");
    // AppNavigator will route back to login on session = null
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      const [userStamps, userAchievements] = await Promise.all([
        getUserStamps(),
        getUserAchievements(),
      ]);

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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 60 }} />

        <Text style={styles.passportTitle}>USER PASSPORT</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons
            name="logout"
            size={16}
            color="#333"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* STAMPS SECTION */}
      <SectionHeader
        title="Stamps"
        onSeeAll={() => console.log("See all stamps")}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.horizontalScroll}
      >
        {stamps.length > 0 ? (
          stamps.map((stamp) => (
            <View key={stamp.id} style={styles.stamp}>
              <Text style={styles.stampText}>
                {stamp.name.substring(0, 10)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            No stamps yet. Complete quests to earn stamps!
          </Text>
        )}
      </ScrollView>

      {/* ACHIEVEMENTS SECTION */}
      <SectionHeader
        title="Achievements"
        onSeeAll={() => console.log("See all achievements")}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.horizontalScroll}
      >
        {achievements.length > 0 ? (
          achievements.map((achievement) => (
            <View key={achievement.id} style={styles.achievement}>
              <Text style={styles.achievementText}>
                {achievement.name.substring(0, 10)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            No achievements yet. Complete quests to unlock achievements!
          </Text>
        )}
      </ScrollView>

      {/* LISTS SECTION */}
      <SectionHeader
        title="Lists"
        onSeeAll={() => console.log("See all lists")}
      />
      <View style={styles.listContainer}>
        {lists.map((list) => (
          <ListItem
            key={list.id}
            text={list.name}
            onPress={() => console.log(`Go to ${list.name}`)}
          />
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  passportTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#888",
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: 20,
  },
  horizontalScroll: {
    paddingLeft: 0,
    marginBottom: 20,
  },
  stamp: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e0e0e0",
    marginRight: 15,
  },
  achievement: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#d0d0d0",
    marginRight: 15,
    borderWidth: 2,
    borderColor: "#b0b0b0",
    borderStyle: "dashed",
  },
  listContainer: {
    marginTop: 10,
  },
  stampText: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
  },
  achievementText: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    marginVertical: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  logoutButton: {
    width: 80,
    backgroundColor: "#eee",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
});

export default PassportScreen;
