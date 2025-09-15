/*
  File: /src/components/home/AestheticProfile.js
  Description: A component for the Home Screen that displays the user's aesthetic profile pie chart.
*/
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUserAestheticProfile } from '../../api/quizApi';
import { useAuth } from '../../auth/authProvider';
import { generateProfileSummary, prepareChartData, getArchetypeInfo } from '../../services/aestheticScoringService';
import { getDetailedArchetypeInfo } from '../../services/archetypeDetailService';
import DonutChart from '../charts/DonutChart';
import SectionHeader from '../common/SectionHeader';
import SegmentModal from '../modals/SegmentModal';
import ArchetypeDetailModal from '../modals/ArchetypeDetailModal';

const AestheticProfile = ({ onNavigate, navigation }) => {
  const { session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDetailArchetype, setSelectedDetailArchetype] = useState(null);

  useEffect(() => {
    loadUserProfile();
  }, [session]);

  const loadUserProfile = async () => {
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
  };

  const handleSegmentPress = (archetypeData) => {
    if (archetypeData) {
      // Handle individual segment press - show simple modal
      setSelectedArchetype(archetypeData);
      setModalVisible(true);
    } else {
      // Handle "see all" press - navigate to profile detail
      if (navigation) {
        navigation.navigate('ProfileDetail');
      } else if (onNavigate) {
        onNavigate();
      }
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    // Add a small delay to prevent state conflicts
    setTimeout(() => {
      setSelectedArchetype(null);
    }, 100);
  };

  const handleMoreInfo = (archetypeData) => {
    // Close segment modal first
    setModalVisible(false);

    // Get the detailed archetype info with all required properties
    const detailedInfo = getDetailedArchetypeInfo(archetypeData.archetype);
    if (detailedInfo) {
      setSelectedDetailArchetype({
        ...detailedInfo,
        score: archetypeData.score,
        percentage: archetypeData.percentage
      });
      setDetailModalVisible(true);
    }
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

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load profile</Text>
          <TouchableOpacity onPress={loadUserProfile} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!profile || !profile.archetype_scores) {
      return (
        <View style={styles.noProfileContainer}>
          <Text style={styles.noProfileText}>Complete the quiz to see your aesthetic profile</Text>
        </View>
      );
    }

    const chartData = prepareChartData(
      profile.archetype_scores, 
      profile.primary_archetype, 
      profile.secondary_archetype
    );

    const summary = generateProfileSummary({
      primaryArchetype: profile.primary_archetype,
      secondaryArchetype: profile.secondary_archetype,
      confidenceScore: profile.response_confidence_score || 0.5,
      separationScore: 0.5
    });

    const centerText = {
      primary: summary?.title || profile.primary_archetype,
      secondary: summary?.secondaryArchetype?.name,
      confidence: summary?.confidenceLevel || 'Medium'
    };

    return (
      <View style={styles.profileContent}>
        <DonutChart
          data={chartData}
          size={380}
          strokeWidth={30}
          onSegmentPress={handleSegmentPress}
          centerText={centerText}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SectionHeader title="Aesthetic Profile" onSeeAll={() => handleSegmentPress()} />
      {renderProfileContent()}

      <SegmentModal
        visible={modalVisible}
        segment={selectedArchetype}
        onClose={handleCloseModal}
        onMoreInfo={handleMoreInfo}
      />

      <ArchetypeDetailModal
        visible={detailModalVisible}
        archetype={selectedDetailArchetype}
        onClose={handleCloseDetailModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  profileContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileSummary: {
    marginTop: 20,
    alignItems: 'center',
  },
  primaryArchetype: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  secondaryArchetype: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#000',
    borderRadius: 16,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  noProfileContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noProfileText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default AestheticProfile;