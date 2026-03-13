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
    Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';
import PostItem from './components/PostItem.jsx';
import { emitter } from '../../helpers/eventBus.js'; 

import { useCustomScroll } from "../../helpers/useCustomScroll.js"; 

const { width, height } = Dimensions.get('window');
import { ITEM_HEIGHT } from "../../helpers/layout.js";


export default function SearchResultScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { filters } = route.params || {};

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    
    const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);

    const seenQueue = useRef(new Set());
    const isLoadingMoreRef = useRef(false);
    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

    const salesRef = useRef(results);
    salesRef.current = results;

    const { flatListRef, activeIndexRef, scrollProps } = useCustomScroll({ 
        itemHeight: ITEM_HEIGHT, 
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
            emitter.emit('visible_index_changed', newIndex); 
    
            viewableItems.forEach(item => {
                if (item.item && !item.item.isNoResults && !item.item.isEnd && item.item._id) {
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
        const interval = setInterval(() => syncSeenPosts(), 5000);
        
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState.match(/inactive|background/)) {
                syncSeenPosts();
            }
        });

        return () => { 
            clearInterval(interval); 
            subscription.remove(); 
            syncSeenPosts(); 
        };
    }, []);

    const pageRef = useRef(1);

    const handleLoadMore = () => {
        if (!hasMore || loadingMore || isLoadingMoreRef.current) return;
        isLoadingMoreRef.current = true;
        setLoadingMore(true);
        
        pageRef.current += 1;
        fetchResults(pageRef.current, false);
    };
    
    useEffect(() => {
        pageRef.current = 1;
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
            
            const response = await axiosAuthGuard.get('/api/sales/search', { 
                params: { ...filters, page: pageNum, limit: 5 }
            });

            if (response.data.success) {
                const newItems = response.data.data || [];
                
                if (isRefresh) {
                    if (newItems.length === 0) {
                        setResults([{ _id: 'no_results_marker', isNoResults: true }]);
                        setHasMore(false);
                    } else {
                        if (newItems.length < 5) {
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

                            if (newItems.length < 5) {
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
        }
    };

    const handleBackToFeed = () => {
        navigation.goBack();
    };

    const renderItem = useCallback(({ item, index }) => (
        <PostItem 
            item={item} 
            index={index}
            onBackToFeed={handleBackToFeed}
        />
    ), []);

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

                    getItemLayout={(data, index) => (
                        { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
                    )}
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
    }
});