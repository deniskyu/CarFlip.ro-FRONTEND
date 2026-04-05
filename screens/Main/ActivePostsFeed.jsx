import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    Pressable, 
    Dimensions, 
    StatusBar, 
    Platform,
    ActivityIndicator,
    Image,
    Keyboard,
    PixelRatio,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import PostItem from './components/PostItem.jsx'; 
import { emitter } from '../../helpers/eventBus.js';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';
import { useCustomScroll } from "../../helpers/useCustomScroll.js";
import { Layout } from "../../helpers/layout.js";
import FastImage from '@d11/react-native-fast-image';

const { width, height } = Dimensions.get('window');

export default function ActivePostsFeed() {
    const navigation = useNavigation();
    const route = useRoute();
    const { posts, initialIndex, fetchConfig } = route.params;

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

    const [localPosts, setLocalPosts] = useState(posts || []);
    const [currentVisibleIndex, setCurrentVisibleIndex] = useState(initialIndex || 0);
    
    const [showFooterLoading, setShowFooterLoading] = useState(false);

    const cursorRef = useRef(fetchConfig?.nextCursor || null);
    const hasMoreRef = useRef(fetchConfig?.hasMore || false);
    const isLoadingMoreRef = useRef(false);

    const salesRef = useRef(localPosts);
    salesRef.current = localPosts;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

    const { flatListRef, activeIndexRef, scrollProps } = useCustomScroll({ 
        itemHeight: itemHeight, 
        dataLength: localPosts ? localPosts.length : 0,
        initialIndex: initialIndex || 0
    });

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            const newIndex = viewableItems[0].index;
            setCurrentVisibleIndex(newIndex);
            activeIndexRef.current = newIndex;
            emitter.emit('visible_index_changed_active', newIndex);

            const toPreload = [];
            const nextPosts = salesRef.current.slice(newIndex + 1, newIndex + 3);
            nextPosts.forEach(post => {
                if (post?.media?.[0]?.type === 'image') {
                    toPreload.push({ uri: post.media[0].url });
                }
            });
            if (toPreload.length > 0) FastImage.preload(toPreload);
        }
    }).current;

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    useEffect(() => {
        const onLikeUpdate = ({ saleId, hasLiked, likesCount }) => {
            setLocalPosts(currentPosts => 
                currentPosts.map(item => 
                    item._id === saleId 
                        ? { ...item, hasLiked: hasLiked, likes_count: likesCount } 
                        : item
                )
            );
        };
        emitter.on('like_update', onLikeUpdate);
        return () => emitter.off('like_update', onLikeUpdate);
    }, []);

    const loadMorePosts = async () => {
        if (!hasMoreRef.current || isLoadingMoreRef.current || !cursorRef.current) return;

        isLoadingMoreRef.current = true;
        setShowFooterLoading(true);

        try {
            const url = fetchConfig?.url || '/api/user/my-posts?type=active&limit=20';
            const response = await axiosAuthGuard.get(`${url}&cursor=${cursorRef.current}`);
            
            if (response.data.success) {
                const newPosts = response.data.data;
                const newCursor = response.data.nextCursor;
                const moreAvailable = (newPosts.length === 20 && newCursor !== null);
                
                setLocalPosts(prev => {
                    const existingIds = new Set(prev.map(p => p._id));
                    const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p._id));
                    
                    emitter.emit('active_posts_paginated', { 
                        newPosts: uniqueNewPosts, 
                        newCursor: newCursor,
                        hasMore: moreAvailable
                    });
                    
                    return [...prev, ...uniqueNewPosts];
                });

                cursorRef.current = newCursor;
                hasMoreRef.current = moreAvailable;
            }
        } catch (error) {
            console.error("Eroare Load More ActivePostsFeed:", error);
        } finally {
            isLoadingMoreRef.current = false;
            setShowFooterLoading(false); 
        }
    };

    const getItemLayout = (data, index) => ({
        length: itemHeight,
        offset: itemHeight * index,
        index,
    });

    const renderItem = useCallback(({ item, index }) => (
        <PostItem 
            item={item} 
            index={index}
            onBackToFeed={handleBack} 
            pfpIconVisible={false} 
            screenId="active"
            itemHeight={itemHeight}
        />
    ), [handleBack, itemHeight]);

    const ListFooter = () => {
        if (!showFooterLoading) return null;
        return (
            <View style={[styles.loadingFooter, { height: itemHeight }]}>
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            <View style={styles.headerContainer}>
                <Pressable 
                    style={styles.backButton} 
                    onPress={handleBack}
                    activeOpacity={0.8}
                >
                    <Text style={styles.backButtonText}>Anunțurile Mele</Text>
                </Pressable>
            </View>

            <View style={{ flex: 1 }} onLayout={handleContainerLayout}>
                <FlatList
                    ref={flatListRef}
                    data={localPosts}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id} 
            
                    {...scrollProps}

                    initialScrollIndex={initialIndex}
                    getItemLayout={getItemLayout}
                    viewabilityConfig={viewabilityConfig}
                    onViewableItemsChanged={onViewableItemsChanged}
                    
                    onEndReached={loadMorePosts}
                    onEndReachedThreshold={3}
                    ListFooterComponent={ListFooter}

                    initialNumToRender={2}
                    windowSize={3}
                    maxToRenderPerBatch={2}
                    removeClippedSubviews={true}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    headerContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        paddingHorizontal: 15, paddingTop: Platform.OS === 'ios' ? 50 : 40,
    },
    backButton: {
        height: 55, backgroundColor: '#081539', borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    backButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    loadingFooter: {
        width: '100%',
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    }
});