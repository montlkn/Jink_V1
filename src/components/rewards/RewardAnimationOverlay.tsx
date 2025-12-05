/**
 * RewardAnimationOverlay
 * 
 * Animated celebration overlay that displays XP earned and stamps/achievements
 * after scanning a building or contributing information.
 * 
 * Designer Republic aesthetic: sharp corners, monospace fonts, technical borders
 */

import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface RewardItem {
  id: string;
  name: string;
  icon?: string;
  type: 'stamp' | 'achievement';
}

export interface RewardAnimationProps {
  visible: boolean;
  xpEarned: number;
  stamps?: RewardItem[];
  achievements?: RewardItem[];
  source: 'scan' | 'contribution' | 'walk';
  onDismiss: () => void;
  autoDismissDelay?: number; // milliseconds, default 3500
}

export function RewardAnimationOverlay({
  visible,
  xpEarned,
  stamps = [],
  achievements = [],
  source,
  onDismiss,
  autoDismissDelay = 3500,
}: RewardAnimationProps) {
  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.3)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const xpCountAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.5)).current;
  const particleAnims = useRef(
    Array.from({ length: 12 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  const [displayedXP, setDisplayedXP] = useState(0);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start animations when visible
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (visible) {
      // Reset animations
      overlayOpacity.setValue(0);
      cardScale.setValue(0.3);
      cardOpacity.setValue(0);
      xpCountAnim.setValue(0);
      glowPulse.setValue(0.5);
      setDisplayedXP(0);
      particleAnims.forEach((p) => {
        p.x.setValue(0);
        p.y.setValue(0);
        p.opacity.setValue(0);
        p.scale.setValue(0);
      });

      // Entrance animation sequence
      Animated.parallel([
        // Fade in overlay
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // Card entrance with bounce
        Animated.sequence([
          Animated.parallel([
            Animated.spring(cardScale, {
              toValue: 1,
              tension: 80,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.timing(cardOpacity, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();

      // Animate XP counter
      Animated.timing(xpCountAnim, {
        toValue: xpEarned,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // Must be false for non-transform/opacity
      }).start();

      // Listen to XP counter for display
      const listenerId = xpCountAnim.addListener(({ value }) => {
        setDisplayedXP(Math.round(value));
      });

      // Glow pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowPulse, {
            toValue: 0.5,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Particle burst animation
      particleAnims.forEach((particle, i) => {
        const angle = (i / particleAnims.length) * Math.PI * 2;
        const distance = 80 + Math.random() * 60;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance;

        Animated.sequence([
          Animated.delay(300 + i * 30),
          Animated.parallel([
            Animated.timing(particle.opacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(particle.scale, {
              toValue: 1 + Math.random() * 0.5,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(particle.x, {
              toValue: targetX,
              duration: 600,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(particle.y, {
              toValue: targetY,
              duration: 600,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });

      // Auto-dismiss timer
      autoDismissTimer.current = setTimeout(() => {
        handleDismiss();
      }, autoDismissDelay);

      return () => {
        xpCountAnim.removeListener(listenerId);
        if (autoDismissTimer.current) {
          clearTimeout(autoDismissTimer.current);
        }
      };
    }
  }, [visible, xpEarned, autoDismissDelay]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = () => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
    }

    // Exit animation
    Animated.parallel([
      Animated.timing(cardScale, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        delay: 50,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getSourceLabel = () => {
    switch (source) {
      case 'scan':
        return 'BUILDING VERIFIED';
      case 'contribution':
        return 'CONTRIBUTION ACCEPTED';
      case 'walk':
        return 'WALK COMPLETE';
      default:
        return 'REWARD EARNED';
    }
  };

  const getSourceIcon = () => {
    switch (source) {
      case 'scan':
        return 'scan';
      case 'contribution':
        return 'create';
      case 'walk':
        return 'walk';
      default:
        return 'star';
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
      >
        <Pressable style={styles.overlayPressable} onPress={handleDismiss}>
          {/* Particle effects */}
          <View style={styles.particleContainer} pointerEvents="none">
            {particleAnims.map((particle, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.particle,
                  {
                    opacity: particle.opacity,
                    transform: [
                      { translateX: particle.x },
                      { translateY: particle.y },
                      { scale: particle.scale },
                    ],
                  },
                ]}
              >
                <Text style={styles.particleEmoji}>
                  {['✦', '◆', '★', '◇', '●', '✧'][i % 6]}
                </Text>
              </Animated.View>
            ))}
          </View>

          {/* Main reward card */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ scale: cardScale }],
              },
            ]}
          >
            {/* Glow effect behind card */}
            <Animated.View
              style={[
                styles.cardGlow,
                { opacity: glowPulse },
              ]}
            />

            {/* Source label */}
            <View style={styles.sourceRow}>
              <Ionicons name={getSourceIcon() as any} size={16} color={theme.colors.accent} />
              <Text style={styles.sourceLabel}>{getSourceLabel()}</Text>
            </View>

            {/* XP Display */}
            <View style={styles.xpContainer}>
              <Text style={styles.xpPlus}>+</Text>
              <Text style={styles.xpValue}>{displayedXP}</Text>
              <Text style={styles.xpLabel}>XP</Text>
            </View>

            {/* Stamps earned */}
            {stamps.length > 0 && (
              <View style={styles.rewardsSection}>
                <Text style={styles.rewardsSectionTitle}>STAMPS EARNED</Text>
                {stamps.map((stamp) => (
                  <View key={stamp.id} style={styles.rewardItem}>
                    <Text style={styles.rewardIcon}>{stamp.icon || '🏛️'}</Text>
                    <Text style={styles.rewardName}>{stamp.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Achievements unlocked */}
            {achievements.length > 0 && (
              <View style={styles.rewardsSection}>
                <Text style={styles.rewardsSectionTitle}>ACHIEVEMENTS UNLOCKED</Text>
                {achievements.map((achievement) => (
                  <View key={achievement.id} style={styles.rewardItem}>
                    <Text style={styles.rewardIcon}>{achievement.icon || '🏆'}</Text>
                    <Text style={styles.rewardName}>{achievement.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Tap to dismiss hint */}
            <Text style={styles.dismissHint}>TAP TO CONTINUE</Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayPressable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
  },
  particleEmoji: {
    fontSize: 18,
    color: theme.colors.accent,
  },
  cardGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: theme.colors.accent,
    borderRadius: 20,
    opacity: 0.15,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: 4, // Sharp corners - Designer Republic
    padding: 28,
    minWidth: 280,
    maxWidth: SCREEN_WIDTH - 48,
    alignItems: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sourceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  xpPlus: {
    fontSize: 36,
    fontWeight: '900',
    color: theme.colors.primary,
    fontFamily: 'monospace',
  },
  xpValue: {
    fontSize: 64,
    fontWeight: '900',
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginHorizontal: 4,
  },
  xpLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.muted,
    fontFamily: 'monospace',
    marginLeft: 4,
  },
  rewardsSection: {
    width: '100%',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rewardsSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 1.5,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  rewardIcon: {
    fontSize: 20,
  },
  rewardName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  dismissHint: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.muted,
    letterSpacing: 1,
    marginTop: 20,
    opacity: 0.7,
    fontFamily: 'monospace',
  },
});

export default RewardAnimationOverlay;
