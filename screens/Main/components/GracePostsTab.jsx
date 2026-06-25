import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { assets } from '../../../assets.js';
import axiosAuthGuard from '../../../helpers/axiosAuthGuard.js';
import { showMessage } from 'react-native-flash-message';
import { emitter } from '../../../helpers/eventBus.js';
import { UI_SCALE } from '../../../helpers/layout.js';

import {Text, TextInput} from '../../../helpers/AppText.jsx';
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
};

export default function GracePostsTab({ headerComponent }) {

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);

    const [reactivateModalVisible, setReactivateModalVisible] = useState(false);
    const [reactivating, setReactivating] = useState(false);
    const [discountCodeInput, setDiscountCodeInput] = useState('');
    const [validatedCode, setValidatedCode] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [discountStatus, setDiscountStatus] = useState(null);
    const [validatingCode, setValidatingCode] = useState(false);

    const basePrice = 45;
    const finalPrice = discountPercentage > 0 ? basePrice - (basePrice * discountPercentage / 100) : basePrice;

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const res = await axiosAuthGuard.get(`/api/user/my-posts?type=grace`);
            if (res.data.success) {
                setPosts(res.data.data);
            }
        } catch (error) {
            setPosts([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchPosts();
    };

    const openOptions = (item) => {
        setSelectedPost(item);
        setOptionsVisible(true);
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
                                fetchPosts(); 
                                showMessage({ message: "Eroare", description: "Eroare la ștergere.", type: "danger" });
                            }
                        } catch (error) {
                            fetchPosts();
                            showMessage({ message: "Eroare", description: "Eroare de conexiune.", type: "danger" });
                        }
                    }
                }
            ]
        );
    };

    const handleReactivatePost = async () => {
        if(!selectedPost)
            return;
        setReactivating(true);
        try{
            const res = await axiosAuthGuard.post(`/api/sales/reactivate/${selectedPost._id}`);
            if(res.data.success){
                showMessage({
                    type: "success", 
                    message: "Succes!", 
                    description: "Anunțul a fost reactivat și va fi public în scurt timp."
                });
                emitter.emit('refresh_active_posts');
                setOptionsVisible(false);
                fetchPosts();
            }else{
                Alert.alert("Eroare", res.data.message || "Ceva nu a mers bine.");
            }
        } catch (error) {
            console.log("Reactivate Error:", error);
            Alert.alert("Eroare", "Nu s-a putut conecta la server.");
        } finally {
            setReactivating(false);
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


    const flatListData = useMemo(() => {
        let data = [];
        if (posts && posts.length > 0) {
            const expired = posts.filter(p => p.status === 'grace_period');

            if (expired.length > 0) {
                data.push({ _id: 'header_grace', isHeader: true, title: 'Anunțuri Inactive' }, ...expired);
            }
        }
        return data;
    }, [posts]);

    const renderItem = useCallback(({ item }) => {
        if (item.isHeader) {
            return (
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>{item.title}</Text>
                </View>
            );
        }

        const imageUrl = getPreviewImage(item.media);

        return (
            <View style={styles.cardContainer}>
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
            </View>
        );
    }, []);

    const ListEmpty = useMemo(() => {
        if (loading) {
            return <PostListSkeleton />;
        }
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nu ai niciun anunț inactiv.</Text>
            </View>
        );
    }, [loading]);

    return (
        <View style={styles.container}>
            <FlatList
                data={flatListData}
                keyExtractor={(item) => item._id.toString()}
                renderItem={renderItem}
                ListHeaderComponent={headerComponent}
                ListEmptyComponent={ListEmpty}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 50, flexGrow: 1 }}
                style={{ backgroundColor: COLORS.bg }}
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

                        <Pressable style={styles.optionButton} onPress={() => handleReactivatePost()}>
                            <Text style={[styles.optionText, { color: COLORS.success }]}>Activează anunțul (3 luni)</Text>
                        </Pressable>
                        <View style={styles.divider} />
                        <Pressable style={styles.optionButton} onPress={handleDeletePost}>
                            <Text style={[styles.optionText, { color: COLORS.danger }]}>Șterge anunțul</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            <Modal
                visible={reactivateModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setReactivateModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    style={styles.optionsModalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                </KeyboardAvoidingView>
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
    sectionHeader: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginTop: 5,
        marginBottom: 5,
    },
    sectionHeaderText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
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
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        width: '100%',
    },
    reactivateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    reactivateTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    closeText: {
        color: COLORS.accent,
        fontWeight: '600',
        fontSize: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
        marginLeft: 2,
    },
    discountRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        height: 50,
        paddingHorizontal: 15,
    },
    discountInput: {
        flex: 1,
        marginRight: 10,
    },
    inputText: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
    },
    applyButton: {
        backgroundColor: COLORS.primary,
        height: 50,
        paddingHorizontal: 20,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyButtonText: {
        color: COLORS.onAccent,
        fontSize: 14,
        fontWeight: 'bold',
    },
    discountStatusText: {
        fontSize: 13,
        marginTop: 5,
        marginLeft: 5,
        fontWeight: '500',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 25,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    totalPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    oldPrice: {
        fontSize: 14,
        color: COLORS.textMuted,
        textDecorationLine: 'line-through',
        marginRight: 8,
    },
    finalPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.accent,
    },
    lunarText: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginLeft: 4,
    },
    payButton: {
        marginTop: 25,
        backgroundColor: COLORS.success,
        height: 55,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    payButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    }
});