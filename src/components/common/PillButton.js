/* File: /src/components/common/PillButton.js
  Description: A reusable, pill-shaped button based on your designs.
*/
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme, BUTTON_SIZES, SHADOWS } from '@/theme/tokens';

const PillButton = ({ title, onPress, style, textStyle }) => {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={[styles.text, textStyle]}>{title.toUpperCase()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.white,
    paddingVertical: BUTTON_SIZES.pill.paddingVertical,
    paddingHorizontal: BUTTON_SIZES.pill.paddingHorizontal,
    borderRadius: BUTTON_SIZES.pill.borderRadius,
    borderWidth: theme.layout.borderWidth.thin,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  text: {
    color: theme.colors.black,
    fontSize: BUTTON_SIZES.pill.fontSize,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default PillButton;
