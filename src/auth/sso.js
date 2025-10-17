/* File: /src/auth/sso.js
  Description: SSO helpers for OAuth providers (Google, Apple, GitHub)
  Handles building redirect URLs and initiating OAuth flows
*/
import * as Linking from "expo-linking";
import { supabase } from "../api/supabaseClient";

// Build a deep link for OAuth callback (e.g., jink://auth/callback)
export const buildRedirectUrl = () => Linking.createURL("auth/callback");

/**
 * Sign in with an OAuth provider (mobile-optimized with PKCE)
 * @param {string} provider - 'google' | 'apple' | 'github'
 * @returns {Promise<string>} The OAuth provider URL to open
 */
export async function signInWithProvider(provider) {
  const redirectTo = buildRedirectUrl();

  console.log('SSO: Starting OAuth flow');
  console.log('SSO: Redirect URL:', redirectTo);
  console.log('SSO: Provider:', provider);

  // Use queryParams to pass additional options for mobile PKCE flow
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true, // We'll handle the browser opening ourselves
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('SSO: OAuth initiation error:', error);
    throw error;
  }

  console.log('SSO: OAuth URL generated, opening browser');
  console.log('SSO: URL:', data?.url?.substring(0, 100) + '...');

  // For mobile, we need to open the URL in the browser manually
  if (data?.url) {
    const supported = await Linking.canOpenURL(data.url);
    if (supported) {
      await Linking.openURL(data.url);
    } else {
      throw new Error('Cannot open OAuth URL');
    }
  }

  return data;
}

/**
 * Sign in with phone number (send OTP)
 * @param {string} phone - Phone number in E.164 format (e.g., +1234567890)
 * @returns {Promise<void>}
 */
export async function signInWithPhone(phone) {
  const { error } = await supabase.auth.signInWithOtp({
    phone,
  });
  if (error) throw error;
}

/**
 * Verify phone OTP code
 * @param {string} phone - Phone number in E.164 format
 * @param {string} token - The OTP code
 * @returns {Promise<void>}
 */
export async function verifyPhoneOtp(phone, token) {
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) throw error;
}
