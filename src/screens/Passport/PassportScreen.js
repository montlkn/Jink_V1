/* File: /src/screens/Passport/PassportScreen.js
  Description: The main screen for the user's profile, collections, and achievements.
  Uses common components like SectionHeader and ListItem.
*/
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ListItem from '../../components/common/ListItem';
import SectionHeader from '../../components/common/SectionHeader';
import { getUserAchievements, getUserStamps } from '../../services/questService';

// Mock data for lists (not yet implemented in backend)
const lists = [
  { id: '1', name: 'Midtown Marvels' },
  { id: '2', name: 'Downtown Deco' },
  { id: '3', name: 'Brutalist Bests' },
];

const PassportScreen = ({ navigation }) => {
  const [stamps, setStamps] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const [userStamps, userAchievements] = await Promise.all([
        getUserStamps(),
        getUserAchievements()
      ]);

      // Convert stamps array to objects for display
      setStamps(userStamps.map((stamp, index) => ({
        id: index.toString(),
        name: stamp
      })));

      // Convert achievements array to objects for display
      setAchievements(userAchievements.map((achievement, index) => ({
        id: index.toString(),
        name: achievement
      })));
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.passportTitle}>USER PASSPORT</Text>

      {/* STAMPS SECTION */}
      <SectionHeader title="Stamps" onSeeAll={() => console.log('See all stamps')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {stamps.length > 0 ? (
          stamps.map(stamp => (
            <View key={stamp.id} style={styles.stamp}>
              <Text style={styles.stampText}>{stamp.name.substring(0, 10)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No stamps yet. Complete quests to earn stamps!</Text>
        )}
      </ScrollView>

      {/* ACHIEVEMENTS SECTION */}
      <SectionHeader title="Achievements" onSeeAll={() => console.log('See all achievements')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {achievements.length > 0 ? (
          achievements.map(achievement => (
            <View key={achievement.id} style={styles.achievement}>
              <Text style={styles.achievementText}>{achievement.name.substring(0, 10)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No achievements yet. Complete quests to unlock achievements!</Text>
        )}
      </ScrollView>

      {/* LISTS SECTION */}
      <SectionHeader title="Lists" onSeeAll={() => console.log('See all lists')} />
      <View style={styles.listContainer}>
        {lists.map(list => (
           <ListItem key={list.id} text={list.name} onPress={() => console.log(`Go to ${list.name}`)} />
        ))}
      </View>

      {/* PAST WALKS SECTION */}
      <SectionHeader title="Past Walks" onSeeAll={() => console.log('See all past walks')} />
      <View style={styles.listContainer}>
        <View style={styles.listItem}>
          <Text style={styles.listItemText}>A Walk Through SoHo's Cast-Iron District</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.listItemText}>Midtown's Modernist Marvels</Text>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  passportTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888',
    letterSpacing: 1.5,
    textAlign: 'center',
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
    backgroundColor: '#e0e0e0',
    marginRight: 15,
  },
  achievement: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d0d0d0',
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#b0b0b0',
    borderStyle: 'dashed'
  },
  listContainer: {
    marginTop: 10,
  },
  stampText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  achievementText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginVertical: 10,
  },
  listItem: {
    paddingVertical: 15,
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
  },
  listItemText: {
    color: '#000',
    fontSize: 16,
  }
});

export default PassportScreen;
