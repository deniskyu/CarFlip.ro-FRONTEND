import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import FlashMessage from "react-native-flash-message";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import IndexNavigation from './navigation/IndexNavigation.jsx';
import ContextProvider from './context/ContextProvider.jsx';
import InAppNotification from './screens/Main/components/InAppNotification.jsx';

import { authEvents } from './helpers/authEvents.js';
import { notificationRef } from './helpers/notificationHelper.js'; 
import { Text, TextInput } from 'react-native';



interface ComponentWithRender {
    render?: (props: any, ref: any) => React.ReactElement;
}

const originalTextRender = (Text as unknown as ComponentWithRender).render;
if (originalTextRender) {
    (Text as unknown as ComponentWithRender).render = function render(props, ref) {
        return originalTextRender.apply(this, [
            { 
                ...props, 
                allowFontScaling: true,
                maxFontSizeMultiplier: 1.15
            }, 
            ref
        ]);
    };
}

const originalTextInputRender = (TextInput as unknown as ComponentWithRender).render;
if (originalTextInputRender) {
    (TextInput as unknown as ComponentWithRender).render = function render(props, ref) {
        return originalTextInputRender.apply(this, [
            { 
                ...props, 
                allowFontScaling: true, 
                maxFontSizeMultiplier: 1.15
            }, 
            ref
        ]);
    };
}

export default function App(){

  const [appKey, setAppKey] = useState(0);

  useEffect(() => {
    const handleReload = () => {
      setAppKey(prev => prev + 1);
    };
    authEvents.on('FORCE_RELOAD', handleReload);
    return () => authEvents.off('FORCE_RELOAD', handleReload);
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