import type { WalkGeometry, WalkSummary } from "@/types/walks";

export type WalkSummaryItem = {
  id: string;
  startedAt: string;
  endedAt: string;
  distanceKm: number;
  borough?: string;
};

export type WalkDetail = WalkGeometry;

export const toWalkSummaryList = (summaries: WalkSummary[] | null | undefined): WalkSummaryItem[] => {
  if (!Array.isArray(summaries) || summaries.length === 0) {
    return [];
  }

  return summaries
    .filter((summary): summary is WalkSummary => Boolean(summary?.id))
    .map((summary) => ({
      id: summary.id,
      startedAt: summary.startedAt,
      endedAt: summary.endedAt,
      distanceKm: summary.distanceKm,
      borough: summary.borough ?? undefined,
    }));
};

export const toWalkDetail = (geometry: WalkGeometry | null | undefined): WalkDetail | null => {
  if (!geometry || !geometry.walkId) {
    return null;
  }
  return geometry;
};
