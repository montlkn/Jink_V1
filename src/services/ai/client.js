/**
 * Gemini AI client with two-tier fallback strategy
 */

import { selectModel } from "../../config/aiConfig";
import {
  buildSystemPrompt,
  parseAndValidateResponse,
  sanitizeGeneratedText,
  stripPII,
} from './prompt';
import { getGeminiClient, getGeminiModel } from "@/services/gateways";

/**
 * Initialize Gemini API client
 */
export function initializeGemini() {
  return getGeminiClient();
}

/**
 * Generate summary with two-tier fallback strategy
 * Tries primary model first, escalates to fallback on specific failure kinds
 */
export async function generateSummary(aestheticData, options = {}) {
  const {
    shouldEscalate = false,
    attemptNumber = 1,
    maxAttempts = 2,
  } = options;

  const modelConfig = selectModel(shouldEscalate);
  const attempt = attemptNumber;

  console.log(
    `[summary-gen] Attempt ${attempt}/${maxAttempts} using model: ${modelConfig.name}`
  );

  try {
    const model = getGeminiModel(modelConfig.name);

    // Build prompts with safety checks
    const sanitizedData = stripPII(aestheticData);
    const systemPrompt = buildSystemPrompt();
    const userPrompt = require('./prompt').buildUserPrompt(sanitizedData);

    // Generate with configured parameters
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt + '\n\n' + userPrompt },
          ],
        },
      ],
      generationConfig: {
        temperature: modelConfig.temperature,
        topP: modelConfig.topP,
        maxOutputTokens: modelConfig.maxTokens,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
      ],
    });

    // Check for blocked content
    if (
      response.promptFeedback?.blockReason ||
      response.promptFeedback?.safetyRatings?.some(r => r.probability === 'HIGH')
    ) {
      console.warn('[summary-gen] Safety filter triggered, escalating');
      if (!shouldEscalate && attempt < maxAttempts) {
        return generateSummary(aestheticData, {
          shouldEscalate: true,
          attemptNumber: attempt + 1,
          maxAttempts,
        });
      }
      throw new Error('Content blocked by safety filters');
    }

    const responseText = response.text;

    // Parse and validate
    const validation = parseAndValidateResponse(responseText);

    if (!validation.valid) {
      console.warn(`[summary-gen] Validation failed: ${validation.error}`);

      // Retry with fallback model if we haven't escalated yet
      if (!shouldEscalate && attempt < maxAttempts) {
        console.log('[summary-gen] Retrying with fallback model');
        return generateSummary(aestheticData, {
          shouldEscalate: true,
          attemptNumber: attempt + 1,
          maxAttempts,
        });
      }

      throw new Error(`Validation failed: ${validation.error}`);
    }

    // Sanitize output text
    const sanitized = {
      text: sanitizeGeneratedText(validation.data.text),
      key_phrases: validation.data.key_phrases.map(sanitizeGeneratedText),
    };

    // Extract token counts for cost tracking (CRITICAL for budgeting)
    const tokensIn = response.usageMetadata?.promptTokenCount || 0;
    const tokensOut = response.usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = tokensIn + tokensOut;

    // Log with all metrics for monitoring and cost analysis
    console.log('[summary-gen] Success', {
      model: modelConfig.name,
      tokensIn,
      tokensOut,
      totalTokens,
      result: 'success',
      attempt,
      escalated: shouldEscalate,
    });

    return {
      success: true,
      text: sanitized.text,
      keyPhrases: sanitized.key_phrases,
      sourceModel: modelConfig.name,
      generatedAt: new Date().toISOString(),
      attemptNumber: attempt,
      escalated: shouldEscalate,
      tokens: { in: tokensIn, out: tokensOut, total: totalTokens },
    };
  } catch (error) {
    console.error(`[summary-gen] Error on attempt ${attempt}:`, error.message);

    // Last resort: escalate to fallback if not already there
    if (!shouldEscalate && attempt < maxAttempts) {
      console.log('[summary-gen] Escalating to fallback model');
      return generateSummary(aestheticData, {
        shouldEscalate: true,
        attemptNumber: attempt + 1,
        maxAttempts,
      });
    }

    throw error;
  }
}

/**
 * Quick health check for Gemini API
 */
export async function checkGeminiHealth() {
  try {
    const model = getGeminiModel('gemini-2.0-flash-lite');

    // Simple test generation
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'respond with: ok' }] }],
      generationConfig: { maxOutputTokens: 10 },
    });

    return {
      healthy: true,
      model: 'gemini-2.0-flash-lite',
      responseTime: response.response?.generationTime || 0,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
    };
  }
}
