import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";
import ArchetypeOrb from "../components/ArchetypeOrb";

const DEFAULT_TRANSITION_DURATION = 520;
const DEFAULT_EASING = Easing.out(Easing.cubic);
const ORB_SIZE = 360;

const OrbTransitionContext = createContext({
  registerHomeOrbLayout: (layout) => {},
  setOrbData: (data) => {},
  startHomeToJinkTransition: async () => false,
  transitionProgress: new Animated.Value(0),
  isTransitioning: false,
  orbData: [],
});

export const OrbTransitionProvider = ({ children }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [renderOverlay, setRenderOverlay] = useState(false);
  const [homeOrbLayout, setHomeOrbLayout] = useState(null);
  const [orbData, setOrbData] = useState([]);

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
      transitionProgress: progress,
      isTransitioning,
      orbData,
    }),
    [
      registerHomeOrbLayout,
      setOrbData,
      startHomeToJinkTransition,
      progress,
      isTransitioning,
      orbData,
    ]
  );

  const overlay = renderOverlay ? (
    <OrbTransitionOverlay
      progress={progress}
      layout={homeOrbLayout}
      orbData={orbData}
    />
  ) : null;

  return (
    <OrbTransitionContext.Provider value={contextValue}>
      <View style={styles.flex}>
        {children}
        {overlay}
      </View>
    </OrbTransitionContext.Provider>
  );
};

export const useOrbTransition = () => {
  return useContext(OrbTransitionContext);
};

const OrbTransitionOverlay = ({ progress, layout, orbData }) => {
  const { width, height } = Dimensions.get("window");
  const baseLeft = width / 2 - ORB_SIZE / 2;
  const baseTop = height / 2 - ORB_SIZE / 2;

  const fromLeft = layout ? layout.x : baseLeft;
  const fromTop = layout ? layout.y : baseTop;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [fromLeft - baseLeft, 0],
    extrapolate: "clamp",
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [fromTop - baseTop, 0],
    extrapolate: "clamp",
  });

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.85],
    extrapolate: "clamp",
  });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlayRoot]}>
      <Animated.View
        style={[
          styles.overlayOrb,
          {
            left: baseLeft,
            top: baseTop,
            transform: [{ translateX }, { translateY }, { scale }],
          },
        ]}
      >
        <ArchetypeOrb
          archetypeData={orbData}
          size={ORB_SIZE}
          interactive={false}
          lod="standard"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlayRoot: {
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayOrb: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
});
