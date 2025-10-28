export * from "./walkGateway";
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
  type ActiveQuestsResponse,
  type FetchActiveQuestsResult,
  type FetchXpSummaryResult,
  type XpSnapshot,
} from "./supabaseGateway";
export { getGeminiModel, getGeminiClient, resetGeminiClient } from "./aiGateway";
export { httpGateway, httpClient } from "./http";
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
