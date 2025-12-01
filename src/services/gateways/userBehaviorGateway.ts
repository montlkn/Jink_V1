/**
 * User Behavior Gateway
 * Tracks user's past building interactions for behavioral fallback recommendations
 * Powers route generation when aesthetic profile has low compatibility
 */

import { log } from "@/lib/log";
import type { UserStyleExposure } from "../recommendationService";
import { buildingsSupabaseClient } from "./buildingsSupabaseClient";
import { supabaseGateway } from "./supabaseGateway";

export type UserBehaviorHistory = {
  scannedBuildings: {
    bin: string;
    architectural_style?: string;
    year_built?: number;
    architect?: string;
  }[];
  likedBuildings: {
    bin: string;
    architectural_style?: string;
    year_built?: number;
    architect?: string;
  }[];
  seenStyles: Record<string, number>; // { "art-deco": 5, "modernist": 2 }
};

/**
 * Fetch user's behavioral history for fallback recommendations
 * Looks at recent scans, likes, and saves to understand preferences
 */
export async function getUserBehavioralHistory(
  userId: string,
): Promise<UserBehaviorHistory> {
  try {
    // Query user_aesthetic_events for building interactions
    const { data: events, error: eventsError } = await supabaseGateway
      .from("user_aesthetic_events")
      .select("event_type, building_bbl, payload")
      .eq("user_id", userId)
      .in("event_type", ["building_scan", "building_like", "building_save"])
      .limit(100)
      .order("created_at", { ascending: false });

    if (eventsError) {
      log.error("[behaviorGateway] Failed to fetch events", eventsError);
      return getEmptyHistory();
    }

    if (!events || events.length === 0) {
      log.debug("[behaviorGateway] No behavioral history found", { userId });
      return getEmptyHistory();
    }

    // Extract unique building identifiers (BBL or BIN)
    const buildingIds = [
      ...new Set(
        events
          .map((e) => e.building_bbl || e.payload?.building_bin)
          .filter(Boolean),
      ),
    ];

    if (buildingIds.length === 0) {
      return getEmptyHistory();
    }

    // Fetch building details for each interaction
    const result = await buildingsSupabaseClient
      ?.from("buildings_full_merge_scanning")
      .select("bin, bbl, architectural_style, year_built, architect")
      .or(
        buildingIds
          .map((id) => `bin.eq.${id},bbl.eq.${id}`)
          .join(","),
      );

    const buildings = result?.data;
    const buildingsError = result?.error;

    if (buildingsError) {
      log.error("[behaviorGateway] Failed to fetch buildings", buildingsError);
      return getEmptyHistory();
    }

    // Aggregate into behavioral history
    const scannedBuildings: any[] = [];
    const likedBuildings: any[] = [];
    const seenStyles: Record<string, number> = {};

    for (const event of events) {
      const buildingId = event.building_bbl || event.payload?.building_bin;
      const building = buildings?.find(
        (b: any) => b.bin === buildingId || b.bbl === buildingId,
      );

      if (!building) continue;

      if (event.event_type === "building_scan") {
        scannedBuildings.push(building);
      } else if (
        event.event_type === "building_like" ||
        event.event_type === "building_save"
      ) {
        likedBuildings.push(building);
      }

      // Track style frequency
      const style = building.architectural_style?.toLowerCase();
      if (style) {
        seenStyles[style] = (seenStyles[style] || 0) + 1;
      }
    }

    log.debug("[behaviorGateway] Behavioral history loaded", {
      userId,
      scanned: scannedBuildings.length,
      liked: likedBuildings.length,
      uniqueStyles: Object.keys(seenStyles).length,
    });

    return { scannedBuildings, likedBuildings, seenStyles };
  } catch (error) {
    log.error("[behaviorGateway] Unexpected error", error);
    return getEmptyHistory();
  }
}

/**
 * Get user style exposure data for novelty calculations
 * Returns simplified structure for recommendation service
 */
export async function getUserStyleExposure(
  userId: string,
): Promise<UserStyleExposure> {
  const history = await getUserBehavioralHistory(userId);
  return {
    styleExposure: history.seenStyles,
  };
}

/**
 * Return empty history (fallback for new users or errors)
 */
function getEmptyHistory(): UserBehaviorHistory {
  return {
    scannedBuildings: [],
    likedBuildings: [],
    seenStyles: {},
  };
}
