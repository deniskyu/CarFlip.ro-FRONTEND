import React, { useState, useEffect, useCallback, useContext, useRef, useMemo } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Pressable,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    StatusBar,
    useWindowDimensions,
} from 'react-native';

import {Text, TextInput} from '../../helpers/AppText.jsx';
import { useFocusEffect } from '@react-navigation/native';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';
import { formatConversationTime } from '../../helpers/chatHelper.js';
import { emitter } from '../../helpers/eventBus.js';
import { Context } from '../../context/Context.js';
import { SafeAreaView } from 'react-native-safe-area-context';
import Shimmer from '../../helpers/skeletons/Shimmer.jsx';
import { assets } from '../../assets.js';

import {
    applyConversationUpdate,
    clearConversationUnread,
    sortConversationsDesc,
    clampUnread,
    idOf,
} from '../../helpers/chatLogic.js';

import {
    s,
    vs,
    f,
    textBlock,
    metaText,
    CONTENT_MAX_WIDTH,
    AVATAR_LIST,
    LIST_ROW_HEIGHT,
    HIT_SLOP,
} from '../../helpers/chatMetrics.js';

const COLORS = {
    primary: '#800000',
    accent: '#E0706C',
    secondary: '#13161A',
    bg: '#1B1F26',
    surface: '#262B33',
    sheet: '#2D333C',
    border: '#2F353E',
    borderStrong: '#3A414B',
    onAccent: '#FFFFFF',
    white: '#FFFFFF',
    text: '#E6E8EB',
    placeholder: '#9AA0A8',
    pressedBg: '#30363F',
    accentSurface: '#3A2526',
};

const SK_BASE = '#32383F';
const SK_HIGH = '#3C424B';

const SEARCH_DEBOUNCE = 400;
const REFETCH_THROTTLE = 4000;

const SKELETON_ROW_WIDTHS = [
    { name: '52%', msg: '80%' },
    { name: '40%', msg: '66%' },
    { name: '61%', msg: '86%' },
    { name: '46%', msg: '73%' },
    { name: '55%', msg: '60%' },
    { name: '37%', msg: '82%' },
];

function ConversationListSkeleton() {
    const { height } = useWindowDimensions();
    const rowHeight = LIST_ROW_HEIGHT > 0 ? LIST_ROW_HEIGHT : 76;
    const count = Math.min(20, Math.max(6, Math.ceil(height / rowHeight) + 1));

    return (
        <View style={styles.skeletonList} pointerEvents="none">
            {Array.from({ length: count }).map((_, i) => {
                const w = SKELETON_ROW_WIDTHS[i % SKELETON_ROW_WIDTHS.length];
                return (
                    <View key={i}>
                        <View style={styles.convItem}>
                            <View style={styles.avatarContainer}>
                                <Shimmer width={AVATAR_LIST} height={AVATAR_LIST} borderRadius={AVATAR_LIST / 2} baseColor={SK_BASE} highlightColor={SK_HIGH} />
                            </View>

                            <View style={styles.convContent}>
                                <View style={styles.convTop}>
                                    <Shimmer width={w.name} height={vs(14)} borderRadius={6} baseColor={SK_BASE} highlightColor={SK_HIGH} />
                                    <Shimmer width={s(38)} height={vs(11)} borderRadius={5} baseColor={SK_BASE} highlightColor={SK_HIGH} />
                                </View>
                                <View style={styles.convBottom}>
                                    <Shimmer width={w.msg} height={vs(12)} borderRadius={5} baseColor={SK_BASE} highlightColor={SK_HIGH} />
                                </View>
                            </View>
                        </View>
                        {i < count - 1 && <View style={styles.separator} />}
                    </View>
                );
            })}
        </View>
    );
}

export default function ChatListScreen({ navigation }) {
    const {
        fetchUnreadChatCount,
        activeChatConversationRef,
        setUnreadChatCount,
        userId,
    } = useContext(Context);

    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedConv, setSelectedConv] = useState(null);
    const [openingConversation, setOpeningConversation] = useState(false);

    const mountedRef = useRef(true);
    const searchTimeout = useRef(null);
    const searchRequestIdRef = useRef(0);
    const inFlightRef = useRef(false);
    const lastFetchAtRef = useRef(0);
    const currentUserIdRef = useRef(userId || null);
    const openingRef = useRef(false);
    const conversationsRef = useRef([]);

    useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

    useEffect(() => { currentUserIdRef.current = userId || null; }, [userId]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
                searchTimeout.current = null;
            }
        };
    }, []);

    const fetchConversations = useCallback(async (silent) => {
        if (inFlightRef.current) {
            if (mountedRef.current) setRefreshing(false);
            return;
        }
        inFlightRef.current = true;
        if (!silent && mountedRef.current) setLoading(true);

        try {
            const res = await axiosAuthGuard.get('/api/chat/conversations');
            if (!mountedRef.current) return;
            if (res?.data?.success) {
                const list = Array.isArray(res.data.data) ? res.data.data : [];
                const cleaned = list
                    .filter((c) => c && idOf(c) !== null && c.last_message !== null && c.last_message !== undefined)
                    .map((c) => Object.assign({}, c, { unread_count: clampUnread(c.unread_count) }));
                setConversations(sortConversationsDesc(cleaned));
            }
            lastFetchAtRef.current = Date.now();
        } catch (err) {
        } finally {
            inFlightRef.current = false;
            if (mountedRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchConversations(false);
            if (typeof fetchUnreadChatCount === 'function') fetchUnreadChatCount();
            return undefined;
        }, [fetchConversations, fetchUnreadChatCount])
    );

    useEffect(() => {
        const handleConversationUpdated = (data) => {
            if (!mountedRef.current || !data) return;

            const conversationId = idOf(data.conversationId);
            const known = conversationId !== null
                && conversationsRef.current.some((c) => idOf(c) === conversationId);

            if (known) {
                setConversations((prev) => applyConversationUpdate(prev, data, {
                    currentUserId: currentUserIdRef.current,
                    activeConversationId: activeChatConversationRef ? activeChatConversationRef.current : null,
                }).list);
            }

            if (!known) {
                const now = Date.now();
                if (now - lastFetchAtRef.current > REFETCH_THROTTLE) {
                    lastFetchAtRef.current = now;
                    fetchConversations(true);
                }
            }
        };

        const handleUnreadTotal = (data) => {
            if (!mountedRef.current || !data) return;
            if (typeof data.total === 'number' && typeof setUnreadChatCount === 'function') {
                setUnreadChatCount(clampUnread(data.total));
            }
        };

        emitter.on('socket_conversation_updated', handleConversationUpdated);
        emitter.on('socket_unread_count_updated', handleUnreadTotal);
        return () => {
            emitter.off('socket_conversation_updated', handleConversationUpdated);
            emitter.off('socket_unread_count_updated', handleUnreadTotal);
        };
    }, [fetchConversations, activeChatConversationRef, setUnreadChatCount]);

    const handleSearch = useCallback((value) => {
        setSearchQuery(value);

        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
            searchTimeout.current = null;
        }

        const trimmed = value.trim();

        if (!trimmed) {
            searchRequestIdRef.current += 1;
            setIsSearching(false);
            setSearchLoading(false);
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        setSearchLoading(true);

        const requestId = searchRequestIdRef.current + 1;
        searchRequestIdRef.current = requestId;

        searchTimeout.current = setTimeout(async () => {
            searchTimeout.current = null;
            try {
                const res = await axiosAuthGuard.get(`/api/users/search?query=${encodeURIComponent(trimmed)}`);
                if (!mountedRef.current) return;
                if (searchRequestIdRef.current !== requestId) return;
                if (res?.data?.success) {
                    const list = Array.isArray(res.data.data) ? res.data.data : [];
                    setSearchResults(list.filter((u) => u && idOf(u) !== null));
                } else {
                    setSearchResults([]);
                }
            } catch (err) {
                if (mountedRef.current && searchRequestIdRef.current === requestId) {
                    setSearchResults([]);
                }
            } finally {
                if (mountedRef.current && searchRequestIdRef.current === requestId) {
                    setSearchLoading(false);
                }
            }
        }, SEARCH_DEBOUNCE);
    }, []);

    const clearSearch = useCallback(() => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
            searchTimeout.current = null;
        }
        searchRequestIdRef.current += 1;
        setSearchQuery('');
        setIsSearching(false);
        setSearchLoading(false);
        setSearchResults([]);
    }, []);

    const goToProfile = useCallback((targetId) => {
        const target = idOf(targetId);
        if (!target) return;
        if (currentUserIdRef.current && target === idOf(currentUserIdRef.current)) return;
        try {
            navigation.navigate('SearchProfileResult', { userId: target });
        } catch (e) {
            try {
                navigation.navigate('HomeTab', {
                    screen: 'SearchProfileResult',
                    params: { userId: target },
                });
            } catch (e2) {}
        }
    }, [navigation]);

    const openConversation = useCallback(async (targetUserId, targetUsername, targetIcon) => {
        if (openingRef.current) return;
        openingRef.current = true;
        setOpeningConversation(true);
        try {
            const res = await axiosAuthGuard.post('/api/chat/conversations', {
                targetUserId
            });

            if (res?.data?.success && res.data.data?._id) {
                clearSearch();
                navigation.navigate('ChatScreen', {
                    conversationId: String(res.data.data._id),
                    participantName: targetUsername,
                    participantIcon: targetIcon,
                    participantId: targetUserId ? String(targetUserId) : null
                });
            } else {
                Alert.alert('Eroare', res?.data?.message || 'Nu s-a putut deschide conversația.');
            }
        } catch (err) {
            const message = err?.response?.data?.message || 'Nu s-a putut deschide conversația.';
            Alert.alert('Eroare', message);
        } finally {
            openingRef.current = false;
            if (mountedRef.current) setOpeningConversation(false);
        }
    }, [navigation, clearSearch]);

    const openExistingConversation = useCallback((item) => {
        if (!item) return;
        const conversationId = idOf(item);
        if (!conversationId) return;

        const cleared = clearConversationUnread(conversationsRef.current, conversationId);
        if (cleared.cleared > 0) {
            setConversations(cleared.list);
            if (typeof setUnreadChatCount === 'function') {
                setUnreadChatCount((current) => clampUnread((Number(current) || 0) - cleared.cleared));
            }
        }

        navigation.navigate('ChatScreen', {
            conversationId,
            participantName: item.participant?.username,
            participantIcon: item.participant?.icon,
            participantId: item.participant?._id ? String(item.participant._id) : null
        });
    }, [navigation, setUnreadChatCount]);

    const openMenu = useCallback((conv) => {
        setSelectedConv(conv);
        setMenuVisible(true);
    }, []);

    const handleReport = useCallback(() => {
        setMenuVisible(false);
        const target = selectedConv;
        if (!target) return;
        const targetId = target.participant?._id ? String(target.participant._id) : null;
        if (!targetId) {
            Alert.alert('Eroare', 'Nu se poate identifica utilizatorul.');
            return;
        }
        Alert.alert(
            'Raportează utilizatorul',
            `Ești sigur că vrei să raportezi pe ${target.participant?.username || 'acest utilizator'}?`,
            [
                { text: 'Anulează', style: 'cancel' },
                {
                    text: 'Raportează',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await axiosAuthGuard.post('/api/report', {
                                target_id: targetId,
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
    }, [selectedConv]);

    const renderConversation = useCallback(({ item }) => {
        const unread = clampUnread(item?.unread_count);
        const hasUnread = unread > 0;
        const participantId = item?.participant?._id ? String(item.participant._id) : null;

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.convItem,
                    pressed && { backgroundColor: COLORS.pressedBg }
                ]}
                onPress={() => openExistingConversation(item)}
                onLongPress={() => openMenu(item)}
                delayLongPress={500}
            >
                <Pressable
                    style={styles.avatarContainer}
                    onPress={() => goToProfile(participantId)}
                    hitSlop={HIT_SLOP}
                >
                    <Image
                        source={item?.participant?.icon ? { uri: item.participant.icon } : assets.default_avatar}
                        style={styles.avatar}
                    />
                </Pressable>

                <View style={styles.convContent}>
                    <View style={styles.convTop}>
                        <Text style={[styles.convName, hasUnread && styles.convNameBold]} numberOfLines={1}>
                            {item?.participant?.username || 'Utilizator'}
                        </Text>
                        <Text style={[styles.convTime, hasUnread && styles.convTimeBold]} numberOfLines={1} allowFontScaling={false}>
                            {formatConversationTime(item?.last_message_at)}
                        </Text>
                    </View>
                    <View style={styles.convBottom}>
                        <Text
                            style={[styles.convLastMessage, hasUnread && styles.convLastMessageBold]}
                            numberOfLines={1}
                        >
                            {item?.last_message_type === 'image'
                                ? '📷 Imagine'
                                : item?.last_message || 'Niciun mesaj încă'}
                        </Text>
                        {hasUnread && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadBadgeText} allowFontScaling={false}>
                                    {unread > 99 ? '99+' : unread}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <Pressable
                    style={styles.dotsButton}
                    onPress={() => openMenu(item)}
                    hitSlop={HIT_SLOP}
                >
                    <Text style={styles.dotsText} allowFontScaling={false}>⋮</Text>
                </Pressable>
            </Pressable>
        );
    }, [openExistingConversation, openMenu, goToProfile]);

    const renderSearchResult = useCallback(({ item }) => (
        <Pressable
            style={({ pressed }) => [
                styles.searchResultItem,
                pressed && { backgroundColor: COLORS.pressedBg }
            ]}
            onPress={() => openConversation(item?._id, item?.username, item?.icon)}
            disabled={openingConversation}
        >
            <Image
                source={item?.icon ? { uri: item.icon } : assets.default_avatar}
                style={styles.searchAvatar}
            />
            <Text style={styles.searchUsername} numberOfLines={1}>{item?.username}</Text>
        </Pressable>
    ), [openConversation, openingConversation]);

    const renderEmpty = useCallback(() => {
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
    }, [loading]);

    const keyExtractor = useCallback((item, index) => {
        const id = idOf(item);
        return id !== null ? id : `row_${index}`;
    }, []);

    const separator = useCallback(() => <View style={styles.separator} />, []);

    const listContentStyle = useMemo(() => ([
        styles.listContent,
        conversations.length === 0 ? { flexGrow: 1 } : null,
    ]), [conversations.length]);

    return (
        <>
            <StatusBar
                barStyle="light-content"
                backgroundColor={COLORS.secondary}
            />

            <SafeAreaView
                edges={['top']}
                style={{ backgroundColor: COLORS.secondary }}
            />

            <SafeAreaView
                style={styles.container}
                edges={['left', 'right', 'bottom']}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Mesaje</Text>
                </View>

                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Text style={styles.searchIcon} allowFontScaling={false}>🔍</Text>

                        <TextInput
                            style={styles.searchInput}
                            placeholder="Caută utilizatori..."
                            placeholderTextColor={COLORS.placeholder}
                            value={searchQuery}
                            onChangeText={handleSearch}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="search"
                            underlineColorAndroid="transparent"
                        />

                        {searchQuery.length > 0 && (
                            <Pressable
                                onPress={clearSearch}
                                hitSlop={HIT_SLOP}
                            >
                                <Text style={styles.clearButton} allowFontScaling={false}>✕</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {isSearching && (
                    <View style={styles.searchResultsContainer}>
                        {searchLoading ? (
                            <ActivityIndicator
                                color={COLORS.accent}
                                style={{ marginTop: vs(20) }}
                            />
                        ) : searchResults.length === 0 ? (
                            <Text style={styles.noResultsText}>
                                Niciun utilizator găsit
                            </Text>
                        ) : (
                            <FlatList
                                data={searchResults}
                                keyExtractor={keyExtractor}
                                renderItem={renderSearchResult}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="on-drag"
                                ItemSeparatorComponent={separator}
                                contentContainerStyle={styles.listContent}
                                removeClippedSubviews={false}
                            />
                        )}
                    </View>
                )}

                {!isSearching && (
                    <>
                        {loading ? (
                            <ConversationListSkeleton />
                        ) : (
                            <FlatList
                                data={conversations}
                                keyExtractor={keyExtractor}
                                renderItem={renderConversation}
                                ListEmptyComponent={renderEmpty}
                                onRefresh={() => {
                                    setRefreshing(true);
                                    fetchConversations(true);
                                }}
                                refreshing={refreshing}
                                ItemSeparatorComponent={separator}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={listContentStyle}
                                removeClippedSubviews={false}
                                initialNumToRender={12}
                                maxToRenderPerBatch={10}
                                windowSize={11}
                                updateCellsBatchingPeriod={50}
                            />
                        )}
                    </>
                )}

                <Modal
                    visible={menuVisible}
                    transparent
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={() => setMenuVisible(false)}
                >
                    <Pressable
                        style={styles.modalOverlay}
                        onPress={() => setMenuVisible(false)}
                    >
                        <Pressable style={styles.menuContainer} onPress={() => {}}>
                            <View style={styles.menuHeader}>
                                <Image
                                    source={selectedConv?.participant?.icon
                                        ? { uri: selectedConv.participant.icon }
                                        : assets.default_avatar}
                                    style={styles.menuAvatar}
                                />

                                <Text style={styles.menuUsername} numberOfLines={1}>
                                    {selectedConv?.participant?.username || 'Utilizator'}
                                </Text>
                            </View>

                            <View style={styles.menuDivider} />

                            <Pressable
                                style={({ pressed }) => [
                                    styles.menuItem,
                                    pressed && {
                                        backgroundColor: COLORS.accentSurface
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
                                        backgroundColor: COLORS.borderStrong
                                    }
                                ]}
                                onPress={() => setMenuVisible(false)}
                            >
                                <Text style={styles.menuItemCancelText}>
                                    Anulează
                                </Text>
                            </Pressable>
                        </Pressable>
                    </Pressable>
                </Modal>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    skeletonList: {
        flex: 1,
        overflow: 'hidden',
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH || undefined,
        alignSelf: 'center',
    },
    listContent: {
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH || undefined,
        alignSelf: 'center',
    },
    header: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: s(20),
        paddingVertical: vs(16),
        paddingTop: vs(16),
    },
    headerTitle: {
        ...textBlock(22, 1.25),
        fontWeight: 'bold',
        color: COLORS.white,
    },
    searchContainer: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: s(16),
        paddingBottom: vs(12),
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: s(12),
        paddingHorizontal: s(12),
        minHeight: s(44),
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH || undefined,
        alignSelf: 'center',
    },
    searchIcon: {
        fontSize: f(16),
        marginRight: s(8),
    },
    searchInput: {
        flex: 1,
        ...textBlock(15, 1.3),
        color: COLORS.white,
        paddingVertical: 0,
        minHeight: s(40),
    },
    clearButton: {
        fontSize: f(14),
        color: 'rgba(255,255,255,0.7)',
        paddingLeft: s(8),
    },
    searchResultsContainer: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(16),
        paddingVertical: vs(12),
    },
    searchAvatar: {
        width: s(44),
        height: s(44),
        borderRadius: s(22),
        backgroundColor: COLORS.sheet,
        marginRight: s(12),
    },
    searchUsername: {
        ...textBlock(16, 1.3),
        color: COLORS.text,
        fontWeight: '500',
        flex: 1,
    },
    noResultsText: {
        textAlign: 'center',
        marginTop: vs(30),
        color: COLORS.placeholder,
        ...textBlock(15, 1.35),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    convItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingHorizontal: s(16),
        paddingVertical: vs(12),
    },
    avatarContainer: {
        marginRight: s(12),
    },
    avatar: {
        width: AVATAR_LIST,
        height: AVATAR_LIST,
        borderRadius: AVATAR_LIST / 2,
        backgroundColor: COLORS.sheet,
    },
    convContent: {
        flex: 1,
        minWidth: 0,
        marginRight: s(8),
    },
    convTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: vs(4),
    },
    convName: {
        ...textBlock(16, 1.28),
        color: COLORS.text,
        fontWeight: '400',
        flex: 1,
        marginRight: s(8),
    },
    convNameBold: {
        fontWeight: '700',
        color: COLORS.text,
    },
    convTime: {
        ...metaText(12, 1.25),
        color: COLORS.placeholder,
        flexShrink: 0,
    },
    convTimeBold: {
        color: COLORS.accent,
        fontWeight: '600',
    },
    convBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    convLastMessage: {
        ...textBlock(14, 1.3),
        color: COLORS.placeholder,
        flex: 1,
        marginRight: s(8),
    },
    convLastMessageBold: {
        color: COLORS.text,
        fontWeight: '600',
    },
    unreadBadge: {
        backgroundColor: COLORS.primary,
        borderRadius: s(10),
        minWidth: s(20),
        height: s(20),
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: s(5),
        flexShrink: 0,
    },
    unreadBadgeText: {
        color: COLORS.white,
        fontSize: 11,
        lineHeight: 14,
        fontWeight: 'bold',
    },
    dotsButton: {
        paddingHorizontal: s(8),
        paddingVertical: vs(4),
        justifyContent: 'center',
        alignItems: 'center',
    },
    dotsText: {
        fontSize: f(22),
        color: COLORS.placeholder,
        lineHeight: f(24),
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.border,
        marginLeft: AVATAR_LIST + s(28),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: s(40),
    },
    emptyIcon: {
        fontSize: f(60),
        marginBottom: vs(16),
    },
    emptyTitle: {
        ...textBlock(20, 1.3),
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: vs(8),
    },
    emptySubtitle: {
        ...textBlock(14, 1.42),
        color: COLORS.placeholder,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    menuContainer: {
        backgroundColor: COLORS.sheet,
        borderTopLeftRadius: s(20),
        borderTopRightRadius: s(20),
        paddingBottom: Platform.OS === 'ios' ? vs(34) : vs(20),
        paddingTop: vs(8),
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH || undefined,
        alignSelf: 'center',
    },
    menuHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(20),
        paddingVertical: vs(14),
    },
    menuAvatar: {
        width: s(40),
        height: s(40),
        borderRadius: s(20),
        backgroundColor: COLORS.surface,
        marginRight: s(12),
    },
    menuUsername: {
        ...textBlock(16, 1.3),
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
    },
    menuDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: s(20),
        marginBottom: vs(8),
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(20),
        paddingVertical: vs(16),
    },
    menuItemIconReport: {
        fontSize: f(20),
        marginRight: s(14),
    },
    menuItemTextReport: {
        ...textBlock(16, 1.3),
        color: COLORS.accent,
        fontWeight: '500',
        flex: 1,
    },
    menuItemCancel: {
        marginHorizontal: s(16),
        marginTop: vs(8),
        backgroundColor: COLORS.surface,
        borderRadius: s(12),
        paddingVertical: vs(14),
        alignItems: 'center',
    },
    menuItemCancelText: {
        ...textBlock(16, 1.3),
        color: COLORS.text,
        fontWeight: '600',
    },
});
