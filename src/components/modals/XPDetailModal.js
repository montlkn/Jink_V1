import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const XPDetailModal = ({
  visible,
  onClose,
  currentXP = 1250,
  level = 5,
  xpForNextLevel = 2000,
}) => {
  const progressPercent = (currentXP / xpForNextLevel) * 100;
  const remainingXP = xpForNextLevel - currentXP;

  // Circle SVG properties for expanded view
  const size = 140;
  const strokeWidth = 10;
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
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalContainer}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.title}>Experience</Text>

          {/* Expanded XP Circle */}
          <View style={styles.circleContainer}>
            <Svg width={size} height={size} style={styles.svg}>
              {/* Background circle */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#E0E0E0"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Progress circle */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#FFD700"
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
              />
            </Svg>

            {/* Center content */}
            <View style={styles.centerContent}>
              <Ionicons name="star" size={36} color="#FFD700" />
              <Text style={styles.levelNumber}>{level}</Text>
            </View>
          </View>

          {/* XP Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Current Level</Text>
              <Text style={styles.statValue}>Level {level}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total EP</Text>
              <Text style={styles.statValue}>{currentXP.toLocaleString()} EP</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Next Level</Text>
              <Text style={styles.statValue}>{xpForNextLevel.toLocaleString()} EP</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>EP Needed</Text>
              <Text style={styles.statValueHighlight}>
                {remainingXP.toLocaleString()} EP
              </Text>
            </View>
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
              {Math.round(progressPercent)}% to Level {level + 1}
            </Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#3498DB" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How to earn EP</Text>
              <Text style={styles.infoText}>
                • Scan buildings and complete quests{'\n'}
                • Complete daily and weekly challenges{'\n'}
                • Explore new architectural styles
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
    marginBottom: 24,
  },
  circleContainer: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    position: 'relative',
    marginBottom: 32,
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
    backgroundColor: '#FFF9E6',
    borderRadius: 70,
    margin: 10,
  },
  levelNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 4,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  statValueHighlight: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
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
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#555',
  },
});

export default XPDetailModal;
