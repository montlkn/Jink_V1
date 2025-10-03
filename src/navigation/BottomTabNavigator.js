/*
  File: /src/navigation/BottomTabNavigator.js
  Description: Enhanced liquid glass tab bar with premium BlurView effects
*/
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import HomeScreen from "../screens/Home/HomeScreen";
import PassportScreen from "../screens/Passport/PassportScreen";
import ScanScreen from "../screens/Scan/ScanScreen";
import SearchScreen from "../screens/Search/SearchScreen";
import WalkStackNavigator from "./WalkStackNavigator";

const Tab = createBottomTabNavigator();

// Enhanced Liquid Glass Tab Bar
const EnhancedGlassTabBar = ({ routes, currentIndex, onTabPress }) => (
  <View style={styles.glassContainer}>
    <BlurView intensity={100} tint="light" style={styles.blurPill}>
      {/* Multi-layer glass effect */}
      <LinearGradient
        colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientOverlay}
      />
      <View style={styles.glassOverlay} />
      
      {/* Tab buttons */}
      {routes.map((route, index) => {
        const isFocused = currentIndex === index;
        return (
          <TouchableOpacity
            key={index}
            onPress={() => onTabPress(index)}
            style={[
              styles.tabButton,
              isFocused && styles.tabButtonFocused
            ]}
            activeOpacity={0.8}
          >
            {/* Focused state glow */}
            {isFocused && (
              <BlurView 
                intensity={35} 
                tint="light" 
                style={styles.focusedGlow}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.1)']}
                  style={styles.focusedGlowGradient}
                />
              </BlurView>
            )}
            
            <Ionicons
              name={route.icon}
              size={24}
              color={isFocused ? "#000" : "#666"}
              style={{ 
                opacity: isFocused ? 1 : 0.7,
                transform: [{ scale: isFocused ? 1.1 : 1 }]
              }}
            />
            <Text
              style={{
                color: isFocused ? "#000" : "#666",
                fontSize: 10,
                marginTop: 4,
                fontWeight: isFocused ? "600" : "500",
                opacity: isFocused ? 1 : 0.7,
              }}
            >
              {route.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </BlurView>
  </View>
);

// Enhanced Search Button
const EnhancedGlassSearchButton = ({ onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.searchButtonContainer}
    activeOpacity={0.7}
  >
    <BlurView intensity={80} tint="light" style={styles.searchButtonBlur}>
      <LinearGradient
        colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.searchGradient}
      />
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

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBarPillContainer}>
        <EnhancedGlassTabBar
          routes={tabRoutes}
          currentIndex={currentIndex}
          onTabPress={handleTabPress}
        />
      </View>
      <EnhancedGlassSearchButton onPress={handleSearchPress} />
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
  glassContainer: {
    flex: 1,
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
  },
  blurPill: {
    flex: 1,
    flexDirection: "row",
    height: "100%",
    borderRadius: 50,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 50,
    borderWidth: 1,
    borderTopWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.6)",
    borderBottomColor: "rgba(255,255,255,0.2)",
    borderLeftColor: "rgba(255,255,255,0.35)",
    borderRightColor: "rgba(255,255,255,0.35)",
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    position: "relative",
  },
  tabButtonFocused: {
    transform: [{ scale: 1.05 }],
  },
  focusedGlow: {
    position: "absolute",
    width: "80%",
    height: "80%",
    borderRadius: 25,
    overflow: "hidden",
  },
  focusedGlowGradient: {
    flex: 1,
    borderRadius: 25,
  },
  searchButtonContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginLeft: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
  },
  searchButtonBlur: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  searchGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
  },
  searchGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 30,
    borderWidth: 1,
    borderTopWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.6)",
    borderBottomColor: "rgba(255,255,255,0.2)",
    borderLeftColor: "rgba(255,255,255,0.35)",
    borderRightColor: "rgba(255,255,255,0.35)",
  },
});

export default BottomTabNavigator;