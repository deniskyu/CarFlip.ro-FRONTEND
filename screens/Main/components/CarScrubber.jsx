import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native'; 
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    useAnimatedReaction,
    runOnJS,
    withTiming,
    Easing
} from 'react-native-reanimated';
import { assets } from '../../../assets.js';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// dimensiuni la masina
const CAR_WIDTH = 65; 
const CAR_HEIGHT = 30; 
const TRACK_HEIGHT = 2;

const MAX_X = SCREEN_WIDTH - CAR_WIDTH;

export default function CarScrubber({ 
    progress,       
    onSeekStart,    
    onSeekEnd       
}) {
    const isDragging = useSharedValue(false);
    const dragX = useSharedValue(0);
    const savedX = useSharedValue(0);

    useAnimatedReaction(
        () => {
            return progress ? progress.value : 0;
        },
        (currentProgress) => {
            if (!isDragging.value) {
                const validProgress = (typeof currentProgress === 'number' && !isNaN(currentProgress)) ? currentProgress : 0;
                const targetX = validProgress * MAX_X;
                dragX.value = withTiming(targetX, { 
                    duration: 100, 
                    easing: Easing.linear 
                });
            }
        }
    );

    const panGesture = Gesture.Pan()
        .onStart(() => {
            isDragging.value = true;
            savedX.value = dragX.value;
            if (onSeekStart) runOnJS(onSeekStart)();
        })
        .onUpdate((event) => {
            const newX = savedX.value + event.translationX;
            dragX.value = Math.max(0, Math.min(newX, MAX_X));
        })
        .onEnd(() => {
            isDragging.value = false;
            const finalProgress = dragX.value / MAX_X;
            if (onSeekEnd) runOnJS(onSeekEnd)(finalProgress);
        });

    const carStyle = useAnimatedStyle(() => {
        const safeX = (typeof dragX.value === 'number' && !isNaN(dragX.value)) ? dragX.value : 0;
        return {
            transform: [{ translateX: safeX }],
        };
    });

    const fillStyle = useAnimatedStyle(() => {
        const safeX = (typeof dragX.value === 'number' && !isNaN(dragX.value)) ? dragX.value : 0;
        return {
            width: safeX + (CAR_WIDTH / 2),
        };
    });

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={styles.hitAreaContainer}>
                
                <View style={styles.trackBackground} />

                <Animated.View style={[styles.trackFill, fillStyle]} />

                <Animated.Image 
                    source={assets.car_scrubber} 
                    style={[styles.car, carStyle]} 
                    resizeMode="contain"
                />

            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    hitAreaContainer: {
        position: 'absolute',
        bottom: 0, 
        left: 0,
        width: SCREEN_WIDTH,
        height: 50, 
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    trackBackground: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: TRACK_HEIGHT,
        backgroundColor: '#FFFFFF',
    },
    trackFill: {    
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: TRACK_HEIGHT,
        backgroundColor: '#800000', 
        borderTopRightRadius: TRACK_HEIGHT / 2,
        borderBottomRightRadius: TRACK_HEIGHT / 2,
    },
    car: {
        position: 'absolute',
        bottom: TRACK_HEIGHT, 
        width: CAR_WIDTH,
        height: CAR_HEIGHT,
        zIndex: 10, 
    }
});