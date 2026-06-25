import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Image,
    Modal,
    StatusBar,
    Platform,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
    SafeAreaView,
    Share,
    Linking
} from 'react-native';

import {Text, TextInput} from '../../helpers/AppText.jsx';
import ImageCropPicker from 'react-native-image-crop-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { assets } from '../../assets.js';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';
import { showMessage } from 'react-native-flash-message';

import ActivePostsTab from './components/ActivePostsTab.jsx';
import GracePostsTab from './components/GracePostsTab.jsx';
import LikedPostsTab from './components/LikedPostsTab.jsx';
import { Context } from '../../context/Context.js';
import PostListSkeleton from '../../helpers/skeletons/PostListSkeleton.jsx';
import Shimmer from '../../helpers/skeletons/Shimmer.jsx';

const COLORS = {
    primary: '#800000',
    accent: '#E0706C',
    header: '#13161A',
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

const DEFAULT_AVATAR = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

const HEADER_SHIMMER_BASE = 'rgba(255, 255, 255, 0.18)';
const HEADER_SHIMMER_HIGHLIGHT = 'rgba(255, 255, 255, 0.42)';

export default function ProfileScreen() {
    const navigation = useNavigation();
    const route = useRoute();

    const {url} = useContext(Context);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [actionSheetVisible, setActionSheetVisible] = useState(false);

    const [activeTab, setActiveTab] = useState('active');

    useEffect(() => {
        if (route.params?.initialTab) {
            setActiveTab(route.params.initialTab);
            navigation.setParams({ initialTab: undefined });
        }
    }, [route.params?.initialTab]);

    const [userData, setUserData] = useState({
        username: "",
        icon: DEFAULT_AVATAR,
        bio: "",
        phone_number: "",
        id: "",
    });

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editForm, setEditForm] = useState({ bio: '', phone_number: '' });

    const [imagePreview, setImagePreview] = useState(null);
    const [imageModalVisible, setImageModalVisible] = useState(false);

    const pendingActionRef = useRef(null);
    const actionFiredRef = useRef(false);

    const isDefaultAvatar = userData.icon === DEFAULT_AVATAR;

    useEffect(() => {
        fetchProfileData();
    }, []);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${url}/profile/${userData.id}`,
            });
        } catch (error) {
            console.log('Share error:', error);
        }
    };

    const fetchProfileData = async () => {
        try {
            const response = await axiosAuthGuard.get('/api/user/me');
            if (response.data.success) {
                const user = response.data.user;
                setUserData({
                    username: user.username,
                    icon: user.icon,
                    bio: user.metaData?.description || "",
                    phone_number: user.metaData?.phoneNumber || "",
                    id: user._id || "",
                });
            }
        } catch (error) {
            Alert.alert("Eroare", "Nu s-au putut încărca datele profilului.");
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        try {
            const image = await ImageCropPicker.openPicker({
                width: 800,
                height: 800,
                cropping: true,
                cropperCircleOverlay: true,
                mediaType: 'photo',
                forceJpg: true,
                compressImageQuality: 0.8,
                cropperToolbarTitle: 'Decupează poza',
                cropperActiveWidgetColor: '#800000',
                cropperStatusBarColor: '#13161A',
                cropperToolbarColor: '#13161A',
                cropperToolbarWidgetColor: '#FFFFFF',
            });

            if (image && image.path) {
                const normalizedPath = image.path.startsWith('file://') ? image.path : 'file://' + image.path;
                setImagePreview(normalizedPath);
                setImageModalVisible(true);
            }
        } catch (error) {
            if (error?.code === 'E_PICKER_CANCELLED') {
                return;
            }
            if ((error?.code || '').includes('PERMISSION')) {
                Alert.alert(
                    "Acces la poze necesar",
                    "Ca să-ți pui o poză de profil, trebuie să permiți accesul la poze. Deschide Setările și activează-l.",
                    [
                        { text: "Anulează", style: "cancel" },
                        { text: "Deschide Setările", onPress: () => Linking.openSettings() }
                    ]
                );
                return;
            }
            Alert.alert("Eroare", "Nu s-a putut selecta imaginea.");
        }
    };

    const handleUploadImage = async () => {
        if (!imagePreview) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', {
                uri: Platform.OS === 'ios' ? imagePreview.replace('file://', '') : imagePreview,
                type: 'image/jpeg',
                name: 'profile_avatar.jpg'
            });

            const response = await axiosAuthGuard.post('/api/user/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setUserData(prev => ({ ...prev, icon: response.data.newUrl }));
                setImageModalVisible(false);
                setImagePreview(null);
                showMessage({ message: "Succes", description: "Poză de profil actualizată!", type: "success" });
            }
        } catch (error) {
            const code = error?.response?.data?.code;
            const status = error?.response?.status;

            if (code === 'NUDITY_DETECTED') {
                Alert.alert("Imagine respinsă", "Imaginea pare să conțină nuditate. Te rugăm alege altă poză.");
            } else if (code === 'MODERATION_UNAVAILABLE' || status === 503) {
                Alert.alert("Indisponibil momentan", "Verificarea imaginii nu e disponibilă acum. Mai încearcă în câteva momente.");
            } else {
                Alert.alert("Eroare", "Nu s-a putut încărca imaginea.");
            }
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAvatar = () => {
        Alert.alert(
            "Șterge poza",
            "Sigur vrei să ștergi poza de profil?",
            [
                { text: "Anulează", style: "cancel" },
                {
                    text: "Șterge",
                    style: "destructive",
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            const response = await axiosAuthGuard.delete('/api/user/avatar');
                            if (response.data.success) {
                                setUserData(prev => ({ ...prev, icon: response.data.newUrl }));
                                showMessage({ message: "Succes", description: "Poza de profil a fost ștearsă.", type: "success" });
                            }
                        } catch (error) {
                            Alert.alert("Eroare", "Nu s-a putut șterge poza.");
                        } finally {
                            setDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    const fireAvatarAction = () => {
        if (actionFiredRef.current) return;
        const action = pendingActionRef.current;
        if (!action) return;
        actionFiredRef.current = true;
        pendingActionRef.current = null;
        if (action === 'pick') handlePickImage();
        else if (action === 'delete') handleDeleteAvatar();
    };

    useEffect(() => {
        if (!actionSheetVisible && pendingActionRef.current && !actionFiredRef.current) {
            const t = setTimeout(fireAvatarAction, Platform.OS === 'ios' ? 700 : 250);
            return () => clearTimeout(t);
        }
    }, [actionSheetVisible]);

    const openEditModal = () => {
        setEditForm({ bio: userData.bio, phone_number: userData.phone_number });
        setEditModalVisible(true);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const response = await axiosAuthGuard.put('/api/user/profile', {
                bio: editForm.bio,
                phone_number: editForm.phone_number
            });

            if (response.data.success) {
                setUserData(prev => ({ ...prev, bio: editForm.bio, phone_number: editForm.phone_number }));
                setEditModalVisible(false);
                showMessage({ message: "Succes", description: "Profil actualizat!", type: "success" });
            }
        } catch (error) {
            Alert.alert("Eroare", "Eroare la actualizare.");
        } finally {
            setSaving(false);
        }
    };

    const StaticHeader = useMemo(() => (
        <View style={styles.profileHeader}>
            <Pressable style={styles.shareButton} onPress={() => handleShare()}>
                <Image source={assets.share_icon} style={styles.topIcon} />
            </Pressable>

            <Pressable style={styles.settingsButton} onPress={() => navigation.openDrawer()}>
                <Image source={assets.settings_icon} style={styles.topIcon} />
            </Pressable>

            <Pressable onPress={() => setActionSheetVisible(true)} style={styles.avatarContainer}>
                <Image source={{ uri: userData.icon }} style={styles.avatar} />
                {deleting ? (
                    <View style={styles.avatarLoadingOverlay}>
                        <ActivityIndicator color={COLORS.white} />
                    </View>
                ) : (
                    <View style={styles.editAvatarBadge}>
                        <Text style={{ fontSize: 12 }}>📷</Text>
                    </View>
                )}
            </Pressable>

            <Text style={styles.username}>@{userData.username}</Text>

            <Pressable style={styles.infoRow} onPress={openEditModal}>
                <Text style={[styles.bioText, !userData.bio && { fontStyle: 'italic', opacity: 0.6 }]} numberOfLines={3}>
                    {userData.bio || "Adaugă o descriere scurtă..."}
                </Text>
                <Text style={styles.editEmoji}>✏️</Text>
            </Pressable>

            <Pressable style={styles.infoRow} onPress={openEditModal}>
                <Text style={[styles.phoneText, !userData.phone_number && { fontStyle: 'italic', opacity: 0.6 }]}>
                    📞 {userData.phone_number || "Adaugă număr de telefon"}
                </Text>
            </Pressable>

            <View style={styles.tabsContainer}>
                <Pressable
                    style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('active')}
                >
                    <Image
                        source={assets.grid_icon}
                        style={[styles.tabIcon, activeTab === 'active' ? styles.tabIconActive : styles.tabIconInactive]}
                    />
                </Pressable>
                <Pressable
                    style={[styles.tabButton, activeTab === 'grace' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('grace')}
                >
                    <Image
                        source={assets.grid_clock_icon}
                        style={[styles.tabIcon, activeTab === 'grace' ? styles.tabIconActive : styles.tabIconInactive]}
                    />
                </Pressable>
                <Pressable
                    style={[styles.tabButton, activeTab === 'liked' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('liked')}
                >
                    <Image
                        source={assets.like_icon}
                        style={[styles.tabIcon, activeTab === 'liked' ? styles.tabIconActive : styles.tabIconInactive]}
                    />
                </Pressable>
            </View>
        </View>
    ), [userData, activeTab, deleting]);

    const renderHeaderSkeleton = () => (
        <View style={styles.profileHeader}>
            <View style={styles.shareButton}>
                <Shimmer width={24} height={24} borderRadius={6} baseColor={HEADER_SHIMMER_BASE} highlightColor={HEADER_SHIMMER_HIGHLIGHT} />
            </View>

            <View style={styles.settingsButton}>
                <Shimmer width={24} height={24} borderRadius={6} baseColor={HEADER_SHIMMER_BASE} highlightColor={HEADER_SHIMMER_HIGHLIGHT} />
            </View>

            <View style={styles.avatarContainer}>
                <Shimmer width="100%" height="100%" borderRadius={40} baseColor={HEADER_SHIMMER_BASE} highlightColor={HEADER_SHIMMER_HIGHLIGHT} />
            </View>

            <Shimmer
                width={150}
                height={22}
                borderRadius={6}
                baseColor={HEADER_SHIMMER_BASE}
                highlightColor={HEADER_SHIMMER_HIGHLIGHT}
                style={{ marginBottom: 15 }}
            />

            <View style={styles.infoRow}>
                <Shimmer
                    width={210}
                    height={14}
                    borderRadius={5}
                    baseColor={HEADER_SHIMMER_BASE}
                    highlightColor={HEADER_SHIMMER_HIGHLIGHT}
                />
            </View>

            <View style={styles.infoRow}>
                <Shimmer
                    width={150}
                    height={14}
                    borderRadius={5}
                    baseColor={HEADER_SHIMMER_BASE}
                    highlightColor={HEADER_SHIMMER_HIGHLIGHT}
                />
            </View>

            <View style={styles.tabsContainer}>
                <View style={styles.tabButton}>
                    <Shimmer width={22} height={22} borderRadius={6} baseColor={HEADER_SHIMMER_BASE} highlightColor={HEADER_SHIMMER_HIGHLIGHT} />
                </View>
                <View style={styles.tabButton}>
                    <Shimmer width={22} height={22} borderRadius={6} baseColor={HEADER_SHIMMER_BASE} highlightColor={HEADER_SHIMMER_HIGHLIGHT} />
                </View>
                <View style={styles.tabButton}>
                    <Shimmer width={22} height={22} borderRadius={6} baseColor={HEADER_SHIMMER_BASE} highlightColor={HEADER_SHIMMER_HIGHLIGHT} />
                </View>
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#13161A" />
                {renderHeaderSkeleton()}
                <View style={{ flex: 1, backgroundColor: COLORS.bg, paddingTop: 10 }}>
                    <PostListSkeleton />
                </View>
            </SafeAreaView>
        );
    }

    return (

        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#13161A" />

            {StaticHeader}

            <View style={{ flex: 1, backgroundColor: COLORS.bg, paddingTop: 10, }}>
                <View style={{ flex: activeTab === 'active' ? 1 : 0, display: activeTab === 'active' ? 'flex' : 'none' }}>
                    <ActivePostsTab />
                </View>

                <View style={{ flex: activeTab === 'grace' ? 1 : 0, display: activeTab === 'grace' ? 'flex' : 'none' }}>
                    <GracePostsTab />
                </View>

                <View style={{ flex: activeTab === 'liked' ? 1 : 0, display: activeTab === 'liked' ? 'flex' : 'none' }}>
                    <LikedPostsTab />
                </View>
            </View>

            <Modal
                visible={actionSheetVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setActionSheetVisible(false)}
                onDismiss={fireAvatarAction}
            >
                <Pressable style={styles.sheetOverlay} onPress={() => setActionSheetVisible(false)}>
                    <Pressable style={styles.sheetContainer} onPress={() => {}}>
                        <View style={styles.sheetHandle} />
                        <Pressable
                            style={styles.sheetOption}
                            onPress={() => {
                                pendingActionRef.current = 'pick';
                                actionFiredRef.current = false;
                                setActionSheetVisible(false);
                            }}
                        >
                            <Text style={styles.sheetOptionText}>Actualizează poza</Text>
                        </Pressable>

                        {!isDefaultAvatar && (
                            <Pressable
                                style={styles.sheetOption}
                                onPress={() => {
                                    pendingActionRef.current = 'delete';
                                    actionFiredRef.current = false;
                                    setActionSheetVisible(false);
                                }}
                            >
                                <Text style={[styles.sheetOptionText, styles.sheetOptionDanger]}>Șterge poza</Text>
                            </Pressable>
                        )}

                        <Pressable style={[styles.sheetOption, styles.sheetCancel]} onPress={() => setActionSheetVisible(false)}>
                            <Text style={styles.sheetCancelText}>Anulează</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={imageModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Previzualizare Poză</Text>
                        {imagePreview && <Image source={{ uri: imagePreview }} style={styles.previewImage} />}
                        <View style={styles.modalActions}>
                            <Pressable
                                style={[styles.modalButton, { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderStrong }]}
                                onPress={() => { if (!uploading) setImageModalVisible(false) }}
                                disabled={uploading}
                            >
                                <Text style={styles.buttonTextDark}>Anulează</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, { backgroundColor: COLORS.primary, opacity: uploading ? 0.7 : 1 }]}
                                onPress={handleUploadImage}
                                disabled={uploading}
                            >
                                {uploading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.buttonTextLight}>Salvează</Text>}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={editModalVisible} transparent={true} animationType="slide">
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContainer}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={[styles.modalContent, { paddingBottom: 40 }]}>
                            <Text style={styles.modalTitle}>Editează Profilul</Text>

                            <Text style={styles.label}>Descriere (Bio)</Text>
                            <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                placeholder="Spune ceva despre tine..."
                                placeholderTextColor={COLORS.placeholder}
                                multiline={true}
                                maxLength={70}
                                value={editForm.bio}
                                onChangeText={(text) => {
                                    const lines = text.split('\n');
                                    if (lines.length <= 3) {
                                        setEditForm(prev => ({ ...prev, bio: text }));
                                    }
                                }}
                            />

                            <Text style={styles.label}>Număr de telefon</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: 07xxxxxxxx"
                                placeholderTextColor={COLORS.placeholder}
                                keyboardType="phone-pad"
                                maxLength={15}
                                value={editForm.phone_number}
                                onChangeText={(text) => setEditForm(prev => ({ ...prev, phone_number: text }))}
                            />

                            <View style={styles.modalActions}>
                                <Pressable
                                    style={[styles.modalButton, { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderStrong }]}
                                    onPress={() => { if (!saving) setEditModalVisible(false) }}
                                    disabled={saving}
                                >
                                    <Text style={styles.buttonTextDark}>Anulează</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.modalButton, { backgroundColor: COLORS.primary, opacity: saving ? 0.7 : 1 }]}
                                    onPress={handleSaveProfile}
                                    disabled={saving}
                                >
                                    {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.buttonTextLight}>Salvează</Text>}
                                </Pressable>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.header,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, 
    },
    profileHeader: {
        backgroundColor: COLORS.header,
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 20 : 10,
        paddingBottom: 0,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 8,
        zIndex: 10,
    },
    shareButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 15 : 10,
        left: 20,
        padding: 8,
        zIndex: 15
    },
    settingsButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 15 : 10,
        right: 20,
        padding: 8,
        zIndex: 15
    },
    topIcon: {
        width: 24,
        height: 24,
        tintColor: 'white',
        resizeMode: 'contain'
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        backgroundColor: '#CCC',
        marginTop: 15,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 40
    },
    avatarLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 40,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editAvatarBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: COLORS.white,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },
    username: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        letterSpacing: 0.5
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        paddingHorizontal: 30
    },
    bioText: {
        color: '#DDDDDD',
        fontSize: 14,
        textAlign: 'center',
        marginRight: 6
    },
    phoneText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '500',
        marginRight: 6
    },
    editEmoji: {
        fontSize: 14,
        opacity: 0.8
    },
    tabsContainer: {
        flexDirection: 'row',
        width: '100%',
        marginTop: 20,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabButtonActive: {
        borderBottomColor: COLORS.white,
    },
    tabIcon: {
        width: 22,
        height: 22,
        resizeMode: 'contain',
    },
    tabIconActive: {
        tintColor: COLORS.white,
        opacity: 1,
    },
    tabIconInactive: {
        tintColor: COLORS.white,
        opacity: 0.4,
    },
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        backgroundColor: COLORS.sheet,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        paddingHorizontal: 16,
    },
    sheetHandle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.borderStrong,
        marginBottom: 12,
    },
    sheetOption: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    sheetOptionText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    sheetOptionDanger: {
        color: COLORS.accent,
    },
    sheetCancel: {
        marginTop: 8,
        backgroundColor: COLORS.surface,
    },
    sheetCancelText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        backgroundColor: COLORS.sheet,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 20,
    },
    previewImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: COLORS.borderStrong,
    },
    label: {
        alignSelf: 'flex-start',
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 5,
        marginLeft: 5,
    },
    input: {
        width: '100%',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 15,
        color: COLORS.text,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 10,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    buttonTextDark: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 15,
    },
    buttonTextLight: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    }
});