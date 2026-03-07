import { useAuth } from '@/auth/authProvider';
import {
    awardXpWithLevelDetection,
    BuildingInfoSkeleton,
    checkAndAwardVisas,
    createAestheticEvent,
    fetchBuildingBySearch,
    getBuildingImageUrl,
    getLandmarkContext,
    LevelUpModal,
    RewardAnimationOverlay,
    StreakMilestoneModal,
    TimePeriodSlider,
    updateStreakWithMilestoneDetection,
    VisaGrantedModal,
    type LevelUpResult,
    type StreakMilestoneResult,
} from '@/features/scan';
import { log } from '@/lib/log';
import { screens, type RootParams } from '@/navigation/routes';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
    Image,
    Linking,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { BuildingContributionSection } from '../BuildingDetails/BuildingContributionSection';
import { useNetworkStatus } from '@/utils/networkStatus';
import { getListingsFlags } from '@/config/featureFlags';
import { ListingsTeaser } from '@/components/listings/ListingsTeaser';
import { fetchListingsForBuilding, type PropertyListing } from '@/services/listingsService';

// Helper function to convert text to Title Case
function titleCase(str: string | undefined | null): string {
  if (!str) return 'Unknown';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

type Route = RouteProp<RootParams, typeof screens.BuildingInfo>;
type Navigation = NativeStackNavigationProp<RootParams>;

export default function BuildingInfoScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { session } = useAuth() as any;
  const buildingParam = route.params?.buildingData;
  const skipAestheticTracking = route.params?.skipAestheticTracking ?? false;
  const { isOnline } = useNetworkStatus();

  const [building, setBuilding] = useState<any>(buildingParam);
  const [loading, setLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [cloudflareImageUrl, setCloudflareImageUrl] = useState<string | null>(null);
  const [fallbackImageFailed, setFallbackImageFailed] = useState(false);
  const [showRewardOverlay, setShowRewardOverlay] = useState(false);
  const hasShownReward = useRef(false);

  // Historical info from RAG (PDF chunks)
  const [historicalInfo, setHistoricalInfo] = useState<string | null>(null);
  const [fullHistoryText, setFullHistoryText] = useState<string | null>(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);

  // Celebration modal state
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState<LevelUpResult | null>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakData, setStreakData] = useState<StreakMilestoneResult | null>(null);
  const [showVisaModal, setShowVisaModal] = useState(false);
  const [visaData, setVisaData] = useState<any>(null);

  // Listings state
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const listingsFlags = getListingsFlags();

  // Overflow menu state
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  // Dwell time tracking
  const dwellStartTime = useRef(Date.now());
  const dwellTracked = useRef({ '15s': false, '30s': false, '60s': false });

  // Fetch building data from Supabase if we have search params
  useEffect(() => {
    async function loadBuilding() {
      // If we already have full building data (has architect), use it
      if (buildingParam && buildingParam.architect) {
        log.info('[BuildingInfo] Using complete data from params:', buildingParam.name);
        setBuilding(buildingParam);
        return;
      }

      // Otherwise, try to fetch from Supabase using available params
      if (buildingParam) {
        setLoading(true);
        log.info('[BuildingInfo] Fetching full data for:', {
          bin: (buildingParam as any).bin,
          address: buildingParam.address,
          name: buildingParam.name,
          lat: (buildingParam as any).latitude,
          lng: (buildingParam as any).longitude,
        });

        let fetchedData = null;

        // Priority 1: Try BIN lookup (most precise, fastest with index)
        if ((buildingParam as any).bin && (buildingParam as any).bin !== 'unknown') {
          log.info('[BuildingInfo] Trying BIN lookup:', (buildingParam as any).bin);
          fetchedData = await fetchBuildingBySearch({ bin: (buildingParam as any).bin });
          if (fetchedData) {
            log.info('[BuildingInfo] BIN lookup succeeded:', fetchedData.name);
          }
        }

        // Priority 2: Try GPS coordinates (BIN failed or not available)
        if (!fetchedData) {
          const lat = (buildingParam as any).latitude || (buildingParam as any).lat;
          const lng = (buildingParam as any).longitude || (buildingParam as any).lng;
          
          if (lat && lng) {
            log.info('[BuildingInfo] Trying GPS lookup:', { lat, lng });
            fetchedData = await fetchBuildingBySearch({ 
              lat,
              lng,
              radiusKm: 0.05, // 50m radius
            });
            if (fetchedData) {
              log.info('[BuildingInfo] GPS lookup succeeded:', fetchedData.name);
            }
          }
        }

        // Priority 3: Try name lookup (for static list data without BIN/coords)
        if (!fetchedData && buildingParam.name) {
          log.info('[BuildingInfo] Trying name lookup:', buildingParam.name);
          fetchedData = await fetchBuildingBySearch({ name: buildingParam.name });
          if (fetchedData) {
            log.info('[BuildingInfo] Name lookup succeeded:', fetchedData.name);
          }
        }

        if (fetchedData) {
          // Merge fetched data with original params to preserve any extra info
          const mergedData = { ...buildingParam, ...fetchedData };
          log.info('[BuildingInfo] Using merged data:', {
            bin: mergedData.bin,
            name: mergedData.name,
            architect: mergedData.architect,
          });
          setBuilding(mergedData);
        } else {
          // Keep the passed data even if all Supabase lookups failed
          log.warn('[BuildingInfo] All lookups failed, using original params');
          setBuilding(buildingParam);
        }

        setLoading(false);
      }
    }

    loadBuilding();
  }, [buildingParam]);

  // Fetch historical info from RAG and summarize with Gemini
  useEffect(() => {
    async function fetchHistoricalInfo() {
      if (!building?.name || !isOnline) return;

      setHistoricalLoading(true);
      try {
        // Fetch more chunks for full history
        const chunks = await getLandmarkContext(building.name, 5);

        if (chunks.length > 0) {
          const { getGeminiModel } = await import('@/services/gateways');
          const model = getGeminiModel('gemini-2.0-flash-lite');

          const rawText = chunks.join(' ');

          // Generate short synopsis
          const synopsisResult = await model.generateContent(
            `Write a 2-sentence historical summary about ${building.name}. Max 50 words. Fix OCR errors.

Raw text: "${rawText.substring(0, 1500)}"

Rules:
- This is about ONE building, not a comparison
- NEVER use "both" or compare to other buildings
- First sentence: architect and year built
- Second sentence: why it's historically significant
- Use specific facts from the text

Output ONLY the two sentences.`
          );

          // Generate full cleaned history
          const fullResult = await model.generateContent(
            `Clean up and rewrite this historical text about ${building.name}. Fix OCR errors, improve readability, use proper paragraphs. Keep all important facts. Max 300 words.

Raw text: "${rawText.substring(0, 4000)}"

Output ONLY the cleaned text.`
          );

          setHistoricalInfo(synopsisResult.response.text().trim());
          setFullHistoryText(fullResult.response.text().trim());
          log.info('[BuildingInfo] Historical info generated');
        } else {
          setHistoricalInfo(null);
          setFullHistoryText(null);
          log.info('[BuildingInfo] No historical info found for:', building.name);
        }
      } catch (error) {
        log.warn('[BuildingInfo] Failed to fetch historical info:', error);
        setHistoricalInfo(null);
        setFullHistoryText(null);
      } finally {
        setHistoricalLoading(false);
      }
    }

    fetchHistoricalInfo();
  }, [building?.name, isOnline]);

  // Load Cloudflare image when building data is available
  useEffect(() => {
    // Convert BIN to string if it's a number (Supabase returns floats like 1036156.0)
    const binValue = building?.bin;
    const binString = binValue ? String(binValue).replace(/\.0$/, '') : null;
    
    if (binString && binString !== 'unknown') {
      // Get the front view (0deg_40pitch) from Cloudflare R2
      const imageUrl = getBuildingImageUrl(binString, { angle: '0deg', pitch: '40pitch' });
      setCloudflareImageUrl(imageUrl);
      log.info('[BuildingInfo] Cloudflare image URL:', imageUrl, 'BIN:', binString);
    } else {
      log.info('[BuildingInfo] No valid BIN for Cloudflare image, BIN:', binValue);
      setCloudflareImageUrl(null);
    }
  }, [building?.bin]);

  // Fetch listings when flag is on and building has a BIN
  useEffect(() => {
    if (!listingsFlags.enabled || !listingsFlags.showOnBuildingInfo) return;
    if (!building?.bin || !isOnline) return;

    log.info('[BuildingInfo] Fetching listings for building:', {
      name: building.name,
      bin: building.bin,
      binType: typeof building.bin,
    });

    fetchListingsForBuilding(building.bin)
      .then((results) => {
        log.info('[BuildingInfo] Listings fetched:', {
          count: results.length,
          bin: building.bin,
        });
        setListings(results);
      })
      .catch((err) => log.warn('[BuildingInfo] Failed to fetch listings', err));
  }, [building?.bin, isOnline, listingsFlags.enabled, listingsFlags.showOnBuildingInfo]);

  // Track detail view event on mount (skip if coming from lists)
  useEffect(() => {
    const fromScan = route.params?.fromScan;
    if (building && session?.user?.id && !skipAestheticTracking) {
      createAestheticEvent({
        userId: session.user.id,
        eventType: 'detail_view',
        buildingBbl: building.bbl || building.bin,
        payload: { building_name: building.name },
      }).catch((err) => log.warn('[BuildingInfo] Failed to track detail_view', err));

      // Show reward overlay on first view (from scan only)
      // ONLY award XP if this is a NEW scan (not from list view)
      if (!hasShownReward.current && fromScan) {
        hasShownReward.current = true;

        // Award XP with level detection and streak milestone detection
        const handleRewards = async () => {
          try {
            // Award XP and check for level-up
            const levelResult = await awardXpWithLevelDetection({
              amount: 50,
              source: 'building_scan',
              userId: session.user.id,
            });

            if (levelResult.leveledUp) {
              setLevelUpData(levelResult);
              log.info('[BuildingInfo] Level up detected:', levelResult);
            }

            // Check for streak milestone
            const streakResult = await updateStreakWithMilestoneDetection(session.user.id);
            if (streakResult.reachedMilestone) {
              setStreakData(streakResult);
              log.info('[BuildingInfo] Streak milestone detected:', streakResult);
            }


            // Check for visa awards
            try {
              const visaResult = await checkAndAwardVisas(session.user.id);
              if (visaResult && visaResult.visas_awarded && visaResult.visas_awarded.length > 0) {
                // Show the first visa awarded
                const firstVisa = visaResult.visas_awarded[0];
                setVisaData(firstVisa);
                log.info('[BuildingInfo] Visa awarded:', firstVisa);
              }
            } catch (visaError) {
              log.warn('[BuildingInfo] Failed to check visa awards', visaError);
            }
          } catch (error) {
            log.warn('[BuildingInfo] Failed to handle XP/streak rewards', error);
          }
        };

        // Start rewards handling
        handleRewards();

        // Small delay so screen renders first
        setTimeout(() => setShowRewardOverlay(true), 500);
      }
    } else if (skipAestheticTracking) {
      log.info('[BuildingInfo] Skipping aesthetic tracking (from list view)');
    }
  }, [building, building?.bbl, building?.bin, session?.user?.id, skipAestheticTracking, route.params?.fromScan]);

  // Handlers for celebration sequence
  const handleRewardDismiss = () => {
    setShowRewardOverlay(false);
    // After reward overlay dismisses, check for level-up modal
    if (levelUpData?.leveledUp) {
      setTimeout(() => setShowLevelUpModal(true), 300);
    } else if (streakData?.reachedMilestone) {
      // If no level-up but streak milestone, show streak modal
      setTimeout(() => setShowStreakModal(true), 300);
    } else if (visaData) {
      // If no level-up or streak, show visa modal
      setTimeout(() => setShowVisaModal(true), 300);
    }
  };

  const handleLevelUpDismiss = () => {
    setShowLevelUpModal(false);
    // After level-up modal, check for streak milestone
    if (streakData?.reachedMilestone) {
      setTimeout(() => setShowStreakModal(true), 300);
    } else if (visaData) {
      // If no streak, show visa modal
      setTimeout(() => setShowVisaModal(true), 300);
    }
  };

  const handleStreakDismiss = () => {
    setShowStreakModal(false);
    // After streak modal, check for visa
    if (visaData) {
      setTimeout(() => setShowVisaModal(true), 300);
    }
  };

  const handleVisaDismiss = () => {
    setShowVisaModal(false);
  };

  // Track dwell time (15s, 30s, 60s+) - only for NEW scans, not list views
  useEffect(() => {
    if (!building || !session?.user?.id || skipAestheticTracking) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - dwellStartTime.current) / 1000;

      if (elapsed >= 60 && !dwellTracked.current['60s']) {
        dwellTracked.current['60s'] = true;
        createAestheticEvent({
          userId: session.user.id,
          eventType: 'dwell_60',
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
          eventType: 'dwell_30',
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
          eventType: 'dwell_15',
          buildingBbl: building.bbl || building.bin,
          payload: {
            building_name: building.name,
            dwell_seconds: Math.floor(elapsed)
          },
        }).catch((err) => log.warn('[BuildingInfo] Failed to track dwell 15s', err));
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [building, session?.user?.id, skipAestheticTracking]);

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
    if (newLiked) setIsDisliked(false); // Clear dislike if liking

    if (session?.user?.id && building?.bbl) {
      try {
        await createAestheticEvent({
          userId: session.user.id,
          eventType: newLiked ? 'like' : 'unlike',
          buildingBbl: building.bbl,
          payload: { building_name: building.name },
        });
      } catch (error) {
        log.warn('[BuildingInfo] Failed to track like event', error);
      }
    }
  };

  const handleDislike = async () => {
    const newDisliked = !isDisliked;
    setIsDisliked(newDisliked);
    if (newDisliked) setIsLiked(false); // Clear like if disliking

    if (session?.user?.id && building?.bbl) {
      try {
        await createAestheticEvent({
          userId: session.user.id,
          eventType: 'dislike',
          buildingBbl: building.bbl,
          payload: { building_name: building.name },
        });
      } catch (error) {
        log.warn('[BuildingInfo] Failed to track dislike event', error);
      }
    }
  };

  // handleSave removed - "Add to List" button replaces save functionality

  const handleContribute = () => {
    // Navigate to NotFound screen with building data for contribution
    navigation.navigate(screens.NotFound, {
      message: `Help us add more information about ${building?.name || 'this building'}!`,
      buildingBIN: building?.bin || null,
      position: null,
      capturedPhotoUri: null,
    });
  };

  // Handlers for navigating to related buildings by category
  const handleCategoryPress = (category: string, value: string | undefined) => {
    if (!value || value === 'Unknown') return;
    
    // Store the current building's location for proximity sorting
    const currentLat = parseFloat(building?.latitude) || parseFloat(building?.lat) || undefined;
    const currentLng = parseFloat(building?.longitude) || parseFloat(building?.lng) || undefined;
    
    // Navigate to RelatedBuildings screen with filter
    navigation.navigate(screens.RelatedBuildings, {
      filterType: category as any,
      filterValue: value,
      currentLat,
      currentLng,
      excludeBin: building?.bin,
      originBuilding: building?.name,
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

      {/* Offline Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.white} />
          <Text style={styles.offlineBannerText}>You're offline — some info may be unavailable</Text>
        </View>
      )}

      {/* Reward Animation Overlay */}
      <RewardAnimationOverlay
        visible={showRewardOverlay}
        xpEarned={50}
        source="scan"
        onDismiss={handleRewardDismiss}
        autoDismissDelay={3500}
      />

      {/* Level Up Modal */}
      {levelUpData && (
        <LevelUpModal
          visible={showLevelUpModal}
          oldLevel={levelUpData.oldLevel}
          newLevel={levelUpData.newLevel}
          newTitle={levelUpData.newTitle}
          tier={levelUpData.newTier}
          onClose={handleLevelUpDismiss}
        />
      )}

      {/* Streak Milestone Modal */}
      {streakData && streakData.milestoneLevel && (
        <StreakMilestoneModal
          visible={showStreakModal}
          streakCount={streakData.streakCount}
          milestoneLevel={streakData.milestoneLevel}
          newMultiplier={streakData.newMultiplier}
          onClose={handleStreakDismiss}
        />
      )}

      {/* Visa Granted Modal */}
      {visaData && (
        <VisaGrantedModal
          visible={showVisaModal}
          neighborhood={visaData.neighborhood || 'Unknown'}
          borough={visaData.borough || 'Unknown'}
          buildingCount={visaData.building_count || 10}
          onClose={handleVisaDismiss}
        />
      )}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Image Section */}
        <View style={styles.imageSection}>
          {/* Image or Placeholder */}
          {(() => {
            // Determine the best available image URL
            const fallbackUrl = building.photo_url || building.image_url || building.image;
            const hasCloudflare = Boolean(cloudflareImageUrl);
            const hasFallback = Boolean(fallbackUrl) && !fallbackImageFailed;
            
            if (hasCloudflare) {
              // Try Cloudflare first
              return (
                <Image
                  source={{ uri: cloudflareImageUrl! }}
                  style={styles.mainImage}
                  resizeMode="cover"
                  onLoadStart={() => {
                    log.info('[BuildingInfo] Starting to load Cloudflare image:', cloudflareImageUrl);
                  }}
                  onLoad={() => {
                    log.info('[BuildingInfo] Cloudflare image loaded successfully');
                  }}
                  onError={(e) => {
                    log.warn('[BuildingInfo] Cloudflare image failed to load:', {
                      url: cloudflareImageUrl,
                      error: e.nativeEvent?.error || 'unknown error'
                    });
                    setCloudflareImageUrl(null);
                  }}
                />
              );
            } else if (hasFallback) {
              // Try fallback URLs
              return (
                <Image
                  source={{ uri: fallbackUrl }}
                  style={styles.mainImage}
                  resizeMode="cover"
                  onError={() => {
                    log.warn('[BuildingInfo] Fallback image also failed, showing placeholder');
                    setFallbackImageFailed(true);
                  }}
                />
              );
            } else {
              // Show placeholder
              return (
                <View style={[styles.mainImage, styles.imagePlaceholder]}>
                  <Text style={styles.placeholderIcon}>🏛️</Text>
                  <Text style={styles.placeholderText}>No image available</Text>
                </View>
              );
            }
          })()}
          
          {/* Header Overlay - X button and overflow menu */}
          <SafeAreaView style={styles.headerOverlay}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowOverflowMenu(true)}
              >
                <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Overflow Menu Modal */}
        <Modal
          visible={showOverflowMenu}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowOverflowMenu(false)}
        >
          <TouchableOpacity
            style={styles.overflowBackdrop}
            activeOpacity={1}
            onPress={() => setShowOverflowMenu(false)}
          >
            <View style={styles.overflowMenu}>
              <TouchableOpacity
                style={styles.overflowMenuItem}
                onPress={() => {
                  setShowOverflowMenu(false);
                  navigation.navigate(screens.SimilarBuildings, { buildingData: building });
                }}
              >
                <Ionicons name="git-compare-outline" size={20} color={theme.colors.text} />
                <Text style={styles.overflowMenuText}>Find Similar Buildings</Text>
              </TouchableOpacity>
              <View style={styles.overflowMenuDivider} />
              <TouchableOpacity
                style={styles.overflowMenuItem}
                onPress={() => {
                  setShowOverflowMenu(false);
                  handleDirections();
                }}
              >
                <Ionicons name="navigate-outline" size={20} color={theme.colors.text} />
                <Text style={styles.overflowMenuText}>Open in Maps</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Thumbs Up/Down Row */}
        <View style={styles.thumbsRow}>
          <TouchableOpacity
            style={[styles.thumbButton, isLiked && styles.thumbButtonActive]}
            onPress={handleLike}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isLiked ? 'thumbs-up' : 'thumbs-up-outline'}
              size={24}
              color={isLiked ? theme.colors.white : theme.colors.success}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.thumbButton, isDisliked && styles.thumbButtonActiveRed]}
            onPress={handleDislike}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDisliked ? 'thumbs-down' : 'thumbs-down-outline'}
              size={24}
              color={isDisliked ? theme.colors.white : theme.colors.error}
            />
          </TouchableOpacity>
        </View>

        {/* Building Name Banner - with inline actions */}
        <View style={styles.nameBanner}>
          <Ionicons name="location-sharp" size={16} color={theme.colors.primary} />
          <Text style={styles.nameText}>{building.name}</Text>
          <View style={styles.inlineActions}>
            <TouchableOpacity style={styles.inlineActionButton} onPress={handleContribute}>
              <Ionicons name="camera-outline" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inlineActionButton} onPress={handleAddToList}>
              <Ionicons name="list-outline" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Card - Separate section */}
        <View style={styles.infoCard}>
          <TouchableOpacity 
            style={styles.infoRow} 
            onPress={() => handleCategoryPress('architect', building.architect)}
            activeOpacity={0.7}
          >
            <Text style={styles.infoIcon}>🏗️</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoCategory}>Architect</Text>
              <Text style={styles.infoLabel}>{titleCase(building.architect)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.infoRow}
            onPress={() => handleCategoryPress('style', building.style)}
            activeOpacity={0.7}
          >
            <Text style={styles.infoIcon}>🎨</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoCategory}>Style</Text>
              <Text style={styles.infoLabel}>{titleCase(building.style)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.infoRow}
            onPress={() => handleCategoryPress('materials', building.materials)}
            activeOpacity={0.7}
          >
            <Text style={styles.infoIcon}>🧱</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoCategory}>Materials</Text>
              <Text style={styles.infoLabel}>{titleCase(building.materials)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.infoRow}
            onPress={() => handleCategoryPress('use', building.use)}
            activeOpacity={0.7}
          >
            <Text style={styles.infoIcon}>🏢</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoCategory}>Use</Text>
              <Text style={styles.infoLabel}>{titleCase(building.use)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.infoRow, { marginBottom: 0 }]}
            onPress={() => handleCategoryPress('type', building.type)}
            activeOpacity={0.7}
          >
            <Text style={styles.infoIcon}>🏷️</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoCategory}>Type</Text>
              <Text style={styles.infoLabel}>{titleCase(building.type)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>
        
        {/* Time Period Slider - Separate section */}
        <View style={styles.sliderSection}>
          <TimePeriodSlider year={building.year || 1930} />
        </View>

        {/* Combined Lore/Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>lore/info</Text>
          <View style={styles.infoTextContainer}>
             <View style={styles.verticalLine} />
             {historicalLoading ? (
               <View style={styles.historicalLoading}>
                 <Text style={styles.loadingText}>Loading historical information...</Text>
               </View>
             ) : historicalInfo ? (
               <Text style={styles.bodyText}>{historicalInfo}</Text>
             ) : building.funFact ? (
               <View style={styles.loreContent}>
                 <Text style={styles.loreLabel}>Did you know?</Text>
                 <Text style={styles.bodyText}>{building.funFact}</Text>
               </View>
             ) : (
               <Text style={styles.bodyText}>
                 {building.description || building.summary ||
                   `No historical records found for ${building.name || 'this building'}. This building may not be a designated NYC landmark.`
                 }
               </Text>
             )}
          </View>
          {historicalInfo && (
            <View style={styles.infoFooter}>
              <Text style={styles.sourceText}>Source: NYC Landmarks Preservation Commission</Text>
              {fullHistoryText && (
                <TouchableOpacity
                  style={styles.readMoreButton}
                  onPress={() => setShowFullHistory(true)}
                >
                  <Text style={styles.readMoreText}>Read full history →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Full History Bottom Sheet */}
        <Modal
          visible={showFullHistory}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFullHistory(false)}
        >
          <View style={styles.bottomSheetOverlay}>
            <TouchableOpacity
              style={styles.bottomSheetBackdrop}
              activeOpacity={1}
              onPress={() => setShowFullHistory(false)}
            />
            <View style={styles.bottomSheet}>
              <View style={styles.bottomSheetHandle} />
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Full History</Text>
              </View>
              <ScrollView
                style={styles.bottomSheetContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.bottomSheetBuildingName}>{building.name}</Text>
                <Text style={styles.bottomSheetText}>{fullHistoryText}</Text>
                <Text style={styles.bottomSheetSource}>
                  Source: NYC Landmarks Preservation Commission
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Listings Teaser — always shown when feature enabled */}
        {listingsFlags.enabled && listingsFlags.showOnBuildingInfo && (
          <ListingsTeaser
            listings={listings}
            buildingBin={building.bin}
            buildingName={building.name}
          />
        )}

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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  offlineBannerText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.xs,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageSection: {
    width: '100%',
    height: 250,
    position: 'relative',
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
    fontSize: theme.typography.fontSize.xxxxl,
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
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
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
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: theme.typography.fontSize.base,
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
    fontSize: theme.typography.fontSize.xs,
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
    fontSize: theme.typography.fontSize.md,
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
    fontSize: theme.typography.fontSize.sm,
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
    fontSize: theme.typography.fontSize.md,
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
    fontSize: theme.typography.fontSize.base,
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
    fontSize: theme.typography.fontSize.lg,
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
    fontSize: theme.typography.fontSize.sm,
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
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  sliderSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  thumbsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  thumbButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbButtonActive: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  thumbButtonActiveRed: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  nameBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 8,
  },
  nameText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historicalLoading: {
    flex: 1,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    fontStyle: 'italic',
  },
  sourceText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoFooter: {
    marginTop: 12,
  },
  readMoreButton: {
    marginTop: 10,
  },
  readMoreText: {
    fontSize: theme.typography.fontSize.smPlus,
    color: theme.colors.primary,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  bottomSheetHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  bottomSheetTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bottomSheetBuildingName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: 'monospace',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  bottomSheetText: {
    fontSize: theme.typography.fontSize.mdPlus,
    lineHeight: 24,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  bottomSheetSource: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    marginTop: 20,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loreContent: {
    flex: 1,
  },
  loreLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.accent,
    fontFamily: 'monospace',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contributeLoreButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  contributeLoreText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overflowBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowMenu: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 240,
    overflow: 'hidden',
  },
  overflowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  overflowMenuText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  overflowMenuDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
});


