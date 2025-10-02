import React, { useEffect, useMemo, useState, useRef } from "react";
import { View, StyleSheet, Dimensions, ActivityIndicator, Animated } from "react-native";
import { useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";

const { width: WINDOW_W } = Dimensions.get("window");
const DEFAULT_SIZE = Math.min(WINDOW_W * 0.56, 340);

// Shader source code as a string
const shaderSource = `
uniform float time;
uniform vec2 resolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float f = 0.0;
  float amp = 0.5;
  for(int i = 0; i < 3; i++) {
    f += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return f;
}

float blob(vec2 p, vec2 center, float radius) {
  float d = length(p - center);
  return smoothstep(radius, radius * 0.3, d);
}

vec4 main(vec2 fragCoord) {
  vec2 uv = (fragCoord * 2.0 - resolution) / min(resolution.x, resolution.y);
  float mask = smoothstep(1.0, 0.95, length(uv));

  vec2 c1 = vec2(0.3 * cos(time * 0.3), 0.25 * sin(time * 0.35));
  vec2 c2 = vec2(0.3 * cos(time * 0.28 + 2.1), 0.25 * sin(time * 0.32 + 2.1));
  vec2 c3 = vec2(0.3 * cos(time * 0.25 + 4.2), 0.25 * sin(time * 0.3 + 4.2));
  vec2 c4 = vec2(0.3 * cos(time * 0.33 + 1.0), 0.25 * sin(time * 0.27 + 1.0));

  float n = fbm(uv * 1.5 + time * 0.05);
  vec2 warp = (vec2(n) - 0.5) * 0.2;

  vec3 color = vec3(0.0);
  color += vec3(0.02, 0.82, 0.9) * blob(uv + warp * 0.5, c1, 0.7);
  color += vec3(0.96, 0.16, 0.62) * blob(uv + warp * 0.6, c2, 0.65);
  color += vec3(0.22, 0.94, 0.6) * blob(uv + warp * 0.7, c3, 0.8);
  color += vec3(0.18, 0.18, 0.92) * blob(uv + warp * 0.8, c4, 0.6);

  color = 1.0 - exp(-color * 1.3);
  float vignette = smoothstep(0.9, 0.4, length(uv));
  color *= vignette;

  float grain = (hash(fragCoord + fract(time)) - 0.5) * 0.02;
  color += grain;

  float edgeGlow = smoothstep(0.98, 0.88, length(uv)) * 0.3;
  vec3 glassTint = mix(vec3(1.0), color, 0.85);
  vec3 finalColor = mix(glassTint, color, 0.6) + edgeGlow;

  return vec4(finalColor * mask, mask * 0.95);
}
`;

export default function LoadingOrbSkia({ size = DEFAULT_SIZE }) {
  const [Canvas, setCanvas] = useState(null);
  const [Skia, setSkia] = useState(null);
  const [Fill, setFill] = useState(null);
  const [Group, setGroup] = useState(null);
  const [shader, setShader] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const time = useSharedValue(0);

  // Dynamically load Skia components
  useEffect(() => {
    const loadSkia = async () => {
      try {
        const skiaModule = await import("@shopify/react-native-skia");

        // Check if Skia is properly initialized
        if (!skiaModule?.Skia?.RuntimeEffect) {
          console.log("Skia not fully initialized, using fallback");
          setIsLoading(false);
          return;
        }

        setCanvas(() => skiaModule.Canvas);
        setSkia(skiaModule.Skia);
        setFill(() => skiaModule.Fill);
        setGroup(() => skiaModule.Group);

        // Compile shader
        const runtimeEffect = skiaModule.Skia.RuntimeEffect.Make(shaderSource);
        if (runtimeEffect) {
          setShader(runtimeEffect.makeShader());
        }
        setIsLoading(false);
      } catch (error) {
        console.log("Skia not available, using fallback:", error.message);
        setIsLoading(false);
      }
    };

    loadSkia();
  }, []);

  useEffect(() => {
    time.value = withRepeat(
      withTiming(100, { duration: 100000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Animated fallback component
  const AnimatedFallback = () => {
    const rotation = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const opacity1 = useRef(new Animated.Value(0.8)).current;
    const opacity2 = useRef(new Animated.Value(0.6)).current;
    const opacity3 = useRef(new Animated.Value(0.9)).current;
    const opacity4 = useRef(new Animated.Value(0.7)).current;

    useEffect(() => {
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.15, duration: 2000, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity1, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(opacity1, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity2, { toValue: 0.9, duration: 1800, useNativeDriver: true }),
          Animated.timing(opacity2, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity3, { toValue: 0.7, duration: 2200, useNativeDriver: true }),
          Animated.timing(opacity3, { toValue: 1, duration: 2200, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity4, { toValue: 0.9, duration: 1900, useNativeDriver: true }),
          Animated.timing(opacity4, { toValue: 0.5, duration: 1900, useNativeDriver: true }),
        ])
      ).start();
    }, []);

    const spin = rotation.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={styles.glassBg} />
        <Animated.View style={[styles.orbContainer, { transform: [{ rotate: spin }, { scale }] }]}>
          <Animated.View style={[styles.blob, styles.blob1, { opacity: opacity1, backgroundColor: 'rgba(5, 209, 230, 0.85)' }]} />
          <Animated.View style={[styles.blob, styles.blob2, { opacity: opacity2, backgroundColor: 'rgba(245, 40, 158, 0.85)' }]} />
          <Animated.View style={[styles.blob, styles.blob3, { opacity: opacity3, backgroundColor: 'rgba(56, 239, 153, 0.85)' }]} />
          <Animated.View style={[styles.blob, styles.blob4, { opacity: opacity4, backgroundColor: 'rgba(46, 46, 235, 0.85)' }]} />
        </Animated.View>
      </View>
    );
  };

  // Show animated fallback while loading or if Skia unavailable
  if (isLoading || !Canvas || !shader) {
    return <AnimatedFallback />;
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Canvas style={{ width: size, height: size }}>
        <Group>
          <Fill
            shader={shader}
            uniforms={{
              time,
              resolution: [size, size],
            }}
          />
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 9999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  fallback: {
    borderRadius: 9999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  glassBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 9999,
  },
  orbContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  blob: {
    position: "absolute",
    borderRadius: 9999,
  },
  blob1: {
    width: "65%",
    height: "65%",
    top: "10%",
    left: "15%",
  },
  blob2: {
    width: "55%",
    height: "55%",
    bottom: "15%",
    right: "20%",
  },
  blob3: {
    width: "70%",
    height: "70%",
    top: "20%",
    right: "10%",
  },
  blob4: {
    width: "50%",
    height: "50%",
    bottom: "25%",
    left: "25%",
  },
});
