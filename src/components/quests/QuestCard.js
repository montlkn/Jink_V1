import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
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
        <View style={[styles.badge, { backgroundColor: '#FFFFFF' }]}>
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
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 12,
    // marginBottom: 8, // Removed to allow parent to control spacing via gap
    minHeight: 110,
    justifyContent: 'space-between',
    borderRadius: 12,
  },
  completedCard: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
    gap: 4,
  },
  questType: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  timerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.2)', // Slight dark background for timer
  },
  timerText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Courier',
  },
  content: {
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  directiveContainer: {
    marginBottom: 8,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderLeftWidth: 2,
    borderLeftColor: '#FFFFFF',
  },
  directiveLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 2,
    fontFamily: 'Courier',
    color: 'rgba(255,255,255,0.8)',
  },
  directiveText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Courier',
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Courier',
    color: '#FFFFFF',
  },
  progressText: {
    fontSize: 10,
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
    backgroundColor: '#FFFFFF',
  },
  completedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', // Darken completed cards
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default QuestCard;
