import React from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { getTierColor } from "@/constants/xpLevels";
import { Ionicons } from "@expo/vector-icons";

type XPDetailModalProps = {
  visible: boolean;
  onClose: () => void;
  xp: number;
  level: number;
  levelTitle: string;
  tier: 'explorer' | 'connoisseur' | 'authority' | 'mythic';
  xpForNextLevel: number;
  streakCount: number;
  multiplier: number;
};

export function XPDetailModal({
  visible,
  onClose,
  xp,
  level,
  levelTitle,
  tier,
  xpForNextLevel,
  streakCount,
  multiplier,
}: XPDetailModalProps): JSX.Element {
  const tierColor = getTierColor(tier);
  const progressPercent = Math.min((xp / xpForNextLevel) * 100, 100);
  const remainingXp = Math.max(0, xpForNextLevel - xp);

  const onGestureEvent = (event: any) => {
    const { translationY, velocityY } = event.nativeEvent;
    if (translationY > 100 || (velocityY > 500 && translationY > 50)) {
      onClose();
    }
  };

  if (!visible) return <></>;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <PanGestureHandler onGestureEvent={onGestureEvent}>
            <View style={[styles.sheetContainer, { borderColor: tierColor }]} onStartShouldSetResponder={() => true}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                {/* Handle Indicator */}
                <View style={styles.handleContainer}>
                  <View style={styles.handle} />
                </View>

                {/* Header Badge - Repositioned for Sheet */}
                <View style={[styles.headerBadge, { backgroundColor: tierColor }]}>
                  <Text style={styles.badgeText}>DOSSIER: ARCHITECTURAL RANK</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                  <View style={styles.content}>
                    {/* Level & Title */}
                    <View style={styles.rankSection}>
                      <Text style={styles.levelLabel}>LEVEL {level}</Text>
                      <Text style={[styles.titleText, { color: tierColor }]}>
                        {levelTitle.toUpperCase()}
                      </Text>
                      <View style={[styles.tierPill, { borderColor: tierColor }]}>
                        <Text style={[styles.tierText, { color: tierColor }]}>{tier.toUpperCase()}</Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.label}>XP PROGRESS</Text>
                        <Text style={styles.value}>{xp.toLocaleString()} / {xpForNextLevel.toLocaleString()}</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: tierColor }]} />
                      </View>
                      <Text style={styles.hintText}>{remainingXp.toLocaleString()} XP TO NEXT RANK</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <View style={styles.statIconLabel}>
                          <Ionicons name="flame" size={16} color={theme.colors.accent} />
                          <Text style={styles.statLabel}>STREAK</Text>
                        </View>
                        <Text style={styles.statValue}>{streakCount} DAYS</Text>
                      </View>

                      <View style={styles.statItem}>
                        <View style={styles.statIconLabel}>
                          <Ionicons name="trending-up" size={16} color={tierColor} />
                          <Text style={styles.statLabel}>XP MULTIPLIER</Text>
                        </View>
                        <Text style={[styles.statValue, { color: tierColor }]}>{multiplier}X</Text>
                      </View>
                    </View>

                    <View style={styles.infoBox}>
                      <Ionicons name="information-circle-outline" size={16} color={theme.colors.muted} />
                      <Text style={styles.infoText}>
                        Your rank grows as you scan buildings, complete walks, and contribute data to the grid. 
                        Higher streaks apply a multiplier to all XP gains.
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </TouchableOpacity>
            </View>
          </PanGestureHandler>
        </TouchableOpacity>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent', // Make invisible to show content behind
    justifyContent: 'flex-end', // Align to bottom
    alignItems: 'center',
  },
  sheetContainer: {
    backgroundColor: theme.colors.surface,
    width: Dimensions.get('window').width,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 2, // Highlight border
    // Remove side/bottom borders for sheet look
    padding: 24,
    paddingTop: 12,
    paddingBottom: 30,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    minHeight: 380,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16, // Reduced from 24
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.muted,
    borderRadius: 2,
    opacity: 0.5,
  },
  headerBadge: {
    alignSelf: 'center',
    marginBottom: 16, // Reduced from 20
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.background,
    letterSpacing: 1.5,
  },
  content: {
    paddingTop: 0,
  },
  rankSection: {
    alignItems: 'center',
    marginBottom: 20, // Reduced from 32
  },
  levelLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 24, // Reduced from 28
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8, // Reduced from 12
    textAlign: 'center',
  },
  tierPill: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 0,
  },
  tierText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  progressSection: {
    marginBottom: 20, // Reduced from 32
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.muted,
    letterSpacing: 1,
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Courier',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
  },
  hintText: {
    fontSize: 9,
    color: theme.colors.muted,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.5,
    marginBottom: 16, // Reduced from 24
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12, // Reduced from 20
    marginBottom: 20, // Reduced from 32
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10, // Reduced from 12
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: theme.colors.muted,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 16, // Reduced from 18
    fontWeight: 'bold',
    fontFamily: 'Courier',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12, // Reduced from 16
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.muted,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.muted,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
