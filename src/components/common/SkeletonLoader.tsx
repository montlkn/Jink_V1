import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonBlockProps {
  width?: number | string;
  height?: number | string;
  style?: ViewStyle;
  borderRadius?: number;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width = '100%',
  height = 20,
  style,
  borderRadius = theme.layout.borderRadius.sm,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius,
          opacity,
        } as any,
        style,
      ]}
    />
  );
};

export const BuildingInfoSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Image Placeholder */}
      <View style={styles.imageContainer}>
        <SkeletonBlock height="100%" width="100%" borderRadius={0} />
        
        {/* Header Overlay Skeleton */}
        <View style={styles.headerOverlay}>
           <View style={styles.headerRow}>
             <SkeletonBlock width={40} height={40} borderRadius={0} />
             <View style={styles.headerActions}>
               <SkeletonBlock width={40} height={40} borderRadius={0} />
               <SkeletonBlock width={40} height={40} borderRadius={0} />
             </View>
           </View>
           <View style={styles.locationBadge}>
             <SkeletonBlock width={150} height={30} borderRadius={0} />
           </View>
        </View>

        {/* Info Card Skeleton */}
        <View style={styles.infoCard}>
          {[1, 2, 3, 4, 5].map((_, index) => (
            <View key={index} style={styles.infoRow}>
              <SkeletonBlock width={20} height={20} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <SkeletonBlock width={60} height={10} style={{ marginBottom: 6 }} />
                <SkeletonBlock width={120} height={14} />
              </View>
              <SkeletonBlock width={10} height={10} />
            </View>
          ))}
          <View style={styles.sliderPlaceholder}>
             <SkeletonBlock width="100%" height={40} />
          </View>
        </View>
      </View>

      {/* Actions Row Skeleton */}
      <View style={styles.actionsRow}>
        <SkeletonBlock width="48%" height={60} borderRadius={0} />
        <SkeletonBlock width="48%" height={60} borderRadius={0} />
      </View>

      {/* Directions Button Skeleton */}
      <View style={styles.directionsContainer}>
        <SkeletonBlock width="100%" height={44} borderRadius={0} />
      </View>

      {/* Information Section Skeleton */}
      <View style={styles.section}>
        <SkeletonBlock width={100} height={16} style={{ marginBottom: 16 }} />
        <View style={styles.textContainer}>
           <SkeletonBlock width={2} height={100} style={{ marginRight: 16 }} />
           <View style={{ flex: 1, gap: 8 }}>
             <SkeletonBlock width="100%" height={14} />
             <SkeletonBlock width="95%" height={14} />
             <SkeletonBlock width="90%" height={14} />
             <SkeletonBlock width="98%" height={14} />
             <SkeletonBlock width="60%" height={14} />
           </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    backgroundColor: theme.colors.muted, // Using muted grey for the skeleton base
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  imageContainer: {
    height: 500,
    width: '100%',
    position: 'relative',
    marginBottom: 60,
  },
  headerOverlay: {
    position: 'absolute',
    top: 50, // Approximate status bar + padding
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  locationBadge: {
    alignSelf: 'center',
  },
  infoCard: {
    position: 'absolute',
    bottom: -40,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '40',
  },
  sliderPlaceholder: {
    marginTop: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -12, // Match the negative margin in the real screen
    marginBottom: 12,
  },
  directionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  textContainer: {
    flexDirection: 'row',
  },
});
