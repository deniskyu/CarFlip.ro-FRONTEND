import React, { useState, useEffect, useContext } from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { Context } from "../context/Context.js";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MainNavigation from './MainNavigation/MainNavigation.jsx';
import RegisterNavigation from './RegisterNavigation.jsx';
import SplashScreen from '../screens/SplashScreen.jsx';
import ForceUpdateScreen from '../screens/ForceUpdateScreen.jsx';
import { assets } from '../assets.js';
import { navigationRef } from '../helpers/NavigationService.js';

const linking = {
    prefixes: ['carflip://'],
    config: {
        screens: {
            HomeTab: {
                screens: {
                    MainScreen: 'post/:saleId',
                    SearchProfileResult: 'profile/:userId',
                }
            }
        }
    }
};

export default function IndexNavigation() {
    const { isLogged, authLoading, setIsNavReady } = useContext(Context);
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);
    const [forceUpdate, setForceUpdate] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setMinTimeElapsed(true);
        }, 1000);

        // Version check în paralel cu splash timer
        const checkVersion = async () => {
            try {
                const res = await fetch(`${assets.url}/api/app/version`);
                const data = await res.json();
                if (data.success && assets.app_version < data.version) {
                    setForceUpdate(true);
                }
            } catch (e) {
                console.log('VERSION CHECK FAILED:', e.message);
                // Dacă eșuează, lasă userul să continue
            }
        };

        checkVersion();
        return () => clearTimeout(timer);
    }, []);

    if (!minTimeElapsed || authLoading) {
        return <SplashScreen />;
    }

    if (forceUpdate) {
        return <ForceUpdateScreen />;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
                <NavigationContainer
                    ref={navigationRef}
                    linking={linking}
                    onReady={() => {
                        console.log("🏁 [Navigation] Container is READY!");
                        if (setIsNavReady) setIsNavReady(true);
                    }}
                >
                    {isLogged ? <MainNavigation /> : <RegisterNavigation />}
                </NavigationContainer>
            </View>
        </GestureHandlerRootView>
    );
}