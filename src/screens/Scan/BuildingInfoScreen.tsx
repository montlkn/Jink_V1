
import { useAuth } from '@/auth/authProvider';
// eslint-disable-next-line no-restricted-imports
import { RewardAnimationOverlay } from '@/components/rewards';
import { BuildingInfoSkeleton, fetchBuildingBySearch, TimePeriodSlider } from '@/features/scan';
import { log } from '@/lib/log';
import { screens, type RootParams } from '@/navigation/routes';
// eslint-disable-next-line no-restricted-imports
import { createAestheticEvent } from '@/services/gateways/aestheticEventGateway';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { BuildingContributionSection } from '../BuildingDetails/BuildingContributionSection';

type Route = RouteProp<RootParams, typeof screens.BuildingInfo>;
type Navigation = NativeStackNavigationProp<RootParams>;

export default function BuildingInfoScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { session } = useAuth() as any;
  const buildingParam = route.params?.buildingData;

  const [building, setBuilding] = useState<any>(buildingParam);
  const [loading, setLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showRewardOverlay, setShowRewardOverlay] = useState(false);
  const hasShownReward = useRef(false);

  // Dwell time tracking
  const dwellStartTime = useRef(Date.now());
  const dwellTracked = useRef({ '15s': false, '30s': false, '60s': false });

  // Fetch building data from Supabase if we have search params
  useEffect(() => {
    async function loadBuilding() {
      // If we already have full building data, use it
      if (buildingParam && buildingParam.architect) {
        setBuilding(buildingParam);
        return;
      }

      // Otherwise, try to fetch from Supabase using available params
      if (buildingParam) {
        setLoading(true);

        const searchParams: any = {};
        if ((buildingParam as any).bin) searchParams.bin = (buildingParam as any).bin;
        else if (buildingParam.address) searchParams.address = buildingParam.address;
        else if (buildingParam.name) searchParams.name = buildingParam.name;

        if (Object.keys(searchParams).length > 0) {
          const data = await fetchBuildingBySearch(searchParams);
          if (data) {
            setBuilding(data);
          } else {
            // Keep the passed data even if Supabase lookup failed
            setBuilding(buildingParam);
          }
        } else {
          setBuilding(buildingParam);
        }

        setLoading(false);
      }
    }

    loadBuilding();
  }, [buildingParam]);

  // Track detail view event on mount
  useEffect(() => {
    if (building && session?.user?.id) {
      createAestheticEvent({
        userId: session.user.id,
        eventType: 'detail_view',
        buildingBbl: building.bbl || building.bin,
        payload: { building_name: building.name },
      }).catch((err) => log.warn('[BuildingInfo] Failed to track detail_view', err));

      // Show reward overlay on first view
      if (!hasShownReward.current) {
        hasShownReward.current = true;
        // Small delay so screen renders first
        setTimeout(() => setShowRewardOverlay(true), 500);
      }
    }
  }, [building, building?.bbl, building?.bin, session?.user?.id]);

  // Track dwell time (15s, 30s, 60s+)
  useEffect(() => {
    if (!building || !session?.user?.id) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - dwellStartTime.current) / 1000;

      if (elapsed >= 60 && !dwellTracked.current['60s']) {
        dwellTracked.current['60s'] = true;
        createAestheticEvent({
          userId: session.user.id,
          eventType: 'dwell_time_60s+',
          buildingBbl: building.bbl || building.bin,
          payload: {
            building_name: building.name,
            dwell_seconds: Math.floor(elapsed)
          },
        }).catch((err) => log.warn('[BuildingInfo] Failed to track dwell 60s+', err));
      } else if (elapsed >= 30 && !dwellTracked.current['30s']) {
        dwellTracked.current['30s'] = true;
        createAestheticEvent({
          userId: session.user.id,
          eventType: 'dwell_time_30s',
          buildingBbl: building.bbl || building.bin,
          payload: {
            building_name: building.name,
            dwell_seconds: Math.floor(elapsed)
          },
        }).catch((err) => log.warn('[BuildingInfo] Failed to track dwell 30s', err));
      } else if (elapsed >= 15 && !dwellTracked.current['15s']) {
        dwellTracked.current['15s'] = true;
        createAestheticEvent({
          userId: session.user.id,
          eventType: 'dwell_time_15s',
          buildingBbl: building.bbl || building.bin,
          payload: {
            building_name: building.name,
            dwell_seconds: Math.floor(elapsed)
          },
        }).catch((err) => log.warn('[BuildingInfo] Failed to track dwell 15s', err));
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [building, session?.user?.id]);

  const handleDirections = () => {
    if (!building) return;
    const query = encodeURIComponent(building.address || building.name);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch((err) => console.error('An error occurred', err));
  };

  const handleAddToList = () => {
    // Navigate to lists screen - user can select which list to add to
    navigation.navigate(screens.PassportLists);
  };

  const handleLike = async () => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);

    if (session?.user?.id && building?.bbl) {
      try {
        await createAestheticEvent({
          userId: session.user.id,
          eventType: newLiked ? 'building_like' : 'building_unlike',
          buildingBbl: building.bbl,
          payload: { building_name: building.name },
        });
      } catch (error) {
        log.warn('[BuildingInfo] Failed to track like event', error);
      }
    }
  };

  const handleSave = async () => {
    const newSaved = !isSaved;
    setIsSaved(newSaved);

    if (session?.user?.id && building?.bbl) {
      try {
        await createAestheticEvent({
          userId: session.user.id,
          eventType: 'building_save',
          buildingBbl: building.bbl,
          payload: { building_name: building.name },
        });
      } catch (error) {
        log.warn('[BuildingInfo] Failed to track save event', error);
      }
    }
  };

  const handleContribute = () => {
    // Navigate to NotFound screen with building data for contribution
    navigation.navigate(screens.NotFound, {
      message: `Help us add more information about ${building?.name || 'this building'}!`,
      buildingBIN: building?.bin || null,
      position: null,
      capturedPhotoUri: null,
    });
  };

  if (!building) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorHeader}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.errorTitle}>ERROR</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>NO BUILDING DATA FOUND</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return <BuildingInfoSkeleton />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Reward Animation Overlay */}
      <RewardAnimationOverlay
        visible={showRewardOverlay}
        xpEarned={50}
        source="scan"
        onDismiss={() => setShowRewardOverlay(false)}
        autoDismissDelay={3500}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Image Section */}
        <View style={styles.imageContainer}>
          {(building.image || building.photo_url || building.image_url) ? (
            <Image
              source={
                typeof (building.image || building.photo_url || building.image_url) === 'string'
                  ? { uri: building.photo_url || building.image_url || building.image }
                  : building.image as any
              }
              style={styles.mainImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.mainImage, styles.imagePlaceholder]}>
              <Text style={styles.placeholderIcon}>🏛️</Text>
              <Text style={styles.placeholderText}>No image available</Text>
            </View>
          )}
          
          {/* Header Overlay */}
          <SafeAreaView style={styles.headerOverlay}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <View style={styles.headerActions}>
                 <TouchableOpacity style={styles.actionIcon} onPress={handleLike}>
                   <Ionicons
                     name={isLiked ? 'heart' : 'heart-outline'}
                     size={24}
                     color={isLiked ? theme.colors.primary : theme.colors.text}
                   />
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.actionIcon} onPress={handleSave}>
                   <Ionicons
                     name={isSaved ? 'bookmark' : 'bookmark-outline'}
                     size={24}
                     color={isSaved ? theme.colors.primary : theme.colors.text}
                   />
                 </TouchableOpacity>
              </View>
            </View>
            <View style={styles.locationHeader}>
               <Ionicons name="location-sharp" size={16} color={theme.colors.primary} />
               <Text style={styles.locationTitle}>{building.name}</Text>
            </View>
          </SafeAreaView>

          {/* Info Card Overlay */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🏗️</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoCategory}>Architect</Text>
                <Text style={styles.infoLabel}>{building.architect || 'Unknown'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🎨</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoCategory}>Style</Text>
                <Text style={styles.infoLabel}>{building.style || 'Unknown'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🧱</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoCategory}>Materials</Text>
                <Text style={styles.infoLabel}>{building.materials || 'Unknown'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🏢</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoCategory}>Use</Text>
                <Text style={styles.infoLabel}>{building.use || 'Unknown'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🏷️</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoCategory}>Type</Text>
                <Text style={styles.infoLabel}>{building.type || 'Unknown'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
            </View>
            
            {/* Time Period Slider */}
            <View style={styles.sliderSection}>
              <TimePeriodSlider year={building.year || 1930} />
            </View>
          </View>
        </View>

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleContribute}>
            <Ionicons name="camera-outline" size={24} color={theme.colors.text} />
            <Text style={styles.actionText}>contribute</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddToList}>
            <Ionicons name="list-outline" size={24} color={theme.colors.text} />
            <Text style={styles.actionText}>add to list</Text>
          </TouchableOpacity>
        </View>

        {/* Directions Button */}
        <TouchableOpacity 
          style={styles.directionsButton}
          onPress={handleDirections}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate-outline" size={20} color={theme.colors.text} />
          <Text style={styles.directionsText}>Open in Maps</Text>
        </TouchableOpacity>

        {/* Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>information</Text>
          <View style={styles.infoTextContainer}>
             <View style={styles.verticalLine} />
             <Text style={styles.bodyText}>
              {building.description || building.summary ||
                `No detailed information available for ${building.name || 'this building'} yet. Help us build our database by contributing photos and information!`
              }
             </Text>
          </View>
        </View>

        {/* Lore Section */}
        <View style={styles.section}>
           <Text style={styles.sectionTitle}>lore:</Text>
           <Text style={styles.placeholderText}>No lore available yet.</Text>
        </View>

        {/* Community Contributions Section */}
        {building.bin && session?.user?.id && (
          <BuildingContributionSection
            buildingBIN={building.bin}
            currentUserId={session.user.id}
          />
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  placeholderText: {
    color: theme.colors.muted,
    fontFamily: 'monospace',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  titleContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    fontFamily: 'monospace',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 24,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  actionsRow: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
  },
  actionText: {
    fontSize: 10,
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.text,
    borderRadius: 4,
    gap: 8,
    marginBottom: 20,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: 'monospace',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoTextContainer: {
    flexDirection: 'row',
  },
  verticalLine: {
    width: 2,
    backgroundColor: theme.colors.primary,
    marginRight: 12,
  },
  bodyText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.accent,
    fontFamily: 'monospace',
    marginLeft: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.muted,
    fontFamily: 'monospace',
  },
  actionIcon: {
    marginBottom: 4,
  },
  locationHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  locationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: 'monospace',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoCategory: {
    fontSize: 10,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  sliderSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
});


