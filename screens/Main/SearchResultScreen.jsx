import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList,
    Pressable, 
    ActivityIndicator, 
    Dimensions,
    StatusBar,
    Platform,
    AppState,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';
import PostItem from './components/PostItem.jsx';
import { emitter } from '../../helpers/eventBus.js'; 
import FastImage from '@d11/react-native-fast-image';
import { useCustomScroll } from "../../helpers/useCustomScroll.js"; 
import { Layout } from "../../helpers/layout.js";

const { width, height } = Dimensions.get('window');

const MAX_ITEMS = 50;
const PAGE_LIMIT = 5;

export default function SearchResultScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { filters } = route.params || {};

    const excludeSeenActive = filters?.exclude_seen === 'true' || filters?.exclude_seen === true;

    const [itemHeight] = useState(Layout.ITEM_HEIGHT);

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    
    const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);
    const [isTrimming, setIsTrimming] = useState(false);

    const seenQueue = useRef(new Set());
    const allLoadedIds = useRef(new Set());
    const isLoadingMoreRef = useRef(false);
    const isResettingRef = useRef(false);
    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

    const salesRef = useRef(results);
    salesRef.current = results;

    const { flatListRef, activeIndexRef, scrollProps } = useCustomScroll({ 
        itemHeight: itemHeight, 
        dataLength: results ? results.length : 0 
    });

    const syncSeenPosts = async () => {
        if (seenQueue.current.size === 0) return;

        const idsToSync = Array.from(seenQueue.current);
        seenQueue.current.clear();

        try {
            await axiosAuthGuard.post('/api/sales/mark-seen', { sales_ids: idsToSync });
        } catch (error) {
            console.log("Sync failed in SearchResult");
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            const newIndex = viewableItems[0].index;
            setCurrentVisibleIndex(newIndex);
            activeIndexRef.current = newIndex;
            emitter.emit('visible_index_changed_search', newIndex); 

            const toPreload = [];
            const nextPosts = salesRef.current.slice(newIndex + 1, newIndex + 3);
            nextPosts.forEach(post => {
                if (post?.media?.[0]?.type === 'image') {
                    toPreload.push({ uri: post.media[0].url });
                }
            });
            if (toPreload.length > 0) FastImage.preload(toPreload);

            viewableItems.forEach(item => {
                if (item.item && !item.item.isNoResults && !item.item.isEnd && item.item._id) {
                    seenQueue.current.add(item.item._id);
                }
            });
        }
    }).current;

    useEffect(() => {
        let interval;
        if (!excludeSeenActive) {
            interval = setInterval(() => syncSeenPosts(), 5000);
        }

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState.match(/inactive|background/) && !excludeSeenActive) {
                syncSeenPosts();
            }
        });

        return () => { 
            if (interval) clearInterval(interval); 
            subscription.remove(); 
            syncSeenPosts();
        };
    }, []);

    const pageRef = useRef(1);

    const handleLoadMore = () => {
        if (!hasMore || loadingMore || isLoadingMoreRef.current || isResettingRef.current) return;
        isLoadingMoreRef.current = true;
        setLoadingMore(true);
        
        if (!excludeSeenActive) {
            pageRef.current += 1;
        }
        fetchResults(pageRef.current, false);
    };
    
    useEffect(() => {
        pageRef.current = 1;
        allLoadedIds.current.clear();
        setResults([]);
        setHasMore(true);
        fetchResults(1, true);
    }, [filters]);

    useEffect(() => {
        const onLikeUpdate = ({ saleId, hasLiked, likesCount }) => {
            setResults(currentResults => 
                currentResults.map(item => {
                    if (item._id === saleId) {
                        return { ...item, hasLiked: hasLiked, likes_count: likesCount };
                    }
                    return item;
                })
            );
        };

        emitter.on('like_update', onLikeUpdate);
        return () => emitter.off('like_update', onLikeUpdate);
    }, []);

    const fetchResults = async (pageNum, isRefresh = false) => {
        try {
            if (isRefresh) setLoading(true);
            
            let response;

            if (excludeSeenActive) {
                const { exclude_seen, ...filtersWithoutSeen } = filters;
                response = await axiosAuthGuard.post('/api/sales/search-unseen', {
                    ...filtersWithoutSeen,
                    exclude_ids: Array.from(allLoadedIds.current),
                    limit: PAGE_LIMIT
                });
            } else {
                response = await axiosAuthGuard.get('/api/sales/search', { 
                    params: { ...filters, page: pageNum, limit: PAGE_LIMIT }
                });
            }

            if (response.data.success) {
                const newItems = response.data.data || [];

                if (excludeSeenActive) {
                    newItems.forEach(item => {
                        if (item._id) allLoadedIds.current.add(item._id);
                    });
                }
                
                if (isRefresh) {
                    if (newItems.length === 0) {
                        setResults([{ _id: 'no_results_marker', isNoResults: true }]);
                        setHasMore(false);
                    } else {
                        const toPreload = newItems
                        .filter(p => p.media?.[0]?.type === 'image')
                        .slice(0, 3)
                        .map(p => ({ uri: p.media[0].url }));
                        if (toPreload.length > 0) FastImage.preload(toPreload);
                        if (newItems.length < PAGE_LIMIT) {
                            setResults([...newItems, { _id: 'end_marker', isEnd: true }]);
                            setHasMore(false);
                        } else {
                            setResults(newItems);
                        }
                    }
                } else {
                    if (newItems.length === 0) {
                        setHasMore(false);
                        setResults(prev => {
                            const hasMarker = prev.some(item => item.isNoResults || item.isEnd);
                            if (hasMarker) return prev; 
                            
                            return [...prev, { _id: `end_${Date.now()}`, isEnd: true }];
                        });
                    } else {
                        setResults(prev => {
                            const existingIds = new Set(prev.map(p => p._id));
                            const uniqueNewItems = newItems.filter(item => !existingIds.has(item._id));

                            if (newItems.length < PAGE_LIMIT) {
                                setHasMore(false);
                                return [...prev, ...uniqueNewItems, { _id: 'end_marker', isEnd: true }];
                            }
                            return [...prev, ...uniqueNewItems];
                        });
                    }
                }
            } else {
                if (isRefresh) setResults([{ _id: 'no_results_marker', isNoResults: true }]);
            }
        } catch (error) {
            console.error("Search Error:", error);
            if (isRefresh) setResults([{ _id: 'no_results_marker', isNoResults: true }]);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            isLoadingMoreRef.current = false;

            if (!isResettingRef.current && salesRef.current.length > MAX_ITEMS) {
                isResettingRef.current = true;
                setIsTrimming(true);

                if (!excludeSeenActive) {
                    await syncSeenPosts();
                }
                FastImage.clearMemoryCache();

                const visibleIdx = activeIndexRef.current;
                const keepFrom = Math.max(0, visibleIdx - 2);
                const newIdx = visibleIdx - keepFrom;

                setHasMore(true);
                setResults(prev => prev.slice(keepFrom).filter(item => !item.isEnd && !item.isNoResults));
                activeIndexRef.current = newIdx;
                emitter.emit('visible_index_changed_search', newIdx);

                setTimeout(() => {
                    if (flatListRef.current) {
                        flatListRef.current.scrollToOffset({ offset: newIdx * itemHeight, animated: false });
                    }
                    setIsTrimming(false);
                    isResettingRef.current = false;

                    if (!isLoadingMoreRef.current) {
                        isLoadingMoreRef.current = true;
                        setLoadingMore(true);
                        if (!excludeSeenActive) {
                            pageRef.current += 1;
                        }
                        fetchResults(pageRef.current, false);
                    }
                }, 150);
            }
        }
    };

    const handleBackToFeed = () => {
        navigation.goBack();
    };

    const renderItem = useCallback(({ item, index }) => (
        <PostItem 
            item={item} 
            index={index}
            screenId="search"
            itemHeight={itemHeight}
            onBackToFeed={handleBackToFeed}
        />
    ), [itemHeight]);

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
                    onPress={handleBackToFeed}
                    activeOpacity={0.8}
                >
                    <Text style={styles.backButtonText}>Înapoi la Feed</Text>
                </Pressable>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#800000" />
                    <Text style={styles.loadingText}>Căutăm...</Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={results}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => {
                        if (item._id) return item._id.toString();
                        return `fallback_${index}`;
                    }}
                    
                    {...scrollProps}

                    getItemLayout={(data, index) => ({
                        length: itemHeight,
                        offset: itemHeight * index,
                        index
                    })}
                    initialNumToRender={2}
                    windowSize={3}
                    maxToRenderPerBatch={2}
                    removeClippedSubviews={true}
                    
                    viewabilityConfig={viewabilityConfig}
                    onViewableItemsChanged={onViewableItemsChanged}
                    
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={3}
                />
            )}

            {isTrimming && (
                <View style={styles.trimmingOverlay}>
                    <ActivityIndicator size="large" color="#800000" />
                </View>
            )}
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        backgroundColor: 'black'
    },
    loadingText: {
        color: '#666',
        marginTop: 15,
        fontSize: 14,
    },
    trimmingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
});
