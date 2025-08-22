import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../auth/authProvider";
import LoginScreen from "../screens/Auth/LoginScreen";
import BottomTabNavigator from "./BottomTabNavigator";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading } = useAuth();
  React.useEffect(() => {
    console.log("Session:", session);
    console.log("Loading:", loading);
  }, [session, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Main" component={BottomTabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
        {/* Add other screens here if needed */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
