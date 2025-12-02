import { log } from "@/lib/log";
import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import GlassOrb from "../components/three/orb/GlassOrb";

// Constants
const BASE_ORB_SIZE = 360; // Canonical size - all other sizes are transforms of this
const GLOW_EXTENT = Math.max(80, BASE_ORB_SIZE * 0.35);

type OrbColors = {
  colorA: string;
  colorB: string;
  colorC: string;
};

type OrbPosition = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

type SingletonOrbContextType = {
  // Update colors (smooth transition)
  setColors: (colors: OrbColors) => void;
  // Set position/scale (for transforms)
  setPosition: (position: OrbPosition) => void;
  // Animate to position
  animateToPosition: (position: OrbPosition, duration?: number) => Promise<void>;
  // Current state
  colors: OrbColors;
  position: OrbPosition;
  isReady: boolean;
  // Hide/show the singleton (for screens that don't want it)
  setVisible: (visible: boolean) => void;
};

const defaultColors: OrbColors = {
  colorA: "#8cf",
  colorB: "#fff",
  colorC: "#fff",
};

const defaultPosition: OrbPosition = {
  x: 0,
  y: 0,
  scale: 1,
  opacity: 1,
};

const SingletonOrbContext = createContext<SingletonOrbContextType>({
  setColors: () => {},
  setPosition: () => {},
  animateToPosition: async () => {},
  colors: defaultColors,
  position: defaultPosition,
  isReady: false,
  setVisible: () => {},
});

export const useSingletonOrb = () => useContext(SingletonOrbContext);

export const SingletonOrbProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [colors, setColorsState] = useState<OrbColors>(defaultColors);
  const [position, setPositionState] = useState<OrbPosition>(defaultPosition);
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  // Animated values for smooth transforms
  const animX = useRef(new Animated.Value(0)).current;
  const animY = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(1)).current;
  const animOpacity = useRef(new Animated.Value(1)).current;

  const setColors = useCallback((newColors: OrbColors) => {
    setColorsState(newColors);
  }, []);

  const setPosition = useCallback((newPosition: OrbPosition) => {
    setPositionState(newPosition);
    animX.setValue(newPosition.x);
    animY.setValue(newPosition.y);
    animScale.setValue(newPosition.scale);
    animOpacity.setValue(newPosition.opacity);
  }, [animX, animY, animScale, animOpacity]);

  const animateToPosition = useCallback(
    (newPosition: OrbPosition, duration = 300): Promise<void> => {
      return new Promise((resolve) => {
        setPositionState(newPosition);
        Animated.parallel([
          Animated.timing(animX, {
            toValue: newPosition.x,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(animY, {
            toValue: newPosition.y,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(animScale, {
            toValue: newPosition.scale,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(animOpacity, {
            toValue: newPosition.opacity,
            duration,
            useNativeDriver: true,
          }),
        ]).start(() => resolve());
      });
    },
    [animX, animY, animScale, animOpacity]
  );

  const setVisible = useCallback((visible: boolean) => {
    setIsVisible(visible);
  }, []);

  const handleOrbReady = useCallback(() => {
    log.info("[SingletonOrb] Orb ready");
    setIsReady(true);
  }, []);

  const contextValue = useMemo(
    () => ({
      setColors,
      setPosition,
      animateToPosition,
      colors,
      position,
      isReady,
      setVisible,
    }),
    [setColors, setPosition, animateToPosition, colors, position, isReady, setVisible]
  );

  const { width, height } = Dimensions.get("window");
  const centerX = width / 2 - BASE_ORB_SIZE / 2 - GLOW_EXTENT;
  const centerY = height / 2 - BASE_ORB_SIZE / 2 - GLOW_EXTENT;

  return (
    <SingletonOrbContext.Provider value={contextValue}>
      <View style={styles.container}>
        {children}
        
        {/* Singleton Orb - rendered once, transformed everywhere */}
        {isVisible && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.orbContainer,
              {
                left: centerX,
                top: centerY,
                transform: [
                  { translateX: animX },
                  { translateY: animY },
                  { scale: animScale },
                ],
                opacity: animOpacity,
              },
            ]}
          >
            <GlassOrb
              size={BASE_ORB_SIZE}
              colorA={colors.colorA}
              colorB={colors.colorB}
              colorC={colors.colorC}
              onReady={handleOrbReady}
            />
          </Animated.View>
        )}
      </View>
    </SingletonOrbContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  orbContainer: {
    position: "absolute",
    width: BASE_ORB_SIZE + GLOW_EXTENT * 2,
    height: BASE_ORB_SIZE + GLOW_EXTENT * 2,
    zIndex: 1000, // Above most content
    overflow: "visible",
  },
});
