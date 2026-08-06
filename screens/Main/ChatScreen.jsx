import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Pressable,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ScrollView,
    BackHandler,
} from 'react-native';

import {Text, TextInput} from '../../helpers/AppText.jsx';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { Image as CompressorImage } from 'react-native-compressor';
import { launchImageLibrary } from 'react-native-image-picker';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';
import { formatMessageTime, uploadChatImage } from '../../helpers/chatHelper.js';
import { emitter } from '../../helpers/eventBus.js';
import { Context } from '../../context/Context.js';
import { assets } from '../../assets.js';

import {
    normalizeMessages,
    mergeOlderMessages,
    countNewMessages,
    upsertMessage,
    removeMessage,
    markMessageDeleted,
    markOwnMessagesRead,
    shouldShowTime,
    isOwnMessage,
    oldestMessageId,
    idOf,
    toTime,
} from '../../helpers/chatLogic.js';

import {
    s,
    vs,
    f,
    textBlock,
    metaText,
    IS_TABLET,
    CONTENT_MAX_WIDTH,
    BUBBLE_MAX_WIDTH,
    CHAT_IMAGE_SIZE,
    AVATAR_MESSAGE,
    AVATAR_HEADER,
    HIT_SLOP,
} from '../../helpers/chatMetrics.js';

import TypingIndicator from './components/TypingIndicator.jsx';
import Shimmer from '../../helpers/skeletons/Shimmer.jsx';


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
    accentSurface: '#3A2526',
    danger: '#EF5350',
};

const SK_BASE = '#32383F';
const SK_HIGH = '#3C424B';

const REPORT_REASONS = [
    'Spam sau reclame',
    'Conținut obscen sau ofensator',
    'Hărțuire sau intimidare',
    'Limbaj de ură',
    'Alt motiv',
];

const SKELETON_BUBBLES = [
    { own: false, w: '58%', h: 40 },
    { own: false, w: '40%', h: 40 },
    { own: true,  w: '52%', h: 60 },
    { own: false, w: '62%', h: 40 },
    { own: true,  w: '45%', h: 40 },
    { own: true,  w: '56%', h: 40 },
];

const SEND_ACK_TIMEOUT = 15000;
const TYPING_IDLE_TIMEOUT = 2000;
const TYPING_RECEIVE_TIMEOUT = 7000;

const makeClientId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const nextCreatedAt = (list) => {
    const arr = Array.isArray(list) ? list : [];
    const newest = arr.length > 0 ? toTime(arr[0].createdAt) : 0;
    return new Date(Math.max(Date.now(), newest + 1)).toISOString();
};

const priceFormatter = (() => {
    try {
        return new Intl.NumberFormat('de-DE');
    } catch (e) {
        return { format: (value) => String(value) };
    }
})();

const formatPrice = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    try {
        return priceFormatter.format(num);
    } catch (e) {
        return String(num);
    }
};

function ChatThreadSkeleton() {
    return (
        <View style={styles.skelThread} pointerEvents="none">
            {SKELETON_BUBBLES.map((b, i) => (
                <View
                    key={i}
                    style={[
                        styles.messageWrapper,
                        b.own ? styles.messageWrapperOwn : styles.messageWrapperOther,
                    ]}
                >
                    {!b.own && (
                        <Shimmer width={AVATAR_MESSAGE} height={AVATAR_MESSAGE} borderRadius={AVATAR_MESSAGE / 2} style={{ marginRight: s(6) }} baseColor={SK_BASE} highlightColor={SK_HIGH} />
                    )}
                    <View
                        style={[
                            styles.skelBubble,
                            b.own ? styles.skelBubbleOwn : styles.skelBubbleOther,
                            { width: b.w, height: vs(b.h) },
                        ]}
                    >
                        <Shimmer width="100%" height="100%" borderRadius={0} baseColor={SK_BASE} highlightColor={SK_HIGH} />
                    </View>
                </View>
            ))}
        </View>
    );
}

export default function ChatScreen({ route, navigation }) {
    const params = (route && route.params) || {};
    const conversationId = params.conversationId ? String(params.conversationId) : null;
    const participantName = params.participantName;
    const participantIcon = params.participantIcon;
    const participantId = params.participantId;

    const {
        socket,
        socketConnected,
        fetchUnreadChatCount,
        activeChatConversationRef,
        setUnreadChatCount,
        activeChatTabRef,
        username,
        userId,
    } = useContext(Context);

    const [resolvedParticipantName, setResolvedParticipantName] = useState(participantName || '');
    const [resolvedParticipantIcon, setResolvedParticipantIcon] = useState(participantIcon || '');
    const [resolvedParticipantId, setResolvedParticipantId] = useState(participantId ? String(participantId) : null);
    const [resolvingParticipant, setResolvingParticipant] = useState(false);

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);

    const [text, setText] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    const [isTyping, setIsTyping] = useState(false);

    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageViewerUrls, setImageViewerUrls] = useState([]);

    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [selectedReason, setSelectedReason] = useState(null);
    const [reportSending, setReportSending] = useState(false);

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [selectedMessageForDelete, setSelectedMessageForDelete] = useState(null);

    const mountedRef = useRef(true);
    const flatListRef = useRef(null);
    const isFetchingMoreRef = useRef(false);
    const fetchedConversationRef = useRef(null);
    const lastCursorRef = useRef(null);
    const isNearBottomRef = useRef(true);
    const isPickingRef = useRef(false);
    const typingTimeoutRef = useRef(null);
    const typingReceiveTimerRef = useRef(null);
    const isTypingEmittedRef = useRef(false);
    const pendingTimersRef = useRef({});
    const currentUserIdRef = useRef(userId || null);
    const usernameRef = useRef(username || null);
    const messagesRef = useRef([]);
    const pendingSendsRef = useRef(new Map());

    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { currentUserIdRef.current = userId || null; }, [userId]);
    useEffect(() => { usernameRef.current = username || null; }, [username]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (typingReceiveTimerRef.current) clearTimeout(typingReceiveTimerRef.current);
            const timers = pendingTimersRef.current || {};
            Object.keys(timers).forEach((key) => clearTimeout(timers[key]));
            pendingTimersRef.current = {};
            pendingSendsRef.current = new Map();
        };
    }, []);

    const registerPendingSend = useCallback((clientId, type, text) => {
        try {
            pendingSendsRef.current.set(clientId, { type, text: text || null, claimed: false });
        } catch (e) {}
    }, []);

    const releasePendingSend = useCallback((clientId) => {
        try {
            pendingSendsRef.current.delete(clientId);
        } catch (e) {}
    }, []);

    const claimPendingClientId = useCallback((message) => {
        try {
            const map = pendingSendsRef.current;
            if (!map || map.size === 0 || !message) return null;
            for (const [clientId, info] of map) {
                if (!info || info.claimed) continue;
                if (info.type !== message.type) continue;
                if (message.type === 'text' && info.text !== message.text) continue;
                info.claimed = true;
                return clientId;
            }
        } catch (e) {}
        return null;
    }, []);

    const safeSetMessages = useCallback((updater) => {
        if (!mountedRef.current) return;
        setMessages(updater);
    }, []);

    const scrollToBottom = useCallback((animated) => {
        try {
            if (flatListRef.current && typeof flatListRef.current.scrollToOffset === 'function') {
                flatListRef.current.scrollToOffset({ offset: 0, animated: !!animated });
            }
        } catch (e) {}
    }, []);

    useEffect(() => {
        setResolvedParticipantName(participantName || '');
        setResolvedParticipantIcon(participantIcon || '');
        setResolvedParticipantId(participantId ? String(participantId) : null);
    }, [conversationId, participantName, participantIcon, participantId]);

    useEffect(() => {
        if (!conversationId) return;
        if (participantId && participantName && participantIcon) return;

        let cancelled = false;

        const resolveParticipant = async () => {
            setResolvingParticipant(true);
            try {
                const res = await axiosAuthGuard.get(`/api/chat/conversations/${conversationId}`);
                if (!cancelled && res?.data?.success && res.data.data?.participant) {
                    const p = res.data.data.participant;
                    setResolvedParticipantName(p.username || '');
                    setResolvedParticipantIcon(p.icon || '');
                    setResolvedParticipantId(p._id ? String(p._id) : null);
                }
            } catch (err) {
                if (!cancelled) {
                    try {
                        const fallback = await axiosAuthGuard.get('/api/chat/conversations');
                        if (!cancelled && fallback?.data?.success) {
                            const conv = (fallback.data.data || []).find(c => idOf(c) === conversationId);
                            if (conv?.participant) {
                                setResolvedParticipantName(conv.participant.username || '');
                                setResolvedParticipantIcon(conv.participant.icon || '');
                                setResolvedParticipantId(conv.participant._id ? String(conv.participant._id) : null);
                            }
                        }
                    } catch (e) {}
                }
            } finally {
                if (!cancelled) setResolvingParticipant(false);
            }
        };

        resolveParticipant();

        return () => { cancelled = true; };
    }, [conversationId, participantId, participantName, participantIcon]);

    useFocusEffect(useCallback(() => {
        if (activeChatTabRef) activeChatTabRef.current = true;
        return () => {
            if (activeChatTabRef) activeChatTabRef.current = false;
        };
    }, [activeChatTabRef]));

    const fetchMessages = useCallback(async (cursor) => {
        if (!conversationId) return;
        if (cursor) {
            if (isFetchingMoreRef.current) return;
            if (lastCursorRef.current !== null && lastCursorRef.current === cursor) return;
            isFetchingMoreRef.current = true;
            if (mountedRef.current) setLoadingMore(true);
        } else if (mountedRef.current) {
            setLoading(true);
        }

        try {
            const url = cursor
                ? `/api/chat/messages/${conversationId}?cursor=${encodeURIComponent(cursor)}`
                : `/api/chat/messages/${conversationId}`;

            const res = await axiosAuthGuard.get(url);

            if (!mountedRef.current) return;

            if (res?.data?.success) {
                const incoming = Array.isArray(res.data.data) ? res.data.data : [];
                let fresh = incoming.length;

                setMessages((prev) => {
                    if (cursor) {
                        fresh = countNewMessages(prev, incoming);
                        return mergeOlderMessages(prev, incoming);
                    }
                    return normalizeMessages(incoming);
                });

                if (cursor) lastCursorRef.current = cursor;

                const serverCursor = res.data.nextCursor ? String(res.data.nextCursor) : null;
                const exhausted = incoming.length === 0
                    || (cursor && fresh === 0)
                    || serverCursor === null
                    || (cursor && serverCursor === cursor);

                if (exhausted) {
                    setHasMore(false);
                    setNextCursor(null);
                } else {
                    setHasMore(!!res.data.hasMore);
                    setNextCursor(serverCursor);
                }
            }
        } catch (err) {
            if (mountedRef.current && cursor) {
                setHasMore(false);
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                setLoadingMore(false);
            }
            isFetchingMoreRef.current = false;
        }
    }, [conversationId]);

    useFocusEffect(
        useCallback(() => {
            if (!conversationId) return undefined;

            if (activeChatConversationRef) activeChatConversationRef.current = conversationId;

            if (fetchedConversationRef.current !== conversationId) {
                fetchedConversationRef.current = conversationId;
                lastCursorRef.current = null;
                isFetchingMoreRef.current = false;
                isNearBottomRef.current = true;
                pendingSendsRef.current = new Map();
                setMessages([]);
                setHasMore(false);
                setNextCursor(null);
                setIsTyping(false);
                setText('');
                fetchMessages(null);
            }

            return () => {
                if (activeChatConversationRef) activeChatConversationRef.current = null;
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = null;
                }
                if (isTypingEmittedRef.current && socket?.current?.connected) {
                    socket.current.emit('typing_stop', { conversationId });
                }
                isTypingEmittedRef.current = false;
            };
        }, [conversationId, fetchMessages, activeChatConversationRef, socket])
    );

    const markConversationRead = useCallback(() => {
        if (!conversationId) return;
        if (!socket?.current?.connected) {
            axiosAuthGuard.put(`/api/chat/conversations/${conversationId}/read`)
                .then(() => { if (typeof fetchUnreadChatCount === 'function') fetchUnreadChatCount(); })
                .catch(() => {});
            return;
        }
        socket.current.emit('mark_read', { conversationId }, (response) => {
            if (!mountedRef.current) return;
            if (response && typeof response.unreadTotal === 'number' && typeof setUnreadChatCount === 'function') {
                setUnreadChatCount(Math.max(0, response.unreadTotal));
            } else if (typeof fetchUnreadChatCount === 'function') {
                fetchUnreadChatCount();
            }
        });
    }, [conversationId, socket, setUnreadChatCount, fetchUnreadChatCount]);

    useEffect(() => {
        if (!conversationId) return;
        if (!socketConnected) return;
        if (!socket?.current?.connected) return;
        socket.current.emit('join_conversation', conversationId);
        markConversationRead();
    }, [socketConnected, conversationId, socket, markConversationRead]);

    useEffect(() => {
        if (!conversationId) return undefined;

        const handleNewMessage = (message) => {
            if (!message) return;
            if (idOf(message.conversation_id) !== conversationId) return;

            const own = isOwnMessage(message, currentUserIdRef.current, usernameRef.current);

            let incoming = message;
            if (own && (message.client_id === null || message.client_id === undefined)) {
                const claimed = claimPendingClientId(message);
                if (claimed) incoming = Object.assign({}, message, { client_id: claimed });
            }

            safeSetMessages((prev) => upsertMessage(prev, incoming));

            if (own || isNearBottomRef.current) {
                requestAnimationFrame(() => scrollToBottom(true));
            }

            if (!own) markConversationRead();
        };

        const handleTypingStart = (data) => {
            if (!data || idOf(data.conversationId) !== conversationId) return;
            if (data.userId && currentUserIdRef.current && idOf(data.userId) === idOf(currentUserIdRef.current)) return;
            if (!mountedRef.current) return;
            setIsTyping(true);
            if (typingReceiveTimerRef.current) clearTimeout(typingReceiveTimerRef.current);
            typingReceiveTimerRef.current = setTimeout(() => {
                if (mountedRef.current) setIsTyping(false);
            }, TYPING_RECEIVE_TIMEOUT);
        };

        const handleTypingStop = (data) => {
            if (!data || idOf(data.conversationId) !== conversationId) return;
            if (typingReceiveTimerRef.current) {
                clearTimeout(typingReceiveTimerRef.current);
                typingReceiveTimerRef.current = null;
            }
            if (mountedRef.current) setIsTyping(false);
        };

        const handleMessagesRead = (data) => {
            if (!data || idOf(data.conversationId) !== conversationId) return;
            if (data.readBy && currentUserIdRef.current && idOf(data.readBy) === idOf(currentUserIdRef.current)) return;
            safeSetMessages((prev) => markOwnMessagesRead(prev, currentUserIdRef.current, usernameRef.current));
        };

        const handleMessageDeleted = (data) => {
            if (!data || idOf(data.conversationId) !== conversationId) return;
            safeSetMessages((prev) => markMessageDeleted(prev, data.messageId));
        };

        emitter.on('socket_new_message', handleNewMessage);
        emitter.on('socket_typing_start', handleTypingStart);
        emitter.on('socket_typing_stop', handleTypingStop);
        emitter.on('socket_messages_read', handleMessagesRead);
        emitter.on('socket_message_deleted', handleMessageDeleted);

        return () => {
            emitter.off('socket_new_message', handleNewMessage);
            emitter.off('socket_typing_start', handleTypingStart);
            emitter.off('socket_typing_stop', handleTypingStop);
            emitter.off('socket_messages_read', handleMessagesRead);
            emitter.off('socket_message_deleted', handleMessageDeleted);
        };
    }, [conversationId, safeSetMessages, scrollToBottom, markConversationRead, claimPendingClientId]);

    const handleTextChange = useCallback((value) => {
        setText(value);

        if (!conversationId) return;
        if (!socket?.current?.connected) return;

        const trimmed = value.trim();

        if (trimmed.length === 0) {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
            if (isTypingEmittedRef.current) {
                socket.current.emit('typing_stop', { conversationId });
                isTypingEmittedRef.current = false;
            }
            return;
        }

        if (!isTypingEmittedRef.current) {
            socket.current.emit('typing_start', { conversationId });
            isTypingEmittedRef.current = true;
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            typingTimeoutRef.current = null;
            if (socket?.current?.connected && isTypingEmittedRef.current) {
                socket.current.emit('typing_stop', { conversationId });
            }
            isTypingEmittedRef.current = false;
        }, TYPING_IDLE_TIMEOUT);
    }, [conversationId, socket]);

    const failPendingMessage = useCallback((clientId, restoreText, message) => {
        const timers = pendingTimersRef.current || {};
        if (timers[clientId]) {
            clearTimeout(timers[clientId]);
            delete timers[clientId];
        }
        releasePendingSend(clientId);
        safeSetMessages((prev) => removeMessage(prev, clientId));
        if (restoreText) {
            setText((current) => (current && current.length > 0 ? current : restoreText));
        }
        Alert.alert('Eroare', message || 'Mesajul nu a putut fi trimis.');
    }, [safeSetMessages, releasePendingSend]);

    const handleSendText = useCallback(() => {
        const trimmed = text.trim();
        if (!trimmed || !conversationId) return;

        if (!socket?.current?.connected) {
            Alert.alert('Fără conexiune', 'Reconectare în curs. Încearcă din nou în câteva secunde.');
            return;
        }

        const clientId = makeClientId();
        const optimistic = {
            _id: clientId,
            client_id: clientId,
            conversation_id: conversationId,
            sender_id: {
                _id: currentUserIdRef.current || null,
                username: usernameRef.current || null,
            },
            type: 'text',
            text: trimmed,
            image_url: null,
            sale_preview: null,
            is_read: false,
            is_deleted: false,
            createdAt: nextCreatedAt(messagesRef.current),
            pending: true,
        };

        registerPendingSend(clientId, 'text', trimmed);

        setText('');
        safeSetMessages((prev) => upsertMessage(prev, optimistic));
        requestAnimationFrame(() => scrollToBottom(true));

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        if (isTypingEmittedRef.current) {
            socket.current.emit('typing_stop', { conversationId });
            isTypingEmittedRef.current = false;
        }

        pendingTimersRef.current[clientId] = setTimeout(() => {
            failPendingMessage(clientId, trimmed, 'Mesajul nu a putut fi trimis. Verifică conexiunea.');
        }, SEND_ACK_TIMEOUT);

        socket.current.emit('send_message', { conversationId, text: trimmed, clientId }, (response) => {
            const timers = pendingTimersRef.current || {};
            if (timers[clientId]) {
                clearTimeout(timers[clientId]);
                delete timers[clientId];
            }
            if (!mountedRef.current) return;

            if (response && response.success && response.message) {
                releasePendingSend(clientId);
                const confirmed = Object.assign({}, response.message, { client_id: clientId });
                safeSetMessages((prev) => upsertMessage(prev, confirmed));
            } else {
                failPendingMessage(clientId, trimmed, response?.message);
            }
        });
    }, [text, conversationId, socket, safeSetMessages, scrollToBottom, failPendingMessage, registerPendingSend, releasePendingSend]);

    const handlePickImage = useCallback(async () => {
        if (isPickingRef.current || uploadingImage || !conversationId) return;
        isPickingRef.current = true;

        let clientId = null;

        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 1,
                quality: 1,
            });

            if (result?.didCancel || result?.errorCode || !result?.assets?.length) return;

            const originalUri = result.assets[0].uri;
            if (!originalUri) return;

            if (mountedRef.current) setUploadingImage(true);

            let compressedUri = originalUri;
            try {
                compressedUri = await CompressorImage.compress(originalUri, {
                    quality: 0.8,
                    maxWidth: 1200,
                    maxHeight: 1200,
                });
            } catch (e) {
                compressedUri = originalUri;
            }

            clientId = makeClientId();
            const optimistic = {
                _id: clientId,
                client_id: clientId,
                conversation_id: conversationId,
                sender_id: {
                    _id: currentUserIdRef.current || null,
                    username: usernameRef.current || null,
                },
                type: 'image',
                text: null,
                image_url: compressedUri,
                sale_preview: null,
                is_read: false,
                is_deleted: false,
                createdAt: nextCreatedAt(messagesRef.current),
                pending: true,
            };

            registerPendingSend(clientId, 'image', null);

            safeSetMessages((prev) => upsertMessage(prev, optimistic));
            requestAnimationFrame(() => scrollToBottom(true));

            const imageFile = {
                uri: compressedUri,
                type: 'image/jpeg',
                name: `chat_${Date.now()}.jpg`,
            };

            const savedMessage = await uploadChatImage(imageFile, conversationId);

            if (socket?.current?.connected) {
                socket.current.emit('image_message_sent', {
                    conversationId,
                    messageId: savedMessage?._id,
                });
            }

            releasePendingSend(clientId);

            if (savedMessage && savedMessage._id) {
                const confirmed = Object.assign({}, savedMessage, { client_id: clientId });
                safeSetMessages((prev) => upsertMessage(prev, confirmed));
            } else {
                safeSetMessages((prev) => removeMessage(prev, clientId));
            }

        } catch (err) {
            if (clientId) {
                releasePendingSend(clientId);
                safeSetMessages((prev) => removeMessage(prev, clientId));
            }
            Alert.alert('Eroare', 'Nu s-a putut trimite imaginea.');
        } finally {
            if (mountedRef.current) setUploadingImage(false);
            isPickingRef.current = false;
        }
    }, [uploadingImage, conversationId, socket, safeSetMessages, scrollToBottom, registerPendingSend, releasePendingSend]);

    const openImageViewer = useCallback((imageUrl) => {
        if (!imageUrl) return;
        setImageViewerUrls([{ url: imageUrl }]);
        setImageViewerVisible(true);
    }, []);

    const goToProfile = useCallback((targetId) => {
        const target = idOf(targetId) || resolvedParticipantId;
        if (!target) return;
        if (currentUserIdRef.current && idOf(target) === idOf(currentUserIdRef.current)) return;
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
    }, [navigation, resolvedParticipantId]);

    const handleLongPressMessage = useCallback((item, isOwn) => {
        if (!isOwn || !item || item.is_deleted || item.pending) return;
        setSelectedMessageForDelete(item);
        setDeleteModalVisible(true);
    }, []);

    const handleDeleteMessage = useCallback(async () => {
        const target = selectedMessageForDelete;
        setDeleteModalVisible(false);
        setSelectedMessageForDelete(null);
        if (!target) return;

        const snapshot = target;
        safeSetMessages((prev) => markMessageDeleted(prev, snapshot._id));

        try {
            await axiosAuthGuard.delete(`/api/chat/messages/${snapshot._id}`);
        } catch (err) {
            safeSetMessages((prev) => upsertMessage(prev, snapshot));
            Alert.alert('Eroare', 'Mesajul nu a putut fi șters.');
        }
    }, [selectedMessageForDelete, safeSetMessages]);

    const handleReport = useCallback(async () => {
        if (!selectedReason) {
            Alert.alert('Selectează un motiv', 'Te rugăm să selectezi un motiv pentru raport.');
            return;
        }

        if (!resolvedParticipantId) {
            Alert.alert('Eroare', 'Nu se poate identifica utilizatorul.');
            return;
        }

        setReportSending(true);
        try {
            await axiosAuthGuard.post('/api/report', {
                target_id: resolvedParticipantId,
                target_type: 'profile',
                reason: selectedReason,
            });
            if (!mountedRef.current) return;
            setReportModalVisible(false);
            setSelectedReason(null);
            Alert.alert('Mulțumim', 'Raportul a fost trimis cu succes.');
        } catch (err) {
            Alert.alert('Eroare', 'Nu s-a putut trimite raportul.');
        } finally {
            if (mountedRef.current) setReportSending(false);
        }
    }, [selectedReason, resolvedParticipantId]);

    const handleLoadMore = useCallback(() => {
        if (!hasMore || loadingMore || isFetchingMoreRef.current) return;
        const cursor = nextCursor || oldestMessageId(messages);
        if (!cursor) {
            setHasMore(false);
            return;
        }
        fetchMessages(cursor);
    }, [hasMore, loadingMore, nextCursor, messages, fetchMessages]);

    const handleScroll = useCallback((event) => {
        const offsetY = event?.nativeEvent?.contentOffset?.y;
        isNearBottomRef.current = typeof offsetY === 'number' ? offsetY < s(140) : true;
    }, []);

    const handleBack = useCallback(() => {
        let hasStackHistory = false;
        try {
            const state = typeof navigation.getState === 'function' ? navigation.getState() : null;
            hasStackHistory = !!state
                && Array.isArray(state.routes)
                && typeof state.index === 'number'
                && state.index > 0;
        } catch (e) {}

        if (hasStackHistory) {
            try {
                navigation.goBack();
                return;
            } catch (e) {}
        }

        try {
            navigation.reset({ index: 0, routes: [{ name: 'ChatListScreen' }] });
            return;
        } catch (e) {}

        try {
            navigation.navigate('ChatListScreen');
        } catch (e) {}
    }, [navigation]);

    useFocusEffect(useCallback(() => {
        const onHardwareBack = () => {
            if (imageViewerVisible) {
                setImageViewerVisible(false);
                return true;
            }
            if (deleteModalVisible) {
                setDeleteModalVisible(false);
                setSelectedMessageForDelete(null);
                return true;
            }
            if (reportModalVisible) {
                setReportModalVisible(false);
                setSelectedReason(null);
                return true;
            }
            handleBack();
            return true;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
        return () => {
            if (subscription && typeof subscription.remove === 'function') subscription.remove();
            else if (typeof BackHandler.removeEventListener === 'function') {
                BackHandler.removeEventListener('hardwareBackPress', onHardwareBack);
            }
        };
    }, [handleBack, imageViewerVisible, deleteModalVisible, reportModalVisible]));

    const renderMessage = useCallback(({ item, index }) => {
        if (!item) return null;

        const isOwn = isOwnMessage(item, currentUserIdRef.current, usernameRef.current);
        const showTime = shouldShowTime(messages, index);
        const senderId = item.sender_id && typeof item.sender_id === 'object'
            ? item.sender_id._id
            : item.sender_id;

        const avatar = (
            <Pressable
                onPress={() => goToProfile(senderId || resolvedParticipantId)}
                hitSlop={HIT_SLOP}
                style={styles.messageAvatarButton}
            >
                <Image
                    source={resolvedParticipantIcon ? { uri: resolvedParticipantIcon } : assets.default_avatar}
                    style={styles.messageAvatar}
                />
            </Pressable>
        );

        const meta = showTime ? (
            <View style={[
                styles.messageMetaRow,
                isOwn ? { alignItems: 'flex-end', justifyContent: 'flex-end' } : { alignItems: 'flex-start', justifyContent: 'flex-start' }
            ]}>
                <Text style={styles.messageTime} allowFontScaling={false}>
                    {formatMessageTime(item.createdAt)}
                </Text>
                {isOwn && !item.is_deleted && !item.pending && (
                    <Text style={styles.messageReadStatus} allowFontScaling={false}>
                        {item.is_read ? ' ✓✓' : ' ✓'}
                    </Text>
                )}
            </View>
        ) : null;

        const pendingSpinner = (isOwn && item.pending) ? (
            <View style={styles.pendingSpinner}>
                <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
        ) : null;

        if (item.is_deleted) {
            return (
                <View style={[
                    styles.messageWrapper,
                    isOwn ? styles.messageWrapperOwn : styles.messageWrapperOther
                ]}>
                    {!isOwn && avatar}
                    <View style={styles.messageBubbleContainer}>
                        <View style={[
                            styles.messageBubble,
                            styles.deletedBubble,
                            isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
                            isOwn ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
                        ]}>
                            <Text style={styles.deletedText}>Acest mesaj a fost șters</Text>
                        </View>
                        {meta}
                    </View>
                </View>
            );
        }

        if (item.type === 'sale_link' && item.sale_preview) {
            return (
                <View style={[
                    styles.messageWrapper,
                    isOwn ? styles.messageWrapperOwn : styles.messageWrapperOther
                ]}>
                    {!isOwn && avatar}
                    {pendingSpinner}
                    <View style={styles.messageBubbleContainer}>
                        <Pressable
                            onPress={() => {
                                if (!item.sale_preview?.sale_id) return;
                                navigation.navigate('HomeTab', {
                                    screen: 'MainScreen',
                                    params: { saleId: item.sale_preview.sale_id }
                                });
                            }}
                            onLongPress={() => handleLongPressMessage(item, isOwn)}
                            delayLongPress={500}
                            style={[
                                styles.saleLinkCard,
                                isOwn ? styles.saleLinkCardOwn : styles.saleLinkCardOther,
                                isOwn ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
                            ]}
                        >
                            <View style={styles.saleLinkThumb}>
                                <Text style={styles.saleLinkThumbFallback}>🚗</Text>
                                {item.sale_preview.image_url ? (
                                    <Image
                                        source={{ uri: item.sale_preview.image_url }}
                                        style={styles.saleLinkThumbImage}
                                    />
                                ) : null}
                            </View>
                            <View style={styles.saleLinkInfo}>
                                <Text style={[styles.saleLinkTitle, isOwn && { color: '#FFFFFF' }]} numberOfLines={2}>
                                    {item.sale_preview.title || 'Anunț'}
                                </Text>
                                <Text style={[styles.saleLinkPrice, isOwn && { color: '#FFD4D4' }]} numberOfLines={1}>
                                    {formatPrice(item.sale_preview.price)} €
                                </Text>
                            </View>
                        </Pressable>
                        {item.text ? (
                            <View style={[
                                styles.messageBubble,
                                isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
                                { marginTop: vs(4), alignSelf: isOwn ? 'flex-end' : 'flex-start' }
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    isOwn ? styles.messageTextOwn : styles.messageTextOther
                                ]}>
                                    {item.text}
                                </Text>
                            </View>
                        ) : null}
                        {meta}
                    </View>
                </View>
            );
        }

        return (
            <View style={[
                styles.messageWrapper,
                isOwn ? styles.messageWrapperOwn : styles.messageWrapperOther
            ]}>
                {!isOwn && avatar}
                {pendingSpinner}

                <View style={styles.messageBubbleContainer}>
                    {item.type === 'image' ? (
                        <Pressable
                            onPress={() => openImageViewer(item.image_url)}
                            onLongPress={() => handleLongPressMessage(item, isOwn)}
                            delayLongPress={500}
                            style={isOwn ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }}
                        >
                            <Image
                                source={{ uri: item.image_url }}
                                style={[
                                    styles.messageImage,
                                    isOwn ? styles.messageImageOwn : styles.messageImageOther
                                ]}
                                resizeMode="cover"
                            />
                        </Pressable>
                    ) : (
                        <Pressable
                            onLongPress={() => handleLongPressMessage(item, isOwn)}
                            delayLongPress={500}
                            style={isOwn ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }}
                        >
                            <View style={[
                                styles.messageBubble,
                                isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    isOwn ? styles.messageTextOwn : styles.messageTextOther
                                ]}>
                                    {item.text}
                                </Text>
                            </View>
                        </Pressable>
                    )}

                    {meta}
                </View>
            </View>
        );
    }, [messages, resolvedParticipantIcon, resolvedParticipantId, goToProfile, handleLongPressMessage, openImageViewer, navigation]);

    const keyExtractor = useCallback((item, index) => {
        const clientId = item && item.client_id !== null && item.client_id !== undefined
            ? String(item.client_id)
            : null;
        if (clientId) return clientId;
        const id = idOf(item);
        return id !== null ? id : `row_${index}`;
    }, []);

    const extraData = useMemo(() => ({
        userId,
        username,
        icon: resolvedParticipantIcon,
        participant: resolvedParticipantId,
    }), [userId, username, resolvedParticipantIcon, resolvedParticipantId]);

    const canSend = text.trim().length > 0 && !!conversationId;

    if (!conversationId) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} translucent={false} />
                <View style={styles.header}>
                    <Pressable onPress={handleBack} style={styles.backButton} hitSlop={HIT_SLOP}>
                        <Image source={assets.back_arrow} style={styles.backIcon} />
                    </Pressable>
                    <Text style={styles.headerName} numberOfLines={1}>Conversație</Text>
                </View>
                <View style={styles.centerFill}>
                    <Text style={styles.emptyThreadText}>Conversația nu a putut fi deschisă.</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (resolvingParticipant && !resolvedParticipantId) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} translucent={false} />
                <View style={styles.header}>
                    <Pressable onPress={handleBack} style={styles.backButton} hitSlop={HIT_SLOP}>
                        <Image source={assets.back_arrow} style={styles.backIcon} />
                    </Pressable>
                    <View style={[styles.headerAvatar, { backgroundColor: COLORS.surface }]} />
                    <View style={{ flex: 1, height: vs(16), backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: s(8), marginRight: s(40) }} />
                </View>
                <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
                    <ChatThreadSkeleton />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} translucent={false} />

            <View style={styles.header}>
                <Pressable onPress={handleBack} style={styles.backButton} hitSlop={HIT_SLOP}>
                    <Image source={assets.back_arrow} style={styles.backIcon} />
                </Pressable>

                <Pressable
                    style={styles.headerIdentity}
                    onPress={() => goToProfile(resolvedParticipantId)}
                    hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
                >
                    <Image source={resolvedParticipantIcon ? { uri: resolvedParticipantIcon } : assets.default_avatar} style={styles.headerAvatar} />
                    <Text style={styles.headerName} numberOfLines={1}>
                        {resolvedParticipantName}
                    </Text>
                </Pressable>

                <Pressable
                    style={styles.reportButton}
                    onPress={() => setReportModalVisible(true)}
                    hitSlop={HIT_SLOP}
                >
                    <Text style={styles.reportDots} allowFontScaling={false}>⋮</Text>
                </Pressable>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: COLORS.bg }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={0}
            >
                {loading ? (
                    <ChatThreadSkeleton />
                ) : messages.length === 0 ? (
                    <View style={styles.centerFill}>
                        <Text style={styles.emptyThreadIcon}>💬</Text>
                        <Text style={styles.emptyThreadText}>Trimite primul mesaj</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={keyExtractor}
                        renderItem={renderMessage}
                        extraData={extraData}
                        inverted
                        contentContainerStyle={styles.messagesList}
                        style={styles.messagesFlex}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.4}
                        onScroll={handleScroll}
                        scrollEventThrottle={64}
                        ListFooterComponent={loadingMore
                            ? <ActivityIndicator color={COLORS.accent} style={{ marginVertical: vs(10) }} />
                            : null
                        }
                        ListHeaderComponent={isTyping ? <TypingIndicator avatarUri={resolvedParticipantIcon} /> : null}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews={false}
                        initialNumToRender={20}
                        maxToRenderPerBatch={12}
                        windowSize={11}
                        updateCellsBatchingPeriod={50}
                    />
                )}

                <View style={styles.inputBarOuter}>
                    <View style={styles.inputBar}>
                        <Pressable
                            style={[styles.galleryButton, uploadingImage && { opacity: 0.5 }]}
                            onPress={handlePickImage}
                            disabled={uploadingImage}
                            hitSlop={HIT_SLOP}
                        >
                            {uploadingImage
                                ? <ActivityIndicator size="small" color={COLORS.accent} />
                                : <Image source={assets.gallery_icon} style={styles.galleryIcon} />
                            }
                        </Pressable>

                        <TextInput
                            style={styles.textInput}
                            placeholder="Scrie un mesaj..."
                            placeholderTextColor={COLORS.placeholder}
                            value={text}
                            onChangeText={handleTextChange}
                            multiline
                            maxLength={1000}
                            returnKeyType="send"
                            blurOnSubmit={true}
                            onSubmitEditing={handleSendText}
                            underlineColorAndroid="transparent"
                            textAlignVertical="center"
                        />

                        <Pressable
                            style={[
                                styles.sendButton,
                                !canSend && styles.sendButtonDisabled
                            ]}
                            onPress={handleSendText}
                            disabled={!canSend}
                            hitSlop={HIT_SLOP}
                        >
                            <Image source={assets.send_icon} style={styles.sendIcon} />
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <Modal
                visible={imageViewerVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setImageViewerVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <ImageViewer
                        imageUrls={imageViewerUrls}
                        enableSwipeDown
                        onSwipeDown={() => setImageViewerVisible(false)}
                        renderIndicator={() => null}
                        backgroundColor="#000"
                    />
                    <Pressable
                        style={styles.imageViewerClose}
                        onPress={() => setImageViewerVisible(false)}
                        hitSlop={HIT_SLOP}
                    >
                        <Text style={styles.imageViewerCloseText} allowFontScaling={false}>✕</Text>
                    </Pressable>
                </View>
            </Modal>

            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => {
                    setDeleteModalVisible(false);
                    setSelectedMessageForDelete(null);
                }}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => {
                        setDeleteModalVisible(false);
                        setSelectedMessageForDelete(null);
                    }}
                >
                    <Pressable style={styles.deleteSheet} onPress={() => {}}>
                        <View style={styles.deleteSheetHandle} />

                        <Pressable
                            style={({ pressed }) => [
                                styles.deleteSheetOption,
                                pressed && { backgroundColor: COLORS.accentSurface }
                            ]}
                            onPress={handleDeleteMessage}
                        >
                            <Text style={styles.deleteSheetOptionText}>🗑  Șterge</Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.deleteSheetCancel,
                                pressed && { backgroundColor: COLORS.borderStrong }
                            ]}
                            onPress={() => {
                                setDeleteModalVisible(false);
                                setSelectedMessageForDelete(null);
                            }}
                        >
                            <Text style={styles.deleteSheetCancelText}>Anulează</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={reportModalVisible}
                transparent
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => {
                    setReportModalVisible(false);
                    setSelectedReason(null);
                }}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => {
                        setReportModalVisible(false);
                        setSelectedReason(null);
                    }}
                >
                    <Pressable style={styles.reportModal} onPress={() => {}}>
                        <View style={styles.reportHandle} />

                        <ScrollView
                            style={styles.reportScroll}
                            contentContainerStyle={styles.reportScrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                            <View style={styles.reportHeader}>
                                <Image source={resolvedParticipantIcon ? { uri: resolvedParticipantIcon } : assets.default_avatar} style={styles.reportAvatar} />
                                <View style={styles.reportHeaderText}>
                                    <Text style={styles.reportTitle} numberOfLines={1}>Raportează utilizatorul</Text>
                                    <Text style={styles.reportSubtitle} numberOfLines={1}>@{resolvedParticipantName}</Text>
                                </View>
                            </View>

                            <View style={styles.reportDivider} />

                            <Text style={styles.reportReasonLabel}>Selectează motivul:</Text>

                            {REPORT_REASONS.map((reason) => (
                                <Pressable
                                    key={reason}
                                    style={[
                                        styles.reportReasonItem,
                                        selectedReason === reason && styles.reportReasonSelected
                                    ]}
                                    onPress={() => setSelectedReason(reason)}
                                >
                                    <View style={[
                                        styles.reportRadio,
                                        selectedReason === reason && styles.reportRadioSelected
                                    ]}>
                                        {selectedReason === reason && (
                                            <View style={styles.reportRadioInner} />
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.reportReasonText,
                                        selectedReason === reason && { color: COLORS.accent, fontWeight: '600' }
                                    ]}>
                                        {reason}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <View style={styles.reportActions}>
                            <Pressable
                                style={styles.reportCancelBtn}
                                onPress={() => {
                                    setReportModalVisible(false);
                                    setSelectedReason(null);
                                }}
                            >
                                <Text style={styles.reportCancelText}>Anulează</Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.reportSubmitBtn,
                                    (!selectedReason || reportSending) && { opacity: 0.5 }
                                ]}
                                onPress={handleReport}
                                disabled={!selectedReason || reportSending}
                            >
                                {reportSending
                                    ? <ActivityIndicator size="small" color={COLORS.white} />
                                    : <Text style={styles.reportSubmitText}>Trimite raport</Text>
                                }
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.secondary,
    },
    centerFill: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.bg,
        paddingHorizontal: s(32),
    },
    emptyThreadIcon: {
        fontSize: f(44),
        marginBottom: vs(10),
    },
    emptyThreadText: {
        ...textBlock(15, 1.4),
        color: COLORS.placeholder,
        textAlign: 'center',
    },
    header: {
        backgroundColor: COLORS.secondary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(12),
        paddingVertical: vs(12),
        paddingTop: vs(12),
    },
    headerIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
    },
    backButton: {
        padding: s(4),
        marginRight: s(14),
    },
    backIcon: {
        width: s(22),
        height: s(22),
        tintColor: COLORS.white,
        resizeMode: 'contain',
    },
    headerAvatar: {
        width: AVATAR_HEADER,
        height: AVATAR_HEADER,
        borderRadius: AVATAR_HEADER / 2,
        marginRight: s(10),
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    headerName: {
        flex: 1,
        ...textBlock(17, 1.3),
        fontWeight: '700',
        color: COLORS.white,
    },
    reportButton: {
        padding: s(8),
    },
    reportDots: {
        fontSize: f(24),
        lineHeight: f(26),
        color: COLORS.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messagesFlex: {
        flex: 1,
        width: '100%',
    },
    messagesList: {
        paddingHorizontal: s(12),
        paddingVertical: vs(8),
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH || undefined,
        alignSelf: 'center',
    },
    skelThread: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: s(12),
        paddingVertical: vs(8),
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH || undefined,
        alignSelf: 'center',
    },
    skelBubble: {
        borderRadius: s(18),
        overflow: 'hidden',
    },
    skelBubbleOwn: {
        borderBottomRightRadius: s(4),
    },
    skelBubbleOther: {
        borderBottomLeftRadius: s(4),
    },
    messageWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: vs(3),
    },
    messageWrapperOwn: {
        justifyContent: 'flex-end',
    },
    messageWrapperOther: {
        justifyContent: 'flex-start',
    },
    messageAvatarButton: {
        marginRight: s(6),
    },
    messageAvatar: {
        width: AVATAR_MESSAGE,
        height: AVATAR_MESSAGE,
        borderRadius: AVATAR_MESSAGE / 2,
        backgroundColor: COLORS.surface,
    },
    messageBubbleContainer: {
        maxWidth: BUBBLE_MAX_WIDTH,
        flexShrink: 1,
    },
    messageBubble: {
        paddingHorizontal: s(14),
        paddingVertical: vs(10),
        borderRadius: s(18),
    },
    messageBubbleOwn: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: s(4),
    },
    messageBubbleOther: {
        backgroundColor: COLORS.surface,
        borderBottomLeftRadius: s(4),
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    deletedBubble: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    deletedText: {
        ...textBlock(14, 1.35),
        color: COLORS.placeholder,
        fontStyle: 'italic',
    },
    messageText: {
        ...textBlock(15, 1.42),
    },
    messageTextOwn: {
        color: COLORS.white,
    },
    messageTextOther: {
        color: COLORS.text,
    },
    messageImage: {
        width: CHAT_IMAGE_SIZE,
        height: CHAT_IMAGE_SIZE,
        borderRadius: s(14),
        backgroundColor: COLORS.surface,
    },
    pendingSpinner: {
        marginRight: s(6),
        marginBottom: vs(6),
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    messageImageOwn: {
        borderBottomRightRadius: s(4),
    },
    messageImageOther: {
        borderBottomLeftRadius: s(4),
    },
    messageMetaRow: {
        flexDirection: 'row',
        marginTop: vs(3),
        paddingHorizontal: s(2),
    },
    messageTime: {
        ...metaText(11, 1.25),
        color: COLORS.placeholder,
    },
    messageReadStatus: {
        ...metaText(11, 1.25),
        color: COLORS.placeholder,
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: vs(4),
        paddingHorizontal: s(12),
    },
    typingBubble: {
        backgroundColor: COLORS.surface,
        borderRadius: s(18),
        borderBottomLeftRadius: s(4),
        paddingHorizontal: s(14),
        paddingVertical: vs(10),
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    typingText: {
        fontSize: f(16),
        color: COLORS.placeholder,
        letterSpacing: 2,
    },
    inputBarOuter: {
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: COLORS.surface,
        paddingHorizontal: s(10),
        paddingVertical: vs(8),
        paddingBottom: vs(8),
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH || undefined,
        alignSelf: 'center',
    },
    galleryButton: {
        width: s(38),
        height: s(38),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: s(6),
        marginBottom: vs(2),
    },
    galleryIcon: {
        width: s(24),
        height: s(24),
        resizeMode: 'contain',
    },
    textInput: {
        flex: 1,
        backgroundColor: COLORS.sheet,
        borderRadius: s(20),
        paddingHorizontal: s(14),
        paddingTop: vs(10),
        paddingBottom: vs(10),
        ...textBlock(15, 1.35),
        color: COLORS.text,
        minHeight: s(40),
        maxHeight: IS_TABLET ? s(160) : s(120),
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sendButton: {
        width: s(40),
        height: s(40),
        borderRadius: s(20),
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: s(8),
        marginBottom: vs(2),
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.borderStrong,
    },
    sendIcon: {
        width: s(18),
        height: s(18),
        tintColor: COLORS.white,
        resizeMode: 'contain',
    },
    imageViewerClose: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? s(54) : s(30),
        right: s(20),
        width: s(36),
        height: s(36),
        borderRadius: s(18),
        backgroundColor: '#CC0000',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    imageViewerCloseText: {
        color: COLORS.white,
        fontSize: f(16),
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    deleteSheet: {
        backgroundColor: COLORS.sheet,
        borderTopLeftRadius: s(20),
        borderTopRightRadius: s(20),
        paddingBottom: Platform.OS === 'ios' ? vs(36) : vs(20),
        paddingTop: vs(10),
        alignItems: 'center',
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH || undefined,
        alignSelf: 'center',
    },
    deleteSheetHandle: {
        width: s(40),
        height: 4,
        backgroundColor: COLORS.borderStrong,
        borderRadius: 2,
        marginBottom: vs(16),
    },
    deleteSheetOption: {
        width: '100%',
        paddingVertical: vs(18),
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    deleteSheetOptionText: {
        ...textBlock(16, 1.35),
        fontWeight: 'bold',
        color: COLORS.danger,
    },
    deleteSheetCancel: {
        width: '100%',
        paddingVertical: vs(18),
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        marginTop: vs(8),
    },
    deleteSheetCancelText: {
        ...textBlock(16, 1.35),
        color: COLORS.text,
        fontWeight: '600',
    },
    reportModal: {
        backgroundColor: COLORS.sheet,
        borderTopLeftRadius: s(20),
        borderTopRightRadius: s(20),
        paddingHorizontal: s(20),
        paddingBottom: Platform.OS === 'ios' ? vs(36) : vs(24),
        paddingTop: vs(12),
        maxHeight: '88%',
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH || undefined,
        alignSelf: 'center',
    },
    reportScroll: {
        flexGrow: 0,
        flexShrink: 1,
    },
    reportScrollContent: {
        paddingBottom: vs(4),
    },
    reportHandle: {
        width: s(40),
        height: 4,
        backgroundColor: COLORS.borderStrong,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: vs(16),
    },
    reportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: vs(14),
    },
    reportHeaderText: {
        flex: 1,
        minWidth: 0,
    },
    reportAvatar: {
        width: s(44),
        height: s(44),
        borderRadius: s(22),
        marginRight: s(12),
        backgroundColor: COLORS.surface,
    },
    reportTitle: {
        ...textBlock(17, 1.3),
        fontWeight: '700',
        color: COLORS.text,
    },
    reportSubtitle: {
        ...textBlock(13, 1.3),
        color: COLORS.placeholder,
        marginTop: vs(2),
    },
    reportDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: vs(14),
    },
    reportReasonLabel: {
        ...textBlock(14, 1.3),
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: vs(10),
    },
    reportReasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: vs(11),
        paddingHorizontal: s(12),
        borderRadius: s(10),
        marginBottom: vs(4),
        backgroundColor: COLORS.surface,
    },
    reportReasonSelected: {
        backgroundColor: COLORS.accentSurface,
    },
    reportRadio: {
        width: s(20),
        height: s(20),
        borderRadius: s(10),
        borderWidth: 2,
        borderColor: COLORS.border,
        marginRight: s(12),
        justifyContent: 'center',
        alignItems: 'center',
    },
    reportRadioSelected: {
        borderColor: COLORS.primary,
    },
    reportRadioInner: {
        width: s(10),
        height: s(10),
        borderRadius: s(5),
        backgroundColor: COLORS.primary,
    },
    reportReasonText: {
        ...textBlock(15, 1.35),
        color: COLORS.text,
        flex: 1,
    },
    reportActions: {
        flexDirection: 'row',
        marginTop: vs(16),
        gap: s(10),
    },
    reportCancelBtn: {
        flex: 1,
        paddingVertical: vs(13),
        borderRadius: s(12),
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reportCancelText: {
        ...textBlock(15, 1.3),
        fontWeight: '600',
        color: COLORS.text,
    },
    reportSubmitBtn: {
        flex: 2,
        paddingVertical: vs(13),
        borderRadius: s(12),
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reportSubmitText: {
        ...textBlock(15, 1.3),
        fontWeight: '700',
        color: COLORS.white,
    },
    saleLinkCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: s(14),
        padding: s(10),
        minWidth: s(220),
        maxWidth: '100%',
    },
    saleLinkCardOwn: {
        backgroundColor: '#6B0000',
        borderBottomRightRadius: s(4),
    },
    saleLinkCardOther: {
        backgroundColor: COLORS.surface,
        borderBottomLeftRadius: s(4),
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    saleLinkThumb: {
        width: s(64),
        height: s(64),
        borderRadius: s(8),
        backgroundColor: COLORS.sheet,
        marginRight: s(10),
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    saleLinkInfo: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
    },
    saleLinkTitle: {
        ...textBlock(13, 1.32),
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: vs(3),
    },
    saleLinkPrice: {
        ...textBlock(14, 1.3),
        fontWeight: '800',
        color: COLORS.accent,
    },
    saleLinkThumbFallback: {
        fontSize: f(28),
        position: 'absolute',
    },
    saleLinkThumbImage: {
        width: '100%',
        height: '100%',
        borderRadius: s(8),
    },
});
