/**
 * Quiz Results Screen
 * Shows animated orb during profile calculation, then displays aesthetic results
 */

import { useAuth } from '@/auth/authProvider';
import ArchetypeOrb from '@/features/orb/ArchetypeOrb';
import { getUserAestheticProfile } from '@/features/quiz';
import { log } from '@/lib/log';
import { screens } from '@/navigation/routes';
// eslint-disable-next-line no-restricted-imports
import { getArchetypeInfo } from '@/services/aestheticScoringService';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Easing,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

type CalculationPhase = 'calculating' | 'complete';

const CALCULATING_TEXT = 'CALCULATING YOUR PROFILE';

export default function QuizResultsScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const { session } = useAuth() as any;

  const [phase, setPhase] = useState<CalculationPhase>('calculating');
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleChars, setVisibleChars] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const textWidthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const listener = textWidthAnim.addListener(({ value }) => {
      setVisibleChars(Math.round(value));
    });
    return () => textWidthAnim.removeListener(listener);
  }, [textWidthAnim]);

  useEffect(() => {
    loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateQuizConfidence = async (userId: string, normalizedScores: Record<string, number>) => {
    // Confidence is based on how decisive the quiz answers were
    // If top archetype is much higher than others = high confidence
    // If scores are evenly distributed = low confidence

    const scores = Object.values(normalizedScores).sort((a, b) => b - a);
    if (scores.length === 0) return 50;

    const topScore = scores[0];
    const secondScore = scores[1] || 0;

    // Calculate decisiveness: gap between top and second
    const decisiveness = ((topScore - secondScore) / topScore) * 100;

    // Map to confidence scale (0-95)
    // Small gap (< 10%) = 30% confidence
    // Medium gap (10-30%) = 50% confidence
    // Large gap (30-50%) = 70% confidence
    // Very large gap (> 50%) = 90% confidence
    let confidence = 30;
    if (decisiveness >= 50) confidence = 90;
    else if (decisiveness >= 30) confidence = 70;
    else if (decisiveness >= 10) confidence = 50;

    return Math.round(confidence);
  };

  const loadProfile = async () => {
    if (!session?.user?.id) {
      setError('No user session found');
      return;
    }

    try {
      // Load profile data
      const profileData = await getUserAestheticProfile(session.user.id);

      if (!profileData) {
        throw new Error('Profile not found');
      }

      // Calculate quiz-specific confidence
      const quizConfidence = await calculateQuizConfidence(session.user.id, profileData.normalized_scores || {});

      // Store quiz confidence temporarily
      setProfile({
        ...profileData,
        quizConfidence,
      });

      // Start text typewriter animation immediately
      startTextAnimation();

      // After 3 seconds, transition to results
      setTimeout(() => {
        setPhase('complete');
        animateResults();
      }, 3000);

    } catch (err) {
      log.error('[QuizResults] Failed to load profile', err);
      setError('Could not load your profile');

      // Show retry dialog
      Alert.alert(
        'Profile calculation failed',
        'We had trouble processing your results. You can still explore the app.',
        [
          {
            text: 'Retry',
            onPress: () => {
              setError(null);
              setPhase('calculating');
              loadProfile();
            },
          },
          {
            text: 'Continue',
            onPress: () => navigation.replace(screens.Main),
          },
        ]
      );
    }
  };

  const animateResults = () => {
    // Fade in results and slide up from bottom
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startTextAnimation = () => {
    // Typewriter effect - animate the text width from 0 to full width
    Animated.timing(textWidthAnim, {
      toValue: CALCULATING_TEXT.length,
      duration: 1500,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  };

  const handleContinue = () => {
    navigation.replace(screens.Main);
  };

  if (error && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Prepare archetype data for orb color blending - used in both phases
  const archetypeData = profile?.normalized_scores
    ? Object.entries(profile.normalized_scores).map(([archetype, score]) => {
        const info = getArchetypeInfo(archetype);
        return {
          color: info?.color || '#FFFFFF',
          percentage: score as number,
          score: score as number,
        };
      })
    : [];

  // Phase 1: Calculating with animated orb
  if (phase === 'calculating') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.calculatingContainer}>
          {/* Orb - centered and spinning */}
          <View style={styles.orbContainer}>
            {profile && (
              <ArchetypeOrb
                size={width * 0.7}
                archetypeData={archetypeData}
                interactive={false}
                showGlow={true}
              />
            )}
          </View>

          {/* Typewriter calculating text */}
          <View style={styles.textContainer}>
            <Text style={styles.calculatingText}>
              {CALCULATING_TEXT.substring(0, visibleChars)}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Phase 2: Results with profile breakdown
  const primaryInfo = getArchetypeInfo(profile?.primary_archetype);
  const secondaryInfo = getArchetypeInfo(profile?.secondary_archetype);
  const confidence = Math.round(profile?.quizConfidence || 50);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.resultsContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top orb - same size as home screen orb */}
        <View style={styles.topOrbContainer}>
          <ArchetypeOrb
            size={width * 0.6}
            archetypeData={archetypeData}
            interactive={false}
            showGlow={true}
          />
        </View>

        {/* Results content */}
        <Animated.View
          style={[
            styles.resultsContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.resultsTitle}>YOUR RESULTS</Text>

          {/* Primary Archetype Card */}
          <View style={styles.archetypeCard}>
            <Text style={styles.archetypeLabel}>PRIMARY</Text>
            <Text style={styles.archetypeName}>{primaryInfo?.name || 'Unknown'}</Text>
            <Text style={styles.archetypeDescription} numberOfLines={3}>
              {primaryInfo?.description || ''}
            </Text>
            {primaryInfo?.vibe && (
              <View style={styles.vibeContainer}>
                {primaryInfo.vibe.slice(0, 3).map((trait: string, i: number) => (
                  <View key={i} style={styles.vibePill}>
                    <Text style={styles.vibeText}>{trait}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Secondary Archetype Card */}
          {secondaryInfo && (
            <View style={[styles.archetypeCard, styles.secondaryCard]}>
              <Text style={styles.archetypeLabel}>SECONDARY</Text>
              <Text style={styles.archetypeName}>{secondaryInfo.name}</Text>
              <Text style={styles.archetypeDescription} numberOfLines={2}>
                {secondaryInfo.description || ''}
              </Text>
            </View>
          )}

          {/* Quiz Confidence */}
          <View style={styles.confidenceCard}>
            <Text style={styles.confidenceLabel}>Quiz Accuracy</Text>
            <Text style={styles.confidenceValue}>{confidence}%</Text>
            <Text style={styles.confidenceHint}>How decisively your answers defined your aesthetic</Text>
          </View>

          {/* CTA */}
          <Text style={styles.ctaText}>Enter to learn more..</Text>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueText}>Start Exploring</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Calculating phase
  calculatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbContainer: {
    marginBottom: 60,
  },
  textContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  calculatingText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    color: theme.colors.text,
    textAlign: 'center',
  },

  // Results phase
  resultsContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  topOrbContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  resultsContent: {
    paddingHorizontal: 24,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 3,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Archetype cards
  archetypeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  secondaryCard: {
    opacity: 0.85,
  },
  archetypeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  archetypeName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  archetypeDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    opacity: 0.7,
  },
  vibeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  vibePill: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  vibeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },

  // Confidence
  confidenceCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.muted,
    marginBottom: 4,
  },
  confidenceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  confidenceHint: {
    fontSize: 12,
    fontStyle: 'italic',
    color: theme.colors.muted,
    marginTop: 4,
  },

  // CTA
  ctaText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 12,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.muted,
    textAlign: 'center',
  },
});
