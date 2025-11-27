import ArchetypeOrb from '@/features/orb/ArchetypeOrb';
import { PassportBackButton } from '@/features/passport';
import {
  fetchSummary,
  getUserAestheticProfile,
  regenerateSummary,
} from '@/features/profile';
import { log } from '@/lib/log';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../auth/authProvider';
import ArchetypePieChart from '../../components/charts/ArchetypePieChart';
import SegmentModal from '../../components/modals/SegmentModal';
import AnimatedSummaryText from '../../components/profile/AnimatedSummaryText';
import { getArchetypeColor } from '../../constants/archetypeColors';
import { getArchetypeInfo, prepareChartData } from '../../services/aestheticScoringService';
import { composeLocalSummary } from '../../services/ai/localSummary';
import { getDetailedArchetypeInfo } from '../../services/archetypeDetailService';

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

  const [expandedArchetype, setExpandedArchetype] = useState(null);
  const [expandedQualities, setExpandedQualities] = useState({});
  const [expandedSections, setExpandedSections] = useState({});

  const toggleQuality = useCallback((archetypeKey, qualityIndex) => {
    const key = `${archetypeKey}-${qualityIndex}`;
    setExpandedQualities(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const toggleSection = useCallback((archetypeKey, sectionName) => {
    const key = `${archetypeKey}-${sectionName}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key]
    }));
  }, []);

  const isSectionExpanded = useCallback((archetypeKey, sectionName) => {
    const key = `${archetypeKey}-${sectionName}`;
    return expandedSections[key] !== false;
  }, [expandedSections]);

  const handleMoreInfoFromSegment = (segmentData) => {
    setSegmentModalVisible(false);
    const detailedInfo = getDetailedArchetypeInfo(segmentData.archetype);
    if (detailedInfo) {
      // Assuming we want to expand this archetype when clicked from segment
      if (expandedArchetype === segmentData.archetype) {
        setExpandedArchetype(null);
      } else {
        setExpandedArchetype(segmentData.archetype);
        console.log('[ProfileDetail] Expanding archetype from segment:', segmentData.archetype, detailedInfo);
      }
    }
  };

  const handleArchetypePress = (archetypeName) => {
    // Toggle expansion instead of modal
    if (expandedArchetype === archetypeName) {
      setExpandedArchetype(null);
    } else {
      setExpandedArchetype(archetypeName);
      const detailedInfo = getDetailedArchetypeInfo(archetypeName);
      console.log('[ProfileDetail] Expanding archetype:', archetypeName, detailedInfo);
    }
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
      setExpandedArchetype(targetArchetype);
      // setModalVisible(true); // Removed modal
      initialArchetypeRef.current = targetArchetype;
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

  const donutSize = 300;
  const centerOrbSize = 80;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>LOADING PROFILE...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <PassportBackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>AESTHETIC PROFILE</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>UNABLE TO LOAD PROFILE</Text>
          <TouchableOpacity onPress={loadUserProfile} style={styles.retryButton}>
            <Text style={styles.retryText}>RETRY</Text>
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
          colors={[theme.colors.background, "rgba(242,242,242,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.header}>
          <PassportBackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>AESTHETIC PROFILE</Text>
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
            tintColor={theme.colors.text}
            colors={[theme.colors.text]}
          />
        }
      >
        <View style={styles.chartSection}>
          <View style={[styles.donutWrapper, { width: donutSize, height: donutSize }]}>
            <ArchetypePieChart
              data={donutSlices}
              size={donutSize}
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
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>YOUR AESTHETIC PROFILE</Text>
            {summaryPending && (
              <View style={styles.summaryPendingRow}>
                <ActivityIndicator
                  size="small"
                  color={theme.colors.text}
                  style={styles.summarySpinner}
                />
                <Text style={styles.pendingLabel}>
                  {aiSummary?.placeholder
                    ? 'PERSONALIZING YOUR PROFILE...'
                    : 'REFRESHING SIGNALS...'}
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
                GENERATED {formatRelativeTime(summaryGeneratedAt).toUpperCase()}
              </Text>
            )}
            {suggestionPills.length > 0 && (
              <View style={styles.summarySuggestions}>
                {suggestionPills.slice(0, 6).map((label, index) => (
                  <View key={`${label}-${index}`} style={styles.suggestionPill}>
                    <Text style={styles.suggestionPillText}>{label.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Primary Archetype Section */}
        {primaryInfo && (
          <View style={styles.section}>
            <View style={[styles.archetypeCard, { borderLeftColor: primaryInfo.color }]}>
              <Text style={styles.sectionTitle}>PRIMARY ARCHETYPE</Text>
              <Text style={styles.archetypeName}>{primaryInfo.name.toUpperCase()}</Text>
              <Text style={styles.archetypeDescription}>{primaryInfo.description}</Text>
              <View style={styles.vibeContainer}>
                <Text style={styles.vibeTitle}>KEY CHARACTERISTICS:</Text>
                <View style={styles.vibeList}>
                  {primaryInfo.vibe.map((trait, index) => (
                    <View 
                      key={index} 
                      style={[styles.vibeTag, { backgroundColor: theme.colors.surface, borderColor: primaryInfo.color, borderWidth: 1 }]}
                    >
                      <Text style={[styles.vibeText, { color: theme.colors.text }]}>{trait.toUpperCase()}</Text>
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
            <View style={[styles.archetypeCard, { borderLeftColor: secondaryInfo.color }]}>
              <Text style={styles.sectionTitle}>SECONDARY ARCHETYPE</Text>
              <Text style={styles.archetypeName}>{secondaryInfo.name.toUpperCase()}</Text>
              <Text style={styles.archetypeDescription}>{secondaryInfo.description}</Text>
              <View style={styles.vibeContainer}>
                <Text style={styles.vibeTitle}>KEY CHARACTERISTICS:</Text>
                <View style={styles.vibeList}>
                  {secondaryInfo.vibe.slice(0, 4).map((trait, index) => (
                    <View 
                      key={index} 
                      style={[styles.vibeTag, { backgroundColor: theme.colors.surface, borderColor: secondaryInfo.color, borderWidth: 1 }]}
                    >
                      <Text style={[styles.vibeText, { color: theme.colors.text }]}>{trait.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Aesthetic Affinities */}
        <View style={styles.section}>
          <View style={styles.scoresContainer}>
            <Text style={styles.sectionTitle}>AESTHETIC AFFINITIES</Text>
            {chartData.map((item, index) => {
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
                      <Text style={styles.scoreName}>{item.name.toUpperCase()}</Text>
                    </View>
                    <View style={styles.scoreValues}>
                      <Text style={styles.scorePercentage}>{item.percentage}%</Text>
                      <Text style={styles.scorePoints}>({item.score} PTS)</Text>
                    </View>
                    <Ionicons 
                      name={expandedArchetype === item.archetype ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color={theme.colors.muted}
                      style={{ marginLeft: 12 }}
                    />
                  </TouchableOpacity>
                  
                  {hasInfrastructuralistSubtype && (
                    <TouchableOpacity 
                      style={[styles.scoreRow, styles.subtypeRow]}
                      onPress={() => handleArchetypePress('infrastructuralist')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.scoreInfo}>
                        <View style={styles.subtypeIndent} />
                        <View style={[styles.colorDot, styles.subtypeDot, { backgroundColor: getArchetypeColor('Infrastructuralist') }]} />
                        <Text style={[styles.scoreName, styles.subtypeName]}>THE INFRASTRUCTURALIST</Text>
                      </View>
                      <View style={styles.scoreValues}>
                        <Text style={[styles.scorePercentage, styles.subtypePercentage]}>
                          {Math.round((profile.archetype_scores.infrastructuralist / Object.values(profile.archetype_scores).reduce((sum, score) => sum + Math.max(0, score), 0)) * 100)}%
                        </Text>
                      </View>
                      <View style={{ width: 16, marginLeft: 12 }} />
                    </TouchableOpacity>
                  )}

                  {hasNaturalistSubtype && (
                    <TouchableOpacity 
                      style={[styles.scoreRow, styles.subtypeRow]}
                      onPress={() => handleArchetypePress('naturalist')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.scoreInfo}>
                        <View style={styles.subtypeIndent} />
                        <View style={[styles.colorDot, styles.subtypeDot, { backgroundColor: getArchetypeColor('Naturalist') }]} />
                        <Text style={[styles.scoreName, styles.subtypeName]}>THE NATURALIST</Text>
                      </View>
                      <View style={styles.scoreValues}>
                        <Text style={[styles.scorePercentage, styles.subtypePercentage]}>
                          {Math.round((profile.archetype_scores.naturalist / Object.values(profile.archetype_scores).reduce((sum, score) => sum + Math.max(0, score), 0)) * 100)}%
                        </Text>
                      </View>
                      <View style={{ width: 16, marginLeft: 12 }} />
                    </TouchableOpacity>
                  )}

                  {/* Expanded Content */}
                  {(expandedArchetype === item.archetype || 
                    (item.archetype === 'industrialist' && expandedArchetype === 'infrastructuralist') ||
                    (item.archetype === 'vernacularist' && expandedArchetype === 'naturalist')) && (
                    <View style={styles.expandedInfoContainer}>
                       {(() => {
                         const archetypeToShow = (expandedArchetype === 'infrastructuralist' && item.archetype === 'industrialist') 
                           ? 'infrastructuralist' 
                           : (expandedArchetype === 'naturalist' && item.archetype === 'vernacularist')
                           ? 'naturalist'
                           : item.archetype;
                         const info = getDetailedArchetypeInfo(archetypeToShow);
                         if (!info) return null;
                         return (
                           <View style={styles.expandedContent}>
                                                          {/* Section 1: Core Concept */}
                              <View style={styles.expandedSection}>
                                <TouchableOpacity 
                                  style={styles.expandedHeaderRow}
                                  onPress={() => toggleSection(archetypeToShow, 'coreConcept')}
                                  activeOpacity={0.7}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <View style={styles.expandedHeaderPill}>
                                    <Text style={styles.expandedHeaderPillText}>CORE CONCEPT</Text>
                                  </View>
                                  <View style={styles.expandedHeaderLine} />
                                  <Ionicons 
                                    name={isSectionExpanded(archetypeToShow, 'coreConcept') ? "chevron-up" : "chevron-down"} 
                                    size={14} 
                                    color={theme.colors.background}
                                    style={styles.sectionChevron}
                                  />
                                </TouchableOpacity>
                                {isSectionExpanded(archetypeToShow, 'coreConcept') && (
                                  <Text style={styles.expandedCoreConcept}>{info.coreConcept}</Text>
                                )}
                              </View>

                              {/* Section 2: Core Qualities */}
                              <View style={styles.expandedSection}>
                                <TouchableOpacity 
                                  style={styles.expandedHeaderRow}
                                  onPress={() => toggleSection(archetypeToShow, 'qualities')}
                                  activeOpacity={0.7}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <View style={styles.expandedHeaderPill}>
                                    <Text style={styles.expandedHeaderPillText}>QUALITIES</Text>
                                  </View>
                                  <View style={styles.expandedHeaderLine} />
                                  <Ionicons 
                                    name={isSectionExpanded(archetypeToShow, 'qualities') ? "chevron-up" : "chevron-down"} 
                                    size={14} 
                                    color={theme.colors.background}
                                    style={styles.sectionChevron}
                                  />
                                </TouchableOpacity>
                                {isSectionExpanded(archetypeToShow, 'qualities') && (
                                <View style={styles.expandedQualitiesContainer}>
                                  {info.coreQualities.map((quality, qIdx) => {
                                    const [title, ...descParts] = quality.split(':');
                                    const description = descParts.join(':').trim();
                                    const qualityKey = `${archetypeToShow}-${qIdx}`;
                                    const isExpanded = expandedQualities[qualityKey];
                                    
                                    return (
                                      <View key={qIdx} style={styles.qualityRow}>
                                        <TouchableOpacity 
                                          style={styles.qualityPillContainer}
                                          onPress={() => toggleQuality(archetypeToShow, qIdx)}
                                          activeOpacity={0.7}
                                        >
                                          <View style={styles.qualityPill}>
                                            <Text style={styles.qualityPillText}>{title.trim().toUpperCase()}</Text>
                                          </View>
                                          <Ionicons 
                                            name={isExpanded ? "chevron-up" : "chevron-down"} 
                                            size={14} 
                                            color={theme.colors.text}
                                            style={{ marginLeft: 8 }}
                                          />
                                        </TouchableOpacity>
                                        {description && isExpanded && (
                                          <Text style={styles.qualityDescription}>{description}</Text>
                                        )}
                                      </View>
                                    );
                                  })}
                                </View>
                                )}
                              </View>

                              {/* Section 3: Urban Expression */}
                              <View style={styles.expandedSection}>
                                <TouchableOpacity 
                                  style={styles.expandedHeaderRow}
                                  onPress={() => toggleSection(archetypeToShow, 'expression')}
                                  activeOpacity={0.7}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <View style={styles.expandedHeaderPill}>
                                    <Text style={styles.expandedHeaderPillText}>EXPRESSION</Text>
                                  </View>
                                  <View style={styles.expandedHeaderLine} />
                                  <Ionicons 
                                    name={isSectionExpanded(archetypeToShow, 'expression') ? "chevron-up" : "chevron-down"} 
                                    size={14} 
                                    color={theme.colors.background}
                                    style={styles.sectionChevron}
                                  />
                                </TouchableOpacity>
                                {isSectionExpanded(archetypeToShow, 'expression') && (
                                  <Text style={styles.expandedUrbanText}>{info.urbanExpression}</Text>
                                )}
                              </View>

                              {/* Section 4: Related Movements */}
                              {info.umbrellaMovements && info.umbrellaMovements.length > 0 && (
                                <View style={styles.expandedSection}>
                                  <TouchableOpacity 
                                    style={styles.expandedHeaderRow}
                                    onPress={() => toggleSection(archetypeToShow, 'related')}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                  >
                                    <View style={styles.expandedHeaderPill}>
                                      <Text style={styles.expandedHeaderPillText}>RELATED</Text>
                                    </View>
                                    <View style={styles.expandedHeaderLine} />
                                    <Ionicons 
                                      name={isSectionExpanded(archetypeToShow, 'related') ? "chevron-up" : "chevron-down"} 
                                      size={14} 
                                      color={theme.colors.background}
                                      style={styles.sectionChevron}
                                    />
                                  </TouchableOpacity>
                                  {isSectionExpanded(archetypeToShow, 'related') && (
                                    <View style={styles.expandedMovementsContainer}>
                                      {info.umbrellaMovements.map((movement, mIdx) => (
                                        <View key={mIdx} style={styles.movementPill}>
                                          <Text style={styles.movementPillText}>{movement.toUpperCase()}</Text>
                                        </View>
                                      ))}
                                    </View>
                                  )}
                                </View>
                              )}
                            </View>
                          );
                       })()}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>


      </ScrollView>

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
    backgroundColor: theme.colors.background,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 140,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.muted,
    fontFamily: 'Courier',
    letterSpacing: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.muted,
    marginBottom: 20,
    fontFamily: 'Courier',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 0,
  },
  retryText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  chartSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 0,
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
    zIndex: 10,
    elevation: 10,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoresContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  highlightedRow: {
    backgroundColor: theme.colors.background,
  },
  scoreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 0,
    marginRight: 12,
  },
  scoreName: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scoreValues: {
    alignItems: 'flex-end',
  },
  scorePercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: 'Courier',
  },
  scorePoints: {
    fontSize: 10,
    color: theme.colors.muted,
    fontFamily: 'Courier',
  },
  archetypeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    padding: 20,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  archetypeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
    letterSpacing: 1,
  },
  archetypeDescription: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: 'Courier',
  },
  vibeContainer: {
    marginTop: 8,
  },
  vibeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  vibeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vibeTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 0,
    marginBottom: 6,
  },
  vibeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    padding: 20,
    minHeight: 140,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  subtypeRow: {
    backgroundColor: theme.colors.background,
    marginLeft: 0,
  },
  subtypeIndent: {
    width: 0,
    height: 1,
  },
  subtypeDot: {
    width: 6,
    height: 6,
    borderRadius: 0,
  },
  subtypeName: {
    fontSize: 11,
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
  subtypePercentage: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  subtypePoints: {
    fontSize: 10,
    color: theme.colors.muted,
  },
  aiSummaryText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '500',
    fontFamily: 'Courier',
  },
  placeholderSummaryText: {
    color: theme.colors.muted,
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
    fontSize: 12,
    color: theme.colors.muted,
    fontFamily: 'Courier',
  },
  generatedAtText: {
    fontSize: 10,
    color: theme.colors.muted,
    marginTop: 8,
    fontStyle: 'italic',
    fontFamily: 'Courier',
  },
  summarySuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  suggestionPill: {
    backgroundColor: theme.colors.background,
    borderRadius: 0,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  suggestionPillText: {
    fontSize: 10,
    color: theme.colors.text,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  expandedInfoContainer: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 0,
  },
  expandedContent: {
    padding: 16,
    paddingTop: 24,
  },
  expandedSection: {
    marginBottom: 24,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandedHeaderPill: {
    backgroundColor: theme.colors.text,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  expandedHeaderPillText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Courier',
    letterSpacing: 1,
  },
  expandedHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  sectionChevron: {
    marginLeft: 8,
    backgroundColor: theme.colors.text,
    borderRadius: 10,
    padding: 2,
  },
  expandedCoreConcept: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  expandedQualitiesContainer: {
    gap: 12,
  },
  qualityRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  qualityPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  qualityPill: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.text,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  qualityPillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: 'Courier',
    letterSpacing: 0.5,
  },
  qualityDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.text,
    fontFamily: 'monospace',
    flex: 1,
    marginTop: 4,
    paddingLeft: 4,
  },
  expandedUrbanText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.text,
    fontFamily: 'monospace',
    paddingLeft: 4,
  },
  expandedMovementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 4,
  },
  movementPill: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.muted,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  movementPillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.muted,
    fontFamily: 'Courier',
    letterSpacing: 0.5,
  },
});

export default ProfileDetailScreen;
