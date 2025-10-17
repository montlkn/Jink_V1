/**
 * Prompt building and PII stripping
 */

import { AI_CONFIG } from '../config/aiConfig.js';

/**
 * Strip PII from context before sending to LLM
 * Only includes whitelisted fields
 */
export function stripPII(context) {
  const sanitized = {};

  for (const field of AI_CONFIG.safety.allowedContextFields) {
    if (field in context) {
      sanitized[field] = context[field];
    }
  }

  return sanitized;
}

/**
 * Build the system prompt (fixed, deterministic)
 */
export function buildSystemPrompt() {
  return `You are an architecture and design expert writing personalized profile summaries.

Your task:
1. Write a 2-4 sentence profile summary in second person ("Your style...", "You prefer...")
2. Respond in strict JSON format only: { "text": "...", "key_phrases": [...] }
3. The text must be under 100 words
4. Include 3-7 key phrases that capture the user's aesthetic signature
5. No preamble, no explanation, no markdown

Example response:
{
  "text": "Your aesthetic bridges modernist precision with industrial authenticity. Clean lines and functional materials are your hallmarks, though you appreciate moments of raw, exposed texture. You're drawn to designs that value honesty over ornamentation.",
  "key_phrases": ["functional minimalism", "material honesty", "geometric precision", "industrial warmth"]
}`;
}

/**
 * Build the user prompt with aesthetic context
 */
export function buildUserPrompt(aestheticData) {
  const {
    aestheticBreakdown,
    primaryArchetype,
    secondaryArchetype,
    topCategories,
    totalPosts,
  } = aestheticData;

  // Format aesthetic breakdown as a ranked list
  const sortedAesthetics = Object.entries(aestheticBreakdown)
    .filter(([, pct]) => pct > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6); // Top 6 aesthetics

  const breakdownText = sortedAesthetics
    .map(([aesthetic, pct]) => `${aesthetic}: ${pct.toFixed(1)}%`)
    .join(', ');

  const topCategoriesText = topCategories?.join(', ') || 'Residential, Commercial';

  return `User's aesthetic profile:
- Primary: ${primaryArchetype}
- Secondary: ${secondaryArchetype || 'N/A'}
- Breakdown (top aesthetics): ${breakdownText}
- Saved posts: ${totalPosts || 'many'}
- Interests: ${topCategoriesText}

Generate a concise, personalized profile summary for this user.`;
}

/**
 * Parse and validate response JSON
 * Returns { valid: boolean, data: {...} | null, error: string | null }
 */
export function parseAndValidateResponse(responseText) {
  try {
    // Extract JSON from response (in case there's any surrounding text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        valid: false,
        data: null,
        error: 'No JSON found in response',
      };
    }

    const json = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!json.text || typeof json.text !== 'string') {
      return {
        valid: false,
        data: null,
        error: 'Missing or invalid "text" field',
      };
    }

    if (!Array.isArray(json.key_phrases)) {
      return {
        valid: false,
        data: null,
        error: 'Missing or invalid "key_phrases" array',
      };
    }

    // Validate constraints
    const wordCount = json.text.split(/\s+/).length;
    if (wordCount > AI_CONFIG.output.maxWords) {
      return {
        valid: false,
        data: null,
        error: `Text exceeds max word count (${wordCount} > ${AI_CONFIG.output.maxWords})`,
      };
    }

    const phraseCount = json.key_phrases.length;
    if (
      phraseCount < AI_CONFIG.output.keyPhraseCount.min ||
      phraseCount > AI_CONFIG.output.keyPhraseCount.max
    ) {
      return {
        valid: false,
        data: null,
        error: `Key phrases count out of range (${phraseCount}, expected ${AI_CONFIG.output.keyPhraseCount.min}-${AI_CONFIG.output.keyPhraseCount.max})`,
      };
    }

    // Sanitize: trim text and phrases
    return {
      valid: true,
      data: {
        text: json.text.trim(),
        key_phrases: json.key_phrases.map(p => p.trim()),
      },
      error: null,
    };
  } catch (err) {
    return {
      valid: false,
      data: null,
      error: `JSON parse error: ${err.message}`,
    };
  }
}

/**
 * Remove any potential PII from generated text
 * (username, email patterns, etc.)
 */
export function sanitizeGeneratedText(text) {
  // Basic PII patterns (email, phone, common names - can be expanded)
  const piiPatterns = [
    /[\w\.-]+@[\w\.-]+\.\w+/g, // Email
    /\+?1?\d{10,14}/g, // Phone numbers
  ];

  let sanitized = text;
  for (const pattern of piiPatterns) {
    sanitized = sanitized.replace(pattern, '[redacted]');
  }

  return sanitized;
}
