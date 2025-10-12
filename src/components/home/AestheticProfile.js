/*
  File: /src/components/home/AestheticProfile.js
  Description: Home screen aura that visualizes a user's aesthetic profile.
*/
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUserAestheticProfile } from '../../api/quizApi';
import { useAuth } from '../../auth/authProvider';
import { getDetailedArchetypeInfo } from '../../services/archetypeDetailService';
// Switch to shader-based liquid aura (metaball-like blending)
import ArchetypeOrb from '../ArchetypeOrb';
import AuraBreakdownModal from '../modals/AuraBreakdownModal';
import ArchetypeDetailModal from '../modals/ArchetypeDetailModal';

const FALLBACK_ORB_DATA = [
  { name: 'Romantic', percentage: 0.36 },
  { name: 'Modernist', percentage: 0.32 },
  { name: 'Classicist', percentage: 0.28 },
];

const formatDisplayName = (key) =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const AestheticProfile = ({ onNavigate, navigation }) => {
  const { session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDetailArchetype, setSelectedDetailArchetype] = useState(null);

  const loadUserProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const userProfile = await getUserAestheticProfile(session.user.id);
      setProfile(userProfile);
      setError(null);
    } catch (err) {
      console.error('Error loading aesthetic profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const { topSegments, orbArchetypeData, hasScores } = useMemo(() => {
    if (!profile?.archetype_scores) {
      return { topSegments: [], orbArchetypeData: [], hasScores: false };
    }

    const entries = Object.entries(profile.archetype_scores).filter(
      ([, value]) => typeof value === 'number' && value > 0
    );

    if (!entries.length) {
      return { topSegments: [], orbArchetypeData: [], hasScores: false };
    }

    const total = entries.reduce((sum, [, value]) => sum + Math.max(0, value), 0);

    const segments = entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key, rawScore]) => {
        const detail = getDetailedArchetypeInfo(key) || {};
        return {
          archetype: key,
          name: detail?.name || formatDisplayName(key),
          color: detail?.color || '#666666',
          percentage: total ? Math.round((Math.max(0, rawScore) / total) * 100) : 0,
          score: Math.round(rawScore),
        };
      });

    const orbData = entries.map(([key, rawScore]) => ({
      name: key,
      percentage: Math.max(0, rawScore),
    }));

    return { topSegments: segments, orbArchetypeData: orbData, hasScores: true };
  }, [profile?.archetype_scores]);

  const hasProfileData = hasScores && !!profile?.archetype_scores;
  const resolvedOrbData = hasProfileData ? orbArchetypeData : FALLBACK_ORB_DATA;

  const navigateToProfileDetail = () => {
    if (navigation) {
      navigation.navigate('ProfileDetail');
    } else if (onNavigate) {
      onNavigate();
    }
  };

  const handleAuraPress = () => {
    if (topSegments.length) {
      setSummaryVisible(true);
    } else {
      navigateToProfileDetail();
    }
  };

  const handleCloseSummary = () => {
    setSummaryVisible(false);
  };

  const handleMoreInfo = (archetypeData) => {
    setSummaryVisible(false);

    const detailedInfo = getDetailedArchetypeInfo(archetypeData.archetype);
    if (detailedInfo) {
      setSelectedDetailArchetype({
        ...detailedInfo,
        score: archetypeData.score,
        percentage: archetypeData.percentage,
      });
      setDetailModalVisible(true);
    }
  };

  const handleSelectBreakdownItem = (segment) => {
    if (!segment) return;
    handleMoreInfo({
      archetype: segment.archetype,
      score: segment.score,
      percentage: segment.percentage,
    });
  };

  const handleCloseDetailModal = () => {
    setDetailModalVisible(false);
    setTimeout(() => {
      setSelectedDetailArchetype(null);
    }, 100);
  };

  const renderProfileContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      );
    }

    const showError = Boolean(error);
    const showFallback = !hasProfileData;

    return (
      <View style={styles.auraWrapper}>
        <ArchetypeOrb
          archetypeData={resolvedOrbData}
          size={220}
          quality="high"
          onPress={handleAuraPress}
          style={styles.orb}
        />

        {showError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unable to load profile</Text>
            <TouchableOpacity onPress={loadUserProfile} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : showFallback ? (
          <View style={styles.noProfileContainer}>
            <Text style={styles.noProfileText}>Complete the quiz to unlock your aesthetic profile.</Text>
            <TouchableOpacity onPress={navigateToProfileDetail} style={styles.fallbackButton}>
              <Text style={styles.fallbackButtonText}>Start Quiz</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <View style={styles.container}>{renderProfileContent()}</View>

      <AuraBreakdownModal
        visible={summaryVisible}
        segments={topSegments}
        onClose={handleCloseSummary}
        onSelectSegment={handleSelectBreakdownItem}
        onViewProfile={navigateToProfileDetail}
      />

      <ArchetypeDetailModal
        visible={detailModalVisible}
        archetype={selectedDetailArchetype}
        onClose={handleCloseDetailModal}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  auraWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  orb: {
    marginVertical: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#444',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  errorText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#000',
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  noProfileContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  noProfileText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  fallbackButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#000',
  },
  fallbackButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default AestheticProfile;
