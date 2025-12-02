import { useAuth } from '@/auth/authProvider';
import { ClosePillButton, fetchBuildingBySearch, TimePeriodSlider } from '@/features/scan';
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
    ActivityIndicator,
    Image,
    Linking,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

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

  if (!building) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorHeader}>
          <ClosePillButton onPress={() => navigation.goBack()} />
          <Text style={styles.errorTitle}>ERROR</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>NO BUILDING DATA FOUND</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorHeader}>
          <ClosePillButton onPress={() => navigation.goBack()} />
          <Text style={styles.errorTitle}>Loading...</Text>
        </View>
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.errorText, { marginTop: 20 }]}>
            Loading building details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Image Section */}
        <View style={styles.imageContainer}>
          <Image
            source={building.image as any}
            style={styles.mainImage}
            resizeMode="cover"
          />
          
          {/* Header Overlay */}
          <SafeAreaView style={styles.headerOverlay}>
            <View style={styles.header}>
              <ClosePillButton onPress={() => navigation.goBack()} />
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
          <TouchableOpacity style={styles.actionButton}>
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
    height: 500,
    width: '100%',
    position: 'relative',
    marginBottom: 60, // Increased to accommodate slider
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  infoCard: {
    position: 'absolute',
    bottom: -40,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 4, // Sharper corners for Designer Republic feel
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '40',
  },
  infoIcon: {
    fontSize: 14,
  },
  infoContent: {
    flex: 1,
    marginLeft: 8,
  },
  infoCategory: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '500',
    color: theme.colors.text,
    textTransform: 'lowercase',
  },
  sliderSection: {
    marginTop: 10,
    marginBottom: 5,
  },
  cardArrowContainer: {
    alignItems: 'center',
    position: 'absolute',
    bottom: -10,
    left: 0,
    right: 0,
  },
  cardArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: theme.colors.border,
    transform: [{ rotate: '180deg' }],
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: -12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: theme.colors.text,
    textTransform: 'uppercase',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'left',
    fontFamily: 'monospace',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoTextContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  verticalLine: {
    width: 2,
    backgroundColor: theme.colors.primary,
    height: '100%',
  },
  bodyText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'monospace',
    textAlign: 'left',
    color: theme.colors.text,
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: theme.colors.text,
    textTransform: 'uppercase',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
