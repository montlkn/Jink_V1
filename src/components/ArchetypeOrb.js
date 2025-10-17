import React from 'react';
import { View, StyleSheet } from 'react-native';
import ArchetypeOrbR3F from './three/ArchetypeOrbR3F';
import ArchetypeOrbScene from './three/ArchetypeOrbScene';
import ArchetypeOrbV2 from './three/orb/ArchetypeOrbV2';

// Kill switch: hard-disable any orb rendering (stability hotfix)
const DISABLE_ORB = false;

// Feature flag for volumetric orb
// Enable by default to surface the new analytic orb
const ENABLE_VOLUMETRIC = true;

export default function ArchetypeOrb({ mode = 'clouds', style, lod = 'low', ...rest }) {
  // Global pause: render a lightweight placeholder to preserve layout
  if (DISABLE_ORB) {
    return <View style={[styles.placeholder, style]} pointerEvents="none" />;
  }
  try {
    console.log('ArchetypeOrb mode', mode);
  } catch (_) {}

  // Volumetric mode (Orb V2)
  if (mode === 'volumetric' || (ENABLE_VOLUMETRIC && mode === 'clouds')) {
    // Pass a conservative default LOD for safety unless caller overrides
    return <ArchetypeOrbV2 {...rest} lod={lod} style={style} />;
  }

  // Legacy shader mode
  if (mode === 'shader') {
    return <ArchetypeOrbR3F {...rest} style={style} />;
  }

  // Default: billboard clouds mode
  // Prefer sprite-based implementation for clouds by default (safe + efficient)
  return <ArchetypeOrbR3F {...rest} quality={lod === 'ultra' ? 'high' : 'high'} style={style} />;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
});
