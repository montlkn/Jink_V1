/* File: /src/auth/profileSync.js
  Description: Ensures profiles table has a row for SSO users on first login
  Creates or updates profile with sensible defaults from OAuth provider metadata
*/
import { supabase } from "../api/supabaseClient";

/**
 * Upsert user profile on first SSO login
 * Extracts username and avatar from OAuth provider metadata
 * @param {object} session - Supabase session object
 * @returns {Promise<void>}
 */
export async function upsertProfileFromSession(session) {
  if (!session?.user) return;
  const u = session.user;

  // Try to guess a username from provider metadata, fallback to email local part
  const username =
    u.user_metadata?.preferred_username ||
    u.user_metadata?.full_name ||
    u.user_metadata?.name ||
    (u.email ? u.email.split("@")[0] : `user_${u.id.slice(0, 6)}`);

  const avatar =
    u.user_metadata?.avatar_url ||
    u.user_metadata?.picture ||
    null;

  // Default values for new profiles - won't overwrite existing data due to upsert
  const defaults = {
    xp: 0,
    level: 1,
    xp_spent: 0,
    daily_quest_progress: 0,
    daily_quest_completed: false,
    weekly_quest_progress: 0,
    weekly_quest_completed: false,
    stamps: [],
    achievements: [],
  };

  // Upsert will only insert if id doesn't exist, otherwise it ignores
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: u.id,
        username,
        avatar_url: avatar,
        ...defaults,
      },
      {
        onConflict: "id",
        ignoreDuplicates: false, // Update if exists
      }
    );

  if (error) {
    console.error("Error upserting profile:", error);
    throw error;
  }
}
