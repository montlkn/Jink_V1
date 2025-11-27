import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
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
  const accentColor = isDaily ? theme.colors.primary : theme.colors.secondary;

  // Determine destination based on quest type
  const getQuestDestination = () => {
    if (quest.questType === 'scan') {
      return { params: { focus: 'scan' }, label: 'SCAN NOW' };
    } else if (quest.questType === 'walk') {
      return { params: { focus: 'walk' }, label: "LET'S GO" };
    }
    return { params: undefined, label: "LET'S GO" }; // Default
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
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />

          <PanGestureHandler onGestureEvent={onGestureEvent}>
            <View style={[styles.modalContainer, { borderColor: accentColor }]}>
              {/* Header with integrated swipe indicator */}
              <View style={[styles.modalHeader, { backgroundColor: accentColor }]}>
                {/* Swipe indicator */}
                <View style={styles.swipeIndicator} />

                <View style={styles.headerTop}>
                  <View style={styles.questTypeBadge}>
                    <Ionicons
                      name={isDaily ? 'sunny' : 'calendar'}
                      size={14}
                      color={theme.colors.surface}
                    />
                    <Text style={styles.questTypeText}>
                      {isDaily ? 'DAILY QUEST' : 'WEEKLY QUEST'}
                    </Text>
                  </View>
                </View>

            <Text style={styles.modalTitle}>{quest.title}</Text>

            {/* Timer */}
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={14} color={theme.colors.surface} />
              <Text style={styles.timerText}>RESETS IN {timeRemaining}</Text>
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
                        { width: `${(quest.progress / quest.total) * 100}%`, backgroundColor: accentColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {quest.progress} / {quest.total} COMPLETED
                  </Text>
                </View>
              </View>
            )}

            {/* Rewards */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>REWARDS</Text>

              {/* XP Reward */}
              <View style={styles.rewardItem}>
                <View style={[styles.rewardIcon, { borderColor: accentColor }]}>
                  <Ionicons name="star" size={16} color={accentColor} />
                </View>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardLabel}>EXPERIENCE</Text>
                  <Text style={styles.rewardValue}>{quest.xpReward || quest.epReward} XP</Text>
                  <Text style={styles.rewardDescription}>
                    UNLOCK PREMIUM FEATURES
                  </Text>
                </View>
              </View>

              {/* Additional Rewards */}
              {quest.additionalRewards?.map((reward, index) => (
                <View key={index} style={styles.rewardItem}>
                  <View style={[styles.rewardIcon, { borderColor: theme.colors.accent }]}>
                    <Ionicons
                      name={reward.icon}
                      size={16}
                      color={theme.colors.accent}
                    />
                  </View>
                  <View style={styles.rewardInfo}>
                    <Text style={styles.rewardLabel}>
                      {reward.type === 'stamp' ? 'PASSPORT STAMP' : 'ACHIEVEMENT'}
                    </Text>
                    <Text style={styles.rewardValue}>{reward.label}</Text>
                    {reward.type === 'stamp' && (
                      <Text style={styles.rewardDescription}>
                        ADD TO COLLECTION
                      </Text>
                    )}
                    {reward.type === 'achievement' && (
                      <Text style={styles.rewardDescription}>
                        DISPLAY ON PROFILE
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* XP Benefits Explainer */}
            <View style={[styles.section, styles.xpBenefitsSection]}>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>XP BENEFITS</Text>
                  <Text style={styles.infoText}>
                    UNLOCK HISTORIES • EXPERT ANALYSIS • EXCLUSIVE PERKS
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: accentColor }]}
              onPress={() => {
                onStartQuest(destination.params);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>{destination.label}</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.surface} />
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
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: SCREEN_HEIGHT * 0.85,
    overflow: 'hidden',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
    opacity: 0.5,
  },
  modalHeader: {
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
  },
  questTypeText: {
    color: theme.colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.surface,
    marginBottom: 8,
    fontFamily: theme.typography.fontFamily.bold,
    textTransform: 'uppercase',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    color: theme.colors.surface,
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'Courier',
  },
  modalContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.muted,
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
  },
  progressDisplay: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.background,
    marginBottom: 8,
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 10,
    color: theme.colors.muted,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rewardItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rewardIcon: {
    width: 32,
    height: 32,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardLabel: {
    fontSize: 8,
    color: theme.colors.muted,
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rewardValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  rewardDescription: {
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  xpBenefitsSection: {
    marginBottom: 100,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.primary,
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  infoText: {
    fontSize: 10,
    color: theme.colors.text,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 0,
  },
  startButtonText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

export default QuestDetailModal;
