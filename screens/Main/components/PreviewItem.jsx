import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
    View, 
    StyleSheet, 
    FlatList, 
    Dimensions, 
    ScrollView, 
    Platform
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import ZoomableMedia from './ZoomableImage.jsx'; 
import CarScrubber from './CarScrubber.jsx';
import { ITEM_HEIGHT, UI_SCALE, SUMMARY_SCALE } from '../../../helpers/layout.js';

import {Text, TextInput} from '../../../helpers/AppText.jsx';

const { width, height } = Dimensions.get('window');

const COLORS = {
    primary: '#800000',
    accent: '#E0706C',
    bg: '#1B1F26',
    surface: '#262B33',
    border: '#2F353E',
    text: '#E6E8EB',
    textMuted: '#9AA0A8',
};

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const sc = UI_SCALE;
const scaled = {
    bottomOverlayBottom: Math.round(20 * sc),
    userNameFont: 16 * sc,
    locationFont: 15 * sc,
    brandFont: 16.5 * sc,
    priceFont: 19 * sc,
    tagFont: 12 * sc,
    tagPadV: Math.round(4 * sc),
    tagPadH: Math.round(8 * sc),
    tagsRowMargin: Math.round(18 * sc),
};

const ssc = SUMMARY_SCALE;
const summaryScaled = {
    titleFont: 25 * ssc,
    priceFont: 22 * ssc,
    negotiableFont: 14 * ssc,
    priceMargin: Math.round(16 * ssc),
    tagPadV: Math.round(6 * ssc),
    tagPadH: Math.round(10 * ssc),
    tagFont: 13 * ssc,
    tagsMargin: Math.round(10 * ssc),
    descLabelFont: 16 * ssc,
    descContainerHeight: Math.round(162 * ssc),
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

const SummarySlide = ({ item, formatPrice, formatKm, itemHeight }) => (
    <View style={[styles.summarySlide, { height: itemHeight, padding: summaryScaled.slidePadding, paddingTop: summaryScaled.slidePaddingTop }]}>
        <Text style={[styles.summaryTitle, { fontSize: summaryScaled.titleFont }]}>
            {item.title || `${item.brand.name} ${item.model.name}`}
        </Text>
        <Text style={[styles.summaryPrice, { fontSize: summaryScaled.priceFont, marginBottom: summaryScaled.priceMargin }]}>
            {formatPrice(item.price)} € <Text style={{fontSize: summaryScaled.negotiableFont, color: COLORS.textMuted, fontWeight: 'normal'}}>{item.negotiable ? '(Negociabil)' : '(Preț Fix)'}</Text>
        </Text>

        <View style={[styles.summaryTagsContainer, { marginBottom: summaryScaled.tagsMargin }]}>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}><Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{item.production_year}</Text></View>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}><Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{formatKm(item.mileage)} km</Text></View>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}><Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{capitalize(item.engine.fuel_type)}</Text></View>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}><Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{item.engine.capacity}</Text></View>
            {item.horsepower ? <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}><Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{item.horsepower} CP</Text></View> : null}
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}><Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{capitalize(item.transmission)}</Text></View>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}><Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{capitalize(item.body_type)}</Text></View>
            <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}><Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{capitalize(item.color)}</Text></View>
            {item.drivetrain && <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}><Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{item.drivetrain.toUpperCase()}</Text></View>}
            {item.pollution_standard && <View style={[styles.summaryTag, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}><Text style={[styles.summaryTagText, { fontSize: summaryScaled.tagFont }]}>{capitalize(item.pollution_standard)}</Text></View>}
            
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
                <View style={[styles.summaryTag, { backgroundColor: '#3A2222', borderColor: '#5C2E2E', paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                    <Text style={[styles.summaryTagText, { color: '#EF7A78', fontWeight: 'bold', fontSize: summaryScaled.tagFont }]}>
                        ⚠️ Pentru dezmembrare
                    </Text>
                </View>
            )}

            <View style={[styles.summaryTag, item.vin ? { backgroundColor: '#1E2C20', borderColor: '#2E4A33' } : null, { paddingVertical: summaryScaled.tagPadV, paddingHorizontal: summaryScaled.tagPadH }]}>
                <Text style={[styles.summaryTagText, item.vin ? { color: '#7FC489', fontWeight: 'bold' } : null, { fontSize: summaryScaled.tagFont }]}>
                    {item.vin ? `VIN: ${item.vin}` : "VIN: Nespecificat"}
                </Text>
            </View>
        </View>

        <Text style={[styles.descriptionLabel, { fontSize: summaryScaled.descLabelFont }]}>Descriere:</Text>
        <View style={[styles.descriptionContainer, { height: summaryScaled.descContainerHeight, padding: summaryScaled.descPad, marginBottom: summaryScaled.descMargin }]}>
            <ScrollView nestedScrollEnabled={true}>
                <Text style={[styles.summaryDescription, { fontSize: summaryScaled.descFont, lineHeight: summaryScaled.descLineHeight }]}>
                    {item.description || "Fără descriere adăugată."}
                </Text>
            </ScrollView>
        </View>

        <View style={[styles.summaryLocation, { paddingTop: summaryScaled.locationPadTop }]}>
            <Text style={[styles.locationText1, { fontSize: summaryScaled.locationFont }]}>📍 {item.location.city}, {item.location.county}</Text>
            <Text style={[styles.phoneText, { fontSize: summaryScaled.phoneFont }]}>📞 {item.phone_number}</Text>
        </View>
    </View>
);

const PreviewMediaSlide = ({ mediaItem, index, currentIndex, isVisible, isZooming, isEditing, handleZoomChange, itemHeight, onAutoScaleComputed }) => {
    const videoRef = useRef(null);
    const [duration, setDuration] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [videoNaturalDims, setVideoNaturalDims] = useState(null);
    const [imageNaturalDims, setImageNaturalDims] = useState(null);
    const hasAutoInitialized = useRef(false);
    const videoProgress = useSharedValue(0);

    useEffect(() => {
        videoProgress.value = 0;
        setDuration(0);
        setIsScrubbing(false);
        setVideoNaturalDims(null);
        setImageNaturalDims(null);
        hasAutoInitialized.current = false;
    }, [mediaItem.uri]);

    const onSeekStart = useCallback(() => setIsScrubbing(true), []);
    
    const onSeekEnd = useCallback((newProgress) => {
        if (videoRef.current && duration > 0) {
            videoRef.current.seek(newProgress * duration);
        }
        setIsScrubbing(false);
    }, [duration]);

    const handleVideoNaturalSize = useCallback(({ width: vw, height: vh }) => {
        if (Number.isFinite(vw) && Number.isFinite(vh) && vw > 0 && vh > 0) {
            setVideoNaturalDims({ width: vw, height: vh });
        }
    }, []);

    const handleImageNaturalSize = useCallback(({ width: iw, height: ih }) => {
        if (Number.isFinite(iw) && Number.isFinite(ih) && iw > 0 && ih > 0) {
            setImageNaturalDims({ width: iw, height: ih });
            if (!hasAutoInitialized.current && !mediaItem.zoom_initialized && onAutoScaleComputed) {
                const mediaTallness = ih / iw;
                const defaultFraction = mediaTallness >= 1.34 ? 1 : 0;
                hasAutoInitialized.current = true;
                onAutoScaleComputed(index, defaultFraction);
            }
        }
    }, [mediaItem.zoom_initialized, onAutoScaleComputed, index]);

    const isVideo = mediaItem.type?.includes('video');

    const measuredDims = isVideo ? videoNaturalDims : imageNaturalDims;
    const fallbackDims = (mediaItem.width > 0 && mediaItem.height > 0)
        ? { width: mediaItem.width, height: mediaItem.height }
        : null;
    const dims = measuredDims || fallbackDims;

    let currentScale = 1;
    let isFullCover = false;

    if (dims && dims.width > 0 && dims.height > 0) {
        const ratioW = width / dims.width;
        const ratioH = itemHeight / dims.height;
        const minRatio = Math.min(ratioW, ratioH);
        const maxRatio = Math.max(ratioW, ratioH);
        if (minRatio > 0 && Number.isFinite(minRatio) && Number.isFinite(maxRatio)) {
            const coverScale = maxRatio / minRatio;
            const widthFillScale = ratioW / minRatio;
            if (Number.isFinite(coverScale) && Number.isFinite(widthFillScale)) {
                if (isVideo) {
                    const videoTallness = dims.height / dims.width;
                    const target = videoTallness >= 1.34 ? coverScale : 1;
                    currentScale = Math.max(target, widthFillScale);
                } else {
                    const frac = (typeof mediaItem.cover_fraction === 'number' && Number.isFinite(mediaItem.cover_fraction))
                        ? mediaItem.cover_fraction
                        : ((typeof mediaItem.zoom_level === 'number' && mediaItem.zoom_level > 1.01) ? 1 : 0);
                    const target = 1 + frac * (coverScale - 1);
                    currentScale = Math.max(target, widthFillScale);
                    if (currentScale >= coverScale - 0.0001) {
                        isFullCover = true;
                    }
                }
            }
        }
    }

    const isCurrentActiveEditing = isEditing && currentIndex === index;
    const isPaused = !isVisible || currentIndex !== index;

    return (
        <View style={[
            styles.mediaOuterContainer,
            { height: itemHeight },
            isCurrentActiveEditing ? styles.editingBorder : null
        ]}>
            <View style={[styles.mediaInnerContainer, { transform: [{ scale: currentScale }] }]}>
                <ZoomableMedia 
                    uri={
                        mediaItem.uri.startsWith('http') 
                            ? mediaItem.uri 
                            : (Platform.OS === 'ios' && !mediaItem.uri.startsWith('file://') ? `file://${mediaItem.uri}` : mediaItem.uri)
                    }
                    type={isVideo ? 'video' : 'image'} 
                    height={itemHeight} 
                    paused={isPaused} 
                    onZoomChange={handleZoomChange}
                    videoRef={videoRef}
                    onVideoLoad={(d) => setDuration(d)}
                    onVideoNaturalSize={handleVideoNaturalSize}
                    onImageNaturalSize={handleImageNaturalSize}
                    onVideoProgress={(time) => { 
                        if (duration > 0 && Number.isFinite(time)) {
                            videoProgress.value = time / duration; 
                        } else {
                            videoProgress.value = 0;
                        }
                    }}
                    isFullCover={isFullCover}
                    isScrubbing={isScrubbing}
                />
            </View>
            
            {!isZooming && !isEditing && <View style={styles.gradientOverlay} pointerEvents="none" />}

        </View>
    );
};

const PreviewItem = React.memo(({ item, isVisible = true, onSlideChange, isEditing = false, itemHeight = ITEM_HEIGHT, onAutoScaleComputed }) => {
    const slidesData = useMemo(() => 
        [...item.media, { isSummary: true, _id: 'summary_card' }], 
    [item.media]);

    const flatListRef = useRef(null);
    const dragStartOffset = useRef(0);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isZooming, setIsZooming] = useState(false);

    const handleZoomChange = useCallback((zooming) => {
        setIsZooming(zooming);
    }, []);

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            const index = viewableItems[0].index;
            setCurrentIndex(index);
            if (onSlideChange) {
                onSlideChange(index);
            }
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
            return <SummarySlide item={item} formatPrice={formatPrice} formatKm={formatKm} itemHeight={itemHeight} />;
        }

        return (
            <PreviewMediaSlide 
                mediaItem={mediaItem}
                index={index}
                currentIndex={currentIndex}
                isVisible={isVisible}
                isZooming={isZooming}
                isEditing={isEditing}
                handleZoomChange={handleZoomChange}
                itemHeight={itemHeight}
                onAutoScaleComputed={onAutoScaleComputed}
            />
        );
    };

    const shouldHideUI = isZooming || currentIndex === slidesData.length - 1 || isEditing;

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
                maxToRenderPerBatch={2}
                removeClippedSubviews={true} 
                overScrollMode="never"
                scrollEnabled={!isEditing && !isZooming} 
            />

            <View 
                style={[
                    styles.bottomOverlay, 
                    { bottom: scaled.bottomOverlayBottom, opacity: shouldHideUI ? 0 : 1 } 
                ]} 
                pointerEvents="none"
            >
                <View style={styles.userInfoRow}>
                    <Text style={[styles.userNameText, { fontSize: scaled.userNameFont }]}>@Tu (Previzualizare)</Text>
                    <Text style={[styles.locationText2, { fontSize: scaled.locationFont }]}>• {item.location?.city}</Text>
                </View>
                <Text style={[styles.brandTitle, { fontSize: scaled.brandFont }]} numberOfLines={1}>
                    {item.title || `${item.brand.name} ${item.model.name}`}
                </Text>
                <Text style={[styles.overlayPrice, { fontSize: scaled.priceFont }]}>{formatPrice(item.price)} €</Text>
                <View style={[styles.tagsRow, { marginBottom: scaled.tagsRowMargin }]}>
                    <View style={[styles.glassTag, { paddingVertical: scaled.tagPadV, paddingHorizontal: scaled.tagPadH }]}><Text style={[styles.tagText, { fontSize: scaled.tagFont }]}>{item.production_year}</Text></View>
                    <View style={[styles.glassTag, { paddingVertical: scaled.tagPadV, paddingHorizontal: scaled.tagPadH }]}><Text style={[styles.tagText, { fontSize: scaled.tagFont }]}>{formatKm(item.mileage)} km</Text></View>
                    <View style={[styles.glassTag, { paddingVertical: scaled.tagPadV, paddingHorizontal: scaled.tagPadH }]}><Text style={[styles.tagText, { fontSize: scaled.tagFont }]}>{item.engine.fuel_type}</Text></View>
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    postContainer: { width: width, height: ITEM_HEIGHT, backgroundColor: '#000' },
    mediaOuterContainer: { width: width, height: ITEM_HEIGHT, backgroundColor: '#000', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    mediaInnerContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    editingBorder: { borderWidth: 2, borderColor: '#800000' },
    gradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '22.75%', backgroundColor: 'rgba(0, 0, 0, 0.13)' },
    summarySlide: { width: width, height: ITEM_HEIGHT, backgroundColor: COLORS.bg, padding: 20, paddingTop: 122 },
    summaryTitle: { fontSize: 26.5, fontWeight: '900', color: COLORS.accent, marginBottom: 2, marginTop: 10 },
    summaryPrice: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
    summaryTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    summaryTag: { backgroundColor: COLORS.surface, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
    summaryTagText: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
    descriptionLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.accent, marginBottom: 5, marginTop: -6 },
    descriptionContainer: { height: 164, backgroundColor: COLORS.surface, borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
    summaryDescription: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
    summaryLocation: { paddingTop: 15, borderTopWidth: 1, borderTopColor: COLORS.border },
    locationText1: { fontSize: 18, color: COLORS.text, fontWeight: '800', marginBottom: 5 },
    phoneText: { fontSize: 14, color: COLORS.accent, fontWeight: 'bold' },
    bottomOverlay: { position: 'absolute', left: 14, width: '80%', zIndex: 5 },
    userInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    userNameText: { color: '#FFFFFF', fontWeight: '600', textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3, marginRight: 6 },
    locationText2: { color: 'white', fontWeight: '500', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    brandTitle: { fontWeight: '800', marginVertical: 4, color: '#FFFFFF', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 },
    overlayPrice: { fontWeight: '700', color: '#f0f0f0', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
    tagsRow: { flexDirection: 'row' },
    glassTag: { backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 4, marginRight: 5 },
    tagText: { color: 'white', fontWeight: '600' }
});

export default PreviewItem;