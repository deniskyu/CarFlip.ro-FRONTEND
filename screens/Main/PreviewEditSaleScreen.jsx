import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Pressable, 
    Image, 
    Alert, 
    Platform,
    StatusBar,
    ActivityIndicator
} from 'react-native';
import Slider from '@react-native-community/slider';
import { showMessage } from 'react-native-flash-message';

import { Context } from '../../context/Context.js';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';
import { emitter } from '../../helpers/eventBus.js';
import { assets } from '../../assets.js';
import PreviewItem from './components/PreviewItem.jsx';

import RNBlobUtil from 'react-native-blob-util';
import { getCreds, setCreds } from '../../helpers/keychainFunctions.js';

const { url } = assets;

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

        return RNBlobUtil.fetch(
            method,
            `${url}${endpoint}`,
            {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
            data
        );
    };

    const creds = await getCreds();
    let token = creds?.accessToken;

    let response = await makeRequest(token);
    let responseData = response.json();

    if (response.respInfo.status === 401) {
        const refreshResponse = await axiosAuthGuard.post('/api/user/refresh', {
            refreshToken: creds?.refreshToken
        });

        if (refreshResponse.data.success) {
            const { newAccessToken, newRefreshToken } = refreshResponse.data;
            await setCreds({ accessToken: newAccessToken, refreshToken: newRefreshToken });
            response = await makeRequest(newAccessToken);
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



export default function PreviewEditSaleScreen({ navigation }) {
    const { draftSale, setDraftSale } = useContext(Context);

    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    
    const [publishing, setPublishing] = useState(false);
    const [loadingText, setLoadingText] = useState("Salvăm modificările...");

    const publishingRef = useRef(false);

    const handleZoomChange = useCallback((value) => {
        const updatedMedia = [...draftSale.media];
        updatedMedia[currentSlideIndex] = {
            ...updatedMedia[currentSlideIndex],
            zoom_level: value
        };
        setDraftSale({ ...draftSale, media: updatedMedia });
    }, [draftSale, currentSlideIndex, setDraftSale]);

 
    if (!draftSale || !draftSale.media) return null;

    const isSummarySlide = currentSlideIndex >= draftSale.media.length;
    const currentZoomValue = (!isSummarySlide && draftSale.media[currentSlideIndex]?.zoom_level) || 1;

    const handleApplyEdits = async () => {
        if (publishingRef.current) return;
        publishingRef.current = true;
        setPublishing(true);
    
        const hasNewMedia = draftSale.newLocalMedia && draftSale.newLocalMedia.length > 0;
    
        if (hasNewMedia) {
            try {
                setLoadingText("Trimitem fișierele către server... ⏳\n(Acest pas depinde de viteza ta de internet)");
    
                const metadataArray = [];
    
                const fields = {
                    engine_capacity: draftSale.engine_capacity || draftSale.engine?.capacity || '',
                    price: String(draftSale.price),
                    mileage: String(draftSale.mileage),
                    vin: draftSale.vin || '',
                    negotiable: String(draftSale.negotiable),
                    county: draftSale.location.county,
                    city: draftSale.location.city,
                    description: draftSale.description || '',
                    phone_number: draftSale.phone_number,
                    registration_status: draftSale.registration_status,
                    exchange_accepted: String(draftSale.exchange_accepted),
                    for_dismante: String(draftSale.for_dismante),
                    allow_comments: String(draftSale.allow_comments),
                    old_public_ids: JSON.stringify(draftSale.oldMediaPublicIds || []),
                };

                const files = draftSale.newLocalMedia.map((file, i) => {
                    const isVideo = file.type && file.type.includes('video');
                    metadataArray.push({ zoom_level: draftSale.media[i]?.zoom_level || 1 });
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
                        Alert.alert("Eroare", "Un fișier media nu mai este accesibil. Te rugăm să re-selectezi pozele.");
                        return;
                    }
                }

                fields.media_metadata = JSON.stringify(metadataArray);
    
                const data = await uploadWithBlobUtil(
                    `/api/sales/edit-with-media/${draftSale.editPostId}`,
                    fields,
                    files,
                    'PUT'  
                );

                if (data.success) {
                    emitter.emit('refresh_active_posts');
                    showMessage({
                        type: "success",
                        message: "Succes!",
                        description: "Modificările au fost salvate! Pozele noi se procesează în fundal (1-2 minute)."
                    });
                    setTimeout(() => setDraftSale(null), 300);
                    publishingRef.current = false;
                    setPublishing(false);
                    navigation.navigate('ProfileDrawer');
                } else {
                    throw new Error(data.message || "Eroare la actualizare.");
                }
            } catch (error) {
                publishingRef.current = false;
                setPublishing(false);
                Alert.alert("Eroare", error.message || "Eroare de conexiune la server.");
            }
    
        } else {
            try {
                setLoadingText("Salvăm modificările...");
    
                const editPayload = {
                    engine_capacity: draftSale.engine_capacity,
                    price: draftSale.price,
                    mileage: draftSale.mileage,
                    vin: draftSale.vin,
                    negotiable: draftSale.negotiable,
                    county: draftSale.location.county,
                    city: draftSale.location.city,
                    description: draftSale.description,
                    phone_number: draftSale.phone_number,
                    registration_status: draftSale.registration_status,
                    exchange_accepted: draftSale.exchange_accepted,
                    for_dismante: draftSale.for_dismante,
                    allow_comments: draftSale.allow_comments,
                    media: draftSale.media 
                };
    
                const response = await axiosAuthGuard.put(`/api/sales/edit/${draftSale.editPostId}`, editPayload);
    
                if (response.data.success) {
                    emitter.emit('refresh_active_posts');
                    showMessage({
                        type: "success", 
                        message: "Succes!", 
                        description: response.data.message
                    });
                    setTimeout(() => setDraftSale(null), 300);
                    publishingRef.current = false;
                    setPublishing(false);
                    navigation.navigate('ProfileDrawer');
                } else {
                    throw new Error(response.data.message || "Eroare la actualizare.");
                }
            } catch (error) {
                publishingRef.current = false;
                setPublishing(false);
                Alert.alert("Eroare", error.message || "Eroare de conexiune la server.");
            }
        }
    };


    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Text style={styles.backText}>❮</Text> 
                </Pressable>

                <View style={styles.rightHeaderActions}>
                    {!isEditing && !isSummarySlide && (
                        <Pressable onPress={() => setIsEditing(true)} style={styles.iconButton}>
                            <Image source={assets.edit_icon} style={styles.editIcon} resizeMode="contain" />
                        </Pressable>
                    )}

                    {isEditing ? (
                        <Pressable style={[styles.postButton, { backgroundColor: '#28a745' }]} onPress={() => setIsEditing(false)}>
                            <Text style={styles.postButtonText}>Gata</Text>
                        </Pressable>
                    ) : (
                        <Pressable style={styles.postButton} onPress={handleApplyEdits} disabled={publishing}>
                            <Text style={styles.postButtonText}>Aplică Editările</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            <PreviewItem 
                item={draftSale} 
                isVisible={true} 
                onSlideChange={(index) => setCurrentSlideIndex(index)} 
                isEditing={isEditing}
            />

            {isEditing && !isSummarySlide && (
                <View style={styles.verticalSliderWrapper} pointerEvents="box-none">
                    <View style={styles.sliderBackground}>
                        <Text style={styles.sliderLabel}>+</Text>
                        <Slider
                            style={styles.rotatedSlider}
                            minimumValue={1}
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
                        <ActivityIndicator size="large" color="#FFFFFF" style={{marginBottom: 15}} />
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
        backgroundColor: '#081539',
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
        backgroundColor: 'rgba(0,0,0,0.85)', 
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
    }
});
