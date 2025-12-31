/**
 * Profile gateway - handles user profile operations
 */
import { supabase } from "./supabaseClient";

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  updated_at: string | null;
};

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, bio, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

export type UpdateProfileParams = {
  userId: string;
  patch: Partial<Pick<ProfileRow, "full_name" | "username" | "avatar_url" | "bio">>;
};

export async function updateProfile(params: UpdateProfileParams): Promise<ProfileRow> {
  const { userId, patch } = params;
  const sanitizedPatch = Object.fromEntries(
    Object.entries(patch).filter(([_, value]) => value !== undefined)
  );

  const { data, error } = await supabase
    .from("profiles")
    .update(sanitizedPatch)
    .eq("id", userId)
    .select("id, full_name, username, avatar_url, bio, updated_at")
    .single();

  if (error) throw error;
  return data as ProfileRow;
}

export type UploadAvatarParams = {
  userId: string;
  file: { uri: string; name: string; type?: string };
  bucket?: string;
};

export type UploadAvatarResult = {
  publicUrl: string;
  path: string;
};

export async function uploadAvatar(params: UploadAvatarParams): Promise<UploadAvatarResult> {
  const { userId, file, bucket = "avatars" } = params;
  const response = await fetch(file.uri);
  const blob = await response.blob();
  const objectPath = `${userId}/${Date.now()}_${file.name}`;

  const { data, error } = await supabase.storage.from(bucket).upload(objectPath, blob, {
    contentType: file.type ?? "image/jpeg",
    upsert: true,
  });

  if (error) throw error;

  const publicResult = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { publicUrl: publicResult.data.publicUrl, path: data.path };
}
