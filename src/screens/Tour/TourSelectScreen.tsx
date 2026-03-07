/**
 * TourSelectScreen
 *
 * Tour picker screen - shows available guided tours.
 * For V1, only Brooklyn Bridge tour is available.
 */

import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { APP_COLORS } from '@/constants/appColors';
import { navigate } from '@/navigation/nav';
import { screens } from '@/navigation/routes';
import React from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAvailableTours, startTour } from '../../data/tourBuildingLookup';
import type { Tour } from '../../data/tours/brooklynBridge';

interface TourSelectScreenProps {
  navigation: any;
}

const TourCard: React.FC<{
  tour: Tour;
  onPress: () => void;
}> = ({ tour, onPress }) => (
  <TouchableOpacity style={styles.tourCard} onPress={onPress} activeOpacity={0.8}>
    {/* Tour cover image placeholder */}
    <View style={styles.tourImageContainer}>
      <View style={styles.tourImagePlaceholder}>
        <Text style={styles.tourImageIcon}>🌉</Text>
      </View>
      <View style={styles.tourBadge}>
        <Text style={styles.tourBadgeText}>{tour.difficulty.toUpperCase()}</Text>
      </View>
    </View>

    <View style={styles.tourContent}>
      <Text style={styles.tourName}>{tour.name}</Text>
      <Text style={styles.tourSubtitle}>{tour.subtitle}</Text>

      <View style={styles.tourMeta}>
        <View style={styles.tourMetaItem}>
          <Text style={styles.tourMetaIcon}>⏱</Text>
          <Text style={styles.tourMetaText}>{tour.duration}</Text>
        </View>
        <View style={styles.tourMetaItem}>
          <Text style={styles.tourMetaIcon}>📍</Text>
          <Text style={styles.tourMetaText}>{tour.distance}</Text>
        </View>
        <View style={styles.tourMetaItem}>
          <Text style={styles.tourMetaIcon}>🏛</Text>
          <Text style={styles.tourMetaText}>{tour.checkpoints.length} stops</Text>
        </View>
      </View>

      <Text style={styles.tourDescription} numberOfLines={2}>
        {tour.description}
      </Text>

      <View style={styles.tourFooter}>
        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>+{tour.completion.xpReward} XP</Text>
        </View>
        <Text style={styles.startText}>START TOUR →</Text>
      </View>
    </View>
  </TouchableOpacity>
);

export default function TourSelectScreen({ navigation }: TourSelectScreenProps): JSX.Element {
  const tours = getAvailableTours();

  const handleStartTour = (tour: Tour) => {
    startTour(tour.id);
    navigate(screens.TourNav, { tourId: tour.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GUIDED TOURS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Explore with a story</Text>
          <Text style={styles.introText}>
            Guided tours take you on a narrative journey through NYC's architectural history.
            Follow the checkpoints, discover stories, and earn XP along the way.
          </Text>
        </View>

        {tours.map((tour) => (
          <TourCard key={tour.id} tour={tour} onPress={() => handleStartTour(tour)} />
        ))}

        {tours.length === 1 && (
          <View style={styles.comingSoonCard}>
            <Text style={styles.comingSoonIcon}>🗺</Text>
            <Text style={styles.comingSoonTitle}>More Tours Coming Soon</Text>
            <Text style={styles.comingSoonText}>
              Midtown, Central Park, and more neighborhoods are being added.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: theme.colors.text,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: 2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  introSection: {
    marginBottom: 24,
  },
  introTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  introText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.muted,
    lineHeight: 22,
  },
  tourCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: theme.colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tourImageContainer: {
    height: 140,
    position: 'relative',
  },
  tourImagePlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tourImageIcon: {
    fontSize: 48,
  },
  tourBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: APP_COLORS.info,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tourBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tourContent: {
    padding: 16,
  },
  tourName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  tourSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    marginBottom: 12,
  },
  tourMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tourMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  tourMetaIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  tourMetaText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
    fontWeight: '600',
  },
  tourDescription: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.muted,
    lineHeight: 20,
    marginBottom: 16,
  },
  tourFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpBadge: {
    backgroundColor: APP_COLORS.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  xpText: {
    color: APP_COLORS.success,
    fontSize: 12,
    fontWeight: '700',
  },
  startText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '700',
    letterSpacing: 1,
  },
  comingSoonCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  comingSoonIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  comingSoonTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.muted,
    textAlign: 'center',
  },
});
