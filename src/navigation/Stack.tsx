import { useAuth } from "@/auth/authProvider";
import BottomTabNavigator from "@/navigation/BottomTabNavigator";
import AuthCallbackScreen from "@/screens/Auth/AuthCallbackScreen";
import AuthLoginScreen from "@/screens/Auth/LoginScreen";
import { PassportProvider } from "@/state/PassportContext";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { linking } from "./linking";
import { navRef } from "./nav";
import { screens, type RootParams } from "./routes";
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
      {!session ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name={screens.AuthLogin} component={AuthLoginScreen} />
          <Stack.Screen name={screens.AuthCallback} component={AuthCallbackScreen} />
        </Stack.Navigator>
      ) : (
        <PassportProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name={screens.Main} component={BottomTabNavigator} />
            {/* <Stack.Screen name={screens.Quests} getComponent={ScreenLoaders.Quests} /> ARCHIVED for v1 - Quest feature removed */}
            <Stack.Screen
              name={screens.WalkSummary}
              getComponent={ScreenLoaders.WalkSummary}
            />
            <Stack.Screen name={screens.Profile} getComponent={ScreenLoaders.Profile} />
            <Stack.Screen name={screens.Passport} getComponent={ScreenLoaders.Passport} />
            <Stack.Screen
              name={screens.PassportStamps}
              getComponent={ScreenLoaders.PassportStamps}
            />
            <Stack.Screen
              name={screens.PassportAchievements}
              getComponent={ScreenLoaders.PassportAchievements}
            />
            <Stack.Screen
              name={screens.PassportVisas}
              getComponent={ScreenLoaders.PassportVisas}
            />
            <Stack.Screen
              name={screens.PassportLists}
              getComponent={ScreenLoaders.PassportLists}
            />
            <Stack.Screen
              name={screens.PassportListDetail}
              getComponent={ScreenLoaders.PassportListDetail}
            />
            {/* ARCHIVED for v2 - Search screen removed for v1 beta */}
            {/* <Stack.Screen name={screens.Search} getComponent={ScreenLoaders.Search} /> */}
            <Stack.Screen name={screens.Scan} getComponent={ScreenLoaders.Scan} />
            <Stack.Screen
              name={screens.ScanContribution}
              getComponent={ScreenLoaders.ScanContribution}
            />
            <Stack.Screen name={screens.WalkStart} getComponent={ScreenLoaders.WalkStart} />
            <Stack.Screen name={screens.WalkNav} getComponent={ScreenLoaders.WalkNav} />
            <Stack.Screen
              name={screens.BuildingModule}
              getComponent={ScreenLoaders.BuildingModule}
            />
            <Stack.Screen
              name={screens.BuildingInfo}
              getComponent={ScreenLoaders.BuildingInfo}
            />
            <Stack.Screen
              name={screens.RelatedBuildings}
              getComponent={ScreenLoaders.RelatedBuildings}
            />
            <Stack.Screen
              name={screens.SimilarBuildings}
              getComponent={ScreenLoaders.SimilarBuildings}
            />
            <Stack.Screen name={screens.NotFound} getComponent={ScreenLoaders.NotFound} />
            <Stack.Screen
              name={screens.PastWalksNolli}
              getComponent={ScreenLoaders.PastWalksNolli}
            />
            <Stack.Screen
              name={screens.NolliSkia}
              getComponent={ScreenLoaders.NolliSkia}
            />
            <Stack.Screen
              name={screens.OnboardingQuiz}
              getComponent={ScreenLoaders.OnboardingQuiz}
            />
            <Stack.Screen
              name={screens.QuizResults}
              getComponent={ScreenLoaders.QuizResults}
            />
            {/* Tour screens */}
            <Stack.Screen
              name={screens.TourSelect}
              getComponent={ScreenLoaders.TourSelect}
            />
            <Stack.Screen
              name={screens.TourNav}
              getComponent={ScreenLoaders.TourNav}
            />
            <Stack.Screen
              name={screens.TourComplete}
              getComponent={ScreenLoaders.TourComplete}
            />
            <Stack.Screen
              name={screens.SkylineAR}
              getComponent={ScreenLoaders.SkylineAR}
            />
            {/* Listings */}
            <Stack.Screen
              name={screens.BuildingListings}
              getComponent={ScreenLoaders.BuildingListings}
            />
            <Stack.Screen
              name={screens.ListingDetail}
              getComponent={ScreenLoaders.ListingDetail}
            />
            {/* Style map */}
            <Stack.Screen
              name={screens.StyleMap}
              getComponent={ScreenLoaders.StyleMap}
            />
          </Stack.Navigator>
        </PassportProvider>
      )}
    </NavigationContainer>
  );
}
