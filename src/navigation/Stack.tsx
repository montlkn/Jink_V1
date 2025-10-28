import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { screens, type RootParams } from "./routes";
import { navRef } from "./nav";
import { linking } from "./linking";

import BottomTabNavigator from "@/navigation/BottomTabNavigator";
import HomeScreen from "@/screens/Home/HomeScreen";
import QuestsScreen from "@/screens/Quests/QuestsScreen";
import WalkSummaryScreen from "@/screens/Walk/WalkSummaryScreen";
import AuthLoginScreen from "@/screens/Auth/LoginScreen";
import AuthCallbackScreen from "@/screens/Auth/AuthCallbackScreen";
import OnboardingQuizScreen from "@/screens/Quiz/OnboardingQuizScreen";
import ProfileScreen from "@/screens/Profile/ProfileScreen";
import PassportScreen from "@/screens/Passport/PassportScreen";
import PassportListDetailScreen from "@/screens/Passport/ListDetailScreen";
import SearchScreen from "@/screens/Search/SearchScreen";
import ScanScreen from "@/screens/Scan/ScanScreen";
import CameraScreen from "@/screens/Scan/CameraScreen";
import ContributionScreen from "@/screens/Scan/ContributionScreen";
import WalkStartScreen from "@/screens/Walk/WalkStartScreen";
import WalkNavScreen from "@/screens/Walk/WalkNavScreen";
import WalkCameraScreen from "@/screens/Walk/WalkCameraScreen";
import WalkSetupScreen from "@/screens/Walk/WalkSetupScreen";
import BuildingDetailsScreen from "@/screens/Walk/BuildingModule";
import BuildingInfoScreen from "@/screens/Scan/BuildingInfoScreen";
import NotFoundScreen from "@/screens/Scan/NotFoundScreen";
import PastWalksNolliScreen from "@/screens/PastWalks/PastWalksNolliScreen";
import { useAuth } from "@/auth/authProvider";

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
            <Stack.Screen name={screens.Home} component={HomeScreen} />
            <Stack.Screen name={screens.Quests} component={QuestsScreen} />
            <Stack.Screen name={screens.WalkSummary} component={WalkSummaryScreen} />
            <Stack.Screen name={screens.Profile} component={ProfileScreen} />
            <Stack.Screen name={screens.Passport} component={PassportScreen} />
            <Stack.Screen name={screens.PassportListDetail}>
              {(props: any) => <PassportListDetailScreen {...props} />}
            </Stack.Screen>
            <Stack.Screen name={screens.Search} component={SearchScreen} />
            <Stack.Screen name={screens.Scan} component={ScanScreen} />
            <Stack.Screen name={screens.ScanCamera} component={CameraScreen} />
            <Stack.Screen
              name={screens.ScanContribution}
              component={ContributionScreen}
            />
            <Stack.Screen name={screens.WalkStart} component={WalkStartScreen} />
            <Stack.Screen name={screens.WalkSetup} component={WalkSetupScreen} />
            <Stack.Screen name={screens.WalkNav} component={WalkNavScreen} />
            <Stack.Screen name={screens.WalkCamera} component={WalkCameraScreen} />
            <Stack.Screen name={screens.BuildingModule} component={BuildingDetailsScreen} />
            <Stack.Screen name={screens.BuildingInfo} component={BuildingInfoScreen} />
            <Stack.Screen name={screens.NotFound} component={NotFoundScreen} />
            <Stack.Screen name={screens.PastWalksNolli}>
              {(props: any) => <PastWalksNolliScreen {...props} />}
            </Stack.Screen>
            <Stack.Screen name={screens.OnboardingQuiz} component={OnboardingQuizScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
