import React, { useEffect, useState, useCallback, useRef } from "react";
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList,
    Dimensions, 
    ActivityIndicator, 
    StatusBar,
    Pressable,
    AppState,
    Platform,
    PixelRatio,
    Keyboard,
} from "react-native";
import { useNavigation, useRoute } from '@react-navigation/native';
import axiosAuthGuard from "../../helpers/axiosAuthGuard.js";
import SearchBar from "./components/SearchBar.jsx";
import FilterModal from "./components/FilterModal.jsx";
import PostItem from "./components/PostItem.jsx";
import { emitter } from "../../helpers/eventBus.js";
import FastImage from '@d11/react-native-fast-image';
import { useCustomScroll } from "../../helpers/useCustomScroll.js"; 
import { showMessage } from "react-native-flash-message";
import { Layout, calibrateItemHeight } from "../../helpers/layout.js";

const { width, height } = Dimensions.get('window');

const MAX_ITEMS = 50;

export default function MainScreen({ navigation }) {
    const route = useRoute(); 

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
        if (!Layout.calibrated) {
            calibrateItemHeight(rounded);
        }
        if (rounded !== itemHeight) {
            setItemHeight(rounded);
        }
    }, [itemHeight]);

    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [nextCursor, setNextCursor] = useState(null);
    const [feedMode, setFeedMode] = useState('new'); 

    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const isLoadingMoreRef = useRef(false);
    const isResettingRef = useRef(false);

    const [isTrimming, setIsTrimming] = useState(false);

    const [targetCommentId, setTargetCommentId] = useState(null);
    
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);

    const seenQueue = useRef(new Set()); 
    const historyLoopRef = useRef(0);
    const nextCursorRef = useRef(null);
    const feedModeRef = useRef('new');

    const salesRef = useRef(sales);
    salesRef.current = sales;

    useEffect(() => {
        nextCursorRef.current = nextCursor;
    }, [nextCursor]);

    useEffect(() => {
        feedModeRef.current = feedMode;
    }, [feedMode]);
    
    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

    const { flatListRef, activeIndexRef, scrollProps } = useCustomScroll({ 
        itemHeight: itemHeight,
        dataLength: sales ? sales.length : 0 
    });

    const syncSeenPosts = async () => {
        if (seenQueue.current.size === 0) return;
        const idsToSync = Array.from(seenQueue.current);
        seenQueue.current.clear();
        try {
            await axiosAuthGuard.post('/api/sales/mark-seen', { sales_ids: idsToSync });
        } catch (error) {
            console.log("Sync failed");
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            const newIndex = viewableItems[0].index;
            setCurrentVisibleIndex(newIndex);
            activeIndexRef.current = newIndex;

            const toPreload = [];
            const nextPosts = salesRef.current.slice(newIndex + 1, newIndex + 3);
            nextPosts.forEach(post => {
                if (post?.media?.[0]?.type === 'image') {
                    toPreload.push({ uri: post.media[0].url });
                }
            });
            if (toPreload.length > 0) FastImage.preload(toPreload);
                        
            viewableItems.forEach(item => {
                if (item.item && !item.item.isSeparator && !item.item.isHistory && item.item._id) {
                    seenQueue.current.add(item.item._id);
                }
            });
            emitter.emit('visible_index_changed_main', newIndex);
        }
    }).current;
        
    const fetchFeed = async (isRefresh = false, currentCursor = null, currentMode = 'new', overrideSaleId = null) => {
        try {
            let priorityPost = null;
            
            if (overrideSaleId && isRefresh) {
                try {
                    const priorityRes = await axiosAuthGuard.get(`/api/sales/get-one/${overrideSaleId}`);
                    if (priorityRes.data.success && priorityRes.data.data) {
                         priorityPost = priorityRes.data.data;
                         priorityPost.isPriority = true; 
                    }
                    else{
                        showMessage({type: 'danger', message: 'Eroare', description: "Anuntul a fost sters/vandut."})
                    }
                } catch (err) {
                    console.log("Nu am putut încărca anunțul din notificare", err);
                    showMessage({type: 'danger', message: 'Eroare', description: "Anuntul a fost sters/vandut."})
                }
            }

            let url = `/api/sales/feed?limit=5&mode=${currentMode}`;
            if (currentCursor) {
                url += `&cursor=${currentCursor}`;
            }

            const response = await axiosAuthGuard.get(url);
            
            if (response.data.success) {
                let newPosts = response.data.data;
                let newCursor = response.data.nextCursor;
                const endOfNew = response.data.endOfNewPosts;

                if (priorityPost) {
                    newPosts = newPosts.filter(p => p._id !== priorityPost._id);
                }

                if (endOfNew && currentMode === 'new') {
                    await syncSeenPosts();
                    const separator = { _id: `separator-${Date.now()}-${Math.random()}`, isSeparator: true };
                    
                    setFeedMode('history');
                    historyLoopRef.current = 0;
                    
                    const historyResponse = await axiosAuthGuard.get(`/api/sales/feed?limit=5&mode=history`);
                    let historyPosts = historyResponse.data.data || [];
                    newCursor = historyResponse.data.nextCursor; 

                    historyPosts = historyPosts.map(p => ({ 
                        ...p, 
                        isHistory: true,
                        loopIndex: 0 
                    }));

                    if (isRefresh) {
                        historyLoopRef.current = 0;
                        const finalList = priorityPost 
                            ? [priorityPost, separator, ...historyPosts] 
                            : [separator, ...historyPosts];              

                        const toPreload = finalList
                        .filter(p => p.media?.[0]?.type === 'image')
                        .slice(0, 3)
                        .map(p => ({ uri: p.media[0].url }));
                        if (toPreload.length > 0) FastImage.preload(toPreload);
                            
                        setSales(finalList.length > 0 ? finalList : []);
                    } else {
                        setSales(prev => {
                            const hasSeparator = prev.some(item => item.isSeparator);
                            if (hasSeparator) {
                                return [...prev, ...historyPosts];
                            }
                            return [...prev, separator, ...historyPosts];
                        });
                    }
                    
                    setNextCursor(newCursor);
                    return; 
                }

                if (currentMode === 'history') {
                    newPosts = newPosts.map(p => ({ 
                        ...p, 
                        isHistory: true,
                        loopIndex: historyLoopRef.current 
                    }));
                }

                if (isRefresh) {
                    historyLoopRef.current = 0;
                    const finalList = priorityPost ? [priorityPost, ...newPosts] : newPosts;
                    const toPreload = finalList
                    .filter(p => p.media?.[0]?.type === 'image')
                    .slice(0, 3)
                    .map(p => ({ uri: p.media[0].url }));
                    if (toPreload.length > 0) FastImage.preload(toPreload);
                    
                    setSales(finalList);
                } else {
                    const loopIndexSnapshot = historyLoopRef.current;
                    setSales(prev => {
                        const existingIdsInCurrentLoop = new Set(
                            prev.filter(p => p.isHistory && p.loopIndex === loopIndexSnapshot).map(p => p._id)
                        );
                        const existingNewIds = new Set(
                            prev.filter(p => !p.isHistory && !p.isSeparator).map(p => p._id)
                        );

                        const filteredNew = newPosts.filter(p => {
                            if (currentMode === 'history') {
                                return !existingIdsInCurrentLoop.has(p._id);
                            } else {
                                return !existingNewIds.has(p._id);
                            }
                        });

                        return [...prev, ...filteredNew];
                    });
                }
                setNextCursor(newCursor);
            }
        } catch (error) {
            console.log("Feed Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            isLoadingMoreRef.current = false;
            setIsLoadingMore(false);

            if (!isResettingRef.current && salesRef.current.length > MAX_ITEMS) {
                isResettingRef.current = true;
                setIsTrimming(true);

                await syncSeenPosts();
                FastImage.clearMemoryCache();

                const visibleIdx = activeIndexRef.current;
                const keepFrom = Math.max(0, visibleIdx - 2);
                const newIdx = visibleIdx - keepFrom;

                setSales(prev => prev.slice(keepFrom));
                activeIndexRef.current = newIdx;
                emitter.emit('visible_index_changed_main', newIdx);

                setTimeout(() => {
                    if (flatListRef.current) {
                        flatListRef.current.scrollToOffset({ offset: newIdx * itemHeight, animated: false });
                    }
                    setIsTrimming(false);
                    isResettingRef.current = false;
                
                    if (!isLoadingMoreRef.current) {
                        isLoadingMoreRef.current = true;
                        setIsLoadingMore(true);
                        fetchFeed(false, nextCursorRef.current, feedModeRef.current);
                    }
                }, 150);
            }
        }
    };

    useEffect(() => {
        fetchFeed(true, null, 'new', null);
    }, []);

    useEffect(() => {
        if (route.params?.saleId) {
            const newSaleId = route.params.saleId;
            const newCommentId = route.params?.commentId || null;
            navigation.setParams({ saleId: undefined, commentId: undefined });

            setTargetCommentId(newCommentId);
            setSales([]); 
            setLoading(true);
            setNextCursor(null);
            setFeedMode('new');
            
            fetchFeed(true, null, 'new', newSaleId);
        }
    }, [route.params]);

    useEffect(() => {
        if (route.params?.openFilters) {
            setFilterModalVisible(true);
            navigation.setParams({ openFilters: undefined });
        }
    }, [route.params]);

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

    useEffect(() => {
        const onLikeUpdate = ({ saleId, hasLiked, likesCount }) => {
            setSales(currentSales => 
                currentSales.map(item => {
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

    useEffect(() => {
        const onForceRefresh = () => {
            if (flatListRef.current) {
                flatListRef.current.scrollToOffset({ offset: 0, animated: true });
            }
            handleRefresh();
        };

        emitter.on('force_home_refresh', onForceRefresh);
    
        return () => {
            emitter.off('force_home_refresh', onForceRefresh);
        };
    }, []); 

    const handleRefresh = () => {
        setRefreshing(true);
        setNextCursor(null);
        setFeedMode('new'); 
        setTargetCommentId(null);
        fetchFeed(true, null, 'new');
    };

    const handleLoadMore = async () => {
        if (isLoadingMoreRef.current || refreshing || isResettingRef.current) return;
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
        if (nextCursor) {
            fetchFeed(false, nextCursor, feedMode);
        } else {
            if (feedMode === 'new') {
                await syncSeenPosts();
                fetchFeed(false, null, 'new'); 
            } else if (feedMode === 'history') {
                historyLoopRef.current += 1;
                fetchFeed(false, null, 'history');
            }
        }
    };

    const renderItem = useCallback(({ item, index }) => (
        <PostItem 
            item={item} 
            index={index}
            screenId="main"
            itemHeight={itemHeight}
            initialOpenComments={item.isPriority && !!targetCommentId}
            targetCommentId={item.isPriority ? targetCommentId : null}
        />
    ), [targetCommentId, itemHeight]);

    if (loading && (!sales || sales.length === 0)) {
        return (
            <View style={styles.center}>
                <StatusBar barStyle="light-content" />
                <ActivityIndicator size="large" color="#800000" />
            </View>
        );
    }

    if (!loading && (!sales || sales.length === 0)) {
        return (
            <View style={styles.center}>
                <StatusBar barStyle="light-content" />
                <Text style={styles.errorText}>Nu s-au putut încărca anunțurile.</Text>
                <Pressable style={styles.retryButton} onPress={() => handleRefresh()}>
                    <Text style={styles.retryText}>Reîncearcă</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar 
                barStyle="light-content" 
                backgroundColor="transparent" 
                translucent={true} 
            />

            <SearchBar onPress={() => setFilterModalVisible(true)} />

            <View style={{ flex: 1 }} onLayout={handleContainerLayout}>
                <FlatList
                    ref={flatListRef}
                    data={sales}
                    renderItem={renderItem} 
                    keyExtractor={(item, index) => {
                        if (item.isSeparator) return item._id || `separator_${index}`;
                        if (item.isHistory) {
                            return `${item._id}_history_${item.loopIndex || 0}_${index}`;
                        }
                        return item._id ? item._id.toString() : `item_${index}`;
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
                    
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}

                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                    
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={3} 
                    
                    ListFooterComponent={() => 
                        isLoadingMore ? <ActivityIndicator size="small" color="#800000" style={{margin: 20}} /> : null
                    }
                />
            </View>

            {isTrimming && (
                <View style={styles.trimmingOverlay}>
                    <ActivityIndicator size="large" color="#800000" />
                </View>
            )}

            <FilterModal 
                visible={filterModalVisible} 
                onClose={() => setFilterModalVisible(false)}
                navigation={navigation}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        padding: 20,
    },
    errorText: {
        color: 'white',
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#800000',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
    },
    retryText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    trimmingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
});
