import { Float } from '@react-three/drei/native'
import { Canvas } from '@react-three/fiber/native'
import React, { useMemo, useRef } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import * as THREE from 'three'
import { processArchetypeData } from '../../utils/archetypeDataTransformer'

export default function ArchetypeOrbR3F({ archetypeData, size = 220, quality = 'high', orbitControls = false, style }) {
  const cloudConfigs = useMemo(() => processArchetypeData(archetypeData), [archetypeData])
  const effectiveConfigs = useMemo(
    () => (cloudConfigs.length > 0 ? cloudConfigs : processArchetypeData()),
    [cloudConfigs]
  )
  const dpr = quality === 'high' ? [1, 2] : [1, 1.5]
  const seg = quality === 'high' ? 128 : 64

  const isWeb = Platform.OS === 'web'
  const canvasRef = useRef()

  // Ensure Three only initialises once in native runtime
  if (typeof global !== 'undefined' && !global.THREE) {
    global.THREE = THREE
  }

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Canvas
        dpr={dpr}
        frameloop="always"
        msaaSamples={0}
        gl={{ powerPreference: 'high-performance', alpha: true, antialias: false, stencil: false, depth: true, preserveDrawingBuffer: false }}
        onCreated={(state) => {
          // Ensure transparent background and avoid MSAA paths
          state.gl.setClearColor(0x000000, 0)
          state.camera.position.set(0, 0, 3.5)
          state.camera.lookAt(0, 0, 0)
          canvasRef.current = state
        }}
        camera={{ position: [0, 0, 3.5], fov: 45, near: 0.1, far: 100 }}
        style={styles.canvas}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={0.8} />
        <directionalLight position={[-3, -2, -4]} intensity={0.4} color="#88aaff" />

        <group>
          <mesh>
            <sphereGeometry args={[1, seg, seg]} />
            <meshPhysicalMaterial
              transparent
              opacity={0.4}
              roughness={0.18}
              metalness={0.05}
              reflectivity={0.85}
              clearcoat={0.9}
              clearcoatRoughness={0.25}
              side={THREE.DoubleSide}
              color="#e2f2ff"
            />
          </mesh>

          {effectiveConfigs.map((config, index) => {
            const key = config.id || config.name || index
            const position = config.position || [0, 0, 0]
            const { width, length, depth } = config.dimensions || { width: 0.6, length: 0.45, depth: 0.3 }
            const scale = [width, length, depth]

            return (
              <Float
                key={key}
                speed={0.5 + index * 0.15}
                rotationIntensity={0.25 + index * 0.05}
                floatIntensity={quality === 'low' ? 0.12 : 0.35}
              >
                <group position={position}>
                  <mesh scale={scale}>
                    <sphereGeometry args={[0.45, quality === 'low' ? 20 : 36, quality === 'low' ? 18 : 32]} />
                    <meshStandardMaterial
                      color={config.color}
                      transparent
                      opacity={config.opacity}
                      emissive={config.color}
                      emissiveIntensity={0.22}
                      roughness={0.45}
                      metalness={0.12}
                      depthWrite={false}
                      blending={THREE.AdditiveBlending}
                    />
                  </mesh>
                </group>
              </Float>
            )
          })}
        </group>
      </Canvas>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
})
