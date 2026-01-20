import {
    fetchRelatedBuildings,
    getBuildingImageUrl,
    type BuildingData,
} from '@/features/scan';
import { screens, type RootParams } from '@/navigation/routes';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Route = RouteProp<RootParams, typeof screens.RelatedBuildings>;
type Navigation = NativeStackNavigationProp<RootParams>;

// Helper function to convert text to Title Case
function titleCase(str: string | undefined | null): string {
  if (!str) return 'Unknown';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Format distance for display with walking time
function formatDistance(distanceKm: number | undefined): string {
  if (!distanceKm) return '';
  
  // Calculate walking time (average walking speed: ~5 km/h or ~3.1 mph)
  const walkingSpeedKmPerMin = 5 / 60; // 0.083 km per minute
  const walkingMinutes = Math.round(distanceKm / walkingSpeedKmPerMin);
  
  // Format walking time
  let walkTime = '';
  if (walkingMinutes < 1) {
    walkTime = '< 1 min walk';
  } else if (walkingMinutes >= 60) {
    const hours = Math.floor(walkingMinutes / 60);
    const mins = walkingMinutes % 60;
    walkTime = mins > 0 ? `${hours}h ${mins}m walk` : `${hours}h walk`;
  } else {
    walkTime = `${walkingMinutes} min walk`;
  }
  
  // Format distance
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft • ${walkTime}`;
  }
  return `${distanceKm.toFixed(1)} km • ${walkTime}`;
}

type BuildingCardProps = {
  building: BuildingData;
  onPress: () => void;
};

function BuildingCard({ building, onPress }: BuildingCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = building.bin ? getBuildingImageUrl(building.bin) : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardImageContainer}>
        {imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderIcon}>🏛️</Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>
          {(building.name && String(building.name) !== '0' && String(building.name).trim() !== '') 
            ? String(building.name)
            : (building.address || 'Unknown Building')}
        </Text>
        {building.name && String(building.name) !== '0' && String(building.name).trim() !== '' && building.address && (
          <Text style={styles.cardAddress} numberOfLines={1}>
            {building.address}
          </Text>
        )}
        <View style={styles.cardMeta}>
          {building.year && (
            <Text style={styles.cardYear}>{building.year}</Text>
          )}
          {(building as any).distance && (
            <Text style={styles.cardDistance}>
              {formatDistance((building as any).distance)}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
    </TouchableOpacity>
  );
}

export default function RelatedBuildingsScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { filterType, filterValue, currentLat, currentLng, excludeBin, originBuilding } = route.params || {};

  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBuildings() {
      if (!filterType || !filterValue) {
        setError('Missing filter parameters');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const results = await fetchRelatedBuildings({
          filterType: filterType as any,
          filterValue,
          currentLat,
          currentLng,
          excludeBin,
          limit: 25,
        });
        setBuildings(results);
        setError(null);
      } catch (err) {
        console.error('[RelatedBuildings] Error:', err);
        setError('Failed to load buildings');
      } finally {
        setLoading(false);
      }
    }

    loadBuildings();
  }, [filterType, filterValue, currentLat, currentLng, excludeBin]);

  const handleBuildingPress = (building: BuildingData) => {
    navigation.push(screens.BuildingInfo, { 
      buildingData: building as any,
      skipAestheticTracking: true, // Don't track browsing from related buildings
    });
  };

  const getCategoryLabel = (): string => {
    switch (filterType) {
      case 'architect': return 'Architect';
      case 'style': return 'Style';
      case 'materials': return 'Materials';
      case 'type': return 'Type';
      case 'use': return 'Use';
      default: return 'Category';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerLabel}>{getCategoryLabel()}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {titleCase(filterValue)}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Origin building info */}
      {originBuilding && (
        <View style={styles.originBanner}>
          <Text style={styles.originText}>
            Sorted by distance from {originBuilding}
          </Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Finding related buildings...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.muted} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : buildings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={48} color={theme.colors.muted} />
          <Text style={styles.emptyText}>No related buildings found</Text>
          <Text style={styles.emptySubtext}>
            Try a different category
          </Text>
        </View>
      ) : (
        <FlatList
          data={buildings}
          keyExtractor={(item, index) => item.bin || `building-${index}`}
          renderItem={({ item }) => (
            <BuildingCard
              building={item}
              onPress={() => handleBuildingPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {buildings.length} building{buildings.length !== 1 ? 's' : ''} found
            </Text>
          }
        />
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  originBanner: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  originText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.muted,
  },
  errorText: {
    marginTop: 16,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  resultCount: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  placeholderIcon: {
    fontSize: theme.typography.fontSize.xl,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  cardName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  cardAddress: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardYear: {
    fontSize: theme.typography.fontSize.xsPlus,
    color: theme.colors.accent,
    fontWeight: 'bold',
  },
  cardDistance: {
    fontSize: theme.typography.fontSize.xsPlus,
    color: theme.colors.muted,
  },
});
