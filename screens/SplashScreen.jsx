import React from "react";
import { View, StyleSheet, ActivityIndicator, StatusBar, Dimensions, Image } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assets } from "../assets";

const { width, height } = Dimensions.get("window");

const SplashScreen = () => {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#fefefe" />
            
            <ActivityIndicator size="large" color="#800000" />

            <View style={[
                styles.bottomLogoContainer, 
                { bottom: insets.bottom + 20 }
            ]}>
                <Image 
                    source={assets.logo} 
                    style={styles.carImage} 
                    resizeMode="contain" 
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: width,
        height: height,
        backgroundColor: '#fefefe', 
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomLogoContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    carImage: {
        width: width * 0.3,
        height: width * 0.3,
    }
});

export default SplashScreen;