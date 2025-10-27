import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_CONFIG } from "@/config/aiConfig";

let cachedClient: GoogleGenerativeAI | null = null;

export const getGeminiClient = (): GoogleGenerativeAI => {
  if (cachedClient) return cachedClient;

  if (!AI_CONFIG.apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  cachedClient = new GoogleGenerativeAI(AI_CONFIG.apiKey);
  return cachedClient;
};

export const getGeminiModel = (modelName: string) => {
  const client = getGeminiClient();
  return client.getGenerativeModel({ model: modelName });
};

export const resetGeminiClient = () => {
  cachedClient = null;
};
