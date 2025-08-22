import WalkStartScreen from "@/screens/Walk/WalkStartScreen";
import { createStackNavigator } from "@react-navigation/stack";
import WalkNavScreen from "../screens/Walk/WalkNavScreen";
import WalkSetupScreen from "../screens/Walk/WalkSetupScreen";

const Stack = createStackNavigator();

const WalkStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WalkStartScreen" component={WalkStartScreen} />
      <Stack.Screen name="WalkSetupScreen" component={WalkSetupScreen} />
      <Stack.Screen name="WalkNavScreen" component={WalkNavScreen} />
    </Stack.Navigator>
  );
};

export default WalkStackNavigator;
