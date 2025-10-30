import { useAuthData } from "@/features/auth";
import { fetchProfile } from "@/services/profileService";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toProfileView, type ProfileViewModel } from "./selectors";

type Status = "idle" | "loading" | "ready" | "error";

export type UseProfileDataResult = {
  status: Status;
  profile: ProfileViewModel | null;
  error: unknown;
  refresh: () => Promise<void>;
};

export function useProfileData(): UseProfileDataResult {
  const authState = useAuthData();
  const session = authState.status === "ready" ? authState.session : null;
  const [status, setStatus] = useState<Status>("idle");
  const [profile, setProfile] = useState<ProfileViewModel | null>(null);
  const [error, setError] = useState<unknown>(null);
  const userId = session?.user?.id ?? null;

  const fallbackProfile = useMemo<ProfileViewModel | null>(() => {
    if (!session?.user?.id) {
      return null;
    }
    const rawUser = session.user as Record<string, unknown>;
    const displayName = typeof rawUser.full_name === "string" && rawUser.full_name.trim()
      ? rawUser.full_name.trim()
      : typeof rawUser.email === "string" && rawUser.email.length
      ? (rawUser.email as string).split("@")[0]
      : "Explorer";
    return {
      id: session.user.id as string,
      displayName,
      avatarUrl: null,
      bio: null,
      updatedAt: null,
    };
  }, [session]);

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(fallbackProfile);
      if (!fallbackProfile) {
        setStatus("error");
        setError(new Error("Unable to load profile without a session"));
      } else {
        setStatus("ready");
        setError(null);
      }
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const rawProfile = await fetchProfile(userId);
      const viewModel = toProfileView(rawProfile);
      setProfile(viewModel);
      setStatus("ready");
    } catch (err) {
      if (fallbackProfile) {
        setProfile(fallbackProfile);
        setStatus("ready");
        setError(err);
      } else {
        setError(err);
        setProfile(null);
        setStatus("error");
      }
    }
  }, [userId, fallbackProfile]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      if (!userId) {
        if (fallbackProfile) {
          setStatus("ready");
          setError(null);
          setProfile(fallbackProfile);
        } else {
          setStatus("error");
          setError(new Error("User session unavailable"));
          setProfile(null);
        }
        return;
      }
      await load();
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, load, fallbackProfile]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return useMemo(
    () => ({
      status: status === "idle" ? "loading" : status,
      profile,
      error,
      refresh,
    }),
    [status, profile, error, refresh]
  );
}
