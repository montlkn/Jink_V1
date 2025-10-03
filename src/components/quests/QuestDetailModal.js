import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const QuestDetailModal = ({
  visible,
  onClose,
  quest,
  onStartQuest,
  timeRemaining,
}) => {
  if (!quest) return null;

  const isDaily = quest.type === 'daily';

  // Determine destination based on quest type
  const getQuestDestination = () => {
    if (quest.questType === 'scan') {
      return { screen: 'Camera', label: 'SCAN NOW' };
    } else if (quest.questType === 'walk') {
      return { screen: 'Derive', label: "LET'S GO" };
    }
    return { screen: 'Derive', label: "LET'S GO" }; // Default
  };

  const destination = getQuestDestination();

  const onGestureEvent = (event) => {
    const { translationY, velocityY } = event.nativeEvent;

    // Close modal if swiped down significantly or with high velocity
    if (translationY > 100 || (velocityY > 500 && translationY > 50)) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

          <PanGestureHandler onGestureEvent={onGestureEvent}>
            <View style={styles.modalContainer}>
              {/* Header with integrated swipe indicator */}
              <View style={[styles.modalHeader, isDaily ? styles.dailyHeader : styles.weeklyHeader]}>
                {/* Swipe indicator */}
                <View style={styles.swipeIndicator} />

                <View style={styles.headerTop}>
                  <View style={styles.questTypeBadge}>
                    <Ionicons
                      name={isDaily ? 'sunny' : 'calendar'}
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.questTypeText}>
                      {isDaily ? 'DAILY QUEST' : 'WEEKLY QUEST'}
                    </Text>
                  </View>
                </View>

            <Text style={styles.modalTitle}>{quest.title}</Text>

            {/* Timer */}
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={18} color="#fff" />
              <Text style={styles.timerText}>Resets in {timeRemaining}</Text>
            </View>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Quest Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>OBJECTIVE</Text>
              <Text style={styles.description}>{quest.description}</Text>
            </View>

            {/* Progress */}
            {!quest.completed && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PROGRESS</Text>
                <View style={styles.progressDisplay}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${(quest.progress / quest.total) * 100}%` },
                        isDaily ? styles.dailyProgress : styles.weeklyProgress,
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {quest.progress} / {quest.total} completed
                  </Text>
                </View>
              </View>
            )}

            {/* Rewards */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>REWARDS</Text>

              {/* XP Reward */}
              <View style={styles.rewardItem}>
                <View style={styles.rewardIcon}>
                  <Ionicons name="star" size={24} color="#FFD700" />
                </View>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardLabel}>Experience Points</Text>
                  <Text style={styles.rewardValue}>{quest.xpReward} XP</Text>
                  <Text style={styles.rewardDescription}>
                    Unlock premium features like detailed building info
                  </Text>
                </View>
              </View>

              {/* Additional Rewards */}
              {quest.additionalRewards?.map((reward, index) => (
                <View key={index} style={styles.rewardItem}>
                  <View style={styles.rewardIcon}>
                    <Ionicons
                      name={reward.icon}
                      size={24}
                      color={reward.type === 'stamp' ? '#E74C3C' : '#9B59B6'}
                    />
                  </View>
                  <View style={styles.rewardInfo}>
                    <Text style={styles.rewardLabel}>
                      {reward.type === 'stamp' ? 'Passport Stamp' : 'Achievement'}
                    </Text>
                    <Text style={styles.rewardValue}>{reward.label}</Text>
                    {reward.type === 'stamp' && (
                      <Text style={styles.rewardDescription}>
                        Add to your passport collection
                      </Text>
                    )}
                    {reward.type === 'achievement' && (
                      <Text style={styles.rewardDescription}>
                        Display on your profile
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* XP Benefits Explainer */}
            <View style={[styles.section, styles.xpBenefitsSection]}>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3498DB" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>What can you do with XP?</Text>
                  <Text style={styles.infoText}>
                    • Unlock detailed building histories (Free tier){'\n'}
                    • Access expert architectural analysis{'\n'}
                    • Earn bonus stamps and achievements{'\n'}
                    • Pro users: Boost your leaderboard ranking
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.startButton, isDaily ? styles.dailyButton : styles.weeklyButton]}
              onPress={() => {
                onStartQuest(destination.screen);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>{destination.label}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
          </PanGestureHandler>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    overflow: 'hidden',
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dailyHeader: {
    backgroundColor: '#FF6B35',
  },
  weeklyHeader: {
    backgroundColor: '#4ECDC4',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  questTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  questTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888',
    letterSpacing: 1,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  progressDisplay: {
    marginTop: 8,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  dailyProgress: {
    backgroundColor: '#FF6B35',
  },
  weeklyProgress: {
    backgroundColor: '#4ECDC4',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  rewardItem: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    marginBottom: 2,
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  xpBenefitsSection: {
    marginBottom: 100,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498DB',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#555',
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  dailyButton: {
    backgroundColor: '#FF6B35',
  },
  weeklyButton: {
    backgroundColor: '#4ECDC4',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
    letterSpacing: 1,
  },
});

export default QuestDetailModal;
