import React, { createContext, useContext, useMemo } from "react";
import { useAuthData, authActions } from "@/features/auth";

const Ctx = createContext({});

export const AuthProvider = ({ children }) => {
  const authState = useAuthData();

  const value = useMemo(() => {
    const session = authState.status === "ready" ? authState.session : null;
    const loading = authState.status !== "ready";

    return {
      session,
      loading,
      signIn: authActions.signInWithEmail,
      signUp: authActions.signUpWithEmail,
      signOut: authActions.signOut,
      signInWithProvider: authActions.signInWithProvider,
      signInWithPhone: authActions.signInWithPhone,
      verifyPhoneOtp: authActions.verifyPhoneOtp,
    };
  }, [authState]);

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
