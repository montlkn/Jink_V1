import { createBottomTabNavigator, type BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import LiquidGlassBottomTab from "./LiquidGlassBottomTab";
import { screens, type MainTabParams } from "./routes";

import HomeScreen from "@/screens/Home/HomeScreen";
import PassportScreen from "@/screens/Passport/PassportScreen";
import ScanScreen from "@/screens/Scan/ScanScreen";
import WalkStartScreen from "@/screens/Walk/WalkStartScreen";

const Tab = createBottomTabNavigator<MainTabParams>();

const asIconOption = (
  name: string
): NonNullable<BottomTabNavigationOptions["tabBarIcon"]> =>
  name as unknown as NonNullable<BottomTabNavigationOptions["tabBarIcon"]>;

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <LiquidGlassBottomTab {...props} />}
    >
      <Tab.Screen
        name={screens.Home}
        component={HomeScreen}
        options={{ tabBarLabel: "Home", tabBarIcon: asIconOption("home-outline") }}
      />
      <Tab.Screen
        name={screens.Scan}
        component={ScanScreen}
        options={{ tabBarLabel: "Scan", tabBarIcon: asIconOption("scan-outline") }}
      />
      <Tab.Screen
        name={screens.WalkStart}
        component={WalkStartScreen}
        options={{ tabBarLabel: "Jink", tabBarIcon: asIconOption("map-outline") }}
      />
      <Tab.Screen
        name={screens.Passport}
        component={PassportScreen}
        options={{
          tabBarLabel: "Passport",
          tabBarIcon: asIconOption("document-outline"),
        }}
      />
    </Tab.Navigator>
  );
}
