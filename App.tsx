import React, { useState, useEffect } from 'react';
import { StatusBar, Alert } from 'react-native';
import FlashMessage from "react-native-flash-message";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import IndexNavigation from './navigation/IndexNavigation.jsx';
import ContextProvider from './context/ContextProvider.jsx';
import InAppNotification from './screens/Main/components/InAppNotification.jsx';

import { authEvents } from './helpers/authEvents.js';
import { notificationRef } from './helpers/notificationHelper.js';

import { Text, TextInput, Platform } from 'react-native';
import { TikTokBusiness } from 'react-native-tiktok-business-sdk';
import {
  TIKTOK_APP_ID_IOS,
  TIKTOK_APP_ID_ANDROID,
  TIKTOK_SECRET_IOS,
  TIKTOK_SECRET_ANDROID
} from '@env';

// Patch pentru React 19 / RN 0.83
(Text as any).render = ((originalRender) => {
  return function(props: any, ref: any) {
    return originalRender({ allowFontScaling: false, maxFontSizeMultiplier: 1, ...props }, ref);
  };
})((Text as any).render);


export default function App(){

  const [appKey, setAppKey] = useState(0);

  useEffect(() => {
    const handleReload = () => {
      setAppKey(prev => prev + 1);
    };
    authEvents.on('FORCE_RELOAD', handleReload);
    return () => authEvents.off('FORCE_RELOAD', handleReload);
  }, []);

// TikTok Business SDK Setup
  useEffect(() => {
    async function setupTikTok() {
      try {
        // 1. Identificatorii aplicației din magazine (App Store ID vs Package Name)
        const appId = Platform.OS === 'ios' ? '6760683057' : 'com.mobilefrontendframe';

        // 2. TikTok App ID-urile din TikTok Events Manager (separate pe OS)
        const tiktokAppId = Platform.OS === 'ios' 
          ? TIKTOK_APP_ID_IOS 
          : TIKTOK_APP_ID_ANDROID;

        // 3. App Secrets / Access Tokens (separate pe OS)
        const accessToken = Platform.OS === 'ios' 
          ? TIKTOK_SECRET_IOS 
          : TIKTOK_SECRET_ANDROID;

        if (!tiktokAppId || !accessToken) {
          console.warn('TikTok config lipsește pentru platforma:', Platform.OS);
          return;
        }

        // 4. Inițializarea propriu-zisă
        // Parametrii: (appId, tiktokAppId, accessToken, isDebugMode)
        await TikTokBusiness.initializeSdk(appId, tiktokAppId, accessToken, false);
        console.log(`TikTok SDK initialized for ${Platform.OS}`);


        // Trimitere evenimente pendinte
        await TikTokBusiness.flush();
      } catch (e) {
        console.error('TikTok setup error:', e);
      }
    }

    setupTikTok();
  }, []);

  return(
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ContextProvider key={appKey}>
          <IndexNavigation />
          <FlashMessage position="top" />
          <InAppNotification ref={notificationRef} />
        </ContextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};