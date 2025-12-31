export * from "./walkGateway";
export { startWalk, type StartWalkResult } from "./supabaseGateway";
export {
  supabaseGateway,
  getSupabaseClient,
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
  fetchActiveQuests,
  fetchXpSummary,
  fetchXpSnapshot,
  completeQuest,
  awardXp,
  fetchUserStreak,
  fetchRecentScanCount,
  updateDailyStreak,
  type ActiveQuestsResponse,
  type FetchActiveQuestsResult,
  type FetchXpSummaryResult,
  type XpSnapshot,
  type StreakSnapshot,
  type UpdateStreakResult,
} from "./supabaseGateway";
export { getGeminiModel, getGeminiClient, resetGeminiClient } from "./aiGateway";
export {
  fetchPassport,
  fetchPassportProfile,
  fetchPassportStamps,
  fetchPassportAchievements,
  revokePassport,
} from "./passportGateway";
export {
  fetchQuizQuestions,
  submitQuizResponse,
  calculateAestheticProfile,
  getUserAestheticProfile,
  userNeedsOnboarding,
  getArchetypeMetadata,
} from "./quizGateway";
export { fetchSummary, regenerateSummary, fetchSummaryMeta } from "./summaryGateway";
