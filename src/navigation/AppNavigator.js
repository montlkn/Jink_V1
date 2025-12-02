import { log } from "@/lib/log";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { preloadOrbAssets } from "../services/orbAssets";

import { userNeedsOnboarding } from "@/features/quiz";
import { useAuth } from "../auth/authProvider";
import AuthCallbackScreen from "../screens/Auth/AuthCallbackScreen";
import LoginScreen from "../screens/Auth/LoginScreen";
import PastWalksNolliScreen from "../screens/PastWalks/PastWalksNolliScreen";
import NolliSkiaScreen from "../screens/PastWalks/NolliSkiaScreen";
import ProfileDetailScreen from "../screens/Profile/ProfileDetailScreen";
import OnboardingQuizScreen from "../screens/Quiz/OnboardingQuizScreen";
import BuildingInfoScreen from "../screens/Scan/BuildingInfoScreen";
import NotFoundScreen from "../screens/Scan/NotFoundScreen";
import BottomTabNavigator from "./BottomTabNavigator";
// Test screens removed

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  React.useEffect(() => {
    log.debug("Session:", session);
    log.debug("Loading:", loading);
  }, [session, loading]);

  // Preload orb assets early to avoid first-load hitch
  useEffect(() => {
    preloadOrbAssets();
  }, []);

  // Check onboarding status when session is ready
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (session?.user?.id && !loading) {
        try {
          const needsQuiz = await userNeedsOnboarding(session.user.id);
          setNeedsOnboarding(needsQuiz);
        } catch (error) {
          log.error('Error checking onboarding status:', error);
          // Default to needing onboarding if there's an error
          setNeedsOnboarding(true);
        } finally {
          setCheckingOnboarding(false);
        }
      } else if (!session && !loading) {
        // No session, don't need to check onboarding
        setNeedsOnboarding(false);
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [session, loading]);

  // Periodically re-check onboarding status when user might be completing quiz
  useEffect(() => {
    if (!session?.user?.id || !needsOnboarding) return;

    const interval = setInterval(async () => {
      try {
        const stillNeedsQuiz = await userNeedsOnboarding(session.user.id);
        if (!stillNeedsQuiz && needsOnboarding) {
          log.debug('Quiz completion detected, updating navigation');
          setNeedsOnboarding(false);
        }
      } catch (error) {
        log.error('Error re-checking onboarding status:', error);
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [session?.user?.id, needsOnboarding]);

  if (loading || checkingOnboarding) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Configure deep linking so jink://auth/callback routes to AuthCallback
  const linking = {
    prefixes: [Linking.createURL("/"), "jink://"],
    config: {
      screens: {
        AuthCallback: "auth/callback",
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator id="RootNav" screenOptions={{ headerShown: false }}>
        {!session ? (
          // No session, show login screen
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AuthCallback"
              component={AuthCallbackScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : needsOnboarding ? (
          // User needs to complete onboarding quiz
          <>
            <Stack.Screen
              name="OnboardingQuiz"
              component={OnboardingQuizScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AuthCallback"
              component={AuthCallbackScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // User has completed onboarding, show main app
          <>
            <Stack.Screen name="Main" component={BottomTabNavigator} />
            <Stack.Screen
              name="ProfileDetail"
              component={ProfileDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BuildingInfo"
              component={BuildingInfoScreen}
              options={{ headerShown: true, title: "Building Details" }}
            />
            <Stack.Screen
              name="NotFound"
              component={NotFoundScreen}
              options={{ headerShown: true, title: "Scan Result" }}
            />
            <Stack.Screen
              name="PastWalksNolli"
              component={PastWalksNolliScreen}
              options={{ headerShown: false, presentation: "fullScreenModal" }}
            />
            <Stack.Screen
              name="NolliSkia"
              component={NolliSkiaScreen}
              options={{ headerShown: false, presentation: "fullScreenModal" }}
            />
            <Stack.Screen
              name="AuthCallback"
              component={AuthCallbackScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
