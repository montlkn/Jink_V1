/**
 * Authentication gateway - handles all auth operations
 */
import type { AuthChangeEvent, AuthError, Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session ?? null;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

type ExchangeCodeForSessionParams = { code: string };
type ExchangeCodeForSessionResult = { session: Session | null; error: AuthError | null };

export async function exchangeCodeForSession(
  params: ExchangeCodeForSessionParams
): Promise<ExchangeCodeForSessionResult> {
  const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
  return { session: data?.session ?? null, error };
}

type SetSessionParams = { accessToken: string; refreshToken: string };
type SetSessionResult = { session: Session | null; error: AuthError | null };

export async function setSession(params: SetSessionParams): Promise<SetSessionResult> {
  const { data, error } = await supabase.auth.setSession({
    access_token: params.accessToken,
    refresh_token: params.refreshToken,
  });
  return { session: data?.session ?? null, error };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

type SignUpWithPasswordParams = Parameters<typeof supabase.auth.signUp>[0];
type SignInWithPasswordParams = Parameters<typeof supabase.auth.signInWithPassword>[0];
type SignInWithOAuthParams = Parameters<typeof supabase.auth.signInWithOAuth>[0];
type SignInWithOtpParams = Parameters<typeof supabase.auth.signInWithOtp>[0];
type VerifyOtpParamsType = Parameters<typeof supabase.auth.verifyOtp>[0];

export async function signInWithPassword(params: SignInWithPasswordParams) {
  return supabase.auth.signInWithPassword(params);
}

export async function signUpWithPassword(params: SignUpWithPasswordParams) {
  return supabase.auth.signUp(params);
}

export async function signInWithOAuth(params: SignInWithOAuthParams) {
  return supabase.auth.signInWithOAuth(params);
}

export async function signInWithOtp(params: SignInWithOtpParams) {
  return supabase.auth.signInWithOtp(params);
}

export async function verifyOtp(params: VerifyOtpParamsType) {
  return supabase.auth.verifyOtp(params);
}
