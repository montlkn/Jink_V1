// LoadingOrbOptimized.js
import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Surface } from "gl-react-expo";
import { Node, Shaders, GLSL } from "gl-react";
import { BlurView } from "expo-blur";

const { width: WINDOW_W } = Dimensions.get("window");
const DEFAULT_SIZE = Math.min(WINDOW_W * 0.56, 340);

/*
 Optimizations applied here:
 - Render downsampled GL Surface (renderScale < 1) and upscale the view to save GPU pixels.
 - Throttle the shader time updates to 30fps (setInterval) to cut JS update cost.
 - Simplified FBM (fewer octaves).
 - Small, adjustable warp/grain amplitudes (turn off if needed).
 - Use native BlurView for frosted glass rim instead of simulating heavy blur in shader.
*/

const shaders = Shaders.create({
  Orb: {
    frag: GLSL`
precision highp float;
varying vec2 uv;
uniform float time;
uniform vec2 resolution;
uniform vec2 centers[4];
uniform vec3 colors[4];
uniform float blobRadius[4];
uniform float grainIntensity;
uniform float warpAmt;
uniform float chromaAmt;

float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
}
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
}
// simplified FBM (3 octaves — cheaper)
float fbm(in vec2 p){
  float f = 0.0;
  float amp = 0.5;
  for(int i=0;i<3;i++){
    f += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return f;
}

float blob(vec2 p, vec2 c, float radius){
  float d = length(p - c);
  float core = 1.0 - smoothstep(radius*0.0, radius*0.6, d);
  float edge = smoothstep(radius, radius * 0.25, d);
  return core * (1.0 - edge);
}

void main(){
  // normalize and center coordinate space
  vec2 p = (uv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0);

  float mask = smoothstep(1.0, 0.975, length(p)); // circular mask
  mask = clamp(mask, 0.0, 1.0);

  // warp/displacement from FBM (subtle)
  float n = fbm(p * 1.2 + time * 0.04);
  vec2 warp = (vec2(n) - 0.5) * warpAmt * 0.18;

  // compose blobs additively
  vec3 col = vec3(0.0);
  for(int i=0;i<4;i++){
    vec2 c = centers[i] + warp * (0.6 + 0.4 * float(i));
    float b = blob(p, c, blobRadius[i]);
    col += colors[i] * b;
  }

  // simple glow/tone mapping
  col = 1.0 - exp(-col * 1.5);

  // small chroma bloom approximation
  col.r += 0.01 * chromaAmt;
  col.b += 0.01 * chromaAmt;

  // vignette / glassiness
  float vign = smoothstep(0.85, 0.42, length(p));

  // grain (cheap hash-based)
  float g = (hash(uv * resolution.xy + fract(time)) - 0.5) * grainIntensity;

  vec3 finalColor = col * vign + g;

  // mix with a light glass tint and fade at edges
  vec3 glassTint = mix(vec3(1.0), finalColor, 0.82);
  float edgeFade = smoothstep(0.995, 0.93, length(p));

  gl_FragColor = vec4(mix(glassTint, finalColor, 0.58) * mask * edgeFade, mask * 0.94);
}
    `,
  },
});

export default function LoadingOrbOptimized({
  size = DEFAULT_SIZE,
  colors = [
    [0.02, 0.82, 0.9], // teal
    [0.96, 0.16, 0.62], // magenta
    [0.22, 0.94, 0.6], // green
    [0.18, 0.18, 0.92], // blue
  ],
  speed = 0.7,
  renderScale = 0.65, // <1.0 to render at lower res and upscale
  warpAmt = 0.7,
  grainIntensity = 0.015,
  chromaAmt = 0.9,
  fps = 30, // throttle frames to ~30fps (lower for more battery savings)
}) {
  // safety clamp for renderScale
  const scale = Math.max(0.35, Math.min(1.0, renderScale));
  const renderSize = Math.max(48, Math.round(size * scale));

  const [t, setT] = useState(0);
  const mountedRef = useRef(true);

  // throttle time updates to `fps` (30 by default)
  useEffect(() => {
    mountedRef.current = true;
    let last = Date.now();
    const interval = 1000 / fps;
    const timer = setInterval(() => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      // only update JS state at throttled rate
      setT((s) => s + dt * speed);
    }, interval);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [fps, speed]);

  // compute centers (simple sin/cos; can be swapped with Perlin generator)
  const centers = new Array(4).fill(0).map((_, i) => {
    const phase = t * (0.22 + i * 0.12);
    const x = 0.34 * Math.cos(phase + i * 1.1);
    const y = 0.25 * Math.sin(phase * 1.06 + i * 0.7);
    return [x, y];
  });

  const blobRadius = [0.78, 0.68, 0.88, 0.62];

  const colorVecs = colors.slice(0, 4).map((c) => c);

  const uniforms = {
    time: t,
    resolution: [renderSize, renderSize],
    centers,
    colors: colorVecs,
    blobRadius,
    grainIntensity,
    warpAmt,
    chromaAmt,
  };

  return (
    <View style={[styles.outer, { width: size, height: size }]}>
      {/* Native blur behind the surface for frosted edge */}
      <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
      <View
        style={{
          width: size,
          height: size,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: size / 2,
        }}
      >
        {/* Render the GL Surface at a downsampled size and upscale it via transform.
            This reduces pixel ops on the GPU while keeping the orb visually similar. */}
        <Surface
          style={{
            width: renderSize,
            height: renderSize,
            transform: [{ scale: 1 / scale }],
            borderRadius: size / 2,
            overflow: "hidden",
          }}
        >
          <Node shader={shaders.Orb} uniforms={uniforms} />
        </Surface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 9999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
});
