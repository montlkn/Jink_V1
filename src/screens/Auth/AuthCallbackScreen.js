/* File: /src/screens/Auth/AuthCallbackScreen.js
  Description: Handles OAuth deep link callback
  Exchanges the OAuth code for a session and syncs the user profile
*/
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { authActions } from "@/features/auth";
import { log } from "@/lib/log";
import { upsertProfileFromSession } from "../../auth/profileSync";
import { useAuth } from "../../auth/authProvider";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { APP_COLORS } from "@/constants/appColors";

export default function AuthCallbackScreen({ navigation }) {
  const [error, setError] = useState(null);
  const { session } = useAuth();
  const handledRef = useRef(false);

  // If we already have a session and land on this screen, redirect immediately
  useEffect(() => {
    if (session?.user) {
      log.debug("AuthCallback: Already have session, redirecting to Main");
      handledRef.current = true;
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    }
  }, [session, navigation]);

  useEffect(() => {
    const handleOAuthCallback = async (url) => {
      try {
        if (handledRef.current) {
          log.debug("AuthCallback: Redirect already processed, ignoring");
          return;
        }

        log.debug("AuthCallback: handleOAuthCallback called");
        log.debug("AuthCallback: URL provided:", url ? "Yes" : "No");

        if (!url) {
          log.debug("AuthCallback: No URL provided, checking for existing session");
          // Check if we have a session
          const existingSession = await authActions.getSession();
          log.debug("AuthCallback: Existing session found:", existingSession ? "Yes" : "No");
          if (existingSession) {
            log.debug("AuthCallback: Found existing session, redirecting to Main");
            handledRef.current = true;
            navigation.reset({ index: 0, routes: [{ name: "Main" }] });
            return;
          }
          log.debug("AuthCallback: No URL yet, waiting for provider redirect");
          return;
        }

        log.debug("AuthCallback: Full callback URL:", url);

        // Parse the URL to check if it contains tokens or error
        const parsedUrl = Linking.parse(url);
        const params = { ...(parsedUrl.queryParams || {}) };

        // Some providers return auth data in the URL fragment (after #)
        if (parsedUrl.fragment) {
          parsedUrl.fragment.split("&").forEach((piece) => {
            if (!piece) return;
            const [rawKey, rawValue = ""] = piece.split("=");
            const key = decodeURIComponent(rawKey);
            const value = decodeURIComponent(rawValue);
            if (key) params[key] = value;
          });
        }

        log.debug("AuthCallback: Parsed params:", JSON.stringify(params, null, 2));

        // Check for errors in the callback
        if (params.error) {
          log.error("AuthCallback: OAuth error in URL:", params.error);
          throw new Error(params.error_description || params.error);
        }

        // Supabase's exchangeCodeForSession handles both PKCE and implicit flow
        // It automatically detects the flow type and processes accordingly
        log.debug("AuthCallback: Processing with exchangeCodeForSession");
        let sessionResult = null;
        if (params.code) {
          log.debug("AuthCallback: Exchanging authorization code");
          const { session: exchangeData, error: exchangeError } = await authActions.exchangeCodeForSession({ code: params.code });
          if (exchangeError) {
            log.error("Exchange error:", exchangeError);
            throw exchangeError;
          }
          sessionResult = exchangeData;
        } else if (params.access_token && params.refresh_token) {
          log.debug("AuthCallback: Using implicit grant tokens");
          const { session: sessionData, error: sessionError } = await authActions.setSession({
            accessToken: params.access_token,
            refreshToken: params.refresh_token,
          });
          if (sessionError) {
            log.error("Session set error:", sessionError);
            throw sessionError;
          }
          sessionResult = sessionData;
        } else {
          throw new Error("No authorization code or tokens found in redirect");
        }

        if (!sessionResult) {
          throw new Error("No session returned from exchange");
        }

        log.debug("AuthCallback: Session created successfully");
        log.debug("AuthCallback: User ID:", sessionResult.user.id);
        log.debug("AuthCallback: User email:", sessionResult.user.email);

        // Create or update profile for SSO user
        await upsertProfileFromSession(sessionResult);

        log.debug("AuthCallback: Profile synced successfully");

        // Important: Wait a moment for AuthProvider's onAuthStateChange to fire
        // This ensures the session is properly set in the app state
        await new Promise(resolve => setTimeout(resolve, 500));

        log.debug("AuthCallback: Navigating to Main screen");
        handledRef.current = true;
        // Reset navigation to Main - AuthProvider will handle routing to onboarding if needed
        // The AppNavigator already checks onboarding status based on session
        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      } catch (e) {
        log.error("OAuth callback error:", e);
        handledRef.current = true;
        setError(e.message || "Authentication failed");

        // After showing error briefly, go back to login
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }, 2000);
      }
    };

    log.debug("AuthCallback: useEffect running, current session:", session?.user?.email || "No session");

    // Handle initial URL (when app is opened from closed state)
    Linking.getInitialURL().then((url) => {
      log.debug("AuthCallback: getInitialURL returned:", url || "null");
      if (url && !session?.user) {
        // Only process URL if we don't already have a session
        handleOAuthCallback(url);
      } else if (!url) {
        log.debug("AuthCallback: No initial URL available, waiting for redirect event");
      }
    });

    // Handle URL when app is already running (deep link listener)
    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url) {
        handleOAuthCallback(event.url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [navigation, session]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (handledRef.current || session?.user) return;
      log.debug("AuthCallback: Timeout waiting for provider redirect");

      try {
        const existingSession = await authActions.getSession();
        if (existingSession) {
          log.debug("AuthCallback: Session materialized during timeout, redirecting");
          handledRef.current = true;
          navigation.reset({ index: 0, routes: [{ name: "Main" }] });
          return;
        }
      } catch (timeoutError) {
        log.warn("AuthCallback: Error checking session during timeout", timeoutError);
      }

      handledRef.current = true;
      setError("We didn't receive the sign-in redirect. Sending you back to try again.");
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }, 1500);
    }, 12000);

    return () => clearTimeout(timeout);
  }, [navigation, session]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.subText}>Redirecting to login...</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Completing sign in...</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text,
  },
  errorText: {
    fontSize: 16,
    color: APP_COLORS.error,
    textAlign: "center",
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: "center",
  },
});
