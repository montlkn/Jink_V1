import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { screens, type RootParams } from "./routes";
import { navRef } from "./nav";
import { linking } from "./linking";

import BottomTabNavigator from "@/navigation/BottomTabNavigator";
import AuthLoginScreen from "@/screens/Auth/LoginScreen";
import AuthCallbackScreen from "@/screens/Auth/AuthCallbackScreen";
import { useAuth } from "@/auth/authProvider";
import { ScreenLoaders } from "./screenLoaders";

type AuthContextValue = {
  session: unknown;
  loading: boolean;
};

const Stack = createNativeStackNavigator<RootParams>();

export function AppStack() {
  const { session, loading } = useAuth() as AuthContextValue;

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer ref={navRef} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <Stack.Screen name={screens.AuthLogin} component={AuthLoginScreen} />
            <Stack.Screen name={screens.AuthCallback} component={AuthCallbackScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name={screens.Main} component={BottomTabNavigator} />
            <Stack.Screen name={screens.Home} getComponent={ScreenLoaders.Home} />
            <Stack.Screen name={screens.Quests} getComponent={ScreenLoaders.Quests} />
            <Stack.Screen
              name={screens.WalkSummary}
              getComponent={ScreenLoaders.WalkSummary}
            />
            <Stack.Screen name={screens.Profile} getComponent={ScreenLoaders.Profile} />
            <Stack.Screen name={screens.Passport} getComponent={ScreenLoaders.Passport} />
            <Stack.Screen
              name={screens.PassportListDetail}
              getComponent={ScreenLoaders.PassportListDetail}
            />
            <Stack.Screen name={screens.Search} getComponent={ScreenLoaders.Search} />
            <Stack.Screen name={screens.Scan} getComponent={ScreenLoaders.Scan} />
            <Stack.Screen
              name={screens.ScanCamera}
              getComponent={ScreenLoaders.ScanCamera}
            />
            <Stack.Screen
              name={screens.ScanContribution}
              getComponent={ScreenLoaders.ScanContribution}
            />
            <Stack.Screen name={screens.WalkStart} getComponent={ScreenLoaders.WalkStart} />
            <Stack.Screen name={screens.WalkSetup} getComponent={ScreenLoaders.WalkSetup} />
            <Stack.Screen name={screens.WalkNav} getComponent={ScreenLoaders.WalkNav} />
            <Stack.Screen
              name={screens.WalkCamera}
              getComponent={ScreenLoaders.WalkCamera}
            />
            <Stack.Screen
              name={screens.BuildingModule}
              getComponent={ScreenLoaders.BuildingModule}
            />
            <Stack.Screen
              name={screens.BuildingInfo}
              getComponent={ScreenLoaders.BuildingInfo}
            />
            <Stack.Screen name={screens.NotFound} getComponent={ScreenLoaders.NotFound} />
            <Stack.Screen
              name={screens.PastWalksNolli}
              getComponent={ScreenLoaders.PastWalksNolli}
            />
            <Stack.Screen
              name={screens.OnboardingQuiz}
              getComponent={ScreenLoaders.OnboardingQuiz}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
