import { useEffect, useState } from "react";
import { supabaseGateway as supabase } from "@/services/gateways";
import { toAuthSession, type AuthSession } from "./selectors";

export type AuthDataState =
  | { status: "loading"; session: null }
  | { status: "ready"; session: AuthSession };

export function useAuthData(): AuthDataState {
  const [state, setState] = useState<AuthDataState>({
    status: "loading",
    session: null,
  });

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.warn("[Auth] Failed to fetch initial session", error);
        }
        setState({
          status: "ready",
          session: toAuthSession(data?.session ?? null),
        });
      })
      .catch((error) => {
        if (!active) return;
        console.warn("[Auth] Unexpected session error", error);
        setState({
          status: "ready",
          session: null,
        });
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState({
        status: "ready",
        session: toAuthSession(session),
      });
    });

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  return state;
}
