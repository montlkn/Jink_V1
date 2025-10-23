import WalkStartScreen from "@/screens/Walk/WalkStartScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WalkNavScreen from "../screens/Walk/WalkNavScreen";
import WalkSetupScreen from "../screens/Walk/WalkSetupScreen";

const WalkStack = createNativeStackNavigator();

const WalkStackNavigator = () => {
  return (
    <WalkStack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <WalkStack.Screen name="WalkStartScreen" component={WalkStartScreen} />
      <WalkStack.Screen name="WalkSetupScreen" component={WalkSetupScreen} />
      <WalkStack.Screen name="WalkNavScreen" component={WalkNavScreen} />
    </WalkStack.Navigator>
  );
};

export default WalkStackNavigator;
