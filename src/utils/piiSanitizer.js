/**
 * PII Detection and Sanitization
 * Uses allowlist of safe fields to prevent leakage to LLM
 */

import { log } from "@/lib/log";

/**
 * Allowed context fields that are safe to send to LLM
 * NEVER add user ID, email, name, or identifiable info
 */
export const ALLOWED_CONTEXT_FIELDS = [
  'aestheticBreakdown',
  'primaryArchetype',
  'secondaryArchetype',
  'totalPosts',
  'joinedDaysAgo',
  'topCategories',
];

/**
 * PII patterns to detect and redact
 */
const PII_PATTERNS = {
  email: /[\w\.-]+@[\w\.-]+\.\w+/g,
  phone: /\+?1?\d{10,14}/g,
  uuid: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  ipv4: /\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.\b/g,
  ssn: /\b(?:\d{3}-\d{2}-\d{4}|\d{9})\b/g, // US SSN format
};

/**
 * Sanitize context by filtering to allowlist only
 * Rejects any fields not explicitly allowed
 *
 * @param {Record<string, any>} context
 * @returns {Record<string, any>} Sanitized context
 */
export function sanitizeContextByAllowlist(context) {
  if (!context || typeof context !== 'object') return {};

  const sanitized = {};

  for (const field of ALLOWED_CONTEXT_FIELDS) {
    if (field in context) {
      const value = context[field];

      // Double-check: values should be primitives or safe arrays
      if (Array.isArray(value)) {
        // Only allow string arrays (e.g., categories)
        sanitized[field] = value.filter(v => typeof v === 'string');
      } else if (typeof value === 'object' && value !== null && field === 'aestheticBreakdown') {
        // Allow aesthetic breakdown (all non-negative numbers)
        const breakdown = {};
        for (const [key, val] of Object.entries(value)) {
          if (typeof val === 'number' && val >= 0) {
            breakdown[key] = val;
          }
        }
        sanitized[field] = breakdown;
      } else if (typeof value === 'number' || typeof value === 'string') {
        // Allow primitives
        sanitized[field] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Detect PII in a string
 * Returns array of detected PII types
 *
 * @param {string} text
 * @returns {string[]} Array of detected PII types
 */
export function detectPII(text) {
  if (!text || typeof text !== 'string') return [];

  const detected = [];

  if (PII_PATTERNS.email.test(text)) detected.push('email');
  if (PII_PATTERNS.phone.test(text)) detected.push('phone');
  if (PII_PATTERNS.uuid.test(text)) detected.push('uuid');
  if (PII_PATTERNS.ipv4.test(text)) detected.push('ipv4');
  if (PII_PATTERNS.ssn.test(text)) detected.push('ssn');

  return detected;
}

/**
 * Redact PII from text
 * Replaces detected patterns with [REDACTED]
 *
 * @param {string} text
 * @returns {string} Text with PII redacted
 */
export function redactPII(text) {
  if (!text || typeof text !== 'string') return text;

  let redacted = text;

  // Replace each pattern type
  for (const [, pattern] of Object.entries(PII_PATTERNS)) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }

  return redacted;
}

/**
 * Validate that context is safe to send to LLM
 * Throws if unsafe data detected
 *
 * @param {Record<string, any>} context
 * @throws {Error} If unsafe fields or PII detected
 */
export function validateContextSafety(context) {
  if (!context || typeof context !== 'object') return;

  // Check for disallowed fields
  const keys = Object.keys(context);
  for (const key of keys) {
    if (!ALLOWED_CONTEXT_FIELDS.includes(key)) {
      log.warn(`[safety] Disallowed field: ${key}`);
    }
  }

  // Check for PII in string values
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string') {
      const piiDetected = detectPII(value);
      if (piiDetected.length > 0) {
        throw new Error(`PII detected in field "${key}": ${piiDetected.join(', ')}`);
      }
    }

    // Check string arrays
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          const piiDetected = detectPII(item);
          if (piiDetected.length > 0) {
            throw new Error(`PII detected in array field "${key}": ${piiDetected.join(', ')}`);
          }
        }
      }
    }
  }
}

/**
 * Build a safe context object for LLM
 * Sanitizes, validates, and optionally redacts
 *
 * @param {Record<string, any>} context
 * @param {boolean} strict - If true, throw on any PII; if false, just redact
 * @returns {Record<string, any>} Safe context
 * @throws {Error} If strict=true and PII detected
 */
export function buildSafeContext(context, strict = true) {
  // First, allowlist filter
  const allowlisted = sanitizeContextByAllowlist(context);

  if (strict) {
    // Validate no PII leaks
    validateContextSafety(allowlisted);
  } else {
    // Redact any PII found
    for (const [key, value] of Object.entries(allowlisted)) {
      if (typeof value === 'string') {
        allowlisted[key] = redactPII(value);
      }
      if (Array.isArray(value)) {
        allowlisted[key] = value.map(v => typeof v === 'string' ? redactPII(v) : v);
      }
    }
  }

  return allowlisted;
}
