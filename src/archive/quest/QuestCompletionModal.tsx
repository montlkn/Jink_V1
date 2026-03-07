import { APP_COLORS } from "@/constants/appColors";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from 'react-native';
import { FlipModal } from './FlipModal';
import { ModalCloseButton } from './ModalCloseButton';

type QuestCompletionModalProps = {
  visible: boolean;
  questTitle: string;
  questType: 'daily' | 'weekly';
  xpAwarded: number;
  onClose: () => void;
};

export function QuestCompletionModal({
  visible,
  questTitle,
  questType,
  xpAwarded,
  onClose,
}: QuestCompletionModalProps): JSX.Element {
  const questColor = questType === 'daily' ? APP_COLORS.daily : APP_COLORS.weekly;
  const questTypeLabel = questType === 'daily' ? 'DAILY QUEST' : 'WEEKLY QUEST';

  return (
    <FlipModal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {/* Header Badge */}
        <View style={[styles.badge, { backgroundColor: questColor }]}>
          <Ionicons name="checkmark-circle" size={16} color={theme.colors.background} style={styles.icon} />
          <Text style={styles.badgeText}>QUEST COMPLETE</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconSection}>
            <Ionicons name="trophy" size={56} color={questColor} />
          </View>

          {/* Quest Type Label */}
          <View style={[styles.typeLabel, { borderColor: questColor }]}>
            <Text style={[styles.typeLabelText, { color: questColor }]}>
              {questTypeLabel}
            </Text>
          </View>

          {/* Quest Title */}
          <Text style={styles.questTitle}>{questTitle}</Text>

          {/* XP Award */}
          <View style={styles.xpSection}>
            <Text style={styles.xpLabel}>XP EARNED</Text>
            <Text style={styles.xpAmount}>+{xpAwarded}</Text>
          </View>

          {/* Motivational Text */}
          <Text style={styles.motivationText}>
            {getMotivationalText(questType)}
          </Text>
        </View>

        {/* Close Button */}
        <ModalCloseButton onPress={onClose} />
      </View>
    </FlipModal>
  );
}

function getMotivationalText(questType: 'daily' | 'weekly'): string {
  if (questType === 'daily') {
    return 'Daily consistency builds expertise';
  } else {
    return 'Week complete. Your dedication shows.';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: 0, // Sharp corners
    padding: 24,
    minHeight: 320,
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
  icon: {
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
  typeLabel: {
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  typeLabelText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  questTitle: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 260,
    lineHeight: 22,
  },
  xpSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  xpLabel: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  xpAmount: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 36,
    fontWeight: '900',
    color: theme.colors.accent,
    lineHeight: 36,
  },
  motivationText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 220,
  },
});
