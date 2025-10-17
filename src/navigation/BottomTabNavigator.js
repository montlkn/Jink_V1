import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import LiquidGlassBottomTab from "./LiquidGlassBottomTab";

// Screens
import HomeScreen from "../screens/Home/HomeScreen";
import PassportScreen from "../screens/Passport/PassportScreen";
import WalkCameraScreen from "../screens/Walk/WalkCameraScreen";
import WalkStackNavigator from "./WalkStackNavigator";

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
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: "home-outline",
        }}
      />
      <Tab.Screen
        name="Scan"
        component={WalkCameraScreen}
        options={{
          tabBarLabel: "Scan",
          tabBarIcon: "scan-outline",
        }}
      />
      <Tab.Screen
        name="Jink"
        component={WalkStackNavigator}
        options={{
          tabBarLabel: "Jink",
          tabBarIcon: "map-outline",
        }}
      />
      <Tab.Screen
        name="Passport"
        component={PassportScreen}
        options={{
          tabBarLabel: "Passport",
          tabBarIcon: "document-outline",
        }}
        />
    </Tab.Navigator>
  );
}