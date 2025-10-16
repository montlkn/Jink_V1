import React from 'react';
import ArchetypeOrbR3F from './three/ArchetypeOrbR3F';
import ArchetypeOrbScene from './three/ArchetypeOrbScene';
import ArchetypeOrbV2 from './three/orb/ArchetypeOrbV2';

// Feature flag for volumetric orb
// Set to true to enable new volumetric smoke implementation
const ENABLE_VOLUMETRIC = true; // Re-enabled with optimized shader

export default function ArchetypeOrb({ mode = 'clouds', style, ...rest }) {
  try {
    console.log('ArchetypeOrb mode', mode);
  } catch (_) {}

  // Volumetric mode (Orb V2)
  if (mode === 'volumetric' || (ENABLE_VOLUMETRIC && mode === 'clouds')) {
    return <ArchetypeOrbV2 {...rest} style={style} />;
  }

  // Legacy shader mode
  if (mode === 'shader') {
    return <ArchetypeOrbR3F {...rest} style={style} />;
  }

  // Default: billboard clouds mode
  return <ArchetypeOrbScene {...rest} style={style} />;
}
