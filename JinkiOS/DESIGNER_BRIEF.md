# Jink — Designer Brief

## What Is Jink?

Jink is a location-based architecture exploration app for NYC. It gamifies urban building discovery through three core loops:

1. **Scan** — Point your camera at a building. AI identifies it, awards XP, and delivers its architectural story.
2. **Walk (Jink)** — Take procedurally generated walking tours through neighborhoods. A compass guides you building-to-building. Scan each stop to verify and earn XP.
3. **Collect** — Your passport fills with stamps, achievements, and walk history. Your aesthetic profile evolves as you explore.

The app is live and in beta testing in NYC.

---

## Target User

- Architecture enthusiasts, urban explorers, design-forward walkers
- 25–45, design-literate, curious about cities
- The kind of person who notices buildings, reads AIA guides, and has opinions about Brutalism
- Not a gamer — but responds to progression systems when they feel earned and elegant

---

## Core Features

| Feature | Description |
|---------|-------------|
| **Scan** | Camera → AI → building ID → XP + lore. Supports ultra-wide lens toggle. |
| **Walk** | 15–80 min procedurally generated tours. Glass compass navigation, AR proximity scan to verify each stop. |
| **Passport** | User profile hub. XP level, streak, scanned buildings, stamps, achievements, walk history. |
| **Explore** | Map-based building discovery with archetype filters. Community posts pinned to locations. |
| **Tours** | Curated guided routes (pre-built, not procedural). Checkpoint-based. |
| **Lists** | Curated building collections ("Deco Giants", "Brutalist Beacons"). User-saveable. |
| **Quiz** | Onboarding aesthetic quiz that discovers your architectural archetype and seeds initial XP. |

---

## Navigation Architecture

```
Tab Bar: [Explore] [Scan] [Walk] [Passport]
```

- Each tab is a `NavigationStack`
- Detail views push within the stack (building info, tour stops)
- Sheets for modals (stamp detail, building save, community post)
- `FullScreenCover` for camera and AR experiences
- `AppState` is a root `@Observable` environment object shared across all tabs

---

## Color System

### Primary Accent
`#00AEEF` — Cyan/bright blue. Used for interactive elements, badges, progress, tints throughout.

### Brand Status Colors
| Role | Hex |
|------|-----|
| Error | `#FF0000` |
| Success | `#76B900` |
| Warning | `#FF4400` |

### Archetype Colors (9 Design Movements)
Each building has a primary aesthetic archetype. These colors are used for tagging, filtering, and the user's aesthetic profile orb.

| Archetype | Hex |
|-----------|-----|
| Classicist | `#808000` |
| Romantic | `#DC143C` |
| Stylist | `#B8860B` |
| Modernist | `#0066FF` |
| Industrialist | `#FF8C00` |
| Visionary | `#008080` |
| Pop Culturalist | `#FF1493` |
| Vernacularist | `#32CD32` |
| Austerist | `#455A64` |

### XP Level Tier Colors
Users progress through 50 levels across 4 tiers:

| Tier | Levels | Hex |
|------|--------|-----|
| Explorer | 1–10 | `#10b981` (Emerald) |
| Connoisseur | 11–20 | `#3b82f6` (Cobalt) |
| Authority | 21–30 | `#a855f7` (Purple) |
| Mythic | 31–50 | `#f59e0b` (Gold) |

### Stamp Rarity Colors
| Rarity | Color |
|--------|-------|
| Common | Light gray `(0.85 white)` |
| Rare | Blue `#4A6B8A` |
| Epic | Purple `#6B4A8A` |
| Legendary | Gold `#FFD700` |

### Passport Context Colors
| Element | Hex |
|---------|-----|
| Stamp | `#DC143C` (Crimson) |
| Achievement | `#00C853` (Green) |
| Walk | `#E65100` (Orange) |
| Streak | `#F50057` (Pink) |
| List | `#FFC107` (Amber) |

### Structural Colors
| Role | Value |
|------|-------|
| Feature card background | `#1a1a2e` (dark navy) |
| Primary interactive | `#00AEEF` |

---

## Typography

The app uses iOS system fonts with intentional design variant selection:

| Variant | Usage |
|---------|-------|
| `.rounded` | Numbers, XP values, level display, approachable CTAs |
| `.monospaced` | Passport numbers, dates, level badges, data labels, route instructions |
| `.serif` | Building lore, stamp descriptions, archival/poetic text |
| Default | Body text, UI labels |

### Approximate Scale
| Size | Usage |
|------|-------|
| 8–9pt | Rarity chips, small badges, micro labels |
| 10–11pt | Status badges ("LEVEL 5"), monospaced data |
| 13pt | Card descriptions, metadata |
| 15–16pt | Body text, action labels |
| 26pt | Large stamp/achievement titles |
| 34pt | Page headers (Passport, etc.) |
| 42pt | Route instruction text (large, bold, at-a-glance) |

**Key conventions:**
- Numbers that stack/animate use `.monospacedDigit()` to prevent layout shifting
- Section headers use `.uppercase()` + wide kerning (1.0–2.5pt)
- Accessibility large text: not currently supported — a gap to address

---

## Animation Philosophy

The app is *alive*. Every major component breathes, pulses, or responds to touch.

### Principles
- **Breathing** — Idle states pulse gently (2–5s ease-in-out loops, scale 0.96–1.04)
- **Spring physics** — All interactions use spring curves (`response: 0.2–0.6, dampingFraction: 0.4–0.95`)
- **Haptic pairing** — Every meaningful interaction has a paired haptic (`.heavy` for walk completion, `.medium` for scan verify, `.light` for minor feedback)
- **Gyro-responsive** — Key components (ArchetypeOrb, MetalStampCard, XPGlassOrb) react to device tilt via CoreMotion, creating a physical depth illusion
- **Layered motion** — Multiple animations at different durations create organic, non-robotic movement

### Key Animation Patterns
| Pattern | Duration | Usage |
|---------|----------|-------|
| Breathing glow | 2.0–5.0s | ArchetypeOrb layers |
| Spring tap | 0.18s squish + 0.45s release | All tap interactions |
| XP bump | 0.2s scale to 1.4x | XP counter on earn |
| Flash overlay | 0.08s in, 0.35s out | Green flash on building verify |
| Shimmer sweep | 6.4s cycle | Walk start instruction text |
| Numeric transition | `contentTransition(.numericText())` | XP and count updates |

---

## Materials & Depth

The app uses iOS material system extensively to create depth without heavy backgrounds:

| Material | Usage |
|----------|-------|
| `.regularMaterial` | Walk building card, capsule pills, main card containers |
| `.ultraThinMaterial` | Scan loading overlay, subtle overlays |
| `color.opacity(0.08–0.15)` | Tinted card backgrounds (StatCards, achievement cards) |
| `Color(.systemGray6)` | Secondary cards (walk rows, scanned buildings) |

**Shadow convention:** Most cards use 2-layer shadows:
- `shadow(color: .black.opacity(0.10–0.12), radius: 10–16, y: 6–8)` — soft depth
- Accent color shadows on glowing components (orb, compass)

---

## Key Components

### ArchetypeOrb
The hero visual of the passport. A Metal-rendered glass sphere blending the user's top 3 architectural archetypes into a living color gradient. Multi-layer animated glow system (4 layers, offset timing). Tap to open archetype breakdown. Appears on both the Passport screen and the Scan button.

### MetalStampCard (→ now used for Achievements)
A Metal-shader-rendered 3D shield with raymarched procedural crests. 8 crest types (castle, columns, star, flame, eye, crown, path, dawn skyline). 4 rarity material finishes (brushed silver, blue steel, iridescent, holographic gold). Responds to device tilt in real-time.

### VintageStampCard (new — Stamps)
Victorian postage stamp aesthetic. Perforated scalloped border, aged paper background, ornamental inner frame with corner flourishes, central circular medallion with building silhouette/icon, curved text arcs (title top, rarity bottom). Two-tone ink + paper color system by rarity. Canvas-drawn grain texture.

### GlassCompass
200pt glass orb compass used during walks. Hot/cold color glow based on bearing alignment to target building. Green = arrived, red = locked on, orange = warm, blue = cold. Canvas-drawn tick ring with cardinal labels. Real-time gyro + heading updates.

### XPGlassOrb
Compact (60pt) Metal glass sphere showing XP progress fill. Tier-colored tint. Used in walk navigation header.

### WalkBuildingCard
The main info card during walks. Shows next stop name, architectural style tag, matched aesthetic tag, one-sentence Gemini AI insight, and distance/ETA badge. Transitions with `.move(edge: .leading)` between stops.

### StatCard
Reusable stat display: icon, value (bold monospacedDigit), label (caption). Used in 2×2 passport grid.

### FeatureCard
Dark navy card (`#1a1a2e`) with cyan border. Used for Tours and Lists CTAs on passport. Fixed 186:110 aspect ratio.

---

## Information Architecture

```
Passport
├── Header: XP, scans, streak, level
├── ArchetypeOrb → ProfileDetailView (archetype breakdown sheet)
├── Stats Grid
│   ├── Stamps → StampsView (vintage postage stamp grid)
│   ├── Achievements → AchievementsView (Metal shield grid)
│   ├── Tours → TourSelectView
│   └── Lists → ListsView
├── Past Walks (last 5)
└── Sign Out / Version

Scan
├── Camera preview + crosshair
├── Scan button (ArchetypeOrb or fallback circle)
├── Community mode toggle (lightbulb)
└── → BuildingInfoView
    ├── Hero image + gradient overlay
    ├── Facts grid (architect, style, year, materials)
    ├── The Story (AI lore)
    ├── Aesthetic Profile (archetype arc chart)
    ├── Archival Photos
    └── Real Estate Listings

Walk
├── WalkStartView (arc time slider, tour select)
└── WalkNavView
    ├── Header: XP + stop counter
    ├── WalkBuildingCard
    ├── XP-gated map reveal (25 XP → static Nolli snapshot)
    ├── GlassCompass
    └── Footer: route instruction + scan/skip/end buttons

Explore
├── Mapbox map
├── Archetype filter chips
├── Building pins → BuildingInfoView
└── Community post pins → detail sheet
```

---

## Brand Personality

**Formal but alive.** Jink is knowledgeable and precise about architecture — it doesn't dumb things down. But it's also kinetic, haptic-rich, and achievement-forward. Think: a very well-designed museum exhibit that also rewards you for coming back.

**Archival + collectible.** The passport metaphor is central. Users are building a physical record of their exploration — stamps, shields, walk logs. Everything should feel like it has weight and permanence.

**Dark mode native.** The app was designed for dark mode. Neon accent on dark backgrounds, glass materials, glowing components. Light mode is not explicitly handled.

**NYC-specific for now.** All building data, walks, and tours are NYC. The brand should feel like NYC architecture — dense, varied, a mix of eras and styles.

---

## Design System Gaps (Priority Work for Designer)

These are areas where the current codebase is inconsistent and needs proper design system definition:

| Gap | Details |
|-----|---------|
| **Spacing scale** | Ad-hoc values (3, 4, 6, 8, 10, 12, 16, 20, 24, 32pt) — no formal grid or spacing tokens |
| **Type scale** | Sizes chosen per-component, no formal scale document or semantic type styles |
| **Color tokens** | Hex values used directly in code — no semantic token layer (e.g. no "primary-text", "card-background" tokens) |
| **Empty states** | Inconsistent treatment across screens — different icon sizes, text hierarchy, spacing |
| **Light mode** | App is dark-mode native; light mode appearance is uncontrolled |
| **Error states** | Some screens show raw error text, others show styled messages |
| **Loading states** | Inconsistent — some use `ProgressView`, some use shimmer, some block, some don't |
| **Component library** | No Figma components exist yet — all design is in code |
| **Icon system** | Uses SF Symbols throughout — no custom icons. May want brand-specific icons for tabs, actions. |
| **Motion specs** | Animation values are hardcoded per-component — no shared motion tokens or timing specs |

---

## Technical Constraints for Design

- **iOS 17+ minimum** — can use all modern SwiftUI (scrollTransition, contentTransition, etc.)
- **SwiftUI native** — no React Native, no web views in main flows
- **Metal shaders** — key components use GPU rendering (ArchetypeOrb, stamps, compass glow). Can't be easily replicated in standard design tools.
- **CoreMotion gyro** — several components respond to device tilt. Design specs should note which components are "alive" vs. static.
- **Supabase backend** — data is real-time from Supabase. Loading/empty states need to account for async fetches.
- **Camera + Location required** — Scan and Walk features require camera + GPS permissions. Permission denial flows need design.

---

## Handoff Checklist

For the designer to build a proper design system, we need:

- [ ] Figma component library matching key components above
- [ ] Color token system (semantic layer on top of the hex palette)
- [ ] Type scale — formal scale with named styles
- [ ] Spacing system — 4pt or 8pt base grid decision
- [ ] Motion specs — timing curves and durations for key animations
- [ ] Icon audit — SF Symbols in use vs. custom icon opportunities
- [ ] Light mode designs (or explicit decision to go dark-only)
- [ ] Component states (default, loading, error, empty, disabled)
- [ ] Responsive breakpoints (iPhone SE vs. Pro Max)
