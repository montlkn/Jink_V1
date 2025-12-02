import { getUserAestheticProfile } from "@/features/profile";
import { log } from "@/lib/log";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";
import { useAuth } from "../auth/authProvider";
import ArchetypeOrb from "../features/orb/ArchetypeOrb";
import { extractTopArchetypesFromScores } from "../utils/archetypeColorBlend";

const DEFAULT_TRANSITION_DURATION = 250;
const DEFAULT_EASING = Easing.out(Easing.cubic);
const ORB_SIZE = 256;
const JINK_TARGET_SIZE = ORB_SIZE; // Ring radius on WalkStart
const JINK_OFFSET_X = 0;
const JINK_OFFSET_Y = 12; // Positive pushes orb downward on Jink
const ORB_DATA_STORAGE_KEY = "arch-app/orbData.v1";

// Calculate glow extent to match ArchetypeOrb
const GLOW_EXTENT = Math.max(80, ORB_SIZE * 0.35);
const TOTAL_ORB_SIZE = ORB_SIZE + GLOW_EXTENT * 2;

const sanitizeOrbEntries = (data) => {
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      ...entry,
      color:
        typeof entry?.color === "string" && entry.color.length
          ? entry.color
          : "#FFFFFF",
    }));
};

const OrbTransitionContext = createContext({
  registerHomeOrbLayout: (layout) => {},
  setOrbData: (data) => {},
  startHomeToJinkTransition: async () => false,
  pinToJink: (shouldPin) => {},
  transitionProgress: new Animated.Value(0),
  isTransitioning: false,
  orbData: [],
});

export const OrbTransitionProvider = ({ children }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [renderOverlay, setRenderOverlay] = useState(false);
  const [homeOrbLayout, setHomeOrbLayout] = useState(null);
  const [orbData, setOrbState] = useState([]);
  const [pinnedToJink, setPinnedToJink] = useState(false);
  const bootstrapRef = useRef(false);
  const { session } = useAuth();

  const setOrbData = useCallback((data) => {
    const normalized = sanitizeOrbEntries(data);
    setOrbState(normalized);
    if (normalized.length) {
      AsyncStorage.setItem(ORB_DATA_STORAGE_KEY, JSON.stringify(normalized)).catch(
        (error) => {
          log.warn("[OrbTransition] Failed to persist orb colors", error);
        }
      );
    } else {
      AsyncStorage.removeItem(ORB_DATA_STORAGE_KEY).catch((error) => {
        log.warn("[OrbTransition] Failed to clear orb colors", error);
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(ORB_DATA_STORAGE_KEY)
      .then((stored) => {
        if (!isMounted || !stored) {
          return;
        }
        try {
          const parsed = JSON.parse(stored);
          const normalized = sanitizeOrbEntries(parsed);
          if (normalized.length) {
            setOrbState(normalized);
          }
        } catch (error) {
          log.warn("[OrbTransition] Failed to parse cached orb colors", error);
        }
      })
      .catch((error) => {
        log.warn("[OrbTransition] Failed to read cached orb colors", error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (bootstrapRef.current) {
      return;
    }
    if (!session?.user?.id) {
      return;
    }
    if (orbData.length > 0) {
      bootstrapRef.current = true;
      return;
    }
    bootstrapRef.current = true;
    (async () => {
      try {
        const profile = await getUserAestheticProfile(session.user.id);
        if (profile?.archetype_scores) {
          const top = extractTopArchetypesFromScores(profile.archetype_scores);
          if (top.length) {
            setOrbData(top);
          }
        }
      } catch (error) {
        log.warn("[OrbTransition] Failed to bootstrap orb colors", error);
        bootstrapRef.current = false;
      }
    })();
  }, [orbData.length, session, setOrbData]);

  const registerHomeOrbLayout = useCallback((layout) => {
    if (!layout) return;
    setHomeOrbLayout(layout);
  }, []);

  const startHomeToJinkTransition = useCallback(() => {
    if (isTransitioning || !homeOrbLayout) {
      return Promise.resolve(false);
    }
    setIsTransitioning(true);
    setRenderOverlay(true);
    progress.setValue(0);
    return new Promise((resolve) => {
      Animated.timing(progress, {
        toValue: 1,
        duration: DEFAULT_TRANSITION_DURATION,
        easing: DEFAULT_EASING,
        useNativeDriver: true,
      }).start(() => {
        progress.setValue(0);
        setIsTransitioning(false);
        setRenderOverlay(false);
        resolve(true);
      });
    });
  }, [homeOrbLayout, isTransitioning, progress]);

  const contextValue = useMemo(
    () => ({
      registerHomeOrbLayout,
      setOrbData,
      startHomeToJinkTransition,
      pinToJink: (v) => setPinnedToJink(Boolean(v)),
      transitionProgress: progress,
      isTransitioning,
      orbData,
    }),
    [
      registerHomeOrbLayout,
      setOrbData,
      startHomeToJinkTransition,
      setPinnedToJink,
      progress,
      isTransitioning,
      orbData,
    ]
  );

  return (
    <OrbTransitionContext.Provider value={contextValue}>
      <View style={styles.flex}>
        {children}
        <OrbTransitionOverlay
          progress={progress}
          layout={homeOrbLayout}
          orbData={orbData}
          pinned={pinnedToJink}
          visible={renderOverlay && !pinnedToJink}
        />
      </View>
    </OrbTransitionContext.Provider>
  );
};

export const useOrbTransition = () => {
  return useContext(OrbTransitionContext);
};

const OrbTransitionOverlay = ({ progress, layout, orbData, pinned, visible }) => {
  if (!visible) return null;

  const { width, height } = Dimensions.get("window");
  
  // Position based on the visual orb center (not including glow extent)
  const baseLeft = width / 2 - ORB_SIZE / 2;
  const baseTop = height / 2 - ORB_SIZE / 2;

  const fromLeft = layout ? layout.x : baseLeft;
  const fromTop = layout ? layout.y : baseTop;

  const translateX = pinned
    ? JINK_OFFSET_X
    : progress.interpolate({
        inputRange: [0, 1],
        outputRange: [fromLeft - baseLeft, JINK_OFFSET_X],
        extrapolate: "clamp",
      });

  const translateY = pinned
    ? JINK_OFFSET_Y
    : progress.interpolate({
        inputRange: [0, 1],
        outputRange: [fromTop - baseTop, JINK_OFFSET_Y],
        extrapolate: "clamp",
      });

  const pinnedScale = JINK_TARGET_SIZE / ORB_SIZE;
  const scale = pinned
    ? pinnedScale
    : progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, pinnedScale],
        extrapolate: "clamp",
      });

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.overlayRoot]}
    >
      <Suspense fallback={null}>
        <Animated.View
          style={[
            styles.overlayOrb,
            {
              // Center the orb (the ArchetypeOrb handles its own glow offset)
              left: baseLeft - GLOW_EXTENT,
              top: baseTop - GLOW_EXTENT,
              transform: [
                { translateX },
                { translateY },
                { scale },
              ],
              zIndex: pinned ? 1 : 10, // Lower z-index when pinned so TimeSlider is on top
              opacity: pinned ? progress.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 0.5, 1],
                extrapolate: 'clamp',
              }) : 1, // Fade in smoothly when pinning
            },
          ]}
        >
          {/* Circular border glow removed as per user request */}
          <ArchetypeOrb
            archetypeData={orbData}
            size={ORB_SIZE}
            interactive={false}
            lod="standard"
            showGlow={true}
            glowOpacityMultiplier={pinned ? 0.05 : 1.0}
          />
        </Animated.View>
      </Suspense>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlayRoot: {
    // Fully transparent - no background
    justifyContent: "center",
    alignItems: "center",
    // Critical: allow glow to extend beyond bounds
    overflow: "visible",
  },
  overlayOrb: {
    position: "absolute",
    // Size includes glow extent
    width: TOTAL_ORB_SIZE,
    height: TOTAL_ORB_SIZE,
    // Critical: allow glow to extend beyond bounds
    overflow: "visible",
    // No background - fully transparent
    alignItems: "center",
    justifyContent: "center",
  },

});
