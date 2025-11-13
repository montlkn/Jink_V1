import { processArchetypeData } from '../archetypeDataTransformer';

// Mock the archetype colors
jest.mock('../../constants/archetypeColors', () => ({
  getArchetypeColor: jest.fn((name) => {
    const colors = {
      'Romantic': '#D4A5A5',
      'Modernist': '#4A4A4A',
      'Classicist': '#8B7355',
      'Stylist': '#FFD700',
      'Industrialist': '#7F8C8D',
      'Visionary': '#9B59B6',
      'Pop Culturalist': '#FF6B6B',
      'Vernacularist': '#8FBC8F',
      'Austerist': '#95A5A6'
    };
    return colors[name] || '#999999';
  })
}));

describe('archetypeDataTransformer', () => {
  describe('processArchetypeData', () => {
    it('should process archetype data with percentages', () => {
      const input = [
        { name: 'Romantic', percentage: 0.5 },
        { name: 'Modernist', percentage: 0.3 },
        { name: 'Classicist', percentage: 0.2 }
      ];

      const result = processArchetypeData(input);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Romantic'); // highest percentage
      expect(result[0].percentage).toBeCloseTo(0.5);
      expect(result[0].color).toBeDefined();
    });

    it('should process archetype data with scores', () => {
      const input = [
        { name: 'Romantic', score: 50 },
        { name: 'Modernist', score: 30 },
        { name: 'Classicist', score: 20 }
      ];

      const result = processArchetypeData(input);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Romantic');
      expect(result[0].percentage).toBeCloseTo(0.5); // 50/100
    });

    it('should process archetype data with values', () => {
      const input = [
        { name: 'Romantic', value: 100 },
        { name: 'Modernist', value: 50 }
      ];

      const result = processArchetypeData(input);

      expect(result).toHaveLength(2);
      expect(result[0].percentage).toBeCloseTo(0.667, 2); // 100/150
      expect(result[1].percentage).toBeCloseTo(0.333, 2); // 50/150
    });

    it('should normalize percentages to sum correctly', () => {
      const input = [
        { name: 'Romantic', score: 40 },
        { name: 'Modernist', score: 30 },
        { name: 'Classicist', score: 30 }
      ];

      const result = processArchetypeData(input);

      // Total should be 100
      expect(result[0].percentage).toBeCloseTo(0.4);
      expect(result[1].percentage).toBeCloseTo(0.3);
      expect(result[2].percentage).toBeCloseTo(0.3);
    });

    it('should only return top 3 archetypes', () => {
      const input = [
        { name: 'A', score: 50 },
        { name: 'B', score: 30 },
        { name: 'C', score: 15 },
        { name: 'D', score: 5 },
        { name: 'E', score: 2 }
      ];

      const result = processArchetypeData(input);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('A');
      expect(result[1].name).toBe('B');
      expect(result[2].name).toBe('C');
    });

    it('should use fallback data when input is empty', () => {
      const result = processArchetypeData([]);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Romantic');
      expect(result[0].percentage).toBeCloseTo(0.375); // 0.36 / (0.36 + 0.32 + 0.28)
    });

    it('should use fallback data when input is null', () => {
      const result = processArchetypeData(null);

      expect(result).toHaveLength(3);
      expect(result.every(item => item.name && item.percentage > 0)).toBe(true);
    });

    it('should not use fallback when allowFallback is false', () => {
      const result = processArchetypeData([], { allowFallback: false });

      expect(result).toEqual([]);
    });

    it('should handle zero total gracefully with fallback', () => {
      const input = [
        { name: 'A', score: 0 },
        { name: 'B', score: 0 }
      ];

      const result = processArchetypeData(input);

      // Should fall back to default
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Romantic');
    });

    it('should return empty array for zero total when fallback disabled', () => {
      const input = [
        { name: 'A', score: 0 },
        { name: 'B', score: 0 }
      ];

      const result = processArchetypeData(input, { allowFallback: false });

      expect(result).toEqual([]);
    });

    it('should include cloud properties', () => {
      const input = [
        { name: 'Romantic', percentage: 0.5 }
      ];

      const result = processArchetypeData(input);

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('color');
      expect(result[0]).toHaveProperty('secondaryColor');
      expect(result[0]).toHaveProperty('tertiaryColor');
      expect(result[0]).toHaveProperty('opacity');
      expect(result[0]).toHaveProperty('dimensions');
      expect(result[0]).toHaveProperty('position');
      expect(result[0]).toHaveProperty('rotationSpeed');
    });

    it('should generate unique IDs for clouds', () => {
      const input = [
        { name: 'A', score: 50 },
        { name: 'B', score: 30 },
        { name: 'C', score: 20 }
      ];

      const result = processArchetypeData(input);

      const ids = result.map(r => r.id);
      expect(ids).toEqual(['cloud-0', 'cloud-1', 'cloud-2']);
    });

    it('should calculate opacity based on percentage', () => {
      const input = [
        { name: 'A', percentage: 1.0 },
        { name: 'B', percentage: 0.5 },
        { name: 'C', percentage: 0.1 }
      ];

      const result = processArchetypeData(input);

      // Percentages are normalized: 1.0/(1.6) = 0.625, 0.5/1.6 = 0.3125, 0.1/1.6 = 0.0625
      // Opacity = clamp(0.5 + percentage * 0.4, 0.5, 0.9)
      expect(result[0].opacity).toBeCloseTo(0.75); // 0.5 + 0.625*0.4
      expect(result[1].opacity).toBeCloseTo(0.625); // 0.5 + 0.3125*0.4
      expect(result[2].opacity).toBeCloseTo(0.525); // 0.5 + 0.0625*0.4
    });

    it('should calculate size factor based on percentage', () => {
      const input = [
        { name: 'A', percentage: 1.0 },
        { name: 'B', percentage: 0.5 }
      ];

      const result = processArchetypeData(input);

      // Percentages are normalized: 1.0/1.5 = 0.667, 0.5/1.5 = 0.333
      // sizeFactor = 0.8 + percentage * 1.2
      expect(result[0].sizeFactor).toBeCloseTo(1.6); // 0.8 + 0.667*1.2
      expect(result[1].sizeFactor).toBeCloseTo(1.2); // 0.8 + 0.333*1.2
    });

    it('should include dimensions with correct proportions', () => {
      const input = [
        { name: 'A', percentage: 0.5 }
      ];

      const result = processArchetypeData(input);

      const { width, length, depth } = result[0].dimensions;

      expect(width).toBeDefined();
      expect(length).toBeCloseTo(width * 0.95);
      expect(depth).toBeCloseTo(width * 0.85);
    });

    it('should generate positions for 3 clouds', () => {
      const input = [
        { name: 'A', score: 50 },
        { name: 'B', score: 30 },
        { name: 'C', score: 20 }
      ];

      const result = processArchetypeData(input);

      result.forEach(item => {
        expect(item.position).toHaveLength(3); // [x, y, z]
        expect(typeof item.position[0]).toBe('number');
        expect(typeof item.position[1]).toBe('number');
        expect(typeof item.position[2]).toBe('number');
      });
    });

    it('should assign different rotation speeds to each cloud', () => {
      const input = [
        { name: 'A', score: 50 },
        { name: 'B', score: 30 },
        { name: 'C', score: 20 }
      ];

      const result = processArchetypeData(input);

      // rotationSpeed = 0.18 + index * 0.06
      expect(result[0].rotationSpeed).toBeCloseTo(0.18);
      expect(result[1].rotationSpeed).toBeCloseTo(0.24);
      expect(result[2].rotationSpeed).toBeCloseTo(0.30);
    });

    it('should handle archetype field name', () => {
      const input = [
        { archetype: 'Romantic', score: 50 }
      ];

      const result = processArchetypeData(input);

      expect(result[0].name).toBe('Romantic');
    });

    it('should filter out entries without names', () => {
      const input = [
        { score: 50 }, // no name
        { name: 'Romantic', score: 30 }
      ];

      const result = processArchetypeData(input);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Romantic');
    });

    it('should handle negative scores by converting to zero', () => {
      const input = [
        { name: 'A', score: -10 },
        { name: 'B', score: 50 }
      ];

      const result = processArchetypeData(input);

      // A should be normalized to 0, B should be 100%
      expect(result.find(r => r.name === 'B').percentage).toBeCloseTo(1.0);
    });

    it('should use provided color if available', () => {
      const input = [
        { name: 'Custom', percentage: 0.5, color: '#FF0000' }
      ];

      const result = processArchetypeData(input);

      expect(result[0].color).toBe('#FF0000');
    });

    it('should generate secondary and tertiary colors', () => {
      const input = [
        { name: 'Romantic', percentage: 0.5 }
      ];

      const result = processArchetypeData(input);

      // Secondary and tertiary should be hex colors but different from base
      expect(result[0].secondaryColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(result[0].tertiaryColor).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should sort by percentage descending', () => {
      const input = [
        { name: 'C', score: 20 },
        { name: 'A', score: 50 },
        { name: 'B', score: 30 }
      ];

      const result = processArchetypeData(input);

      expect(result[0].name).toBe('A'); // highest
      expect(result[1].name).toBe('B');
      expect(result[2].name).toBe('C'); // lowest
      expect(result[0].percentage).toBeGreaterThan(result[1].percentage);
      expect(result[1].percentage).toBeGreaterThan(result[2].percentage);
    });

    it('should not preserve custom properties in final output', () => {
      const input = [
        { name: 'Romantic', score: 50, customProperty: 'test' }
      ];

      const result = processArchetypeData(input);

      // The function only returns specific properties, not custom ones
      expect(result[0].customProperty).toBeUndefined();
      expect(result[0].name).toBe('Romantic');
      expect(result[0].percentage).toBeDefined();
    });

    it('should clamp percentages between 0 and 1', () => {
      const input = [
        { name: 'A', percentage: 2.0 }, // > 1
        { name: 'B', percentage: -0.5 } // < 0
      ];

      const result = processArchetypeData(input);

      result.forEach(item => {
        expect(item.percentage).toBeGreaterThanOrEqual(0);
        expect(item.percentage).toBeLessThanOrEqual(1);
      });
    });

    it('should handle single archetype input', () => {
      const input = [
        { name: 'Romantic', score: 100 }
      ];

      const result = processArchetypeData(input);

      expect(result).toHaveLength(1);
      expect(result[0].percentage).toBe(1.0);
    });

    it('should handle two archetype input', () => {
      const input = [
        { name: 'A', score: 60 },
        { name: 'B', score: 40 }
      ];

      const result = processArchetypeData(input);

      expect(result).toHaveLength(2);
      expect(result[0].percentage).toBeCloseTo(0.6);
      expect(result[1].percentage).toBeCloseTo(0.4);
    });
  });

  describe('color conversion edge cases', () => {
    it('should handle 3-character hex codes in color derivation', () => {
      const input = [
        { name: 'Test', percentage: 0.5, color: '#F0F' }
      ];

      const result = processArchetypeData(input);

      // Should expand #F0F to #FF00FF and process it
      expect(result[0].color).toBe('#F0F');
      expect(result[0].secondaryColor).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should handle color derivation errors gracefully', () => {
      const input = [
        { name: 'Test', percentage: 0.5, color: 'invalid' }
      ];

      const result = processArchetypeData(input);

      // Should fall back to original color on error
      expect(result[0].color).toBe('invalid');
    });
  });

  describe('percentage edge cases', () => {
    it('should handle very small percentages', () => {
      const input = [
        { name: 'A', score: 0.001 },
        { name: 'B', score: 0.001 },
        { name: 'C', score: 0.001 }
      ];

      const result = processArchetypeData(input);

      expect(result).toHaveLength(3);
      result.forEach(item => {
        expect(item.percentage).toBeCloseTo(0.333, 2);
      });
    });

    it('should handle very large scores', () => {
      const input = [
        { name: 'A', score: 1000000 },
        { name: 'B', score: 500000 }
      ];

      const result = processArchetypeData(input);

      expect(result[0].percentage).toBeCloseTo(0.667, 2);
      expect(result[1].percentage).toBeCloseTo(0.333, 2);
    });

    it('should handle equal scores', () => {
      const input = [
        { name: 'A', score: 50 },
        { name: 'B', score: 50 },
        { name: 'C', score: 50 }
      ];

      const result = processArchetypeData(input);

      result.forEach(item => {
        expect(item.percentage).toBeCloseTo(0.333, 2);
      });
    });
  });
});
