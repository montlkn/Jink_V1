package | found-in | justification | suggested_action
---|---|---|---
@react-native-community/blur | ios/Podfile.lock:2211 | iOS Pod references `react-native-blur`; removing breaks blur view native module | keep-native
@shopify/react-native-skia | ios/Podfile.lock:2214 | iOS Pod locks `react-native-skia` from `@shopify/react-native-skia` | keep-native
expo | ios/Podfile.lock:2148 | Expo umbrella Pod pulled from `../node_modules/expo` to bootstrap the native runtime | keep-native
expo-constants | ios/Podfile.lock:2145 | Pod defines `EXConstants` module consumed by Expo runtime | keep-native
expo-dev-client | ios/Podfile.lock:2149 | Pod installs `expo-dev-client` native target used by the dev build | keep-native
expo-device | ios/Podfile.lock:2156 | Pod lists `ExpoDevice` from `expo-device/ios` | keep-native
expo-font | ios/Podfile.lock:2158 | Pod lists `ExpoFont` native module | keep-native
expo-gl | ios/Podfile.lock:2159 | Pod resolves `ExpoGL` from `expo-gl` | keep-native
expo-image | ios/Podfile.lock:2161 | Pod includes `ExpoImage` native implementation | keep-native
expo-secure-store | ios/Podfile.lock:2168 | Pod references `ExpoSecureStore` native storage | keep-native
expo-splash-screen | ios/Podfile.lock:2170 | Pod locks `ExpoSplashScreen` for managed splash handling | keep-native
expo-symbols | ios/Podfile.lock:2171 | Pod lists `ExpoSymbols` asset bundle | keep-native
expo-system-ui | ios/Podfile.lock:2172 | Pod references `ExpoSystemUI` native helpers | keep-native
expo-web-browser | ios/Podfile.lock:2173 | Pod installs `ExpoWebBrowser` for in-app browser sheets | keep-native
react-native-reanimated | android/app/proguard-rules.pro:11 | Proguard keeps `com.swmansion.reanimated` classes; module required on both platforms | keep-native
react-native-safe-area-context | ios/Podfile.lock:2213 | Pod pulls `react-native-safe-area-context` for native safe-area views | keep-native
react-native-screens | ios/Podfile.lock:2247 | Pod includes `RNScreens` native module | keep-native
react-native-vision-camera | ios/Podfile.lock:2249 | Pod resolves `VisionCamera` native camera bindings | keep-native
react-native-web | package.json:67 | Declared as Expo web renderer; required for web builds even if not imported directly | keep-web
react-native-webview | ios/Podfile.lock:2215 | Pod references `react-native-webview` native implementation | keep-native
