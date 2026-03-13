import {createNativeStackNavigator} from "@react-navigation/native-stack";
const Stack = createNativeStackNavigator();

import MainLoginScreen from '../screens/Login/MainLoginScreen.jsx';
import RegisterScreen from '../screens/Login/RegisterScreen.jsx';
import LoginScreen from '../screens/Login/LoginScreen.jsx';
import ForgotPasswordScreen from '../screens/Login/ForgotPasswordScreen.jsx';
import LegalScreen from "../screens/Main/LegalScreen.jsx";

export default function RegisterNavigation(){
    return(
        <Stack.Navigator>
            <Stack.Screen name='MainLoginScreen' component={MainLoginScreen} options={{headerShown: false}}/>
            <Stack.Screen name='LoginScreen' component={LoginScreen} options={{headerShown: false}}/>
            <Stack.Screen name='RegisterScreen' component={RegisterScreen} options={{headerShown: false}} />
            <Stack.Screen name='ForgotPasswordScreen' component={ForgotPasswordScreen} options={{headerShown: false}} />
            <Stack.Screen name="LegalScreen" component={LegalScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
    )
}