import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { APP_COLORS } from '../../constants/appColors';

interface VerificationModalProps {
  visible: boolean;
  contributionId: number;
  buildingInfo: {
    address?: string;
    architect?: string;
    yearBuilt?: number;
    style?: string;
    materials?: string[];
  };
  currentVerifiedCount: number;
  currentReliabilityScore: number;
  onClose: () => void;
  onVerify: (contributionId: number, verificationType: 'verified' | 'disputed') => Promise<void>;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  visible,
  contributionId,
  buildingInfo,
  currentVerifiedCount,
  currentReliabilityScore,
  onClose,
  onVerify,
}) => {
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async (type: 'verified' | 'disputed') => {
    setVerifying(true);
    try {
      await onVerify(contributionId, type);
      onClose();
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>✓ Verify Contribution</Text>
              <Text style={styles.subtitle}>
                Help the community by verifying this building information
              </Text>
            </View>

            {/* Current Status */}
            <View style={styles.statusBanner}>
              <Text style={styles.statusText}>
                Current: {currentVerifiedCount} {currentVerifiedCount === 1 ? 'verification' : 'verifications'}
              </Text>
              <Text style={styles.scoreText}>
                {(currentReliabilityScore * 100).toFixed(0)}% reliability
              </Text>
            </View>

            {/* Building Info */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Contributed Information:</Text>

              {buildingInfo.address && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>{buildingInfo.address}</Text>
                </View>
              )}

              {buildingInfo.architect && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Architect:</Text>
                  <Text style={styles.infoValue}>{buildingInfo.architect}</Text>
                </View>
              )}

              {buildingInfo.yearBuilt && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Year Built:</Text>
                  <Text style={styles.infoValue}>{buildingInfo.yearBuilt}</Text>
                </View>
              )}

              {buildingInfo.style && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Style:</Text>
                  <Text style={styles.infoValue}>{buildingInfo.style}</Text>
                </View>
              )}

              {buildingInfo.materials && buildingInfo.materials.length > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Materials:</Text>
                  <Text style={styles.infoValue}>{buildingInfo.materials.join(', ')}</Text>
                </View>
              )}
            </View>

            {/* Rewards Preview */}
            <View style={styles.rewardsSection}>
              <Text style={styles.rewardsTitle}>You'll Earn:</Text>
              <Text style={styles.rewardItem}>✨ +5 XP for verifying</Text>
              <Text style={styles.rewardSubtext}>
                Help build a reliable database like Wikipedia!
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={verifying}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.verifyButton, verifying && styles.buttonDisabled]}
                onPress={() => handleVerify('verified')}
                disabled={verifying}
                activeOpacity={0.7}
              >
                {verifying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>✓ Verify</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Dispute Option */}
            <TouchableOpacity
              style={styles.disputeButton}
              onPress={() => handleVerify('disputed')}
              disabled={verifying}
              activeOpacity={0.7}
            >
              <Text style={styles.disputeButtonText}>
                ⚠ Information seems incorrect
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: APP_COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalContent: {
    padding: 24,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  statusBanner: {
    backgroundColor: APP_COLORS.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: APP_COLORS.text,
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 14,
    color: APP_COLORS.accent,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: APP_COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    fontWeight: '500',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: APP_COLORS.text,
    flex: 1,
  },
  rewardsSection: {
    backgroundColor: APP_COLORS.accent + '20',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  rewardItem: {
    fontSize: 14,
    color: APP_COLORS.accent,
    fontWeight: '600',
    marginBottom: 4,
  },
  rewardSubtext: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    fontStyle: 'italic',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
  },
  verifyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: APP_COLORS.accent,
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  disputeButton: {
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  disputeButtonText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
});
