/**
 * Supabase Gateway - Re-exports from domain-specific modules
 *
 * This file maintains backward compatibility while the codebase
 * is being migrated to use domain-specific imports.
 *
 * Prefer importing directly from:
 * - ./supabaseClient - for supabase client instance
 * - ./authGateway - for auth operations
 * - ./xpGateway - for XP operations
 * - ./profileGateway - for profile operations
 * - ./walksGateway - for walk operations
 * - ./streakGateway - for streak operations
 */

// Re-export the client
export { supabase as supabaseGateway, getSupabaseClient } from "./supabaseClient";

// Re-export auth functions
export {
  getSession,
  onAuthStateChange,
  exchangeCodeForSession,
  setSession,
  signOut,
  signInWithPassword,
  signUpWithPassword,
  signInWithOAuth,
  signInWithOtp,
  verifyOtp,
} from "./authGateway";

// Re-export XP functions
export {
  fetchXpSummary,
  fetchXpSnapshot,
  awardXp,
  type FetchXpSummaryResult,
  type XpSnapshot,
} from "./xpGateway";

// Re-export profile functions
export {
  getProfile,
  updateProfile,
  uploadAvatar,
  type UpdateProfileParams,
  type UploadAvatarParams,
  type UploadAvatarResult,
} from "./profileGateway";

// Re-export walk functions
export {
  fetchWalkSummaries,
  fetchWalkDetail,
  fetchNearbyBuildings,
  startWalk,
  completeWalk,
  type StartWalkResult,
  type CompleteWalkResult,
} from "./walksGateway";

// Re-export streak functions
export {
  fetchUserStreak,
  fetchRecentScanCount,
  updateDailyStreak,
  type StreakSnapshot,
  type UpdateStreakResult,
} from "./streakGateway";
