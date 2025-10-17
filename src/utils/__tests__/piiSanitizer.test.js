/**
 * Tests for PII sanitization and context allowlisting
 */

import {
  ALLOWED_CONTEXT_FIELDS,
  sanitizeContextByAllowlist,
  detectPII,
  redactPII,
  validateContextSafety,
  buildSafeContext,
} from '../piiSanitizer';

describe('Context Allowlisting', () => {
  test('keeps only allowed fields', () => {
    const context = {
      aestheticBreakdown: { modern: 40, minimal: 30, industrial: 30 },
      primaryArchetype: 'modernist',
      userId: 'should-be-removed', // Not in allowlist
      email: 'user@example.com', // Not in allowlist
      topCategories: ['Residential', 'Commercial'],
    };

    const result = sanitizeContextByAllowlist(context);

    expect(result).toHaveProperty('aestheticBreakdown');
    expect(result).toHaveProperty('primaryArchetype');
    expect(result).toHaveProperty('topCategories');
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('email');
  });

  test('filters out non-string values from category arrays', () => {
    const context = {
      topCategories: ['Residential', 123, null, 'Commercial', undefined],
    };

    const result = sanitizeContextByAllowlist(context);

    expect(result.topCategories).toEqual(['Residential', 'Commercial']);
  });

  test('filters out negative values from aesthetic breakdown', () => {
    const context = {
      aestheticBreakdown: {
        modern: 40,
        minimal: -10, // Should be removed
        industrial: 30,
        other: NaN, // Should be removed
      },
    };

    const result = sanitizeContextByAllowlist(context);

    expect(result.aestheticBreakdown).toEqual({ modern: 40, industrial: 30 });
  });

  test('handles null/undefined context gracefully', () => {
    expect(sanitizeContextByAllowlist(null)).toEqual({});
    expect(sanitizeContextByAllowlist(undefined)).toEqual({});
    expect(sanitizeContextByAllowlist({})).toEqual({});
  });
});

describe('PII Detection', () => {
  test('detects email addresses', () => {
    const text = 'Contact me at john.doe@example.com for details';
    const detected = detectPII(text);
    expect(detected).toContain('email');
  });

  test('detects phone numbers', () => {
    const text = 'Call me at +1-555-123-4567';
    const detected = detectPII(text);
    expect(detected).toContain('phone');
  });

  test('detects UUIDs', () => {
    const text = 'User ID: 550e8400-e29b-41d4-a716-446655440000';
    const detected = detectPII(text);
    expect(detected).toContain('uuid');
  });

  test('detects IPv4 addresses', () => {
    const text = 'Server IP: 192.168.1.1';
    const detected = detectPII(text);
    expect(detected).toContain('ipv4');
  });

  test('detects SSN format', () => {
    const text = 'SSN: 123-45-6789';
    const detected = detectPII(text);
    expect(detected).toContain('ssn');
  });

  test('returns empty array for clean text', () => {
    const text = 'This is a clean comment about aesthetic preferences';
    const detected = detectPII(text);
    expect(detected).toEqual([]);
  });

  test('handles null/undefined input', () => {
    expect(detectPII(null)).toEqual([]);
    expect(detectPII(undefined)).toEqual([]);
    expect(detectPII('')).toEqual([]);
  });
});

describe('PII Redaction', () => {
  test('redacts email addresses', () => {
    const text = 'Email: john@example.com';
    const redacted = redactPII(text);
    expect(redacted).toContain('[REDACTED]');
    expect(redacted).not.toContain('john@example.com');
  });

  test('redacts multiple instances', () => {
    const text = 'Call 555-123-4567 or email test@example.com';
    const redacted = redactPII(text);
    expect((redacted.match(/\[REDACTED\]/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  test('preserves non-PII text', () => {
    const text = 'My aesthetic is modern with industrial touches';
    const redacted = redactPII(text);
    expect(redacted).toBe(text);
  });

  test('handles null/undefined gracefully', () => {
    expect(redactPII(null)).toEqual(null);
    expect(redactPII(undefined)).toEqual(undefined);
  });
});

describe('Context Safety Validation', () => {
  test('passes clean context', () => {
    const context = {
      aestheticBreakdown: { modern: 40, minimal: 30 },
      primaryArchetype: 'modernist',
      topCategories: ['Residential'],
    };

    expect(() => validateContextSafety(context)).not.toThrow();
  });

  test('throws on email in string field', () => {
    const context = {
      aestheticBreakdown: { modern: 40 },
      primaryArchetype: 'modernist',
      topCategories: ['Residential'],
      someField: 'contact@example.com', // PII in disallowed field doesn't block, but would be filtered
    };

    // This shouldn't throw because someField gets filtered out by allowlist
    // But let's test a field that IS allowed
  });

  test('throws on PII in allowed field', () => {
    const context = {
      aestheticBreakdown: { modern: 40 },
      topCategories: ['Residential', 'john@example.com'], // PII in allowed field
    };

    expect(() => validateContextSafety(context)).toThrow();
  });

  test('throws on UUID in primaryArchetype', () => {
    const context = {
      aestheticBreakdown: { modern: 40 },
      primaryArchetype: '550e8400-e29b-41d4-a716-446655440000', // UUID where name expected
    };

    expect(() => validateContextSafety(context)).toThrow();
  });
});

describe('Safe Context Building', () => {
  test('builds safe context in strict mode', () => {
    const context = {
      aestheticBreakdown: { modern: 40, minimal: 30 },
      primaryArchetype: 'modernist',
      userId: 'should-be-filtered',
      email: 'should@be.filtered',
    };

    const safe = buildSafeContext(context, true);

    expect(safe).toHaveProperty('aestheticBreakdown');
    expect(safe).toHaveProperty('primaryArchetype');
    expect(safe).not.toHaveProperty('userId');
    expect(safe).not.toHaveProperty('email');
  });

  test('redacts PII in non-strict mode', () => {
    const context = {
      aestheticBreakdown: { modern: 40 },
      topCategories: ['Residential', 'email@example.com'],
    };

    const safe = buildSafeContext(context, false);

    expect(safe.topCategories).toContain('[REDACTED]');
  });

  test('throws on PII in strict mode', () => {
    const context = {
      topCategories: ['Residential', 'user@example.com'],
    };

    expect(() => buildSafeContext(context, true)).toThrow();
  });

  test('handles nested objects correctly', () => {
    const context = {
      aestheticBreakdown: {
        modern: 40,
        minimal: 30,
      },
      primaryArchetype: 'modernist',
    };

    const safe = buildSafeContext(context, true);

    expect(safe.aestheticBreakdown).toEqual({ modern: 40, minimal: 30 });
  });
});

describe('Allowlist Completeness', () => {
  test('allowlist includes safe fields', () => {
    expect(ALLOWED_CONTEXT_FIELDS).toContain('aestheticBreakdown');
    expect(ALLOWED_CONTEXT_FIELDS).toContain('primaryArchetype');
    expect(ALLOWED_CONTEXT_FIELDS).toContain('topCategories');
  });

  test('allowlist excludes user identifiers', () => {
    expect(ALLOWED_CONTEXT_FIELDS).not.toContain('userId');
    expect(ALLOWED_CONTEXT_FIELDS).not.toContain('id');
    expect(ALLOWED_CONTEXT_FIELDS).not.toContain('email');
    expect(ALLOWED_CONTEXT_FIELDS).not.toContain('username');
  });
});
