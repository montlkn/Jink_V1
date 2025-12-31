import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from 'react-native';
import { FlipModal } from './FlipModal';
import { ModalCloseButton } from './ModalCloseButton';

type StreakMilestoneModalProps = {
  visible: boolean;
  streakCount: number;
  milestoneLevel: 3 | 7 | 30 | 100;
  newMultiplier: number;
  onClose: () => void;
};

export function StreakMilestoneModal({
  visible,
  streakCount,
  milestoneLevel,
  newMultiplier,
  onClose,
}: StreakMilestoneModalProps): JSX.Element {
  const flameColor = '#ff6b35'; // Fire orange
  const goldColor = '#FFD700'; // Gold for multiplier

  return (
    <FlipModal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {/* Header Badge */}
        <View style={[styles.badge, { backgroundColor: flameColor }]}>
          <Ionicons name="flame" size={16} color={theme.colors.background} style={styles.flameIcon} />
          <Text style={styles.badgeText}>STREAK MILESTONE</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Flame Icon */}
          <View style={styles.iconSection}>
            <Ionicons name="flame" size={64} color={flameColor} />
          </View>

          {/* Streak Count Display */}
          <View style={styles.streakSection}>
            <Text style={styles.streakNumber}>{streakCount}</Text>
            <Text style={styles.streakLabel}>DAYS</Text>
          </View>

          {/* Milestone Badge */}
          <View style={[styles.milestoneBadge, { borderColor: flameColor }]}>
            <Text style={[styles.milestoneText, { color: flameColor }]}>
              MILESTONE UNLOCKED: {milestoneLevel} DAY STREAK
            </Text>
          </View>

          {/* Multiplier Display */}
          <View style={[styles.multiplierSection, { backgroundColor: goldColor }]}>
            <Text style={styles.multiplierText}>
              {newMultiplier}X XP BONUS
            </Text>
          </View>

          {/* Description */}
          <Text style={styles.descriptionText}>
            {getMilestoneDescription(milestoneLevel)}
          </Text>
        </View>

        {/* Close Button */}
        <ModalCloseButton onPress={onClose} />
      </View>
    </FlipModal>
  );
}

function getMilestoneDescription(milestone: 3 | 7 | 30 | 100): string {
  switch (milestone) {
    case 3:
      return 'Building consistency...';
    case 7:
      return 'One week strong!';
    case 30:
      return 'Legendary dedication!';
    case 100:
      return 'Mythic achievement!';
    default:
      return 'Keep the streak alive!';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: '#ff6b35',
    borderRadius: 0, // Sharp corners
    padding: 24,
    minHeight: 340,
  },
  badge: {
    position: 'absolute',
    top: -12,
    left: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flameIcon: {
    marginRight: 6,
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.background,
    letterSpacing: 1.5,
  },
  content: {
    marginTop: 24,
    alignItems: 'center',
  },
  iconSection: {
    marginBottom: 16,
  },
  streakSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  streakNumber: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 64,
    fontWeight: '900',
    color: theme.colors.text,
    lineHeight: 64,
  },
  streakLabel: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.muted,
    letterSpacing: 3,
    marginTop: 4,
  },
  milestoneBadge: {
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  milestoneText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  multiplierSection: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginBottom: 16,
  },
  multiplierText: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.background,
    letterSpacing: 2,
  },
  descriptionText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 220,
  },
});
