import { NavigationContainer, useFocusEffect } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../auth/authProvider";
import WalkCameraScreen from "../screens/Walk/WalkCameraScreen";
import OnboardingQuizScreen from "../screens/Quiz/OnboardingQuizScreen";
import LoginScreen from "../screens/Auth/LoginScreen";
import ProfileDetailScreen from "../screens/Profile/ProfileDetailScreen";
import { userNeedsOnboarding } from "../api/quizApi";
import BottomTabNavigator from "./BottomTabNavigator";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  React.useEffect(() => {
    console.log("Session:", session);
    console.log("Loading:", loading);
  }, [session, loading]);

  // Check onboarding status when session is ready
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (session?.user?.id && !loading) {
        try {
          const needsQuiz = await userNeedsOnboarding(session.user.id);
          setNeedsOnboarding(needsQuiz);
        } catch (error) {
          console.error('Error checking onboarding status:', error);
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
          console.log('Quiz completion detected, updating navigation');
          setNeedsOnboarding(false);
        }
      } catch (error) {
        console.error('Error re-checking onboarding status:', error);
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

  return (
    <NavigationContainer>
      <Stack.Navigator id="RootNav" screenOptions={{ headerShown: false }}>
        {!session ? (
          // No session, show login screen
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : needsOnboarding ? (
          // User needs to complete onboarding quiz
          <Stack.Screen 
            name="OnboardingQuiz" 
            component={OnboardingQuizScreen}
            options={{ headerShown: false }}
          />
        ) : (
          // User has completed onboarding, show main app
          <>
            <Stack.Screen name="Main" component={BottomTabNavigator} />
            <Stack.Screen
              name="WalkCameraScreen"
              component={WalkCameraScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProfileDetail"
              component={ProfileDetailScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
