import { theme, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '@/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getTimeUntilMidnight, getTimeUntilMonday } from '../../utils/questTimers';

const QuestCard = ({
  type = 'daily', // 'daily' or 'weekly'
  title,
  description,
  epReward,
  xpReward, // backwards compatibility
  additionalRewards = [],
  progress = 0,
  total = 1,
  onPress,
  completed = false,
}) => {
  const reward = epReward || xpReward;
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const time = type === 'daily' ? getTimeUntilMidnight() : getTimeUntilMonday();
      setTimeRemaining(time.formatted);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [type]);

  const isDaily = type === 'daily';
  const progressPercent = (progress / total) * 100;
  const accentColor = isDaily ? theme.colors.primary : theme.colors.secondary;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: accentColor },
        completed && styles.completedCard,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: theme.colors.white }]}>
          <Ionicons
            name={isDaily ? 'sunny' : 'calendar'}
            size={10}
            color={accentColor}
          />
          <Text style={[styles.questType, { color: accentColor }]}>
            {isDaily ? 'DAILY QUEST' : 'WEEKLY QUEST'}
          </Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{timeRemaining}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        
        {/* Mission Directive / Actionable Text */}
        <View style={styles.directiveContainer}>
          <Text style={styles.directiveLabel}>MISSION DIRECTIVE:</Text>
          <Text style={styles.directiveText} numberOfLines={2}>
            {description || "COMPLETE THE OBJECTIVE TO EARN REWARDS."}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.rewardText}>{reward} XP</Text>
          <Text style={styles.progressText}>
            {progress}/{total}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      {!completed && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>
      )}

      {/* Completed Overlay */}
      {completed && (
        <View style={styles.completedOverlay}>
          <Ionicons name="checkmark-circle" size={24} color={theme.colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    // marginBottom: 8, // Removed to allow parent to control spacing via gap
    minHeight: 110,
    justifyContent: 'space-between',
    borderRadius: BORDER_RADIUS.xl,
  },
  completedCard: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.none,
    gap: SPACING.xs,
  },
  questType: {
    fontSize: TYPOGRAPHY.sizes.tiny,
    fontWeight: 'bold',
    letterSpacing: TYPOGRAPHY.letterSpacing.normal,
  },
  timerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.35)', // More visible dark background for timer
    borderRadius: 4,
  },
  timerText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: 'bold',
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.monospace,
  },
  content: {
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  directiveContainer: {
    marginBottom: SPACING.sm,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderLeftWidth: theme.layout.borderWidth.medium,
    borderLeftColor: theme.colors.white,
  },
  directiveLabel: {
    fontSize: TYPOGRAPHY.sizes.tiny,
    fontWeight: 'bold',
    letterSpacing: TYPOGRAPHY.letterSpacing.normal,
    marginBottom: 2,
    fontFamily: theme.typography.fontFamily.monospace,
    color: 'rgba(255,255,255,0.8)',
  },
  directiveText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.monospace,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: 'bold',
    fontFamily: theme.typography.fontFamily.monospace,
    color: theme.colors.white,
  },
  progressText: {
    fontSize: theme.typography.fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.white,
  },
  completedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', // Darken completed cards
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default QuestCard;
