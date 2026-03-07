/**
 * Aesthetic Event Gateway
 * Handles creation, queuing, and submission of aesthetic events
 */

import {
  ACTION_WEIGHTS,
  AestheticEvent,
  BATCH_THRESHOLDS,
} from "@/config/aestheticAlgorithm";
import { log } from "@/lib/log";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildingsSupabaseClient } from "./buildingsSupabaseClient";
import { supabaseGateway } from "./supabaseGateway";

const EVENT_QUEUE_KEY = "@aesthetic_event_queue";

export interface CreateEventParams {
  userId: string;
  eventType: string;
  eventSubtype?: string;
  buildingBbl?: string;
  payload?: Record<string, any>;
  aestheticVector?: Record<string, number>;
  eventTimestamp?: Date;
}

/**
 * Create an aesthetic event
 * High-priority events (quiz) process immediately
 * Low-priority events (scans, likes) are queued for batch submission
 */
export async function createAestheticEvent(
  params: CreateEventParams,
): Promise<void> {
  try {
    // Calculate base weight
    const weightKey = params.eventSubtype
      ? `${params.eventType}:${params.eventSubtype}`
      : params.eventType;
    const baseWeight = (ACTION_WEIGHTS as Record<string, number>)[weightKey] ??
      (ACTION_WEIGHTS as Record<string, number>)[params.eventType] ?? 1;

    // Fetch building aesthetic profile if this is a building event
    let buildingAestheticProfile = null;
    if (params.buildingBbl) {
      try {
        const { data } = await buildingsSupabaseClient
          ?.from("buildings_full_merge_scanning")
          .select("aesthetic_profile, significance_score")
          .eq("bbl", params.buildingBbl)
          .single() || { data: null };

        buildingAestheticProfile = data?.aesthetic_profile || null;
      } catch {
        log.warn("[aestheticEventGateway] Could not fetch building profile", {
          bbl: params.buildingBbl,
        });
      }
    }

    // Truncate building_bbl to fit DB column (VARCHAR(10) until migration 20251219 applied; then VARCHAR(20))
    const BBL_MAX_LEN = 10;
    const buildingBbl = params.buildingBbl
      ? params.buildingBbl.substring(0, BBL_MAX_LEN)
      : undefined;

    if (params.buildingBbl && params.buildingBbl.length > BBL_MAX_LEN) {
      log.warn("[aestheticEventGateway] Truncating long building_bbl", {
        original: params.buildingBbl,
        truncated: buildingBbl,
      });
    }

    const eventData = {
      user_id: params.userId,
      event_type: params.eventType,
      event_subtype: params.eventSubtype,
      building_bbl: buildingBbl,
      building_aesthetic_profile: buildingAestheticProfile,
      payload: params.payload || {},
      aesthetic_vector: params.aestheticVector,
      base_weight: baseWeight,
      event_timestamp: params.eventTimestamp?.toISOString() ||
        new Date().toISOString(),
    };

    // Immediate processing for high-priority events
    if (
      BATCH_THRESHOLDS.immediateEventTypes.includes(params.eventType as any)
    ) {
      await submitEventToDatabase(eventData);
      log.debug("[aestheticEventGateway] Submitted immediate event", {
        type: params.eventType,
      });
    } else {
      // Queue for batch processing
      await queueEvent(eventData);
      log.debug("[aestheticEventGateway] Queued event", {
        type: params.eventType,
      });
    }
  } catch (error) {
    log.error("[aestheticEventGateway] Failed to create event", error);
    throw error;
  }
}

/**
 * Submit a single event to the database
 */
async function submitEventToDatabase(eventData: any): Promise<void> {
  const { error } = await supabaseGateway
    .from("user_aesthetic_events")
    .insert([eventData]);

  if (error) {
    log.error("[aestheticEventGateway] Failed to insert event", error);
    throw error;
  }
}

/**
 * Queue an event for batch processing
 */
async function queueEvent(eventData: any): Promise<void> {
  try {
    const queue = await getEventQueue();
    queue.push(eventData);
    await AsyncStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(queue));

    log.debug("[aestheticEventGateway] Event queued", {
      queueLength: queue.length,
    });

    // Check if should flush based on size threshold
    if (queue.length >= BATCH_THRESHOLDS.minEvents) {
      await flushEventQueue();
    }
  } catch (error) {
    log.error("[aestheticEventGateway] Failed to queue event", error);
    throw error;
  }
}

/**
 * Get current event queue from local storage
 */
async function getEventQueue(): Promise<any[]> {
  try {
    const queueJson = await AsyncStorage.getItem(EVENT_QUEUE_KEY);
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (error) {
    log.error("[aestheticEventGateway] Failed to read event queue", error);
    return [];
  }
}

/**
 * Flush queued events to database
 * Called when queue reaches minEvents threshold or app comes to foreground
 */
export async function flushEventQueue(): Promise<void> {
  try {
    const queue = await getEventQueue();
    if (queue.length === 0) return;

    log.info("[aestheticEventGateway] Flushing event queue", {
      count: queue.length,
    });

    // Filter out invalid events to prevent database constraint violations
    const validEvents = queue.filter((event) => {
      // Check if event type is valid based on ACTION_WEIGHTS keys
      // Keys can be "type" or "type:subtype"
      const simpleKey = event.event_type;
      const compoundKey = event.event_subtype
        ? `${event.event_type}:${event.event_subtype}`
        : null;

      const isValid =
        Object.prototype.hasOwnProperty.call(ACTION_WEIGHTS, simpleKey) ||
        (compoundKey &&
          Object.prototype.hasOwnProperty.call(ACTION_WEIGHTS, compoundKey));

      if (!isValid) {
        log.warn(
          "[aestheticEventGateway] Discarding invalid event from queue",
          {
            type: event.event_type,
            subtype: event.event_subtype,
          },
        );
      }
      return isValid;
    });

    if (validEvents.length === 0) {
      // If all events were invalid, just clear the queue
      await AsyncStorage.removeItem(EVENT_QUEUE_KEY);
      log.info(
        "[aestheticEventGateway] Queue cleared (all events were invalid)",
      );
      return;
    }

    // Submit all valid queued events
    const { error } = await supabaseGateway
      .from("user_aesthetic_events")
      .insert(validEvents);

    if (error) {
      log.error("[aestheticEventGateway] Failed to flush queue", error);
      throw error;
    }

    // Clear queue on successful submission
    await AsyncStorage.removeItem(EVENT_QUEUE_KEY);
    log.debug("[aestheticEventGateway] Queue flushed successfully", {
      count: validEvents.length,
      discarded: queue.length - validEvents.length,
    });
  } catch (error) {
    log.error("[aestheticEventGateway] Error flushing queue", error);
    // Don't throw - queue stays in local storage for retry
  }
}

/**
 * Fetch unprocessed events for a user
 */
export async function getUnprocessedEvents(
  userId: string,
  limit: number = 100,
): Promise<AestheticEvent[]> {
  try {
    const { data, error } = await supabaseGateway
      .from("user_aesthetic_events")
      .select("*")
      .eq("user_id", userId)
      .eq("processed", false)
      .order("event_timestamp", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    log.error(
      "[aestheticEventGateway] Failed to fetch unprocessed events",
      error,
    );
    throw error;
  }
}

/**
 * Mark events as processed
 */
export async function markEventsProcessed(eventUuids: string[]): Promise<void> {
  if (eventUuids.length === 0) return;

  try {
    const { error } = await supabaseGateway
      .from("user_aesthetic_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .in("event_uuid", eventUuids);

    if (error) throw error;
    log.debug("[aestheticEventGateway] Marked events as processed", {
      count: eventUuids.length,
    });
  } catch (error) {
    log.error("[aestheticEventGateway] Failed to mark events processed", error);
    throw error;
  }
}

/**
 * Get event queue length (for debugging/monitoring)
 */
export async function getEventQueueLength(): Promise<number> {
  const queue = await getEventQueue();
  return queue.length;
}
