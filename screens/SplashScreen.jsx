import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const SplashScreen = () => {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#800000" />
            <View style={styles.content}>
                <Text style={styles.logoText}>CarFlip</Text>
                <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 30 }} />
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
        backgroundColor: '#800000', 
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    logoText: {
        fontSize: 52,
        fontWeight: '900',
        color: 'white',
        letterSpacing: 2,
        fontStyle: 'italic',
    }
});

export default SplashScreen;