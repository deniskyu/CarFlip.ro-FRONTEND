import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Image } from 'react-native';
import { assets } from "../assets.js";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

import MainLoginScreen from '../screens/Login/MainLoginScreen.jsx';
import RegisterScreen from '../screens/Login/RegisterScreen.jsx';
import LoginScreen from '../screens/Login/LoginScreen.jsx';
import ForgotPasswordScreen from '../screens/Login/ForgotPasswordScreen.jsx';
import LegalScreen from "../screens/Main/LegalScreen.jsx";
import PublicMainScreen from '../screens/Main/PublicMainScreen.jsx';

function PublicTabWrapper() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: '#800000',
                    borderTopWidth: 0,
                    paddingBottom: 0,
                    marginBottom: 0,
                    ...(Platform.OS === 'ios' ? { height: 80, paddingTop: 10 } : { paddingBottom: 0, paddingTop: 2 }),
                },
            }}
        >
            <Tab.Screen
                name="PublicFeed"
                component={PublicMainScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Image
                            source={assets.home_icon}
                            style={{
                                width: 26,
                                height: 26,
                                resizeMode: 'contain',
                                tintColor: '#FFFFFF',
                            }}
                        />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

export default function RegisterNavigation() {
    return (
        <Stack.Navigator>
            <Stack.Screen name="PublicMainScreen" component={PublicTabWrapper} options={{ headerShown: false }} />
            <Stack.Screen name='MainLoginScreen' component={MainLoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name='LoginScreen' component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name='RegisterScreen' component={RegisterScreen} options={{ headerShown: false }} />
            <Stack.Screen name='ForgotPasswordScreen' component={ForgotPasswordScreen} options={{ headerShown: false }} />
            <Stack.Screen name="LegalScreen" component={LegalScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
    );
}