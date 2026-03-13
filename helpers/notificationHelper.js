import { 
    getMessaging, 
    getToken, 
    requestPermission, 
    onMessage, 
    onNotificationOpenedApp, 
    getInitialNotification,
    onTokenRefresh 
} from '@react-native-firebase/messaging';
import { createRef } from 'react';
import { emitter } from './eventBus.js'; 
const messaging = getMessaging();
export const notificationRef = createRef();
export function showInAppNotification(title, body, onPressAction) {
    if (notificationRef.current) {
        notificationRef.current.show(title, body, onPressAction);
    }
}
export async function requestUserPermission() {
    try {
        const authStatus = await requestPermission(messaging);
        const enabled = 
            authStatus === 1 || 
            authStatus === 2;   
        if (enabled) {
            console.log('Authorization status:', authStatus);
            return true;
        }
        return false;
    } catch (error) {
        console.log("Permission request error:", error);
        return false;
    }
}
export async function getFcmToken() {
    try {
        const hasPermission = await requestUserPermission();
        if (!hasPermission) {
            console.log('User declined permission');
            return null;
        }
        const fcmToken = await getToken(messaging);
        if (fcmToken) {
            console.log('Your Firebase Token is:', fcmToken);
            return fcmToken;
        } else {
            console.log('Failed', 'No token received');
            return null;
        }
    } catch (error) {
        console.log('Error getting token:', error);
        return null;
    }
}

export function listenTokenRefresh(onNewToken) {
    return onTokenRefresh(messaging, async newToken => {
        console.log('🔄 [FCM] Token rotit, sincronizăm cu serverul...');
        await onNewToken(newToken);
    });
}

export const notificationListener = (onNotificationReceived) => {
    const unsubscribeMessage = onMessage(messaging, async remoteMessage => {
        console.log("🔔 [Foreground] Notificare:", remoteMessage);
        const data = remoteMessage?.data;
        if (data && data.type !== 'NEW_MESSAGE') {
            emitter.emit('new_foreground_notification', remoteMessage);
            showInAppNotification(
                remoteMessage?.notification?.title || 'Notificare',
                remoteMessage?.notification?.body || 'Ai primit un mesaj nou',
                () => {
                    console.log("🔍 [FOREGROUND CLICK] Data trimis spre Context:", data);
                    onNotificationReceived(data);
                }
            );
        }
    });

    const unsubscribeOpened = onNotificationOpenedApp(messaging, remoteMessage => {
        console.log("🔔 [Background Click] Notificare:", remoteMessage);
        if (remoteMessage?.data) {
            console.log("🔍 [BACKGROUND CLICK] Data trimis spre Context:", remoteMessage.data);
            onNotificationReceived(remoteMessage.data);
        }
    });

    getInitialNotification(messaging).then(remoteMessage => {
        if (remoteMessage) {
            console.log("🔔 [Quit Click] Notificare inițială:", remoteMessage);
            if (remoteMessage.data) {
                console.log("🔍 [QUIT CLICK] Data trimis spre Context:", remoteMessage.data);
                setTimeout(() => {
                    onNotificationReceived(remoteMessage.data);
                }, 100);
            }
        }
    });

    return () => {
        unsubscribeMessage();
        unsubscribeOpened();
    };

};