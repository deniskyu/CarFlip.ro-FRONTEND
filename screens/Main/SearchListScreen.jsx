import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    Modal,
    ActivityIndicator,
    FlatList,
    Dimensions,
    StatusBar,
    Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { assets } from '../../assets.js';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';
import { showMessage } from 'react-native-flash-message';
import { emitter } from '../../helpers/eventBus.js';
import { UI_SCALE } from '../../helpers/layout.js';

const { width, height } = Dimensions.get('window');

const COLORS = {
    primary: '#800000',
    secondary: '#081539',
    white: '#FFFFFF',
    text: '#333333',
    grayBg: '#F5F5F5',
    tagBg: '#EEEEEE',
};

const csc = UI_SCALE;
const cardScaled = {
    titleFont: 15 * csc,
    tagFont: 11 * csc,
    tagPadH: Math.round(6 * csc),
    tagPadV: Math.round(3 * csc),
    priceFont: 17 * csc,
    locationFont: 11 * csc,
};

export default function SearchListScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { filters } = route.params || {};

    const flatListRef = useRef(null);

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [optionsVisible, setOptionsVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);

    const [currentUserId, setCurrentUserId] = useState(null);

    const nextCursorRef = useRef(null);
    const hasMoreRef = useRef(true);
    const isLoadingMoreRef = useRef(false);


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
        fetchPosts(true);
    }, [filters]);

    useEffect(() => {
        const onLikeUpdate = ({ saleId, hasLiked, likesCount }) => {
            setPosts(prev =>
                prev.map(item =>
                    item._id === saleId
                        ? { ...item, hasLiked, likes_count: likesCount }
                        : item
                )
            );
        };
        emitter.on('like_update', onLikeUpdate);
        return () => emitter.off('like_update', onLikeUpdate);
    }, []);

    const fetchPosts = async (isRefresh = false, cursor = null) => {
        if (isRefresh) {
            setLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const params = { ...filters, limit: 20 };
            if (cursor) params.cursor = cursor;

            const response = await axiosAuthGuard.get('/api/sales/search-list', { params });

            if (response.data.success) {
                const newPosts = response.data.data;

                if (isRefresh) {
                    setPosts(newPosts);
                } else {
                    setPosts(prev => {
                        const existingIds = new Set(prev.map(p => p._id));
                        const unique = newPosts.filter(p => !existingIds.has(p._id));
                        return [...prev, ...unique];
                    });
                }

                nextCursorRef.current = response.data.nextCursor;
                hasMoreRef.current = response.data.hasMore;
            }
        } catch (error) {
            console.error("SearchListScreen fetch error:", error);
            if (isRefresh) setPosts([]);
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
            isLoadingMoreRef.current = false;
        }
    };

    const handleLoadMore = () => {
        if (!hasMoreRef.current || isLoadingMoreRef.current) return;
        isLoadingMoreRef.current = true;
        fetchPosts(false, nextCursorRef.current);
    };

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handlePostPress = (post) => {
        axiosAuthGuard.post('/api/sales/mark-seen', { sales_ids: [post._id] }).catch(() => {});
        navigation.navigate('SinglePostScreen', { post });
    };

    const openOptions = (item) => {
        setSelectedPost(item);
        setOptionsVisible(true);
    };

    const handleViewProfile = () => {
        if (!selectedPost) return;
        const userId = selectedPost.user_id?._id || selectedPost.user_id;
        setOptionsVisible(false);
        navigation.navigate('SearchProfileResult', { userId });
    };

    const handleLikeToggle = async () => {
        if (!selectedPost) return;
        const post = selectedPost;
        setOptionsVisible(false);

        const newState = !post.hasLiked;
        const newCount = newState ? (post.likes_count || 0) + 1 : (post.likes_count || 0) - 1;

        setPosts(prev =>
            prev.map(item =>
                item._id === post._id
                    ? { ...item, hasLiked: newState, likes_count: newCount }
                    : item
            )
        );
        emitter.emit('like_update', { saleId: post._id, hasLiked: newState, likesCount: newCount });

        try {
            const response = await axiosAuthGuard.post('/api/sales/like', { sale_id: post._id });
            if (!response.data.success) {
                setPosts(prev =>
                    prev.map(item =>
                        item._id === post._id
                            ? { ...item, hasLiked: post.hasLiked, likes_count: post.likes_count }
                            : item
                    )
                );
                emitter.emit('like_update', { saleId: post._id, hasLiked: post.hasLiked, likesCount: post.likes_count });
            }
        } catch (error) {
            setPosts(prev =>
                prev.map(item =>
                    item._id === post._id
                        ? { ...item, hasLiked: post.hasLiked, likes_count: post.likes_count }
                        : item
                )
            );
            emitter.emit('like_update', { saleId: post._id, hasLiked: post.hasLiked, likesCount: post.likes_count });
        }
    };

    const formatPrice = (price) => new Intl.NumberFormat('de-DE').format(price);
    const formatKm = (km) => new Intl.NumberFormat('de-DE').format(km);
    const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

    const getPreviewImage = (mediaArray) => {
        if (!mediaArray || mediaArray.length === 0) return null;
        const firstImage = mediaArray.find(m => m.type === 'image');
        return firstImage ? firstImage.url : mediaArray[0].url;
    };

    const renderItem = useCallback(({ item }) => {
        const imageUrl = getPreviewImage(item.media);

        return (
            <Pressable
                style={styles.cardContainer}
                onPress={() => handlePostPress(item)}
                activeOpacity={0.9}
            >
                <View style={styles.imageContainer}>
                    <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
                    {item.media?.some(m => m.type === 'video') && (
                        <View style={styles.videoBadge}>
                            <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>VIDEO</Text>
                        </View>
                    )}
                </View>

                <View style={styles.infoContainer}>
                    <View style={styles.cardTopRow}>
                        <Text style={[styles.cardTitle, { fontSize: cardScaled.titleFont }]} numberOfLines={1}>
                            {item.brand?.name} {item.model?.name}
                        </Text>
                        <Pressable style={styles.optionsButton} onPress={() => openOptions(item)} hitSlop={10}>
                            <Image source={assets.vertical_dots} style={styles.dotsIcon} />
                        </Pressable>
                    </View>

                    <View style={styles.tagsContainer}>
                        <View style={[styles.tag, { paddingHorizontal: cardScaled.tagPadH, paddingVertical: cardScaled.tagPadV }]}>
                            <Text style={[styles.tagText, { fontSize: cardScaled.tagFont }]}>{item.production_year}</Text>
                        </View>
                        <View style={[styles.tag, { paddingHorizontal: cardScaled.tagPadH, paddingVertical: cardScaled.tagPadV }]}>
                            <Text style={[styles.tagText, { fontSize: cardScaled.tagFont }]}>{formatKm(item.mileage)} km</Text>
                        </View>
                        <View style={[styles.tag, { paddingHorizontal: cardScaled.tagPadH, paddingVertical: cardScaled.tagPadV }]}>
                            <Text style={[styles.tagText, { fontSize: cardScaled.tagFont }]}>{capitalize(item.engine?.fuel_type)}</Text>
                        </View>
                    </View>

                    <View style={styles.bottomRow}>
                        <Text style={[styles.priceText, { fontSize: cardScaled.priceFont }]}>{formatPrice(item.price)} €</Text>
                        <Text style={[styles.locationText, { fontSize: cardScaled.locationFont }]}>{item.location?.county}</Text>
                    </View>
                </View>
            </Pressable>
        );
    }, []);

    const ListEmpty = useMemo(() => {
        if (loading) {
            return (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color={COLORS.secondary} />
                </View>
            );
        }
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Niciun anunț găsit.</Text>
            </View>
        );
    }, [loading]);

    const ListFooter = () => {
        if (!isLoadingMore) return null;
        return (
            <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={COLORS.secondary} />
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
                    <Text style={styles.backButtonText}>Înapoi</Text>
                </Pressable>
            </View>

            <View style={styles.listArea}>
                <FlatList
                    ref={flatListRef}
                    data={posts}
                    keyExtractor={(item) => item._id.toString()}
                    renderItem={renderItem}
                    ListEmptyComponent={ListEmpty}
                    ListFooterComponent={ListFooter}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 30, paddingTop: 10, flexGrow: 1 }}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.8}
                    initialNumToRender={5}
                    windowSize={5}
                    maxToRenderPerBatch={5}
                    removeClippedSubviews={true}
                />
            </View>

            <Modal
                visible={optionsVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setOptionsVisible(false)}
            >
                <Pressable style={styles.optionsModalOverlay} onPress={() => setOptionsVisible(false)}>
                    <View style={styles.optionsModalContent}>
                        <View style={styles.handleBarContainer}>
                            <View style={styles.handleBar} />
                        </View>
                        <Pressable style={styles.optionButton} onPress={handleLikeToggle}>
                            <Text style={[styles.optionText, { color: selectedPost?.hasLiked ? COLORS.primary : '#388E3C' }]}>
                                {selectedPost?.hasLiked ? 'Retrage aprecierea' : 'Apreciază anunțul'}
                            </Text>
                        </Pressable>
                        {currentUserId && (selectedPost?.user_id?._id || selectedPost?.user_id)?.toString() !== currentUserId.toString() && (
                            <Pressable style={styles.optionButton} onPress={handleViewProfile}>
                                <Text style={[styles.optionText, { color: COLORS.secondary }]}>Vezi profilul</Text>
                            </Pressable>
                        )}
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.grayBg,
    },
    headerContainer: {
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 10,
        backgroundColor: COLORS.grayBg,
    },
    backButton: {
        height: 55,
        backgroundColor: COLORS.secondary,
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
    listArea: {
        flex: 1,
    },
    cardContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        marginHorizontal: 10,
        marginBottom: 10,
        borderRadius: 12,
        height: 110,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    imageContainer: {
        width: 130,
        height: '100%',
        backgroundColor: '#eee',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    videoBadge: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 3,
    },
    infoContainer: {
        flex: 1,
        padding: 10,
        justifyContent: 'space-between',
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
        marginRight: 10,
    },
    optionsButton: {
        padding: 5,
        marginRight: -5,
        marginTop: -5,
    },
    dotsIcon: {
        width: 16,
        height: 16,
        tintColor: '#999',
        resizeMode: 'contain',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: COLORS.tagBg,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        marginRight: 6,
        marginBottom: 4,
    },
    tagText: {
        fontSize: 11,
        color: '#555',
        fontWeight: '500',
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    priceText: {
        fontSize: 17,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    locationText: {
        fontSize: 11,
        color: '#999',
        marginBottom: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 50,
    },
    emptyText: {
        color: '#999',
        fontSize: 14,
        fontStyle: 'italic',
    },
    optionsModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    optionsModalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        paddingTop: 10,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    handleBarContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
    },
    handleBar: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
    },
    optionButton: {
        paddingVertical: 18,
        alignItems: 'center',
        width: '100%',
    },
    optionText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});