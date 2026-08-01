import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Image,
    Modal,
    ActivityIndicator,
    FlatList,
    RefreshControl,
    Alert,
    Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; 
import { assets } from '../../../assets.js'
import axiosAuthGuard from '../../../helpers/axiosAuthGuard.js';
import { showMessage } from 'react-native-flash-message';
import { emitter } from '../../../helpers/eventBus.js';
import { UI_SCALE } from '../../../helpers/layout.js';

import {Text, Textinput} from '../../../helpers/AppText.jsx';
import PostListSkeleton from '../../../helpers/skeletons/PostListSkeleton.jsx';

const COLORS = {
    primary: '#800000',
    accent: '#E0706C',
    bg: '#1B1F26',
    surface: '#262B33',
    sheet: '#2D333C',
    border: '#2F353E',
    borderStrong: '#3A414B',
    onAccent: '#FFFFFF',
    text: '#E6E8EB',
    textMuted: '#9AA0A8',
    placeholder: '#646B74',
    danger: '#EF5350',
    success: '#66BB6A',
};

const csc = UI_SCALE;
const cardScaled = {
    titleFont: 14 * csc,
    tagFont: 11 * csc,
    tagPadH: Math.round(6 * csc),
    tagPadV: Math.round(3 * csc),
    priceFont: 16 * csc,
    locationFont: 11 * csc,
    processingBannerFont: 13 * csc,
    processingBannerSubFont: 11 * csc,
};

export default function ActivePostsTab({ headerComponent }) {
    const navigation = useNavigation(); 
    
    const flatListRef = useRef(null);

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);

    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [hasProcessing, setHasProcessing] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, []);

    useEffect(() => {
        const onRefreshRequested = () => {
            setTimeout(() => {
                fetchPosts(true); 
            }, 1100); 
        };

        emitter.on('refresh_active_posts', onRefreshRequested);

        return () => {
            emitter.off('refresh_active_posts', onRefreshRequested);
        };
    }, []);


    useEffect(() => {
        const handlePaginatedFromFeed = ({ newPosts, newCursor, hasMore }) => {
            setTimeout(() => {
                setPosts(prev => {
                    const existingIds = new Set(prev.map(p => p._id));
                    const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p._id));
                    return [...prev, ...uniqueNewPosts];
                });
                setNextCursor(newCursor);
                setHasMore(hasMore);
            }, 0);
        };

        emitter.on('active_posts_paginated', handlePaginatedFromFeed);

        return () => {
            emitter.off('active_posts_paginated', handlePaginatedFromFeed);
        };
    }, []);

    const handleNavigateToFeed = (index) => {
        navigation.navigate('ActivePostsFeed', {
            posts: posts,
            initialIndex: index,
            fetchConfig: {
                url: '/api/user/my-posts?type=active&limit=20',
                nextCursor: nextCursor,
                hasMore: hasMore
            }
        });
    };

    const handleDeletePost = () => {
        if (!selectedPost) return;

        Alert.alert(
            "Ștergere definitivă",
            "Ești sigur că vrei să ștergi acest anunț? Acțiunea este ireversibilă și va anula orice abonament asociat.",
            [
                { text: "Anulează", style: "cancel" },
                {
                    text: "Șterge",
                    style: "destructive",
                    onPress: async () => {
                        const postIdToDelete = selectedPost._id;
                        setOptionsVisible(false);

                        setPosts(prev => prev.filter(post => post._id !== postIdToDelete));

                        try {
                            const res = await axiosAuthGuard.delete(`/api/sales/remove/${postIdToDelete}`);
                            
                            if (res.data.success) {
                                showMessage({ message: "Succes", description: "Anunțul a fost șters cu succes!", type: "success" });
                            } else {
                                fetchPosts(true); 
                                showMessage({ message: "Eroare", description: "Eroare la ștergere.", type: "danger" });
                            }
                        } catch (error) {
                            fetchPosts(true);
                            showMessage({ message: "Eroare", description: "Eroare de conexiune.", type: "danger" });
                        }
                    }
                }
            ]
        );
    };

    const fetchPosts = async (isRefresh = false, cursor = null) => {
        if (isRefresh) {
            setRefreshing(true);
        } else if (!cursor) {
            setLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        try {
            let url = `/api/user/my-posts?type=active&limit=20`;
            if (cursor) url += `&cursor=${cursor}`;

            const res = await axiosAuthGuard.get(url);
            
            if (res.data.success) {
                const newPosts = res.data.data;
                const newCursor = res.data.nextCursor;
                const moreAvailable = (newPosts.length === 20 && newCursor !== null);

                if (isRefresh || !cursor) {
                    setPosts(newPosts);
                } else {
                    setPosts(prev => {
                        const existingIds = new Set(prev.map(p => p._id)); 
                        const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p._id));
                        return [...prev, ...uniqueNewPosts];
                    });
                }

                // Backend-ul trimite hasProcessing DOAR la prima pagină (fără
                // cursor). La paginare (scroll) câmpul lipsește — nu resetăm
                // starea, ca banner-ul să nu clipească în timpul infinite-scroll.
                if (typeof res.data.hasProcessing === 'boolean') {
                    setHasProcessing(res.data.hasProcessing);
                }

                setNextCursor(newCursor);
                setHasMore(moreAvailable);
            }
        } catch (error) {
            if (isRefresh || !cursor) {
                setPosts([]);
                setHasMore(false);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
            setIsLoadingMore(false);
        }
    };

    const handleRefresh = () => {
        fetchPosts(true);
    };
    const handleLoadMore = () => {
        if (hasMore && !isLoadingMore && !loading && !refreshing) {
            fetchPosts(false, nextCursor);
        }
    };

    const openOptions = (item) => {
        setSelectedPost(item);
        setOptionsVisible(true);
    };

    const handleEditPost = () => {
        setOptionsVisible(false); 
        if (selectedPost) {
            navigation.navigate('EditSaleScreen', { post: selectedPost });
        }
    }

    const formatPrice = (price) => new Intl.NumberFormat('de-DE').format(price);
    const formatKm = (km) => new Intl.NumberFormat('de-DE').format(km);
    const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

    const getPreviewImage = (mediaArray) => {
        if (!mediaArray || mediaArray.length === 0) return null;
        const firstImage = mediaArray.find(m => m.type === 'image');
        return firstImage ? firstImage.url : mediaArray[0].url;
    };

    const renderItem = useCallback(({ item, index }) => {
        const imageUrl = getPreviewImage(item.media);

        return (
            <Pressable 
                style={styles.cardContainer} 
                onPress={() => handleNavigateToFeed(index)}
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
                        <Text style={[styles.cardTitle, { fontSize: cardScaled.titleFont }]} numberOfLines={2}>
                            {item.title || `${item.brand?.name} ${item.model?.name}`}
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
    }, [posts, nextCursor, hasMore]);

    const ListEmpty = useMemo(() => {
        if (loading) {
            return <PostListSkeleton />;
        }
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nu ai niciun anunț activ.</Text>
            </View>
        );
    }, [loading]);

    const ListFooter = () => {
        if (!isLoadingMore) return null;
        return (
            <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={COLORS.accent} />
            </View>
        );
    };

const renderListHeader = () => (
        <View>
            {headerComponent}
            {hasProcessing && (
                <Pressable
                    onPress={handleRefresh}
                    disabled={refreshing}
                    hitSlop={6}
                    style={({ pressed }) => [
                        styles.processingBanner,
                        pressed && styles.processingBannerPressed,
                    ]}
                >
                    <Text
                        style={[styles.processingBannerText, { fontSize: cardScaled.processingBannerFont }]}
                        numberOfLines={2}
                    >
                        Ai anunțuri în procesare
                    </Text>
                    <Text
                        style={[styles.processingBannerSubText, { fontSize: cardScaled.processingBannerSubFont }]}
                        numberOfLines={1}
                    >
                        Apasă pentru refresh
                    </Text>
                </Pressable>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={posts}
                keyExtractor={(item) => item._id.toString()}
                renderItem={renderItem}
                ListHeaderComponent={renderListHeader}
                ListEmptyComponent={ListEmpty}
                ListFooterComponent={ListFooter}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 50, flexGrow: 1 }}
                style={{ backgroundColor: COLORS.bg }}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.8}

                initialNumToRender={5}
                windowSize={5}
                maxToRenderPerBatch={5}
                removeClippedSubviews={true} 

                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[COLORS.accent]}
                        tintColor={COLORS.accent}
                    />
                }
            />

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

                        <Pressable style={styles.optionButton} onPress={() => handleEditPost()}>
                            <Text style={[styles.optionText, { color: COLORS.success }]}>Editează anunțul</Text>
                        </Pressable>

                        <Pressable style={styles.optionButton} onPress={() => handleDeletePost()}>
                            <Text style={[styles.optionText, { color: COLORS.danger }]}>Șterge anunțul</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg
    },
    cardContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        marginHorizontal: 10,
        marginBottom: 10,
        borderRadius: 12,
        height: 116,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    imageContainer: {
        width: 130,
        height: '100%',
        backgroundColor: COLORS.sheet,
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
        color: COLORS.text,
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
        tintColor: COLORS.textMuted,
        resizeMode: 'contain',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: COLORS.sheet,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        marginRight: 6,
        marginBottom: 4,
    },
    tagText: {
        fontSize: 11,
        color: COLORS.textMuted,
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
        color: COLORS.accent,
    },
    locationText: {
        fontSize: 11,
        color: COLORS.placeholder,
        marginBottom: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 50,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 14,
        fontStyle: 'italic',
    },
    processingBanner: {
        backgroundColor: COLORS.primary,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 10,
        marginTop: 10,
        marginBottom: 4,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
    },
    processingBannerPressed: {
        opacity: 0.7,
    },
    processingBannerText: {
        color: '#FFFFFF',
        fontWeight: '700',
        textAlign: 'center',
        flexShrink: 1,
    },
    processingBannerSubText: {
        color: 'rgba(255,255,255,0.65)',
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 2,
        flexShrink: 1,
    },
    optionsModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    optionsModalContent: {
        backgroundColor: COLORS.sheet,
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
        backgroundColor: COLORS.borderStrong,
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
    }
});