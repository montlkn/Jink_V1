import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import LiquidGlassBottomTab from "./LiquidGlassBottomTab";
import { screens } from "./routes";

import HomeScreen from "../screens/Home/HomeScreen";
import PassportScreen from "../screens/Passport/PassportScreen";
import WalkCameraScreen from "../screens/Walk/WalkCameraScreen";
import WalkStartScreen from "../screens/Walk/WalkStartScreen";

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <LiquidGlassBottomTab {...props} />}
    >
      <Tab.Screen
        name={screens.Home}
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: "home-outline",
        }}
      />
      <Tab.Screen
        name={screens.WalkCamera}
        component={WalkCameraScreen}
        options={{
          tabBarLabel: "Scan",
          tabBarIcon: "scan-outline",
        }}
      />
      <Tab.Screen
        name={screens.WalkStart}
        component={WalkStartScreen}
        options={{
          tabBarLabel: "Jink",
          tabBarIcon: "map-outline",
        }}
      />
      <Tab.Screen
        name={screens.Passport}
        component={PassportScreen}
        options={{
          tabBarLabel: "Passport",
          tabBarIcon: "document-outline",
        }}
      />
    </Tab.Navigator>
  );
}
