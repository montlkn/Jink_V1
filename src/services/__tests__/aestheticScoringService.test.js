import {
  calculateClientSideProfile,
  getArchetypeInfo,
  prepareChartData,
  generateProfileSummary,
  SCORING,
  ARCHETYPES,
  SUBTYPES
} from '../aestheticScoringService';

// Mock the archetype colors
jest.mock('../../constants/archetypeColors', () => ({
  getArchetypeColor: jest.fn((archetype) => {
    const colors = {
      'Classicist': '#8B7355',
      'Romantic': '#D4A5A5',
      'Stylist': '#FFD700',
      'Modernist': '#4A4A4A',
      'Industrialist': '#7F8C8D',
      'Visionary': '#9B59B6',
      'Pop Culturalist': '#FF6B6B',
      'Vernacularist': '#8FBC8F',
      'Austerist': '#95A5A6',
      'Infrastructuralist': '#34495E',
      'Naturalist': '#2ECC71'
    };
    return colors[archetype] || '#999999';
  })
}));

describe('aestheticScoringService', () => {
  describe('SCORING constants', () => {
    it('should have correct scoring values', () => {
      expect(SCORING.primary).toBe(5);
      expect(SCORING.secondary).toBe(2);
      expect(SCORING.tertiary).toBe(0.5);
      expect(SCORING.contradiction).toBe(-1);
    });
  });

  describe('ARCHETYPES', () => {
    it('should include all 9 main archetypes', () => {
      expect(ARCHETYPES).toHaveLength(9);
      expect(ARCHETYPES).toContain('classicist');
      expect(ARCHETYPES).toContain('romantic');
      expect(ARCHETYPES).toContain('stylist');
      expect(ARCHETYPES).toContain('modernist');
      expect(ARCHETYPES).toContain('industrialist');
      expect(ARCHETYPES).toContain('visionary');
      expect(ARCHETYPES).toContain('pop_culturalist');
      expect(ARCHETYPES).toContain('vernacularist');
      expect(ARCHETYPES).toContain('austerist');
    });
  });

  describe('SUBTYPES', () => {
    it('should map subtypes correctly', () => {
      expect(SUBTYPES.infrastructuralist).toBe('industrialist');
      expect(SUBTYPES.naturalist).toBe('vernacularist');
    });
  });

  describe('calculateClientSideProfile', () => {
    const mockQuestions = [
      {
        id: 'q1',
        question_options: [
          { id: 'opt1', aesthetic_scores: { classicist: 5, modernist: 2 } },
          { id: 'opt2', aesthetic_scores: { romantic: 5, visionary: 2 } }
        ]
      },
      {
        id: 'q2',
        question_options: [
          { id: 'opt3', aesthetic_scores: { classicist: 5, stylist: 2 } },
          { id: 'opt4', aesthetic_scores: { industrialist: 5, austerist: 2 } }
        ]
      }
    ];

    it('should calculate scores correctly from responses', () => {
      const responses = [
        { questionId: 'q1', optionId: 'opt1', responseTime: 2000 },
        { questionId: 'q2', optionId: 'opt3', responseTime: 2500 }
      ];

      const profile = calculateClientSideProfile(responses, mockQuestions);

      expect(profile.scores.classicist).toBe(10); // 5 + 5
      expect(profile.scores.modernist).toBe(2);
      expect(profile.scores.stylist).toBe(2);
      expect(profile.scores.romantic).toBe(0);
    });

    it('should identify primary and secondary archetypes', () => {
      const responses = [
        { questionId: 'q1', optionId: 'opt1', responseTime: 3000 }
      ];

      const profile = calculateClientSideProfile(responses, mockQuestions);

      expect(profile.primaryArchetype).toBe('classicist'); // highest score: 5
      expect(profile.secondaryArchetype).toBe('modernist'); // second highest: 2
    });

    it('should calculate confidence score based on response time', () => {
      // Fast responses (< 3000ms) = high confidence
      const fastResponses = [
        { questionId: 'q1', optionId: 'opt1', responseTime: 2000 },
        { questionId: 'q2', optionId: 'opt3', responseTime: 2000 }
      ];

      const fastProfile = calculateClientSideProfile(fastResponses, mockQuestions);
      expect(fastProfile.confidenceScore).toBeGreaterThan(0.8);

      // Slow responses (> 8000ms) = lower confidence
      const slowResponses = [
        { questionId: 'q1', optionId: 'opt1', responseTime: 10000 },
        { questionId: 'q2', optionId: 'opt3', responseTime: 10000 }
      ];

      const slowProfile = calculateClientSideProfile(slowResponses, mockQuestions);
      expect(slowProfile.confidenceScore).toBeLessThan(0.7);
    });

    it('should calculate separation score', () => {
      const responses = [
        { questionId: 'q1', optionId: 'opt1', responseTime: 2000 }
      ];

      const profile = calculateClientSideProfile(responses, mockQuestions);

      // Separation = (primary - secondary) / 50
      expect(profile.separationScore).toBeDefined();
      expect(profile.separationScore).toBeGreaterThanOrEqual(0);
      expect(profile.separationScore).toBeLessThanOrEqual(1);
    });

    it('should resolve infrastructuralist subtype', () => {
      const questions = [{
        id: 'q1',
        question_options: [
          {
            id: 'opt1',
            aesthetic_scores: {
              industrialist: 45,
              infrastructuralist: 30
            }
          }
        ]
      }];

      const responses = [
        { questionId: 'q1', optionId: 'opt1', responseTime: 2000 }
      ];

      const profile = calculateClientSideProfile(responses, questions);

      // infrastructuralist score / industrialist score > 0.6 and industrialist > 40
      expect(profile.primaryArchetype).toBe('infrastructuralist');
    });

    it('should resolve naturalist subtype', () => {
      const questions = [{
        id: 'q1',
        question_options: [
          {
            id: 'opt1',
            aesthetic_scores: {
              vernacularist: 45,
              naturalist: 30
            }
          }
        ]
      }];

      const responses = [
        { questionId: 'q1', optionId: 'opt1', responseTime: 2000 }
      ];

      const profile = calculateClientSideProfile(responses, questions);

      expect(profile.primaryArchetype).toBe('naturalist');
    });

    it('should not resolve subtype if score is too low', () => {
      const questions = [{
        id: 'q1',
        question_options: [
          {
            id: 'opt1',
            aesthetic_scores: {
              industrialist: 30, // < 40
              infrastructuralist: 20
            }
          }
        ]
      }];

      const responses = [
        { questionId: 'q1', optionId: 'opt1', responseTime: 2000 }
      ];

      const profile = calculateClientSideProfile(responses, questions);

      expect(profile.primaryArchetype).toBe('industrialist');
    });

    it('should handle missing response times', () => {
      const responses = [
        { questionId: 'q1', optionId: 'opt1' }, // no responseTime
        { questionId: 'q2', optionId: 'opt3' }
      ];

      const profile = calculateClientSideProfile(responses, mockQuestions);

      expect(profile.confidenceScore).toBeDefined();
      expect(profile.confidenceScore).toBeGreaterThan(0);
    });

    it('should handle invalid question IDs', () => {
      const responses = [
        { questionId: 'invalid', optionId: 'opt1', responseTime: 2000 }
      ];

      const profile = calculateClientSideProfile(responses, mockQuestions);

      // All scores should be 0
      ARCHETYPES.forEach(archetype => {
        expect(profile.scores[archetype]).toBe(0);
      });
    });

    it('should handle invalid option IDs', () => {
      const responses = [
        { questionId: 'q1', optionId: 'invalid', responseTime: 2000 }
      ];

      const profile = calculateClientSideProfile(responses, mockQuestions);

      ARCHETYPES.forEach(archetype => {
        expect(profile.scores[archetype]).toBe(0);
      });
    });

    it('should mark profile as complete when all questions answered', () => {
      const responses = [
        { questionId: 'q1', optionId: 'opt1', responseTime: 2000 },
        { questionId: 'q2', optionId: 'opt3', responseTime: 2000 }
      ];

      const profile = calculateClientSideProfile(responses, mockQuestions);

      expect(profile.isComplete).toBe(true);
    });

    it('should mark profile as incomplete when not all questions answered', () => {
      const responses = [
        { questionId: 'q1', optionId: 'opt1', responseTime: 2000 }
      ];

      const profile = calculateClientSideProfile(responses, mockQuestions);

      expect(profile.isComplete).toBe(false);
    });

    it('should cap confidence score between 0.2 and 1.0', () => {
      // Very fast response
      const veryFast = [
        { questionId: 'q1', optionId: 'opt1', responseTime: 100 }
      ];

      const fastProfile = calculateClientSideProfile(veryFast, mockQuestions);
      expect(fastProfile.confidenceScore).toBeLessThanOrEqual(1.0);

      // Very slow response
      const verySlow = [
        { questionId: 'q1', optionId: 'opt1', responseTime: 50000 }
      ];

      const slowProfile = calculateClientSideProfile(verySlow, mockQuestions);
      expect(slowProfile.confidenceScore).toBeGreaterThanOrEqual(0.2);
    });

    it('should add consistency bonus for low variance', () => {
      // Consistent response times
      const consistentResponses = [
        { questionId: 'q1', optionId: 'opt1', responseTime: 2000 },
        { questionId: 'q2', optionId: 'opt3', responseTime: 2100 }
      ];

      const profile = calculateClientSideProfile(consistentResponses, mockQuestions);

      expect(profile.confidenceScore).toBeDefined();
    });

    it('should initialize all archetype scores including subtypes', () => {
      const responses = [];
      const profile = calculateClientSideProfile(responses, mockQuestions);

      ARCHETYPES.forEach(archetype => {
        expect(profile.scores).toHaveProperty(archetype);
      });
      expect(profile.scores).toHaveProperty('infrastructuralist');
      expect(profile.scores).toHaveProperty('naturalist');
    });
  });

  describe('getArchetypeInfo', () => {
    it('should return info for all main archetypes', () => {
      ARCHETYPES.forEach(archetype => {
        const info = getArchetypeInfo(archetype);
        expect(info).toBeDefined();
        expect(info.name).toBeDefined();
        expect(info.description).toBeDefined();
        expect(info.vibe).toBeDefined();
        expect(Array.isArray(info.vibe)).toBe(true);
      });
    });

    it('should return info for subtypes', () => {
      const infraInfo = getArchetypeInfo('infrastructuralist');
      expect(infraInfo).toBeDefined();
      expect(infraInfo.name).toBe('The Infrastructuralist');

      const natInfo = getArchetypeInfo('naturalist');
      expect(natInfo).toBeDefined();
      expect(natInfo.name).toBe('The Naturalist');
    });

    it('should return null for invalid archetype', () => {
      const info = getArchetypeInfo('invalid');
      expect(info).toBeNull();
    });

    it('should include color from archetype colors', () => {
      const info = getArchetypeInfo('classicist');
      expect(info.color).toBeDefined();
    });

    it('should have detailed info for classicist', () => {
      const info = getArchetypeInfo('classicist');
      expect(info.name).toBe('The Classicist');
      expect(info.coreQualities).toBeDefined();
      expect(info.urbanExpression).toBeDefined();
      expect(info.umbrellaMovements).toBeDefined();
    });
  });

  describe('prepareChartData', () => {
    it('should prepare chart data from scores', () => {
      const scores = {
        classicist: 10,
        romantic: 5,
        stylist: 3,
        modernist: 0,
        industrialist: 0,
        visionary: 0,
        pop_culturalist: 0,
        vernacularist: 0,
        austerist: 0
      };

      const chartData = prepareChartData(scores, 'classicist', 'romantic');

      expect(chartData).toHaveLength(3); // Only positive scores
      expect(chartData[0].archetype).toBe('classicist');
      expect(chartData[0].isPrimary).toBe(true);
      expect(chartData[1].archetype).toBe('romantic');
      expect(chartData[1].isSecondary).toBe(true);
    });

    it('should calculate percentages correctly', () => {
      const scores = {
        classicist: 10,
        romantic: 5,
        stylist: 5,
        modernist: 0,
        industrialist: 0,
        visionary: 0,
        pop_culturalist: 0,
        vernacularist: 0,
        austerist: 0
      };

      const chartData = prepareChartData(scores, 'classicist', 'romantic');

      // Total = 20, classicist = 10 (50%), romantic = 5 (25%), stylist = 5 (25%)
      expect(chartData[0].percentage).toBe(50);
      expect(chartData[1].percentage).toBe(25);
      expect(chartData[2].percentage).toBe(25);
    });

    it('should return empty array for zero scores', () => {
      const scores = {};
      ARCHETYPES.forEach(archetype => scores[archetype] = 0);

      const chartData = prepareChartData(scores, 'classicist', 'romantic');

      expect(chartData).toEqual([]);
    });

    it('should sort by score descending', () => {
      const scores = {
        classicist: 3,
        romantic: 10,
        stylist: 5,
        modernist: 0,
        industrialist: 0,
        visionary: 0,
        pop_culturalist: 0,
        vernacularist: 0,
        austerist: 0
      };

      const chartData = prepareChartData(scores, 'romantic', 'stylist');

      expect(chartData[0].score).toBe(10); // romantic
      expect(chartData[1].score).toBe(5);  // stylist
      expect(chartData[2].score).toBe(3);  // classicist
    });

    it('should include color for each archetype', () => {
      const scores = {
        classicist: 10,
        romantic: 0,
        stylist: 0,
        modernist: 0,
        industrialist: 0,
        visionary: 0,
        pop_culturalist: 0,
        vernacularist: 0,
        austerist: 0
      };

      const chartData = prepareChartData(scores, 'classicist', null);

      expect(chartData[0].color).toBeDefined();
    });

    it('should only include positive scores', () => {
      const scores = {
        classicist: 10,
        romantic: -5, // negative score
        stylist: 0,
        modernist: 0,
        industrialist: 0,
        visionary: 0,
        pop_culturalist: 0,
        vernacularist: 0,
        austerist: 0
      };

      const chartData = prepareChartData(scores, 'classicist', null);

      expect(chartData).toHaveLength(1);
      expect(chartData[0].archetype).toBe('classicist');
    });
  });

  describe('generateProfileSummary', () => {
    it('should generate summary for valid profile', () => {
      const profile = {
        primaryArchetype: 'classicist',
        secondaryArchetype: 'romantic',
        confidenceScore: 0.85,
        separationScore: 0.7
      };

      const summary = generateProfileSummary(profile);

      expect(summary).toBeDefined();
      expect(summary.title).toBe('The Classicist');
      expect(summary.description).toBeDefined();
      expect(summary.primaryVibe).toBeDefined();
      expect(summary.secondaryArchetype).toBeDefined();
      expect(summary.secondaryArchetype.name).toBe('The Romantic');
    });

    it('should return null for invalid primary archetype', () => {
      const profile = {
        primaryArchetype: 'invalid',
        secondaryArchetype: 'romantic',
        confidenceScore: 0.85,
        separationScore: 0.7
      };

      const summary = generateProfileSummary(profile);

      expect(summary).toBeNull();
    });

    it('should categorize confidence levels correctly', () => {
      const testCases = [
        { score: 0.9, expected: 'Very High' },
        { score: 0.75, expected: 'High' },
        { score: 0.5, expected: 'Medium' },
        { score: 0.35, expected: 'Low' },
        { score: 0.2, expected: 'Very Low' }
      ];

      testCases.forEach(({ score, expected }) => {
        const profile = {
          primaryArchetype: 'classicist',
          secondaryArchetype: 'romantic',
          confidenceScore: score,
          separationScore: 0.5
        };

        const summary = generateProfileSummary(profile);
        expect(summary.confidenceLevel).toBe(expected);
      });
    });

    it('should categorize distinctiveness correctly', () => {
      const testCases = [
        { score: 0.8, expected: 'Very Distinct' },
        { score: 0.45, expected: 'Moderately Distinct' },
        { score: 0.2, expected: 'Mixed Preferences' }
      ];

      testCases.forEach(({ score, expected }) => {
        const profile = {
          primaryArchetype: 'classicist',
          secondaryArchetype: 'romantic',
          confidenceScore: 0.8,
          separationScore: score
        };

        const summary = generateProfileSummary(profile);
        expect(summary.distinctiveness).toBe(expected);
      });
    });

    it('should handle profile without secondary archetype', () => {
      const profile = {
        primaryArchetype: 'classicist',
        secondaryArchetype: null,
        confidenceScore: 0.85,
        separationScore: 0.7
      };

      const summary = generateProfileSummary(profile);

      expect(summary.secondaryArchetype).toBeNull();
    });

    it('should limit secondary vibe to 3 traits', () => {
      const profile = {
        primaryArchetype: 'classicist',
        secondaryArchetype: 'romantic',
        confidenceScore: 0.85,
        separationScore: 0.7
      };

      const summary = generateProfileSummary(profile);

      expect(summary.secondaryArchetype.vibe).toHaveLength(3);
    });
  });
});
