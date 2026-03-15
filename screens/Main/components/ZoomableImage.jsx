import React, { useState, useEffect } from 'react';
import { StyleSheet, Dimensions, View, ActivityIndicator, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming,
    runOnJS
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import Video from 'react-native-video';
import FastImage from '@d11/react-native-fast-image';

const { width, height } = Dimensions.get('window');

export default function ZoomableMedia({ 
    uri, 
    type, 
    height: itemHeight, 
    paused, 
    onZoomChange,
    videoRef,
    onVideoLoad,
    onVideoProgress,
    isScrubbing = false
}) {
    const containerHeight = itemHeight || height;

    const scale = useSharedValue(1);
    const originX = useSharedValue(0);
    const originY = useSharedValue(0);
    
    const [isLoading, setIsLoading] = useState(true);
    const [userPaused, setUserPaused] = useState(false);

    const isFocused = useIsFocused();
    const systemPaused = paused || !isFocused;

    useEffect(() => {
        if (systemPaused) {
            setUserPaused(false);
        } else {
            if (videoRef && videoRef.current) {
                videoRef.current.seek(0);
            }
        }
    }, [systemPaused, videoRef]); 

    const togglePause = () => {
        setUserPaused((prev) => !prev);
    };

    const isActuallyPaused = systemPaused || userPaused || isScrubbing;

    const pinch = Gesture.Pinch()
        .onStart((event) => {
            originX.value = event.focalX - width / 2;
            originY.value = event.focalY - containerHeight / 2;
            if (onZoomChange) runOnJS(onZoomChange)(true);
        })
        .onUpdate((event) => {
            scale.value = event.scale;
        })
        .onEnd(() => {
            scale.value = withTiming(1, { duration: 300 }, (finished) => {
                if (finished && onZoomChange) runOnJS(onZoomChange)(false);
            });
        });

    const tap = Gesture.Tap()
        .numberOfTaps(1)
        .onEnd(() => {
            if (type === 'video') runOnJS(togglePause)();
        });

    const gestures = Gesture.Simultaneous(pinch, tap);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: originX.value * (1 - scale.value) },
            { translateY: originY.value * (1 - scale.value) },
            { scale: scale.value },
        ],
        zIndex: scale.value > 1 ? 9999 : 0, 
    }));

    const handleVideoLoad = (data) => {
        setIsLoading(false);
        if (onVideoLoad) onVideoLoad(data.duration);
    };

    const handleVideoProgress = (data) => {
        if (onVideoProgress && !isScrubbing) {
            onVideoProgress(data.currentTime);
        }
    };

    if (type === 'video') {
        return (
            <GestureDetector gesture={gestures}>
                <View style={[styles.container, { height: containerHeight, width: width }]}>
                    
                    <Animated.View style={[styles.mediaWrapper, { height: containerHeight, width: width }, animatedStyle]}>
                        <Video
                            ref={videoRef}
                            source={{ 
                                uri: uri,
                                bufferConfig: {
                                    minBufferMs: 5000,
                                    maxBufferMs: 15000,
                                    bufferForPlaybackMs: 1000,
                                    bufferForPlaybackAfterRebufferMs: 2000
                                }
                            }}
                            style={styles.videoElement}
                            resizeMode="contain"
                            repeat={true}
                            paused={isActuallyPaused} 
                            muted={false}
                            onLoad={handleVideoLoad}
                            onProgress={handleVideoProgress}
                            progressUpdateInterval={100} 
                            
                        />
                        
                        {isLoading && (
                            <View style={styles.centerOverlay}>
                                <ActivityIndicator size="large" color="#800000" />
                            </View>
                        )}

                        {!isLoading && userPaused && !isScrubbing && (
                            <View style={styles.centerOverlay}>
                                <View style={styles.playIconContainer}>
                                    <View style={styles.playIcon} />
                                </View>
                            </View>
                        )}
                    </Animated.View>
                </View>
            </GestureDetector>
        );
    }

    return (
        <GestureDetector gesture={gestures}>
             <View style={[styles.container, { height: containerHeight, width: width }]}>
                
                <FastImage
                    source={{ uri: uri, priority: FastImage.priority.low }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode={FastImage.resizeMode.cover}
                />
                <View style={styles.darkOverlay} />

                <Animated.View style={[styles.mediaWrapper, { height: containerHeight, width: width }, animatedStyle]}>
                    <FastImage
                        source={{ uri: uri, priority: FastImage.priority.normal }}
                        style={styles.innerImage}
                        resizeMode={FastImage.resizeMode.contain}
                    />
                </Animated.View>
            </View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: '#000', 
    },
    mediaWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent', 
    },
    innerImage: {
        width: '100%',
        height: '100%',
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    videoElement: {
        width: '100%',
        height: '100%',
    },
    centerOverlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        justifyContent: 'center', alignItems: 'center',
        zIndex: 10,
    },
    playIconContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        width: 70, height: 70, borderRadius: 35,
        justifyContent: 'center', alignItems: 'center', paddingLeft: 5,
    },
    playIcon: {
        width: 0, height: 0,
        backgroundColor: 'transparent', borderStyle: 'solid',
        borderLeftWidth: 25, borderRightWidth: 0, borderBottomWidth: 15, borderTopWidth: 15,
        borderLeftColor: 'white', borderRightColor: 'transparent', borderBottomColor: 'transparent', borderTopColor: 'transparent',
    }
});
