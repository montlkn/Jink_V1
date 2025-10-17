# Frontend: App Structure

## Summary
Defines the main screens, navigation hierarchy, and state layers that make up JINK’s client-side experience.

## Core Screens
- **Home:** Orb, aesthetic donut, featured landmark
- **Camera:** Primary scanning screen
- **Derive:** Walk setup and live route view
- **Passport:** Lists, stamps, achievements
- **Profile:** Aesthetic breakdown, XP level, and orb state

## Navigation
React Navigation stack + tab bar
- Tabs: Home, Camera, Derive, Passport, Profile
- Nested stack for modal views (e.g., memory composer, stamp detail)

## Global State
Zustand store manages: user, XP, active walk, orb, profile

> *Structure should guide exploration, not constrain it.*
