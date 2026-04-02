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
    Platform,
    PixelRatio,
    Keyboard,
    Modal
} from "react-native";
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import PostItem from './components/PostItem.jsx';
import { emitter } from "../../helpers/eventBus.js";
import FastImage from '@d11/react-native-fast-image';
import { useCustomScroll } from "../../helpers/useCustomScroll.js"; 
import { Layout, calibrateItemHeight } from "../../helpers/layout.js";
import { assets } from '../../assets.js';

const { width, height } = Dimensions.get('window');

const MAX_ITEMS = 50;

export default function PublicMainScreen() {
    const navigation = useNavigation();
    const [welcomeVisible, setWelcomeVisible] = useState(true);
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

    const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);

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

            emitter.emit('visible_index_changed_public', newIndex);
        }
    }).current;
        
    const fetchFeed = async (isRefresh = false, currentCursor = null, currentMode = 'new') => {
        try {
            let url = `${assets.url}/api/sales/public-feed?limit=5&mode=${currentMode}`;
            if (currentCursor) {
                url += `&cursor=${currentCursor}`;
            }

            const response = await axios.get(url);
            
            if (response.data.success) {
                let newPosts = response.data.data;
                let newCursor = response.data.nextCursor;
                const endOfNew = response.data.endOfNewPosts;

                if (endOfNew && currentMode === 'new') {
                    const separator = { _id: `separator-${Date.now()}-${Math.random()}`, isSeparator: true };
                    
                    setFeedMode('history');
                    historyLoopRef.current = 0;
                    
                    const historyResponse = await axios.get(`${assets.url}/api/sales/public-feed?limit=5&mode=history`);
                    let historyPosts = historyResponse.data.data || [];
                    newCursor = historyResponse.data.nextCursor;

                    historyPosts = historyPosts.map(p => ({ 
                        ...p, 
                        isHistory: true,
                        loopIndex: 0 
                    }));

                    if (isRefresh) {
                        historyLoopRef.current = 0;
                        const finalList = [separator, ...historyPosts];

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
                    const toPreload = newPosts
                        .filter(p => p.media?.[0]?.type === 'image')
                        .slice(0, 3)
                        .map(p => ({ uri: p.media[0].url }));
                    if (toPreload.length > 0) FastImage.preload(toPreload);
                    
                    setSales(newPosts);
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
            console.log("Public Feed Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            isLoadingMoreRef.current = false;
            setIsLoadingMore(false);

            if (!isResettingRef.current && salesRef.current.length > MAX_ITEMS) {
                isResettingRef.current = true;
                setIsTrimming(true);

                FastImage.clearMemoryCache();

                const visibleIdx = activeIndexRef.current;
                const keepFrom = Math.max(0, visibleIdx - 2);
                const newIdx = visibleIdx - keepFrom;

                setSales(prev => prev.slice(keepFrom));
                activeIndexRef.current = newIdx;
                emitter.emit('visible_index_changed_public', newIdx);

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
        fetchFeed(true, null, 'new');
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
        const show = () => setWelcomeVisible(true);
        emitter.on('show_auth_modal', show);
        return () => emitter.off('show_auth_modal', show);
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        setNextCursor(null);
        setFeedMode('new');
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
            screenId="public"
            itemHeight={itemHeight}
            guestMode={true}
        />
    ), [itemHeight]);

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

            <View style={styles.headerContainer}>
                <Pressable 
                    style={styles.loginButton} 
                    onPress={() => navigation.navigate('MainLoginScreen')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.loginButtonText}>Intră în cont</Text>
                </Pressable>
            </View>

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
            <Modal
                visible={welcomeVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setWelcomeVisible(false)}
            >
                <View style={styles.welcomeOverlay}>
                    <View style={styles.welcomeCard}>
                        <Text style={styles.welcomeTitle}>Bine ai venit pe CarFlip!</Text>
                        <Text style={styles.welcomeText}>
                            Creează un cont gratuit pentru a putea publica anunțuri, trimite mesaje vânzătorilor, vizualiza profiluri și a primi un feed personalizat cu anunțuri noi.
                        </Text>
                        <View style={styles.welcomeButtons}>
                            <Pressable style={styles.welcomeDismiss} onPress={() => setWelcomeVisible(false)}>
                                <Text style={styles.welcomeDismissText}>Închide</Text>
                            </Pressable>
                            <Pressable style={styles.welcomeLogin} onPress={() => { setWelcomeVisible(false); navigation.navigate('MainLoginScreen'); }}>
                                <Text style={styles.welcomeLoginText}>Intră în cont</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
    loginButton: {
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
    loginButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
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
    welcomeOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    welcomeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 340,
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#081539',
        marginBottom: 12,
        textAlign: 'center',
    },
    welcomeText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 21,
        textAlign: 'center',
        marginBottom: 24,
    },
    welcomeButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    welcomeDismiss: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 10,
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
    },
    welcomeDismissText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    welcomeLogin: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 10,
        backgroundColor: '#800000',
        alignItems: 'center',
    },
    welcomeLoginText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
