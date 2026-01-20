import { log } from '@/lib/log';
import { supabase } from '@/services/gateways/supabaseClient';
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type StampCategory = 'all' | 'building' | 'quest' | 'achievement' | 'neighborhood';

type Stamp = {
  id: string;
  slug: string;
  title: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  series: string;
  issued_at: string;
  source_type: string;
};

type StampCollectionViewProps = {
  userId: string;
};

const RARITY_COLORS = {
  common: theme.colors.muted,
  rare: theme.colors.secondary,
  epic: theme.colors.primary,
  legendary: theme.colors.accent,
};

export function StampCollectionView({ userId }: StampCollectionViewProps): JSX.Element {
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [filteredStamps, setFilteredStamps] = useState<Stamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StampCategory>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 20;

  const fetchStamps = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('user_stamps')
        .select(`
          id,
          issued_at,
          source_type,
          stamp:stamps_def (
            slug,
            title,
            description,
            rarity,
            series
          )
        `)
        .eq('user_id', userId)
        .order('issued_at', { ascending: false })
        .limit(ITEMS_PER_PAGE * page);

      if (error) throw error;

      const mappedStamps = (data || []).map((item: any) => ({
        id: item.id,
        slug: item.stamp?.slug || '',
        title: item.stamp?.title || 'Unknown',
        description: item.stamp?.description || '',
        rarity: item.stamp?.rarity || 'common',
        series: item.stamp?.series || 'building',
        issued_at: item.issued_at,
        source_type: item.source_type,
      }));

      setStamps(mappedStamps);
      setHasMore(mappedStamps.length === ITEMS_PER_PAGE * page);
    } catch (err) {
      log.error('[StampCollectionView] Failed to fetch stamps', err);
    } finally {
      setLoading(false);
    }
  }, [userId, page]);

  const filterStamps = useCallback(() => {
    if (activeTab === 'all') {
      setFilteredStamps(stamps);
    } else {
      setFilteredStamps(stamps.filter(stamp => stamp.series === activeTab));
    }
  }, [activeTab, stamps]);

  useEffect(() => {
    fetchStamps();
  }, [userId, fetchStamps]);

  useEffect(() => {
    filterStamps();
  }, [activeTab, stamps, filterStamps]);

  const loadMore = () => {
    if (!loading && hasMore && activeTab === 'all') {
      setPage(prev => prev + 1);
      fetchStamps();
    }
  };

  const renderStamp = ({ item }: { item: Stamp }) => (
    <TouchableOpacity style={[styles.stampCard, { borderColor: RARITY_COLORS[item.rarity] }]}>
      <View style={[styles.rarityIndicator, { backgroundColor: RARITY_COLORS[item.rarity] }]} />

      <View style={styles.stampIcon}>
        <Ionicons
          name={getIconForSeries(item.series)}
          size={32}
          color={RARITY_COLORS[item.rarity]}
        />
      </View>

      <Text style={styles.stampTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <Text style={styles.stampRarity}>{item.rarity.toUpperCase()}</Text>

      <Text style={styles.stampDate}>
        {new Date(item.issued_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading && stamps.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>STAMP COLLECTION</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.tabActive} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>STAMP COLLECTION</Text>
        <Text style={styles.count}>{filteredStamps.length} STAMPS</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['all', 'building', 'quest', 'achievement', 'neighborhood'] as StampCategory[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'all' ? 'ALL' : tab.substring(0, 3).toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stamp Grid */}
      {filteredStamps.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="ribbon-outline" size={48} color={theme.colors.muted} />
          <Text style={styles.emptyText}>No stamps in this category yet</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStamps}
          renderItem={renderStamp}
          keyExtractor={item => item.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={theme.colors.tabActive} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function getIconForSeries(series: string): any {
  switch (series) {
    case 'building':
      return 'business';
    case 'quest':
      return 'compass';
    case 'achievement':
      return 'trophy';
    case 'neighborhood':
      return 'map';
    default:
      return 'ribbon';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: 2,
  },
  count: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 1,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  activeTab: {
    backgroundColor: theme.colors.tabActive,
  },
  tabText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 1,
  },
  activeTabText: {
    color: theme.colors.background,
  },
  grid: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stampCard: {
    width: '31%',
    aspectRatio: 0.75,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rarityIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  stampIcon: {
    marginBottom: 8,
  },
  stampTitle: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 13,
  },
  stampRarity: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 8,
    color: theme.colors.muted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stampDate: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 8,
    color: theme.colors.muted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
