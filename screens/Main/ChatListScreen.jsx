import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    TextInput,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';
import { formatConversationTime } from '../../helpers/chatHelper.js';
import { emitter } from '../../helpers/eventBus.js';
import { Context } from '../../context/Context.js';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
    primary: '#800000',
    secondary: '#13161A',
    background: '#F5F5F5',
    white: '#FFFFFF',
    text: '#333333',
    border: '#E0E0E0',
    placeholder: '#999999',
    disabled: '#F0F0F0'
};

export default function ChatListScreen({ navigation }) {
    const { fetchUnreadChatCount, activeChatConversationRef } = useContext(Context);

    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef(null);

    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedConv, setSelectedConv] = useState(null);

    const fetchConversations = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await axiosAuthGuard.get('/api/chat/conversations');
            if (res.data.success) {
                setConversations(res.data.data.filter(c => c.last_message !== null));
            }
        } catch (err) {
            console.log('❌ Eroare fetch conversations:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchConversations();
            fetchUnreadChatCount();
        }, [])
    );

    /*const { activeChatTabRef } = useContext(Context);

    useFocusEffect(useCallback(() => {
        activeChatTabRef.current = true;
        return () => { activeChatTabRef.current = false; };
    }, []));*/

    useEffect(() => {
        const handleConversationUpdated = (data) => {
            if (activeChatConversationRef.current === data.conversationId) return;
            setConversations(prev => {
                const idx = prev.findIndex(c => c._id === data.conversationId);
                if (idx === -1) {
                    fetchConversations(true);
                    return prev;
                }
                const updated = [...prev];
                updated[idx] = {
                    ...updated[idx],
                    last_message: data.last_message,
                    last_message_type: data.last_message_type,
                    last_message_at: data.last_message_at,
                    unread_count: (updated[idx].unread_count || 0) + 1
                };
                return updated.sort((a, b) =>
                    new Date(b.last_message_at) - new Date(a.last_message_at)
                );
            });
        };

        emitter.on('socket_conversation_updated', handleConversationUpdated);
        return () => {
            emitter.off('socket_conversation_updated', handleConversationUpdated);
        };
    }, []);

    const handleSearch = (text) => {
        setSearchQuery(text);

        if (!text.trim()) {
            setIsSearching(false);
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        setSearchLoading(true);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await axiosAuthGuard.get(`/api/users/search?query=${encodeURIComponent(text.trim())}`);
                if (res.data.success) {
                    setSearchResults(res.data.data);
                }
            } catch (err) {
                console.log('❌ Eroare search:', err);
            } finally {
                setSearchLoading(false);
            }
        }, 400);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setIsSearching(false);
        setSearchResults([]);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };

    const openConversation = async (targetUserId, targetUsername, targetIcon) => {
        try {
            const res = await axiosAuthGuard.post('/api/chat/conversations', {
                targetUserId
            });

            if (res.data.success) {
                clearSearch();
                navigation.navigate('ChatScreen', {
                    conversationId: res.data.data._id,
                    participantName: targetUsername,
                    participantIcon: targetIcon,
                    participantId: targetUserId
                });
            }
        } catch (err) {
            Alert.alert('Eroare', 'Nu s-a putut deschide conversația.');
        }
    };

    const openMenu = (conv) => {
        setSelectedConv(conv);
        setMenuVisible(true);
    };

    const handleReport = () => {
        setMenuVisible(false);
        if (!selectedConv) return;
        Alert.alert(
            'Raportează utilizatorul',
            `Ești sigur că vrei să raportezi pe ${selectedConv.participant?.username}?`,
            [
                { text: 'Anulează', style: 'cancel' },
                {
                    text: 'Raportează',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await axiosAuthGuard.post('/api/report', {
                                target_id: selectedConv.participant?._id,
                                target_type: 'profile',
                                reason: 'Comportament inadecvat în chat'
                            });
                            Alert.alert('Mulțumim', 'Raportul a fost trimis.');
                        } catch (err) {
                            Alert.alert('Eroare', 'Nu s-a putut trimite raportul.');
                        }
                    }
                }
            ]
        );
    };

    const renderConversation = ({ item }) => {
        const hasUnread = item.unread_count > 0;

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.convItem,
                    pressed && { backgroundColor: '#F0F0F0' }
                ]}
                onPress={() => navigation.navigate('ChatScreen', {
                    conversationId: item._id,
                    participantName: item.participant?.username,
                    participantIcon: item.participant?.icon,
                    participantId: item.participant?._id
                })}
            >
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: item.participant?.icon }}
                        style={styles.avatar}
                    />
                </View>

                <View style={styles.convContent}>
                    <View style={styles.convTop}>
                        <Text style={[styles.convName, hasUnread && styles.convNameBold]} numberOfLines={1}>
                            {item.participant?.username || 'Utilizator'}
                        </Text>
                        <Text style={[styles.convTime, hasUnread && styles.convTimeBold]}>
                            {formatConversationTime(item.last_message_at)}
                        </Text>
                    </View>
                    <View style={styles.convBottom}>
                        <Text
                            style={[styles.convLastMessage, hasUnread && styles.convLastMessageBold]}
                            numberOfLines={1}
                        >
                            {item.last_message_type === 'image'
                                ? '📷 Imagine'
                                : item.last_message || 'Niciun mesaj încă'}
                        </Text>
                        {hasUnread && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadBadgeText}>
                                    {item.unread_count > 99 ? '99+' : item.unread_count}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <Pressable
                    style={styles.dotsButton}
                    onPress={() => openMenu(item)}
                    hitSlop={10}
                >
                    <Text style={styles.dotsText}>⋮</Text>
                </Pressable>
            </Pressable>
        );
    };

    const renderSearchResult = ({ item }) => (
        <Pressable
            style={({ pressed }) => [
                styles.searchResultItem,
                pressed && { backgroundColor: '#F0F0F0' }
            ]}
            onPress={() => openConversation(item._id, item.username, item.icon)}
        >
            <Image
                source={{ uri: item.icon }}
                style={styles.searchAvatar}
            />
            <Text style={styles.searchUsername}>{item.username}</Text>
        </Pressable>
    );

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyTitle}>Nicio conversație</Text>
                <Text style={styles.emptySubtitle}>
                    Caută un utilizator mai sus pentru a începe o conversație
                </Text>
            </View>
        );
    };

    return (
        <>
            <StatusBar
                barStyle="light-content"
                backgroundColor={COLORS.secondary}
            />

            {/* Safe area pentru status bar / notch pe iOS */}
            <SafeAreaView
                edges={['top']}
                style={{ backgroundColor: COLORS.secondary }}
            />

            {/* Restul aplicației */}
            <SafeAreaView
                style={styles.container}
                edges={['left', 'right', 'bottom']}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Mesaje</Text>
                </View>

                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Text style={styles.searchIcon}>🔍</Text>

                        <TextInput
                            style={styles.searchInput}
                            placeholder="Caută utilizatori..."
                            placeholderTextColor={COLORS.placeholder}
                            value={searchQuery}
                            onChangeText={handleSearch}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="search"
                        />

                        {searchQuery.length > 0 && (
                            <Pressable
                                onPress={clearSearch}
                                hitSlop={10}
                            >
                                <Text style={styles.clearButton}>✕</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {isSearching && (
                    <View style={styles.searchResultsContainer}>
                        {searchLoading ? (
                            <ActivityIndicator
                                color={COLORS.primary}
                                style={{ marginTop: 20 }}
                            />
                        ) : searchResults.length === 0 ? (
                            <Text style={styles.noResultsText}>
                                Niciun utilizator găsit
                            </Text>
                        ) : (
                            <FlatList
                                data={searchResults}
                                keyExtractor={item => item._id}
                                renderItem={renderSearchResult}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="on-drag"
                                ItemSeparatorComponent={() => (
                                    <View style={styles.separator} />
                                )}
                            />
                        )}
                    </View>
                )}

                {!isSearching && (
                    <>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator
                                    size="large"
                                    color={COLORS.primary}
                                />
                            </View>
                        ) : (
                            <FlatList
                                data={conversations}
                                keyExtractor={item => item._id}
                                renderItem={renderConversation}
                                ListEmptyComponent={renderEmpty}
                                onRefresh={() => {
                                    setRefreshing(true);
                                    fetchConversations();
                                }}
                                refreshing={refreshing}
                                ItemSeparatorComponent={() => (
                                    <View style={styles.separator} />
                                )}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={
                                    conversations.length === 0
                                        ? { flex: 1 }
                                        : undefined
                                }
                            />
                        )}
                    </>
                )}

                <Modal
                    visible={menuVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setMenuVisible(false)}
                >
                    <Pressable
                        style={styles.modalOverlay}
                        onPress={() => setMenuVisible(false)}
                    >
                        <View style={styles.menuContainer}>
                            <View style={styles.menuHeader}>
                                <Image
                                    source={{
                                        uri: selectedConv?.participant?.icon
                                    }}
                                    style={styles.menuAvatar}
                                />

                                <Text style={styles.menuUsername}>
                                    {selectedConv?.participant?.username}
                                </Text>
                            </View>

                            <View style={styles.menuDivider} />

                            <Pressable
                                style={({ pressed }) => [
                                    styles.menuItem,
                                    pressed && {
                                        backgroundColor: '#FFF5F5'
                                    }
                                ]}
                                onPress={handleReport}
                            >
                                <Text style={styles.menuItemIconReport}>
                                    ⚠️
                                </Text>

                                <Text style={styles.menuItemTextReport}>
                                    Raportează utilizatorul
                                </Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.menuItemCancel,
                                    pressed && {
                                        backgroundColor: '#F0F0F0'
                                    }
                                ]}
                                onPress={() => setMenuVisible(false)}
                            >
                                <Text style={styles.menuItemCancelText}>
                                    Anulează
                                </Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Modal>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingTop: 16,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    searchContainer: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.white,
        paddingVertical: 0,
    },
    clearButton: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        paddingLeft: 8,
    },
    searchResultsContainer: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.disabled,
        marginRight: 12,
    },
    searchUsername: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    noResultsText: {
        textAlign: 'center',
        marginTop: 30,
        color: COLORS.placeholder,
        fontSize: 15,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    convItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.disabled,
    },
    convContent: {
        flex: 1,
        marginRight: 8,
    },
    convTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    convName: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '400',
        flex: 1,
        marginRight: 8,
    },
    convNameBold: {
        fontWeight: '700',
        color: COLORS.secondary,
    },
    convTime: {
        fontSize: 12,
        color: COLORS.placeholder,
    },
    convTimeBold: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    convBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    convLastMessage: {
        fontSize: 14,
        color: COLORS.placeholder,
        flex: 1,
        marginRight: 8,
    },
    convLastMessageBold: {
        color: COLORS.text,
        fontWeight: '600',
    },
    unreadBadge: {
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    unreadBadgeText: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: 'bold',
    },
    dotsButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dotsText: {
        fontSize: 22,
        color: COLORS.placeholder,
        lineHeight: 24,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.border,
        marginLeft: 80,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIcon: {
        fontSize: 60,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.secondary,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.placeholder,
        textAlign: 'center',
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    menuContainer: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        paddingTop: 8,
    },
    menuHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    menuAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.disabled,
        marginRight: 12,
    },
    menuUsername: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.secondary,
    },
    menuDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: 20,
        marginBottom: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    menuItemIconReport: {
        fontSize: 20,
        marginRight: 14,
    },
    menuItemTextReport: {
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: '500',
    },
    menuItemCancel: {
        marginHorizontal: 16,
        marginTop: 8,
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    menuItemCancelText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
    },
});