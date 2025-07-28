/*
  File: /src/components/home/AestheticProfile.js
  Description: A component for the Home Screen that displays the user's aesthetic profile pie chart.
*/
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import SectionHeader from '../common/SectionHeader';

// Mock data for the chart labels
const MOCK_PROFILE_DATA = [
  { style: 'ART DECO', percentage: 44 },
  { style: 'BRUTALIST', percentage: 30 },
  { style: 'TUDOR', percentage: 20 },
  { style: 'MODERNIST', percentage: 27 }, // Note: percentages don't need to add to 100 for this layout
];

const AestheticProfile = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <SectionHeader title="Aesthetic Profile" onSeeAll={onNavigate} />
      <TouchableOpacity onPress={onNavigate}>
        <View style={styles.chartContainer}>
          <View style={styles.pieChartPlaceholder} />
          {/* We can map over real data here later */}
          <Text style={[styles.chartLabel, styles.labelArtDeco]}>ART DECO 44%</Text>
          <Text style={[styles.chartLabel, styles.labelBrutalist]}>BRUTALIST 30%</Text>
          <Text style={[styles.chartLabel, styles.labelTudor]}>TUDOR 20%</Text>
          <Text style={[styles.chartLabel, styles.labelModernist]}>MODERNIST 27%</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
    position: 'relative', // For label positioning
  },
  pieChartPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#e0e0e0',
    // In a real app, a library like 'react-native-pie-chart' would be used here
  },
  chartLabel: {
    position: 'absolute',
    fontWeight: 'bold',
    fontSize: 12,
    color: '#000',
    textTransform: 'uppercase',
  },
  // Positioning based on the wireframe
  labelArtDeco: {
    top: 0,
    right: 0,
  },
  labelBrutalist: {
    top: '30%',
    left: -20,
  },
  labelTudor: {
    bottom: '25%',
    right: -10,
  },
  labelModernist: {
    bottom: 0,
    left: '25%',
  }
});

export default AestheticProfile;
