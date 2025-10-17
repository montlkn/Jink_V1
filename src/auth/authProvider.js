import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";

const Ctx = createContext({});

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: "jink://auth/callback" },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithProvider = async (provider) => {
    // Dynamically import to avoid circular dependencies
    const { signInWithProvider: ssoSignIn } = await import("./sso");
    await ssoSignIn(provider);
  };

  const signInWithPhone = async (phone) => {
    const { signInWithPhone: phoneSignIn } = await import("./sso");
    await phoneSignIn(phone);
  };

  const verifyPhoneOtp = async (phone, token) => {
    const { verifyPhoneOtp: verifyOtp } = await import("./sso");
    await verifyOtp(phone, token);
  };

  return (
    <Ctx.Provider
      value={{
        session,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithProvider,
        signInWithPhone,
        verifyPhoneOtp,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
