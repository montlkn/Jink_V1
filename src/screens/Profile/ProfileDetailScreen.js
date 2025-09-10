
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import D3DonutChart from '../../components/charts/D3DonutChart';
import { getUserAestheticProfile } from '../../api/quizApi';
import { prepareChartData, generateProfileSummary, getArchetypeInfo } from '../../services/aestheticScoringService';
import { useAuth } from '../../auth/authProvider';

const ProfileDetailScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedArchetype, setHighlightedArchetype] = useState(null);
  const scrollViewRef = useRef();

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
      console.error('Error loading profile detail:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSegmentPress = (segment) => {
    setHighlightedArchetype(segment.archetype);
    // Add scroll to logic if needed
  };

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

  const chartData = prepareChartData(
    profile.archetype_scores,
    profile.primary_archetype,
    profile.secondary_archetype
  );

  const summary = generateProfileSummary({
    primaryArchetype: profile.primary_archetype,
    secondaryArchetype: profile.secondary_archetype,
    confidenceScore: profile.response_confidence_score || 0.5,
    separationScore: 0.5,
  });

  const primaryInfo = getArchetypeInfo(profile.primary_archetype);
  const secondaryInfo = profile.secondary_archetype 
    ? getArchetypeInfo(profile.secondary_archetype) 
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aesthetic Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.chartSection}>
          <D3DonutChart
            data={chartData}
            size={220}
            strokeWidth={30}
            onSegmentPress={handleSegmentPress}
          />
        </View>

        {/* Archetype sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aesthetic Affinities</Text>
          <View style={styles.scoresContainer}>
            {chartData.map((item, index) => (
              <View key={index} style={[styles.scoreRow, highlightedArchetype === item.archetype && styles.highlightedRow]}>
                <View style={styles.scoreInfo}>
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <Text style={styles.scoreName}>{item.name}</Text>
                </View>
                <View style={styles.scoreValues}>
                  <Text style={styles.scorePercentage}>{item.percentage}%</Text>
                  <Text style={styles.scorePoints}>({item.score} pts)</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Other sections... */}

      </ScrollView>
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
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollView: {
    flex: 1,
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
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
});

export default ProfileDetailScreen;
