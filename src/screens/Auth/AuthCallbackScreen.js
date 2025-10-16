/* File: /src/screens/Auth/AuthCallbackScreen.js
  Description: Handles OAuth deep link callback
  Exchanges the OAuth code for a session and syncs the user profile
*/
import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { supabase } from "../../api/supabaseClient";
import { upsertProfileFromSession } from "../../auth/profileSync";
import { useAuth } from "../../auth/authProvider";

export default function AuthCallbackScreen({ navigation }) {
  const [error, setError] = useState(null);
  const { session } = useAuth();

  // If we already have a session and land on this screen, redirect immediately
  useEffect(() => {
    if (session?.user) {
      console.log("AuthCallback: Already have session, redirecting to Main");
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    }
  }, [session, navigation]);

  useEffect(() => {
    const handleOAuthCallback = async (url) => {
      try {
        console.log("AuthCallback: handleOAuthCallback called");
        console.log("AuthCallback: URL provided:", url ? "Yes" : "No");

        if (!url) {
          console.log("AuthCallback: No URL provided, checking for existing session");
          // Check if we have a session
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          console.log("AuthCallback: Existing session found:", existingSession ? "Yes" : "No");
          if (existingSession) {
            console.log("AuthCallback: Found existing session, redirecting to Main");
            navigation.reset({ index: 0, routes: [{ name: "Main" }] });
            return;
          }
          console.log("AuthCallback: No URL and no session, returning to login");
          setTimeout(() => {
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          }, 1000);
          return;
        }

        console.log("AuthCallback: Full callback URL:", url);

        // Parse the URL to check if it contains tokens or error
        const parsedUrl = Linking.parse(url);
        const params = parsedUrl.queryParams || {};

        console.log("AuthCallback: Parsed params:", JSON.stringify(params, null, 2));

        // Check for errors in the callback
        if (params.error) {
          console.error("AuthCallback: OAuth error in URL:", params.error);
          throw new Error(params.error_description || params.error);
        }

        // Supabase's exchangeCodeForSession handles both PKCE and implicit flow
        // It automatically detects the flow type and processes accordingly
        console.log("AuthCallback: Processing with exchangeCodeForSession");
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);

        if (exchangeError) {
          console.error("Exchange error:", exchangeError);
          throw exchangeError;
        }

        if (!exchangeData?.session) {
          throw new Error("No session returned from exchange");
        }

        console.log("AuthCallback: Session created successfully");
        console.log("AuthCallback: User ID:", exchangeData.session.user.id);
        console.log("AuthCallback: User email:", exchangeData.session.user.email);

        // Create or update profile for SSO user
        await upsertProfileFromSession(exchangeData.session);

        console.log("AuthCallback: Profile synced successfully");

        // Important: Wait a moment for AuthProvider's onAuthStateChange to fire
        // This ensures the session is properly set in the app state
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log("AuthCallback: Navigating to Main screen");

        // Reset navigation to Main - AuthProvider will handle routing to onboarding if needed
        // The AppNavigator already checks onboarding status based on session
        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      } catch (e) {
        console.error("OAuth callback error:", e);
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
      } else if (!url && !session?.user) {
        // No URL and no session - we were navigated here incorrectly
        console.log("AuthCallback: No URL and no session, checking Supabase directly");
        handleOAuthCallback(null);
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
