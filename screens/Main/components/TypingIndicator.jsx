import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image } from 'react-native';
import { assets } from '../../../assets.js';

const DOT_SIZE = 9;
const COLORS = { primary: '#800000', disabled: '#F0F0F0' };

export default function TypingIndicator({ avatarUri }) {
    const dots = [useRef(new Animated.Value(0)).current,
                  useRef(new Animated.Value(0)).current,
                  useRef(new Animated.Value(0)).current];

    useEffect(() => {
        const animations = dots.map((dot, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 150),
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 350,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: 350,
                        useNativeDriver: true,
                    }),
                    Animated.delay((2 - i) * 150),
                ])
            )
        );

        const parallel = Animated.parallel(animations);
        parallel.start();
        return () => parallel.stop();
    }, []);

    return (
        <View style={styles.container}>
            <Image
                source={avatarUri ? { uri: avatarUri } : assets.default_avatar}
                style={styles.avatar}
            />
            <View style={styles.bubble}>
                {dots.map((dot, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.dot,
                            {
                                transform: [{
                                    translateY: dot.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, -7],
                                    }),
                                }],
                                opacity: dot.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.4, 1],
                                }),
                            },
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 4,
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: 6,
        backgroundColor: COLORS.disabled,
    },
    bubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
    },
    dot: {
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        backgroundColor: COLORS.primary,
    },
});