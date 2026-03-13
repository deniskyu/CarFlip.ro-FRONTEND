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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import PostItem from './components/PostItem.jsx';
import { emitter } from '../../helpers/eventBus.js';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';

import { useCustomScroll } from "../../helpers/useCustomScroll.js";

const { width, height } = Dimensions.get('window');

import { ITEM_HEIGHT } from "../../helpers/layout.js";

export default function LikedPostsFeed() {
    const navigation = useNavigation();
    const route = useRoute();
    const { posts, initialIndex, fetchConfig } = route.params;

    const [localPosts, setLocalPosts] = useState(posts || []);
    const [currentVisibleIndex, setCurrentVisibleIndex] = useState(initialIndex || 0);
    
    const [currentUserId, setCurrentUserId] = useState(null);
    const [showFooterLoading, setShowFooterLoading] = useState(false);
    
    const cursorRef = useRef(fetchConfig?.nextCursor || null);
    const hasMoreRef = useRef(fetchConfig?.hasMore || false);
    const isLoadingMoreRef = useRef(false);

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

    const salesRef = useRef(localPosts);
    salesRef.current = localPosts;

    const { flatListRef, activeIndexRef, scrollProps } = useCustomScroll({ 
        itemHeight: ITEM_HEIGHT, 
        dataLength: localPosts ? localPosts.length : 0,
        initialIndex: initialIndex || 0
    });

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            const newIndex = viewableItems[0].index;
            setCurrentVisibleIndex(newIndex);
            activeIndexRef.current = newIndex;
    
            const nextPosts = salesRef.current.slice(newIndex + 1, newIndex + 2);
            nextPosts.forEach(post => {
                if (post?.media?.[0]?.type === 'image') {
                    Image.prefetch(post.media[0].url).catch(() => {});
                }
            });
        }
    }).current;

    useEffect(() => {
        axiosAuthGuard.get('/api/user/me')
            .then(res => {
                if (res.data.success && res.data.user) {
                    setCurrentUserId(res.data.user._id);
                }
            })
            .catch(() => {});
    }, []);

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
        if (!hasMoreRef.current || isLoadingMoreRef.current || !cursorRef.current) return;

        isLoadingMoreRef.current = true;
        setShowFooterLoading(true);

        try {
            const url = fetchConfig?.url || '/api/user/my-posts?type=liked&limit=20';
            const response = await axiosAuthGuard.get(`${url}&cursor=${cursorRef.current}`);
            
            if (response.data.success) {
                const newPosts = response.data.data;
                const newCursor = response.data.nextCursor;
                const moreAvailable = (newPosts.length === 20 && newCursor !== null);
                
                setLocalPosts(prev => {
                    const existingIds = new Set(prev.map(p => p._id));
                    const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p._id));
                    const updatedList = [...prev, ...uniqueNewPosts];
                    
                    emitter.emit('liked_posts_paginated', { 
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
            console.error("Eroare Load More LikedPostsFeed:", error);
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

    const renderItem = useCallback(({ item, index }) => {
        const postOwnerId = item.user_id?._id || item.user_id;
        const isOwnPost = currentUserId && postOwnerId?.toString() === currentUserId.toString();
        
        return (
            <PostItem 
                item={item} 
                isVisible={index === currentVisibleIndex}
                onBackAction={handleBack}
                pfpIconVisible={!isOwnPost}
            />
        );
    }, [currentVisibleIndex, currentUserId]);

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
                keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
                
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