import { getStreakMultiplier } from '@/theme/designConstants';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { Ionicons } from '@expo/vector-icons';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import ModalCloseButton from './ModalCloseButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH * 0.92, 420);

const XPDetailModal = ({
  visible,
  onClose,
  currentXP = 1250,
  level = 5,
  xpForNextLevel = 2000,
  streakCount = 0,
}) => {
  const progressPercent = (currentXP / xpForNextLevel) * 100;
  const remainingXP = xpForNextLevel - currentXP;

  // Use centralized streak multiplier config
  const streakInfo = getStreakMultiplier(streakCount);

  // Circle SVG properties
  const size = 100;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          {/* Close button */}
          <ModalCloseButton onPress={onClose} style={styles.closeButton} />

          {/* Header */}
          <Text style={styles.title}>BEARER STATUS</Text>

          <View style={styles.contentRow}>
            {/* XP Circle */}
            <View style={styles.circleContainer}>
              <Svg width={size} height={size} style={styles.svg}>
                {/* Background circle */}
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={theme.colors.border}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {/* Progress circle */}
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={theme.colors.accent}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  rotation="-90"
                  origin={`${size / 2}, ${size / 2}`}
                />
              </Svg>

              {/* Center content */}
              <View style={styles.centerContent}>
                <Text style={styles.levelLabel}>LEVEL</Text>
                <Text style={styles.levelNumber}>{level}</Text>
              </View>
            </View>

            {/* XP Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>CURRENT XP</Text>
                <Text style={styles.statValue}>{currentXP.toLocaleString()}</Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>NEXT LEVEL</Text>
                <Text style={styles.statValue}>{xpForNextLevel.toLocaleString()}</Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>XP REQUIRED</Text>
                <Text style={styles.statValueHighlight}>
                  {remainingXP.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Streak Section */}
          <View style={styles.streakSection}>
             <View style={styles.streakHeader}>
                <Text style={styles.statLabel}>DAILY STREAK</Text>
                {streakCount >= 3 && (
                  <Text style={[styles.multiplierText, { color: streakInfo.color }]}>
                    {streakInfo.multiplier} BONUS
                  </Text>
                )}
             </View>
             <Text style={styles.streakValue}>
                {streakCount > 0 ? `${streakCount} DAY${streakCount !== 1 ? 'S' : ''}` : 'NO STREAK'}
             </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progressPercent, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progressPercent)}% TO LEVEL {level + 1}
            </Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              SCAN BUILDINGS • COMPLETE QUESTS • MAINTAIN STREAK
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.92)',
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    paddingTop: 20,
    width: MODAL_WIDTH,
    borderWidth: 2,
    borderRadius: 12,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
  },
  closeButton: {
    position: 'absolute',
    top: -6,
    right: 0,
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 8,
    letterSpacing: 2,
    fontFamily: theme.typography.fontFamily.bold,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 24,
  },
  circleContainer: {
    width: 100,
    height: 100,
    position: 'relative',
    flexShrink: 0,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: theme.colors.muted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  levelNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
  },
  statsContainer: {
    flex: 1,
    gap: 14,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.muted,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: 'Courier',
    textAlign: 'right',
  },
  streakSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  streakValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: 'Courier',
  },
  multiplierText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValueHighlight: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.accent,
    fontFamily: 'Courier',
    textAlign: 'right',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.background,
    marginBottom: 8,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  progressText: {
    fontSize: 10,
    color: theme.colors.muted,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 10,
    color: theme.colors.text,
    fontWeight: '600',
    letterSpacing: 0.5,
    flex: 1,
  },
});

export default XPDetailModal;
