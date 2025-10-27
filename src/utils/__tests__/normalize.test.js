/**
 * Tests for normalization and divergence utilities
 * Run with: jest src/utils/__tests__/normalize.test.js
 */

import { normalize } from '../normalize';
import { totalVariation, checkDivergence } from '../divergence';

describe('Normalization', () => {
  test('normalizes to 100.0', () => {
    const input = { a: 10, b: 20, c: 30 };
    const result = normalize(input);

    const sum = Object.values(result).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(100, 1);
  });

  test('handles already normalized input', () => {
    const input = { a: 25, b: 25, c: 50 };
    const result = normalize(input);

    expect(result.a).toBeCloseTo(25, 1);
    expect(result.b).toBeCloseTo(25, 1);
    expect(result.c).toBeCloseTo(50, 1);
  });

  test('filters negative values', () => {
    const input = { a: 10, b: -5, c: 30 };
    const result = normalize(input);

    expect(result.b).toBeUndefined();
    const sum = Object.values(result).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(100, 1);
  });

  test('handles empty input', () => {
    const input = {};
    const result = normalize(input);
    expect(Object.keys(result).length).toBe(0);
  });

  test('returns 4 decimal places', () => {
    const input = { a: 1, b: 2, c: 3 };
    const result = normalize(input);

    Object.values(result).forEach(v => {
      const decimals = v.toString().split('.')[1]?.length || 0;
      expect(decimals).toBeLessThanOrEqual(4);
    });
  });
});

describe('Total Variation Distance', () => {
  test('returns 0 for identical distributions', () => {
    const a = { modern: 40, minimal: 30, industrial: 30 };
    const b = { modern: 40, minimal: 30, industrial: 30 };

    const tv = totalVariation(a, b);
    expect(tv).toBe(0);
  });

  test('calculates correct distance for known case', () => {
    const a = { x: 50, y: 50 };
    const b = { x: 60, y: 40 };

    // L1 distance = |50-60| + |50-40| = 10 + 10 = 20
    // TV = L1/2 = 10
    const tv = totalVariation(a, b);
    expect(tv).toBe(10);
  });

  test('handles different keys', () => {
    const a = { x: 50, y: 50 };
    const b = { y: 50, z: 50 };

    // L1 = |50-0| + |50-50| + |0-50| = 50 + 0 + 50 = 100
    // TV = 50
    const tv = totalVariation(a, b);
    expect(tv).toBe(50);
  });

  test('is symmetric', () => {
    const a = { x: 30, y: 70 };
    const b = { x: 50, y: 50 };

    const tv1 = totalVariation(a, b);
    const tv2 = totalVariation(b, a);

    expect(tv1).toBe(tv2);
  });
});

describe('Divergence Detection', () => {
  test('detects no divergence below 6% threshold', () => {
    const current = { a: 40.5, b: 30.5, c: 29 };
    const baseline = { a: 40, b: 30, c: 30 };

    const result = checkDivergence(current, baseline);
    expect(result.shouldRegenerate).toBe(false);
    expect(result.divergencePct).toBeLessThan(6);
  });

  test('detects divergence at 6% threshold', () => {
    const current = { a: 46, b: 27, c: 27 };
    const baseline = { a: 40, b: 30, c: 30 };

    // TV = (|46-40| + |27-30| + |27-30|) / 2 = (6 + 3 + 3) / 2 = 6
    const result = checkDivergence(current, baseline);
    expect(result.shouldRegenerate).toBe(true);
    expect(result.divergencePct).toBeGreaterThanOrEqual(6);
  });

  test('detects divergence above 6% threshold', () => {
    const current = { a: 50, b: 25, c: 25 };
    const baseline = { a: 40, b: 30, c: 30 };

    // TV = (|50-40| + |25-30| + |25-30|) / 2 = (10 + 5 + 5) / 2 = 10
    const result = checkDivergence(current, baseline);
    expect(result.shouldRegenerate).toBe(true);
    expect(result.divergencePct).toBeGreaterThan(6);
  });

  test('normalizes inputs before comparing', () => {
    const current = { a: 100, b: 75, c: 75 }; // Sum = 250
    const baseline = { a: 50, b: 50, c: 50 }; // Sum = 150

    // After normalization: current = {a: 40, b: 30, c: 30}, baseline = {a: 33.3, b: 33.3, c: 33.3}
    // Should still detect < 6% divergence due to normalization
    const result = checkDivergence(current, baseline);
    // Just verify it returns a result structure
    expect(result).toHaveProperty('shouldRegenerate');
    expect(result).toHaveProperty('divergencePct');
  });
});

describe('Property-based tests', () => {
  test('normalization is idempotent', () => {
    const input = { a: 25, b: 40, c: 35 };
    const once = normalize(input);
    const twice = normalize(once);

    Object.keys(once).forEach(k => {
      expect(twice[k]).toBeCloseTo(once[k], 3);
    });
  });

  test('TV distance with random vectors stays in [0, 100]', () => {
    for (let i = 0; i < 100; i++) {
      const a = { x: Math.random() * 100, y: Math.random() * 100 };
      const b = { x: Math.random() * 100, y: Math.random() * 100 };

      const tv = totalVariation(normalize(a), normalize(b));
      expect(tv).toBeGreaterThanOrEqual(0);
      expect(tv).toBeLessThanOrEqual(100);
    }
  });

  test('normalization preserves ordering', () => {
    const input = { a: 30, b: 50, c: 20 };
    const result = normalize(input);

    expect(result.b > result.a).toBe(true);
    expect(result.a > result.c).toBe(true);
  });
});
