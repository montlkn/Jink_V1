// LiquidGlassBottomTab.js
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Keyboard,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const EDGE = 16;
const PILL_HEIGHT = 62;
const SEARCH_SIZE = 58;
const TAB_COUNT = 4;
const BUBBLE_SIZE = 66;
const BUBBLE_MOVE_SPRING = { speed: 50, bounciness: 7 };
const BUBBLE_SCALE_UP_TIMING = { duration: 55, easing: Easing.out(Easing.cubic) };
const BUBBLE_SCALE_REBOUND = { speed: 26, bounciness: 9 };
const SEARCH_OPEN_SPRING = { speed: 32, bounciness: 9 };
const SEARCH_CLOSE_SPRING = { speed: 24, bounciness: 10 };
const SEARCH_FOCUS_DELAY = 16;
const SEARCH_PULSE_UP_TIMING = { duration: 100, easing: Easing.out(Easing.cubic) };
const SEARCH_PULSE_REBOUND = { speed: 20, bounciness: 11 };
const SEARCH_SYNC_DELAY = 0;
const KEYBOARD_MIN_PREDICT_DURATION = 80;
const KEYBOARD_PREDICT_OFFSET = 20;
const KEYBOARD_HIDE_DURATION = 110;

export default function LiquidGlassBottomTab({ state, descriptors, navigation }) {
  const routes = state.routes.slice(0, TAB_COUNT);
  const focusIndex = Math.min(state.index, TAB_COUNT - 1);

  const pillWidth = Math.min(SCREEN_WIDTH * 0.8, SCREEN_WIDTH - 120);
  const pillLeft = EDGE;

  const [isSearching, setIsSearching] = useState(false);

  const searchAnim = useRef(new Animated.Value(0)).current;
  const searchScale = useRef(new Animated.Value(1)).current;
  const bubbleX = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(1)).current;
  const searchInputRef = useRef(null);
  const focusTimeoutRef = useRef(null);
  const searchStartTimeoutRef = useRef(null);
  const searchPulseTimeoutRef = useRef(null);
  const keyboardAnimated = useRef(new Animated.Value(0)).current;
  const bottomBaseValue = useRef(new Animated.Value(20)).current;
  const bottomShiftValue = useRef(new Animated.Value(-4)).current;
  const lastKeyboardHeightRef = useRef(320);
  const lastKeyboardDurationRef = useRef(140);

  const itemWidth = pillWidth / TAB_COUNT;
  const bubbleBaseLeft = itemWidth / 2 - BUBBLE_SIZE / 2;
  const targetX = bubbleBaseLeft + itemWidth * focusIndex;

  // Keyboard lift listener
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, (e) => {
      const height = e?.endCoordinates?.height ?? lastKeyboardHeightRef.current;
      lastKeyboardHeightRef.current = height;
      const duration =
        Platform.OS === "ios"
          ? e?.duration ?? lastKeyboardDurationRef.current
          : Math.max(90, lastKeyboardDurationRef.current);
      lastKeyboardDurationRef.current = duration;
      keyboardAnimated.stopAnimation();
      Animated.timing(keyboardAnimated, {
        toValue: height,
        duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    const hide = Keyboard.addListener(hideEvent, (e) => {
      const duration = Platform.OS === "ios" ? e?.duration ?? KEYBOARD_HIDE_DURATION : KEYBOARD_HIDE_DURATION;
      keyboardAnimated.stopAnimation();
      Animated.timing(keyboardAnimated, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardAnimated]);

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
      if (searchStartTimeoutRef.current) {
        clearTimeout(searchStartTimeoutRef.current);
        searchStartTimeoutRef.current = null;
      }
      if (searchPulseTimeoutRef.current) {
        clearTimeout(searchPulseTimeoutRef.current);
        searchPulseTimeoutRef.current = null;
      }
    };
  }, []);

  // Focus blob overshoot + settle
  useEffect(() => {
    bubbleX.stopAnimation();
    bubbleScale.stopAnimation();
    Animated.spring(bubbleX, { toValue: targetX, ...BUBBLE_MOVE_SPRING, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.timing(bubbleScale, {
        toValue: 1.12,
        ...BUBBLE_SCALE_UP_TIMING,
        useNativeDriver: true,
      }),
      Animated.spring(bubbleScale, {
        toValue: 1,
        ...BUBBLE_SCALE_REBOUND,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focusIndex]);

  const startSearch = () => {
    Haptics.selectionAsync();
    setIsSearching(true);
    searchAnim.stopAnimation();
    if (searchStartTimeoutRef.current) {
      clearTimeout(searchStartTimeoutRef.current);
    }
    searchStartTimeoutRef.current = setTimeout(() => {
      searchStartTimeoutRef.current = null;
      Animated.spring(searchAnim, {
        toValue: 1,
        ...SEARCH_OPEN_SPRING,
        useNativeDriver: false,
      }).start();
    }, SEARCH_SYNC_DELAY);
    keyboardAnimated.stopAnimation();
    Animated.timing(keyboardAnimated, {
      toValue: lastKeyboardHeightRef.current,
      duration: Math.max(
        KEYBOARD_MIN_PREDICT_DURATION,
        lastKeyboardDurationRef.current - KEYBOARD_PREDICT_OFFSET
      ),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    searchScale.stopAnimation();
    searchScale.setValue(0.98);
    if (searchPulseTimeoutRef.current) {
      clearTimeout(searchPulseTimeoutRef.current);
    }
    searchPulseTimeoutRef.current = setTimeout(() => {
      searchPulseTimeoutRef.current = null;
      Animated.timing(searchScale, {
        toValue: 1.05,
        ...SEARCH_PULSE_UP_TIMING,
        useNativeDriver: false,
      }).start(() => {
        Animated.spring(searchScale, {
          toValue: 1,
          ...SEARCH_PULSE_REBOUND,
          useNativeDriver: false,
        }).start();
      });
    }, SEARCH_SYNC_DELAY);
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      focusTimeoutRef.current = null;
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }, SEARCH_FOCUS_DELAY);
  };

  const endSearch = () => {
    Keyboard.dismiss();
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    if (searchStartTimeoutRef.current) {
      clearTimeout(searchStartTimeoutRef.current);
      searchStartTimeoutRef.current = null;
    }
    if (searchPulseTimeoutRef.current) {
      clearTimeout(searchPulseTimeoutRef.current);
      searchPulseTimeoutRef.current = null;
    }
    searchAnim.stopAnimation();
    Animated.spring(searchAnim, {
      toValue: 0,
      ...SEARCH_CLOSE_SPRING,
      useNativeDriver: false,
    }).start(() => setIsSearching(false));
    searchScale.stopAnimation();
    Animated.spring(searchScale, {
      toValue: 1,
      ...SEARCH_PULSE_REBOUND,
      useNativeDriver: false,
    }).start();
    keyboardAnimated.stopAnimation();
    Animated.timing(keyboardAnimated, {
      toValue: 0,
      duration: KEYBOARD_HIDE_DURATION,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  // Search expand interpolations
  const maxExpandedWidth = Math.max(SEARCH_SIZE, SCREEN_WIDTH - EDGE * 2);

  const iWidth = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SEARCH_SIZE, maxExpandedWidth],
  });
  const iRadius = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SEARCH_SIZE / 2, 20],
  });
  const iBottom = Animated.add(
    bottomBaseValue,
    Animated.multiply(searchAnim, Animated.add(keyboardAnimated, bottomShiftValue))
  );
  const tabOpacity = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <>
      {/* LEFT PILL TAB */}
      <View style={[styles.pillWrapper, { bottom: 20, left: pillLeft, width: pillWidth }]}>
        <View style={[styles.glassContainer, { height: PILL_HEIGHT }]}>
          <BlurView intensity={60} tint="light" style={styles.blurPill}>
            <Animated.View
              style={[
                styles.focusBubble,
                {
                  transform: [
                    { translateX: bubbleX },
                    { scale: bubbleScale },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[styles.tabRow, { opacity: tabOpacity }]}
              pointerEvents={isSearching ? "none" : "auto"}
            >
              {routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label = options.tabBarLabel ?? options.title ?? route.name;
                const icon = options.tabBarIcon ?? "ellipse";
                const focused = focusIndex === index;
                return (
                  <TabButton
                    key={route.key}
                    label={label}
                    icon={icon}
                    focused={focused}
                    onPress={() => {
                      Haptics.selectionAsync();
                      navigation.navigate(route.name);
                    }}
                  />
                );
              })}
            </Animated.View>
          </BlurView>
        </View>
      </View>

      {/* FLOATING SEARCH BUTTON / BAR */}
      <Animated.View
        style={[
      styles.searchContainer,
      {
        right: EDGE,
        width: iWidth,
        borderRadius: iRadius,
        bottom: iBottom,
        transform: [{ scale: searchScale }],
      },
    ]}
  >
        <BlurView intensity={60} tint="light" style={styles.searchBlur}>
          {isSearching ? (
            <View style={styles.searchExpandedRow}>
              <TouchableOpacity
                onPress={endSearch}
                style={styles.searchBackButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={24} color="#000" />
              </TouchableOpacity>
              <TextInput
                ref={searchInputRef}
                placeholder="Search"
                placeholderTextColor="#6a6a6a"
                style={styles.searchInput}
                returnKeyType="search"
                blurOnSubmit
                clearButtonMode={Platform.OS === "ios" ? "while-editing" : "never"}
                onBlur={endSearch}
              />
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={startSearch}
              style={styles.searchIconButton}
            >
              <Ionicons name="search" size={22} color="#000" />
            </TouchableOpacity>
          )}
        </BlurView>
      </Animated.View>
    </>
  );
}

function TabButton({ label, icon, focused, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.tabButton} activeOpacity={0.85}>
      <Ionicons name={icon} size={22} color={focused ? "#007AFF" : "#333"} />
      <Text style={[styles.label, { color: focused ? "#007AFF" : "#333" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // TAB BAR
  pillWrapper: {
    position: "absolute",
  },
  glassContainer: {
    borderRadius: PILL_HEIGHT / 2,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  blurPill: {
    flex: 1,
    borderRadius: PILL_HEIGHT / 2,
    flexDirection: "row",
    alignItems: "center",
  },
  focusBubble: {
    position: "absolute",
    top: (PILL_HEIGHT - BUBBLE_SIZE) / 2,
    left: 0,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: "rgba(0,122,255,0.14)",
    borderWidth: 0.75,
    borderColor: "rgba(255,255,255,0.85)",
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    flex: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
  },

  // SEARCH FLOAT
  searchContainer: {
    position: "absolute",
    height: SEARCH_SIZE,
    borderRadius: SEARCH_SIZE / 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  searchBlur: {
    flex: 1,
    borderRadius: SEARCH_SIZE / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  searchIconButton: {
    width: SEARCH_SIZE,
    height: SEARCH_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  searchExpandedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    width: "100%",
    height: "100%",
  },
  searchBackButton: {
    padding: 6,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    fontSize: 16,
    color: "#111",
    backgroundColor: "transparent",
  },
});
