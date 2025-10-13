# Architecture App V2 (Aura Profile Update)

A React Native mobile application designed to help users explore architectural landmarks through guided walks, building identification, and personalized aesthetic experiences. This version integrates the **Aura Profile** system and expanded personalization features from the `docs/docs2` branch.

---

## 🌆 Overview

**Architecture App V2** merges urban exploration with architectural intelligence. The app enables users to discover buildings, learn architectural history, and build a visual "aesthetic profile" that evolves as they explore. With the **Aura Profile**, users now receive dynamic recommendations based on their design sensibilities and past interactions.

---

## 🚀 Features

### 🏠 **Home Screen**

* Personalized greeting based on user mood & time of day
* Quick-start button for new Dérive (architectural walk)
* Display of recent and favorite architectural styles
* Featured landmarks with cultural notes and 3D visual previews

### 🧭 **Dérive (Walk Experience)**

* Customizable walk duration (5–120 minutes)
* **Personalized Dérive** – guided by the user's **Aura Profile** aesthetic data
* Optional audio guidance with architectural commentary (Later to come)
* Progress visualization and mood journaling

### 📷 **Scan & Identify**

* Real-time building recognition powered by Vision Camera and Supabase ML endpoints
* Historical and stylistic metadata returned instantly
* User contributions enhance community database
* Offline caching of common landmarks for low-data scenarios

### 🌈 **Aura Profile (New)**

* **Aesthetic fingerprint** generated from user interactions (styles, walks, scans)
* Dynamic personality visualization through color gradients and motion graphics
* Integration with walk recommendations and search suggestions
* Syncs seamlessly with user account via Supabase Auth

### 👤 **Passport**

* Full user profile and exploration history
* Custom achievements and walk badges
* Style evolution graph (tracks how user taste changes over time)
* Shareable journey summaries with photos and data overlays

### 🔍 **Search**

* Location, period, and architectural style filters
* Supports fuzzy queries and aesthetic categories (e.g. *Brutalist calm*, *Organic flow*)
* Context-aware search: learns from recent activity

---

## 🧠 Architecture & Tech Stack

* **React Native + Expo** – core mobile framework
* **React Navigation** – custom navigation with glassmorphism transitions
* **Supabase** – backend database, authentication, and ML integration
* **Vision Camera** – high-performance image recognition
* **Zustand** – global state management
* **Expo Blur & Reanimated** – advanced UI/UX effects

---

## 📁 Project Structure

```
architecture-app/
├── src/
│   ├── api/                    # Supabase & API services
│   ├── components/             # Modular UI components
│   │   ├── aura/               # Aura Profile visual components
│   │   ├── home/               # Home interface modules
│   │   └── walk/               # Walk setup and controls
│   ├── hooks/                  # Custom React hooks
│   ├── screens/                # Screen-level views
│   │   ├── Aura/               # Aura Profile screen
│   │   ├── Passport/           # User passport and stats
│   │   ├── Walk/               # Walk interface
│   │   ├── Scan/               # Camera and ML scanning
│   │   ├── Home/               # Entry dashboard
│   │   └── Search/             # Advanced search
│   ├── navigation/             # Stack and tab navigation
│   ├── services/               # Business logic, ML integration
│   ├── state/                  # Global state stores (Zustand)
│   └── utils/                  # Helper functions
├── assets/                     # Fonts, images, icons
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
```

Run the app:

```bash
npx expo start
```

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

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your work (`git commit -m 'Add: new feature'`)
4. Push and open a Pull Request

---

## 📜 License

Licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

### 🏛️ Built with purpose — for those who see cities as living museums.
