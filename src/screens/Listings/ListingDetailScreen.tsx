/**
 * ListingDetailScreen — full detail view for a property listing
 *
 * - Large photos
 * - Full listing details (price, beds/baths, sqft)
 * - Agent info card
 * - "Request A Tour" CTA
 */

import { useAuth } from '@/auth/authProvider';
import { RequestTourForm } from '@/components/listings/RequestTourForm';
import { log } from '@/lib/log';
import { screens, type RootParams } from '@/navigation/routes';
import {
  fetchListingById,
  trackListingEvent,
  type PropertyListing,
} from '@/services/listingsService';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

type Route = RouteProp<RootParams, typeof screens.ListingDetail>;
type Navigation = NativeStackNavigationProp<RootParams>;

export default function ListingDetailScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { session } = useAuth() as any;
  const userId = session?.user?.id;

  const [listing, setListing] = useState<PropertyListing | null>(route.params?.listing ?? null);
  const [loading, setLoading] = useState(!route.params?.listing);
  const [showTourForm, setShowTourForm] = useState(false);

  useEffect(() => {
    // If listing wasn't passed in params, fetch it
    if (!listing && route.params?.listingId) {
      fetchListingById(route.params.listingId).then((data) => {
        setListing(data);
        setLoading(false);
      });
    }

    // Track detail view
    if (route.params?.listingId) {
      trackListingEvent(route.params.listingId, 'click', userId);
    }
  }, [route.params?.listingId, listing, userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Listing not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const primaryPhoto = listing.listing_photos?.find((p) => p.is_primary) ?? listing.listing_photos?.[0];
  const additionalPhotos = listing.listing_photos?.filter((p) => !p.is_primary) ?? [];
  const agent = listing.listing_agents;

  const handleContactAgent = (method: 'email' | 'phone') => {
    trackListingEvent(listing.id, 'contact', userId);
    if (method === 'email' && agent?.email) {
      Linking.openURL(`mailto:${agent.email}`);
    } else if (method === 'phone' && agent?.phone) {
      Linking.openURL(`tel:${agent.phone}`);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Listing at {listing.unit_number ? `Unit ${listing.unit_number}` : 'this building'}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Primary Photo - only for premium listings */}
        {listing.is_premium && primaryPhoto ? (
          <Image source={{ uri: primaryPhoto.photo_url }} style={styles.primaryPhoto} resizeMode="cover" />
        ) : listing.is_premium ? (
          <View style={[styles.primaryPhoto, styles.placeholderPhoto]}>
            <Ionicons name="home-outline" size={48} color={theme.colors.muted} />
            <Text style={styles.placeholderText}>No photo available</Text>
          </View>
        ) : null}

        {/* Listing Details */}
        <View style={styles.detailsSection}>
          {listing.unit_number && (
            <Text style={styles.unitNumber}>Unit {listing.unit_number}</Text>
          )}
          <Text style={styles.price}>{listing.price_display || 'Contact for price'}</Text>
          <Text style={styles.specs}>
            {[
              listing.bedrooms != null ? `${listing.bedrooms} bed` : null,
              listing.bathrooms != null ? `${listing.bathrooms} bath` : null,
              listing.square_feet ? `${listing.square_feet.toLocaleString()} sqft` : null,
            ]
              .filter(Boolean)
              .join(' · ') || (listing.listing_type === 'rent' ? 'Rental' : 'For Sale')}
          </Text>

          {listing.title && <Text style={styles.title}>{listing.title}</Text>}
          {listing.description && <Text style={styles.description}>{listing.description}</Text>}

          {/* CTA Text */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => setShowTourForm(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>click to get in touch now</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Additional Photos - only for premium listings */}
        {listing.is_premium && additionalPhotos.length > 0 && (
          <View style={styles.photosSection}>
            {additionalPhotos.slice(0, 3).map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: photo.photo_url }}
                style={styles.additionalPhoto}
                resizeMode="cover"
              />
            ))}
          </View>
        )}

        {/* Agent Info */}
        {agent && (
          <View style={styles.agentSection}>
            <View style={styles.agentCard}>
              {agent.profile_photo_url && (
                <Image source={{ uri: agent.profile_photo_url }} style={styles.agentPhoto} />
              )}
              <View style={styles.agentInfo}>
                <Text style={styles.agentName}>{agent.agent_name}</Text>
                {agent.agency_name && <Text style={styles.agencyName}>{agent.agency_name}</Text>}
                {agent.email && <Text style={styles.agentEmail}>{agent.email}</Text>}
                {agent.phone && <Text style={styles.agentPhone}>{agent.phone}</Text>}
              </View>
            </View>

            <View style={styles.contactButtons}>
              {agent.email && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleContactAgent('email')}
                >
                  <Ionicons name="mail-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.contactButtonText}>Email</Text>
                </TouchableOpacity>
              )}
              {agent.phone && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleContactAgent('phone')}
                >
                  <Ionicons name="call-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.contactButtonText}>Call</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Send to button */}
            <TouchableOpacity
              style={styles.sendToButton}
              onPress={() => setShowTourForm(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
              <Text style={styles.sendToText}>send to</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Tour Request Modal */}
      <RequestTourForm
        visible={showTourForm}
        listing={listing}
        onClose={() => setShowTourForm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
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
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.muted,
    fontFamily: 'monospace',
  },
  scrollView: {
    flex: 1,
  },
  primaryPhoto: {
    width: '100%',
    height: 300,
  },
  placeholderPhoto: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    fontFamily: 'monospace',
  },
  detailsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  unitNumber: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  price: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  specs: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  description: {
    fontSize: theme.typography.fontSize.md,
    lineHeight: 22,
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 4,
    gap: 8,
  },
  ctaText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photosSection: {
    padding: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  additionalPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 4,
  },
  agentSection: {
    padding: 20,
  },
  agentCard: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  agentPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  agencyName: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  agentEmail: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.info,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  agentPhone: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.muted,
    fontFamily: 'monospace',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
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
  sendToButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    gap: 8,
  },
  sendToText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.colors.white,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
