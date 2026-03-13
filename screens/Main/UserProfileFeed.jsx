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
    AppState,
    ActivityIndicator,
    Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import PostItem from './components/PostItem.jsx';
import { emitter } from '../../helpers/eventBus.js';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js'; 

import { useCustomScroll } from "../../helpers/useCustomScroll.js";

const { width, height } = Dimensions.get('window');

import { ITEM_HEIGHT } from "../../helpers/layout.js";

export default function UserProfileFeed() {
    const navigation = useNavigation();
    const route = useRoute();
    const { posts, initialIndex, fetchConfig } = route.params;

    const [localPosts, setLocalPosts] = useState(posts || []);
    const [currentVisibleIndex, setCurrentVisibleIndex] = useState(initialIndex || 0);
    
    const [showFooterLoading, setShowFooterLoading] = useState(false);
    const cursorRef = useRef(fetchConfig?.nextCursor || null);
    const hasMoreRef = useRef(fetchConfig?.hasMore || false);
    const isLoadingMoreRef = useRef(false);

    const seenQueue = useRef(new Set());

    const salesRef = useRef(localPosts);
    salesRef.current = localPosts;

    const { flatListRef, activeIndexRef, scrollProps } = useCustomScroll({ 
        itemHeight: ITEM_HEIGHT, 
        dataLength: localPosts ? localPosts.length : 0,
        initialIndex: initialIndex || 0
    });

    const syncSeenPosts = async () => {
        if (seenQueue.current.size === 0) return;

        const idsToSync = Array.from(seenQueue.current);
        seenQueue.current.clear(); 

        try {
            await axiosAuthGuard.post('/api/sales/mark-seen', { sales_ids: idsToSync });
        } catch (error) {
            console.log("Sync failed in UserProfileFeed:", error);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => syncSeenPosts(), 5000);
        
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState.match(/inactive|background/)) syncSeenPosts();
        });

        return () => { 
            clearInterval(interval); 
            subscription.remove(); 
            syncSeenPosts(); 
        };
    }, []);

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            const newIndex = viewableItems[0].index;
            setCurrentVisibleIndex(newIndex);
            activeIndexRef.current = newIndex;
            emitter.emit('visible_index_changed', newIndex); 
    
            viewableItems.forEach(item => {
                if (item.item && item.item._id) {
                    seenQueue.current.add(item.item._id);
                }
            });
    
            const nextPosts = salesRef.current.slice(newIndex + 1, newIndex + 2);
            nextPosts.forEach(post => {
                if (post?.media?.[0]?.type === 'image') { 
                    Image.prefetch(post.media[0].url).catch(() => {});
                }
            });
        }
    }).current;
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

        return () => {
            emitter.off('like_update', onLikeUpdate);
        };
    }, []);

    const loadMorePosts = async () => {
        if (!hasMoreRef.current || isLoadingMoreRef.current || !cursorRef.current || !fetchConfig?.url) return;

        isLoadingMoreRef.current = true;
        setShowFooterLoading(true);

        try {
            const endpoint = `${fetchConfig.url}&cursor=${cursorRef.current}`;
            const response = await axiosAuthGuard.get(endpoint);
            
            if (response.data.success) {
                const newPosts = response.data.posts || [];
                const newCursor = response.data.nextCursor;
                const moreAvailable = response.data.hasMore;
                
                setLocalPosts(prev => {
                    const existingIds = new Set(prev.map(p => p._id));
                    const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p._id));
                    const updatedList = [...prev, ...uniqueNewPosts];
                    
                    emitter.emit('user_profile_paginated', { 
                        newPosts: uniqueNewPosts, 
                        newCursor: newCursor,
                        hasMore: moreAvailable
                    });
                    
                    return updatedList;
                });

                cursorRef.current = newCursor;
                hasMoreRef.current = moreAvailable;
            }
        } catch (error) {
            console.error("Eroare Load More UserProfileFeed:", error);
        } finally {
            isLoadingMoreRef.current = false;
            setShowFooterLoading(false);
        }
    };

    const getItemLayout = (data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    });

    const handleBack = () => {
        navigation.goBack();
    };

    const renderItem = useCallback(({ item, index }) => (
        <PostItem 
            item={item} 
            index={index}
            onBackAction={handleBack}
            pfpIconVisible={false}
        />
    ), []);

    const ListFooter = () => {
        if (!showFooterLoading) return null;
        return (
            <View style={styles.loadingFooter}>
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar 
                barStyle="light-content" 
                backgroundColor="transparent" 
                translucent={true} 
            />

            <View style={styles.headerContainer}>
                <Pressable 
                    style={styles.backButton} 
                    onPress={handleBack}
                    activeOpacity={0.8}
                >
                    <Text style={styles.backButtonText}>Înapoi la Profil</Text>
                </Pressable>
            </View>

            <FlatList
                ref={flatListRef}
                data={localPosts}
                renderItem={renderItem}
                keyExtractor={(item) => item._id.toString()}
                

                {...scrollProps}
                
                initialScrollIndex={initialIndex}
                getItemLayout={getItemLayout}
                
                viewabilityConfig={viewabilityConfig}
                onViewableItemsChanged={onViewableItemsChanged}
                
                initialNumToRender={2}
                maxToRenderPerBatch={2}
                windowSize={3}
                removeClippedSubviews={true}

                onEndReached={loadMorePosts}
                onEndReachedThreshold={3}
                ListFooterComponent={ListFooter}
            />
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
        borderColor: 'rgba(255, 255, 255, 0.1)',
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
    loadingFooter: {
        height: ITEM_HEIGHT,
        width: '100%',
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    }
});