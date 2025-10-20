import { getPastWalkGeometry, getPastWalkSummaries } from "../api/walkApi";
import type { WalkGeometry, WalkHistoryDataset, WalkSummary } from "../types/walks";

type FetchOptions = {
  forceRefresh?: boolean;
};

const summariesCache = new Map<string, WalkSummary[]>();
const geometryCache = new Map<string, WalkGeometry>();

export async function fetchPastWalkSummaries(
  userId: string | null | undefined,
  options?: FetchOptions
): Promise<WalkSummary[]> {
  if (!userId) {
    const data = await getPastWalkSummaries(undefined);
    return data;
  }

  if (!options?.forceRefresh && summariesCache.has(userId)) {
    return summariesCache.get(userId) as WalkSummary[];
  }

  const summaries = await getPastWalkSummaries(userId);
  summariesCache.set(userId, summaries);
  return summaries;
}

export async function fetchWalkGeometry(
  walkId: string,
  options?: FetchOptions
): Promise<WalkGeometry> {
  if (!walkId) {
    throw new Error("walkId is required");
  }

  if (!options?.forceRefresh && geometryCache.has(walkId)) {
    return geometryCache.get(walkId) as WalkGeometry;
  }

  const geometry = await getPastWalkGeometry(walkId);
  geometryCache.set(walkId, geometry);
  return geometry;
}

export async function hydrateWalkHistoryDataset(
  userId: string | null | undefined,
  walkId?: string | null,
  options?: FetchOptions
): Promise<WalkHistoryDataset> {
  const summaries = await fetchPastWalkSummaries(userId, options);
  const targetWalkId = walkId ?? summaries[0]?.id ?? null;
  const selectedWalk = targetWalkId ? await fetchWalkGeometry(targetWalkId, options) : null;
  return {
    summaries,
    selectedWalk,
  };
}

export function primeWalkGeometry(geometry: WalkGeometry): void {
  geometryCache.set(geometry.walkId, geometry);
}

export function invalidateWalkHistoryCache(): void {
  summariesCache.clear();
  geometryCache.clear();
}
