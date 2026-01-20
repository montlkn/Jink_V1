import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TimePeriodSliderProps {
  year: string | number;
  minYear?: number;
  maxYear?: number;
}

export const TimePeriodSlider: React.FC<TimePeriodSliderProps> = ({ 
  year, 
  minYear = 1850, 
  maxYear = 2025 
}) => {
  const numericYear = typeof year === 'string' ? parseInt(year, 10) : year;
  
  // Calculate position percentage
  const position = useMemo(() => {
    if (isNaN(numericYear)) return 50; // Default to middle if invalid
    const range = maxYear - minYear;
    const value = Math.max(minYear, Math.min(numericYear, maxYear)) - minYear;
    return (value / range) * 100;
  }, [numericYear, minYear, maxYear]);

  return (
    <View style={styles.container}>
      {/* Year Label above locator */}
      <View style={[styles.labelContainer, { left: `${position}%` }]}>
        <Text style={styles.yearLabel}>{numericYear}</Text>
      </View>

      {/* Slider Bar */}
      <View style={styles.sliderContainer}>
        <LinearGradient
          colors={[theme.colors.black, theme.colors.muted, theme.colors.white]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBar}
        />
        
        {/* Locator */}
        <View style={[styles.locatorContainer, { left: `${position}%` }]}>
          <View style={styles.locatorOuter}>
            <View style={styles.locatorInner} />
          </View>
        </View>
      </View>
      
      {/* Range Labels */}
      <View style={styles.rangeLabels}>
        <Text style={styles.rangeText}>{minYear}</Text>
        <Text style={styles.rangeText}>{maxYear}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 10,
    marginTop: 10,
  },
  sliderContainer: {
    height: 4,
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  gradientBar: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
  },
  locatorContainer: {
    position: 'absolute',
    marginLeft: -10, // Half of locator width to center
    alignItems: 'center',
    justifyContent: 'center',
  },
  locatorOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Outer glow effect
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.text,
  },
  locatorInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary, // Active color
  },
  labelContainer: {
    position: 'absolute',
    top: -20,
    marginLeft: -20, // Approximate centering adjustment
    width: 40,
    alignItems: 'center',
  },
  yearLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: theme.colors.text,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rangeText: {
    fontSize: 10,
    color: theme.colors.muted,
    fontFamily: 'monospace',
  },
});
