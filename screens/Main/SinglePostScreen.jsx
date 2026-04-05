import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    StatusBar,
    Platform,
    Pressable,
    Text,
    Dimensions,
    PixelRatio,
    Keyboard,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import PostItem from './components/PostItem.jsx';
import { emitter } from '../../helpers/eventBus.js';
import { Layout } from '../../helpers/layout.js';

const { width } = Dimensions.get('window');

export default function SinglePostScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { post } = route.params;

    const [item, setItem] = useState(post);
    const [itemHeight, setItemHeight] = useState(Layout.ITEM_HEIGHT);

    const keyboardVisible = useRef(false);

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => { keyboardVisible.current = true; });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => { keyboardVisible.current = false; });
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    const handleContainerLayout = useCallback((event) => {
        if (keyboardVisible.current) return;
        const { height: containerH } = event.nativeEvent.layout;
        const rounded = PixelRatio.roundToNearestPixel(containerH);
        if (rounded !== itemHeight) {
            setItemHeight(rounded);
        }
    }, [itemHeight]);

    useEffect(() => {
        emitter.emit('visible_index_changed_single', 0);
    }, []);

    useEffect(() => {
        const onLikeUpdate = ({ saleId, hasLiked, likesCount }) => {
            if (saleId === item._id) {
                setItem(prev => ({ ...prev, hasLiked, likes_count: likesCount }));
            }
        };
        emitter.on('like_update', onLikeUpdate);
        return () => emitter.off('like_update', onLikeUpdate);
    }, [item._id]);

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <View style={styles.headerContainer}>
                <Pressable
                    style={styles.backButton}
                    onPress={handleBack}
                    activeOpacity={0.8}
                >
                    <Text style={styles.backButtonText}>Înapoi</Text>
                </Pressable>
            </View>

            <View style={{ flex: 1 }} onLayout={handleContainerLayout}>
                <PostItem
                    item={item}
                    index={0}
                    screenId="single"
                    itemHeight={itemHeight}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 10,
        backgroundColor: 'transparent',
    },
    backButton: {
        height: 55,
        backgroundColor: '#081539',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});