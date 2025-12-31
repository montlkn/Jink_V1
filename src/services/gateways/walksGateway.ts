/**
 * Walks gateway - handles walk session operations
 */
import type { WalkGeometry, WalkSummary } from "@/types/walks";
import { supabase } from "./supabaseClient";

const WALK_SUMMARIES_FUNCTION = "past-walk-summaries";
const WALK_GEOMETRY_FUNCTION = "past-walk-geometry";

type FetchWalkSummariesParams = {
  userId?: string | null;
  platform?: string;
};

export async function fetchWalkSummaries(params: FetchWalkSummariesParams): Promise<WalkSummary[]> {
  if (!params?.userId) return [];

  const { data, error } = await supabase.functions.invoke<WalkSummary[]>(
    WALK_SUMMARIES_FUNCTION,
    { body: { userId: params.userId, platform: params.platform } }
  );

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

type FetchWalkDetailParams = {
  walkId: string;
  platform?: string;
  tolerance?: number;
};

export async function fetchWalkDetail(params: FetchWalkDetailParams): Promise<WalkGeometry> {
  if (!params.walkId) throw new Error("walkId is required to fetch walk detail.");

  const { data, error } = await supabase.functions.invoke<WalkGeometry>(
    WALK_GEOMETRY_FUNCTION,
    { body: { walkId: params.walkId, platform: params.platform, tolerance: params.tolerance } }
  );

  if (error) throw error;
  if (!data) throw new Error(`No geometry returned for walk ${params.walkId}.`);

  return data;
}

type StartWalkParams = {
  userId: string;
  latitude: number;
  longitude: number;
  routeTier?: 'aesthetic' | 'behavioral' | 'wildcard';
  routeXpMultiplier?: number;
  compatibilityScore?: number;
  targetDurationMin?: number;
  estimatedDurationMin?: number;
  now?: number;
};

export type StartWalkResult = {
  walkId: string;
  userId: string;
  startedAt: string;
};

export async function startWalk(params: StartWalkParams): Promise<StartWalkResult> {
  const { userId, latitude, longitude, routeTier, routeXpMultiplier, compatibilityScore, targetDurationMin, estimatedDurationMin, now } = params;

  if (!userId) throw new Error("userId is required to start a walk.");

  const startedAtIso = new Date(typeof now === "number" ? now : Date.now()).toISOString();

  const { data, error } = await supabase
    .from("walks")
    .insert({
      user_id: userId,
      started_at: startedAtIso,
      origin_lat: latitude,
      origin_lng: longitude,
      route_tier: routeTier,
      route_xp_multiplier: routeXpMultiplier || 1.0,
      compatibility_score: compatibilityScore,
      target_duration_min: targetDurationMin,
      estimated_duration_min: estimatedDurationMin,
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Failed to create walk session");

  return { walkId: data.id, userId, startedAt: startedAtIso };
}

type CompleteWalkParams = {
  userId: string;
  walkId: string;
  now?: number;
};

export type CompleteWalkResult = {
  walkId: string;
  userId: string;
  completedAt: string;
  scanCount?: number;
  durationMinutes?: number;
  baseXp?: number;
  durationMultiplier?: number;
  routeTierMultiplier?: number;
  streakMultiplier?: number;
  totalXp?: number;
  routeTier?: string;
};

export async function completeWalk(params: CompleteWalkParams): Promise<CompleteWalkResult> {
  const { userId, walkId, now } = params;
  if (!userId || !walkId) throw new Error("userId and walkId are required to complete a walk.");

  const completedAtIso = new Date(typeof now === "number" ? now : Date.now()).toISOString();

  const { data, error } = await supabase.rpc("complete_walk_session", {
    p_user_id: userId,
    p_walk_id: walkId,
    p_completed_at: completedAtIso,
  });

  if (error) throw error;

  const result = data as any;

  return {
    walkId,
    userId,
    completedAt: completedAtIso,
    scanCount: result?.scan_count,
    durationMinutes: result?.duration_minutes,
    baseXp: result?.base_xp,
    durationMultiplier: result?.duration_multiplier,
    routeTierMultiplier: result?.route_tier_multiplier,
    streakMultiplier: result?.streak_multiplier,
    totalXp: result?.total_xp,
    routeTier: result?.route_tier,
  };
}

type FetchNearbyBuildingsParams = {
  latitude: number;
  longitude: number;
  radius: number;
  filters?: {
    style_in?: string[];
    architect_in?: string[];
    year_gte?: number;
    year_lte?: number;
  };
};

export async function fetchNearbyBuildings(params: FetchNearbyBuildingsParams) {
  const { latitude, longitude, radius, filters } = params;
  const { data, error } = await supabase.functions.invoke("nearby-buildings", {
    body: { latitude, longitude, radius, filters },
  });

  if (error) throw new Error(error.message || "Failed to fetch nearby buildings");

  const records = Array.isArray(data) ? data : [];
  return applyNearbyFilters(records, filters);
}

function applyNearbyFilters(
  buildings: Record<string, unknown>[],
  filters?: FetchNearbyBuildingsParams["filters"]
): Record<string, unknown>[] {
  if (!filters) return buildings;

  const styleSet = new Set(
    (filters.style_in ?? []).map((v) => v.toLowerCase().trim()).filter(Boolean)
  );
  const architectSet = new Set(
    (filters.architect_in ?? []).map((v) => v.toLowerCase().trim()).filter(Boolean)
  );
  const yearGte = typeof filters.year_gte === "number" && Number.isFinite(filters.year_gte) ? filters.year_gte : undefined;
  const yearLte = typeof filters.year_lte === "number" && Number.isFinite(filters.year_lte) ? filters.year_lte : undefined;

  const pickString = (obj: Record<string, unknown>, keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === "string" && value.trim().length) return value;
    }
    return undefined;
  };

  const pickNumber = (obj: Record<string, unknown>, keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return undefined;
  };

  return buildings.filter((building) => {
    const record = building ?? {};
    const styleValue = pickString(record as Record<string, unknown>, ["style", "primary_style", "style_name", "styleLabel"]);

    if (styleSet.size) {
      const normalized = styleValue?.toLowerCase().trim();
      if (!normalized || !styleSet.has(normalized)) return false;
    }

    const architectValue = pickString(record as Record<string, unknown>, ["architect", "architect_name", "primary_architect"]);

    if (architectSet.size) {
      const normalized = architectValue?.toLowerCase().trim();
      if (!normalized || !architectSet.has(normalized)) return false;
    }

    const yearValue = pickNumber(record as Record<string, unknown>, ["year_built", "year", "construction_year"]);

    if (typeof yearGte === "number" && (yearValue ?? Number.MIN_SAFE_INTEGER) < yearGte) return false;
    if (typeof yearLte === "number" && (yearValue ?? Number.MAX_SAFE_INTEGER) > yearLte) return false;

    return true;
  });
}
