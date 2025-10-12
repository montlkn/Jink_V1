import React from 'react'
import { Pressable } from 'react-native'
import ArchetypeOrbR3F from './three/ArchetypeOrbR3F'

export default function ArchetypeOrb({ onPress, style, ...rest }) {
  const orb = <ArchetypeOrbR3F {...rest} style={style} />

  if (!onPress) {
    return orb
  }

  return (
    <Pressable onPress={onPress} hitSlop={12}>
      {orb}
    </Pressable>
  )
}
