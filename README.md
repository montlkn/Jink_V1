# Jink V2 (Aura Profile Update)

A React Native mobile application designed to help users explore architectural landmarks through guided walks, building identification, and personalized aesthetic experiences. This version integrates the **Aura Profile** system and expanded personalization features from the `docs/docs2` branch.

---

## 🌆 Overview

**Jink** merges urban exploration with architectural intelligence. The app enables users to discover buildings, learn architectural history, and build a visual "aesthetic profile" that evolves as they explore. With the **Aura Profile**, users now receive dynamic recommendations based on their design sensibilities and past interactions.

---

## 🚀 Features

### 🏠 **Home Screen**

* Orb animation shown 
* Quick-start button for new Jink (architectural walk)
* Daily / Weekly Quest 
* Featured landmarks with cultural notes and 3D visual previews

### 🧭 **Jink (Walk Experience)**

* Customizable walk duration (5–120 minutes)
* Paid or free walks
* **Personalized Dérive** – guided by the user's **Aura Profile** aesthetic data
* Optional audio guidance with architectural commentary (much later to come)
* Can share lists as derives -- kind of like listening to someone elses playlist, user can choose a persoanlised walk or a "playlist walk"
* Progress visualization
* After walk summaries

### 📷 **Scan & Identify**

* Real-time building recognition powered by Vision Camera and Supabase ML endpoints
* Historical and stylistic metadata returned instantly
* User contributions enhance community database
* Offline caching of common landmarks for low-data scenarios
* Filters personalised information for you based on the building and your profile (exa.ai integration)

### 🌈 **Aura Profile (New)**

* **Aesthetic fingerprint** generated from user interactions (styles, walks, scans)
* Dynamic personality visualization through color gradients and motion graphics
* Integration with walk recommendations and search suggestions
* Syncs seamlessly with user account via Supabase Auth

### 👤 **Passport**

* Full user profile and exploration history through a past walk section-- this is the map with fog of war view
* Custom achievements and walk badges
* Style evolution graph (tracks how user taste changes over time)
* Shareable journey summaries with photos and data overlays (Pro Users Only)

### 🔍 **Search**

* Location, period, and architectural style filters
* Supports fuzzy queries and aesthetic categories (e.g. *Brutalist calm*, *Organic flow*)
* Context-aware search: learns from recent activity
* Results shown on map near you

---

## 🧠 Architecture & Tech Stack

* **React Native + Expo** – core mobile framework
* **React Navigation** – custom navigation with glassmorphism transitions
* **Supabase** – backend database, authentication, and ML integration
* **Vision Camera** – high-performance image recognition
* **Zustand** – global state management
* **Expo Blur & Reanimated** – advanced UI/UX effects
* **Feature Facades + Gateways** – UI screens call `src/features/**` facades; all external I/O is isolated in `src/services/gateways/**`

---

## 📁 Project Structure

```
architecture-app/
├── src/
│   ├── features/               # Facades, hooks, mutations (auth/home/quests/…/orb)
│   ├── services/
│   │   └── gateways/           # Supabase & HTTP entry points only
│   ├── components/             # Presentational building blocks
│   ├── navigation/             # Stack, linking, route constants
│   ├── lib/                    # Shared runtime utils (logging, sanitizers)
│   ├── state/                  # Global stores (Zustand)
│   ├── utils/                  # Math, Three helpers, misc tools
│   └── types/                  # Shared *.d.ts modules
├── docs/
│   ├── Navigation.md
│   ├── Modifying-*.md
│   ├── migrations/
│   └── archive/                # Historical specs
├── assets/                     # Fonts, env maps, textures
├── archive/
│   └── infra/                  # Infra + docker artifacts (not in runtime bundle)
├── android/                    # Android native config
├── ios/                        # iOS native config
└── App.js                      # App entry point
```

---

## ⚙️ Installation & Setup

### Prerequisites

* Node.js (v18+)
* Expo CLI
* Supabase project credentials
* Android Studio / Xcode simulators for local testing

### Steps

```bash
git clone https://github.com/montlkn/Jink_V1.git
cd architecture-app
npm install
```

Create `.env` in the root directory:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_URL=https://<your-modal-app>.modal.run
```

Run the app:

```bash
npx expo start
```

Backend summary service deployment is handled via Modal—see `docs/MODAL_DEPLOYMENT.md` for the end-to-end guide.

---

## 🧩 Key Components

### `AuraProfileCard`

Visual representation of the user's aesthetic identity. Animated gradient background reflects style preferences and exploration diversity.

### `WalkTypeSelector`

Compact control for selecting between Random and Personalized Dérive modes.

### `ScanOverlay`

AR overlay displaying building data, style labels, and historical snippets in real time.

---

## 🧭 Design Principles

* **Modularity** – components and services are decoupled
* **Performance** – caching, lazy-loading, and optimized ML requests
* **Accessibility** – large touch areas, dark/light mode support
* **Immersion** – blur effects, motion-based transitions, and subtle haptics

---

## 📜 License

Licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

### 🏛️ Built with purpose — for those who see cities as living museums.
