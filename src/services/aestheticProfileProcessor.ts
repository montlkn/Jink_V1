/**
 * Aesthetic Profile Processor
 * Handles client-side profile updates from events
 */

import { log } from '@/lib/log';
import { supabaseGateway } from './gateways/supabaseGateway';
import { getUnprocessedEvents, markEventsProcessed } from './gateways/aestheticEventGateway';
import { processEventsAndUpdateProfile } from './aestheticAlgorithmService';
import { getUserAestheticProfile } from '@/features/quiz';

/**
 * Main function: Fetch events, process them, and update user profile
 * Called after creating high-priority events or when queue is flushed
 */
export async function processEventsClientSide(userId: string): Promise<void> {
  try {
    log.info('[profileProcessor] Processing events for user', { userId });

    // 1. Fetch current profile
    const currentProfile = await getUserAestheticProfile(userId);
    if (!currentProfile) {
      log.warn('[profileProcessor] No profile found for user', { userId });
      return;
    }

    // 2. Fetch unprocessed events
    const events = await getUnprocessedEvents(userId, 100);
    if (events.length === 0) {
      log.debug('[profileProcessor] No unprocessed events');
      return;
    }

    log.info('[profileProcessor] Processing events', { count: events.length, userId });

    // 3. Process events and calculate new profile (now with advanced confidence)
    const updatedProfile = processEventsAndUpdateProfile(currentProfile, events);

    // Calculate additional metadata for new algorithm features
    const actionDiversity = Object.keys(updatedProfile.action_counts).length;
    const totalActions = Object.values(updatedProfile.action_counts).reduce(
      (sum, count) => sum + (count as number),
      0
    );

    // Calculate entropy
    let entropy = 0;
    Object.values(updatedProfile.normalized_scores).forEach((score) => {
      const p = score / 100;
      if (p > 0) entropy -= p * Math.log(p);
    });

    // Calculate confidence components for transparency
    const baseConfidence = Math.min(70, totalActions * 1.5);
    const diversityBonus = actionDiversity * 10;
    const consistencyBonus = (1 - entropy / Math.log(9)) * 15;

    // 4. Update profile in database (with new fields)
    const { error: updateError } = await supabaseGateway
      .from('user_aesthetic_profiles')
      .update({
        raw_scores: updatedProfile.raw_scores,
        normalized_scores: updatedProfile.normalized_scores,
        confidence: updatedProfile.confidence,
        action_counts: updatedProfile.action_counts,
        action_diversity: actionDiversity,
        entropy: entropy,
        confidence_components: {
          base: baseConfidence,
          diversity: diversityBonus,
          consistency: consistencyBonus,
        },
        last_decay_timestamp: updatedProfile.last_decay_timestamp?.toISOString(),
        total_events_processed: updatedProfile.total_events_processed,
      })
      .eq('user_id', userId);

    if (updateError) {
      log.error('[profileProcessor] Failed to update profile', updateError);
      throw updateError;
    }

    // 5. Mark events as processed
    const eventUuids = events.map((e) => e.event_uuid);
    await markEventsProcessed(eventUuids);

    log.info('[profileProcessor] Profile updated successfully', {
      userId,
      eventsProcessed: events.length,
      confidence: updatedProfile.confidence,
      primaryArchetype: Object.entries(updatedProfile.normalized_scores)
        .sort(([, a], [, b]) => b - a)[0]?.[0],
    });
  } catch (error) {
    log.error('[profileProcessor] Failed to process events', error);
    // Don't throw - let caller decide how to handle
  }
}

/**
 * Force a profile refresh (refetch from database without processing new events)
 * Useful for syncing after background processing
 */
export async function refreshProfileCache(userId: string): Promise<void> {
  try {
    await getUserAestheticProfile(userId);
    log.debug('[profileProcessor] Profile cache refreshed', { userId });
  } catch (error) {
    log.error('[profileProcessor] Failed to refresh profile cache', error);
  }
}
