import { supabaseGateway as supabase, fetchXpSummary } from "./supabaseGateway";

type ProfileRow = {
  stamps: string[];
  achievements: string[];
};

export type PassportList = {
  id: string;
  name: string;
};

export type PassportSnapshot = {
  xpTotal: number;
  level: number;
  xpSpent: number;
  stamps: string[];
  achievements: string[];
  lists: PassportList[];
};

export async function fetchPassportProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .select("stamps, achievements")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  const stamps = Array.isArray(data?.stamps) ? data.stamps : [];
  const achievements = Array.isArray(data?.achievements) ? data.achievements : [];

  return {
    stamps,
    achievements,
  };
}

export async function fetchPassport(userId: string): Promise<PassportSnapshot> {
  const [profile, xpSnapshot] = await Promise.all([
    fetchPassportProfile(userId),
    fetchXpSummary(userId),
  ]);

  const xpTotal = xpSnapshot?.xp ?? 0;
  const level = xpSnapshot?.level ?? 1;
  const xpSpent = xpSnapshot?.xpSpent ?? 0;

  return {
    xpTotal,
    level,
    xpSpent,
    stamps: profile.stamps,
    achievements: profile.achievements,
    lists: [],
  };
}

export async function fetchPassportStamps(userId: string): Promise<string[]> {
  const profile = await fetchPassportProfile(userId);
  return profile.stamps;
}

export async function fetchPassportAchievements(userId: string): Promise<string[]> {
  const profile = await fetchPassportProfile(userId);
  return profile.achievements;
}

export async function revokePassport(userId: string, revokedAt: Date = new Date()): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ passport_revoked_at: revokedAt.toISOString() })
    .eq("id", userId);

  if (error) {
    throw error;
  }

  return true;
}
