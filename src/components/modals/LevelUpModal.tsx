import { getTierColor } from "@/constants/xpLevels";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { StyleSheet, Text, View } from 'react-native';
import { FlipModal } from './FlipModal';
import { ModalCloseButton } from './ModalCloseButton';

type LevelUpModalProps = {
  visible: boolean;
  oldLevel: number;
  newLevel: number;
  newTitle: string;
  tier: 'explorer' | 'connoisseur' | 'authority' | 'mythic';
  onClose: () => void;
};

export function LevelUpModal({
  visible,
  oldLevel,
  newLevel,
  newTitle,
  tier,
  onClose,
}: LevelUpModalProps): JSX.Element {
  const tierColor = getTierColor(tier);

  return (
    <FlipModal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {/* Header Badge */}
        <View style={[styles.badge, { backgroundColor: tierColor }]}>
          <Text style={styles.badgeText}>LEVEL UP</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Level Display */}
          <View style={styles.levelSection}>
            <Text style={styles.levelLabel}>LEVEL</Text>
            <Text style={styles.levelNumber}>{newLevel}</Text>
          </View>

          {/* Title Display */}
          <View style={styles.titleSection}>
            <Text style={[styles.titleText, { color: tierColor }]}>
              {newTitle.toUpperCase()}
            </Text>
          </View>

          {/* Tier Badge */}
          <View style={[styles.tierBadge, { borderColor: tierColor }]}>
            <Text style={[styles.tierText, { color: tierColor }]}>
              {tier.toUpperCase()}
            </Text>
          </View>

          {/* Motivational Text */}
          <Text style={styles.motivationText}>
            {getTierMotivation(tier)}
          </Text>
        </View>

        {/* Close Button */}
        <ModalCloseButton onPress={onClose} />
      </View>
    </FlipModal>
  );
}

function getTierMotivation(tier: 'explorer' | 'connoisseur' | 'authority' | 'mythic'): string {
  switch (tier) {
    case 'explorer':
      return 'Discovering the architectural landscape';
    case 'connoisseur':
      return 'Developing a refined architectural eye';
    case 'authority':
      return 'Mastering the built environment';
    case 'mythic':
      return 'Legendary architectural expertise';
    default:
      return 'Keep exploring';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: 0, // Sharp corners for Designer Republic aesthetic
    padding: 24,
    minHeight: 300,
  },
  badge: {
    position: 'absolute',
    top: -12,
    left: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 0,
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.background,
    letterSpacing: 2,
  },
  content: {
    marginTop: 16,
    alignItems: 'center',
  },
  levelSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  levelLabel: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 12,
    color: theme.colors.muted,
    letterSpacing: 3,
    marginBottom: 4,
  },
  levelNumber: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 72,
    fontWeight: '900',
    color: theme.colors.text,
    lineHeight: 72,
  },
  titleSection: {
    marginBottom: 16,
  },
  titleText: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
  },
  tierBadge: {
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 20,
  },
  tierText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  motivationText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 240,
  },
});
