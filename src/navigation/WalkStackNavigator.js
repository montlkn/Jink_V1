import WalkStartScreen from "@/screens/Walk/WalkStartScreen";
import { createStackNavigator } from "@react-navigation/stack";
import WalkNavScreen from "../screens/Walk/WalkNavScreen";
import WalkSetupScreen from "../screens/Walk/WalkSetupScreen";

const WalkStack = createStackNavigator();

const WalkStackNavigator = () => {
  return (
    <WalkStack.Navigator screenOptions={{ headerShown: false }}>
      <WalkStack.Screen name="WalkStartScreen" component={WalkStartScreen} />
      <WalkStack.Screen name="WalkSetupScreen" component={WalkSetupScreen} />
      <WalkStack.Screen name="WalkNavScreen" component={WalkNavScreen} />
    </WalkStack.Navigator>
  );
};

export default WalkStackNavigator;
