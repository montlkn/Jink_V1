import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { APP_COLORS } from "../../constants/appColors";

interface NotHerePromptProps {
  onContribute: () => void;
  onCancel: () => void;
  onAddPhoto?: () => void; // New: just add photo without metadata
}

export const NotHerePrompt: React.FC<NotHerePromptProps> = ({
  onContribute,
  onCancel,
  onAddPhoto,
}) => {
  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.promptContainer} pointerEvents="auto">
          <Text style={styles.emoji}>🤔</Text>
          <Text style={styles.title}>Building not found</Text>
          <Text style={styles.message}>
            We couldn't identify this building yet.{'\n'}
            Help us improve by contributing!
          </Text>

          <View style={styles.optionsContainer}>
            {/* Full contribution option */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => {
                console.log('[NotHerePrompt] Add Building Info pressed');
                onContribute();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>📝</Text>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Add Building Info</Text>
                <Text style={styles.optionDesc}>Address, architect, style & more</Text>
                <View style={styles.xpBadge}>
                  <Text style={styles.xpText}>+30-45 XP</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Photo-only contribution option */}
            {onAddPhoto && (
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => {
                  console.log('[NotHerePrompt] Just Add Photo pressed');
                  onAddPhoto();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.optionEmoji}>📸</Text>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Just Add Photo</Text>
                  <Text style={styles.optionDesc}>Quick! Helps train our AI</Text>
                  <View style={[styles.xpBadge, styles.xpBadgeSmall]}>
                    <Text style={styles.xpText}>+10 XP</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.rewards}>
            <Text style={styles.rewardsTitle}>Earn badges:</Text>
            <Text style={styles.rewardItem}>🏆 Pioneer Stamp</Text>
            <Text style={styles.rewardItem}>📍 Data Validator Stamp</Text>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              console.log('[NotHerePrompt] Cancel pressed');
              onCancel();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>

          <Text style={styles.footnote}>
            Your photos help future users find this building!
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  promptContainer: {
    backgroundColor: APP_COLORS.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    alignItems: 'center',
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginBottom: 6,
  },
  xpBadge: {
    backgroundColor: APP_COLORS.accent + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  xpBadgeSmall: {
    backgroundColor: '#10b981' + '20',
  },
  xpText: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_COLORS.accent,
  },
  rewards: {
    backgroundColor: APP_COLORS.surface,
    padding: 12,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
    gap: 4,
  },
  rewardsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  rewardItem: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  cancelButton: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
  },
  footnote: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
