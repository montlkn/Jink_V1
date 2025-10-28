import { useEffect, useState } from "react";
import {
  getSession as getSessionFromGateway,
  onAuthStateChange,
} from "@/services/gateways";
import { log } from "@/lib/log";
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

    getSessionFromGateway()
      .then((session) => {
        if (!active) return;
        setState({
          status: "ready",
          session: toAuthSession(session),
        });
      })
      .catch((error) => {
        if (!active) return;
        log.warn("[Auth] Unexpected session error", error);
        setState({
          status: "ready",
          session: null,
        });
      });

    const { data: subscription } = onAuthStateChange((_event, session) => {
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
