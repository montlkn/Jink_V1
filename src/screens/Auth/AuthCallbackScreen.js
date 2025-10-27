/* File: /src/screens/Auth/AuthCallbackScreen.js
  Description: Handles OAuth deep link callback
  Exchanges the OAuth code for a session and syncs the user profile
*/
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { supabaseGateway as supabase } from "@/services/gateways";
import { upsertProfileFromSession } from "../../auth/profileSync";
import { useAuth } from "../../auth/authProvider";

export default function AuthCallbackScreen({ navigation }) {
  const [error, setError] = useState(null);
  const { session } = useAuth();
  const handledRef = useRef(false);

  // If we already have a session and land on this screen, redirect immediately
  useEffect(() => {
    if (session?.user) {
      console.log("AuthCallback: Already have session, redirecting to Main");
      handledRef.current = true;
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    }
  }, [session, navigation]);

  useEffect(() => {
    const handleOAuthCallback = async (url) => {
      try {
        if (handledRef.current) {
          console.log("AuthCallback: Redirect already processed, ignoring");
          return;
        }

        console.log("AuthCallback: handleOAuthCallback called");
        console.log("AuthCallback: URL provided:", url ? "Yes" : "No");

        if (!url) {
          console.log("AuthCallback: No URL provided, checking for existing session");
          // Check if we have a session
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          console.log("AuthCallback: Existing session found:", existingSession ? "Yes" : "No");
          if (existingSession) {
            console.log("AuthCallback: Found existing session, redirecting to Main");
            handledRef.current = true;
            navigation.reset({ index: 0, routes: [{ name: "Main" }] });
            return;
          }
          console.log("AuthCallback: No URL yet, waiting for provider redirect");
          return;
        }

        console.log("AuthCallback: Full callback URL:", url);

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

        console.log("AuthCallback: Parsed params:", JSON.stringify(params, null, 2));

        // Check for errors in the callback
        if (params.error) {
          console.error("AuthCallback: OAuth error in URL:", params.error);
          throw new Error(params.error_description || params.error);
        }

        // Supabase's exchangeCodeForSession handles both PKCE and implicit flow
        // It automatically detects the flow type and processes accordingly
        console.log("AuthCallback: Processing with exchangeCodeForSession");
        let sessionResult = null;
        if (params.code) {
          console.log("AuthCallback: Exchanging authorization code");
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
          if (exchangeError) {
            console.error("Exchange error:", exchangeError);
            throw exchangeError;
          }
          sessionResult = exchangeData;
        } else if (params.access_token && params.refresh_token) {
          console.log("AuthCallback: Using implicit grant tokens");
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (sessionError) {
            console.error("Session set error:", sessionError);
            throw sessionError;
          }
          sessionResult = sessionData;
        } else {
          throw new Error("No authorization code or tokens found in redirect");
        }

        if (!sessionResult?.session) {
          throw new Error("No session returned from exchange");
        }

        console.log("AuthCallback: Session created successfully");
        console.log("AuthCallback: User ID:", sessionResult.session.user.id);
        console.log("AuthCallback: User email:", sessionResult.session.user.email);

        // Create or update profile for SSO user
        await upsertProfileFromSession(sessionResult.session);

        console.log("AuthCallback: Profile synced successfully");

        // Important: Wait a moment for AuthProvider's onAuthStateChange to fire
        // This ensures the session is properly set in the app state
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log("AuthCallback: Navigating to Main screen");
        handledRef.current = true;
        // Reset navigation to Main - AuthProvider will handle routing to onboarding if needed
        // The AppNavigator already checks onboarding status based on session
        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      } catch (e) {
        console.error("OAuth callback error:", e);
        handledRef.current = true;
        setError(e.message || "Authentication failed");

        // After showing error briefly, go back to login
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }, 2000);
      }
    };

    console.log("AuthCallback: useEffect running, current session:", session?.user?.email || "No session");

    // Handle initial URL (when app is opened from closed state)
    Linking.getInitialURL().then((url) => {
      console.log("AuthCallback: getInitialURL returned:", url || "null");
      if (url && !session?.user) {
        // Only process URL if we don't already have a session
        handleOAuthCallback(url);
      } else if (!url) {
        console.log("AuthCallback: No initial URL available, waiting for redirect event");
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
      console.log("AuthCallback: Timeout waiting for provider redirect");

      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          console.log("AuthCallback: Session materialized during timeout, redirecting");
          handledRef.current = true;
          navigation.reset({ index: 0, routes: [{ name: "Main" }] });
          return;
        }
      } catch (timeoutError) {
        console.warn("AuthCallback: Error checking session during timeout", timeoutError);
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
    backgroundColor: "#fff",
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
    color: "#333",
  },
  errorText: {
    fontSize: 16,
    color: "#e74c3c",
    textAlign: "center",
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
