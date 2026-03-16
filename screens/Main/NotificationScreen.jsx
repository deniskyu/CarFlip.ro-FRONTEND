import React, { useState, useContext, useCallback, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Pressable, 
    FlatList, 
    Image, 
    ActivityIndicator, 
    Modal,
    SafeAreaView,
    StatusBar,
    Platform,
    SectionList
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';
import { Context } from '../../context/Context.js';
import { assets } from '../../assets.js';
import { showMessage } from 'react-native-flash-message';
import AlertFilterModal from './components/AlertFilterModal.jsx'; 
import { navigate } from '../../helpers/NavigationService.js'; 
import { emitter } from '../../helpers/eventBus.js'; 
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const COLORS = {
    primary: '#800000',
    secondary: '#081539',
    blue: '#007AFF', 
    background: '#F5F5F5',
    white: '#FFFFFF',
    text: '#333333',
    border: '#E0E0E0',
    placeholder: '#999999'
};

const timeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} sec`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ore`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} zile`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} săpt`;
    return `${Math.floor(diffInDays / 30)} luni`;
};

export default function NotificationScreen() {
    const navigation = useNavigation();
    const { url } = useContext(Context);

    const [activeTab, setActiveTab] = useState('notifications');

    const { setUnreadCount, unreadChatCount } = useContext(Context);

    const checkNotificationPermission = async () => {
        const permission = Platform.OS === 'ios' 
            ? PERMISSIONS.IOS.NOTIFICATIONS 
            : PERMISSIONS.ANDROID.POST_NOTIFICATIONS;
    
        const status = await check(permission);
    
        if (status === RESULTS.DENIED) {
            // Nu a fost cerut niciodată — afișăm popup-ul sistemului
            await request(permission);
        } else if (status === RESULTS.BLOCKED) {
            // Userul a refuzat anterior — nu putem arăta popup-ul din nou
            // Îl direcționăm la Settings
            Alert.alert(
                "Notificări dezactivate",
                "Pentru a primi notificări despre mesaje, comentarii și alerte, activează notificările din setările telefonului.",
                [
                    { text: "Anulează", style: "cancel" },
                    { text: "Deschide Setări", onPress: () => Linking.openSettings() }
                ]
            );
        }
        // RESULTS.GRANTED → totul e OK, nu facem nimic
    };

    useFocusEffect(
        useCallback(() => {
            checkNotificationPermission();
        }, [])
    );

    useFocusEffect(
        useCallback(() => {
            if (activeTab === 'notifications') {
                fetchNotifications(1);
                return () => {
                    setUnreadCount(0);
                    axiosAuthGuard.put('/api/notifications/all/read').catch(() => {});
                    if (Platform.OS === 'ios') {
                        PushNotificationIOS.setApplicationIconBadgeNumber(unreadChatCount);
                    }
                };
            }
        }, [activeTab, unreadChatCount])
    );

    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [alertModalVisible, setAlertModalVisible] = useState(false);
    const [currentAlertData, setCurrentAlertData] = useState(null);

    const [optionsVisible, setOptionsVisible] = useState(false);
    const [selectedAlertId, setSelectedAlertId] = useState(null);

    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(true);
    const [notificationsRefreshing, setNotificationsRefreshing] = useState(false);
    const [notificationsPage, setNotificationsPage] = useState(1);
    const [notificationsHasMore, setNotificationsHasMore] = useState(true);
    const [isFetchingMoreNotes, setIsFetchingMoreNotes] = useState(false);
    const isFetchingMoreNotesRef = useRef(false);
    useFocusEffect(
        useCallback(() => {
            if (activeTab === 'alerts') {
                fetchAlerts();
            }
        }, [activeTab])
    );

    const fetchAlerts = async () => {
        try {
            const response = await axiosAuthGuard.get('/api/alerts');
            if (response.data.success) {
                setAlerts(response.data.data);
            }
        } catch (error) {
            console.error("Eroare la obținerea alertelor:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAlerts();
    };

    const handleDeleteAlert = async () => {
        if (!selectedAlertId) return;
        setOptionsVisible(false);
        
        try {
            const response = await axiosAuthGuard.delete(`/api/alerts/${selectedAlertId}`);
            if (response.data.success) {
                setAlerts(prev => prev.filter(alert => alert._id !== selectedAlertId));
                showMessage({ message: "Succes", description: "Căutarea a fost ștearsă.", type: "success" });
            }
        } catch (error) {
            showMessage({ message: "Eroare", description: "Nu am putut șterge alerta.", type: "danger" });
        } finally {
            setSelectedAlertId(null);
        }
    };

    const openOptions = (id) => {
        setSelectedAlertId(id);
        setOptionsVisible(true);
    };

    const formatPrice = (num) => new Intl.NumberFormat('de-DE').format(num);

    const generateAlertSummary = (item) => {
        let details = [];
        if (item.model && item.model.name) details.push(item.model.name);
        
        if (item.engine_capacity) details.push(item.engine_capacity);
        if (item.fuel_type) details.push(item.fuel_type);
        
        let yearText = '';
        if (item.min_year && item.max_year) yearText = `${item.min_year}-${item.max_year}`;
        else if (item.min_year) yearText = `Min ${item.min_year}`;
        else if (item.max_year) yearText = `Max ${item.max_year}`;
        if (yearText) details.push(yearText);

        let priceText = '';
        if (item.min_price && item.max_price) priceText = `${formatPrice(item.min_price)} - ${formatPrice(item.max_price)} €`;
        else if (item.min_price) priceText = `Min ${formatPrice(item.min_price)} €`;
        else if (item.max_price) priceText = `Max ${formatPrice(item.max_price)} €`;
        if (priceText) details.push(priceText);

        if (item.city) details.push(item.city);
        else if (item.county) details.push(item.county);
        if (item.transmission) details.push(item.transmission);
        if (item.body_type) details.push(item.body_type);

        if (details.length === 0) return "Orice model, orice preț";
        return details.join(' • ');
    };

    const renderAlertItem = ({ item }) => (
        <Pressable 
            style={styles.alertCard} 
            onPress={() => {
                setCurrentAlertData(item); 
                setAlertModalVisible(true); 
            }}
        >
            <View style={styles.brandIconContainer}>
                <Image 
                    source={assets.bell_icon} 
                    style={styles.brandBellIcon} 
                    resizeMode="contain" 
                />
            </View>
            <View style={styles.alertContent}>
                <Text style={styles.alertBrandName}>{item.brand?.name || 'Marcă Necunoscută'}</Text>
                <Text style={styles.alertSummaryText} numberOfLines={2}>
                    {generateAlertSummary(item)}
                </Text>
            </View>
            <Pressable style={styles.dotsButton} onPress={() => openOptions(item._id)} hitSlop={15}>
                <Text style={styles.dotsText}>⋮</Text> 
            </Pressable>
        </Pressable>
    );

    useEffect(() => {

        const handleLiveNotification = () => {
            fetchNotifications(1, true);
        };

        emitter.on('new_foreground_notification', handleLiveNotification);

        return () => {
            emitter.off('new_foreground_notification', handleLiveNotification);
        };
    }, []);

    const groupNotifications = (notifsArray) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        const todayList = [];
        const pastList = [];

        notifsArray.forEach(notif => {
            const notifDate = new Date(notif.createdAt);
            if (notifDate >= today) {
                todayList.push(notif);
            } else {
                pastList.push(notif);
            }
        });

        const sections = [];
        if (todayList.length > 0) sections.push({ title: 'Astăzi', data: todayList });
        if (pastList.length > 0) sections.push({ title: 'În trecut', data: pastList });

        return sections;
    };

    const fetchNotifications = async (pageToFetch = 1, isRefresh = false) => {
        try {
            if (pageToFetch === 1) {
                if (!isRefresh) setNotificationsLoading(true);
            } else {
                setIsFetchingMoreNotes(true);
            }

            const response = await axiosAuthGuard.get(`/api/notifications?page=${pageToFetch}&limit=15`);
            
            if (response.data.success) {
                const newData = response.data.data;
                
                setNotifications(prevData => {
                    return pageToFetch === 1 ? newData : [...prevData, ...newData];
                });
                
                setNotificationsHasMore(response.data.hasMore);
                setNotificationsPage(pageToFetch);
            }
        } catch (error) {
            console.error("Eroare la obținerea notificărilor:", error);
        } finally {
            setNotificationsLoading(false);
            setNotificationsRefreshing(false);
            setIsFetchingMoreNotes(false);
            isFetchingMoreNotesRef.current = false;
        }
    };

    const handleNotificationsRefresh = () => {
        setNotificationsRefreshing(true);
        fetchNotifications(1, true);
    };

    const handleNotificationsLoadMore = () => {
        if (isFetchingMoreNotesRef.current || !notificationsHasMore) return;
        isFetchingMoreNotesRef.current = true;
        setIsFetchingMoreNotes(true);
        fetchNotifications(notificationsPage + 1, false);
    };

    const handleNotificationPress = async (item) => {
        if (!item.is_read) {
            setNotifications(prevData => 
                prevData.map(n => n._id === item._id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            axiosAuthGuard.put(`/api/notifications/${item._id}/read`).catch(err => console.log(err));
        }

        if (item.sale_id) {
            navigate('HomeTab', {
                screen: 'MainScreen',
                params: {
                    saleId: item.sale_id,
                    commentId: item.comment_id || null
                }
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="white" />
            
            <View style={styles.headerTabs}>

                <Pressable 
                    style={[styles.tabButton, activeTab === 'notifications' && styles.activeTabButton]} 
                    onPress={() => setActiveTab('notifications')}
                >
                    <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>Notificări</Text>
                </Pressable>


                <Pressable 
                    style={[styles.tabButton, activeTab === 'alerts' && styles.activeTabButton]} 
                    onPress={() => setActiveTab('alerts')}
                >
                    <Text style={[styles.tabText, activeTab === 'alerts' && styles.activeTabText]}>Căutări salvate</Text>
                </Pressable>
                
            </View>

            {activeTab === 'alerts' ? (
                <View style={styles.tabContent}>
                    <View style={styles.addButtonContainer}>
                        <Pressable 
                            style={styles.addAlertButton} 
                            onPress={() => {
                                setCurrentAlertData(null); 
                                setAlertModalVisible(true); 
                            }}
                        >
                            <Text style={styles.addAlertButtonText}>+ Adaugă o căutare</Text>
                        </Pressable>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
                    ) : alerts.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                            <Text style={styles.emptyStateText}>
                                Rămâi la curent când apar anunțuri cu autoturisme pe placul tău.
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={alerts}
                            keyExtractor={(item) => item._id}
                            renderItem={renderAlertItem}
                            contentContainerStyle={styles.listContent}
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            ) : (
                <View style={styles.tabContent}>
                    {notificationsLoading ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
                    ) : notifications.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                            <Text style={styles.emptyStateText}>
                                Nu ai nicio notificare în acest moment.
                            </Text>
                        </View>
                    ) : (
                        <SectionList
                            sections={groupNotifications(notifications)}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={styles.listContent}
                            refreshing={notificationsRefreshing}
                            onRefresh={handleNotificationsRefresh}
                            onEndReached={handleNotificationsLoadMore}
                            onEndReachedThreshold={0.5}
                            showsVerticalScrollIndicator={false}
                            renderSectionHeader={({ section: { title } }) => (
                                <Text style={styles.sectionTitle}>{title}</Text>
                            )}
                            ListFooterComponent={() => 
                                isFetchingMoreNotes ? <ActivityIndicator size="small" color={COLORS.primary} style={{marginVertical: 20}} /> : null
                            }
                            renderItem={({ item }) => {
                                let iconSource = item.sender_image ? { uri: item.sender_image } : assets.default_profile;
                                if (item.type === 'SAVED_SEARCH_MATCH') {
                                    iconSource = assets.bell_icon; 
                                }

                                return (
                                    <Pressable 
                                        style={({ pressed }) => [
                                            styles.notificationCard,
                                            !item.is_read && styles.unreadNotificationCard,
                                            pressed && styles.pressedNotificationCard
                                        ]}
                                        onPress={() => handleNotificationPress(item)}
                                    >
                                        <View style={styles.notifImageContainer}>
                                            <Image 
                                                source={iconSource} 
                                                style={[
                                                    styles.notifImage, 
                                                    item.type === 'SAVED_SEARCH_MATCH' && { tintColor: COLORS.primary, width: '60%', height: '60%' }
                                                ]} 
                                                resizeMode={item.type === 'SAVED_SEARCH_MATCH' ? 'contain' : 'cover'}
                                            />
                                        </View>
                                        
                                        <View style={styles.notifContent}>
                                            <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
                                            <Text style={styles.notifBody} numberOfLines={2}>
                                                {item.body} <Text style={styles.notifTime}> • {timeAgo(item.createdAt)}</Text>
                                            </Text>
                                        </View>

                                        {!item.is_read && <View style={styles.unreadDot} />}
                                    </Pressable>
                                );
                            }}
                        />
                    )}
                </View>
            )}

            <Modal
                animationType="fade"
                transparent={true}
                visible={optionsVisible}
                onRequestClose={() => setOptionsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setOptionsVisible(false)} />
                    <View style={styles.bottomSheet}>
                        <View style={styles.handleBar} />
                        
                        <Pressable style={styles.bottomSheetOption} onPress={handleDeleteAlert}>
                            <Text style={styles.deleteText}>Șterge alerta</Text>
                        </Pressable>

                        <Pressable style={[styles.bottomSheetOption, { borderBottomWidth: 0 }]} onPress={() => setOptionsVisible(false)}>
                            <Text style={styles.cancelText}>Anulează</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <AlertFilterModal 
                visible={alertModalVisible} 
                onClose={() => setAlertModalVisible(false)} 
                alertData={currentAlertData} 
                onSaveSuccess={handleRefresh} 
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    headerTabs: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    activeTabButton: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#888',
    },
    activeTabText: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    tabContent: {
        flex: 1,
    },
    addButtonContainer: {
        padding: 20,
        backgroundColor: COLORS.background,
    },
    addAlertButton: {
        backgroundColor: COLORS.secondary, 
        width: '100%',
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.secondary, 
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    addAlertButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 50, 
    },
    emptyStateText: {
        fontSize: 16,
        color: '#777',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    alertCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 15,
        marginBottom: 15,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    brandIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#f8e6e6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        overflow: 'hidden',
    },
    brandBellIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.primary,
        opacity: 0.9,
    },
    alertContent: {
        flex: 1,
        justifyContent: 'center',
    },
    alertBrandName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.secondary,
        marginBottom: 4,
    },
    alertSummaryText: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    dotsButton: {
        padding: 10,
        marginLeft: 10,
    },
    dotsText: {
        fontSize: 22,
        color: '#888',
        fontWeight: 'bold',
        marginTop: -8, 
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    bottomSheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
    },
    handleBar: {
        width: 40,
        height: 5,
        backgroundColor: '#DDDDDD',
        borderRadius: 3,
        marginBottom: 20,
    },
    bottomSheetOption: {
        width: '100%',
        paddingVertical: 18,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    deleteText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#D32F2F', 
    },
    cancelText: {
        fontSize: 16,
        color: '#555',
        fontWeight: '600',
    },

    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: COLORS.secondary,
        marginTop: 15,
        marginBottom: 10,
        backgroundColor: COLORS.background, 
        paddingVertical: 5
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    unreadNotificationCard: {
        backgroundColor: '#E8F0FE', 
    },
    pressedNotificationCard: {
        opacity: 0.7,
        backgroundColor: '#EAEAEA', 
    },
    notifImageContainer: {
        width: 46,
        height: 46,
        borderRadius: 23,
        marginRight: 14,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        overflow: 'hidden',
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',  
    },
    notifImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    notifContent: {
        flex: 1,
        justifyContent: 'center',
    },
    notifTitle: {
        fontSize: 14.5,
        fontWeight: 'bold',
        color: COLORS.secondary,
        marginBottom: 4,
    },
    notifBody: {
        fontSize: 13,
        color: '#444',
        lineHeight: 18,
    },
    notifTime: {
        color: '#999',
        fontSize: 12,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.blue, 
        marginLeft: 10,
    }
});