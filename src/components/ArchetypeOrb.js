import React from 'react';
import ArchetypeOrbR3F from './three/ArchetypeOrbR3F';
import ArchetypeOrbScene from './three/ArchetypeOrbScene';

export default function ArchetypeOrb({ mode = 'clouds', style, ...rest }) {
  try {
    console.log('ArchetypeOrb mode', mode);
  } catch (_) {}

  if (mode === 'shader') {
    return <ArchetypeOrbR3F {...rest} style={style} />;
  }
  return <ArchetypeOrbScene {...rest} style={style} />;
}
