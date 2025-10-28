import * as Linking from "expo-linking";
import {
  exchangeCodeForSession as exchangeSessionCode,
  getSession as getSessionFromGateway,
  setSession as setSessionOnGateway,
  signInWithPassword,
  signUpWithPassword,
  signOut as signOutFromGateway,
  signInWithOAuth,
  signInWithOtp,
  verifyOtp,
} from "@/services/gateways";

const buildRedirectUrl = () => Linking.createURL("auth/callback");

export const signInWithEmail = async (email: string, password: string) => {
  const { error } = await signInWithPassword({
    email,
    password,
  });
  if (error) {
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { error } = await signUpWithPassword({
    email,
    password,
    options: { emailRedirectTo: buildRedirectUrl() },
  });
  if (error) {
    throw error;
  }
};

export const signOut = async () => {
  await signOutFromGateway();
};

export const getSession = () => getSessionFromGateway();

export const exchangeCodeForSession = (params: { code: string }) =>
  exchangeSessionCode(params);

export const setSession = (params: { accessToken: string; refreshToken: string }) =>
  setSessionOnGateway(params);

export const signInWithProvider = async (provider: "google" | "apple" | "github") => {
  const redirectTo = buildRedirectUrl();
  const { data, error } = await signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data?.url) {
    const supported = await Linking.canOpenURL(data.url);
    if (!supported) {
      throw new Error("Cannot open OAuth URL");
    }
    await Linking.openURL(data.url);
  }

  return data;
};

export const sendPhoneOtp = async (phone: string) => {
  const { error } = await signInWithOtp({ phone });
  if (error) {
    throw error;
  }
};

export const verifyPhoneOtp = async (phone: string, token: string) => {
  const { error } = await verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) {
    throw error;
  }
};

export const authActions = {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  signInWithProvider,
  signInWithPhone: sendPhoneOtp,
  verifyPhoneOtp,
  getSession,
  exchangeCodeForSession,
  setSession,
};
