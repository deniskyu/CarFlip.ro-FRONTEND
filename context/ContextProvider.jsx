import { useEffect, useState, useRef, useCallback } from "react"
import { AppState } from "react-native";
import { Context } from "./Context.js";
import { getCreds, resetCreds, setCreds } from "../helpers/keychainFunctions.js";
import axiosAuthGuard from '../helpers/axiosAuthGuard.js';
import { assets } from '../assets.js';
import { navigate } from '../helpers/NavigationService.js'; 
import { requestUserPermission, getFcmToken, notificationListener, listenTokenRefresh, clearFcmToken } from '../helpers/notificationHelper.js';
import { emitter } from "../helpers/eventBus.js";
import { io as socketIO } from 'socket.io-client';
import { showInAppNotification } from '../helpers/notificationHelper.js';
import { signOutGoogle } from '../helpers/googleAuth.js';
import { extractUserIdFromToken } from '../helpers/jwtHelper.js';

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;

export default function ContextProvider({children}){

    const [isLogged, setIsLogged] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [username, setUsername] = useState(null);
    const [userId, setUserId] = useState(null);

    const [isNavReady, setIsNavReady] = useState(false); 
    const [pendingNotification, setPendingNotification] = useState(null); 

    const [unreadCount, setUnreadCount] = useState(0);

    const [unreadChatCount, setUnreadChatCount] = useState(0);

    const [draftSale, setDraftSale] = useState(null);

    const socketRef = useRef(null);

    const activeChatTabRef = useRef(false);

    const [socketConnected, setSocketConnected] = useState(false);

    const activeChatConversationRef = useRef(null);

    const usernameRef = useRef(null);
    const userIdRef = useRef(null);
    const isLoggedRef = useRef(false);
    const connectingRef = useRef(false);
    const reconnectTimerRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const tokenRefreshAttemptsRef = useRef(0);
    const mountedRef = useRef(true);

    useEffect(() => { usernameRef.current = username; }, [username]);
    useEffect(() => { userIdRef.current = userId; }, [userId]);
    useEffect(() => { isLoggedRef.current = isLogged; }, [isLogged]);

    const applyUnreadChatCount = useCallback((value) => {
        const num = Number(value);
        setUnreadChatCount(Number.isFinite(num) && num > 0 ? Math.floor(num) : 0);
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await axiosAuthGuard.get('/api/notifications/unread-count');
            if (res?.data?.success) {
                const num = Number(res.data.unreadCount);
                setUnreadCount(Number.isFinite(num) && num > 0 ? Math.floor(num) : 0);
            }
        } catch (error) {
            console.log("❌ Eroare la preluarea unread count:", error?.message);
        }
    }, []);

    const fetchUnreadChatCount = useCallback(async () => {
        try {
            const res = await axiosAuthGuard.get('/api/chat/unread-count');
            if (res?.data?.success) {
                applyUnreadChatCount(res.data.unreadCount);
            }
        } catch (error) {
            console.log("❌ Eroare la preluarea unread chat count:", error?.message);
        }
    }, [applyUnreadChatCount]);

    const resolveUserIdFromCreds = useCallback(async () => {
        try {
            const creds = await getCreds();
            const resolved = extractUserIdFromToken(creds?.accessToken);
            if (resolved) {
                userIdRef.current = resolved;
                setUserId(resolved);
            }
            return resolved;
        } catch (error) {
            return null;
        }
    }, []);

    const clearReconnectTimer = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    }, []);

    const connectSocketRef = useRef(null);

    const scheduleReconnect = useCallback(() => {
        if (!isLoggedRef.current) return;
        if (reconnectTimerRef.current) return;
        const attempt = Math.min(reconnectAttemptsRef.current, 5);
        reconnectAttemptsRef.current = attempt + 1;
        const delay = Math.min(RECONNECT_MAX_DELAY, RECONNECT_BASE_DELAY * Math.pow(2, attempt))
            + Math.floor(Math.random() * 600);
        console.log(`🔄 [Socket] Reconnect programat în ${delay}ms`);
        reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            if (typeof connectSocketRef.current === 'function') connectSocketRef.current();
        }, delay);
    }, []);

    const connectSocket = useCallback(async () => {
        try {
            if (!isLoggedRef.current) return;
            if (connectingRef.current) return;
            if (socketRef.current?.connected) return;

            connectingRef.current = true;

            const creds = await getCreds();
            if (!creds?.accessToken) {
                connectingRef.current = false;
                return;
            }

            const resolvedId = extractUserIdFromToken(creds.accessToken);
            if (resolvedId && resolvedId !== userIdRef.current) {
                userIdRef.current = resolvedId;
                if (mountedRef.current) setUserId(resolvedId);
            }

            if (socketRef.current) {
                try { socketRef.current.removeAllListeners(); } catch (e) {}
                try { socketRef.current.disconnect(); } catch (e) {}
                socketRef.current = null;
            }

            const socket = socketIO(assets.url, {
                auth: { token: creds.accessToken },
                transports: ['websocket', 'polling'],
                reconnection: false,
                timeout: 20000,
            });

            socketRef.current = socket;

            socket.on('connect', () => {
                console.log('🟢 [Socket] Conectat:', socket.id);
                connectingRef.current = false;
                reconnectAttemptsRef.current = 0;
                tokenRefreshAttemptsRef.current = 0;
                clearReconnectTimer();
                if (mountedRef.current) setSocketConnected(true);
                fetchUnreadChatCount();
                fetchUnreadCount();
            });

            socket.on('disconnect', (reason) => {
                console.log('🔴 [Socket] Deconectat:', reason);
                connectingRef.current = false;
                if (mountedRef.current) setSocketConnected(false);

                if (reason !== 'io client disconnect') {
                    scheduleReconnect();
                }
            });

            socket.on('connect_error', async (err) => {
                console.log('❌ [Socket] Eroare conectare:', err?.message);
                connectingRef.current = false;
                if (mountedRef.current) setSocketConnected(false);

                if (socketRef.current === socket) {
                    try { socket.removeAllListeners(); } catch (e) {}
                    try { socket.disconnect(); } catch (e) {}
                    socketRef.current = null;
                }

                if (err?.message === 'TOKEN_INVALID' || err?.message === 'TOKEN_MISSING') {
                    if (tokenRefreshAttemptsRef.current >= 3) {
                        console.log('❌ [Socket] Token respins repetat, aștept backoff.');
                        scheduleReconnect();
                        return;
                    }
                    tokenRefreshAttemptsRef.current += 1;
                    console.log('🔄 [Socket] Token invalid, încerc refresh...');
                    try {
                        await axiosAuthGuard.get('/api/user/data');
                        await resolveUserIdFromCreds();
                    } catch (refreshErr) {
                        console.log('❌ [Socket] Refresh eșuat:', refreshErr?.message);
                    }
                    scheduleReconnect();
                    return;
                }

                scheduleReconnect();
            });

            socket.on('new_message', (message) => {
                if (!message) return;
                emitter.emit('socket_new_message', message);

                const conversationId = message.conversation_id ? String(message.conversation_id) : null;
                const activeConversation = activeChatConversationRef.current
                    ? String(activeChatConversationRef.current)
                    : null;
                const isInThisConversation = !!conversationId && conversationId === activeConversation;

                const sender = message.sender_id;
                const senderId = sender && typeof sender === 'object'
                    ? (sender._id ? String(sender._id) : null)
                    : (sender ? String(sender) : null);
                const senderName = sender && typeof sender === 'object' ? sender.username : null;

                const myId = userIdRef.current ? String(userIdRef.current) : null;
                const myName = usernameRef.current;

                const isOwnMessage = (myId && senderId)
                    ? senderId === myId
                    : (!!myName && !!senderName && senderName === myName);

                if (!isInThisConversation && !isOwnMessage) {
                    setUnreadChatCount(prev => Math.max(0, (Number(prev) || 0) + 1));
                    showInAppNotification(
                        senderName || 'Mesaj nou',
                        message.type === 'image'
                            ? '📷 Ți-a trimis o poză'
                            : message.type === 'sale_link'
                                ? `🚗 ${message.sale_preview?.title || 'Anunț'}`
                                : message.text,
                        () => {
                            if (!conversationId) return;
                            navigate('ChatTab', {
                                screen: 'ChatScreen',
                                params: {
                                    conversationId,
                                    participantName: senderName || '',
                                    participantIcon: (sender && typeof sender === 'object' ? sender.icon : '') || '',
                                    participantId: senderId,
                                }
                            });
                        }
                    );
                }
            });

            socket.on('conversation_updated', (data) => {
                emitter.emit('socket_conversation_updated', data);
            });

            socket.on('messages_read', (data) => {
                emitter.emit('socket_messages_read', data);
            });

            socket.on('typing_start', (data) => {
                emitter.emit('socket_typing_start', data);
            });

            socket.on('typing_stop', (data) => {
                emitter.emit('socket_typing_stop', data);
            });

            socket.on('message_deleted', (data) => {
                emitter.emit('socket_message_deleted', data);
            });

            socket.on('unread_count_updated', (data) => {
                emitter.emit('socket_unread_count_updated', data);
                if (data && typeof data.total === 'number') {
                    applyUnreadChatCount(data.total);
                }
            });

        } catch (error) {
            connectingRef.current = false;
            console.log('❌ [Socket] Eroare la connectSocket:', error?.message);
            scheduleReconnect();
        }
    }, [clearReconnectTimer, scheduleReconnect, fetchUnreadChatCount, fetchUnreadCount, applyUnreadChatCount, resolveUserIdFromCreds]);

    useEffect(() => { connectSocketRef.current = connectSocket; }, [connectSocket]);

    const disconnectSocket = useCallback(() => {
        clearReconnectTimer();
        reconnectAttemptsRef.current = 0;
        tokenRefreshAttemptsRef.current = 0;
        connectingRef.current = false;
        if (socketRef.current) {
            try { socketRef.current.removeAllListeners(); } catch (e) {}
            try { socketRef.current.disconnect(); } catch (e) {}
            socketRef.current = null;
            console.log('🔴 [Socket] Deconectat manual la logout.');
        }
        if (mountedRef.current) setSocketConnected(false);
    }, [clearReconnectTimer]);

    const syncPushToken = async () => {
        try {
            console.log("🔄 [Context] Încercăm sincronizarea token-ului FCM...");
            const token = await getFcmToken();
            
            if (token) {
                console.log("📱 [Context] Token găsit:", token.substring(0, 15) + "...");
                const res = await axiosAuthGuard.put('/api/users/save-push-token', { token });
                
                if (res.data.success) {
                    console.log("✅ [Context] Token salvat cu succes pe server!");
                } else {
                    console.log("⚠️ [Context] Serverul a refuzat token-ul:", res.data.message);
                }
            } else {
                console.log("❌ [Context] Nu s-a putut genera un token FCM.");
            }
        } catch (error) {
            console.log("❌ [Context] Eroare critică la sync token:", error?.message);
        }
    };

    const logInContext = async (accessToken, refreshToken, userUsername) => {
        try {
            await setCreds({ accessToken, refreshToken });
            const resolvedId = extractUserIdFromToken(accessToken);
            userIdRef.current = resolvedId;
            usernameRef.current = userUsername;
            setUserId(resolvedId);
            setUsername(userUsername);
            setIsLogged(true);
            isLoggedRef.current = true;
            await syncPushToken();
        } catch (error) {
            console.error("❌ Eroare la login context:", error);
        }
    };

    const logoutContext = async () => {
        try {
            const creds = await getCreds();
            if (creds && creds.refreshToken) {
                await axiosAuthGuard.post('/api/user/logout', { 
                    refreshToken: creds.refreshToken 
                });
            }
        } catch (error) {
            console.log("Logout server error:", error?.message);
        } finally {
            isLoggedRef.current = false;
            await clearFcmToken();
            disconnectSocket();
            await resetCreds();
            setUsername(null);
            setUserId(null);
            usernameRef.current = null;
            userIdRef.current = null;
            setIsLogged(false);
            setUnreadChatCount(0);
            setUnreadCount(0);
            activeChatConversationRef.current = null;
            activeChatTabRef.current = false;
            await signOutGoogle();
        }
    };

    const fetchTokens = async () => {
        const data = await getCreds();
        if (!data) return { accessToken: null, refreshToken: null };
        return { accessToken: data.accessToken, refreshToken: data.refreshToken };
    };

    const checkAuth = async () => {
        try {
            const creds = await getCreds();
            if (!creds || !creds.refreshToken) {
                setIsLogged(false);
                isLoggedRef.current = false;
                setAuthLoading(false);
                return;
            }

            const response = await axiosAuthGuard.get('/api/user/data');
            
            if (response.data.success) {
                const responseId = response.data.userId || response.data._id || response.data.id || null;
                const resolvedId = responseId ? String(responseId) : await resolveUserIdFromCreds();
                if (resolvedId) {
                    userIdRef.current = resolvedId;
                    setUserId(resolvedId);
                }
                usernameRef.current = response.data.username;
                setUsername(response.data.username);
                setIsLogged(true);
                isLoggedRef.current = true;
                await syncPushToken();
            } else {
                logoutContext();
            }
        } catch (error) {
            console.log("Auto-login failed:", error?.message);
            setIsLogged(false);
            isLoggedRef.current = false;
        } finally {
            setAuthLoading(false);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            clearReconnectTimer();
        };
    }, [clearReconnectTimer]);

    useEffect(() => {
        if (isLogged) {
            reconnectAttemptsRef.current = 0;
            tokenRefreshAttemptsRef.current = 0;
            resolveUserIdFromCreds();
            fetchUnreadCount();
            fetchUnreadChatCount();
            connectSocket();
        } else {
            disconnectSocket();
            setUnreadCount(0);
            setUnreadChatCount(0);
        }
    }, [isLogged, connectSocket, disconnectSocket, fetchUnreadCount, fetchUnreadChatCount, resolveUserIdFromCreds]);

    useEffect(() => {
        const handleAppStateChange = (nextState) => {
            if (nextState !== 'active') return;
            if (!isLoggedRef.current) return;
            reconnectAttemptsRef.current = 0;
            clearReconnectTimer();
            if (!socketRef.current || !socketRef.current.connected) {
                connectSocket();
            }
            fetchUnreadChatCount();
            fetchUnreadCount();
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            if (subscription && typeof subscription.remove === 'function') subscription.remove();
        };
    }, [connectSocket, clearReconnectTimer, fetchUnreadChatCount, fetchUnreadCount]);

    useEffect(() => {
        if (isLogged && pendingNotification && isNavReady) {
            console.log("🚀 [Context] Navigare executată:", pendingNotification);

            if (pendingNotification.type === 'NEW_MESSAGE') {
                const conversationId = pendingNotification.commentId;
                if (conversationId) {
                    navigate('ChatTab', {
                        screen: 'ChatScreen',
                        params: { conversationId: String(conversationId) }
                    });
                }
            } else if (pendingNotification.type === 'GRACE_PERIOD') {
                navigate('ProfileTab', {
                    screen: 'ProfileDrawer',
                    params: {
                        screen: 'Profile',
                        params: { initialTab: 'grace' }
                    }
                });}
            else {
                navigate('HomeTab', {
                    screen: 'MainScreen',
                    params: {
                        saleId: pendingNotification.saleId,
                        commentId: pendingNotification.commentId || null
                    }
                });
            }
            
            setPendingNotification(null);
            fetchUnreadCount();
        }
    }, [isLogged, pendingNotification, isNavReady, fetchUnreadCount]);


    useEffect(() => {
        checkAuth();
        
        const initNotifications = async () => {
            await requestUserPermission();
            
            console.log("🎧 [Context] Listener activat.");
            const unsubscribe = notificationListener((data) => {
                console.log("🔔 [Context] Notificare intrată în sistem:", data);
                setPendingNotification(data);
            });
            
            return unsubscribe;
        };

        let unsub;
        initNotifications().then(fn => unsub = fn);
        const unsubTokenRefresh = listenTokenRefresh(async (newToken) => {
            try {
                const creds = await getCreds();
                if (!creds?.accessToken) return;
                await axiosAuthGuard.put('/api/users/save-push-token', { token: newToken });
            } catch (e) {
                console.log('Sync push token (refresh) eșuat:', e?.message);
            }
        });
        
        return () => {
            if (typeof unsub === 'function') unsub();
            if (typeof unsubTokenRefresh === 'function') unsubTokenRefresh();
        };
    }, []);

    useEffect(() => {
        const handleNewNotification = () => {
            setUnreadCount(prev => Math.max(0, (Number(prev) || 0) + 1));
        };

        emitter.on('new_foreground_notification', handleNewNotification);

        return () => {
            emitter.off('new_foreground_notification', handleNewNotification);
        };
    }, []);

    const contextValue = {
        isLogged,
        setIsLogged,
        authLoading,
        url: assets.url,
        username,
        userId,
        logInContext,
        logoutContext,
        fetchTokens,
        setIsNavReady,
        draftSale,
        setDraftSale,
        unreadCount,
        setUnreadCount,
        fetchUnreadCount,
        unreadChatCount,
        setUnreadChatCount,
        fetchUnreadChatCount,
        socket: socketRef,
        socketConnected,    
        activeChatConversationRef,
        activeChatTabRef,
    };

    return(
        <Context.Provider value={contextValue}>
            {children}
        </Context.Provider>
    );
}
