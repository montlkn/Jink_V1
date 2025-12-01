/**
 * useAestheticProfile Hook
 * Fetches and manages user aesthetic profile state
 */

import { useAuth } from "@/auth/authProvider";
import type { AestheticProfile } from "@/config/aestheticAlgorithm";
import { getUserAestheticProfile } from "@/features/quiz";
import { log } from "@/lib/log";
import { useCallback, useEffect, useState } from "react";

export interface UseAestheticProfileReturn {
  profile: AestheticProfile | null;
  loading: boolean;
  error: Error | null;
  refreshProfile: () => Promise<void>;
}

/**
 * Hook to fetch and manage user's aesthetic profile
 * @returns Profile data, loading state, error, and refresh function
 */
export function useAestheticProfile(): UseAestheticProfileReturn {
  const { session } = useAuth() as any;
  const [profile, setProfile] = useState<AestheticProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!session?.user?.id) {
        // If no user session, we might want to clear profile or handle it differently
        // For now, just log and set profile to null, and don't throw an error that stops loading state
        log.warn("[useAestheticProfile] No user session, cannot load profile.");
        setProfile(null);
        return;
      }

      const data = await getUserAestheticProfile(session.user.id);
      setProfile(data || null);
    } catch (err) {
      const error = err instanceof Error
        ? err
        : new Error("Failed to load profile");
      log.error("[useAestheticProfile] Failed to load profile", error);
      setError(error);
      setProfile(null); // Clear profile on error
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]); // Dependency array for useCallback

  // Load profile on mount or when session changes
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const refreshProfile = async () => {
    await loadProfile();
  };

  return { profile, loading, error, refreshProfile };
}
