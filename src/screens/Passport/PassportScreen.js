/* File: /src/screens/Passport/PassportScreen.js
  Description: The main screen for the user's profile, collections, and achievements.
  Uses common components like SectionHeader and ListItem.
*/
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import SectionHeader from '../../components/common/SectionHeader';
import ListItem from '../../components/common/ListItem';

// Mock data for demonstration
const stamps = [
  { id: '1', image: 'stamp_ny.png' },
  { id: '2', image: 'stamp_sofia.png' },
  { id: '3', image: 'stamp_ny_2.png' },
];

const achievements = [
  { id: '1', image: 'seal_1.png' },
  { id: '2', image: 'seal_2.png' },
  { id: '3', image: 'seal_3.png' },
];

const lists = [
  { id: '1', name: 'Midtown Marvels' },
  { id: '2', name: 'Downtown Deco' },
  { id: '3', name: 'Brutalist Bests' },
];

const PassportScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      {/* We can add the passport texture as a background image later */}
      <Text style={styles.passportTitle}>USER PASSPORT</Text>

      {/* STAMPS SECTION */}
      <SectionHeader title="Stamps" onSeeAll={() => console.log('See all stamps')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {stamps.map(stamp => (
          <View key={stamp.id} style={styles.stamp} />
        ))}
      </ScrollView>

      {/* ACHIEVEMENTS SECTION */}
      <SectionHeader title="Achievements" onSeeAll={() => console.log('See all achievements')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {achievements.map(achievement => (
          <View key={achievement.id} style={styles.achievement} />
        ))}
      </ScrollView>
      
      {/* LISTS SECTION */}
      <SectionHeader title="Lists" onSeeAll={() => console.log('See all lists')} />
      <View style={styles.listContainer}>
        {lists.map(list => (
           <ListItem key={list.id} text={list.name} onPress={() => console.log(`Go to ${list.name}`)} />
        ))}
      </View>
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
    marginBottom: 30,
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
    // In a real app, this would be an <Image />
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
  }
});

export default PassportScreen;
