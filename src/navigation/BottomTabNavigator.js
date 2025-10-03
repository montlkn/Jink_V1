/*
  File: /src/navigation/BottomTabNavigator.js
  Description: Native iOS liquid glass tab bar using Expo UI + SwiftUI with <Host> components.
  Based on: https://expo.dev/blog/liquid-glass-app-with-expo-ui-and-swiftui
*/
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";

import HomeScreen from "../screens/Home/HomeScreen";
import PassportScreen from "../screens/Passport/PassportScreen";
import ScanScreen from "../screens/Scan/ScanScreen";
import SearchScreen from "../screens/Search/SearchScreen";
import WalkStackNavigator from "./WalkStackNavigator";

const Tab = createBottomTabNavigator();

// Dynamically import Expo UI for SwiftUI support
let Host, HStack, VStack, SwiftText, Spacer;
let glassEffect, padding, cornerRadius, shadow, animation;
let expoUIAvailable = false;

try {
  const expoUI = require("@expo/ui");
  if (expoUI?.Host) {
    Host = expoUI.Host;
    HStack = expoUI.HStack;
    VStack = expoUI.VStack;
    SwiftText = expoUI.Text;
    Spacer = expoUI.Spacer;

    const modifiers = expoUI.modifiers || {};
    glassEffect = modifiers.glassEffect;
    padding = modifiers.padding;
    cornerRadius = modifiers.cornerRadius;
    shadow = modifiers.shadow;
    animation = modifiers.animation;

    expoUIAvailable = true;
    console.log("✅ Expo UI SwiftUI available - using native liquid glass");
  }
} catch (e) {
  console.log("ℹ️ Expo UI not available, using BlurView fallback");
}

// iOS Native SwiftUI Tab Bar using <Host>
const NativeSwiftUITabBar = ({ routes, currentIndex, onTabPress }) => {
  if (!expoUIAvailable || !Host) return null;

  return (
    <Host style={styles.hostContainer}>
      <HStack spacing={0} alignment="center">
        {routes.map((route, index) => {
          const isFocused = currentIndex === index;

          return (
            <VStack
              key={index}
              spacing={4}
              alignment="center"
              modifiers={[
                // Liquid glass effect - ultraThin material with vibrancy
                glassEffect && glassEffect({
                  material: "ultraThinMaterial",
                  vibrancy: true,
                }),
                // Padding
                padding && padding({ vertical: 12, horizontal: 16 }),
                // Spring animation on tap
                animation && animation({
                  type: "spring",
                  response: 0.3,
                  dampingFraction: 0.6,
                }),
                // Shadow for depth
                shadow && shadow({
                  color: "black",
                  radius: isFocused ? 12 : 8,
                  x: 0,
                  y: isFocused ? 6 : 4,
                  opacity: isFocused ? 0.2 : 0.1,
                }),
              ].filter(Boolean)}
              style={{
                flex: 1,
                transform: [{ scale: isFocused ? 1.05 : 1 }],
              }}
              onPress={() => onTabPress(index)}
            >
              {/* Icon - render via prop bridge */}
              <View style={{ opacity: isFocused ? 1 : 0.6 }}>
                <Ionicons
                  name={route.icon}
                  size={24}
                  color={isFocused ? "#000" : "#666"}
                />
              </View>

              {/* Label */}
              {SwiftText && (
                <SwiftText
                  style={{
                    fontSize: 10,
                    fontWeight: isFocused ? "600" : "400",
                    color: isFocused ? "#000" : "#666",
                  }}
                >
                  {route.label}
                </SwiftText>
              )}
            </VStack>
          );
        })}
      </HStack>
    </Host>
  );
};

// Fallback BlurView Tab Bar for Android or if SwiftUI unavailable
const FallbackTabBar = ({ routes, currentIndex, onTabPress }) => (
  <BlurView intensity={40} tint="light" style={styles.blurPill}>
    <View style={styles.glassOverlay} />
    {routes.map((route, index) => {
      const isFocused = currentIndex === index;
      return (
        <TouchableOpacity
          key={index}
          onPress={() => onTabPress(index)}
          style={styles.tabButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name={route.icon}
            size={24}
            color={isFocused ? "#000" : "#666"}
          />
          <Text
            style={{
              color: isFocused ? "#000" : "#666",
              fontSize: 10,
              marginTop: 4,
              fontWeight: isFocused ? "600" : "400",
            }}
          >
            {route.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </BlurView>
);

// Native SwiftUI Search Button
const NativeSwiftUISearchButton = ({ onPress }) => {
  if (!expoUIAvailable || !Host) return null;

  return (
    <Host style={styles.searchHostContainer}>
      <VStack
        alignment="center"
        justifyContent="center"
        modifiers={[
          glassEffect && glassEffect({
            material: "thinMaterial",
            vibrancy: true,
          }),
          padding && padding({ all: 16 }),
          cornerRadius && cornerRadius(30),
          shadow && shadow({
            color: "black",
            radius: 15,
            x: 0,
            y: 8,
            opacity: 0.2,
          }),
        ].filter(Boolean)}
        onPress={onPress}
      >
        <Ionicons name="search" size={28} color="#000" />
      </VStack>
    </Host>
  );
};

// Fallback Search Button
const FallbackSearchButton = ({ onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.searchButtonContainer}
    activeOpacity={0.8}
  >
    <BlurView
      intensity={40}
      tint="light"
      style={styles.searchButtonBlur}
    >
      <View style={styles.searchGlassOverlay} />
      <Ionicons name="search" size={28} color="#000" />
    </BlurView>
  </TouchableOpacity>
);

// Main Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const mainTabs = state.routes.filter((route) => route.name !== "Search");
  const currentIndex = mainTabs.findIndex((r) => state.index === state.routes.indexOf(r));

  const handleTabPress = (index) => {
    const route = mainTabs[index];
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (currentIndex !== index && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const handleSearchPress = () => {
    navigation.navigate("Search");
  };

  // Map routes to icon/label data
  const tabRoutes = mainTabs.map((route) => {
    const label = descriptors[route.key]?.options?.tabBarLabel ?? route.name;
    const iconMap = {
      Home: "home",
      Camera: "camera",
      Derive: "map",
      Passport: "person",
    };
    const iconName = iconMap[route.name] || "circle";
    const isFocused = currentIndex === mainTabs.indexOf(route);

    return {
      icon: isFocused ? iconName : `${iconName}-outline`,
      label,
    };
  });

  const useNativeSwiftUI = Platform.OS === "ios" && expoUIAvailable;

  return (
    <View style={styles.tabBarContainer}>
      {/* Main Tab Bar */}
      <View style={styles.tabBarPillContainer}>
        {useNativeSwiftUI ? (
          <NativeSwiftUITabBar
            routes={tabRoutes}
            currentIndex={currentIndex}
            onTabPress={handleTabPress}
          />
        ) : (
          <FallbackTabBar
            routes={tabRoutes}
            currentIndex={currentIndex}
            onTabPress={handleTabPress}
          />
        )}
      </View>

      {/* Floating Search Button */}
      {useNativeSwiftUI ? (
        <NativeSwiftUISearchButton onPress={handleSearchPress} />
      ) : (
        <FallbackSearchButton onPress={handleSearchPress} />
      )}
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
      <Tab.Screen name="Camera" component={ScanScreen} />
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
  tabBarPillContainer: {
    flex: 1,
    height: "100%",
  },
  hostContainer: {
    flex: 1,
    height: "100%",
    borderRadius: 50,
    overflow: "hidden",
  },
  searchHostContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginLeft: 10,
    overflow: "hidden",
  },
  // Fallback styles (BlurView)
  blurPill: {
    flex: 1,
    flexDirection: "row",
    height: "100%",
    borderRadius: 50,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 50,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.6)",
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  searchButtonContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginLeft: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
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
  searchGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 30,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.7)",
  },
});

export default BottomTabNavigator;
