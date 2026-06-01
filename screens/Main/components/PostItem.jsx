import React, { useState, useRef, useMemo, useEffect, useCallback, useContext } from 'react';
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
    Share,
    Modal,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
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
import { Context } from '../../../context/Context.js';

const { width, height } = Dimensions.get('window');

import { ITEM_HEIGHT, UI_SCALE, SUMMARY_SCALE } from '../../../helpers/layout.js';
import FastImage from '@d11/react-native-fast-image';

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const sc = UI_SCALE;
const scaled = {
    iconSize: Math.round(30 * sc),
    profileSize: Math.round(45 * sc),
    profileRadius: Math.round(22.5 * sc),
    profileBorderRadius: Math.round(25 * sc),
    actionMargin: Math.round(20 * sc),
    rightActionsBottom: Math.round(50 * sc),
    bottomOverlayBottom: Math.round(20 * sc),
    userNameFont: 16 * sc,
    locationFont: 15 * sc,
    brandFont: 16.5 * sc,
    priceFont: 19 * sc,
    tagFont: 12 * sc,
    actionFont: 11 * sc,
    tagPadV: Math.round(4 * sc),
    tagPadH: Math.round(8 * sc),
    tagsRowMargin: Math.round(18 * sc),
    msgBtnPadV: Math.round(10 * sc),  
    msgBtnPadH: Math.round(20 * sc),
    msgBtnFont: 14* sc,
    msgBtnRadius: Math.round(7 * sc), 
};

const ssc = SUMMARY_SCALE;
const summaryScaled = {
    titleFont: 26 * ssc,
    priceFont: 22 * ssc,
    negotiableFont: 14 * ssc,
    priceMargin: Math.round(16 * ssc),
    tagPadV: Math.round(5 * ssc),
    tagPadH: Math.round(9 * ssc),
    tagFont: 13 * ssc,
    tagsMargin: Math.round(10 * ssc),
    descLabelFont: 16 * ssc,
    descContainerHeight: Math.round(164 * ssc),
    descFont: 15 * ssc,
    descLineHeight: Math.round(22 * ssc),
    descPad: Math.round(10 * ssc),
    descMargin: Math.round(12 * ssc),
    locationFont: 18 * ssc,
    phoneFont: 14 * ssc,
    locationPadTop: Math.round(15 * ssc),
    slidePadding: Math.round(20 * ssc),
    slidePaddingTop: Math.round(122 * ssc),
};

const FeedSeparator = ({ itemHeight }) => (
    <View style={[styles.separatorContainer, { height: itemHeight }]}>
        <View style={styles.separatorLine} />
        <View style={styles.separatorContent}>
            <Image source={assets.verified_icon} style={styles.separatorCheckIcon} resizeMode="contain" />
            <Text style={styles.separatorTitle}>Ești la zi!</Text>
            <Text style={styles.separatorSubtitle}>Ai văzut toate anunțurile noi din ultimele 30 de zile.</Text>
            <Text style={styles.separatorSmall}>Mai jos sunt anunțurile anterioare.</Text>
        </View>
        <View style={styles.separatorLine} />
    </View>
);

const NoResultsSlide = ({ onBack, itemHeight }) => (
    <View style={[styles.separatorContainer, { height: itemHeight }]}>
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

const EndOfResults = ({ onBackToFeed, itemHeight }) => (
    <View style={[styles.separatorContainer, { height: itemHeight }]}>
        <View style={styles.separatorLine} />
        <View style={styles.separatorContent}>
            <Text style={styles.separatorCheck}>🏁</Text> 
            <Text style={styles.separatorTitle}>Ai ajuns la final!</Text>
            <Text style={styles.separatorSubtitle}>Acestea sunt toate rezultatele găsite.</Text>
        </View>
        <View style={styles.separatorLine} />
    </View>
);

const SummarySlide = ({ item, formatPrice, formatKm, itemHeight, onDescriptionPress }) => (
    <View style={[styles.summarySlide, { height: itemHeight, padding: summaryScaled.slidePadding, paddingTop: summaryScaled.slidePaddingTop }]}>
        <Text style={[styles.summaryTitle, { fontSize: summaryScaled.titleFont }]}>
            {item.title || `${item.brand.name} ${item.model.name}`}
        </Text>
        <Text style={[styles.summaryPrice, { fontSize: summaryScaled.priceFont, marginBottom: summaryScaled.priceMargin }]}>
            {formatPrice(item.price)} € <Text style={[styles.negotiableText, { fontSize: summaryScaled.negotiableFont }]}>{item.negotiable ? '(Negociabil)' : '(Preț Fix)'}</Text>
        </Text>

        <View style={[styles.summaryTagsContainer, { marginBottom: summaryScaled.tagsMargin }]}>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                <Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{item.production_year}</Text>
            </View>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                <Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{formatKm(item.mileage)} km</Text>
            </View>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                <Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{capitalize(item.engine.fuel_type)}</Text>
            </View>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                <Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{item.engine.capacity}</Text>
            </View>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                <Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{capitalize(item.transmission)}</Text>
            </View>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                <Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{capitalize(item.body_type)}</Text>
            </View>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                <Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{capitalize(item.color)}</Text>
            </View>
            {item.drivetrain && (
                <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                    <Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{item.drivetrain.toUpperCase()}</Text>
                </View>
            )}
            {item.pollution_standard && (
                <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                    <Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{capitalize(item.pollution_standard)}</Text>
                </View>
            )}
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                <Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>
                    {item.steering_wheel === 'right' ? "Volan Dreapta" : "Volan Stânga"}
                </Text>
            </View>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                <Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>
                    {item.exchange_accepted ? "Schimb: Da" : "Schimb: Nu"}
                </Text>
            </View>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                <Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>
                    {item.registration_status === 'registered' ? "Înmatriculat" : "Neînmatriculat"}
                </Text>
            </View>

            {item.for_dismante && (
                <View style={[styles.summaryTag, styles.dismantleTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                    <Text style={[styles.summaryTagText, styles.dismantleTagText, { fontSize: summaryScaled.tagFont }]}>
                        ⚠️ Pentru dezmembrare
                    </Text>
                </View>
            )}

            <View style={[styles.summaryTag, item.vin ? styles.vinTagActive : null, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                <Text style={[styles.summaryTagText, item.vin ? styles.vinTagTextActive : null, { fontSize: summaryScaled.tagFont }]}>
                    {item.vin ? `VIN: ${item.vin}` : "VIN: Nespecificat"}
                </Text>
            </View>
        </View>

        <Text style={[styles.descriptionLabel, { fontSize: summaryScaled.descLabelFont }]}>Descriere:</Text>
        <Pressable 
            style={[styles.descriptionContainer, { height: summaryScaled.descContainerHeight, padding: summaryScaled.descPad, marginBottom: summaryScaled.descMargin }]}
            onPress={onDescriptionPress}
        >
            <Text 
                style={[styles.summaryDescription, { fontSize: summaryScaled.descFont, lineHeight: summaryScaled.descLineHeight }]}
                numberOfLines={6}
            >
                {item.description || "Fără descriere adăugată."}
            </Text>
        </Pressable>

        <View style={[styles.summaryLocation, { paddingTop: summaryScaled.locationPadTop }]}>
            <Text style={[styles.locationText1, { fontSize: summaryScaled.locationFont }]}>📍 {item.location.city}, {item.location.county}</Text>
            <Text style={[styles.phoneText, { fontSize: summaryScaled.phoneFont }]}>📞 {item.phone_number}</Text>
        </View>
    </View>
);

const MediaSlide = ({ mediaItem, isZooming, handleZoomChange, isPaused, dbScale, itemHeight, onDoubleTap, isFullCover }) => {
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
        <View style={[styles.slideRoot, { height: itemHeight }]}>
            <View style={[styles.matrioskaWrapper, { height: itemHeight, transform: [{ scale: dbScale }] }]}>
                <ZoomableMedia 
                    uri={mediaItem.url} 
                    type={mediaItem.type} 
                    height={itemHeight} 
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
                    onDoubleTap={onDoubleTap}
                    isFullCover={isFullCover}
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

const PostItem = React.memo(({ item, index, onBackToFeed, initialOpenComments = false, targetCommentId = null, pfpIconVisible = true, screenId = 'main', itemHeight = ITEM_HEIGHT,  guestMode = false }) => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { username: currentUsername } = useContext(Context);

    if (item.isSeparator) return <FeedSeparator itemHeight={itemHeight} />;
    if (item.isEnd) return <EndOfResults onBackToFeed={onBackToFeed} itemHeight={itemHeight} />;
    if (item.isNoResults) return <NoResultsSlide onBack={onBackToFeed} itemHeight={itemHeight} />;
    if (!item.user_id || !item.user_id._id) return null;

    const isOwnPost = currentUsername && item.user_name === currentUsername;

    const requireAuth = () => {
        if (guestMode) {
            emitter.emit('show_auth_modal');
            return true;
        }
        return false;
    };

    const slidesData = useMemo(() => 
        [...item.media, { isSummary: true, _id: 'summary_card' }], 
    [item.media]);

    const previewImageUrl = useMemo(() => {
        if (!item.media || item.media.length === 0) return null;
        const firstImg = item.media.find(m => m.type === 'image');
        return firstImg ? firstImg.url : item.media[0].url;
    }, [item.media]);

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

    const [descriptionVisible, setDescriptionVisible] = useState(false);

    const [messageModalVisible, setMessageModalVisible] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [messageSending, setMessageSending] = useState(false);

    useEffect(() => {
        const eventName = `visible_index_changed_${screenId}`;
        const handler = (visibleIndex) => setIsVisible(visibleIndex === index);
        emitter.on(eventName, handler);
        return () => emitter.off(eventName, handler);
    }, [index, screenId]);

    useEffect(() => {
        setCurrentIndex(0);
        setCommentsVisible(false);
        setReportVisible(false);
        setIsZooming(false);
        setMessageModalVisible(false);
        setMessageText('');
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: false });
        }
    }, [item._id]);

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
        if (requireAuth()) return;
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
        if (requireAuth()) return;
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
        if (requireAuth()) return;
        triggerHeartAnimation();
        if (!liked) handleLikeToggle();
    }, [liked, triggerHeartAnimation, handleLikeToggle]);

    const handleCall = () => {
        if (requireAuth()) return;
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

    const handleProfilePress = (userId) => {
        if (requireAuth()) return;
        navigation.navigate('SearchProfileResult', { userId });
    }

    const handleOpenMessageModal = useCallback(() => {
        if (requireAuth()) return;
        setMessageModalVisible(true);
    }, [guestMode]);

    const handleSendSaleMessage = useCallback(async () => {
        if (messageSending) return;
        setMessageSending(true);
        try {
            const res = await axiosAuthGuard.post('/api/chat/send-sale-message', {
                targetUserId: item.user_id._id,
                saleId: item._id,
                text: messageText.trim() || null
            });
            if (res.data.success) {
                setMessageModalVisible(false);
                setMessageText('');
                navigation.navigate('ChatTab', {
                    screen: 'ChatScreen',
                    params: {
                        conversationId: res.data.data.conversationId,
                        participantName: res.data.data.participant.username,
                        participantIcon: res.data.data.participant.icon,
                        participantId: item.user_id._id
                    }
                });
            }
        } catch (err) {
            const msg = err?.response?.data?.message || 'Nu s-a putut trimite mesajul.';
            Alert.alert('Eroare', msg);
        } finally {
            setMessageSending(false);
        }
    }, [item._id, item.user_id._id, messageText, messageSending, navigation]);

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
            const curr = viewableItems[0].index;
            const toPreload = [];
            for (let i = 1; i <= 2; i++) {
                const idx = curr + i;
                const slide = slidesData[idx];
                if (idx < slidesData.length && slide && slide.url && !slide.isSummary && slide.type === 'image') {
                    toPreload.push({ uri: slide.url });
                }
            }
            if (toPreload.length > 0) FastImage.preload(toPreload);
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
            return <SummarySlide item={item} formatPrice={formatPrice} formatKm={formatKm} itemHeight={itemHeight} onDescriptionPress={() => setDescriptionVisible(true)} />;
        }
        let dbScale;
        let isFullCover = false;
        if (mediaItem.type === 'video') {
            if (mediaItem.width && mediaItem.height) {
                const ratioW = width / mediaItem.width;
                const ratioH = itemHeight / mediaItem.height;
                const coverScale = Math.max(ratioW, ratioH) / Math.min(ratioW, ratioH);
                dbScale = coverScale <= 1.75 ? coverScale : 1;
            } else {
                dbScale = 1;
            }
        } else {
            dbScale = mediaItem.zoom_level || 1;
            if (mediaItem.width && mediaItem.height) {
                const ratioW = width / mediaItem.width;
                const ratioH = itemHeight / mediaItem.height;
                const minRatio = Math.min(ratioW, ratioH);
                const maxRatio = Math.max(ratioW, ratioH);
                if (minRatio > 0 && Number.isFinite(minRatio) && Number.isFinite(maxRatio)) {
                    const coverScale = maxRatio / minRatio;
                    if (Number.isFinite(coverScale) && Number.isFinite(dbScale) && dbScale >= coverScale) {
                        isFullCover = true;
                    }
                }
            }
        }
        const isPaused = !isFocused || !isVisible || currentIndex !== index;
        return (
            <Pressable 
                style={[styles.mediaContainer, { height: itemHeight }]} 
                pointerEvents={mediaItem.isSummary ? 'box-none' : 'auto'}
            >
                <MediaSlide 
                    mediaItem={mediaItem}
                    isZooming={isZooming}
                    handleZoomChange={handleZoomChange}
                    isPaused={isPaused}
                    dbScale={dbScale}
                    itemHeight={itemHeight}
                    onDoubleTap={handleDoubleTap}
                    isFullCover={isFullCover}
                />
                {!isZooming && <View style={styles.gradientOverlay} pointerEvents="none" />}
            </Pressable>
        );
    };

    const shouldHideUI = isZooming || currentIndex === slidesData.length - 1;

    useEffect(() => {
        if (isVisible) {
            emitter.emit(`feed_ui_hidden_${screenId}`, shouldHideUI);
        }
    }, [isVisible, shouldHideUI, screenId]);

    return (
        <View style={[styles.postContainer, { height: itemHeight }]}>
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
                initialNumToRender={2} 
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

            {!isOwnPost && (
                <Pressable
                    style={[
                        styles.msgButton,
                        {
                            paddingVertical: scaled.msgBtnPadV,
                            paddingHorizontal: scaled.msgBtnPadH,
                            borderRadius: scaled.msgBtnRadius,
                            top: Platform.OS === 'ios' ? 120 : 108,
                            opacity: shouldHideUI ? 0 : 1,
                        }
                    ]}
                    pointerEvents={shouldHideUI ? 'none' : 'auto'}
                    onPress={handleOpenMessageModal}
                >
                    <Text style={[styles.msgButtonText, { fontSize: scaled.msgBtnFont }]}>Mesaj 💬</Text>
                </Pressable>
            )}

            <View style={[styles.rightActions, { bottom: scaled.rightActionsBottom, opacity: shouldHideUI ? 0 : 1 }]} pointerEvents={shouldHideUI ? 'none' : 'box-none'}>
                {pfpIconVisible && (
                    <Pressable onPress={() => handleProfilePress(item.user_id._id)}>
                        <View style={[styles.actionButtonProfile, { marginBottom: scaled.actionMargin }]}>
                            <View style={[styles.profileBorder, styles.iconShadow, { borderRadius: scaled.profileBorderRadius }]}>
                                <Image 
                                    source={item.user_image ? { uri: item.user_image } : assets.default_profile} 
                                    style={[styles.profileImage, { width: scaled.profileSize, height: scaled.profileSize, borderRadius: scaled.profileRadius }]} fadeDuration={0}
                                />
                            </View>
                        </View>
                    </Pressable>
                )}
                <Pressable style={[styles.actionButton, { marginBottom: scaled.actionMargin }]} onPress={handleLikeToggle}>
                    <View style={[styles.iconContainer, styles.iconShadow, { width: scaled.iconSize, height: scaled.iconSize }]}>
                        <Image source={assets.like_icon} style={[styles.iconImage, { width: scaled.iconSize, height: scaled.iconSize, opacity: liked ? 0 : 1 }]} fadeDuration={0} />
                        <Image source={assets.red_like_icon} style={[styles.absoluteIcon, { width: scaled.iconSize, height: scaled.iconSize, opacity: liked ? 1 : 0 }]} fadeDuration={0} />
                    </View>
                    <Text style={[styles.actionText, { fontSize: scaled.actionFont }]}>{likesCount}</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, { marginBottom: scaled.actionMargin }]} onPress={() => { if (requireAuth()) return; commentsAllowed ? setCommentsVisible(true) : showToast(); }}>
                    <View style={[styles.iconContainer, styles.iconShadow, { width: scaled.iconSize, height: scaled.iconSize }]}>
                        <Image source={assets.comments_icon} style={[styles.iconImage, { width: scaled.iconSize, height: scaled.iconSize }, !commentsAllowed && { tintColor: '#aaaaaa', opacity: 0.8 }]} fadeDuration={0}/>
                    </View>
                    {commentsAllowed && <Text style={[styles.actionText, { fontSize: scaled.actionFont }]}>{commentsCount}</Text>}
                </Pressable>
                <Pressable style={[styles.actionButton, { marginBottom: scaled.actionMargin }]} onPress={() => handleShare()}>
                    <View style={[styles.iconContainer, styles.iconShadow, { width: scaled.iconSize, height: scaled.iconSize }]}>
                        <Image source={assets.share_icon} style={[styles.iconImage, { width: scaled.iconSize, height: scaled.iconSize }]} fadeDuration={0}/>
                    </View>
                    <Text style={[styles.actionText, { fontSize: scaled.actionFont }]}>Share</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, { marginBottom: scaled.actionMargin }]} onPress={handleCall}>
                    <View style={[styles.iconContainer, styles.iconShadow, { width: scaled.iconSize, height: scaled.iconSize }]}>
                        <Image source={assets.call_icon} style={[styles.iconImage, { width: scaled.iconSize, height: scaled.iconSize }]} fadeDuration={0}/>
                    </View>
                    <Text style={[styles.actionText, { fontSize: scaled.actionFont }]}>Sună</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, { marginBottom: scaled.actionMargin }]} onPress={() => { if (requireAuth()) return; setReportVisible(true); }}>
                    <View style={[styles.iconContainer, styles.iconShadow, { width: scaled.iconSize, height: scaled.iconSize }]}>
                        <Image source={assets.report_icon} style={[styles.iconImage, { width: scaled.iconSize, height: scaled.iconSize }]} fadeDuration={0}/>
                    </View>
                    <Text style={[styles.actionText, { fontSize: scaled.actionFont }]}>Report</Text>
                </Pressable>
            </View>

            <View 
                style={[styles.bottomOverlay, { bottom: scaled.bottomOverlayBottom, opacity: shouldHideUI ? 0 : 1 }]} 
                pointerEvents={shouldHideUI ? 'none' : 'box-none'}
            >
                <View style={styles.userInfoRow}>
                    {pfpIconVisible ? (
                        <Pressable onPress={() => handleProfilePress(item.user_id._id)}>
                            <Text style={[styles.userNameText, { fontSize: scaled.userNameFont }]}>@{item.user_name || 'Utilizator'}</Text>
                        </Pressable>
                    ) : (
                        <Text style={[styles.userNameText, { fontSize: scaled.userNameFont }]}>@{item.user_name || 'Utilizator'}</Text>
                    )}
                    <Text style={[styles.locationText2, { fontSize: scaled.locationFont }]}>• {item.location?.city}</Text>
                </View>
                <Text style={[styles.brandTitle, { fontSize: scaled.brandFont }]} numberOfLines={1}>{item.title || `${item.brand.name} ${item.model.name}`}</Text>
                <Text style={[styles.overlayPrice, { fontSize: scaled.priceFont }]}>{formatPrice(item.price)} €</Text>
                <View style={[styles.tagsRow, { marginBottom: scaled.tagsRowMargin }]}>
                    <View style={[styles.glassTag, { paddingVertical: scaled.tagPadV, paddingHorizontal: scaled.tagPadH }]}><Text style={[styles.tagText, { fontSize: scaled.tagFont }]}>{item.production_year}</Text></View>
                    <View style={[styles.glassTag, { paddingVertical: scaled.tagPadV, paddingHorizontal: scaled.tagPadH }]}><Text style={[styles.tagText, { fontSize: scaled.tagFont }]}>{formatKm(item.mileage)} km</Text></View>
                    <View style={[styles.glassTag, { paddingVertical: scaled.tagPadV, paddingHorizontal: scaled.tagPadH }]}><Text style={[styles.tagText, { fontSize: scaled.tagFont }]}>{item.engine.fuel_type}</Text></View>
                    <View style={[styles.glassTag, styles.viewsTag, { paddingVertical: scaled.tagPadV, paddingHorizontal: scaled.tagPadH }]}><Image source={assets.view_icon} style={styles.viewsIcon} resizeMode="contain" /><Text style={[styles.tagText, { fontSize: scaled.tagFont }]}>{item.views ? formatKm(item.views) : 0}</Text></View>
                </View>
            </View>

            <CommentsSheet visible={commentsVisible} onClose={() => setCommentsVisible(false)} saleId={item._id} onCommentAdded={handleCommentAdded} postAuthorId={item.user_id._id} targetCommentId={targetCommentId} />
            <ReportModal visible={reportVisible} onClose={() => setReportVisible(false)} reportType="post" reportId={item._id} />
            <Modal
                visible={descriptionVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDescriptionVisible(false)}
            >
                <Pressable style={styles.descModalOverlay} onPress={() => setDescriptionVisible(false)}>
                    <Pressable style={styles.descModalCard} onPress={() => {}}>
                        <View style={styles.descModalHeader}>
                            <View style={styles.descModalHeaderText}>
                                <Text style={styles.descModalTitle} numberOfLines={1}>{item.title || `${item.brand.name} ${item.model.name}`}</Text>
                                <Text style={styles.descModalPrice}>{formatPrice(item.price)} € {item.negotiable ? '· Negociabil' : '· Preț Fix'}</Text>
                            </View>
                            <Pressable style={styles.descModalClose} onPress={() => setDescriptionVisible(false)}>
                                <Text style={styles.descModalCloseText}>✕</Text>
                            </Pressable>
                        </View>
                        <View style={styles.descModalDivider} />
                        <ScrollView style={styles.descModalScroll} showsVerticalScrollIndicator={true} contentContainerStyle={styles.descModalScrollContent}>
                            <Text style={styles.descModalText}>{item.description || "Fără descriere adăugată."}</Text>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={messageModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => { setMessageModalVisible(false); setMessageText(''); }}
            >
            <KeyboardAvoidingView
                style={styles.msgModalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Pressable style={{ flex: 1 }} onPress={() => { setMessageModalVisible(false); setMessageText(''); }}>
                    <View style={styles.msgModalCentered}>
                        <Pressable style={styles.msgModalCard} onPress={() => {}}>
                        <View style={styles.msgModalHeader}>
                            <Image
                                source={previewImageUrl ? { uri: previewImageUrl } : assets.default_profile}
                                style={styles.msgModalThumb}
                            />
                            <View style={styles.msgModalInfo}>
                                <Text style={styles.msgModalTitle} numberOfLines={1}>{item.title || `${item.brand.name} ${item.model.name}`}</Text>
                                <Text style={styles.msgModalPrice}>{formatPrice(item.price)} €</Text>
                                <Text style={styles.msgModalSeller} numberOfLines={1}>@{item.user_name}</Text>
                            </View>
                            <Pressable style={styles.msgModalCloseBtn} onPress={() => { setMessageModalVisible(false); setMessageText(''); }}>
                                <Text style={styles.msgModalCloseBtnText}>✕</Text>
                            </Pressable>
                        </View>
                        <View style={styles.msgModalDivider} />
                        <Text style={styles.msgModalLabel}>Mesaj:</Text>
                        <TextInput
                            style={styles.msgModalInput}
                            placeholder="Ex: Salut, mai este disponibil?"
                            placeholderTextColor="#999"
                            multiline
                            maxLength={500}
                            value={messageText}
                            onChangeText={setMessageText}
                        />
                        <Text style={styles.msgModalCharCount}>{messageText.length}/500</Text>
                        <View style={styles.msgModalActions}>
                            <Pressable
                                style={styles.msgModalCancelBtn}
                                onPress={() => { setMessageModalVisible(false); setMessageText(''); }}
                                disabled={messageSending}
                            >
                                <Text style={styles.msgModalCancelText}>Anulează</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.msgModalSendBtn, messageSending && { opacity: 0.6 }]}
                                onPress={handleSendSaleMessage}
                                disabled={messageSending}
                            >
                                {messageSending
                                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                                    : <Text style={styles.msgModalSendText}>Trimite</Text>
                                }
                            </Pressable>
                        </View>
                    </Pressable>
                </View>
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>

            <ToastNotification visible={toastVisible} message="Comentariile sunt dezactivate." />
        </View>
    );
}, (prevProps, nextProps) => {
    return prevProps.item._id === nextProps.item._id && prevProps.item.hasLiked === nextProps.item.hasLiked && prevProps.item.likes_count === nextProps.item.likes_count && prevProps.itemHeight === nextProps.itemHeight && prevProps.guestMode === nextProps.guestMode;
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
    gradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '22.75%', backgroundColor: 'rgba(0, 0, 0, 0.13)' },
    bigHeartContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 20, elevation: 20, backgroundColor: 'transparent' },
    bigHeartImage: { width: 100, height: 100, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3.84 },
    summarySlide: { width: width, height: ITEM_HEIGHT, backgroundColor: '#FFFFFF', padding: 20, paddingTop: 122 },
    summaryTitle: { fontSize: 26.5, fontWeight: '900', color: '#800000', marginBottom: 2, marginTop: 10 },
    summaryPrice: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 16 },
    negotiableText: { fontSize: 14, color: '#888', fontWeight: 'normal' },
    summaryTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    summaryTag: { backgroundColor: '#f5f5f5', paddingVertical: 5, paddingHorizontal: 9, borderRadius: 6, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
    summaryTagText: { color: '#333', fontSize: 13, fontWeight: '500' },
    dismantleTag: { backgroundColor: '#ffe6e6', borderColor: '#ffcccc' },
    dismantleTagText: { color: '#cc0000', fontWeight: 'bold' },
    vinTagActive: { backgroundColor: '#e8f5e9', borderColor: '#c8e6c9' },
    vinTagTextActive: { color: '#2e7d32', fontWeight: 'bold' },
    descriptionLabel: { fontSize: 16, fontWeight: 'bold', color: '#800000', marginBottom: 5, marginTop: -6 },
    descriptionContainer: { height: 164, backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
    summaryDescription: { fontSize: 15, color: '#444', lineHeight: 22 },
    summaryLocation: { paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' },
    locationText1: { fontSize: 18, color: '#081539', fontWeight: '800', marginBottom: 5 },
    phoneText: { fontSize: 14, color: '#800000', fontWeight: 'bold' },
    rightActions: { position: 'absolute', right: 10, alignItems: 'center', zIndex: 10 },
    actionButtonProfile: { alignItems: 'center' },
    actionButton: { alignItems: 'center' },
    iconContainer: { justifyContent: 'center', alignItems: 'center', marginBottom: 4, position: 'relative' },
    iconShadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 2.5, elevation: 3 },
    iconImage: { resizeMode: 'contain' },
    absoluteIcon: { position: 'absolute', top: 0, left: 0 },
    actionText: { color: 'white', fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    profileBorder: { borderWidth: 2, borderColor: 'white', padding: 1 },
    profileImage: { },
    bottomOverlay: { position: 'absolute', left: 14, width: '80%', zIndex: 5 },
    userInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    userNameText: { color: '#FFFFFF', fontWeight: '600', textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3, marginRight: 6 },
    locationText2: { color: 'white', fontWeight: '500', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    brandTitle: { fontWeight: '800', marginVertical: 4, color: '#FFFFFF', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 },
    overlayPrice: { fontWeight: '700', color: '#f0f0f0', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
    tagsRow: { flexDirection: 'row' },
    glassTag: { backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 4, marginRight: 5 },
    tagText: { color: 'white', fontWeight: '600' },
    emoji: { fontSize: 60, marginBottom: 20 },
    viewsTag: { flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
    viewsIcon: { width: 14, height: 14, tintColor: 'white', marginRight: 4, opacity: 0.9 },
    retryButton: { backgroundColor: '#800000', paddingHorizontal: 35, paddingVertical: 14, borderRadius: 25, minWidth: 200, alignItems: 'center' },
    retryText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    slideRoot: { width: width, height: ITEM_HEIGHT, position: 'relative' },
    matrioskaWrapper: { width: width, height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
    toastContainer: { position: 'absolute', top: height / 2 - 20, alignSelf: 'center', backgroundColor: 'rgba(128, 0, 0, 0.95)', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25, zIndex: 200, elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
    toastText: { color: 'white', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
    separatorCheckIcon: { width: width/8, height: width/8, marginBottom: 20 },
    descModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    descModalCard: { width: '94%', height: '70%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, paddingTop: 20 },
    descModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
    descModalHeaderText: { flex: 1, marginRight: 12 },
    descModalTitle: { fontSize: 22, fontWeight: '800', color: '#081539', marginBottom: 4 },
    descModalPrice: { fontSize: 16, fontWeight: '600', color: '#800000' },
    descModalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#800000', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
    descModalCloseText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    descModalDivider: { height: 1, backgroundColor: '#E8E8E8', marginBottom: 14 },
    descModalScroll: { flex: 1, backgroundColor: '#FAFAFA', borderRadius: 10, borderWidth: 1, borderColor: '#F0F0F0' },
    descModalScrollContent: { padding: 14 },
    descModalText: { fontSize: 17, color: '#333', lineHeight: 26 },
    msgButton: { position: 'absolute', left: 15, zIndex: 10, backgroundColor: '#800000', flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 5 },
    msgButtonText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.3 },
    msgModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    msgModalCard: { width: '90%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
    msgModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    msgModalThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#E0E0E0', marginRight: 12 },
    msgModalInfo: { flex: 1, marginRight: 8 },
    msgModalTitle: { fontSize: 16, fontWeight: '800', color: '#081539', marginBottom: 2 },
    msgModalPrice: { fontSize: 15, fontWeight: '700', color: '#800000', marginBottom: 2 },
    msgModalSeller: { fontSize: 12, color: '#999', fontWeight: '500' },
    msgModalCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#800000', justifyContent: 'center', alignItems: 'center' },
    msgModalCloseBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
    msgModalDivider: { height: 1, backgroundColor: '#E8E8E8', marginBottom: 14 },
    msgModalLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
    msgModalInput: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, height: 90, textAlignVertical: 'top', fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 4 },
    msgModalCharCount: { fontSize: 11, color: '#999', textAlign: 'right', marginBottom: 16 },
    msgModalActions: { flexDirection: 'row', gap: 10 },
    msgModalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
    msgModalCancelText: { fontSize: 15, fontWeight: '600', color: '#333' },
    msgModalSendBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: '#081539', alignItems: 'center', justifyContent: 'center' },
    msgModalSendText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    msgModalCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default PostItem;