import React, { useEffect, useState, useContext } from 'react';
import { 
    View, 
    StyleSheet, 
    Image, 
    Pressable, 
    FlatList, 
    Dimensions, 
    ActivityIndicator, 
    StatusBar, 
    Linking,
    Platform,
    Modal,
    Alert,
    Share
} from 'react-native';

import {Text, TextInput} from '../../helpers/AppText.jsx';
import { useNavigation, useRoute } from '@react-navigation/native';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';
import { assets } from '../../assets.js';
import { Context } from '../../context/Context.js';
import ReportModal from './components/ReportModal.jsx';
import { emitter } from '../../helpers/eventBus.js';
import { UI_SCALE } from '../../helpers/layout.js';
import PostListSkeleton from '../../helpers/skeletons/PostListSkeleton.jsx';
import Shimmer from '../../helpers/skeletons/Shimmer.jsx';

const { width } = Dimensions.get('window');

const COLORS = {
    primary: '#800000',
    accent: '#E0706C',
    dark: '#13161A',
    bg: '#1B1F26',
    surface: '#262B33',
    sheet: '#2D333C',
    border: '#2F353E',
    borderStrong: '#3A414B',
    onAccent: '#FFFFFF',
    white: '#FFFFFF',
    text: '#E6E8EB',
    textMuted: '#9AA0A8',
    placeholder: '#646B74',
};

const HEADER_SHIMMER_BASE = 'rgba(255, 255, 255, 0.18)';
const HEADER_SHIMMER_HIGHLIGHT = 'rgba(255, 255, 255, 0.42)';

const csc = UI_SCALE;
const cardScaled = {
    titleFont: 14 * csc,
    tagFont: 11 * csc,
    tagPadH: Math.round(6 * csc),
    tagPadV: Math.round(3 * csc),
    priceFont: 16 * csc,
    locationFont: 11 * csc,
};

export default function SearchProfileResult() {
    const navigation = useNavigation();
    const route = useRoute();
    const { userId } = route.params; 
    const { url } = useContext(Context);

    const [profileData, setProfileData] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [optionsVisible, setOptionsVisible] = useState(false);

    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportTarget, setReportTarget] = useState({ id: null, type: 'profile' });

    const [isUnavailable, setIsUnavailable] = useState(false);


    useEffect(() => {
        const handlePaginatedFromFeed = ({ newPosts, newCursor, hasMore }) => {
            setTimeout(() => {
                setUserPosts(prev => {
                    const existingIds = new Set(prev.map(p => p._id));
                    const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p._id));
                    return [...prev, ...uniqueNewPosts];
                });
                setNextCursor(newCursor);
                setHasMore(hasMore);
            }, 0);
        };

        emitter.on('user_profile_paginated', handlePaginatedFromFeed);

        return () => {
            emitter.off('user_profile_paginated', handlePaginatedFromFeed);
        };
    }, []);

    useEffect(() => {
        fetchUserProfile();
    }, [userId]);
    
    useEffect(() => {
        const onLikeUpdate = ({ saleId, hasLiked, likesCount }) => {
            setTimeout(() => {
                setUserPosts(currentPosts => 
                    currentPosts.map(item => 
                        item._id === saleId 
                            ? { ...item, hasLiked: hasLiked, likes_count: likesCount } 
                            : item
                    )
                );
            }, 0);
        };
    
        emitter.on('like_update', onLikeUpdate);
    
        return () => {
            emitter.off('like_update', onLikeUpdate);
        };
    }, []);

    const handleReportPress = (id, type) => {
        setReportTarget({ id, type });
        setReportModalVisible(true);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${url}/profile/${userId}`,
            });
        } catch (error) {
            console.log('Share error:', error);
        }
    };

    const fetchUserProfile = async (cursor = null) => {
        try {
            if (!cursor) setLoading(true);
            else setIsLoadingMore(true);

            let endpoint = `/api/sales/user-profile/${userId}?limit=20`;
            if (cursor) endpoint += `&cursor=${cursor}`;

            const response = await axiosAuthGuard.get(endpoint);
            
            if (response.data.success) {
                const newPosts = response.data.posts || [];
                
                if (!cursor) {
                    setProfileData(response.data.user);
                    setUserPosts(newPosts);
                } else {
                    setUserPosts(prev => {
                        const existingIds = new Set(prev.map(p => p._id));
                        const uniqueNew = newPosts.filter(p => !existingIds.has(p._id));
                        return [...prev, ...uniqueNew];
                    });
                }

                setNextCursor(response.data.nextCursor);
                setHasMore(response.data.hasMore);
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                setIsUnavailable(true); 
            }
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (hasMore && !isLoadingMore && !loading && nextCursor) {
            fetchUserProfile(nextCursor);
        }
    };

    const handleCall = () => {
        if (profileData?.phone_number) {
            Linking.openURL(`tel:${profileData.phone_number}`);
        }
    };

    const handleMessage = async () => {
        try {
            const res = await axiosAuthGuard.post('/api/chat/conversations', {
                targetUserId: userId
            });
    
            if (res.data.success) {
                navigation.navigate('ChatTab', {
                    screen: 'ChatScreen',
                    params: {
                        conversationId: res.data.data._id,
                        participantName: profileData.username,
                        participantIcon: profileData.icon,
                        participantId: userId
                    }
                });
            }
        } catch (err) {
            Alert.alert('Eroare', 'Nu s-a putut deschide conversația.');
        }
    };

    const handlePostPress = (item, index) => {
        navigation.navigate('UserProfileFeed', { 
            posts: userPosts, 
            initialIndex: index,
            fetchConfig: {
                url: `/api/sales/user-profile/${userId}?limit=20`,
                nextCursor: nextCursor,
                hasMore: hasMore
            }
        });
    };

    const handleBlock = async () => {
        setOptionsVisible(false);
        try {
            const response = await axiosAuthGuard.post('/api/block', { target_id: userId });
            
            if (response.data.success) {
                setIsUnavailable(true);
            }
        } catch (error) {
            console.error("Block failed:", error);
            Alert.alert("Nu s-a putut bloca utilizatorul. Incercati mai tarziu.")
        }
    };

    const getPreviewImage = (mediaArray) => {
        if (!mediaArray || mediaArray.length === 0) return null;
        const firstImage = mediaArray.find(m => m.type === 'image');
        return firstImage ? firstImage.url : mediaArray[0].url;
    };

    const formatPrice = (price) => new Intl.NumberFormat('de-DE').format(price);
    const formatKm = (km) => new Intl.NumberFormat('de-DE').format(km);
    const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

    const renderHeaderSkeleton = () => (
        <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
                <Shimmer width="100%" height="100%" borderRadius={43} />
            </View>

            <Shimmer
                width={160}
                height={20}
                borderRadius={6}
                baseColor={HEADER_SHIMMER_BASE}
                highlightColor={HEADER_SHIMMER_HIGHLIGHT}
                style={{ marginBottom: 5 }}
            />

            <Shimmer
                width={200}
                height={13}
                borderRadius={5}
                baseColor={HEADER_SHIMMER_BASE}
                highlightColor={HEADER_SHIMMER_HIGHLIGHT}
                style={{ marginBottom: 15 }}
            />

            <View style={styles.actionRow}>
                <Shimmer
                    width={45}
                    height={45}
                    borderRadius={22.5}
                    baseColor={HEADER_SHIMMER_BASE}
                    highlightColor={HEADER_SHIMMER_HIGHLIGHT}
                    style={{ marginRight: 6 }}
                />
                <Shimmer
                    width={45}
                    height={45}
                    borderRadius={22.5}
                    baseColor={HEADER_SHIMMER_BASE}
                    highlightColor={HEADER_SHIMMER_HIGHLIGHT}
                    style={{ marginLeft: 6 }}
                />
            </View>

            <View style={styles.statsRow}>
                <Shimmer
                    width={90}
                    height={13}
                    borderRadius={5}
                    baseColor={HEADER_SHIMMER_BASE}
                    highlightColor={HEADER_SHIMMER_HIGHLIGHT}
                />
            </View>
        </View>
    );

    const renderHeader = () => {
        if (!profileData) return null;

        return (
            <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                    <Image 
                        source={profileData.icon ? { uri: profileData.icon } : assets.default_profile} 
                        style={styles.avatar} 
                    />
                </View>
                
                <Text style={styles.username}>@{profileData.username}</Text>
                
                {profileData.bio ? (
                    <Text style={styles.bio}>{profileData.bio}</Text>
                ) : null}

                <View style={styles.actionRow}>
                    {profileData.phone_number ? (
                        <Pressable 
                            style={[styles.circleButton, { marginRight: 6 }]} 
                            onPress={handleCall}
                        >
                            <Image source={assets.call_icon} style={styles.circleIcon} />
                        </Pressable>
                    ) : null}
                    
                    <Pressable 
                        style={[
                            styles.circleButton, 
                            profileData.phone_number ? { marginLeft: 6 } : {}
                        ]} 
                        onPress={handleMessage}
                    >
                        <Image source={assets.messages_icon} style={styles.circleIcon} />
                    </Pressable>
                </View>

                <View style={styles.statsRow}>
                    <Text style={styles.statsText}>
                        <Text style={{fontWeight: 'bold', color: 'white'}}>{userPosts.length === 20 ? "Peste 20 " : `${userPosts.length}`}</Text> Anunțuri
                    </Text>
                </View>
            </View>
        );
    };

    const renderListItem = ({ item, index }) => {
        const imageUrl = getPreviewImage(item.media);

        return (
            <Pressable 
                style={styles.cardContainer} 
                onPress={() => handlePostPress(item, index)}
                activeOpacity={0.9}
            >
                <View style={styles.imageContainer}>
                    <Image 
                        source={{ uri: imageUrl }} 
                        style={styles.cardImage} 
                        resizeMode="cover"
                    />
                    {item.media.some(m => m.type === 'video') && (
                        <View style={styles.videoBadge}>
                            <Text style={{color:'white', fontSize: 8, fontWeight:'bold'}}>VIDEO</Text>
                        </View>
                    )}
                </View>

                <View style={styles.infoContainer}>
                    <Text style={[styles.cardTitle, { fontSize: cardScaled.titleFont }]} numberOfLines={2}>
                        {item.title || `${item.brand.name} ${item.model.name}`}
                    </Text>

                    <View style={styles.tagsContainer}>
                        <View style={[styles.tag, { paddingHorizontal: cardScaled.tagPadH, paddingVertical: cardScaled.tagPadV }]}>
                            <Text style={[styles.tagText, { fontSize: cardScaled.tagFont }]}>{item.production_year}</Text>
                        </View>
                        <View style={[styles.tag, { paddingHorizontal: cardScaled.tagPadH, paddingVertical: cardScaled.tagPadV }]}>
                            <Text style={[styles.tagText, { fontSize: cardScaled.tagFont }]}>{formatKm(item.mileage)} km</Text>
                        </View>
                        <View style={[styles.tag, { paddingHorizontal: cardScaled.tagPadH, paddingVertical: cardScaled.tagPadV }]}>
                            <Text style={[styles.tagText, { fontSize: cardScaled.tagFont }]}>{capitalize(item.engine.fuel_type)}</Text>
                        </View>
                    </View>

                    <View style={styles.bottomRow}>
                        <Text style={[styles.priceText, { fontSize: cardScaled.priceFont }]}>{formatPrice(item.price)} €</Text>
                        <Text style={[styles.locationText, { fontSize: cardScaled.locationFont }]}>{item.location.county}</Text>
                    </View>
                </View>
            </Pressable>
        );
    };

    const renderOptionsModal = () => (
        <Modal
            visible={optionsVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setOptionsVisible(false)}
        >
            <Pressable style={styles.modalOverlay} onPress={() => setOptionsVisible(false)}>
                <View style={styles.modalContent}>
                    <View style={styles.handleBarContainer}>
                        <View style={styles.handleBar} />
                    </View>

                    <Pressable style={styles.optionButton} onPress={() => {
                        setOptionsVisible(false);
                        handleReportPress(userId, 'profile')}
                    }>
                        <Text style={styles.optionText}>Raportează utilizator</Text>
                    </Pressable>
                    
                    <View style={styles.divider} />

                    <Pressable style={styles.optionButton} onPress={handleBlock}>
                        <Text style={[styles.optionText, { color: COLORS.accent, fontWeight: 'bold' }]}>
                            Blochează utilizator
                        </Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    );

    if (isUnavailable) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
                <Pressable 
                    style={[styles.backButton, { backgroundColor: COLORS.surface, position: 'relative', top: 0, left: 0, marginTop: Platform.OS === 'ios' ? 50 : 40, marginLeft: 20 }]} 
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('HomeTab', { screen: 'MainScreen' });
                        }
                    }}
                    hitSlop={20}
                >
                    <Image source={assets.back_arrow} style={[styles.topIcon, { tintColor: COLORS.text }]} />
                </Pressable>
                
                <View style={styles.center}>
                    <Text style={{ fontSize: 40, marginBottom: 20 }}>😕</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.text }}>
                        Utilizatorul nu a fost găsit
                    </Text>
                    <Text style={{ color: COLORS.textMuted, marginTop: 10 }}>
                        Este posibil ca acest cont să fi fost șters sau restricționat.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
            
            <Pressable 
                style={styles.backButton} 
                onPress={() => {
                    if (navigation.canGoBack()) {
                        navigation.goBack();
                    } else {
                        navigation.navigate('HomeTab', { screen: 'MainScreen' });
                    }
                }}
                hitSlop={20}
            >
                <Image source={assets.back_arrow} style={styles.topIcon} />
            </Pressable>

            <View style={styles.topRightContainer}>
                <Pressable style={styles.topRightButton} onPress={() => handleShare()}>
                    <Image source={assets.share_icon} style={styles.topIcon} />
                </Pressable>
                <Pressable 
                    style={[styles.topRightButton, { marginLeft: 10 }]} 
                    onPress={() => setOptionsVisible(true)}
                >
                    <Image source={assets.vertical_dots} style={styles.topIcon} />
                </Pressable>
            </View>

            {loading ? (
                <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
                    {renderHeaderSkeleton()}
                    <PostListSkeleton style={{ paddingTop: 10 }} />
                </View>
            ) : (
                <FlatList
                    data={userPosts}
                    keyExtractor={(item) => item._id}
                    renderItem={renderListItem}
                    ListHeaderComponent={renderHeader}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 50, flexGrow: 1 }}
                    style={{ backgroundColor: COLORS.bg }} 
                    
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color={COLORS.accent} style={{ margin: 20 }}/> : null}
                    
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Niciun anunț publicat</Text>
                        </View>
                    )}
                />
            )}

            {renderOptionsModal()}
            <ReportModal 
                visible={reportModalVisible}
                onClose={() => setReportModalVisible(false)}
                reportType={reportTarget.type}
                reportId={reportTarget.id}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg, 
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        marginHorizontal: 10,
        marginTop: 10,
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
    cardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.text,
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
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 40,
        left: 20,
        zIndex: 100,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.2)', 
        borderRadius: 20,
    },
    topRightContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 40,
        right: 20,
        zIndex: 100,
        flexDirection: 'row',
    },
    topRightButton: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.2)', 
        borderRadius: 20,
    },
    topIcon: {
        width: 20,
        height: 20,
        tintColor: 'white',
        resizeMode: 'contain',
    },
    profileHeader: {
        alignItems: 'center',
        paddingTop: 90,
        paddingBottom: 25,
        backgroundColor: COLORS.primary, 
        marginBottom: 5, 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    avatarContainer: {
        width: 86,
        height: 86,
        borderRadius: 43,
        borderWidth: 3,
        borderColor: COLORS.dark, 
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        overflow: 'hidden',
        backgroundColor: 'white'
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    username: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: {width: -1, height: 1},
        textShadowRadius: 5
    },
    bio: {
        color: '#EEE', 
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 40,
        marginBottom: 15,
        opacity: 0.9
    },
    actionRow: {
        flexDirection: 'row',
        marginBottom: 15,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    circleButton: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: COLORS.dark,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    circleIcon: {
        width: 22,
        height: 22,
        tintColor: 'white',
        resizeMode: 'contain'
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 5,
        opacity: 0.8
    },
    statsText: {
        color: 'white',
        fontSize: 13,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 50,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 14,
        fontStyle: 'italic'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
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
        fontWeight: '500',
        color: COLORS.text,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        width: '100%',
    }
});