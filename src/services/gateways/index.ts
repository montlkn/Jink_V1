export {
  supabaseGateway,
  getSupabaseClient,
  getSession,
  exchangeCodeForSession,
  setSession,
  signOut,
  fetchActiveQuests,
  fetchXpSummary,
  completeQuest,
  fetchWalkSummaries,
  fetchWalkDetail,
  completeWalk,
} from "./supabaseGateway";
export { getGeminiModel, getGeminiClient, resetGeminiClient } from "./aiGateway";
export { httpGateway, httpClient } from "./http";
