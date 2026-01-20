import {
    findSimilarBuildings,
    formatSimilarityScore,
    generateSingleReason,
    getBuildingImageUrl,
    getSimilarityColor,
    type SimilarBuilding,
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

type Route = RouteProp<RootParams, typeof screens.SimilarBuildings>;
type Navigation = NativeStackNavigationProp<RootParams>;

function BuildingCard({
  building,
  onPress,
}: {
  building: SimilarBuilding;
  onPress: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = building.bin ? getBuildingImageUrl(building.bin) : null;
  const similarityColor = getSimilarityColor(building.visual_similarity);

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
        {/* Similarity Badge */}
        <View style={[styles.similarityBadge, { backgroundColor: similarityColor }]}>
          <Text style={styles.similarityText}>
            {formatSimilarityScore(building.visual_similarity)}
          </Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>
          {building.name || building.address || 'Unknown Building'}
        </Text>
        {building.address && building.name && (
          <Text style={styles.cardAddress} numberOfLines={1}>
            {building.address}
          </Text>
        )}
        <View style={styles.cardMeta}>
          {building.year && <Text style={styles.cardYear}>{building.year}</Text>}
          {building.style && (
            <View style={styles.styleBadge}>
              <Text style={styles.styleText}>{building.style}</Text>
            </View>
          )}
        </View>
        {/* Metadata match indicators */}
        {building.metadata_boost > 0 && (
          <View style={styles.matchIndicators}>
            {building.metadata_boost >= 0.15 && (
              <Text style={styles.matchIcon}>🏗️</Text>
            )}
            {building.metadata_boost >= 0.1 && building.metadata_boost < 0.15 && (
              <Text style={styles.matchIcon}>🎨</Text>
            )}
          </View>
        )}
        {/* AI-generated similarity reason */}
        {building.reasonLoading ? (
          <View style={styles.reasonLoading}>
            <ActivityIndicator size="small" color={theme.colors.muted} />
            <Text style={styles.reasonLoadingText}>Analyzing...</Text>
          </View>
        ) : building.similarity_reason ? (
          <Text style={styles.reasonText}>
            {building.similarity_reason}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
    </TouchableOpacity>
  );
}

export default function SimilarBuildingsScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { buildingData } = route.params || {};

  const [buildings, setBuildings] = useState<SimilarBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSimilarBuildings() {
      if (!buildingData?.bin) {
        setError('No building data provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Step 1: Find similar buildings (fast - no reasons yet)
        const results = await findSimilarBuildings({
          bin: buildingData.bin,
          limit: 7,
          sourceName: buildingData.name,
          sourceStyle: buildingData.style,
          sourceYear: buildingData.year ? Number(buildingData.year) : undefined,
        });

        // Show buildings immediately
        setBuildings(results);
        setLoading(false);
        setError(null);

        // Step 2: Generate reasons progressively (async)
        const sourceName = buildingData.name || 'Unknown';
        const sourceStyle = buildingData.style || null;
        const sourceYear = buildingData.year ? Number(buildingData.year) : null;

        // Generate reasons in parallel (but update UI as each completes)
        results.forEach(async (building, index) => {
          try {
            const reason = await generateSingleReason(
              sourceName,
              sourceStyle,
              sourceYear,
              building,
            );

            // Update this specific building's reason
            setBuildings((prev) =>
              prev.map((b, i) =>
                i === index
                  ? { ...b, similarity_reason: reason, reasonLoading: false }
                  : b
              )
            );
          } catch (err) {
            console.warn('[SimilarBuildings] Reason error:', err);
            // Mark as done loading even on error
            setBuildings((prev) =>
              prev.map((b, i) =>
                i === index ? { ...b, reasonLoading: false } : b
              )
            );
          }
        });
      } catch (err) {
        console.error('[SimilarBuildings] Error:', err);
        setError('Failed to find similar buildings');
        setLoading(false);
      }
    }

    loadSimilarBuildings();
  }, [buildingData]);

  const handleBuildingPress = (building: SimilarBuilding) => {
    navigation.push(screens.BuildingInfo, {
      buildingData: building as any,
      skipAestheticTracking: true,
    });
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
          <Text style={styles.headerLabel}>SIMILAR TO</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {buildingData?.name || 'Unknown Building'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Finding similar buildings...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.muted} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : buildings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={48} color={theme.colors.muted} />
          <Text style={styles.emptyText}>No similar buildings found</Text>
          <Text style={styles.emptySubtext}>
            This building may not have embeddings yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={buildings}
          keyExtractor={(item, index) => `${item.bin}-${index}`}
          renderItem={({ item }) => (
            <BuildingCard building={item} onPress={() => handleBuildingPress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {buildings.length} similar building{buildings.length !== 1 ? 's' : ''} found
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
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
    position: 'relative',
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
  similarityBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  similarityText: {
    fontSize: theme.typography.fontSize.xxxs,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  cardName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 3,
  },
  cardAddress: {
    fontSize: theme.typography.fontSize.smPlus,
    color: theme.colors.muted,
    marginBottom: 5,
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
  styleBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  styleText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchIndicators: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  matchIcon: {
    fontSize: theme.typography.fontSize.sm,
  },
  reasonText: {
    fontSize: theme.typography.fontSize.smPlus,
    color: theme.colors.muted,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 18,
  },
  reasonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  reasonLoadingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
});
