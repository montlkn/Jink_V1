# Architecture App V2 🏛️

A React Native mobile application that helps users explore and discover architectural landmarks through guided walks and building identification.

## Features

### 🏠 **Home Screen**
- Personalized greeting and aesthetic profile
- Quick access to start a new "Dérive" (architectural walk)
- View past walks and architectural styles
- Featured landmarks with detailed information

### 🗺️ **Walk Setup (Dérive)**
- Customizable walk duration (5-90 minutes)
- Two walk types:
  - **Random**: Algorithm-generated routes
  - **Personalized**: Based on user's aesthetic preferences
- Interactive time slider with visual feedback

### 📷 **Scan & Identify**
- Camera integration for building identification
- Real-time architectural analysis
- Building information and historical context
- Contribution system for community data

### 👤 **Passport**
- User profile and preferences
- Walk history and achievements
- Aesthetic profile tracking
- Personal architectural journey

### 🔍 **Search**
- Find specific buildings or architectural styles
- Filter by location, period, or style
- Advanced search capabilities

## Tech Stack

- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **React Navigation** - Navigation and routing
- **Supabase** - Backend database and authentication
- **Expo Blur** - Custom UI effects
- **React Native Vision Camera** - Camera functionality

## Project Structure

```
architecture-app/
├── src/
│   ├── api/                    # API integrations
│   │   ├── supabaseClient.js   # Supabase configuration
│   │   ├── buildingsApi.js     # Building data API
│   │   ├── userApi.js          # User management API
│   │   └── walkApi.js          # Walk generation API
│   ├── components/             # Reusable UI components
│   │   ├── common/            # Shared components
│   │   ├── home/              # Home screen components
│   │   └── walk/              # Walk-related components
│   ├── screens/               # Main app screens
│   │   ├── Auth/              # Authentication screens
│   │   ├── Home/              # Home screen
│   │   ├── Scan/              # Camera and scanning
│   │   ├── Walk/              # Walk setup and navigation
│   │   ├── Passport/          # User profile
│   │   └── Search/            # Search functionality
│   ├── navigation/            # Navigation configuration
│   ├── config/                # App configuration
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # Business logic
│   └── state/                 # State management
├── assets/                    # Images, fonts, icons
├── android/                   # Android native files
├── ios/                       # iOS native files
└── App.js                     # Main app entry point
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/montlkn/Swervo_V1.git
   cd architecture-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   # For Expo Go (recommended for development)
   npx expo start
   
   # For native development build
   npx expo run:ios
   npx expo run:android
   ```

## Development

### Running the App

- **Expo Go**: Scan QR code with Expo Go app
- **iOS Simulator**: Press `i` in terminal or use `npx expo run:ios`
- **Android Emulator**: Press `a` in terminal or use `npx expo run:android`
- **Web**: Press `w` in terminal

### Key Components

#### WalkTypeButton
```javascript
<WalkTypeButton 
  title="RANDOM"
  color="rgba(100, 255, 150, 0.3)"
  onPress={() => console.log('Start Random Walk')}
/>
```

#### TimeSlider
```javascript
<TimeSlider 
  min={5}
  max={90}
  initialValue={45}
/>
```

### Custom Navigation
The app features a custom "liquid glass" tab bar with blur effects and smooth animations.

## Architecture Decisions

### Modular Design
- **Separate concerns**: Each component has a single responsibility
- **Reusable components**: Components can be used across different screens
- **Clean imports**: Clear dependency structure

### State Management
- **Local state**: React hooks for component-level state
- **Global state**: Zustand for app-wide state management
- **API state**: Supabase for persistent data

### UI/UX
- **Custom tab bar**: Blur effects and smooth animations
- **Responsive design**: Works on different screen sizes
- **Accessibility**: Proper contrast and touch targets

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Expo** for the amazing development platform
- **React Navigation** for smooth navigation
- **Supabase** for the backend infrastructure
- **Architectural community** for inspiration and feedback

---

Built with ❤️ for architecture enthusiasts everywhere.
