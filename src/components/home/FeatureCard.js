import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import PillButton from '../common/PillButton'; // We'll create this later or use a simple button for now

const FeaturedCard = ({ landmark, onMoreInfo }) => {
  // Use mock data if no landmark is provided
  const displayData = landmark || {
    title: 'The Flatiron Building',
    subtitle: 'A true icon of New York architecture.',
    imageUrl: null, // We'll handle images later
  };

  return (
    <View style={styles.card}>
      <View style={styles.imagePlaceholder} />
      <Text style={styles.title}>{displayData.title.toUpperCase()}</Text>
      <Text style={styles.subtitle}>{displayData.subtitle}</Text>
      <TouchableOpacity onPress={onMoreInfo}>
        <Text style={styles.linkText}>MORE INFO &gt;</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  imagePlaceholder: {
    height: 150,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#555',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  linkText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default FeaturedCard;