/*
  File: /src/components/home/PastWalksList.js
  Description: A component for the Home Screen that displays a list of the user's past walks.
*/
import React from 'react';
import { View, StyleSheet } from 'react-native';
import SectionHeader from '../common/SectionHeader';
import ListItem from '../common/ListItem'; // We will reuse the ListItem component

// Mock data for demonstration
const MOCK_WALKS = [
  { id: '1', title: "A Walk Through SoHo's Cast-Iron District" },
  { id: '2', title: "Midtown's Modernist Marvels" },
  { id: '3', title: 'Financial District Architectural Gems' },
];

const PastWalksList = ({ walks = MOCK_WALKS, onNavigate, onWalkPress }) => {
  return (
    <View style={styles.container}>
      <SectionHeader title="Past Walks" onSeeAll={onNavigate} />
      <View style={styles.listContainer}>
        {walks.slice(0, 3).map((walk) => ( // Show up to 3 recent walks
          <ListItem 
            key={walk.id} 
            text={walk.title} 
            onPress={() => onWalkPress(walk.id)} 
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden', // Ensures the border radius is respected by children
  },
});

export default PastWalksList;
