/**
 * SkylineARScreen
 *
 * Wrapper screen for SkylineOverlay component.
 * Used at designated tour viewpoints for AR skyline experience.
 */

import { SkylineOverlay } from '@/components/ar/SkylineOverlay';
import { screens } from '@/navigation/routes';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getTourById, getCurrentCheckpoint } from '../../data/tourBuildingLookup';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';

interface SkylineARScreenProps {
  route: {
    params: {
      tourId: string;
      checkpointIndex: number;
      viewpointBearing?: number;
    };
  };
  navigation: any;
}

export default function SkylineARScreen({
  route,
  navigation,
}: SkylineARScreenProps): JSX.Element {
  const { tourId, checkpointIndex, viewpointBearing = 0 } = route.params;
  const tour = getTourById(tourId);

  if (!tour) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Tour not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const checkpoint = tour.checkpoints[checkpointIndex];

  if (!checkpoint || checkpoint.type !== 'viewpoint' || !checkpoint.arOverlay) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>This checkpoint does not have an AR viewpoint</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Transform AR overlay buildings to the format expected by SkylineOverlay
  const arBuildings = checkpoint.arOverlay.buildings.map((b) => {
    // Handle both string (BIN) and object formats
    if (typeof b === 'string') {
      return {
        bin: b,
        name: b,
        shortName: b,
        bearing: 0,
        elevation: 5,
        info: undefined,
      };
    }
    return {
      bin: b.bin || b.name.toLowerCase().replace(/\s+/g, '-'),
      name: b.name,
      shortName: b.shortName || b.name,
      bearing: b.bearing,
      elevation: b.elevation,
      // Convert string info to the expected object format
      info: b.info ? { style: b.info } : undefined,
    };
  });

  const handleComplete = () => {
    // Return to tour navigation, signaling the viewpoint was completed
    navigation.navigate(screens.TourNav, {
      tourId,
      viewpointCompleted: true,
    });
  };

  const handleBuildingTap = (building: { name: string; bin: string }) => {
    // Could track which buildings user found, for now just log
    console.log('[SkylineAR] Building tapped:', building.name);
  };

  return (
    <View style={styles.container}>
      {/* Close button overlay */}
      <View style={styles.closeButtonContainer}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Checkpoint name banner */}
      <View style={styles.headerBanner}>
        <Text style={styles.headerText}>{checkpoint.name}</Text>
      </View>

      <SkylineOverlay
        buildings={arBuildings}
        viewpointBearing={viewpointBearing}
        onComplete={handleComplete}
        onBuildingTap={handleBuildingTap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 200,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 150,
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
