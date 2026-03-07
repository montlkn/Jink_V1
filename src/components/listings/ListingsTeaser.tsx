/**
 * ListingsTeaser — compact card shown on BuildingInfoScreen.
 *
 * - Shows "X Available Listings" header
 * - Free listings: price + beds/baths + "View on Zillow" link
 * - Premium listings: photo, agent branding, contact buttons, featured badge
 * - "View All" navigates to full BuildingListingsScreen
 * - Tracks impressions on mount
 */

import { useAuth } from '@/auth/authProvider';
import { log } from '@/lib/log';
import { screens } from '@/navigation/routes';
import type { PropertyListing } from '@/services/listingsService';
import { trackListingEvent } from '@/services/listingsService';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ListingsTeaserProps {
  listings: PropertyListing[];
  buildingBin: string;
  buildingName: string;
}

export function ListingsTeaser({ listings, buildingBin, buildingName }: ListingsTeaserProps) {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { session } = useAuth() as any;
  const userId = session?.user?.id;

  // Track impressions for visible listings
  useEffect(() => {
    listings.slice(0, 3).forEach((listing) => {
      trackListingEvent(listing.id, 'impression', userId);
    });
  }, [listings, userId]);

  // Always show section for UI consistency (even if empty)
  // if (listings.length === 0) return null;

  const premiumListings = listings.filter((l) => l.is_premium);
  const freeListings = listings.filter((l) => !l.is_premium);

  // Show up to 1 premium + 2 free in the teaser
  const teaserListings = [
    ...premiumListings.slice(0, 1),
    ...freeListings.slice(0, 2),
  ];

  const handleViewAll = () => {
    navigation.navigate(screens.BuildingListings, {
      buildingBin,
      buildingName,
    });
  };

  const handleListingPress = (listing: PropertyListing) => {
    trackListingEvent(listing.id, 'click', userId);
    navigation.navigate(screens.ListingDetail, {
      listingId: listing.id,
      listing,
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleViewAll}
        activeOpacity={0.7}
        style={styles.headerButton}
      >
        <Text style={styles.sectionTitle}>listings</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
      </TouchableOpacity>

      {listings.length === 0 ? (
        <Text style={styles.emptyText}>No listings available for this building yet.</Text>
      ) : (
        teaserListings.map((listing) => (
          <ListingRow
            key={listing.id}
            listing={listing}
            onPress={() => handleListingPress(listing)}
          />
        ))
      )}
    </View>
  );
}

function ListingRow({ listing, onPress }: { listing: PropertyListing; onPress: () => void }) {
  const primaryPhoto = listing.is_premium
    ? (listing.listing_photos?.find((p) => p.is_primary) ?? listing.listing_photos?.[0])
    : null;

  // Format address
  const addressLine = listing.unit_number
    ? `Unit ${listing.unit_number}`
    : 'See details';

  return (
    <TouchableOpacity style={styles.listingRow} onPress={onPress} activeOpacity={0.7}>
      {/* Thumbnail - only for premium listings */}
      {listing.is_premium && primaryPhoto ? (
        <Image source={{ uri: primaryPhoto.photo_url }} style={styles.thumbnail} resizeMode="cover" />
      ) : listing.is_premium ? (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Ionicons name="home-outline" size={24} color={theme.colors.muted} />
        </View>
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Ionicons name="document-text-outline" size={24} color={theme.colors.muted} />
        </View>
      )}

      {/* Info */}
      <View style={styles.listingInfo}>
        <Text style={styles.addressText} numberOfLines={1}>
          {addressLine}
        </Text>
        <Text style={styles.detailsText}>
          {[
            listing.bedrooms != null ? `${listing.bedrooms} bed` : null,
            listing.bathrooms != null ? `${listing.bathrooms} bath` : null,
          ]
            .filter(Boolean)
            .join(' · ') || listing.listing_type}
        </Text>
        <Text style={styles.priceText}>
          {listing.price_display || 'Contact for price'}
          {listing.square_feet ? ` · ${listing.square_feet.toLocaleString()} sqft` : ''}
        </Text>
      </View>

      {/* Arrow - more prominent */}
      <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: 'monospace',
    textTransform: 'lowercase',
    letterSpacing: 1,
  },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  thumbnailPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingInfo: {
    flex: 1,
  },
  addressText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  detailsText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  priceText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  emptyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});
