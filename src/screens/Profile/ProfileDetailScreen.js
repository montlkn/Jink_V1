
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getUserAestheticProfile } from '../../api/quizApi';
import { useAuth } from '../../auth/authProvider';
import D3DonutChart from '../../components/charts/D3DonutChart';
import { generateProfileSummary, getArchetypeInfo, prepareChartData } from '../../services/aestheticScoringService';

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

      <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.chartSection}>
          <D3DonutChart
            data={chartData}
            size={220}
            strokeWidth={30}
            onSegmentPress={handleSegmentPress}
          />
        </View>

        {/* Profile Summary Section */}
        {summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Summary</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{summary.title}</Text>
              {summary.secondaryArchetype && (
                <Text style={styles.summarySecondary}>
                  with {summary.secondaryArchetype.name} influences
                </Text>
              )}
              <View style={styles.summaryStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Confidence Level</Text>
                  <Text style={styles.statValue}>{summary.confidenceLevel}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Profile Distinctiveness</Text>
                  <Text style={styles.statValue}>{summary.distinctiveness}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

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
                  <View style={[styles.scoreRow, highlightedArchetype === item.archetype && styles.highlightedRow]}>
                    <View style={styles.scoreInfo}>
                      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                      <Text style={styles.scoreName}>{item.name}</Text>
                    </View>
                    <View style={styles.scoreValues}>
                      <Text style={styles.scorePercentage}>{item.percentage}%</Text>
                      <Text style={styles.scorePoints}>({item.score} pts)</Text>
                    </View>
                  </View>
                  
                  {/* Show infrastructuralist subtype if applicable */}
                  {hasInfrastructuralistSubtype && (
                    <View style={[styles.scoreRow, styles.subtypeRow]}>
                      <View style={styles.scoreInfo}>
                        <View style={styles.subtypeIndent} />
                        <View style={[styles.colorDot, styles.subtypeDot, { backgroundColor: '#4682B4' }]} />
                        <Text style={[styles.scoreName, styles.subtypeName]}>The Infrastructuralist</Text>
                      </View>
                      <View style={styles.scoreValues}>
                        <Text style={[styles.scorePercentage, styles.subtypePercentage]}>
                          {Math.round((profile.archetype_scores.infrastructuralist / Object.values(profile.archetype_scores).reduce((sum, score) => sum + Math.max(0, score), 0)) * 100)}%
                        </Text>
                        <Text style={[styles.scorePoints, styles.subtypePoints]}>({profile.archetype_scores.infrastructuralist} pts)</Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Show naturalist subtype if applicable */}
                  {hasNaturalistSubtype && (
                    <View style={[styles.scoreRow, styles.subtypeRow]}>
                      <View style={styles.scoreInfo}>
                        <View style={styles.subtypeIndent} />
                        <View style={[styles.colorDot, styles.subtypeDot, { backgroundColor: '#8FBC8F' }]} />
                        <Text style={[styles.scoreName, styles.subtypeName]}>The Naturalist</Text>
                      </View>
                      <View style={styles.scoreValues}>
                        <Text style={[styles.scorePercentage, styles.subtypePercentage]}>
                          {Math.round((profile.archetype_scores.naturalist / Object.values(profile.archetype_scores).reduce((sum, score) => sum + Math.max(0, score), 0)) * 100)}%
                        </Text>
                        <Text style={[styles.scorePoints, styles.subtypePoints]}>({profile.archetype_scores.naturalist} pts)</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

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
  scrollContent: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
  },
  summarySecondary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
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
});

export default ProfileDetailScreen;
