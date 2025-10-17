# ArchetypeOrb: React Native R3F Implementation Guide

## Overview
A glass orb component with three swirling, color-blending smoke clouds inside, sized by user's top 3 aesthetic archetype percentages. Built exclusively for React Native using @react-three/fiber/native and @react-three/drei/native.

---

## Architecture Decision

### Component Structure
**Recommended: Two-file modular approach**

```
src/
├── components/
│   ├── ArchetypeOrb.jsx          # Public API wrapper (handles props validation, defaults)
│   └── three/
│       └── ArchetypeOrbScene.jsx  # R3F Canvas + 3D scene implementation
```

**Rationale:**
- **Separation of concerns**: UI logic separate from 3D rendering logic
- **Reusability**: Scene can be embedded in different contexts (fullscreen, preview, etc.)
- **Testing**: Easier to test props handling vs. 3D rendering independently
- **Performance**: Wrapper can implement memoization without polluting 3D code

---

## Phase 1: Project Setup & Dependencies

### 1.1 Verify Existing Dependencies
```bash
# Check package.json for these dependencies
expo-gl
expo-asset
three
@react-three/fiber
@react-three/drei
```

### 1.2 Install Missing Dependencies (if needed)
```bash
npx expo install expo-gl expo-asset
npm install three @react-three/fiber @react-three/drei
```

### 1.3 Verify R3F Native Setup
Ensure `metro.config.js` has proper resolver aliases for native imports:

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

config.resolver.resolverMainFields = [
  'react-native',
  'browser',
  'main',
];

module.exports = config;
```

---

## Phase 2: Constants & Color Mapping

### 2.1 Create Archetype Color Constants
**File:** `src/constants/archetypeColors.js`

```javascript
export const ARCHETYPE_COLORS = {
  Classicist: '#8B4513',        // Saddle Brown
  Romantic: '#8B008B',          // Dark Magenta
  Stylist: '#FFD700',           // Gold
  Modernist: '#2F4F4F',         // Dark Slate Gray
  Industrialist: '#A0522D',     // Sienna
  Visionary: '#FF6347',         // Tomato
  'Pop Culturalist': '#FF69B4', // Hot Pink
  Vernacularist: '#228B22',     // Forest Green
  Austerist: '#696969',         // Dim Gray
  Infrastructuralist: '#4682B4', // Steel Blue
  Naturalist: '#8FBC8F',        // Dark Sea Green
};

/**
 * Get color for an archetype name (case-insensitive, handles variations)
 */
export const getArchetypeColor = (archetypeName) => {
  const normalized = archetypeName.trim();
  return ARCHETYPE_COLORS[normalized] || '#FFFFFF'; // Fallback to white
};
```

---

## Phase 3: Data Processing Logic

### 3.1 Create Data Transformer Utility
**File:** `src/utils/archetypeDataTransformer.js`

```javascript
import { getArchetypeColor } from '../constants/archetypeColors';

/**
 * Process raw archetype data into cloud configuration
 * @param {Array<{name: string, percentage: number}>} archetypeData
 * @returns {Array<CloudConfig>}
 */
export const processArchetypeData = (archetypeData) => {
  // 1. Sort by percentage descending, take top 3
  const topThree = [...archetypeData]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  // 2. Map to cloud configurations
  return topThree.map((archetype, index) => {
    const { name, percentage } = archetype;
    
    // Size factor: larger percentages = larger clouds
    // Range: ~0.1 (for 0%) to ~2.1 (for 100%)
    const sizeFactor = percentage * 2 + 0.1;
    
    // Opacity: more prominent archetypes = more opaque
    // Range: 0.35 to 0.85
    const opacity = Math.min(Math.max(0.35 + percentage * 0.4, 0.35), 0.85);
    
    // Cloud dimensions based on size factor
    const baseScale = 0.3; // Base cloud size
    const width = baseScale * sizeFactor;
    const length = baseScale * sizeFactor * 0.8;
    const depth = baseScale * sizeFactor * 0.6;
    
    return {
      id: `cloud-${index}`,
      name,
      percentage,
      color: getArchetypeColor(name),
      sizeFactor,
      opacity,
      dimensions: { width, length, depth },
      // Position: evenly distributed in 3D space inside sphere
      position: getCloudPosition(index, 3),
      // Rotation: each cloud rotates at different speed for variety
      rotationSpeed: 0.1 + (index * 0.05),
    };
  });
};

/**
 * Calculate stable, non-overlapping positions for clouds inside sphere
 * Positions arranged in a triangular formation when viewed from front
 * @param {number} index - Cloud index (0-2)
 * @param {number} total - Total number of clouds
 * @returns {[number, number, number]} - [x, y, z] position
 */
const getCloudPosition = (index, total) => {
  const radius = 0.65; // Inner radius (clouds stay well inside the orb)
  
  // Arrange in triangular pattern
  const angle = (index * (Math.PI * 2)) / total - Math.PI / 2;
  
  return [
    Math.cos(angle) * radius * 0.5, // x: horizontal spread
    Math.sin(angle) * radius * 0.5, // y: vertical spread
    (index - 1) * 0.2,              // z: slight depth offset
  ];
};
```

---

## Phase 4: Core R3F Scene Component

### 4.1 Create Scene Component
**File:** `src/components/three/ArchetypeOrbScene.jsx`

```javascript
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { 
  Sphere, 
  Cloud, 
  Clouds, 
  Float,
  MeshTransmissionMaterial 
} from '@react-three/drei/native';
import * as THREE from 'three';
import { processArchetypeData } from '../../utils/archetypeDataTransformer';

/**
 * Individual swirling cloud with orbital motion
 */
const SwirlingCloud = ({ config, orbitSpeed }) => {
  const cloudRef = useRef();
  const orbitRef = useRef();
  
  // Track rotation angle for orbital motion
  const orbitAngle = useRef(Math.random() * Math.PI * 2); // Random start

  useFrame((state, delta) => {
    if (!orbitRef.current) return;
    
    // Orbital rotation around center
    orbitAngle.current += config.rotationSpeed * delta;
    
    // Apply orbital position
    const orbitRadius = 0.4;
    orbitRef.current.position.x = 
      config.position[0] + Math.cos(orbitAngle.current) * orbitRadius;
    orbitRef.current.position.z = 
      config.position[2] + Math.sin(orbitAngle.current) * orbitRadius;
  });

  return (
    <group ref={orbitRef} position={config.position}>
      <Float
        speed={1.5} // Speed of floating motion
        rotationIntensity={0.3} // Gentle rotation
        floatIntensity={0.5} // Gentle float
      >
        <Cloud
          ref={cloudRef}
          opacity={config.opacity}
          color={config.color}
          speed={0.2}
          width={config.dimensions.width}
          depth={config.dimensions.depth}
          segments={30}
          // Enable color blending
          transparent
          depthWrite={false}
        />
      </Float>
    </group>
  );
};

/**
 * Main R3F Scene
 */
export const ArchetypeOrbScene = ({ 
  archetypeData, 
  size = 220,
  quality = 'high',
  orbitControls = false 
}) => {
  // Process archetype data into cloud configs
  const cloudConfigs = useMemo(
    () => processArchetypeData(archetypeData),
    [archetypeData]
  );

  // Quality-based settings
  const settings = useMemo(() => {
    if (quality === 'low') {
      return {
        sphereSegments: 64,
        transmissionSamples: 6,
        transmissionResolution: 128,
      };
    }
    return {
      sphereSegments: 128,
      transmissionSamples: 8,
      transmissionResolution: 256,
    };
  }, [quality]);

  return (
    <>
      {/* Lighting Rig - No HDR Environment */}
      <ambientLight intensity={0.4} />
      <hemisphereLight 
        skyColor="#ffffff" 
        groundColor="#888888" 
        intensity={0.6} 
      />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, -5]} intensity={0.4} color="#4488ff" />

      {/* Glass Orb - Native-compatible material */}
      <Sphere args={[1, settings.sphereSegments, settings.sphereSegments]}>
        <meshPhysicalMaterial
          transmission={0.95}
          thickness={0.5}
          roughness={0.05}
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          ior={1.45}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          envMapIntensity={1}
        />
      </Sphere>

      {/* Swirling Clouds Inside Orb */}
      <Clouds material={THREE.MeshBasicMaterial}>
        {cloudConfigs.map((config) => (
          <SwirlingCloud 
            key={config.id} 
            config={config}
            orbitSpeed={0.2}
          />
        ))}
      </Clouds>
    </>
  );
};
```

---

## Phase 5: Public Wrapper Component

### 5.1 Create Public API Component
**File:** `src/components/ArchetypeOrb.jsx`

```javascript
import React, { Suspense } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { ArchetypeOrbScene } from './three/ArchetypeOrbScene';

/**
 * ArchetypeOrb - Public component
 * Renders a glass orb with swirling colored smoke clouds representing 
 * the user's top 3 aesthetic archetypes
 */
export const ArchetypeOrb = ({ 
  archetypeData,
  size = 220,
  quality = 'high',
  style,
  orbitControls = false,
}) => {
  // Validation
  if (!archetypeData || archetypeData.length === 0) {
    console.warn('ArchetypeOrb: No archetype data provided');
    return null;
  }

  // Quality-based DPR
  const dpr = quality === 'low' ? [1, 1.5] : [1, 2];

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Canvas
        camera={{ 
          position: [0, 0, 3.5], 
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        dpr={dpr}
        gl={{ 
          powerPreference: 'high-performance',
          alpha: true,
          antialias: true,
        }}
      >
        <Suspense fallback={null}>
          <ArchetypeOrbScene
            archetypeData={archetypeData}
            size={size}
            quality={quality}
            orbitControls={orbitControls}
          />
        </Suspense>
      </Canvas>
      
      {/* Optional loading indicator */}
      <View style={styles.loadingContainer} pointerEvents="none">
        <ActivityIndicator size="small" color="#888" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

---

## Phase 6: Integration & Usage

### 6.1 Example Integration in Screen
**File:** `src/screens/ProfileScreen.jsx` (or wherever you need it)

```javascript
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { ArchetypeOrb } from '../components/ArchetypeOrb';

export const ProfileScreen = () => {
  // Example: Get user's archetype data from state/context/API
  const userArchetypes = [
    { name: 'Romantic', percentage: 0.25 },
    { name: 'Modernist', percentage: 0.20 },
    { name: 'Classicist', percentage: 0.15 },
    { name: 'Naturalist', percentage: 0.12 },
    { name: 'Stylist', percentage: 0.10 },
    { name: 'Visionary', percentage: 0.08 },
    { name: 'Austerist', percentage: 0.05 },
    { name: 'Industrialist', percentage: 0.03 },
    { name: 'Vernacularist', percentage: 0.02 },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Aesthetic Profile</Text>
      
      <ArchetypeOrb
        archetypeData={userArchetypes}
        size={280}
        quality="high"
        style={styles.orb}
      />
      
      <Text style={styles.subtitle}>
        Top Archetypes: Romantic, Modernist, Classicist
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 32,
  },
  orb: {
    marginVertical: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 16,
  },
});
```

---

## Phase 7: Testing & Optimization

### 7.1 Device Testing Checklist
- [ ] Test on iOS device (iPhone 12+)
- [ ] Test on Android device (flagship)
- [ ] Test on lower-end Android (quality='low')
- [ ] Monitor FPS using React DevTools profiler
- [ ] Check memory usage over 2-3 minutes
- [ ] Test with different archetype data combinations

### 7.2 Performance Tuning

**If FPS < 30fps on target device:**

1. **Reduce cloud complexity:**
```javascript
// In ArchetypeOrbScene.jsx
<Cloud
  segments={20}  // Down from 30
  // ... other props
/>
```

2. **Lower transmission samples:**
```javascript
// In quality settings
transmissionSamples: 4,  // Down from 6/8
transmissionResolution: 128, // Down from 256
```

3. **Reduce sphere segments:**
```javascript
sphereSegments: 48,  // Down from 64
```

4. **Disable Float on low quality:**
```javascript
{quality === 'low' ? (
  <Cloud {...props} />
) : (
  <Float><Cloud {...props} /></Float>
)}
```

### 7.3 Visual Tuning

**If glass doesn't look refractive enough:**
- Increase `ior` to 1.5
- Increase `thickness` to 0.7
- Add stronger backlight: `<pointLight position={[0, 0, -3]} intensity={1.2} />`

**If clouds are too faint:**
- Increase base opacity in `processArchetypeData`: `0.5 + percentage * 0.4`
- Add emissive property: `emissive={config.color}` `emissiveIntensity={0.3}`

**If colors don't blend well:**
- Ensure `depthWrite={false}` on Cloud
- Add: `blending={THREE.AdditiveBlending}` for glow effect
- Adjust cloud `speed` prop for more/less movement

---

## Phase 8: Error Handling & Edge Cases

### 8.1 Add PropTypes/TypeScript Validation
**File:** `src/components/ArchetypeOrb.jsx`

```javascript
import PropTypes from 'prop-types';

ArchetypeOrb.propTypes = {
  archetypeData: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      percentage: PropTypes.number.isRequired,
    })
  ).isRequired,
  size: PropTypes.number,
  quality: PropTypes.oneOf(['low', 'high']),
  style: PropTypes.object,
  orbitControls: PropTypes.bool,
};
```

### 8.2 Handle Edge Cases

```javascript
// In processArchetypeData
export const processArchetypeData = (archetypeData) => {
  // Guard: empty or invalid data
  if (!Array.isArray(archetypeData) || archetypeData.length === 0) {
    console.warn('Invalid archetype data');
    return [];
  }

  // Guard: ensure percentages are normalized (sum to ~1.0)
  const total = archetypeData.reduce((sum, a) => sum + a.percentage, 0);
  const normalized = total > 0 
    ? archetypeData.map(a => ({ ...a, percentage: a.percentage / total }))
    : archetypeData;

  // ... rest of function
};
```

---

## Phase 9: Advanced Features (Future)

### 9.1 Add Drei Lightformer for Better Reflections
```javascript
import { Lightformer } from '@react-three/drei/native';

// Inside ArchetypeOrbScene
<Lightformer
  intensity={1}
  form="ring"
  color="white"
  scale={[10, 5]}
  position={[0, 0, -5]}
/>
```

### 9.2 Add Interaction (Tap to Rotate)
```javascript
// Add to ArchetypeOrb.jsx
import { OrbitControls } from '@react-three/drei/native';

// Inside Canvas (dev only)
{orbitControls && (
  <OrbitControls
    enableZoom={false}
    enablePan={false}
  />
)}
```

### 9.3 Add Cube Camera Reflection Probe
```javascript
import { CubeCamera } from '@react-three/drei/native';

// Wrap the sphere for real-time reflections
<CubeCamera resolution={256} frames={1}>
  {(texture) => (
    <Sphere args={[1, 128, 128]}>
      <MeshTransmissionMaterial
        envMap={texture}
        // ... other props
      />
    </Sphere>
  )}
</CubeCamera>
```

---

## Phase 10: Documentation

### 10.1 Component API Documentation

#### ArchetypeOrb Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `archetypeData` | `Array<{name: string, percentage: number}>` | **required** | User's archetype data. At least 3 items recommended. |
| `size` | `number` | `220` | Canvas width/height in pixels |
| `quality` | `'low' \| 'high'` | `'high'` | Rendering quality preset |
| `style` | `ViewStyle` | `undefined` | Additional React Native styles |
| `orbitControls` | `boolean` | `false` | Enable manual rotation (dev only) |

#### Example Archetype Data Format
```javascript
[
  { name: 'Romantic', percentage: 0.25 },      // 25%
  { name: 'Modernist', percentage: 0.20 },     // 20%
  { name: 'Classicist', percentage: 0.15 },    // 15%
  // ... rest of archetypes
]
```

**Note:** Component automatically selects top 3 by percentage.

---

## Troubleshooting

### Issue: `EXGL: renderbufferStorageMultisample() isn't implemented yet!`
**Solution:** Expo GL on native will still invoke multisample renderbuffer paths when using transmission even without samples/resolution settings. The reliable fix is to remove transmission entirely and hard-disable multisampling in the renderer.

Implementation details:
- Set `msaaSamples={0}` on the `<Canvas>` and keep `antialias` off in the GL config.
- Inside `onCreated`, call `gl.disable(gl.SAMPLE_COVERAGE)` and `gl.disable(gl.MULTISAMPLE)` when available to avoid extension-triggered multisample calls.
- Use a transmission-free physical material that leans on opacity, clearcoat, and reflectivity for the glass sheen:

```javascript
<meshPhysicalMaterial
  transparent
  opacity={0.32}
  roughness={0.12}
  metalness={0.05}
  reflectivity={0.85}
  clearcoat={0.9}
  clearcoatRoughness={0.28}
  side={THREE.DoubleSide}
/>
```

### Issue: `EXGL: gl.pixelStorei() doesn't support this parameter yet!`
**Solution:** Three.js toggles pixel-store flags (`UNPACK_FLIP_Y_WEBGL`, `UNPACK_PREMULTIPLY_ALPHA_WEBGL`, `UNPACK_COLORSPACE_CONVERSION_WEBGL`, etc.) that Expo GL does not implement on native. To stop the host-function warning, install `installExpoGLGuards` before the app renders (e.g., top of `App.js`). The guard proxies `global.__EXGLContexts` so every context registered by `expo-gl` has `pixelStorei` replaced with a safe no-op for those unsupported enums before Three can call it. Example:

```js
// App.js
import { installExpoGLGuards } from './src/utils/expoGLGuards';

installExpoGLGuards({ verbose: __DEV__ });
```

The utility also patches WebGL prototypes when available, so headless contexts created later remain safe.

### Issue: "Cannot find module '@react-three/fiber/native'"
**Solution:** Ensure you're importing from `/native` path:
```javascript
import { Canvas } from '@react-three/fiber/native';
import { Sphere } from '@react-three/drei/native';
```

### Issue: Black screen on device
**Solution:** 
1. Check Metro bundler is running
2. Verify `expo-gl` is installed
3. Check console for WebGL errors
4. Reduce quality settings

### Issue: Clouds not visible
**Solution:**
1. Increase opacity in data transformer
2. Check cloud colors aren't black
3. Add emissive property for glow
4. Verify clouds are inside sphere bounds (radius < 0.65)

### Issue: Poor performance
**Solution:**
1. Set `quality="low"`
2. Reduce `transmissionSamples` to 4
3. Lower sphere segments to 48
4. Remove Float component
5. Reduce cloud `segments` to 15-20

### Issue: Colors not blending
**Solution:**
1. Add `blending={THREE.AdditiveBlending}` to Cloud
2. Ensure `transparent={true}` and `depthWrite={false}`
3. Increase opacity overlap
4. Reduce orbital radius for more intersection

---

## Performance Benchmarks (Target)

| Device | Quality | FPS | Notes |
|--------|---------|-----|-------|
| iPhone 14 Pro | High | 60 | Smooth, full quality |
| iPhone 12 | High | 50-60 | Occasional drops |
| iPhone 12 | Low | 60 | Stable |
| Galaxy S23 | High | 55-60 | Good |
| Galaxy S21 | Low | 45-60 | Acceptable |

---

## Acceptance Criteria Checklist

- [ ] Glass orb renders with refractive properties on iOS
- [ ] Glass orb renders with refractive properties on Android
- [ ] Three clouds appear inside orb with correct colors
- [ ] Cloud sizes correlate with archetype percentages
- [ ] Clouds orbit/drift smoothly inside orb
- [ ] Colors blend where clouds overlap
- [ ] No console errors or warnings
- [ ] Maintains 30+ FPS on target devices
- [ ] No memory leaks after 3 minutes
- [ ] Component accepts valid archetype data
- [ ] Handles edge cases (empty data, invalid names)

---

## File Checklist

- [ ] `src/constants/archetypeColors.js`
- [ ] `src/utils/archetypeDataTransformer.js`
- [ ] `src/components/three/ArchetypeOrbScene.jsx`
- [ ] `src/components/ArchetypeOrb.jsx`
- [ ] Integration in target screen

---

## Estimated Implementation Time

- **Phase 1-2:** 30 minutes (setup & constants)
- **Phase 3:** 45 minutes (data processing)
- **Phase 4:** 2 hours (R3F scene)
- **Phase 5:** 30 minutes (wrapper component)
- **Phase 6:** 30 minutes (integration)
- **Phase 7:** 1-2 hours (testing & tuning)
- **Phase 8:** 30 minutes (error handling)

**Total:** 5-6 hours for senior developer

---

## Next Steps After Implementation

1. Gather user feedback on visual appeal
2. A/B test different glass material settings
3. Consider adding haptic feedback on interaction
4. Explore animation on profile load (orb fades in)
5. Add accessibility labels for screen readers
6. Implement screenshot/share functionality
