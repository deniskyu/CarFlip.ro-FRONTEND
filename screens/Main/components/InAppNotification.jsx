import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Animated, 
    Pressable, 
    Platform, 
    Dimensions 
} from 'react-native';

const { width } = Dimensions.get('window');
const TOP_PADDING = Platform.OS === 'ios' ? 60 : 40;

const InAppNotification = forwardRef((props, ref) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [onPressAction, setOnPressAction] = useState(null);
    
    const translateY = useRef(new Animated.Value(-150)).current;
    const timerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);


    useImperativeHandle(ref, () => ({
        show: (notificationTitle, notificationBody, action = null) => {

            setTitle(notificationTitle || 'Notificare');
            setMessage(notificationBody || '');
            setOnPressAction(() => action);


            if (timerRef.current) clearTimeout(timerRef.current);

            Animated.spring(translateY, {
                toValue: TOP_PADDING,
                useNativeDriver: true,
                friction: 5,
                tension: 40
            }).start();


            timerRef.current = setTimeout(() => {
                hideNotification();
            }, 4000);
        }
    }));

    const hideNotification = () => {
        Animated.timing(translateY, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true
        }).start();
    };

    const handlePress = () => {
        if (onPressAction) {
            onPressAction();
        }
        hideNotification();
    };

    return (
        <Animated.View 
            style={[
                styles.container, 
                { transform: [{ translateY }] }
            ]}
        >
            <Pressable 
                style={({ pressed }) => [
                    styles.contentContainer,
                    pressed && { opacity: 0.85 }
                ]}
                onPress={handlePress}
                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
            >
                <View style={styles.accentLine} />

                <View style={styles.textContainer}>
                    {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
                    <Text style={styles.message} numberOfLines={2}>{message}</Text>
                </View>
            </Pressable>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        elevation: 10, 
    },
    contentContainer: {
        width: width - 32,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        flexDirection: 'row',
        padding: 15,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 6,
        overflow: 'hidden'
    },
    accentLine: {
        width: 5,
        height: '150%',
        backgroundColor: '#800000',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
    },
    textContainer: {
        flex: 1,
        marginLeft: 10,
        justifyContent: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    message: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    }
});

export default InAppNotification;