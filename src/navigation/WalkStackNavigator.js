import WalkStartScreen from "@/screens/Walk/WalkStartScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WalkNavScreen from "../screens/Walk/WalkNavScreen";

const WalkStack = createNativeStackNavigator();

const WalkStackNavigator = () => {
  return (
    <WalkStack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <WalkStack.Screen name="WalkStartScreen" component={WalkStartScreen} />
      <WalkStack.Screen name="WalkNavScreen" component={WalkNavScreen} />
    </WalkStack.Navigator>
  );
};

export default WalkStackNavigator;
