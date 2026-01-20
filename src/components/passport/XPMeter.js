import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { ARCHETYPE_COLORS } from '@/constants/archetypeColors';

const XP_GOLD = ARCHETYPE_COLORS.Stylist; // #FFD700
const XP_GOLD_LIGHT = '#FFF9E6'; // Light gold background

const XPMeter = ({ currentXP = 1250, level = 5, xpForNextLevel = 2000 }) => {
  const progressPercent = (currentXP / xpForNextLevel) * 100;
  const remainingXP = xpForNextLevel - currentXP;

  return (
    <View style={styles.container}>
      {/* Level Badge */}
      <View style={styles.levelBadge}>
        <Ionicons name="star" size={20} color={XP_GOLD} />
        <Text style={styles.levelNumber}>{level}</Text>
      </View>

      {/* XP Info */}
      <View style={styles.xpInfo}>
        <View style={styles.xpHeader}>
          <Text style={styles.xpLabel}>Xperience Points</Text>
          <Text style={styles.xpValue}>{currentXP.toLocaleString()} XP</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progressPercent, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {remainingXP.toLocaleString()} XP to Level {level + 1}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: XP_GOLD,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: XP_GOLD_LIGHT,
    borderWidth: 3,
    borderColor: XP_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.black,
    marginTop: 2,
  },
  xpInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.muted,
    letterSpacing: 0.5,
  },
  xpValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.black,
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: XP_GOLD,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: theme.colors.muted,
  },
});

export default XPMeter;
