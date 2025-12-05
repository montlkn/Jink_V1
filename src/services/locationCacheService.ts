/**
 * Location Cache Service
 *
 * Provides cached GPS location with smart refresh intervals:
 * - Caches location in AsyncStorage for persistence across app restarts
 * - Updates at configurable intervals (default: 30 seconds)
 * - Throttles updates at intersections/corners for battery optimization
 * - Provides immediate location for scanning with background refresh
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { log } from '@/lib/log';

const LOCATION_CACHE_KEY = '@cached_location';
const LOCATION_CACHE_EXPIRY = 30000; // 30 seconds
const MIN_DISTANCE_FOR_UPDATE = 10; // meters - minimum movement before updating
const BATTERY_SAVER_INTERVAL = 60000; // 60 seconds for battery saver mode

interface CachedLocation {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface LocationCacheState {
  location: CachedLocation | null;
  lastUpdate: number;
  isWatching: boolean;
  subscription: Location.LocationSubscription | null;
}

const state: LocationCacheState = {
  location: null,
  lastUpdate: 0,
  isWatching: false,
  subscription: null,
};

// Calculate distance between two coordinates (Haversine)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Load cached location from AsyncStorage
 */
export async function loadCachedLocation(): Promise<CachedLocation | null> {
  try {
    const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (cached) {
      const parsed: CachedLocation = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;

      // If cache is fresh enough, use it
      if (age < LOCATION_CACHE_EXPIRY * 2) {
        state.location = parsed;
        state.lastUpdate = parsed.timestamp;
        log.info('[locationCache] Loaded cached location', {
          age: Math.round(age / 1000),
          lat: parsed.latitude.toFixed(6),
          lng: parsed.longitude.toFixed(6),
        });
        return parsed;
      }
    }
  } catch (error) {
    log.warn('[locationCache] Failed to load cached location', error);
  }
  return null;
}

/**
 * Save location to AsyncStorage cache
 */
async function saveCachedLocation(location: CachedLocation): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
  } catch (error) {
    log.warn('[locationCache] Failed to save cached location', error);
  }
}

/**
 * Get current location - returns cached if fresh, otherwise fetches new
 */
export async function getCachedLocation(
  options?: { forceRefresh?: boolean; maxAge?: number }
): Promise<CachedLocation | null> {
  const maxAge = options?.maxAge ?? LOCATION_CACHE_EXPIRY;
  const forceRefresh = options?.forceRefresh ?? false;

  // Check if we have a fresh cached location
  if (!forceRefresh && state.location) {
    const age = Date.now() - state.lastUpdate;
    if (age < maxAge) {
      return state.location;
    }
  }

  // Need to fetch fresh location
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      log.warn('[locationCache] Location permission not granted');
      return state.location; // Return stale cached if available
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });

    const newLocation: CachedLocation = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      altitude: loc.coords.altitude,
      accuracy: loc.coords.accuracy ?? 10,
      heading: loc.coords.heading,
      speed: loc.coords.speed,
      timestamp: Date.now(),
    };

    // Check if we've moved enough to warrant an update
    if (state.location) {
      const distance = calculateDistance(
        state.location.latitude,
        state.location.longitude,
        newLocation.latitude,
        newLocation.longitude
      );

      if (distance < MIN_DISTANCE_FOR_UPDATE && !forceRefresh) {
        // Haven't moved much, just update timestamp
        state.lastUpdate = Date.now();
        return state.location;
      }
    }

    // Update state and cache
    state.location = newLocation;
    state.lastUpdate = Date.now();
    await saveCachedLocation(newLocation);

    log.info('[locationCache] Updated location', {
      lat: newLocation.latitude.toFixed(6),
      lng: newLocation.longitude.toFixed(6),
      accuracy: Math.round(newLocation.accuracy),
    });

    return newLocation;
  } catch (error) {
    log.error('[locationCache] Failed to get location', error);
    return state.location; // Return stale cached if available
  }
}

/**
 * Start watching location with smart throttling
 */
export async function startLocationWatch(
  onUpdate?: (location: CachedLocation) => void,
  options?: { batterySaver?: boolean }
): Promise<void> {
  if (state.isWatching) {
    log.info('[locationCache] Already watching location');
    return;
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      log.warn('[locationCache] Location permission not granted');
      return;
    }

    // Load cached location first
    await loadCachedLocation();

    const timeInterval = options?.batterySaver
      ? BATTERY_SAVER_INTERVAL
      : LOCATION_CACHE_EXPIRY;

    state.subscription = await Location.watchPositionAsync(
      {
        accuracy: options?.batterySaver
          ? Location.Accuracy.Balanced
          : Location.Accuracy.BestForNavigation,
        timeInterval,
        distanceInterval: MIN_DISTANCE_FOR_UPDATE,
      },
      (loc) => {
        const newLocation: CachedLocation = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          altitude: loc.coords.altitude,
          accuracy: loc.coords.accuracy ?? 10,
          heading: loc.coords.heading,
          speed: loc.coords.speed,
          timestamp: Date.now(),
        };

        // Only update if moved significantly
        if (state.location) {
          const distance = calculateDistance(
            state.location.latitude,
            state.location.longitude,
            newLocation.latitude,
            newLocation.longitude
          );

          if (distance < MIN_DISTANCE_FOR_UPDATE) {
            return; // Skip update
          }
        }

        state.location = newLocation;
        state.lastUpdate = Date.now();
        saveCachedLocation(newLocation);

        if (onUpdate) {
          onUpdate(newLocation);
        }
      }
    );

    state.isWatching = true;
    log.info('[locationCache] Started location watch', {
      batterySaver: options?.batterySaver,
      interval: timeInterval,
    });
  } catch (error) {
    log.error('[locationCache] Failed to start location watch', error);
  }
}

/**
 * Stop watching location
 */
export function stopLocationWatch(): void {
  if (state.subscription) {
    state.subscription.remove();
    state.subscription = null;
  }
  state.isWatching = false;
  log.info('[locationCache] Stopped location watch');
}

/**
 * Get cached location synchronously (may be stale)
 */
export function getLastKnownLocation(): CachedLocation | null {
  return state.location;
}

/**
 * Check if location is fresh enough for use
 */
export function isLocationFresh(maxAge?: number): boolean {
  if (!state.location) return false;
  const age = Date.now() - state.lastUpdate;
  return age < (maxAge ?? LOCATION_CACHE_EXPIRY);
}

/**
 * Initialize the location cache service
 * Call this on app startup
 */
export async function initLocationCache(): Promise<CachedLocation | null> {
  // Load from AsyncStorage first
  await loadCachedLocation();

  // Then try to get fresh location
  return getCachedLocation({ maxAge: LOCATION_CACHE_EXPIRY * 2 });
}
