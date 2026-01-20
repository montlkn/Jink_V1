/* File: /src/components/common/SectionHeader.js
  Description: A reusable header for sections with a title and a "See All" button.
*/
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const SectionHeader = ({ title, onSeeAll }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={styles.seeAllText}>&gt;</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 1,
  },
  seeAllText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.muted,
  },
});

export default SectionHeader;