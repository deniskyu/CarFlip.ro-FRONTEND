import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import FlashMessage from "react-native-flash-message";

import IndexNavigation from './navigation/IndexNavigation.jsx';
import ContextProvider from './context/ContextProvider.jsx';
import InAppNotification from './screens/Main/components/InAppNotification.jsx';

import { authEvents } from './helpers/authEvents.js';
import { notificationRef } from './helpers/notificationHelper.js'; 
import { Text } from 'react-native';


(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.maxFontSizeMultiplier = 1.25;

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
    <ContextProvider key={appKey}>
        <IndexNavigation />
        <FlashMessage position="top" /> 
        <InAppNotification ref={notificationRef} />
    </ContextProvider>
  );
};