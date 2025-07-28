import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TimeSlider = ({ min = 5, max = 90, initialValue = 45 }) => {
  const [value, setValue] = useState(initialValue);

  return (
    <View style={styles.sliderContainer}>
      <Text style={styles.sliderText}>{min}</Text>
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderThumb, { left: `${((value - min) / (max - min)) * 100}%` }]} />
      </View>
      <Text style={styles.sliderText}>{max}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    transform: [{ rotate: '-90deg' }],
    position: 'absolute',
    left: -100,
    width: 350,
  },
  sliderText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
    transform: [{ rotate: '90deg' }],
  },
  sliderTrack: {
    height: 4,
    width: '70%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    position: 'relative',
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: '#000',
    borderRadius: 10,
    top: -8,
  },
});

export default TimeSlider; 