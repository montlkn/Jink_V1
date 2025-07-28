/* File: /src/components/common/ListItem.js
  Description: A reusable list item row with a bottom border.
*/
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

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
    borderBottomColor: '#e0e0e0',
  },
  text: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 18,
    color: '#aaa',
  }
});

export default ListItem;
