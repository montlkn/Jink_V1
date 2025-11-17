
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  getUserAestheticProfile,
  fetchSummary,
  regenerateSummary,
} from '@/features/profile';
import { useAuth } from '../../auth/authProvider';
import ArchetypeDonutSkia from '../../components/charts/ArchetypeDonutSkia';
import ArchetypeOrb from '@/features/orb/ArchetypeOrb';
import AnimatedSummaryText from '../../components/profile/AnimatedSummaryText';
import { getArchetypeColor } from '../../constants/archetypeColors';
import ArchetypeDetailModal from '../../components/modals/ArchetypeDetailModal';
import SegmentModal from '../../components/modals/SegmentModal';
import { getArchetypeInfo, prepareChartData } from '../../services/aestheticScoringService';
import { composeLocalSummary } from '../../services/ai/localSummary';
import { getDetailedArchetypeInfo } from '../../services/archetypeDetailService';
import { log } from '@/lib/log';

const REQUIRED_PROMPT_VERSION = 'prompt-v2';
const MAX_SUMMARY_REFRESH_ATTEMPTS = 2;
const SUMMARY_GUARDRAILS = [
  { pattern: /saved posts?/i, reason: 'mentions saved posts' },
  { pattern: /instagram/i, reason: 'mentions Instagram' },
  { pattern: /followers?/i, reason: 'mentions followers' },
  { pattern: /social (?:feed|graph)/i, reason: 'references social feed' },
];

function normalizeSummaryText(text = '') {
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\s([?.!,])/g, '$1')
    .trim();
  if (!cleaned) return '';

  let result = '';
  let capitalizeNext = true;

  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];
    const isLetter = /[a-zA-Z]/.test(char);

    if (capitalizeNext && isLetter) {
      result += char.toUpperCase();
      capitalizeNext = false;
    } else {
      result += char;
      if (isLetter) {
        capitalizeNext = false;
      }
    }

    if (/[.!?]/.test(char)) {
      capitalizeNext = true;
    } else if (!/\s/.test(char) && !["'", '"', '’', ')', '”'].includes(char)) {
      capitalizeNext = false;
    }
  }

  return result;
}

function formatSourceModelLabel(sourceModel) {
  if (!sourceModel || typeof sourceModel !== 'string') return null;
  const parts = sourceModel.split(/[-_]/).filter(Boolean);
  if (parts.length === 0) return sourceModel;
  return parts
    .map((part) => {
      if (!part) return part;
      if (part.toUpperCase() === part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function evaluateSummaryResponse(payload) {
  const sanitizedKeyPhrases = sanitizeKeyPhrases(
    payload?.summary?.keyPhrases || payload?.summary?.key_phrases
  );

  const summary = payload?.summary
    ? {
        ...payload.summary,
        text: normalizeSummaryText(payload.summary.text || ''),
        keyPhrases: sanitizedKeyPhrases,
      }
    : null;

  const meta = payload?.meta
    ? {
        ...payload.meta,
        sourceModelLabel: formatSourceModelLabel(payload.meta.sourceModel),
      }
    : null;

  const guardrailMatches = summary
    ? SUMMARY_GUARDRAILS.filter(({ pattern }) => pattern.test(summary.text))
    : [];

  return {
    summary,
    meta,
    guardrailViolation: guardrailMatches.length > 0,
    guardrailReasons: guardrailMatches.map(({ reason }) => reason),
  };
}

function buildPlaceholderSummary(message) {
  return {
    text: message,
    generatedAt: null,
    placeholder: true,
  };
}

function sanitizeKeyPhrases(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const sanitized = [];

  for (const raw of value) {
    let candidate = '';

    if (typeof raw === 'string') {
      candidate = raw;
    } else if (raw && typeof raw === 'object') {
      if (typeof raw.label === 'string') {
        candidate = raw.label;
      } else if (typeof raw.name === 'string') {
        candidate = raw.name;
      } else if (typeof raw.value === 'string') {
        candidate = raw.value;
      } else {
        candidate = String(raw);
      }
    } else if (raw != null) {
      candidate = String(raw);
    }

    if (!candidate) continue;

    const normalized = candidate.replace(/\s+/g, ' ').trim();
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sanitized.push(normalized);
  }

  return sanitized;
}

function formatSuggestionLabel(phrase) {
  if (typeof phrase !== 'string') return '';
  const normalized = phrase.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map((word) => {
      const trimmed = word.trim();
      if (!trimmed) return null;
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
const formatRelativeTime = (isoDateString) => {
  try {
    const date = new Date(isoDateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'recently';
  }
};

const ProfileDetailScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [summaryPending, setSummaryPending] = useState(false);
  const [summaryAnimationKey, setSummaryAnimationKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedArchetype] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [segmentModalVisible, setSegmentModalVisible] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const scrollViewRef = useRef();
  const initialArchetypeRef = useRef(null);
  const summaryRefreshAttempts = useRef(0);
  const route = useRoute();

  const commitSummary = useCallback((valueOrUpdater) => {
    setAiSummary((prev) => {
      const next =
        typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      if (next && next !== prev) {
        setSummaryAnimationKey((key) => key + 1);
      }
      return next;
    });
  }, [setSummaryAnimationKey]);

  const fallbackToLocalSummary = useCallback((profileData) => {
    if (!profileData) {
      commitSummary(buildPlaceholderSummary('Refreshing your aesthetic profile…'));
      setSummaryPending(false);
      return;
    }

    const local = composeLocalSummary({
      primary_archetype: profileData.primary_archetype,
      secondary_archetype: profileData.secondary_archetype,
      archetype_scores: profileData.archetype_scores,
    });

    if (local?.text) {
      const primaryInfoData = profileData?.primary_archetype
        ? getArchetypeInfo(profileData.primary_archetype)
        : null;
      const secondaryInfoData = profileData?.secondary_archetype
        ? getArchetypeInfo(profileData.secondary_archetype)
        : null;
      const fallbackPhrases = sanitizeKeyPhrases([
        ...((primaryInfoData?.vibe || []).slice(0, 3) || []),
        ...((secondaryInfoData?.vibe || []).slice(0, 2) || []),
      ]);

      commitSummary({
        ...local,
        text: normalizeSummaryText(local.text),
        placeholder: false,
        keyPhrases: fallbackPhrases,
      });
    } else {
      commitSummary(buildPlaceholderSummary('We could not personalize your profile just yet.'));
    }

    setSummaryPending(false);
  }, [commitSummary]);

  const triggerManualRegeneration = useCallback(async (profileData) => {
    if (!profileData) return false;

    summaryRefreshAttempts.current += 1;

    try {
      log.debug('[profile-screen] Requesting manual summary regeneration');
      await regenerateSummary();

      const refreshed = await fetchSummary(false);
      const evaluation = evaluateSummaryResponse(refreshed);

      if (evaluation.summary && !evaluation.guardrailViolation) {
        commitSummary(evaluation.summary);
        setSummaryPending(false);
        return true;
      }

      if (evaluation.guardrailViolation) {
        log.debug(
          '[profile-screen] Manual regeneration violated guardrails:',
          evaluation.guardrailReasons.join(', ') || 'unknown'
        );
      }
    } catch (regenErr) {
      log.warn('AI summary manual regeneration failed:', regenErr.message);
    }

    return false;
  }, [commitSummary]);

  const refreshSummaryWithGuardrails = useCallback(async (profileData) => {
    if (!profileData) {
      setSummaryPending(false);
      return;
    }

    summaryRefreshAttempts.current += 1;

    try {
      log.debug(`[profile-screen] Autogen summary attempt #${summaryRefreshAttempts.current}`);
      const autogen = await fetchSummary(true);
      const evaluation = evaluateSummaryResponse(autogen);

      if (evaluation.summary && !evaluation.guardrailViolation) {
        commitSummary(evaluation.summary);
        setSummaryPending(false);
        return;
      }

      if (evaluation.guardrailViolation) {
        log.debug(
          '[profile-screen] Autogen summary guardrail violation:',
          evaluation.guardrailReasons.join(', ') || 'unknown'
        );
      }
    } catch (autogenErr) {
      log.warn('AI summary autogen skipped:', autogenErr.message);
    }

    if (summaryRefreshAttempts.current < MAX_SUMMARY_REFRESH_ATTEMPTS) {
      const regenerated = await triggerManualRegeneration(profileData);
      if (regenerated) {
        return;
      }
    }

    fallbackToLocalSummary(profileData);
  }, [commitSummary, fallbackToLocalSummary, triggerManualRegeneration]);

  const loadUserProfile = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    commitSummary((prev) =>
      prev?.text
        ? prev
        : { text: '', generatedAt: null, placeholder: false, keyPhrases: [] }
    );
    try {
      log.debug('[profile-screen] Loading profile detail…');
      const userProfile = await getUserAestheticProfile(session.user.id);
      setProfile(userProfile);
      setLoading(false);

      let resolvedSummary = null;
      let willAutogen = false;
      summaryRefreshAttempts.current = 0;

      try {
        const initial = await fetchSummary(false);
        const evaluation = evaluateSummaryResponse(initial);

        if (evaluation.summary && !evaluation.guardrailViolation) {
          commitSummary(evaluation.summary);
          resolvedSummary = evaluation.summary;
          setSummaryPending(false);
        } else if (evaluation.guardrailViolation) {
          log.debug(
            '[profile-screen] Cached summary violated guardrails:',
            evaluation.guardrailReasons.join(', ') || 'unknown'
          );
          commitSummary((prev) =>
            prev && !prev.placeholder
              ? prev
              : buildPlaceholderSummary('Personalizing your aesthetic profile…')
          );
          setSummaryPending(true);
        }

        const summarySourceModel = evaluation.meta?.sourceModel || '';
        const hasRequiredPrompt =
          typeof summarySourceModel === 'string' &&
          summarySourceModel.includes(REQUIRED_PROMPT_VERSION);

        const shouldAutogen =
          !evaluation.summary ||
          evaluation.guardrailViolation ||
          evaluation.meta?.needsUpdate ||
          !hasRequiredPrompt;
        if (shouldAutogen) {
          willAutogen = true;
          if (!resolvedSummary) {
            commitSummary((prev) =>
              prev && !prev.placeholder
                ? prev
                : buildPlaceholderSummary('Personalizing your aesthetic profile…')
            );
          }
          setSummaryPending(true);
          void refreshSummaryWithGuardrails(userProfile);
        } else {
          setSummaryPending(false);
        }
      } catch (summaryErr) {
        log.warn('Could not fetch AI summary:', summaryErr.message);
        setSummaryPending(false);
        // Non-critical: continue without AI summary
      }

      // If still no AI summary, compose a local deterministic write‑up
      if (
        !resolvedSummary &&
        (!aiSummary || aiSummary.placeholder) &&
        !willAutogen
      ) {
        log.debug('[profile-screen] Using fallback summary');
        fallbackToLocalSummary(userProfile);
      }

      setError(null);
    } catch (err) {
      log.error('Error loading profile detail:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
      await loadUserProfile();
    } catch (refreshErr) {
      log.warn('Profile refresh failed:', refreshErr?.message || refreshErr);
    } finally {
      setRefreshing(false);
    }
  };
  const handleMoreInfoFromSegment = (segmentData) => {
    // Close segment modal first
    setSegmentModalVisible(false);

    // Get detailed info and open detail modal
    const detailedInfo = getDetailedArchetypeInfo(segmentData.archetype);
    if (detailedInfo) {
      setSelectedArchetype(detailedInfo);
      setModalVisible(true);
    }
  };

  const handleArchetypePress = (archetypeName) => {
    const detailedInfo = getDetailedArchetypeInfo(archetypeName);
    if (detailedInfo) {
      setSelectedArchetype(detailedInfo);
      setModalVisible(true);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedArchetype(null);
  };

  const closeSegmentModal = () => {
    setSegmentModalVisible(false);
    setTimeout(() => {
      setSelectedSegment(null);
    }, 100);
  };

  useEffect(() => {
    const targetArchetype = route?.params?.initialArchetype;
    if (!profile || !targetArchetype) return;
    if (initialArchetypeRef.current === targetArchetype) return;

    const detailedInfo = getDetailedArchetypeInfo(targetArchetype);
    if (detailedInfo) {
      setSelectedArchetype(detailedInfo);
      setModalVisible(true);
      initialArchetypeRef.current = targetArchetype;
      navigation.setParams?.({ initialArchetype: null });
    }
  }, [profile, route?.params?.initialArchetype, navigation]);

  const chartData = useMemo(() => {
    if (!profile?.archetype_scores) {
      return [];
    }

    try {
      return prepareChartData(
        profile.archetype_scores,
        profile.primary_archetype,
        profile.secondary_archetype
      );
    } catch (err) {
      log.warn('[ProfileDetail] Failed to prepare chart data', err);
      return [];
    }
  }, [profile]);

  const donutSlices = useMemo(() => {
    if (!chartData.length) {
      return [];
    }

    return chartData.map((item, index) => {
      const id = item.archetype || item.name || `slice-${index}`;
      const rawScore = Number(item.score ?? item.value ?? 0);
      const safeScore = Number.isFinite(rawScore) ? Math.max(0, rawScore) : 0;
      const percentageValue = Number(item.percentage ?? 0);
      const safePercentage = Number.isFinite(percentageValue)
        ? Math.max(0, Math.round(percentageValue))
        : 0;
      const labelBase = item.name || item.archetype || id;

      return {
        id,
        value: safeScore,
        label: labelBase,
        color: item.color,
        percentageLabel: `${safePercentage}%`,
      };
    });
  }, [chartData]);

  const orbData = useMemo(
    () =>
      chartData.slice(0, 3).map((item) => ({
        color: item.color,
        percentage: item.percentage,
        score: item.score,
      })),
    [chartData]
  );

  const primaryInfo = useMemo(
    () => (profile?.primary_archetype ? getArchetypeInfo(profile.primary_archetype) : null),
    [profile?.primary_archetype]
  );

  const secondaryInfo = useMemo(
    () =>
      profile?.secondary_archetype ? getArchetypeInfo(profile.secondary_archetype) : null,
    [profile?.secondary_archetype]
  );

  const centerGlowColor = useMemo(() => {
    if (primaryInfo?.color) return primaryInfo.color;
    if (donutSlices.length > 0 && donutSlices[0]?.color) {
      return donutSlices[0].color;
    }
    return undefined;
  }, [primaryInfo?.color, donutSlices]);

  const donutSize = 380;
  const donutInnerRadiusRatio = 0.2;
  const centerOrbSize = Math.max(120, Math.round(donutSize * donutInnerRadiusRatio));

  const donutDecorator = useMemo(() => {
    try {
      const source = Image.resolveAssetSource(
        require('../../../assets/decorators/donutFlipMarker.svg')
      );
      if (!source?.uri) return undefined;
      return { uri: source.uri, size: 28 };
    } catch (error) {
      log.warn('[ProfileDetail] donut decorator missing', error);
      return undefined;
    }
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aesthetic Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load profile</Text>
          <TouchableOpacity onPress={loadUserProfile} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const summaryText = aiSummary?.text || '';
  const summaryPlaceholder = !!aiSummary?.placeholder;
  const summaryGeneratedAt = aiSummary?.generatedAt;
  const rawSuggestionPhrases = !summaryPlaceholder && Array.isArray(aiSummary?.keyPhrases)
    ? aiSummary.keyPhrases
    : [];

  const suggestionPills = [];
  const suggestionSeen = new Set();
  rawSuggestionPhrases.forEach((phrase) => {
    const formatted = formatSuggestionLabel(phrase);
    if (!formatted) return;
    const key = formatted.toLowerCase();
    if (suggestionSeen.has(key)) return;
    suggestionSeen.add(key);
    suggestionPills.push(formatted);
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={["rgba(255,255,255,1)", "rgba(255,255,255,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aesthetic Profile</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#000"
            colors={['#000']}
          />
        }
      >
        <View style={styles.chartSection}>
          <View style={[styles.donutWrapper, { width: donutSize, height: donutSize }]}>
            <ArchetypeDonutSkia
              data={donutSlices}
              size={donutSize}
              centerGlowColor={centerGlowColor}
              decorator={donutDecorator}
            />
            <View style={styles.donutOrbOverlay} pointerEvents="none">
              <ArchetypeOrb
                size={centerOrbSize}
                archetypeData={orbData}
                interactive={false}
              />
            </View>
          </View>
        </View>

        {/* AI-Generated Profile Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Aesthetic Profile</Text>
          <View style={styles.summaryCard}>
            {summaryPending && (
              <View style={styles.summaryPendingRow}>
                <ActivityIndicator
                  size="small"
                  color="#666"
                  style={styles.summarySpinner}
                />
                <Text style={styles.pendingLabel}>
                  {aiSummary?.placeholder
                    ? 'Personalizing your aesthetic profile…'
                    : 'Refreshing with your latest signals…'}
                </Text>
              </View>
            )}
            <AnimatedSummaryText
              text={summaryText}
              placeholder={summaryPlaceholder}
              isActive={!summaryPlaceholder}
              typingDelayMs={12}
              animationKey={summaryAnimationKey}
              showCursor
              style={[
                styles.aiSummaryText,
                summaryPlaceholder && styles.placeholderSummaryText,
              ]}
              accessibilityLabel={
                summaryText ||
                'Your aesthetic profile summary is being personalized.'
              }
            />
            {summaryGeneratedAt && !summaryPlaceholder && summaryText && (
              <Text style={styles.generatedAtText}>
                Generated {formatRelativeTime(summaryGeneratedAt)}
              </Text>
            )}
            {suggestionPills.length > 0 && (
              <View style={styles.summarySuggestions}>
                {suggestionPills.slice(0, 6).map((label, index) => (
                  <View key={`${label}-${index}`} style={styles.suggestionPill}>
                    <Text style={styles.suggestionPillText}>{label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Primary Archetype Section */}
        {primaryInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Primary Archetype</Text>
            <View style={[styles.archetypeCard, { borderLeftColor: primaryInfo.color }]}>
              <Text style={styles.archetypeName}>{primaryInfo.name}</Text>
              <Text style={styles.archetypeDescription}>{primaryInfo.description}</Text>
              <View style={styles.vibeContainer}>
                <Text style={styles.vibeTitle}>Key Characteristics:</Text>
                <View style={styles.vibeList}>
                  {primaryInfo.vibe.map((trait, index) => (
                    <View 
                      key={index} 
                      style={[styles.vibeTag, { backgroundColor: `${primaryInfo.color}20` }]}
                    >
                      <Text style={[styles.vibeText, { color: primaryInfo.color }]}>{trait}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Secondary Archetype Section */}
        {secondaryInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Secondary Archetype</Text>
            <View style={[styles.archetypeCard, { borderLeftColor: secondaryInfo.color }]}>
              <Text style={styles.archetypeName}>{secondaryInfo.name}</Text>
              <Text style={styles.archetypeDescription}>{secondaryInfo.description}</Text>
              <View style={styles.vibeContainer}>
                <Text style={styles.vibeTitle}>Key Characteristics:</Text>
                <View style={styles.vibeList}>
                  {secondaryInfo.vibe.slice(0, 4).map((trait, index) => (
                    <View 
                      key={index} 
                      style={[styles.vibeTag, { backgroundColor: `${secondaryInfo.color}20` }]}
                    >
                      <Text style={[styles.vibeText, { color: secondaryInfo.color }]}>{trait}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Aesthetic Affinities - moved to bottom */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aesthetic Affinities</Text>
          <View style={styles.scoresContainer}>
            {chartData.map((item, index) => {
              // Check if this archetype has subtypes
              const hasInfrastructuralistSubtype = item.archetype === 'industrialist' && profile.archetype_scores?.infrastructuralist > 0;
              const hasNaturalistSubtype = item.archetype === 'vernacularist' && profile.archetype_scores?.naturalist > 0;
              
              return (
                <View key={index}>
                  <TouchableOpacity 
                    style={[styles.scoreRow, highlightedArchetype === item.archetype && styles.highlightedRow]}
                    onPress={() => handleArchetypePress(item.archetype)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.scoreInfo}>
                      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                      <Text style={styles.scoreName}>{item.name}</Text>
                    </View>
                    <View style={styles.scoreValues}>
                      <Text style={styles.scorePercentage}>{item.percentage}%</Text>
                      <Text style={styles.scorePoints}>({item.score} pts)</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Show infrastructuralist subtype if applicable */}
                  {hasInfrastructuralistSubtype && (
                    <TouchableOpacity 
                      style={[styles.scoreRow, styles.subtypeRow]}
                      onPress={() => handleArchetypePress('infrastructuralist')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.scoreInfo}>
                        <View style={styles.subtypeIndent} />
                        <View style={[styles.colorDot, styles.subtypeDot, { backgroundColor: getArchetypeColor('Infrastructuralist') }]} />
                        <Text style={[styles.scoreName, styles.subtypeName]}>The Infrastructuralist</Text>
                      </View>
                      <View style={styles.scoreValues}>
                        <Text style={[styles.scorePercentage, styles.subtypePercentage]}>
                          {Math.round((profile.archetype_scores.infrastructuralist / Object.values(profile.archetype_scores).reduce((sum, score) => sum + Math.max(0, score), 0)) * 100)}%
                        </Text>
                        <Text style={[styles.scorePoints, styles.subtypePoints]}>({profile.archetype_scores.infrastructuralist} pts)</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  
                  {/* Show naturalist subtype if applicable */}
                  {hasNaturalistSubtype && (
                    <TouchableOpacity 
                      style={[styles.scoreRow, styles.subtypeRow]}
                      onPress={() => handleArchetypePress('naturalist')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.scoreInfo}>
                        <View style={styles.subtypeIndent} />
                        <View style={[styles.colorDot, styles.subtypeDot, { backgroundColor: getArchetypeColor('Naturalist') }]} />
                        <Text style={[styles.scoreName, styles.subtypeName]}>The Naturalist</Text>
                      </View>
                      <View style={styles.scoreValues}>
                        <Text style={[styles.scorePercentage, styles.subtypePercentage]}>
                          {Math.round((profile.archetype_scores.naturalist / Object.values(profile.archetype_scores).reduce((sum, score) => sum + Math.max(0, score), 0)) * 100)}%
                        </Text>
                        <Text style={[styles.scorePoints, styles.subtypePoints]}>({profile.archetype_scores.naturalist} pts)</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>

      <ArchetypeDetailModal
        visible={modalVisible}
        archetype={selectedArchetype}
        onClose={closeModal}
      />

      <SegmentModal
        visible={segmentModalVisible}
        segment={selectedSegment}
        onClose={closeSegmentModal}
        onMoreInfo={handleMoreInfoFromSegment}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 44,
    paddingBottom: 80,
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 160,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#000',
    borderRadius: 25,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  chartSection: {
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 20,
  },
  donutWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutOrbOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoresContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  highlightedRow: {
    backgroundColor: '#f0f8ff',
  },
  scoreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  scoreName: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  scoreValues: {
    alignItems: 'flex-end',
  },
  scorePercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  scorePoints: {
    fontSize: 12,
    color: '#666',
  },
  archetypeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  archetypeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  archetypeDescription: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
  },
  vibeContainer: {
    marginTop: 8,
  },
  vibeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vibeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vibeTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 6,
  },
  vibeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#f0f0f0',
  },
  subtypeRow: {
    backgroundColor: '#f9f9f9',
    marginLeft: 0,
  },
  subtypeIndent: {
    width: 20,
    height: 1,
  },
  subtypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subtypeName: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
  },
  subtypePercentage: {
    fontSize: 14,
    color: '#555',
  },
  subtypePoints: {
    fontSize: 11,
    color: '#888',
  },
  aiSummaryText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
    marginBottom: 12,
    fontWeight: '500',
  },
  placeholderSummaryText: {
    color: '#555',
    fontStyle: 'italic',
  },
  summarySpinner: {
    marginRight: 8,
  },
  summaryPendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingLabel: {
    fontSize: 13,
    color: '#666',
  },
  generatedAtText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  summarySuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  suggestionPill: {
    backgroundColor: '#f3f3f3',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  suggestionPillText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default ProfileDetailScreen;
