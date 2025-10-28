export type RawProfile = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  updated_at?: string | null;
};

export type ProfileViewModel = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  updatedAt: string | null;
};

export const toProfileView = (raw: RawProfile | null | undefined): ProfileViewModel | null => {
  if (!raw) {
    return null;
  }

  const displayName = raw.full_name?.trim() || raw.username?.trim() || "Explorer";
  return {
    id: raw.id,
    displayName,
    avatarUrl: raw.avatar_url ?? null,
    bio: raw.bio ?? null,
    updatedAt: raw.updated_at ?? null,
  };
};
