import { getStreakMultiplier } from "@/theme/designConstants";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import XPGlassOrb from "../three/orb/XPGlassOrb";

type Props = {
  currentXP: number;
  level: number;
  xpForNextLevel: number;
  streakCount: number;
  // Multiplier mode props
  multiplier?: number; // If > 1.0, show multiplier instead of level
  multiplierColor?: string; // Tint color for multiplier mode
};

const EXPANDED_WIDTH = 280;
const COLLAPSED_WIDTH = 80;
const HEIGHT = 80;

export default function XPStatusBanner({
  currentXP,
  level,
  xpForNextLevel,
  streakCount,
  multiplier,
  multiplierColor,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const width = useSharedValue(COLLAPSED_WIDTH);
  const contentOpacity = useSharedValue(0);

  const streakInfo = getStreakMultiplier(streakCount);
  const progressPercent = currentXP / xpForNextLevel;
  const remainingXP = xpForNextLevel - currentXP;

  // Check if we're in multiplier mode
  const isMultiplierMode = multiplier !== undefined && multiplier > 1.0;

  const handlePress = () => {
    // Don't expand in multiplier mode
    if (isMultiplierMode) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    width.value = withSpring(nextState ? EXPANDED_WIDTH : COLLAPSED_WIDTH, {
      damping: 15,
      stiffness: 100,
    });
    contentOpacity.value = withTiming(nextState ? 1 : 0, { duration: 300 });
  };

  const containerStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Pressable onPress={handlePress} style={styles.pressable}>
        {/* Background Layer for Expanded State */}
        {/* Background Layer (Animate opacity/styles if needed, currently covers all) */}
        <Animated.View style={[styles.background, contentStyle]} />

        {/* Orb Section (Always Visible, but moves/scales slightly if needed) */}
        <View style={styles.orbWrapper}>
          <View style={styles.orbContainer} pointerEvents="none">
            <XPGlassOrb
              size={HEIGHT}
              level={level}
              progress={progressPercent}
              tintColor={isMultiplierMode ? multiplierColor : undefined}
            />
          </View>
          {/* Level/Multiplier Overlay */}
          <View style={styles.centerContent} pointerEvents="none">
            {isMultiplierMode ? (
              // Multiplier mode: show multiplier text only
              <Text style={styles.multiplierText}>{multiplier}X</Text>
            ) : (
              // Normal mode: show star icon and level
              <>
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={styles.levelText}>{level}</Text>
              </>
            )}
          </View>
        </View>

        {/* Expanded Content Section */}
        <Animated.View style={[styles.detailsContainer, contentStyle]}>
          {isExpanded && (
            <View style={styles.grid}>
              {/* Top Row: XP Progress */}
              <View style={styles.row}>
                <View style={styles.statBlock}>
                  <View style={styles.row}>
                     <Text style={styles.label}>XP PROGRESS</Text>
                     <Text style={styles.value}>{currentXP.toLocaleString()} / {xpForNextLevel.toLocaleString()}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(progressPercent * 100, 100)}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.row}>
                     <Text style={styles.subtext}>
                        {remainingXP.toLocaleString()} XP TO NEXT LEVEL
                     </Text>
                     <Text style={styles.subtext}>
                        {Math.floor(progressPercent * 100)}%
                     </Text>
                  </View>
                </View>
              </View>

              {/* Bottom Row: Streak & Multiplier */}
              <View style={[styles.row, { marginTop: 8 }]}>
                <View style={styles.statBlock}>
                  <View style={styles.inline}>
                    <Ionicons
                      name="flame"
                      size={14}
                      color={theme.colors.accent}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.label}>STREAK</Text>
                  </View>
                  <Text style={[styles.value, { marginLeft: 16 }]}>
                    {streakCount} {streakCount === 1 ? "DAY" : "DAYS"}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.statBlock}>
                   <Text style={styles.label}>BONUS</Text>
                   <Text style={[styles.value, { color: streakInfo.color }]}>{streakInfo.multiplier}</Text>
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HEIGHT,
    borderRadius: 35,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    // Remove static border/bg from container to allow orb to stand alone when collapsed
  },
  pressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orbWrapper: {
    width: HEIGHT,
    height: HEIGHT,
    position: "relative",
    zIndex: 10,
    backgroundColor: "transparent", 
  },
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginTop: 1,
    textShadowColor: "rgba(255, 255, 255, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  multiplierText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  detailsContainer: {
    flex: 1,
    paddingRight: theme.spacing.lg,
    paddingLeft: theme.spacing.sm, 
    justifyContent: "center",
  },
  grid: {
    flex: 1,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statBlock: {
    justifyContent: "center",
    flex: 1,
  },
  inline: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 8,
    color: theme.colors.muted,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  value: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: "bold",
    fontFamily: "Courier",
  },
  subtext: {
    fontSize: 8,
    color: theme.colors.muted,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    width: "100%", 
    marginTop: 2,
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.border,
    marginHorizontal: 12,
  },
});
