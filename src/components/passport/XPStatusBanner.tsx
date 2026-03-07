import { getStreakMultiplier, SHADOWS } from "@/theme/designConstants";
import { theme } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import XPGlassOrb from "../three/orb/XPGlassOrb";
import { XPDetailModal } from "../modals/XPDetailModal";
import { getProgressToNextLevel } from "@/constants/xpLevels";

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

function XPStatusBanner({
  currentXP = 0,
  level = 1,
  xpForNextLevel = 100,
  streakCount = 0,
  multiplier,
  multiplierColor,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);

  const safeXp = Number(currentXP) || 0;
  const progress = getProgressToNextLevel(safeXp);
  const streakInfo = getStreakMultiplier(Number(streakCount) || 0);
  const progressPercent = progress.xpNeededForNext > 0 ? progress.xpInCurrentLevel / progress.xpNeededForNext : 0;

  // Check if we're in multiplier mode
  const isMultiplierMode = multiplier !== undefined && multiplier > 1.0;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalVisible(true);
  };

  return (
    <>
      <View style={styles.container}>
        <Pressable onPress={handlePress} style={styles.pressable}>
          {/* Background Layer */}
          <View style={styles.background} />

          {/* Orb Section */}
          <View style={styles.orbWrapper}>
            <View style={styles.orbContainer} pointerEvents="none">
              <XPGlassOrb
                size={HEIGHT}
                level={Number(level) || 1}
                progress={progressPercent}
                tintColor={isMultiplierMode ? multiplierColor : undefined}
              />
            </View>
            {/* Level/Multiplier Overlay */}
            <View style={styles.centerContent} pointerEvents="none">
              {isMultiplierMode ? (
                <Text style={styles.multiplierText}>{multiplier}X</Text>
              ) : (
                <>
                  <Ionicons name="star" size={18} color={theme.colors.warning} />
                  <Text style={styles.levelText}>{Number(level) || 1}</Text>
                </>
              )}
            </View>
          </View>
        </Pressable>
      </View>

      <XPDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        xp={safeXp}
        level={level}
        levelTitle={progress.currentLevelTitle}
        tier={progress.tier}
        xpForNextLevel={progress.cumulativeXp + progress.xpNeededForNext}
        streakCount={streakCount}
        multiplier={parseFloat(streakInfo.multiplier)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HEIGHT,
    width: HEIGHT, // Fixed width since we removed expansion
    borderRadius: 35,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  pressable: {
    width: '100%',
    height: '100%',
    alignItems: "center",
    justifyContent: "center",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    // Remove visual container elements to show only the orb
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
    fontSize: theme.typography.fontSize.base,
    fontWeight: "bold",
    color: theme.colors.black,
    marginTop: 1,
    textShadowColor: "rgba(255, 255, 255, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  multiplierText: {
    fontSize: theme.typography.fontSize.xlg,
    fontWeight: "800",
    color: theme.colors.white,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default React.memo(XPStatusBanner);
