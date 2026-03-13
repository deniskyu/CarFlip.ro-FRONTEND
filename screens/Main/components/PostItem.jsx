import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    Pressable, 
    Dimensions, 
    ScrollView, 
    Image,
    Platform,
    Linking,
    Alert,
    Animated,
    Share
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { assets } from '../../../assets.js';
import ZoomableMedia from './ZoomableImage.jsx';
import CarScrubber from './CarScrubber.jsx';
import axiosAuthGuard from '../../../helpers/axiosAuthGuard.js';
import CommentsSheet from './CommentsSheet.jsx';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import ReportModal from './ReportModal.jsx';
import { emitter } from '../../../helpers/eventBus.js';

const { width, height } = Dimensions.get('window');

import {ITEM_HEIGHT} from '../../../helpers/layout.js';

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const FeedSeparator = () => (
    <View style={styles.separatorContainer}>
        <View style={styles.separatorLine} />
        <View style={styles.separatorContent}>
            <Text style={styles.separatorCheck}>🎆</Text> 
            <Text style={styles.separatorTitle}>Ești la zi!</Text>
            <Text style={styles.separatorSubtitle}>Ai văzut toate anunțurile noi din ultimele 30 de zile.</Text>
            <Text style={styles.separatorSmall}>Mai jos sunt anunțurile anterioare.</Text>
        </View>
        <View style={styles.separatorLine} />
    </View>
);

const NoResultsSlide = ({ onBack }) => (
    <View style={styles.separatorContainer}>
        <View style={styles.separatorContent}>
            <Text style={styles.emoji}>🔍</Text>
            <Text style={styles.separatorTitle}>Niciun rezultat găsit</Text>
            <Text style={styles.separatorSubtitle}>
                Nu am găsit mașini care să corespundă filtrelor tale.
                Încearcă să modifici criteriile de căutare.
            </Text>
        </View>
    </View>
);

const EndOfResults = ({ onBackToFeed }) => (
    <View style={styles.separatorContainer}>
        <View style={styles.separatorLine} />
        <View style={styles.separatorContent}>
            <Text style={styles.separatorCheck}>🏁</Text> 
            <Text style={styles.separatorTitle}>Ai ajuns la final!</Text>
            <Text style={styles.separatorSubtitle}>Acestea sunt toate rezultatele găsite.</Text>
        </View>
        <View style={styles.separatorLine} />
    </View>
);

const SummarySlide = ({ item, formatPrice, formatKm }) => (
    <View style={styles.summarySlide}>
        <Text style={styles.summaryTitle}>
            {item.brand.name} {item.model.name}
        </Text>
        <Text style={styles.summaryPrice}>
            {formatPrice(item.price)} € <Text style={styles.negotiableText}>{item.negotiable ? '(Negociabil)' : '(Preț Fix)'}</Text>
        </Text>

        <View style={styles.summaryTagsContainer}>
            <View style={styles.summaryTag}>
                <Text style={styles.summaryTagText}>{item.production_year}</Text>
            </View>
            <View style={styles.summaryTag}>
                <Text style={styles.summaryTagText}>{formatKm(item.mileage)} km</Text>
            </View>
            <View style={styles.summaryTag}>
                <Text style={styles.summaryTagText}>{capitalize(item.engine.fuel_type)}</Text>
            </View>
            <View style={styles.summaryTag}>
                <Text style={styles.summaryTagText}>{item.engine.capacity}</Text>
            </View>
            <View style={styles.summaryTag}>
                <Text style={styles.summaryTagText}>{capitalize(item.transmission)}</Text>
            </View>
            <View style={styles.summaryTag}>
                <Text style={styles.summaryTagText}>{capitalize(item.body_type)}</Text>
            </View>
            <View style={styles.summaryTag}>
                <Text style={styles.summaryTagText}>{capitalize(item.color)}</Text>
            </View>
            {item.drivetrain && (
                <View style={styles.summaryTag}>
                    <Text style={styles.summaryTagText}>{item.drivetrain.toUpperCase()}</Text>
                </View>
            )}
            {item.pollution_standard && (
                <View style={styles.summaryTag}>
                    <Text style={styles.summaryTagText}>{capitalize(item.pollution_standard)}</Text>
                </View>
            )}
            <View style={styles.summaryTag}>
                <Text style={styles.summaryTagText}>
                    {item.steering_wheel === 'right' ? "Volan Dreapta" : "Volan Stânga"}
                </Text>
            </View>
            <View style={styles.summaryTag}>
                <Text style={styles.summaryTagText}>
                    {item.exchange_accepted ? "Schimb: Da" : "Schimb: Nu"}
                </Text>
            </View>
            <View style={styles.summaryTag}>
                <Text style={styles.summaryTagText}>
                    {item.registration_status === 'registered' ? "Înmatriculat" : "Neînmatriculat"}
                </Text>
            </View>

            {item.for_dismante && (
                <View style={[styles.summaryTag, styles.dismantleTag]}>
                    <Text style={[styles.summaryTagText, styles.dismantleTagText]}>
                        ⚠️ Pentru dezmembrare
                    </Text>
                </View>
            )}

            <View style={[styles.summaryTag, item.vin ? styles.vinTagActive : null]}>
                <Text style={[styles.summaryTagText, item.vin ? styles.vinTagTextActive : null]}>
                    {item.vin ? `VIN: ${item.vin}` : "VIN: Nespecificat"}
                </Text>
            </View>
        </View>

        <Text style={styles.descriptionLabel}>Descriere:</Text>
        <View style={styles.descriptionContainer}>
            <ScrollView nestedScrollEnabled={true}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderTerminationRequest={() => false}
            >
                <Text style={styles.summaryDescription}>
                    {item.description || "Fără descriere adăugată."}
                </Text>
            </ScrollView>
        </View>

        <View style={styles.summaryLocation}>
            <Text style={styles.locationText1}>📍 {item.location.city}, {item.location.county}</Text>
            <Text style={styles.phoneText}>📞 {item.phone_number}</Text>
        </View>
    </View>
);

const MediaSlide = ({ mediaItem, isZooming, handleZoomChange, isPaused, dbScale }) => {
    const videoRef = useRef(null);
    const [duration, setDuration] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const videoProgress = useSharedValue(0);

    useEffect(() => {
        videoProgress.value = 0;
        setDuration(0);
        setIsScrubbing(false);
    }, [mediaItem.url]);

    const onSeekStart = useCallback(() => {
        setIsScrubbing(true);
    }, []);

    const onSeekEnd = useCallback((newProgress) => {
        if (videoRef.current && duration > 0) {
            const seekTime = newProgress * duration;
            videoRef.current.seek(seekTime);
        }
        setIsScrubbing(false);
    }, [duration]);

    return (
        <View style={styles.slideRoot}>
            <View style={[styles.matrioskaWrapper, { transform: [{ scale: dbScale }] }]}>
                <ZoomableMedia 
                    uri={mediaItem.url} 
                    type={mediaItem.type} 
                    height={ITEM_HEIGHT} 
                    paused={isPaused}
                    onZoomChange={handleZoomChange}
                    videoRef={videoRef}
                    onVideoLoad={(d) => setDuration(d)}
                    onVideoProgress={(time) => { 
                        if (duration > 0 && Number.isFinite(time)) {
                            videoProgress.value = time / duration; 
                        } else {
                            videoProgress.value = 0;
                        }
                    }}
                    isScrubbing={isScrubbing}
                />
            </View>
            {mediaItem.type === 'video' && !isZooming && (
                <CarScrubber 
                    progress={videoProgress}
                    onSeekStart={onSeekStart}
                    onSeekEnd={onSeekEnd}
                />
            )}
        </View>
    );
};

const ToastNotification = ({ message, visible }) => {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
                Animated.delay(1500), 
                Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true })
            ]).start();
        }
    }, [visible, message]);

    if (!visible) return null;

    return (
        <Animated.View style={[styles.toastContainer, { opacity }]} pointerEvents="none">
            <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
    );
};

const PostItem = React.memo(({ item, index, onBackToFeed, initialOpenComments = false, targetCommentId = null, pfpIconVisible = true }) => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();

    if (item.isSeparator) return <FeedSeparator />;
    
    if (item.isEnd) return <EndOfResults onBackToFeed={onBackToFeed} />;
    if (item.isNoResults) return <NoResultsSlide onBack={onBackToFeed} />;

    if (!item.user_id || !item.user_id._id) return null;

    const slidesData = useMemo(() => 
        [...item.media, { isSummary: true, _id: 'summary_card' }], 
    [item.media]);

    const flatListRef = useRef(null);
    const dragStartOffset = useRef(0);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [liked, setLiked] = useState(item.hasLiked || false);
    const [likesCount, setLikesCount] = useState(item.likes_count || 0);
    const [commentsCount, setCommentsCount] = useState(item.comments_count || 0);
    const [isZooming, setIsZooming] = useState(false);
    const [commentsVisible, setCommentsVisible] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (visibleIndex) => setIsVisible(visibleIndex === index);
        emitter.on('visible_index_changed', handler);
        return () => emitter.off('visible_index_changed', handler);
    }, [index]);

    const showToast = useCallback(() => {
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 2000); 
    }, []);

    const commentsAllowed = item.allow_comments !== false;
    const heartScale = useRef(new Animated.Value(0)).current;
    const heartOpacity = useRef(new Animated.Value(0)).current;
    const lastTap = useRef(0);

    const handleZoomChange = useCallback((zooming) => setIsZooming(zooming), []);
    
    useEffect(() => {
        if (initialOpenComments) setCommentsVisible(true);
    }, [initialOpenComments]);

    useEffect(() => {
        setLiked(!!item.hasLiked); 
        if (item.likes_count !== undefined) setLikesCount(item.likes_count);
    }, [item.hasLiked, item.likes_count]);

    const handleShare = useCallback(async () => {
        try {
            await Share.share({
                message: `${assets.url}/post/${item._id}`,
            });
        } catch (error) {
            console.log('Share error:', error);
        }
    }, [item._id]);

    const handleCommentAdded = useCallback(() => setCommentsCount(prev => prev + 1), []);

    const triggerHeartAnimation = useCallback(() => {
        heartScale.setValue(0.5);
        heartOpacity.setValue(1);
        Animated.sequence([
            Animated.spring(heartScale, { toValue: 1.2, friction: 4, useNativeDriver: true }),
            Animated.delay(400), 
            Animated.timing(heartOpacity, { toValue: 0, duration: 600, useNativeDriver: true })
        ]).start();
    }, []);

    const handleLikeToggle = useCallback(async () => {
        const newState = !liked;
        const newCount = newState ? likesCount + 1 : likesCount - 1;
        setLiked(newState);
        setLikesCount(newCount);
        emitter.emit('like_update', { saleId: item._id, hasLiked: newState, likesCount: newCount });
        try {
            const response = await axiosAuthGuard.post('/api/sales/like', { sale_id: item._id });
            if (!response.data.success) {
                setLiked(!newState);
                setLikesCount(likesCount); 
                emitter.emit('like_update', { saleId: item._id, hasLiked: !newState, likesCount: likesCount });
            }
        } catch (error) {
            setLiked(!newState);
            setLikesCount(likesCount);
            emitter.emit('like_update', { saleId: item._id, hasLiked: !newState, likesCount: likesCount });
        }
    }, [liked, likesCount, item._id]);

    const handleDoubleTap = useCallback(() => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
            triggerHeartAnimation();
            if (!liked) handleLikeToggle();
        } else {
            lastTap.current = now;
        }
    }, [liked, triggerHeartAnimation, handleLikeToggle]);

    const handleCall = () => {
        if (!item.phone_number) {
            Alert.alert("Eroare", "Numărul de telefon nu este disponibil.");
            return;
        }
        const phoneNumber = `tel:${item.phone_number}`;
        Linking.canOpenURL(phoneNumber)
            .then(supported => {
                if (!supported) Alert.alert("Eroare", "Nu se poate iniția apelul de pe acest dispozitiv.");
                else return Linking.openURL(phoneNumber);
            })
            .catch(err => console.error("Eroare la apelare:", err));
    };

    const handleProfilePress = (userId) => navigation.navigate('SearchProfileResult', { userId });

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;
    
    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const formatPrice = (price) => new Intl.NumberFormat('de-DE').format(price);
    const formatKm = (km) => new Intl.NumberFormat('de-DE').format(km);

    const handleScrollBeginDrag = (event) => {
        dragStartOffset.current = event.nativeEvent.contentOffset.x;
    };

    const handleScrollEndDrag = useCallback((event) => {
        if (Platform.OS === 'ios') return;

        const currentOffset = event.nativeEvent.contentOffset.x;
        const diff = currentOffset - dragStartOffset.current;
        const threshold = 50;

        let targetIndex = currentIndex;

        if (diff > threshold) {
            targetIndex = currentIndex + 1;
        } else if (diff < -threshold) {
            targetIndex = currentIndex - 1;
        }
        targetIndex = Math.max(0, Math.min(targetIndex, slidesData.length - 1));

        if (flatListRef.current) {
            flatListRef.current.scrollToIndex({
                index: targetIndex,
                animated: true,
            });
        }
    }, [currentIndex, slidesData]);

    const getItemLayout = useCallback((data, index) => ({
        length: width,
        offset: width * index,
        index,
    }), []);

    const renderSlide = ({ item: mediaItem, index }) => {
        if (mediaItem.isSummary) {
            return <SummarySlide item={item} formatPrice={formatPrice} formatKm={formatKm} />;
        }
        const dbScale = mediaItem.zoom_level || 1;
        const isPaused = !isFocused || !isVisible || currentIndex !== index;
        return (
            <Pressable style={styles.mediaContainer} onPress={handleDoubleTap} activeOpacity={1}>
                <MediaSlide 
                    mediaItem={mediaItem}
                    isZooming={isZooming}
                    handleZoomChange={handleZoomChange}
                    isPaused={isPaused}
                    dbScale={dbScale}
                />
                {!isZooming && <View style={styles.gradientOverlay} pointerEvents="none" />}
            </Pressable>
        );
    };

    const shouldHideUI = isZooming || currentIndex === slidesData.length - 1;

    return (
        <View style={styles.postContainer}>
            <FlatList
                ref={flatListRef}
                data={slidesData}
                renderItem={renderSlide}
                keyExtractor={(item, index) => item._id || index.toString()}
                horizontal
                pagingEnabled={Platform.OS === 'ios'}
                showsHorizontalScrollIndicator={false}
                
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEndDrag}
                scrollEventThrottle={16}
                getItemLayout={getItemLayout}

                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                initialNumToRender={3} 
                windowSize={3} 
                maxToRenderPerBatch={3}
                removeClippedSubviews={true} 
                overScrollMode="never"
            />

            <Animated.View 
                style={[styles.bigHeartContainer, { opacity: heartOpacity, transform: [{ scale: heartScale }] }]} 
                pointerEvents="none"
            >
                <Image source={assets.red_like_icon} style={styles.bigHeartImage} resizeMode="contain" fadeDuration={0} />
            </Animated.View>

            <View style={[styles.rightActions, { opacity: shouldHideUI ? 0 : 1 }]} pointerEvents={shouldHideUI ? 'none' : 'box-none'}>
                {pfpIconVisible && (
                    <Pressable onPress={() => handleProfilePress(item.user_id._id)}>
                        <View style={styles.actionButtonProfile}>
                            <View style={[styles.profileBorder, styles.iconShadow]}>
                                <Image 
                                    source={item.user_image ? { uri: item.user_image } : assets.default_profile} 
                                    style={styles.profileImage} fadeDuration={0}
                                />
                            </View>
                        </View>
                    </Pressable>
                )}
                <Pressable style={styles.actionButton} onPress={handleLikeToggle}>
                    <View style={[styles.iconContainer, styles.iconShadow]}>
                        <Image source={assets.like_icon} style={[styles.iconImage, { opacity: liked ? 0 : 1 }]} fadeDuration={0} />
                        <Image source={assets.red_like_icon} style={[styles.iconImage, styles.absoluteIcon, { opacity: liked ? 1 : 0 }]} fadeDuration={0} />
                    </View>
                    <Text style={styles.actionText}>{likesCount}</Text>
                </Pressable>
                <Pressable style={styles.actionButton} onPress={() => commentsAllowed ? setCommentsVisible(true) : showToast()}>
                    <View style={[styles.iconContainer, styles.iconShadow]}>
                        <Image source={assets.comments_icon} style={[styles.iconImage, !commentsAllowed && { tintColor: '#aaaaaa', opacity: 0.8 }]} fadeDuration={0}/>
                    </View>
                    {commentsAllowed && <Text style={styles.actionText}>{commentsCount}</Text>}
                </Pressable>
                <Pressable style={styles.actionButton} onPress={() => handleShare()}><View style={[styles.iconContainer, styles.iconShadow]}><Image source={assets.share_icon} style={styles.iconImage} fadeDuration={0}/></View><Text style={styles.actionText}>Share</Text></Pressable>
                <Pressable style={styles.actionButton} onPress={handleCall}><View style={[styles.iconContainer, styles.iconShadow]}><Image source={assets.call_icon} style={styles.iconImage} fadeDuration={0}/></View><Text style={styles.actionText}>Sună</Text></Pressable>
                <Pressable style={styles.actionButton} onPress={() => setReportVisible(true)}><View style={[styles.iconContainer, styles.iconShadow]}><Image source={assets.report_icon} style={styles.iconImage} fadeDuration={0}/></View><Text style={styles.actionText}>Report</Text></Pressable>
            </View>

            <View style={[styles.bottomOverlay, { opacity: shouldHideUI ? 0 : 1 }]} pointerEvents="none">
                <View style={styles.userInfoRow}>
                    <Pressable onPress={() => handleProfilePress(item.user_id._id)}><Text style={styles.userNameText}>@{item.user_name || 'Utilizator'}</Text></Pressable>
                    <Text style={styles.locationText2}>• {item.location?.city}</Text>
                </View>
                <Text style={styles.brandTitle}>{item.brand.name} {item.model.name}</Text>
                <Text style={styles.overlayPrice}>{formatPrice(item.price)} €</Text>
                <View style={styles.tagsRow}>
                    <View style={styles.glassTag}><Text style={styles.tagText}>{item.production_year}</Text></View>
                    <View style={styles.glassTag}><Text style={styles.tagText}>{formatKm(item.mileage)} km</Text></View>
                    <View style={styles.glassTag}><Text style={styles.tagText}>{item.engine.fuel_type}</Text></View>
                    <View style={[styles.glassTag, styles.viewsTag]}><Image source={assets.view_icon} style={styles.viewsIcon} resizeMode="contain" /><Text style={styles.tagText}>{item.views ? formatKm(item.views) : 0}</Text></View>
                </View>
            </View>

            <CommentsSheet visible={commentsVisible} onClose={() => setCommentsVisible(false)} saleId={item._id} onCommentAdded={handleCommentAdded} postAuthorId={item.user_id._id} targetCommentId={targetCommentId} />
            <ReportModal visible={reportVisible} onClose={() => setReportVisible(false)} reportType="post" reportId={item._id} />
            <ToastNotification visible={toastVisible} message="Comentariile sunt dezactivate." />
        </View>
    );
}, (prevProps, nextProps) => {
    return prevProps.item._id === nextProps.item._id && prevProps.item.hasLiked === nextProps.item.hasLiked && prevProps.item.likes_count === nextProps.item.likes_count;
});

const styles = StyleSheet.create({
    postContainer: { width: width, height: ITEM_HEIGHT, backgroundColor: 'white' },
    separatorContainer: { width: width, height: ITEM_HEIGHT, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', padding: 40 },
    separatorContent: { alignItems: 'center', paddingVertical: 30 },
    separatorLine: { width: '50%', height: 1, backgroundColor: '#333' },
    separatorCheck: { fontSize: 50, marginBottom: 20 },
    separatorTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    separatorSubtitle: { color: '#aaa', fontSize: 16, textAlign: 'center', marginBottom: 20, lineHeight: 24 },
    separatorSmall: { color: '#666', fontSize: 14, fontStyle: 'italic' },
    mediaContainer: { width: width, height: ITEM_HEIGHT, backgroundColor: 'white', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    gradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '22.50%', backgroundColor: 'rgba(0, 0, 0, 0.12)' },
    bigHeartContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 20, elevation: 20, backgroundColor: 'transparent' },
    bigHeartImage: { width: 100, height: 100, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3.84 },
    summarySlide: { width: width, height: ITEM_HEIGHT, backgroundColor: '#FFFFFF', padding: 20, paddingTop: 122 },
    summaryTitle: { fontSize: 24, fontWeight: '900', color: '#800000', marginBottom: 2 },
    summaryPrice: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 16 },
    negotiableText: { fontSize: 14, color: '#888', fontWeight: 'normal' },
    summaryTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    summaryTag: { backgroundColor: '#f5f5f5', paddingVertical: 5, paddingHorizontal: 9, borderRadius: 6, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
    summaryTagText: { color: '#333', fontSize: 13, fontWeight: '500' },
    dismantleTag: { backgroundColor: '#ffe6e6', borderColor: '#ffcccc' },
    dismantleTagText: { color: '#cc0000', fontWeight: 'bold' },
    vinTagActive: { backgroundColor: '#e8f5e9', borderColor: '#c8e6c9' },
    vinTagTextActive: { color: '#2e7d32', fontWeight: 'bold' },
    descriptionLabel: { fontSize: 16, fontWeight: 'bold', color: '#800000', marginBottom: 5, marginTop: -8 },
    descriptionContainer: { height: 150, backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
    summaryDescription: { fontSize: 15, color: '#444', lineHeight: 22 },
    summaryLocation: { paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' },
    locationText1: { fontSize: 18, color: '#081539', fontWeight: '800', marginBottom: 5 },
    phoneText: { fontSize: 14, color: '#800000', fontWeight: 'bold' },
    rightActions: { position: 'absolute', right: 10, bottom: 50, alignItems: 'center', zIndex: 10 },
    actionButtonProfile: { alignItems: 'center', marginBottom: 20 },
    actionButton: { alignItems: 'center', marginBottom: 20 },
    iconContainer: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 4, position: 'relative' },
    iconShadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 2.5, elevation: 3 },
    iconImage: { width: 30, height: 30, resizeMode: 'contain' },
    absoluteIcon: { position: 'absolute', top: 0, left: 0, width: 30, height: 30 },
    actionText: { color: 'white', fontSize: 11, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    profileBorder: { borderWidth: 2, borderColor: 'white', borderRadius: 25, padding: 1 },
    profileImage: { width: 45, height: 45, borderRadius: 22.5 },
    bottomOverlay: { position: 'absolute', bottom: 20, left: 14, width: '80%', zIndex: 5, },
    userInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    userNameText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3, marginRight: 6 },
    locationText2: { color: 'white', fontSize: 15, fontWeight: '500', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    brandTitle: { fontSize: 16.5, fontWeight: '800', marginVertical: 4, color: '#FFFFFF', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 },
    overlayPrice: { fontSize: 19, fontWeight: '700', color: '#f0f0f0', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
    tagsRow: { flexDirection: 'row', marginBottom: 18 },
    glassTag: { backgroundColor: 'rgba(0, 0, 0, 0.25)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, marginRight: 5 },
    tagText: { color: 'white', fontSize: 12, fontWeight: '600' },
    emoji: { fontSize: 60, marginBottom: 20 },
    viewsTag: { flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
    viewsIcon: { width: 14, height: 14, tintColor: 'white', marginRight: 4, opacity: 0.9 },
    retryButton: { backgroundColor: '#800000', paddingHorizontal: 35, paddingVertical: 14, borderRadius: 25, minWidth: 200, alignItems: 'center' },
    retryText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    slideRoot: { width: width, height: ITEM_HEIGHT, position: 'relative' },
    matrioskaWrapper: { width: width, height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
    toastContainer: { position: 'absolute', top: height / 2 - 20, alignSelf: 'center', backgroundColor: 'rgba(128, 0, 0, 0.95)', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25, zIndex: 200, elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
    toastText: { color: 'white', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
});

export default PostItem;