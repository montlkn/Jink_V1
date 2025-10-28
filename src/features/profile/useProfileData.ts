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

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setStatus("error");
      setError(new Error("Unable to load profile without a session"));
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
      setError(err);
      setProfile(null);
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      if (!userId) {
        setStatus("error");
        setError(new Error("User session unavailable"));
        setProfile(null);
        return;
      }
      await load();
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, load]);

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
