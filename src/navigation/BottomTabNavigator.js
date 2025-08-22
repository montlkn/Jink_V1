/*
  File: /src/navigation/BottomTabNavigator.js
  Description: Manages the main bottom tab navigation and the custom "liquid glass" tab bar UI.
*/
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import HomeScreen from "../screens/Home/HomeScreen";
import PassportScreen from "../screens/Passport/PassportScreen";
import CameraScreen from "../screens/Scan/CameraScreen";
import SearchScreen from "../screens/Search/SearchScreen";
import WalkStackNavigator from "./WalkStackNavigator";

const Tab = createBottomTabNavigator();

// The Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const mainTabs = state.routes.filter((route) => route.name !== "Search");

  return (
    <View style={styles.tabBarContainer}>
      <BlurView intensity={40} tint="light" style={styles.blurPill}>
        {mainTabs.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === state.routes.indexOf(route);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = {
            Home: "home",
            Camera: "camera",
            Derive: "map",
            Passport: "person",
          }[route.name];

          return (
            <TouchableOpacity
              key={index}
              onPress={onPress}
              style={styles.tabButton}
            >
              <Ionicons
                name={isFocused ? iconName : `${iconName}-outline`}
                size={24}
                color={isFocused ? "#000" : "#999"}
              />
              <Text
                style={{
                  color: isFocused ? "#000" : "#999",
                  fontSize: 10,
                  marginTop: 4,
                  fontWeight: isFocused ? "600" : "400",
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
      <TouchableOpacity
        onPress={() => navigation.navigate("Search")}
        style={styles.searchButtonContainer}
      >
        <BlurView intensity={40} tint="light" style={styles.searchButtonBlur}>
          <Ionicons name="search" size={28} color="#000" />
        </BlurView>
      </TouchableOpacity>
    </View>
  );
};

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Camera" component={CameraScreen} />
      <Tab.Screen name="Derive" component={WalkStackNavigator} />
      <Tab.Screen name="Passport" component={PassportScreen} />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    height: 65,
    flexDirection: "row",
    alignItems: "center",
  },
  blurPill: {
    flex: 1,
    flexDirection: "row",
    height: "100%",
    borderRadius: 50,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  tabButton: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchButtonContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginLeft: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  searchButtonBlur: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.4)",
  },
});

export default BottomTabNavigator;
