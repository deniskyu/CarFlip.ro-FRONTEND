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

    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const isLoadingMoreRef = useRef(false);
    const isResettingRef = useRef(false);

    const [isTrimming, setIsTrimming] = useState(false);

    const salesRef = useRef(sales);
    salesRef.current = sales;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

    const { flatListRef, activeIndexRef, scrollProps } = useCustomScroll({ 
        itemHeight: itemHeight,
        dataLength: sales ? sales.length : 0 
    });

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            const newIndex = viewableItems[0].index;
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
        
    const fetchFeed = async (isRefresh = false, currentCursor = null) => {
        try {
            let url = `${assets.url}/api/sales/public-feed?limit=5`;
            if (currentCursor) {
                url += `&cursor=${currentCursor}`;
            }

            const response = await axios.get(url);
            
            if (response.data.success) {
                let newPosts = response.data.data;
                let newCursor = response.data.nextCursor;

                if (isRefresh) {
                    const toPreload = newPosts
                        .filter(p => p.media?.[0]?.type === 'image')
                        .slice(0, 3)
                        .map(p => ({ uri: p.media[0].url }));
                    if (toPreload.length > 0) FastImage.preload(toPreload);
                    
                    setSales(newPosts);
                } else {
                    setSales(prev => {
                        const existingIds = new Set(prev.map(p => p._id));
                        const filteredNew = newPosts.filter(p => !existingIds.has(p._id));
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
                }, 150);
            }
        }
    };

    useEffect(() => {
        fetchFeed(true, null);
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        setNextCursor(null);
        fetchFeed(true, null);
    };

    const handleLoadMore = async () => {
        if (isLoadingMoreRef.current || refreshing || isResettingRef.current) return;
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
        if (nextCursor) {
            fetchFeed(false, nextCursor);
        } else {
            fetchFeed(false, null);
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
});
