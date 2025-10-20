import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ArchetypeOrb from '../ArchetypeOrb'; // Use wrapper in components/

const AestheticProfile = ({ navigation, onNavigate, archetypeData }) => {
  // Use sample data if none provided
  const sampleData = archetypeData || [
    { name: "Romantic", percentage: 0.36 },
    { name: "Modernist", percentage: 0.32 },
    { name: "Classicist", percentage: 0.28 },
  ];

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={onNavigate}
        activeOpacity={0.8}
        style={styles.touchable}
      >
        <View style={styles.orbContainer}>
          <ArchetypeOrb
            archetypeData={sampleData}
            size={220}
            quality="high"
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>Your Aesthetic Profile</Text>
          <Text style={styles.subtitle}>Tap to view details</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  touchable: {
    alignItems: 'center',
  },
  orbContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
});

export default AestheticProfile;
