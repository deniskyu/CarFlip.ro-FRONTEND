import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    Pressable,
    TextInput,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { Image as CompressorImage } from 'react-native-compressor';
import { launchImageLibrary } from 'react-native-image-picker';
import axiosAuthGuard from '../../helpers/axiosAuthGuard.js';
import { formatMessageTime, uploadChatImage } from '../../helpers/chatHelper.js';
import { emitter } from '../../helpers/eventBus.js';
import { Context } from '../../context/Context.js';
import { assets } from '../../assets.js';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';


const COLORS = {
    primary: '#800000',
    secondary: '#081539',
    background: '#F5F5F5',
    white: '#FFFFFF',
    text: '#333333',
    border: '#E0E0E0',
    placeholder: '#999999',
    disabled: '#F0F0F0'
};

const REPORT_REASONS = [
    'Spam sau reclame',
    'Conținut obscen sau ofensator',
    'Hărțuire sau intimidare',
    'Limbaj de ură',
    'Alt motiv',
];

export default function ChatScreen({ route, navigation }) {
    const { conversationId, participantName, participantIcon, participantId } = route.params;

    const { socket, socketConnected, fetchUnreadChatCount, activeChatConversationRef, setUnreadChatCount } = useContext(Context);

    const [resolvedParticipantName, setResolvedParticipantName] = useState(participantName || '');
    const [resolvedParticipantIcon, setResolvedParticipantIcon] = useState(participantIcon || '');
    const [resolvedParticipantId, setResolvedParticipantId] = useState(participantId || null);
    const [resolvingParticipant, setResolvingParticipant] = useState(false);

    useEffect(() => {
        if (participantId && participantName && participantIcon) return;

        const resolveParticipant = async () => {
            setResolvingParticipant(true);
            try {
                const res = await axiosAuthGuard.get('/api/chat/conversations');
                if (res.data.success) {
                    const conv = res.data.data.find(c => c._id === conversationId);
                    if (conv?.participant) {
                        setResolvedParticipantName(conv.participant.username || '');
                        setResolvedParticipantIcon(conv.participant.icon || '');
                        setResolvedParticipantId(conv.participant._id || null);
                    }
                }
            } catch (err) {
                console.log('❌ Eroare resolve participant:', err);
            } finally {
                setResolvingParticipant(false);
            }
        };

        resolveParticipant();
    }, [conversationId, participantId, participantName, participantIcon]);

    const { activeChatTabRef } = useContext(Context);

    useFocusEffect(useCallback(() => {
        activeChatTabRef.current = true;
        return () => { activeChatTabRef.current = false; };
    }, []));

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const isFetchingMoreRef = useRef(false);

    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const isPickingRef = useRef(false);

    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const isTypingEmittedRef = useRef(false);

    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageViewerUrls, setImageViewerUrls] = useState([]);

    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [selectedReason, setSelectedReason] = useState(null);
    const [reportSending, setReportSending] = useState(false);

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [selectedMessageForDelete, setSelectedMessageForDelete] = useState(null);

    const flatListRef = useRef(null);

    const tabBarHeight = useBottomTabBarHeight();

    const fetchMessages = useCallback(async (cursor = null) => {
        try {
            if (cursor) {
                if (isFetchingMoreRef.current) return;
                isFetchingMoreRef.current = true;
                setLoadingMore(true);
            } else {
                setLoading(true);
            }

            const url = cursor
                ? `/api/chat/messages/${conversationId}?cursor=${cursor}`
                : `/api/chat/messages/${conversationId}`;

            const res = await axiosAuthGuard.get(url);

            if (res.data.success) {
                if (cursor) {
                    setMessages(prev => [...prev, ...res.data.data]);
                } else {
                    setMessages(res.data.data);
                }
                setHasMore(res.data.hasMore);
                setNextCursor(res.data.nextCursor);
            }
        } catch (err) {
            console.log('❌ Eroare fetch messages:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            isFetchingMoreRef.current = false;
        }
    }, [conversationId]);

    useFocusEffect(
        useCallback(() => {
            activeChatConversationRef.current = conversationId;

            fetchMessages();

            if (socketConnected) {
                socket.current.emit('join_conversation', conversationId);
                socket.current.emit('mark_read', { conversationId });
            }

            setTimeout(() => fetchUnreadChatCount(), 500);

            return () => {
                activeChatConversationRef.current = null;

                if (isTypingEmittedRef.current && socket?.current?.connected) {
                    socket.current.emit('typing_stop', { conversationId });
                    isTypingEmittedRef.current = false;
                }
            };
        }, [conversationId, socketConnected])
    );

    useEffect(() => {
        const handleNewMessage = (message) => {
            if (message.conversation_id !== conversationId) return;

            setMessages(prev => {
                if (prev.some(m => m._id === message._id)) return prev;
                return [...prev, message];
            });

            if (socket?.current?.connected) {
                socket.current.emit('mark_read', { conversationId });
            }
        };

        const handleTypingStart = (data) => {
            if (data.conversationId === conversationId && data.userId !== socket?.current?.userId) {
                setIsTyping(true);
            }
        };

        const handleTypingStop = (data) => {
            if (data.conversationId === conversationId) {
                setIsTyping(false);
            }
        };

        const handleMessagesRead = (data) => {
            if (data.conversationId !== conversationId) return;
            setMessages(prev =>
                prev.map(m => ({ ...m, is_read: true }))
            );
        };

        const handleMessageDeleted = (data) => {
            if (data.conversationId !== conversationId) return;
            setMessages(prev =>
                prev.map(m =>
                    m._id === data.messageId
                        ? { ...m, type: 'text', text: 'Acest mesaj a fost șters', image_url: null, image_public_id: null, is_deleted: true }
                        : m
                )
            );
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
    }, [conversationId]);

    useEffect(() => {
        if (!socket?.current) return;
        const handler = (data) => {
            emitter.emit('socket_message_deleted', data);
        };
        socket.current.on('message_deleted', handler);
        return () => {
            socket.current?.off('message_deleted', handler);
        };
    }, [socketConnected]);

    const handleTextChange = (value) => {
        setText(value);

        if (!socketConnected) return;

        if (!isTypingEmittedRef.current && value.trim().length > 0) {
            socket.current.emit('typing_start', { conversationId });
            isTypingEmittedRef.current = true;
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        if (value.trim().length === 0) {
            socket.current.emit('typing_stop', { conversationId });
            isTypingEmittedRef.current = false;
            return;
        }

        typingTimeoutRef.current = setTimeout(() => {
            if (socket?.current?.connected) {
                socket.current.emit('typing_stop', { conversationId });
                isTypingEmittedRef.current = false;
            }
        }, 2000);
    };

    const handleSendText = () => {
        if (!text.trim() || sending || !socketConnected) return;

        const trimmed = text.trim();
        setText('');
        setSending(true);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socket.current.emit('typing_stop', { conversationId });
        isTypingEmittedRef.current = false;

        socket.current.emit('send_message', { conversationId, text: trimmed }, (response) => {
            setSending(false);
            if (!response?.success) {
                setText(trimmed);
                Alert.alert('Eroare', response?.message || 'Mesajul nu a putut fi trimis.');
            }
        });
    };

    const handlePickImage = async () => {
        if (isPickingRef.current || uploadingImage) return;
        isPickingRef.current = true;

        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 1,
                quality: 1,
            });

            if (result.didCancel || result.errorCode || !result.assets?.length) return;

            const originalUri = result.assets[0].uri;
            setUploadingImage(true);

            const compressedUri = await CompressorImage.compress(originalUri, {
                quality: 0.8,
                maxWidth: 1200,
                maxHeight: 1200,
            });

            const imageFile = {
                uri: compressedUri,
                type: 'image/jpeg',
                name: `chat_${Date.now()}.jpg`,
            };

            const savedMessage = await uploadChatImage(imageFile, conversationId);

            if (socket?.current?.connected) {
                socket.current.emit('image_message_sent', {
                    conversationId,
                    messageId: savedMessage._id,
                });
            }

            setMessages(prev => {
                if (prev.some(m => m._id === savedMessage._id)) return prev;
                return [...prev, savedMessage];
            });

        } catch (err) {
            console.log('❌ Eroare upload imagine:', err);
            Alert.alert('Eroare', 'Nu s-a putut trimite imaginea.');
        } finally {
            setUploadingImage(false);
            isPickingRef.current = false;
        }
    };

    const openImageViewer = (imageUrl) => {
        setImageViewerUrls([{ url: imageUrl }]);
        setImageViewerVisible(true);
    };

    const handleLongPressMessage = (item, isOwn) => {
        if (!isOwn || item.is_deleted) return;
        setSelectedMessageForDelete(item);
        setDeleteModalVisible(true);
    };

    const handleDeleteMessage = async () => {
        if (!selectedMessageForDelete) return;
        setDeleteModalVisible(false);
        setMessages(prev =>
            prev.map(m =>
                m._id === selectedMessageForDelete._id
                    ? { ...m, type: 'text', text: 'Acest mesaj a fost șters', image_url: null, image_public_id: null, is_deleted: true }
                    : m
            )
        );

        try {
            await axiosAuthGuard.delete(`/api/chat/messages/${selectedMessageForDelete._id}`);
        } catch (err) {
            console.log('❌ Eroare delete mesaj:', err);
            setMessages(prev =>
                prev.map(m =>
                    m._id === selectedMessageForDelete._id
                        ? selectedMessageForDelete
                        : m
                )
            );
            Alert.alert('Eroare', 'Mesajul nu a putut fi șters.');
        } finally {
            setSelectedMessageForDelete(null);
        }
    };

    const handleReport = async () => {
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
            setReportModalVisible(false);
            setSelectedReason(null);
            Alert.alert('Mulțumim', 'Raportul a fost trimis cu succes.');
        } catch (err) {
            Alert.alert('Eroare', 'Nu s-a putut trimite raportul.');
        } finally {
            setReportSending(false);
        }
    };

    const handleLoadMore = () => {
        if (!hasMore || loadingMore || isFetchingMoreRef.current) return;
        fetchMessages(nextCursor);
    };

    const renderMessage = useCallback(({ item, index }) => {
        const isOwn = item.sender_id?._id !== resolvedParticipantId &&
            item.sender_id?._id !== undefined;

        const showTime = index === messages.length - 1 ||
            Math.abs(new Date(item.createdAt) - new Date(messages[index + 1]?.createdAt)) > 5 * 60 * 1000;

        if (item.is_deleted) {
            return (
                <View style={[
                    styles.messageWrapper,
                    isOwn ? styles.messageWrapperOwn : styles.messageWrapperOther
                ]}>
                    {!isOwn && (
                        <Image
                            source={resolvedParticipantIcon ? { uri: resolvedParticipantIcon } : assets.default_avatar}
                            style={styles.messageAvatar}
                        />
                    )}
                    <View style={styles.messageBubbleContainer}>
                        <View style={[
                            styles.messageBubble,
                            styles.deletedBubble,
                            isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther
                        ]}>
                            <Text style={styles.deletedText}>Acest mesaj a fost șters</Text>
                        </View>
                        {showTime && (
                            <View style={[
                                styles.messageMetaRow,
                                isOwn ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }
                            ]}>
                                <Text style={styles.messageTime}>
                                    {formatMessageTime(item.createdAt)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            );
        }

        return (
            <View style={[
                styles.messageWrapper,
                isOwn ? styles.messageWrapperOwn : styles.messageWrapperOther
            ]}>
                {!isOwn && (
                    <Image
                        source={resolvedParticipantIcon ? { uri: resolvedParticipantIcon } : assets.default_avatar}
                        style={styles.messageAvatar}
                    />
                )}

                <View style={styles.messageBubbleContainer}>
                    {item.type === 'image' ? (
                        <Pressable
                            onPress={() => openImageViewer(item.image_url)}
                            onLongPress={() => handleLongPressMessage(item, isOwn)}
                            delayLongPress={500}
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

                    {showTime && (
                        <View style={[
                            styles.messageMetaRow,
                            isOwn ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }
                        ]}>
                            <Text style={styles.messageTime}>
                                {formatMessageTime(item.createdAt)}
                            </Text>
                            {isOwn && (
                                <Text style={styles.messageReadStatus}>
                                    {item.is_read ? ' ✓✓' : ' ✓'}
                                </Text>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    }, [messages, resolvedParticipantId, resolvedParticipantIcon]);

    const renderTypingIndicator = () => {
        if (!isTyping) return null;
        return (
            <View style={styles.typingContainer}>
                <Image source={resolvedParticipantIcon ? { uri: resolvedParticipantIcon } : assets.default_avatar} style={styles.messageAvatar} />
                <View style={styles.typingBubble}>
                    <Text style={styles.typingText}>• • •</Text>
                </View>
            </View>
        );
    };

    if (resolvingParticipant && !resolvedParticipantId) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
                <View style={styles.header}>
                    <Pressable onPress={() => navigation.popToTop()} style={styles.backButton} hitSlop={10}>
                        <Image source={assets.back_arrow} style={styles.backIcon} />
                    </Pressable>
                    <View style={[styles.headerAvatar, { backgroundColor: COLORS.disabled }]} />
                    <View style={{ flex: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, marginRight: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />

            <View style={styles.header}>
                <Pressable onPress={() => navigation.navigate('ChatListScreen')} style={styles.backButton} hitSlop={10}>
                    <Image source={assets.back_arrow} style={styles.backIcon} />
                </Pressable>

                <Pressable 
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                    onPress={() => {
                        navigation.navigate('HomeTab', {
                            screen: 'SearchProfileResult',
                            params: {
                                userId: resolvedParticipantId
                            }
                        });
                    }}
                >
                    <Image source={resolvedParticipantIcon ? { uri: resolvedParticipantIcon } : assets.default_avatar} style={styles.headerAvatar} />
                    <Text style={styles.headerName} numberOfLines={1}>
                        {resolvedParticipantName}
                    </Text>
                </Pressable>

                <Pressable
                    style={styles.reportButton}
                    onPress={() => setReportModalVisible(true)}
                    hitSlop={10}
                >
                    <Text style={styles.reportDots}>⋮</Text>
                </Pressable>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={[...messages].reverse()}
                        keyExtractor={item => item._id}
                        renderItem={({ item, index }) =>
                            renderMessage({ item, index: messages.length - 1 - index })
                        }
                        inverted
                        contentContainerStyle={styles.messagesList}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.3}
                        ListFooterComponent={loadingMore
                            ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 10 }} />
                            : null
                        }
                        ListHeaderComponent={renderTypingIndicator}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    />
                )}

                <View style={styles.inputBar}>
                    <Pressable
                        style={[styles.galleryButton, uploadingImage && { opacity: 0.5 }]}
                        onPress={handlePickImage}
                        disabled={uploadingImage}
                    >
                        {uploadingImage
                            ? <ActivityIndicator size="small" color={COLORS.primary} />
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
                    />

                    <Pressable
                        style={[
                            styles.sendButton,
                            (!text.trim() || sending || !socketConnected) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSendText}
                        disabled={!text.trim() || sending || !socketConnected}
                    >
                        {sending
                            ? <ActivityIndicator size="small" color={COLORS.white} />
                            : <Image source={assets.send_icon} style={styles.sendIcon} />
                        }
                    </Pressable>
                </View>
            </KeyboardAvoidingView>

            <Modal
                visible={imageViewerVisible}
                transparent
                animationType="fade"
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
                    >
                        <Text style={styles.imageViewerCloseText}>✕</Text>
                    </Pressable>
                </View>
            </Modal>

            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
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
                                pressed && { backgroundColor: '#FFF5F5' }
                            ]}
                            onPress={handleDeleteMessage}
                        >
                            <Text style={styles.deleteSheetOptionText}>🗑  Șterge</Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.deleteSheetCancel,
                                pressed && { backgroundColor: '#EBEBEB' }
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

                        <View style={styles.reportHeader}>
                            <Image source={resolvedParticipantIcon ? { uri: resolvedParticipantIcon } : assets.default_avatar} style={styles.reportAvatar} />
                            <View>
                                <Text style={styles.reportTitle}>Raportează utilizatorul</Text>
                                <Text style={styles.reportSubtitle}>@{resolvedParticipantName}</Text>
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
                                    selectedReason === reason && { color: COLORS.primary, fontWeight: '600' }
                                ]}>
                                    {reason}
                                </Text>
                            </Pressable>
                        ))}

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
        backgroundColor: COLORS.background,
    },
    header: {
        backgroundColor: COLORS.secondary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 12,
    },
    backButton: {
        padding: 4,
        marginRight: 14,
    },
    backIcon: {
        width: 22,
        height: 22,
        tintColor: COLORS.white,
        resizeMode: 'contain',
    },
    headerAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        marginRight: 10,
        backgroundColor: COLORS.disabled,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    headerName: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.white,
    },
    reportButton: {
        padding: 8,
    },
    reportDots: {
        fontSize: 24,
        color: COLORS.white,
        lineHeight: 26,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messagesList: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    messageWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 3,
    },
    messageWrapperOwn: {
        justifyContent: 'flex-end',
    },
    messageWrapperOther: {
        justifyContent: 'flex-start',
    },
    messageAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: 6,
        backgroundColor: COLORS.disabled,
    },
    messageBubbleContainer: {
        maxWidth: '75%',
    },
    messageBubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
    },
    messageBubbleOwn: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    messageBubbleOther: {
        backgroundColor: COLORS.white,
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
    },
    deletedBubble: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    deletedText: {
        fontSize: 14,
        color: COLORS.placeholder,
        fontStyle: 'italic',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 21,
    },
    messageTextOwn: {
        color: COLORS.white,
    },
    messageTextOther: {
        color: COLORS.text,
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 14,
    },
    messageImageOwn: {
        borderBottomRightRadius: 4,
    },
    messageImageOther: {
        borderBottomLeftRadius: 4,
    },
    messageMetaRow: {
        flexDirection: 'row',
        marginTop: 3,
        paddingHorizontal: 2,
    },
    messageTime: {
        fontSize: 11,
        color: COLORS.placeholder,
    },
    messageReadStatus: {
        fontSize: 11,
        color: COLORS.placeholder,
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 4,
        paddingHorizontal: 12,
    },
    typingBubble: {
        backgroundColor: COLORS.white,
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 14,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
    },
    typingText: {
        fontSize: 16,
        color: COLORS.placeholder,
        letterSpacing: 2,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: COLORS.white,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    },
    galleryButton: {
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
        marginBottom: 2,
    },
    galleryIcon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    textInput: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 15,
        color: COLORS.text,
        maxHeight: 120,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        marginBottom: 2,
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.disabled,
    },
    sendIcon: {
        width: 18,
        height: 18,
        tintColor: COLORS.white,
        resizeMode: 'contain',
    },
    imageViewerClose: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 54 : 30,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#CC0000',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    imageViewerCloseText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    deleteSheet: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        paddingTop: 10,
        alignItems: 'center',
    },
    deleteSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.border,
        borderRadius: 2,
        marginBottom: 16,
    },
    deleteSheetOption: {
        width: '100%',
        paddingVertical: 18,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    deleteSheetOptionText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#D32F2F',
    },
    deleteSheetCancel: {
        width: '100%',
        paddingVertical: 18,
        alignItems: 'center',
        backgroundColor: COLORS.background,
        marginTop: 8,
    },
    deleteSheetCancelText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
    },
    reportModal: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        paddingTop: 12,
    },
    reportHandle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    reportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    reportAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        backgroundColor: COLORS.disabled,
    },
    reportTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.secondary,
    },
    reportSubtitle: {
        fontSize: 13,
        color: COLORS.placeholder,
        marginTop: 2,
    },
    reportDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 14,
    },
    reportReasonLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 10,
    },
    reportReasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 4,
        backgroundColor: COLORS.background,
    },
    reportReasonSelected: {
        backgroundColor: '#FFF0F0',
    },
    reportRadio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.border,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reportRadioSelected: {
        borderColor: COLORS.primary,
    },
    reportRadioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
    },
    reportReasonText: {
        fontSize: 15,
        color: COLORS.text,
    },
    reportActions: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 10,
    },
    reportCancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        alignItems: 'center',
    },
    reportCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    reportSubmitBtn: {
        flex: 2,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    reportSubmitText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.white,
    },
});