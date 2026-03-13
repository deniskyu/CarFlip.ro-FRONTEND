import { useRef, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

export const useCustomScroll = ({ itemHeight, dataLength, initialIndex = 0 }) => {
    const flatListRef = useRef(null);
    const activeIndexRef = useRef(initialIndex);
    const [isVerticalScrollEnabled, setIsVerticalScrollEnabled] = useState(true);

    const pendingOverscrollRef = useRef(false);

    const handleScrollEndDrag = useCallback((event) => {
        if (!dataLength || dataLength === 0) return;

        const offsetY = event.nativeEvent.contentOffset.y;
        const velocityY = event.nativeEvent.velocity?.y || 0;

        let targetIndex = Math.round(offsetY / itemHeight);
        if (velocityY > 0.5) {
            targetIndex = Math.ceil(offsetY / itemHeight);
        } else if (velocityY < -0.5) {
            targetIndex = Math.floor(offsetY / itemHeight);
        }


        if (targetIndex >= dataLength) {
            pendingOverscrollRef.current = true; 
        }


        if (Platform.OS === 'ios') {
            targetIndex = Math.max(0, Math.min(targetIndex, dataLength - 1));
            if (flatListRef.current) {
                flatListRef.current.scrollToIndex({
                    index: targetIndex,
                    animated: false,
                });
                activeIndexRef.current = targetIndex;
            }
        }

        setIsVerticalScrollEnabled(false);
        setTimeout(() => {
            setIsVerticalScrollEnabled(true);
        }, 400);

    }, [itemHeight, dataLength]);

    useEffect(() => {
        if (pendingOverscrollRef.current && dataLength > activeIndexRef.current + 1) {
            pendingOverscrollRef.current = false; 
            const nextIndex = activeIndexRef.current + 1;
            setTimeout(() => {
                if (flatListRef.current) {
                    flatListRef.current.scrollToIndex({
                        index: nextIndex,
                        animated: true,
                    });
                    activeIndexRef.current = nextIndex;
                }
            }, 200);
        }
    }, [dataLength]);

    const updateActiveIndex = useCallback((index) => {
        activeIndexRef.current = index;
    }, []);

    const scrollProps = {
        showsVerticalScrollIndicator: false,
        scrollEventThrottle: 16,
        disableIntervalMomentum: true,
        pagingEnabled: Platform.OS === 'ios',
        snapToInterval: Platform.OS === 'android' ? itemHeight : undefined,
        snapToAlignment: Platform.OS === 'android' ? "start" : undefined,
        decelerationRate: Platform.OS === 'android' ? "fast" : "fast",
        disableScrollViewPanResponder: Platform.OS === 'android',
        scrollEnabled: isVerticalScrollEnabled,
        onScrollEndDrag: handleScrollEndDrag,
    };

    return { flatListRef, activeIndexRef, scrollProps, updateActiveIndex };
};