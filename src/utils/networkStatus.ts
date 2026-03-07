/**
 * Network Status Hook
 *
 * Lightweight online/offline detection without external dependencies.
 * Uses AppState + periodic connectivity check.
 */

import { log } from '@/lib/log';
import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

let cachedIsOnline = true;

async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    // HEAD request to a highly-available endpoint
    const response = await fetch('https://clients3.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    cachedIsOnline = response.status === 204 || response.ok;
    return cachedIsOnline;
  } catch {
    cachedIsOnline = false;
    return false;
  }
}

/**
 * Hook that returns { isOnline, isChecking }.
 * Rechecks on app foreground and every 30s while online, 10s while offline.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(cachedIsOnline);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let mounted = true;
    let intervalId: ReturnType<typeof setInterval>;

    const check = async () => {
      if (!mounted) return;
      setIsChecking(true);
      const online = await checkConnectivity();
      if (mounted) {
        setIsOnline(online);
        setIsChecking(false);
      }
    };

    // Check immediately
    check();

    // Recheck periodically
    const startInterval = () => {
      clearInterval(intervalId);
      intervalId = setInterval(check, cachedIsOnline ? 30000 : 10000);
    };
    startInterval();

    // Recheck on app foreground
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        check();
        startInterval();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  return { isOnline, isChecking };
}

/**
 * Synchronous check using cached value — for gating non-hook code.
 */
export function isNetworkOnline(): boolean {
  return cachedIsOnline;
}
