import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "../screens/Splash";
import AuthScreen from "../screens/Auth";
import LoginScreen from "../screens/Login";
import HomeScreen from "../screens/Home";
import RegisterScreen from "../screens/Register";
import TutorialsScreen from "../screens/Tutorials";
import MeasureForm from "../screens/MeasureForm";
import MeasureSelectAnimal from "../screens/MeasureSelectAnimal";
import PositionScreen from "../screens/Position";
import MeasureScreen from "../screens/Measure";
import ProfileScreen from "../screens/Profile";
import RegisterFarm from "../screens/RegisterFarm";
import NotificationsScreen from "../screens/Notifications";
import FarmScreen from "../screens/Farm";
import EditFarm from "../screens/EditFarm";
import EditUser from "../screens/EditUser";
import HerdScreen from "../screens/Herd";
import RegisterAnimal from "../screens/RegisterAnimal";
import EditAnimal from "../screens/EditAnimal";
import AnimalScreen from "../screens/Animal";
import ReportFarm from "../screens/ReportFarm";
import ReportAnimal from "../screens/ReportAnimal";
import PositionRfidScreen from "../screens/PositionRfid";
import IdentifiedAnimalScreen from "../screens/IdentifiedAnimal";
import FaqScreen from "../screens/Faq";

const Stack = createNativeStackNavigator();

export default function Routes() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Tutorials" component={TutorialsScreen} />

        <Stack.Screen name="Measure" component={MeasureForm} />
        <Stack.Screen name="MeasureSelectAnimal" component={MeasureSelectAnimal} />
        <Stack.Screen name="Position" component={PositionScreen} />
        <Stack.Screen name="MeasureScreen" component={MeasureScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="RegisterFarm" component={RegisterFarm} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Farm" component={FarmScreen} />
        <Stack.Screen name="EditFarm" component={EditFarm} />
        <Stack.Screen name="EditUser" component={EditUser} />
        <Stack.Screen name="Herd" component={HerdScreen} />
        <Stack.Screen name="RegisterAnimal" component={RegisterAnimal} />
        <Stack.Screen name="EditAnimal" component={EditAnimal} />
        <Stack.Screen name="Animal" component={AnimalScreen} />
        <Stack.Screen name="ReportFarm" component={ReportFarm} />
        <Stack.Screen name="ReportAnimal" component={ReportAnimal} />
        <Stack.Screen name="PositionRfid" component={PositionRfidScreen} />
        <Stack.Screen name="IdentifiedAnimal" component={IdentifiedAnimalScreen} />
        <Stack.Screen name="Faq" component={FaqScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}