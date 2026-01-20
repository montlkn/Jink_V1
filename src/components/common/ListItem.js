/* File: /src/components/common/ListItem.js
  Description: A reusable list item row with a bottom border.
*/
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const ListItem = ({ text, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <Text style={styles.text}>{text}</Text>
      <Text style={styles.arrow}>&gt;</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  text: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  arrow: {
    fontSize: 18,
    color: theme.colors.muted,
  }
});

export default ListItem;
