/**
 * TourCompleteScreen
 *
 * Shows tour completion summary:
 * - Congratulations message
 * - XP earned
 * - Buildings visited
 * - Badge earned
 * - Share option
 * - Return to main navigation
 */

import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { APP_COLORS } from '@/constants/appColors';
import { navigate, resetToScreen } from '@/navigation/nav';
import { screens } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getTourById } from '../../data/tourBuildingLookup';
import type { Tour } from '../../data/tours/brooklynBridge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TourCompleteScreenProps {
  route: {
    params: {
      tourId: string;
      buildingsVisited: number;
      timeElapsed?: number; // in seconds
    };
  };
  navigation: any;
}

export default function TourCompleteScreen({
  route,
  navigation,
}: TourCompleteScreenProps): JSX.Element {
  const { tourId, buildingsVisited, timeElapsed } = route.params;
  const tour = getTourById(tourId);

  // Animation values
  const badgeScale = useRef(new Animated.Value(0)).current;
  const xpScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const confettiOpacity = useRef(new Animated.Value(1)).current;

  // Celebration animation on mount
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Staggered animations
    Animated.sequence([
      // Badge pops in
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      // XP bounces
      Animated.spring(xpScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      // Content fades in
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade confetti after a bit
    const confettiTimer = setTimeout(() => {
      Animated.timing(confettiOpacity, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: true,
      }).start();
    }, 3000);

    return () => clearTimeout(confettiTimer);
  }, [badgeScale, xpScale, contentOpacity, confettiOpacity]);

  const formatTime = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const handleShare = async () => {
    if (!tour) return;

    try {
      await Share.share({
        message: `I just completed the "${tour.name}" tour with the Architecture app! Explored ${buildingsVisited} historic buildings and earned ${tour.completion.xpReward} XP. 🏛`,
        title: 'Tour Complete!',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetToScreen(screens.Main);
  };

  const handleStartAnother = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigate(screens.TourSelect);
  };

  if (!tour) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Tour not found</Text>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>RETURN HOME</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalCheckpoints = tour.checkpoints.filter((c) => c.type === 'building').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Confetti background (simplified) */}
      <Animated.View style={[styles.confettiContainer, { opacity: confettiOpacity }]}>
        {[...Array(20)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.confettiPiece,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][
                  Math.floor(Math.random() * 5)
                ],
                transform: [{ rotate: `${Math.random() * 360}deg` }],
              },
            ]}
          />
        ))}
      </Animated.View>

      <View style={styles.content}>
        {/* Badge */}
        <Animated.View
          style={[
            styles.badgeContainer,
            {
              transform: [{ scale: badgeScale }],
            },
          ]}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>{tour.completion.badge?.icon || '🏆'}</Text>
          </View>
          <Text style={styles.badgeName}>{tour.completion.badge?.name || 'Tour Complete'}</Text>
        </Animated.View>

        {/* Congratulations */}
        <Text style={styles.congratsTitle}>TOUR COMPLETE!</Text>
        <Text style={styles.tourName}>{tour.name}</Text>

        {/* XP Earned */}
        <Animated.View
          style={[
            styles.xpContainer,
            {
              transform: [{ scale: xpScale }],
            },
          ]}
        >
          <Text style={styles.xpAmount}>+{tour.completion.xpReward}</Text>
          <Text style={styles.xpLabel}>XP EARNED</Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View style={[styles.statsContainer, { opacity: contentOpacity }]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{buildingsVisited}</Text>
            <Text style={styles.statLabel}>Buildings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tour.distance}</Text>
            <Text style={styles.statLabel}>Walked</Text>
          </View>
          {timeElapsed && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatTime(timeElapsed)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
            </>
          )}
        </Animated.View>

        {/* Summary message */}
        <Animated.Text style={[styles.summaryText, { opacity: contentOpacity }]}>
          {tour.completion.summary ||
            `You explored ${buildingsVisited} of ${totalCheckpoints} architectural landmarks on this tour.`}
        </Animated.Text>

        {/* Profile impact hint */}
        <Animated.View style={[styles.profileHint, { opacity: contentOpacity }]}>
          <Text style={styles.profileHintIcon}>✨</Text>
          <Text style={styles.profileHintText}>
            Your aesthetic profile has been updated based on the buildings you explored.
          </Text>
        </Animated.View>
      </View>

      {/* Action buttons */}
      <Animated.View style={[styles.buttonContainer, { opacity: contentOpacity }]}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>SHARE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>DONE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.anotherButton} onPress={handleStartAnother}>
          <Text style={styles.anotherButtonText}>Start Another Tour</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: APP_COLORS.warning,
    shadowColor: APP_COLORS.warning,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  badgeIcon: {
    fontSize: 48,
  },
  badgeName: {
    marginTop: 12,
    fontSize: theme.typography.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 1,
  },
  congratsTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: APP_COLORS.success,
    letterSpacing: 3,
    marginBottom: 8,
  },
  tourName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  xpContainer: {
    backgroundColor: APP_COLORS.success + '20',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  xpAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: APP_COLORS.success,
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_COLORS.success,
    letterSpacing: 2,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  summaryText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  profileHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  profileHintIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  profileHintText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  shareButton: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  shareButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
    fontWeight: '700',
    letterSpacing: 1,
  },
  doneButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.md,
    fontWeight: '700',
    letterSpacing: 1,
  },
  anotherButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  anotherButtonText: {
    color: theme.colors.muted,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  errorText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
});
