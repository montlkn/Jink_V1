import React from 'react';
import { View, StyleSheet } from 'react-native';
import ArchetypeOrbV2 from './three/orb/ArchetypeOrbV2';

// Kill switch: hard-disable any orb rendering (stability hotfix)
const DISABLE_ORB = false;

/**
 * ArchetypeOrb: Main entry point for the orb visualization
 *
 * Now uses glass-only implementation with gyroscope-driven reflections.
 * All modes route to the same glass orb for consistency.
 *
 * Props:
 * - mode: 'glass' (default) - kept for API compatibility
 * - archetypeData: array of archetype objects
 * - xpLevel: current XP level
 * - xpProgress: progress within current level (0..1)
 * - size: orb diameter in pixels
 * - lod: level of detail ('ultra' | 'standard' | 'low' | 'safe')
 * - style: additional React Native styles
 * - onPress: callback for press events
 * - interactive: enable press events (default false)
 */
export default function ArchetypeOrb({ mode = 'glass', style, lod = 'standard', ...rest }) {
  // Global pause: render a lightweight placeholder to preserve layout
  if (DISABLE_ORB) {
    return <View style={[styles.placeholder, style]} pointerEvents="none" />;
  }

  try {
    console.log('[ArchetypeOrb] Rendering glass orb with lod:', lod);
  } catch (_) {}

  // All modes now use the glass implementation
  return <ArchetypeOrbV2 {...rest} lod={lod} style={style} />;
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
