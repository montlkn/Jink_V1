/**
 * Listings Service
 *
 * Fetches real estate listings for buildings and tracks analytics events.
 * Premium listings (agent-placed) sort first; free listings (Zillow/StreetEasy) follow.
 */

import { log } from '@/lib/log';
import { supabase } from '@/services/gateways/supabaseClient';

export interface ListingPhoto {
  id: string;
  photo_url: string;
  photo_order: number;
  is_primary: boolean;
}

export interface ListingAgent {
  id: string;
  agent_name: string;
  agency_name: string | null;
  email: string;
  phone: string | null;
  profile_photo_url: string | null;
}

export interface PropertyListing {
  id: string;
  bin: string;
  agent_id: string | null;
  listing_type: 'sale' | 'rent';
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  price_amount: number | null;
  price_display: string | null;
  unit_number: string | null;
  title: string | null;
  description: string | null;
  source: 'zillow' | 'streeteasy' | 'agent' | 'manual';
  source_url: string | null;
  is_premium: boolean;
  listed_at: string;
  // Joined data
  listing_photos?: ListingPhoto[];
  listing_agents?: ListingAgent;
}

/**
 * Fetch active listings for a building (by BIN).
 * Returns premium listings first, then free listings sorted by date.
 */
export async function fetchListingsForBuilding(bin: string): Promise<PropertyListing[]> {
  try {
    const cleanBin = String(bin).replace(/\.0$/, '');

    const { data, error } = await supabase
      .from('property_listings')
      .select(`
        *,
        listing_photos ( id, photo_url, photo_order, is_primary ),
        listing_agents ( id, agent_name, agency_name, email, phone, profile_photo_url )
      `)
      .eq('bin', cleanBin)
      .eq('status', 'active')
      .order('is_premium', { ascending: false })
      .order('listed_at', { ascending: false });

    if (error) {
      log.warn('[Listings] Failed to fetch listings', error);
      return [];
    }

    return (data ?? []) as PropertyListing[];
  } catch (error) {
    log.error('[Listings] fetchListingsForBuilding error', error);
    return [];
  }
}

/**
 * Get count of active listings for a building (for badge display).
 */
export async function getListingCount(bin: string): Promise<number> {
  try {
    const cleanBin = String(bin).replace(/\.0$/, '');

    const { count, error } = await supabase
      .from('property_listings')
      .select('id', { count: 'exact', head: true })
      .eq('bin', cleanBin)
      .eq('status', 'active');

    if (error) {
      log.warn('[Listings] Failed to get listing count', error);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    log.error('[Listings] getListingCount error', error);
    return 0;
  }
}

/**
 * Fetch a single listing by ID (for detail screen).
 */
export async function fetchListingById(listingId: string): Promise<PropertyListing | null> {
  try {
    const { data, error } = await supabase
      .from('property_listings')
      .select(`
        *,
        listing_photos ( id, photo_url, photo_order, is_primary ),
        listing_agents ( id, agent_name, agency_name, email, phone, profile_photo_url )
      `)
      .eq('id', listingId)
      .single();

    if (error) {
      log.warn('[Listings] Failed to fetch listing by ID', error);
      return null;
    }

    return data as PropertyListing;
  } catch (error) {
    log.error('[Listings] fetchListingById error', error);
    return null;
  }
}

/**
 * Submit a tour request for a listing.
 */
export async function submitTourRequest(data: {
  listingId: string;
  agentId: string | null;
  userId?: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  tourType: 'in_person' | 'virtual' | 'open_house';
  preferredDate?: string;
  preferredTime?: string;
  message?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('listing_applications').insert({
      listing_id: data.listingId,
      agent_id: data.agentId,
      user_id: data.userId ?? null,
      applicant_name: data.applicantName,
      applicant_email: data.applicantEmail,
      applicant_phone: data.applicantPhone ?? null,
      tour_type: data.tourType,
      preferred_date: data.preferredDate ?? null,
      preferred_time: data.preferredTime ?? null,
      message: data.message ?? null,
      status: 'pending',
    });

    if (error) {
      log.warn('[Listings] Failed to submit tour request', error);
      return { success: false, error: error.message };
    }

    // Track contact event
    trackListingEvent(data.listingId, 'contact', data.userId);

    return { success: true };
  } catch (error: any) {
    log.error('[Listings] submitTourRequest error', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Track a listing analytics event (fire-and-forget).
 */
export function trackListingEvent(
  listingId: string,
  eventType: 'impression' | 'click' | 'contact' | 'share',
  userId?: string
): void {
  supabase
    .from('listing_analytics')
    .insert({
      listing_id: listingId,
      user_id: userId ?? null,
      event_type: eventType,
    })
    .then(({ error }) => {
      if (error) log.warn('[Listings] Failed to track event', error);
    });
}
