/* File: /src/components/common/PillButton.js
  Description: A reusable, pill-shaped button based on your designs.
*/
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const PillButton = ({ title, onPress, style, textStyle }) => {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={[styles.text, textStyle]}>{title.toUpperCase()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50, // Creates the pill shape
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default PillButton;
