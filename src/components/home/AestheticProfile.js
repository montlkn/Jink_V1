/*
  File: /src/components/home/AestheticProfile.js
  Description: A component for the Home Screen that displays the user's aesthetic profile pie chart.
*/
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUserAestheticProfile } from '../../api/quizApi';
import { useAuth } from '../../auth/authProvider';
import { generateProfileSummary, prepareChartData } from '../../services/aestheticScoringService';
import D3DonutChart from '../charts/D3DonutChart';
import SectionHeader from '../common/SectionHeader';

const AestheticProfile = ({ onNavigate, navigation }) => {
  const { session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserProfile();
  }, [session]);

  const loadUserProfile = async () => {
    if (!session?.user?.id) {
      console.log('No session user ID available');
      setLoading(false);
      return;
    }

    try {
      console.log('Loading aesthetic profile for user:', session.user.id);
      const userProfile = await getUserAestheticProfile(session.user.id);
      console.log('User profile loaded:', userProfile);
      setProfile(userProfile);
      setError(null);
    } catch (err) {
      console.error('Error loading aesthetic profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSegmentPress = () => {
    if (navigation) {
      navigation.navigate('ProfileDetail');
    } else if (onNavigate) {
      onNavigate();
    }
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
      // Show test chart data for debugging
      const testChartData = [
        { archetype: 'modernist', name: 'Modernist', score: 45, percentage: 45, color: '#FF6B6B', isPrimary: true, isSecondary: false },
        { archetype: 'classicist', name: 'Classicist', score: 30, percentage: 30, color: '#4ECDC4', isPrimary: false, isSecondary: true },
        { archetype: 'romantic', name: 'Romantic', score: 25, percentage: 25, color: '#45B7D1', isPrimary: false, isSecondary: false }
      ];
      
      return (
        <View style={styles.profileContent}>
          <Text style={styles.noProfileText}>Complete the quiz to see your aesthetic profile</Text>
          <Text style={styles.testText}>Showing test chart for debugging:</Text>
          <D3DonutChart 
            data={testChartData}
            size={180}
            strokeWidth={22}
            onSegmentPress={handleSegmentPress}
          />
        </View>
      );
    }

    const chartData = prepareChartData(
      profile.archetype_scores, 
      profile.primary_archetype, 
      profile.secondary_archetype
    );
    console.log('Chart data prepared:', chartData);

    const summary = generateProfileSummary({
      primaryArchetype: profile.primary_archetype,
      secondaryArchetype: profile.secondary_archetype,
      confidenceScore: profile.response_confidence_score || 0.5,
      separationScore: 0.5
    });

    return (
      <View style={styles.profileContent}>
        <D3DonutChart 
          data={chartData}
          size={180}
          strokeWidth={22}
          onSegmentPress={handleSegmentPress}
        />
        <View style={styles.profileSummary}>
          <Text style={styles.primaryArchetype}>
            {summary?.title || profile.primary_archetype}
          </Text>
          {summary?.secondaryArchetype && (
            <Text style={styles.secondaryArchetype}>
              with {summary.secondaryArchetype.name} influences
            </Text>
          )}
          <Text style={styles.confidenceText}>
            Confidence: {summary?.confidenceLevel || 'Medium'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SectionHeader title="Aesthetic Profile" onSeeAll={handleSegmentPress} />
      {renderProfileContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
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
  testText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});

export default AestheticProfile;