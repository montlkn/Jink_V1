import { useMemo } from 'react';
import { Image, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';

interface ClosePillButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ClosePillButton: React.FC<ClosePillButtonProps> = ({ onPress, style }) => {
  const iconSource = useMemo(() => {
    try {
      const resolved = Image.resolveAssetSource(require('../../../assets/icons/Close_Pill.svg'));
      return resolved?.uri ?? null;
    } catch {
      return null;
    }
  }, []);

  return (
    <TouchableOpacity 
      style={[styles.container, style]}
      onPress={onPress} 
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      {iconSource ? (
        <SvgUri uri={iconSource} width={80} height={80} />
      ) : (
        <View style={styles.fallback} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    left: -16,
    top: -16,
  },
  fallback: {
    width: 80,
    height: 80,
    backgroundColor: '#E5E5E5',
    borderRadius: 22,
  }
});
