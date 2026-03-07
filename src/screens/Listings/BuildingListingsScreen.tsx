/**
 * BuildingListingsScreen — full-page listing view for a building.
 *
 * Route params: { buildingBin, buildingName }
 * - Premium listings section first (full photos, agent info, contact)
 * - Free listings section below (bare-bones teasers)
 * - "Are you an agent?" CTA at bottom
 */

import { useAuth } from '@/auth/authProvider';
import { log } from '@/lib/log';
import type { RootParams } from '@/navigation/routes';
import {
  fetchListingsForBuilding,
  trackListingEvent,
  type PropertyListing,
} from '@/services/listingsService';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Route = RouteProp<RootParams, 'BuildingListings'>;

export default function BuildingListingsScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { session } = useAuth() as any;
  const userId = session?.user?.id;

  const { buildingBin, buildingName } = route.params;

  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchListingsForBuilding(buildingBin);
        setListings(data);
      } catch (error) {
        log.error('[BuildingListings] Failed to load', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [buildingBin]);

  const premiumListings = listings.filter((l) => l.is_premium);
  const freeListings = listings.filter((l) => !l.is_premium);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={buildingName} onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (listings.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={buildingName} onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Ionicons name="home-outline" size={48} color={theme.colors.muted} />
          <Text style={styles.emptyTitle}>No Active Listings</Text>
          <Text style={styles.emptyText}>
            There are no listings for this building right now. Check back later.
          </Text>
        </View>
        <AgentCTA />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={buildingName} onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {premiumListings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured Listings</Text>
            {premiumListings.map((listing) => (
              <FullListingCard key={listing.id} listing={listing} userId={userId} />
            ))}
          </View>
        )}

        {freeListings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Public Listings</Text>
            {freeListings.map((listing) => (
              <FreeListingRow key={listing.id} listing={listing} userId={userId} />
            ))}
          </View>
        )}

        <AgentCTA />
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function FullListingCard({ listing, userId }: { listing: PropertyListing; userId?: string }) {
  const photos = (listing.listing_photos ?? []).sort((a, b) => a.photo_order - b.photo_order);
  const agent = listing.listing_agents;

  const handleContact = (method: 'email' | 'phone') => {
    trackListingEvent(listing.id, 'contact', userId);
    if (method === 'email' && agent?.email) Linking.openURL(`mailto:${agent.email}`);
    if (method === 'phone' && agent?.phone) Linking.openURL(`tel:${agent.phone}`);
  };

  return (
    <View style={styles.fullCard}>
      {/* Featured badge */}
      <View style={styles.featuredBadge}>
        <Text style={styles.featuredBadgeText}>FEATURED</Text>
      </View>

      {/* Photos */}
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
          {photos.map((photo) => (
            <Image
              key={photo.id}
              source={{ uri: photo.photo_url }}
              style={styles.fullCardImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.fullCardBody}>
        <Text style={styles.priceText}>{listing.price_display || 'Price upon request'}</Text>
        <Text style={styles.detailsText}>
          {[
            listing.bedrooms != null ? `${listing.bedrooms} bed` : null,
            listing.bathrooms != null ? `${listing.bathrooms} bath` : null,
            listing.square_feet ? `${listing.square_feet.toLocaleString()} sqft` : null,
            listing.unit_number ? `Unit ${listing.unit_number}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {listing.title && <Text style={styles.titleText}>{listing.title}</Text>}
        {listing.description && (
          <Text style={styles.descriptionText} numberOfLines={3}>
            {listing.description}
          </Text>
        )}

        {/* Agent info */}
        {agent && (
          <View style={styles.agentRow}>
            {agent.profile_photo_url && (
              <Image source={{ uri: agent.profile_photo_url }} style={styles.agentPhoto} />
            )}
            <View style={styles.agentInfo}>
              <Text style={styles.agentName}>{agent.agent_name}</Text>
              {agent.agency_name && <Text style={styles.agencyName}>{agent.agency_name}</Text>}
            </View>
          </View>
        )}

        {/* Contact buttons */}
        <View style={styles.contactRow}>
          {agent?.email && (
            <TouchableOpacity style={styles.contactButton} onPress={() => handleContact('email')}>
              <Ionicons name="mail-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.contactButtonText}>Email Agent</Text>
            </TouchableOpacity>
          )}
          {agent?.phone && (
            <TouchableOpacity style={styles.contactButton} onPress={() => handleContact('phone')}>
              <Ionicons name="call-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function FreeListingRow({ listing, userId }: { listing: PropertyListing; userId?: string }) {
  const sourceLabel =
    listing.source === 'zillow' ? 'Zillow' : listing.source === 'streeteasy' ? 'StreetEasy' : 'Source';

  const handleOpen = () => {
    trackListingEvent(listing.id, 'click', userId);
    if (listing.source_url) Linking.openURL(listing.source_url);
  };

  return (
    <TouchableOpacity style={styles.freeRow} onPress={listing.source_url ? handleOpen : undefined} activeOpacity={0.7}>
      <View style={styles.freeRowLeft}>
        <Text style={styles.priceText}>{listing.price_display || 'Contact for price'}</Text>
        <Text style={styles.detailsText}>
          {[
            listing.bedrooms != null ? `${listing.bedrooms} bed` : null,
            listing.bathrooms != null ? `${listing.bathrooms} bath` : null,
            listing.square_feet ? `${listing.square_feet.toLocaleString()} sqft` : null,
            listing.unit_number ? `Unit ${listing.unit_number}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || (listing.listing_type === 'rent' ? 'Rental' : 'For Sale')}
        </Text>
      </View>
      {listing.source_url && (
        <View style={styles.sourceLink}>
          <Text style={styles.sourceLinkText}>View on {sourceLabel}</Text>
          <Ionicons name="open-outline" size={12} color={theme.colors.info} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function AgentCTA() {
  return (
    <View style={styles.agentCTA}>
      <Ionicons name="briefcase-outline" size={24} color={theme.colors.primary} />
      <Text style={styles.agentCTATitle}>Are you a real estate agent?</Text>
      <Text style={styles.agentCTAText}>
        Get your listings featured in front of people actively exploring this building.
      </Text>
      <TouchableOpacity
        style={styles.agentCTAButton}
        onPress={() => Linking.openURL('mailto:agents@archapp.co?subject=Agent%20Listing%20Inquiry')}
      >
        <Text style={styles.agentCTAButtonText}>Learn More</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.muted,
    fontFamily: 'monospace',
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginTop: 16,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
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
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  // Full (premium) card
  fullCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: 16,
    overflow: 'hidden',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    zIndex: 1,
  },
  featuredBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  photoStrip: {
    height: 180,
  },
  fullCardImage: {
    width: 280,
    height: 180,
    marginRight: 2,
  },
  fullCardBody: {
    padding: 14,
  },
  priceText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  detailsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  titleText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginTop: 6,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    marginTop: 4,
    lineHeight: 18,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  agentPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  agentInfo: { flex: 1 },
  agentName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  agencyName: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    fontFamily: 'monospace',
  },
  contactRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 4,
    gap: 6,
  },
  contactButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  // Free listing row
  freeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  freeRowLeft: { flex: 1 },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceLinkText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.info,
    fontFamily: 'monospace',
  },
  // Agent CTA
  agentCTA: {
    alignItems: 'center',
    padding: 24,
    margin: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
  },
  agentCTATitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  agentCTAText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  agentCTAButton: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 4,
  },
  agentCTAButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
});
