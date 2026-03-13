import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Linking, Image } from 'react-native';
import { assets } from '../assets.js';

export default function ForceUpdateScreen() {
    const storeUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com'
        : 'market://';

    const storeName = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.emoji}>🔧</Text>
                <Text style={styles.title}>Actualizare necesară</Text>
                <Text style={styles.subtitle}>
                    Versiunea ta CarFlip nu mai este suportată. Te rugăm să actualizezi aplicația din {storeName} pentru a continua.
                </Text>
                <Pressable
                    style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
                    onPress={() => Linking.openURL(storeUrl)}
                >
                    <Text style={styles.buttonText}>Deschide {storeName}</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#800000',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    content: {
        alignItems: 'center',
    },
    emoji: {
        fontSize: 60,
        marginBottom: 20,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    button: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 30,
        paddingVertical: 14,
        borderRadius: 25,
    },
    buttonText: {
        color: '#800000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});