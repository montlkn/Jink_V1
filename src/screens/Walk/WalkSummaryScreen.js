import { useAuth } from "@/auth/authProvider";
import { log } from "@/lib/log";
import { screens } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { getBuildingDisplayName } from '@/utils/buildingUtils';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from 'react';
import {
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
// eslint-disable-next-line no-restricted-imports
import { createAestheticEvent } from "@/services/gateways/aestheticEventGateway";

export default function WalkSummaryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { session } = useAuth();
  const [walkLabel, setWalkLabel] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [_isSavingLabel, setIsSavingLabel] = useState(false);
  
  const walkId = route.params?.walkId;
  const stats = useMemo(() => route.params?.stats || {
    totalBuildings: 0,
    visitedBuildings: 0,
    totalXp: 0,
    xpMultiplier: 1,
    routeTier: 'bronze',
  }, [route.params?.stats]);
  const buildings = route.params?.buildings || [];

  // Track walk completion
  useEffect(() => {
    if (!walkId || !session?.user?.id) {
      log.warn('[WalkSummary] Missing walkId or session');
      return;
    }

    createAestheticEvent({
      userId: session.user.id,
      eventType: 'route_complete',
      payload: {
        walk_id: walkId,
        total_buildings: stats.totalBuildings,
        visited_buildings: stats.visitedBuildings,
        total_xp: stats.totalXp,
        xp_multiplier: stats.xpMultiplier,
        route_tier: stats.routeTier,
      },
    }).catch((err) => log.warn('[WalkSummary] Failed to track route_complete', err));
  }, [walkId, session, stats]);

  const handleSaveLabel = async () => {
    if (!walkId || !walkLabel.trim()) return;

    setIsSavingLabel(true);
    try {
      const { supabaseGateway } = await import('@/services/gateways/supabaseGateway');
      await supabaseGateway
        .from('walks')
        .update({ custom_label: walkLabel.trim() })
        .eq('id', walkId);
      log.info(`[WalkSummary] Saved custom label: ${walkLabel}`);
    } catch (err) {
      log.warn('[WalkSummary] Failed to save label', err);
    } finally {
      setIsSavingLabel(false);
    }
  };

  const handleDone = async () => {
    // Save label before navigating away if there's a label
    if (walkLabel.trim()) {
      await handleSaveLabel();
    }
    navigation.navigate(screens.Main, { screen: screens.WalkStart });
  };

  const handleViewPastWalks = () => {
    navigation.navigate(screens.PastWalksNolli);
  };

  const visitedBuildings = buildings.filter(b => b.visited);
  const skippedBuildings = buildings.filter(b => !b.visited);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>JINK COMPLETE</Text>
          <Text style={styles.subtitle}>Walk Summary</Text>
        </View>

        {/* XP Earned */}
        <View style={styles.xpCard}>
          <Text style={styles.xpLabel}>XP EARNED</Text>
          <Text style={styles.xpValue}>+{stats.totalXp || 0}</Text>
          {stats.xpMultiplier > 1 && (
            <Text style={styles.xpMultiplier}>{stats.xpMultiplier}x bonus applied</Text>
          )}
        </View>

        {/* Walk Label Input */}
        <View style={styles.labelSection}>
          <Text style={styles.labelTitle}>NAME THIS JINK (OPTIONAL)</Text>
          <TextInput
            style={styles.labelInput}
            placeholder="e.g., SoHo Cast Iron, Brooklyn Heights..."
            placeholderTextColor={theme.colors.muted}
            value={walkLabel}
            onChangeText={setWalkLabel}
            maxLength={50}
            autoCapitalize="words"
          />
          <Text style={styles.labelHint}>
            {walkLabel.length}/50 characters
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="location" size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats.visitedBuildings || 0}</Text>
            <Text style={styles.statLabel}>Buildings Verified</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="walk" size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats.distance?.toFixed(1) || '0'} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{Math.round(stats.duration || 0)} min</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>

        {/* Route Tier Badge */}
        {stats.routeTier && (
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>
              {stats.routeTier === 'aesthetic' && '🎨 Aesthetic Route'}
              {stats.routeTier === 'behavioral' && '🔍 Discovery Route'}
              {stats.routeTier === 'wildcard' && '🎲 Exploration Route'}
            </Text>
          </View>
        )}

        {/* Buildings List */}
        {visitedBuildings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BUILDINGS VERIFIED ({visitedBuildings.length})</Text>
            {visitedBuildings.map((building, index) => (
              <View key={building.bin || index} style={styles.buildingItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <View style={styles.buildingInfo}>
                  <Text style={styles.buildingName}>
                    {getBuildingDisplayName(building)}
                  </Text>
                  {building.style && (
                    <Text style={styles.buildingStyle}>{building.style}</Text>
                  )}
                </View>
                <Text style={styles.buildingXp}>+50 XP</Text>
              </View>
            ))}
          </View>
        )}

        {skippedBuildings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SKIPPED ({skippedBuildings.length})</Text>
            {skippedBuildings.map((building, index) => (
              <View key={building.bin || index} style={[styles.buildingItem, styles.buildingSkipped]}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                <View style={styles.buildingInfo}>
                  <Text style={[styles.buildingName, styles.buildingNameSkipped]}>
                    {getBuildingDisplayName(building)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={handleDone}>
            <Text style={styles.primaryButtonText}>DONE</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleViewPastWalks}>
            <Text style={styles.secondaryButtonText}>View Past Walks</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  xpCard: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  xpValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  xpMultiplier: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  labelSection: {
    marginBottom: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  labelTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 1,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  labelInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  labelHint: {
    fontSize: 10,
    color: theme.colors.muted,
    marginTop: 6,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8,
    fontFamily: 'monospace',
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.muted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  tierBadge: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tierText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 1,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  buildingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buildingSkipped: {
    opacity: 0.6,
  },
  buildingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  buildingName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  buildingNameSkipped: {
    color: theme.colors.muted,
  },
  buildingStyle: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  buildingXp: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    fontFamily: 'monospace',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
});
