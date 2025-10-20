/**
 * Prompt building and PII stripping
 */

import { AI_CONFIG } from '../config/aiConfig.js';
import { getLexiconFor } from './lexicon.js';

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
  return `You are an architecture and design expert writing concise, personal profile summaries.

Requirements:
1) Write 2–4 sentences in second person ("You gravitate toward…", "You tend to…").
2) Use natural grammar with sentence case (each sentence starts uppercase) while keeping descriptive adjectives in lowercase unless they are proper nouns.
3) Keep it warm and specific; avoid templates or mechanical lists.
4) Reference only the details explicitly provided (primary/secondary archetype, aesthetic breakdown, top categories). Never mention saved posts, counts, or other unprovided data.
5) Do not mention scores, percentages, vectors, or the word "archetype".
6) Vary sentence openings; don’t repeat the same structure.
7) Make it feel personal, like you understand how the user experiences space. 
8) Limit to 60–100 words, plain text only.
9) Respond in strict JSON only: { "text": "...", "key_phrases": ["…"] }
10) key_phrases: 3–6 concise, lowercase phrases (2–4 words each), no punctuation.
`;
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
  } = aestheticData;

  // Format aesthetic breakdown as a ranked list
  const sortedAesthetics = Object.entries(aestheticBreakdown)
    .filter(([, pct]) => pct > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6); // Top 6 aesthetics

  const breakdownText = sortedAesthetics
    .map(([aesthetic, pct]) => `${aesthetic}: ${pct.toFixed(1)}%`)
    .join(', ');

  const hasTopCategories = Array.isArray(topCategories) && topCategories.length > 0;
  const topCategoriesText = hasTopCategories ? topCategories.join(', ') : null;

  // Add a small, grounded style lexicon to reduce hallucination and align tone
  const pLex = getLexiconFor(primaryArchetype);
  const sLex = getLexiconFor(secondaryArchetype);
  const primaryLexText = pLex
    ? `primary lexicon (${pLex.name.toLowerCase()}): ${pLex.vibe.map(v => v.toLowerCase()).join(', ')}`
    : '';
  const secondaryLexText = sLex
    ? `secondary lexicon (${sLex.name.toLowerCase()}): ${sLex.vibe.map(v => v.toLowerCase()).join(', ')}`
    : '';

  return `User's aesthetic profile:
- Primary: ${primaryArchetype}
- Secondary: ${secondaryArchetype || 'N/A'}
- Breakdown (top aesthetics): ${breakdownText}
${hasTopCategories ? `- Interests: ${topCategoriesText}` : ''}

Grounding vocabulary (use as guidance, do not list verbatim):
${primaryLexText}
${secondaryLexText}

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

    // Sanitize: trim text and phrases; normalize key phrases to lowercase
    return {
      valid: true,
      data: {
        text: json.text.trim(),
        key_phrases: json.key_phrases.map(p => p.trim().toLowerCase()),
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

  // Light normalization: collapse multiple spaces, ensure natural casing is kept
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  return sanitized;
}
