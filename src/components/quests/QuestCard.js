import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTimeUntilMidnight, getTimeUntilMonday } from '../../utils/questTimers';

const QuestCard = ({
  type = 'daily', // 'daily' or 'weekly'
  title,
  description,
  xpReward,
  additionalRewards = [],
  progress = 0,
  total = 1,
  onPress,
  completed = false,
}) => {
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

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isDaily ? styles.dailyCard : styles.weeklyCard,
        completed && styles.completedCard,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={isDaily ? 'sunny' : 'calendar'}
            size={24}
            color={isDaily ? '#FF6B35' : '#4ECDC4'}
          />
          <Text style={[styles.questType, isDaily ? styles.dailyText : styles.weeklyText]}>
            {isDaily ? 'DAILY QUEST' : 'WEEKLY QUEST'}
          </Text>
        </View>
        <View style={styles.timerBadge}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.timerText}>{timeRemaining}</Text>
        </View>
      </View>

      {/* Title & Description */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {/* Progress Bar */}
      {!completed && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%` },
                isDaily ? styles.dailyProgress : styles.weeklyProgress,
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress} / {total}
          </Text>
        </View>
      )}

      {/* Rewards Section */}
      <View style={styles.rewardsContainer}>
        <View style={styles.rewardBadge}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.rewardText}>{xpReward} XP</Text>
        </View>

        {additionalRewards.map((reward, index) => (
          <View key={index} style={styles.rewardBadge}>
            <Ionicons name={reward.icon || 'gift'} size={16} color="#8E44AD" />
            <Text style={styles.rewardText}>{reward.label}</Text>
          </View>
        ))}
      </View>

      {/* Completed Badge */}
      {completed && (
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
          <Text style={styles.completedText}>COMPLETED</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
  },
  dailyCard: {
    borderColor: '#FF6B35',
  },
  weeklyCard: {
    borderColor: '#4ECDC4',
  },
  completedCard: {
    opacity: 0.7,
    borderColor: '#2ECC71',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questType: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginLeft: 8,
  },
  dailyText: {
    color: '#FF6B35',
  },
  weeklyText: {
    color: '#4ECDC4',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  dailyProgress: {
    backgroundColor: '#FF6B35',
  },
  weeklyProgress: {
    backgroundColor: '#4ECDC4',
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  rewardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginLeft: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: '#E8F8F5',
    borderRadius: 8,
  },
  completedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2ECC71',
    marginLeft: 6,
    letterSpacing: 1,
  },
});

export default QuestCard;
