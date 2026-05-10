import { useEffect, useState, useRef } from "react"
import { Context } from "./Context.js";
import { getCreds, resetCreds, setCreds } from "../helpers/keychainFunctions.js";
import axiosAuthGuard from '../helpers/axiosAuthGuard.js';
import { assets } from '../assets.js';
import { navigate } from '../helpers/NavigationService.js'; 
import { requestUserPermission, getFcmToken, notificationListener, listenTokenRefresh } from '../helpers/notificationHelper.js';
import { emitter } from "../helpers/eventBus.js";
import { io as socketIO } from 'socket.io-client';
import { showInAppNotification } from '../helpers/notificationHelper.js';

export default function ContextProvider({children}){

    const [isLogged, setIsLogged] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [username, setUsername] = useState(null);
    
    const [isNavReady, setIsNavReady] = useState(false); 
    const [pendingNotification, setPendingNotification] = useState(null); 

    const [unreadCount, setUnreadCount] = useState(0);

    const [unreadChatCount, setUnreadChatCount] = useState(0);

    const [draftSale, setDraftSale] = useState(null);

    const socketRef = useRef(null);

    const activeChatTabRef = useRef(false);

    const [socketConnected, setSocketConnected] = useState(false);

    const activeChatConversationRef = useRef(null);

    const connectSocket = async () => {
        try {
            const creds = await getCreds();
            if (!creds?.accessToken) return;

            if (socketRef.current) {
                if (socketRef.current.connected) return;
                socketRef.current.disconnect();
                socketRef.current = null;
            }

            const socket = socketIO(assets.url, {
                auth: { token: creds.accessToken },
                transports: ['websocket', 'polling'],
                reconnection: false,
            });

            socket.on('connect', () => {
                console.log('🟢 [Socket] Conectat:', socket.id);
                setSocketConnected(true); 
                fetchUnreadChatCount();
                fetchUnreadCount();
            });

            socket.on('disconnect', (reason) => {
                console.log('🔴 [Socket] Deconectat:', reason);
                setSocketConnected(false);

                if (reason !== 'io server disconnect' && reason !== 'io client disconnect') {
                    console.log('🔄 [Socket] Reconnect în 3s...');
                    setTimeout(() => {
                        connectSocket();
                    }, 3000);
                }
            });

            socket.on('connect_error', async (err) => {
                console.log('❌ [Socket] Eroare conectare:', err.message);
                setSocketConnected(false);

                if (err.message === 'TOKEN_INVALID' || err.message === 'TOKEN_MISSING') {
                    console.log('🔄 [Socket] Token invalid, încerc refresh...');
                    try {
                        await axiosAuthGuard.get('/api/user/data');
                        console.log('✅ [Socket] Token refresh reușit, reconectăm socket-ul...');
                        socket.disconnect();
                        socketRef.current = null;
                        setTimeout(() => {
                            connectSocket();
                        }, 500);
                    } catch (refreshErr) {
                        console.log('❌ [Socket] Refresh eșuat, userul va fi delogat:', refreshErr.message);
                    }
                    return;
                }

                console.log('🔄 [Socket] Retry conectare în 5s...');
                setTimeout(() => {
                    if (socketRef.current === socket) {
                        socket.disconnect();
                        socketRef.current = null;
                        connectSocket();
                    }
                }, 5000);
            });

            socket.on('new_message', (message) => {
                emitter.emit('socket_new_message', message);

                const isInThisConversation = activeChatConversationRef.current === message.conversation_id;
                const isOwnMessage = message.sender_id?.username === username;

                if (!isInThisConversation && !isOwnMessage) {
                    setUnreadChatCount(prev => prev + 1);
                    showInAppNotification(
                        message.sender_id?.username || 'Mesaj nou',
                        message.type === 'image' ? '📷 Ți-a trimis o poză' : message.type === 'sale_link' ? `🚗 ${message.sale_preview?.title || 'Anunț'}` : message.text,
                        () => {
                            navigate('ChatTab', {
                                screen: 'ChatScreen',
                                params: { conversationId: message.conversation_id }
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

            socketRef.current = socket;

        } catch (error) {
            console.log('❌ [Socket] Eroare la connectSocket:', error);
        }
    };

    const disconnectSocket = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocketConnected(false);
            console.log('🔴 [Socket] Deconectat manual la logout.');
        }
    };

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
            console.log("❌ [Context] Eroare critică la sync token:", error);
        }
    };

    const logInContext = async (accessToken, refreshToken, userUsername) => {
        try {
            await setCreds({ accessToken, refreshToken });
            setUsername(userUsername);
            setIsLogged(true);
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
            console.log("Logout server error:", error);
        } finally {
            disconnectSocket();
            await resetCreds();
            setUsername(null);
            setIsLogged(false);
            setUnreadChatCount(0);
            activeChatConversationRef.current = null;
        }
    };

    const fetchTokens = async () => {
        const data = await getCreds();
        if (!data) return { accessToken: null, refreshToken: null };
        return { accessToken: data.accessToken, refreshToken: data.refreshToken };
    };


    const fetchUnreadCount = async () => {
        try {
            const res = await axiosAuthGuard.get('/api/notifications/unread-count');
            if (res.data.success) {
                setUnreadCount(res.data.unreadCount);
            }
        } catch (error) {
            console.log("❌ Eroare la preluarea unread count:", error);
        }
    };

    const fetchUnreadChatCount = async () => {
        try {
            const res = await axiosAuthGuard.get('/api/chat/unread-count');
            if (res.data.success) {
                setUnreadChatCount(res.data.unreadCount);
            }
        } catch (error) {
            console.log("❌ Eroare la preluarea unread chat count:", error);
        }
    };

    const checkAuth = async () => {
        try {
            const creds = await getCreds();
            if (!creds || !creds.refreshToken) {
                setIsLogged(false);
                setAuthLoading(false);
                return;
            }

            const response = await axiosAuthGuard.get('/api/user/data');
            
            if (response.data.success) {
                setIsLogged(true);
                setUsername(response.data.username);
                await syncPushToken();
            } else {
                logoutContext();
            }
        } catch (error) {
            console.log("Auto-login failed:", error);
            setIsLogged(false);
        } finally {
            setAuthLoading(false);
        }
    };

    useEffect(() => {
        if (isLogged) {
            fetchUnreadCount();
            fetchUnreadChatCount();
            connectSocket();
        } else {
            setUnreadCount(0);
            setUnreadChatCount(0);
        }
    }, [isLogged]);

    useEffect(() => {
        if (isLogged && pendingNotification && isNavReady) {
            console.log("🚀 [Context] Navigare executată:", pendingNotification);

            if (pendingNotification.type === 'NEW_MESSAGE') {
                const conversationId = pendingNotification.commentId;
                if (conversationId) {
                    navigate('ChatTab', {
                        screen: 'ChatScreen',
                        params: { conversationId }
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
    }, [isLogged, pendingNotification, isNavReady]);


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
            await axiosAuthGuard.put('/api/users/save-push-token', { token: newToken });
        });
        
        return () => {
            if (typeof unsub === 'function') unsub();
            unsubTokenRefresh();
        };
    }, []);

    useEffect(() => {
        const handleNewNotification = () => {
            setUnreadCount(prev => prev + 1);
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