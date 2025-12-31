import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { VerificationModal } from '../../components/verification/VerificationModal';
import { APP_COLORS } from "../../constants/appColors";
import {
    fetchBuildingContributions,
    fetchEditSuggestions as fetchEditSuggestionsFromService,
    verifyContribution,
    voteOnEditSuggestion,
    type BuildingContribution,
} from '../../services/contributionsService';

interface BuildingContributionSectionProps {
  buildingBIN: string;
  currentUserId: string;
}

// NO MODAL - using direct Supabase via contributionsService

export const BuildingContributionSection: React.FC<BuildingContributionSectionProps> = ({
  buildingBIN,
  currentUserId,
}) => {
  const [contributions, setContributions] = useState<BuildingContribution[]>([]);
  const [selectedContribution, setSelectedContribution] = useState<BuildingContribution | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);
  const [editSuggestions, setEditSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContributions = useCallback(async () => {
    try {
      const result = await fetchBuildingContributions(buildingBIN);
      
      if (result.success) {
        setContributions(result.contributions);
      } else {
        console.log('[ContributionSection] No contributions found for this building');
        setContributions([]);
      }
    } catch (err) {
      console.warn('[ContributionSection] Failed to fetch:', err);
      setContributions([]);
    } finally {
      setLoading(false);
    }
  }, [buildingBIN]);

  useEffect(() => {
    loadContributions();
  }, [loadContributions]);

  const handleVerify = async (
    contributionId: number,
    verificationType: 'verified' | 'disputed'
  ) => {
    try {
      const result = await verifyContribution(contributionId, currentUserId, verificationType);

      if (result.success) {
        Alert.alert(
          '✓ Verified!',
          `You earned ${result.xp_earned} XP for ${verificationType === 'verified' ? 'verifying' : 'disputing'} this contribution!`
        );

        // Refresh contributions
        await loadContributions();
      } else {
        Alert.alert('Error', result.error || 'You cannot verify your own contribution');
      }
    } catch (error) {
      console.error('Verification failed:', error);
      Alert.alert('Error', 'Failed to verify contribution');
    }
  };

  const handleSuggestEdit = async (contributionId: number) => {
    // Navigate to edit suggestion screen or show modal
    Alert.alert(
      'Suggest Edit',
      'This will open the edit suggestion form',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            // Navigate to EditSuggestionScreen or show EditSuggestionModal
            // navigation.navigate('EditSuggestion', { contributionId });
          }
        }
      ]
    );
  };

  const loadEditSuggestions = async (contributionId: number) => {
    try {
      const result = await fetchEditSuggestionsFromService(contributionId);

      if (result.success) {
        setEditSuggestions(result.suggestions);
        setShowEditSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to fetch edit suggestions:', error);
    }
  };

  const voteOnEdit = async (suggestionId: number, voteType: 'for' | 'against') => {
    try {
      const result = await voteOnEditSuggestion(suggestionId, currentUserId, voteType);

      if (result.success) {
        if (result.auto_accepted) {
          Alert.alert('✓ Edit Accepted!', 'This edit received enough community support and has been accepted!');
        } else {
          Alert.alert('Vote Recorded', `You earned ${result.xp_earned} XP!`);
        }

        // Refresh edit suggestions
        if (selectedContribution) {
          await loadEditSuggestions(selectedContribution.id);
        }
      }
    } catch (error) {
      console.error('Vote failed:', error);
      Alert.alert('Error', 'Failed to vote on edit');
    }
  };

  const getSourceIcon = (sourceType?: string) => {
    switch (sourceType) {
      case 'wikipedia': return '📖';
      case 'official': return '🏛️';
      case 'news': return '📰';
      default: return '🔗';
    }
  };

  if (loading) {
    return <Text style={styles.loadingText}>Loading contributions...</Text>;
  }

  if (contributions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No community contributions yet</Text>
        <Text style={styles.emptySubtext}>Be the first to contribute!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Community Contributions</Text>

      {contributions.map((contribution) => (
        <View key={contribution.id} style={styles.contributionCard}>
          {/* Verification Badge */}
          <View style={styles.header}>
            <VerificationBadge
              verifiedCount={contribution.verified_count}
              reliabilityScore={contribution.reliability_score}
              onPress={() => {
                setSelectedContribution(contribution);
                setShowVerificationModal(true);
              }}
            />

            {/* Edit Suggestions Badge */}
            <TouchableOpacity
              onPress={() => loadEditSuggestions(contribution.id)}
              style={styles.editBadge}
            >
              <Text style={styles.editBadgeText}>✏️ Suggest Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Contribution Data */}
          <View style={styles.data}>
            {contribution.address && (
              <DataRow label="Address" value={contribution.address} />
            )}
            {contribution.architect && (
              <DataRow label="Architect" value={contribution.architect} />
            )}
            {contribution.year_built && (
              <DataRow label="Year Built" value={contribution.year_built.toString()} />
            )}
            {contribution.style && (
              <DataRow label="Style" value={contribution.style} />
            )}
            {contribution.mat_prim && (
              <DataRow label="Primary Material" value={contribution.mat_prim} />
            )}
            {contribution.mat_secondary && (
              <DataRow label="Secondary Material" value={contribution.mat_secondary} />
            )}
            {contribution.mat_tertiary && (
              <DataRow label="Tertiary Material" value={contribution.mat_tertiary} />
            )}
            {contribution.notes && (
              <DataRow label="Notes" value={contribution.notes} />
            )}
          </View>

          {/* Source Citation */}
          {contribution.source_url && (
            <TouchableOpacity
              style={styles.sourceBadge}
              onPress={() => {
                // Open URL
                // Linking.openURL(contribution.source_url);
              }}
            >
              <Text style={styles.sourceIcon}>
                {getSourceIcon(contribution.source_type)}
              </Text>
              <Text style={styles.sourceText}>
                {contribution.source_description || 'View Source'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Action Buttons */}
          {contribution.user_id !== currentUserId && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={() => {
                  setSelectedContribution(contribution);
                  setShowVerificationModal(true);
                }}
              >
                <Text style={styles.verifyButtonText}>✓ Verify</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleSuggestEdit(contribution.id)}
              >
                <Text style={styles.editButtonText}>✏️ Suggest Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      {/* Verification Modal */}
      {selectedContribution && (
        <VerificationModal
          visible={showVerificationModal}
          contributionId={selectedContribution.id}
          buildingInfo={{
            address: selectedContribution.address,
            architect: selectedContribution.architect,
            yearBuilt: selectedContribution.year_built,
            style: selectedContribution.style,
            materials: [
              selectedContribution.mat_prim,
              selectedContribution.mat_secondary,
              selectedContribution.mat_tertiary,
            ].filter(Boolean) as string[],
          }}
          currentVerifiedCount={selectedContribution.verified_count}
          currentReliabilityScore={selectedContribution.reliability_score}
          onClose={() => setShowVerificationModal(false)}
          onVerify={handleVerify}
        />
      )}

      {/* Edit Suggestions Modal (simplified) */}
      {showEditSuggestions && (
        <View style={styles.editSuggestionsModal}>
          <Text style={styles.editSuggestionsTitle}>Pending Edits</Text>
          {editSuggestions.map((suggestion) => (
            <View key={suggestion.id} style={styles.suggestionCard}>
              <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
              <Text style={styles.suggestionVotes}>
                👍 {suggestion.votes_for} | 👎 {suggestion.votes_against}
              </Text>
              <View style={styles.voteButtons}>
                <TouchableOpacity
                  onPress={() => voteOnEdit(suggestion.id, 'for')}
                  style={styles.voteForButton}
                >
                  <Text style={styles.voteButtonText}>Vote For</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => voteOnEdit(suggestion.id, 'against')}
                  style={styles.voteAgainstButton}
                >
                  <Text style={styles.voteButtonText}>Vote Against</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity onPress={() => setShowEditSuggestions(false)}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const DataRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.dataRow}>
    <Text style={styles.dataLabel}>{label}:</Text>
    <Text style={styles.dataValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  contributionCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: APP_COLORS.accent + '20',
  },
  editBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: APP_COLORS.accent,
  },
  data: {
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
    width: 120,
  },
  dataValue: {
    fontSize: 14,
    color: APP_COLORS.text,
    flex: 1,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: APP_COLORS.background,
    borderRadius: 8,
    marginBottom: 12,
  },
  sourceIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  sourceText: {
    fontSize: 13,
    color: APP_COLORS.accent,
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  verifyButton: {
    flex: 1,
    padding: 12,
    backgroundColor: APP_COLORS.accent,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editButton: {
    flex: 1,
    padding: 12,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  loadingText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  editSuggestionsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: APP_COLORS.background,
    padding: 20,
  },
  editSuggestionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  suggestionCard: {
    backgroundColor: APP_COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  suggestionReason: {
    fontSize: 14,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  suggestionVotes: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginBottom: 12,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voteForButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#10b981',
    borderRadius: 8,
    alignItems: 'center',
  },
  voteAgainstButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  voteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.accent,
    textAlign: 'center',
    marginTop: 20,
  },
});
