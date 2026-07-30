import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { 
    View, 
    StyleSheet, 
    Pressable, 
    Image, 
    Alert, 
    Platform,
    StatusBar,
    Dimensions
} from 'react-native';

import {Text, TextInput} from '../../helpers/AppText.jsx';
import Slider from '@react-native-community/slider';
import { showMessage } from 'react-native-flash-message';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    Easing 
} from 'react-native-reanimated';
import RNBlobUtil from 'react-native-blob-util';

import { Context } from '../../context/Context.js';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';
import { getCreds, setCreds } from '../../helpers/keychainFunctions.js';
import { emitter } from '../../helpers/eventBus.js';
import { assets } from '../../assets.js';
import { ITEM_HEIGHT } from '../../helpers/layout.js';
import PreviewItem from './components/PreviewItem.jsx';

const { url } = assets;
const { width: screenWidth } = Dimensions.get('window');

const CarLoadingIndicator = () => {
    const translateX = useSharedValue(0);

    useEffect(() => {
        translateX.value = withRepeat(
            withTiming(180, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    const carStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    return (
        <View style={styles.loadingTrackContainer}>
            <View style={styles.loadingTrackLine} />
            <Animated.Image 
                source={assets.car_scrubber} 
                style={[styles.loadingCarIcon, carStyle]} 
                resizeMode="contain" 
            />
        </View>
    );
};

const uploadWithBlobUtil = async (endpoint, fields, files, method = 'POST') => {
    const makeRequest = async (token) => {
        const data = [];

        for (const [key, value] of Object.entries(fields)) {
            data.push({ name: key, data: String(value) });
        }

        for (const file of files) {
            let filePath = file.uri;
            if (filePath.startsWith('file://')) {
                filePath = filePath.replace('file://', '');
            }

            data.push({
                name: 'mediaFiles',
                filename: file.fileName,
                type: file.type,
                data: RNBlobUtil.wrap(filePath),
            });
        }

        return RNBlobUtil.config({ timeout: 120000 }).fetch(
            method,
            `${url}${endpoint}`,
            {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
            data
        );
    };

    const requestWithRetry = async (token) => {
        try {
            return await makeRequest(token);
        } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return await makeRequest(token);
        }
    };

    const creds = await getCreds();
    let token = creds?.accessToken;

    let response = await requestWithRetry(token);
    console.log('Response status:', response.respInfo.status);
    console.log('Response text:', response.text());
    let responseData = response.json();

    if (response.respInfo.status === 401) {
        const refreshResponse = await axiosAuthGuard.post('/api/user/refresh', {
            refreshToken: creds?.refreshToken
        });

        if (refreshResponse.data.success) {
            const { newAccessToken, newRefreshToken } = refreshResponse.data;
            await setCreds({ accessToken: newAccessToken, refreshToken: newRefreshToken });

            response = await requestWithRetry(newAccessToken);
            responseData = response.json();
        } else {
            throw new Error('Sesiunea a expirat. Te rugăm să te reconectezi.');
        }
    }

    if (response.respInfo.status >= 400) {
        throw new Error(responseData?.message || `Eroare server (${response.respInfo.status})`);
    }

    return responseData;
};

export default function PreviewSaleScreen({ navigation }) {
    const { draftSale, setDraftSale } = useContext(Context);

    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [containerHeight, setContainerHeight] = useState(null);
    
    const [publishing, setPublishing] = useState(false);
    const publishingRef = useRef(false);
    const [loadingText, setLoadingText] = useState("");

    const handleZoomChange = useCallback((value) => {
        const updatedMedia = [...draftSale.media];
        updatedMedia[currentSlideIndex] = {
            ...updatedMedia[currentSlideIndex],
            cover_fraction: value,
            zoom_initialized: true
        };
        setDraftSale({ ...draftSale, media: updatedMedia });
    }, [draftSale, currentSlideIndex, setDraftSale]);

    const handleAutoScaleComputed = useCallback((index, fraction) => {
        setDraftSale(prev => {
            if (!prev?.media?.[index]) return prev;
            if (prev.media[index].zoom_initialized) return prev;
            const updatedMedia = [...prev.media];
            updatedMedia[index] = {
                ...updatedMedia[index],
                cover_fraction: fraction,
                zoom_initialized: true
            };
            return { ...prev, media: updatedMedia };
        });
    }, [setDraftSale]);

    useEffect(() => {
        if (!draftSale || !draftSale.media) {
            navigation.goBack();
        }
    }, [draftSale]);

    useEffect(() => {
        if (isEditing && draftSale?.media?.[currentSlideIndex]?.type?.includes('video')) {
            setIsEditing(false);
        }
    }, [currentSlideIndex, isEditing, draftSale]);

    const handleContainerLayout = useCallback((e) => {
        const h = e.nativeEvent.layout.height;
        if (Number.isFinite(h) && h > 0 && h !== containerHeight) {
            setContainerHeight(h);
        }
    }, [containerHeight]);

    if (!draftSale || !draftSale.media) return null;

    const isSummarySlide = currentSlideIndex >= draftSale.media.length;
    const isCurrentVideo = !isSummarySlide && draftSale.media[currentSlideIndex]?.type?.includes('video');

    const effectiveItemHeight = containerHeight || ITEM_HEIGHT;

    const currentMedia = !isSummarySlide ? draftSale.media[currentSlideIndex] : null;
    const currentZoomValue = currentMedia
        ? ((typeof currentMedia.cover_fraction === 'number' && Number.isFinite(currentMedia.cover_fraction))
            ? currentMedia.cover_fraction
            : ((typeof currentMedia.zoom_level === 'number' && currentMedia.zoom_level > 1.01) ? 1 : 0))
        : 0;

    let sliderMin = 0;
    if (currentMedia && currentMedia.width > 0 && currentMedia.height > 0) {
        const screenTallness = effectiveItemHeight / screenWidth;
        const mediaTallness = currentMedia.height / currentMedia.width;
        sliderMin = mediaTallness > screenTallness ? 1 : 0;
    }

    const handlePublish = async () => {
        if (publishingRef.current) return;
        publishingRef.current = true; 
        setPublishing(true);

        try {
            setLoadingText("Pregătim fișierele originale pentru upload... 🚀");
            
            const metadataArray = [];

            const fields = {
                title: draftSale.title || '',
                brand_id: String(draftSale.brand.id),
                brand_name: draftSale.brand.name,
                model_id: String(draftSale.model.id),
                model_name: draftSale.model.name,
                engine_capacity: draftSale.engine.capacity,
                engine_fuel: draftSale.engine.fuel_type,
                horsepower: draftSale.horsepower || '',
                price: String(draftSale.price),
                negotiable: String(draftSale.negotiable),
                mileage: String(draftSale.mileage),
                production_year: String(draftSale.production_year),
                vin: draftSale.vin || '',
                body_type: draftSale.body_type,
                color: draftSale.color,
                transmission: draftSale.transmission,
                drivetrain: draftSale.drivetrain || '',
                pollution_standard: draftSale.pollution_standard || '',
                steering_wheel: draftSale.steering_wheel,
                county: draftSale.location.county,
                city: draftSale.location.city,
                registration_status: draftSale.registration_status,
                exchange_accepted: String(draftSale.exchange_accepted),
                for_dismante: String(draftSale.for_dismante),
                phone_number: draftSale.phone_number,
                description: draftSale.description || '',
                allow_comments: String(draftSale.allow_comments),
                allow_social_promo: String(draftSale.allow_social_promo),
            };


                const files = draftSale.media.map((file, i) => {
                    metadataArray.push({ cover_fraction: file.cover_fraction, oriented: file.oriented === true });
                    const isVideo = file.type && file.type.includes('video');
                    return {
                        uri: file.uri,
                        type: isVideo ? 'video/mp4' : 'image/jpeg',
                        fileName: file.fileName || `raw_upload_${Date.now()}_${i}.${isVideo ? 'mp4' : 'jpg'}`,
                    };
                });

                for (const file of files) {
                    let checkPath = file.uri;
                    if (checkPath.startsWith('file://')) checkPath = checkPath.replace('file://', '');
                    const exists = await RNBlobUtil.fs.exists(checkPath);
                    if (!exists) {
                        setPublishing(false);
                        publishingRef.current = false;
                        Alert.alert(
                            "Fișiere expirate",
                            "Pozele nu mai sunt accesibile. Te rugăm să le re-selectezi.",
                            [{ text: "OK", onPress: () => navigation.goBack() }]
                        );
                        return;
                    }
                }
                

            fields.media_metadata = JSON.stringify(metadataArray);

            setLoadingText("Trimitem fișierele către server... ⏳\n(Acest pas depinde de viteza ta de internet)");

            const data = await uploadWithBlobUtil('/api/sale/post/free', fields, files);
            // ─────────────────────────────────────────────────────────────────

            if (data.success) {
                if(false){
                    /*logica*/
                } else {
                    setPublishing(false);
                    showMessage({
                        type: "success",
                        message: "Succes!",
                        description: data.message,
                        duration: 3500,
                    });
                    emitter.emit('refresh_active_posts');
                    emitter.emit('reset_sale_form');
                    setTimeout(() => setDraftSale(null), 300);
                    navigation.navigate("ProfileTab");
                }
            } else {
                setPublishing(false);
                Alert.alert("Eroare", data.message || "Eroare la postare.");
            }
        } catch (error) {
            publishingRef.current = false;
            setPublishing(false);
            console.log("Mesaj eroare upload:", error.message || error);
            Alert.alert("Eroare", error.message || "Eroare de conexiune la trimiterea fișierelor.");
        }
    };

    return (
        <View style={styles.container} onLayout={handleContainerLayout}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Text style={styles.backText}>❮</Text> 
                </Pressable>

                <View style={styles.rightHeaderActions}>
                    {!isEditing && !isSummarySlide && !isCurrentVideo && (
                        <Pressable onPress={() => setIsEditing(true)} style={styles.iconButton}>
                            <Image source={assets.edit_icon} style={styles.editIcon} resizeMode="contain" />
                        </Pressable>
                    )}

                    {isEditing ? (
                        <Pressable style={[styles.postButton, { backgroundColor: '#28a745' }]} onPress={() => setIsEditing(false)}>
                            <Text style={styles.postButtonText}>Gata</Text>
                        </Pressable>
                    ) : (
                        <Pressable style={styles.postButton} onPress={handlePublish} disabled={publishing}>
                            <Text style={styles.postButtonText}>Postează</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            <PreviewItem 
                item={draftSale} 
                isVisible={true} 
                onSlideChange={(index) => setCurrentSlideIndex(index)} 
                isEditing={isEditing}
                itemHeight={effectiveItemHeight}
                onAutoScaleComputed={handleAutoScaleComputed}
            />

            {isEditing && !isCurrentVideo && (
                <View style={styles.verticalSliderWrapper} pointerEvents="box-none">
                    <View style={styles.sliderBackground}>
                        <Text style={styles.sliderLabel}>+</Text>
                        <Slider
                            style={styles.rotatedSlider}
                            minimumValue={sliderMin}
                            maximumValue={2.5} 
                            value={currentZoomValue}
                            onValueChange={handleZoomChange}
                            minimumTrackTintColor="#800000"
                            maximumTrackTintColor="rgba(255,255,255,0.3)"
                            thumbTintColor="#FFFFFF"
                        />
                        <Text style={styles.sliderLabel}>-</Text>
                    </View>
                </View>
            )}

            {publishing && (
                <View style={styles.modalOverlay}>
                    <View style={styles.loadingBox}>
                        <CarLoadingIndicator />
                        <Text style={styles.loadingTitle}>Nu închide aplicația</Text>
                        <Text style={styles.loadingSubtitle}>{loadingText}</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 100, 
    },
    rightHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        marginRight: 15, 
    },
    backText: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: -3, 
    },
    editIcon: {
        width: 20,
        height: 20,
        tintColor: 'white',
    },
    postButton: {
        backgroundColor: '#c00000', 
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    postButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
        letterSpacing: 0.5,
    },
    verticalSliderWrapper: {
        position: 'absolute',
        right: 15,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    sliderBackground: {
        backgroundColor: 'rgba(0,0,0,0.65)',
        borderRadius: 30,
        paddingVertical: 20,
        alignItems: 'center',
        height: 350, 
        width: 45,
        justifyContent: 'space-between',
    },
    rotatedSlider: {
        width: 250, 
        height: 40,
        transform: [{ rotate: '-90deg' }], 
    },
    sliderLabel: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        opacity: 0.8,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.9)', 
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000, 
    },
    loadingBox: {
        backgroundColor: '#111',
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        width: '85%',
        borderWidth: 1,
        borderColor: '#333',
    },
    loadingTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    loadingSubtitle: {
        color: '#ccc',
        fontSize: 15,
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 22,
    },
    loadingTrackContainer: {
        width: 220,
        height: 35,
        justifyContent: 'flex-end',
        marginBottom: 25,
        position: 'relative',
    },
    loadingTrackLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
    },
    loadingCarIcon: {
        width: 40,
        height: 20,
        position: 'absolute',
        bottom: 4,
        zIndex: 10,
    }
});
