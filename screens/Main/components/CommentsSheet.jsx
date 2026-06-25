import React, { useState, useRef, useEffect } from 'react';
import { 
    View, 
    StyleSheet, 
    FlatList, 
    Pressable, 
    Dimensions, 
    Image,
    Platform,
    Alert,
    Animated,
    Modal,
    PanResponder,
    KeyboardAvoidingView,
    ActivityIndicator,
    Keyboard,
    RefreshControl,
    ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { assets } from '../../../assets.js';
import axiosAuthGuard from '../../../helpers/axiosAuthGuard.js';
import ReportModal from './ReportModal.jsx';
import Shimmer from '../../../helpers/skeletons/Shimmer.jsx';

import {Text, TextInput} from '../../../helpers/AppText.jsx';

const { height, width } = Dimensions.get('window');

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
};

const SKELETON_BASE = '#32383F';
const SKELETON_HIGHLIGHT = '#3C424B';

const MODAL_HEIGHT_PERCENT = 0.8; 
const TOP_OFFSET = height * (1 - MODAL_HEIGHT_PERCENT); 

const COMMENT_SKELETON_ITEM_HEIGHT = 80;

const CommentSkeleton = () => (
    <View style={skeletonStyles.row}>
        <Shimmer width={36} height={36} borderRadius={18} style={skeletonStyles.avatar} baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT} />
        <View style={skeletonStyles.content}>
            <View style={skeletonStyles.headerRow}>
                <Shimmer width={80} height={11} borderRadius={4} baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT} />
                <Shimmer width={40} height={9} borderRadius={4} style={skeletonStyles.timeAgo} baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT} />
            </View>
            <Shimmer width="95%" height={12} borderRadius={4} style={skeletonStyles.line1} baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT} />
            <Shimmer width="65%" height={12} borderRadius={4} style={skeletonStyles.line2} baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT} />
            <Shimmer width={50} height={10} borderRadius={4} style={skeletonStyles.replyBtn} baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT} />
        </View>
        <View style={skeletonStyles.likeCol}>
            <Shimmer width={14} height={14} borderRadius={7} baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT} />
            <Shimmer width={16} height={9} borderRadius={4} style={skeletonStyles.likeCount} baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT} />
        </View>
    </View>
);

const CommentListSkeleton = () => {
    const sheetBodyHeight = height * MODAL_HEIGHT_PERCENT - 120;
    const count = Math.ceil(sheetBodyHeight / COMMENT_SKELETON_ITEM_HEIGHT);
    const items = [];
    for (let i = 0; i < count; i++) {
        items.push(<CommentSkeleton key={i} />);
    }
    return (
        <ScrollView pointerEvents="none" showsVerticalScrollIndicator={false}>
            {items}
        </ScrollView>
    );
};

const skeletonStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        alignItems: 'flex-start',
    },
    avatar: {
        marginRight: 12,
        marginTop: 2,
    },
    content: {
        flex: 1,
        marginRight: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 8,
    },
    timeAgo: {
        marginLeft: 6,
    },
    line1: {
        marginBottom: 5,
    },
    line2: {
        marginBottom: 7,
    },
    replyBtn: {
        marginTop: 2,
    },
    likeCol: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 5,
        width: 30,
    },
    likeCount: {
        marginTop: 4,
    },
});

const timeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `acum ${diffInSeconds} sec`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `acum ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `acum ${diffInHours} ore`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `acum ${diffInDays} zile`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `acum ${diffInWeeks} săpt`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `acum ${diffInMonths} luni`;
    const diffInYears = Math.floor(diffInDays / 365);
    return `acum ${diffInYears} ani`;
};

const ToastNotification = ({ message, visible, type }) => {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
                Animated.delay(1000), 
                Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true })
            ]).start();
        }
    }, [visible, message]);

    if (!visible) return null;
    const backgroundColor = type === 'danger' ? '#D32F2F' : '#800000';

    return (
        <Animated.View style={[styles.toastContainer, { opacity, backgroundColor }]}>
            <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
    );
};

const CommentItem = React.memo(({ comment, onReply, onLongPress, selectedCommentId, saleId, refreshTrigger, showToast, onNavigateProfile }) => {
    const [expanded, setExpanded] = useState(false);
    const [liked, setLiked] = useState(comment.has_liked || false);
    const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
    
    const [replies, setReplies] = useState([]);
    const [showReplies, setShowReplies] = useState(false);
    const [loadingReplies, setLoadingReplies] = useState(false);
    

    const lastTap = useRef(0);
    const containerRef = useRef(null);
    const isHighlighted = selectedCommentId === comment._id;

    useEffect(() => {
        if (refreshTrigger === comment._id) {
            fetchReplies(true);
        }
    }, [refreshTrigger]);

    const MAX_LENGTH = 120;
    const shouldTruncate = comment.text.length > MAX_LENGTH;
    const displayText = expanded || !shouldTruncate ? comment.text : `${comment.text.substring(0, MAX_LENGTH)}...`;

    const handleLike = async () => {
        const newLikedState = !liked;
        setLiked(newLikedState);
        setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);

        try {
            await axiosAuthGuard.post('/api/sales/comment/like', { comment_id: comment._id });
        } catch (error) {
            setLiked(!newLikedState);
            setLikesCount(prev => !newLikedState ? prev + 1 : prev - 1);
            showToast("Eroare la like", "danger");
        }
    };

    const handleProfilePress = () => {
        const userId = comment.user_id && comment.user_id._id ? comment.user_id._id : comment.user_id;
        if (userId && onNavigateProfile) {
            onNavigateProfile(userId);
        }
    };

    const handleDoubleTap = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
            if (!liked) handleLike();
        } else {
            lastTap.current = now;
        }
    };

    const handleReplyPress = () => {
        if (containerRef.current) {
            containerRef.current.measure((x, y, width, height, pageX, pageY) => {
                onReply(comment, pageY); 
            });
        } else {
            onReply(comment, 0);
        }
    };

    const fetchReplies = async (forceObj = false) => {
        if (showReplies && !forceObj) {
            setShowReplies(false);
            return;
        }
        
        setLoadingReplies(true);
        setShowReplies(true);
        try {
            const response = await axiosAuthGuard.get(`/api/sales/comments/${saleId}?parent_id=${comment._id}`);
            if (response.data.success) {
                setReplies(response.data.data);
            }
        } catch (error) {
            showToast("Nu s-au putut încărca răspunsurile", "danger");
        } finally {
            setLoadingReplies(false);
        }
    };

    return (
        <View style={styles.commentTreeContainer}>
            <View 
                ref={containerRef}
                collapsable={false}
                style={[styles.commentRowContainer, isHighlighted && styles.highlightedRow]}
            >
                <View style={styles.commentRow}>
                    <Pressable onPress={handleProfilePress}>
                        <Image 
                            source={comment.user_image ? { uri: comment.user_image } : assets.default_profile} 
                            style={styles.commentAvatar} 
                        />
                    </Pressable>
                    
                    <Pressable 
                        style={styles.commentContent} 
                        onPress={handleDoubleTap}
                        onLongPress={() => onLongPress(comment)}
                        delayLongPress={300}
                        activeOpacity={1}
                    >
                        <View style={styles.commentHeaderRow}>
                            <Pressable onPress={handleProfilePress}>
                                <Text style={styles.commentUser}>{comment.user_name || 'Utilizator'}</Text>
                            </Pressable>
                            <Text style={styles.timeAgoText}>{timeAgo(comment.createdAt)}</Text>
                        </View>

                        <Text style={styles.commentText}>{displayText}</Text>
                        
                        <View style={styles.actionRow}>
                            <Pressable onPress={handleReplyPress} hitSlop={10}>
                                <Text style={styles.replyButtonText}>Răspunde</Text>
                            </Pressable>

                            {shouldTruncate && (
                                <Pressable onPress={() => setExpanded(!expanded)} style={{marginLeft: 15}} hitSlop={10}>
                                    <Text style={styles.seeMoreText}>
                                        {expanded ? "Vezi mai puțin" : "Vezi mai mult"}
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </Pressable>
                    
                    <Pressable style={[styles.commentLikeContainer, styles.iconShadow]} onPress={handleLike} hitSlop={10}>
                        <Image 
                            source={assets.red_like_icon} 
                            style={[
                                styles.commentLikeIconBase, 
                                liked ? styles.commentLikeIconLiked : styles.commentLikeIconUnliked
                            ]} 
                        />
                        <Text style={styles.commentLikeCount}>{likesCount}</Text>
                    </Pressable>
                </View>

                {comment.reply_count > 0 && (
                    <Pressable onPress={() => fetchReplies(false)} style={styles.viewRepliesContainer}>
                        <View style={[styles.horizontalLine, { marginRight: 10 }]} />
                        <Text style={styles.viewRepliesText}>
                            {showReplies ? "Ascunde răspunsurile" : `Vezi ${comment.reply_count} ${comment.reply_count === 1 ? 'răspuns' : 'răspunsuri'}`}
                        </Text>
                    </Pressable>
                )}
            </View>

            {showReplies && (
                <View style={styles.repliesContainer}>
                    {loadingReplies && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginBottom: 10 }} />}
                    {replies.map(reply => (
                        <CommentItem 
                            key={reply._id} 
                            comment={reply} 
                            onReply={onReply} 
                            onLongPress={onLongPress}
                            selectedCommentId={selectedCommentId}
                            saleId={saleId}
                            refreshTrigger={null}
                            showToast={showToast}
                            onNavigateProfile={onNavigateProfile} 
                        />
                    ))}
                </View>
            )}
        </View>
    );
});

const CommentsSheet = ({ visible, onClose, saleId, onCommentAdded, postAuthorId, currentUserId, targetCommentId }) => {
    const [commentsList, setCommentsList] = useState([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [myUserId, setMyUserId] = useState(currentUserId || null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    
    const [replyingTo, setReplyingTo] = useState(null);
    const [refreshParentId, setRefreshParentId] = useState(null);

    const [selectedComment, setSelectedComment] = useState(null);
    const [highlightedCommentId, setHighlightedCommentId] = useState(null);
    
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');

    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportTarget, setReportTarget] = useState({ id: null, type: 'comment' });

    const hasScrolledToTarget = useRef(false);

    const inputRef = useRef(null);
    const flatListRef = useRef(null);
    const slideAnim = useRef(new Animated.Value(height)).current;
    const currentScrollOffset = useRef(0);
    const isLoadingMoreRef = useRef(false);

    const navigation = useNavigation(); 

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150) {
                    handleClose();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 5
                    }).start();
                }
            }
        })
    ).current;

    useEffect(() => {
        if (visible) {
            setCommentsList([]);
            setHasMore(true);
            hasScrolledToTarget.current = false;
            fetchComments(1, targetCommentId); 
            
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 4
            }).start();
        } else {
            setReplyingTo(null);
            setNewCommentText('');
            setSelectedComment(null);
        }
    }, [visible, targetCommentId]);

    useEffect(() => {
        if (visible && targetCommentId && commentsList.length > 0) {
            if (hasScrolledToTarget.current) return;

            const index = commentsList.findIndex(c => c._id === targetCommentId);
            
            if (index !== -1) {
                hasScrolledToTarget.current = true;

                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({
                        index: index,
                        animated: true,
                        viewPosition: 0.5 
                    });
                    
                    setHighlightedCommentId(targetCommentId);
                    
                    setTimeout(() => {
                        setHighlightedCommentId(null);
                    }, 2000);
                }, 500);
            }
        }
    }, [visible, targetCommentId, commentsList]);

    const handleNavigateProfile = (userId) => {
        handleClose();
        navigation.navigate('SearchProfileResult', { userId });
    };

    const showToast = (msg, type = 'success') => {
        setToastMessage(msg);
        setToastType(type);
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 2000); 
    };

    const handleClose = () => {
        Keyboard.dismiss();
        Animated.timing(slideAnim, {
            toValue: height,
            duration: 250,
            useNativeDriver: true
        }).start(() => {
            onClose();
        });
    };

    const fetchComments = async (pageToFetch = 1, targetId = null) => {
        if (pageToFetch > 1 && !hasMore) return;

        setIsLoadingComments(true);
        try {
            let url = `/api/sales/comments/${saleId}?page=${pageToFetch}&limit=20`;
            
            if (targetId) {
                url += `&target_comment_id=${targetId}`;
            }

            const response = await axiosAuthGuard.get(url);
            
            if (response.data.success) {
                const receivedPage = response.data.page || pageToFetch;
                setCurrentPage(receivedPage);
                setHasMore(response.data.hasMore);

                if (response.data.currentUserId) {
                    setMyUserId(response.data.currentUserId);
                }

                if (pageToFetch === 1 || targetId) {
                    setCommentsList(response.data.data);
                } else {
                    setCommentsList(prev => {
                        const newItems = response.data.data.filter(
                            newItem => !prev.some(existing => existing._id === newItem._id)
                        );
                        return [...prev, ...newItems];
                    });
                }
            }
        } catch (error) {
            showToast("Eroare la încărcare", "danger");
        } finally {
            setIsLoadingComments(false);
            isLoadingMoreRef.current = false;
        }
    };

    const handleLoadMore = () => {
        if (isLoadingMoreRef.current || !hasMore) return;
        isLoadingMoreRef.current = true;
        fetchComments(currentPage + 1);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setHasMore(true);
        hasScrolledToTarget.current = false; 
        try {
            setCommentsList([]);
            await fetchComments(1);
        } catch (error) {
            showToast("Eroare la reîmprospătare", "danger");
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleReply = (comment, itemPageY) => {
        const rootId = comment.parent_id ? comment.parent_id : comment._id;
        
        setReplyingTo({
            root_id: rootId,
            username: comment.user_name
        });
        
        setNewCommentText(`@${comment.user_name} `);
        inputRef.current?.focus();

        if (itemPageY) {
            const targetScreenY = TOP_OFFSET + 70; 
            const delta = itemPageY - targetScreenY; 
            const newOffset = currentScrollOffset.current + delta;

            setTimeout(() => {
                flatListRef.current?.scrollToOffset({ 
                    offset: Math.max(0, newOffset), 
                    animated: true 
                });
            }, 100);
        }
    };

    const handleSendComment = async () => {
        if (!newCommentText.trim()) return;

        let parentIdToSend = null;
        if (replyingTo) {
            parentIdToSend = replyingTo.root_id; 
        }

        const textToSend = newCommentText.trim();
        setNewCommentText('');
        setReplyingTo(null);
        Keyboard.dismiss();

        try {
            const response = await axiosAuthGuard.post('/api/sales/comment', {
                sale_id: saleId,
                text: textToSend,
                parent_id: parentIdToSend
            });

            if (response.data.success) {
                if (onCommentAdded) onCommentAdded(); 
                showToast("Comentariu adăugat");

                if (parentIdToSend) {
                    setRefreshParentId(parentIdToSend);
                    setTimeout(() => setRefreshParentId(null), 500);
                } else {
                    setHasMore(true);
                    fetchComments(1);
                }
            }
        } catch (error) {
            showToast("Eroare la trimitere", "danger");
        }
    };

    const handleLongPress = (comment) => {
        setSelectedComment(comment);
    };

    const closeOptions = () => {
        setSelectedComment(null);
    };

    const handleDelete = async () => {
        if (!selectedComment) return;
        const commentId = selectedComment._id;
        const parentId = selectedComment.parent_id;
        
        closeOptions(); 

        try {
            const response = await axiosAuthGuard.delete(`/api/sales/comment/${commentId}`);
            if (response.data.success) {
                showToast("Comentariu șters");
                
                if (parentId) {
                    setRefreshParentId(parentId);
                    setTimeout(() => setRefreshParentId(null), 500);
                } else {
                    setHasMore(true);
                    fetchComments(1);
                }
            }
        } catch (error) {
            showToast("Nu s-a putut șterge", "danger");
        }
    };

    const handleReportPress = (id, type) => {
        setReportTarget({ id, type });
        setReportModalVisible(true);
    };

    const canDelete = selectedComment && myUserId && (
        String(selectedComment.user_id._id || selectedComment.user_id) === String(myUserId) || 
        String(postAuthorId) === String(myUserId)
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.modalBackdrop} onPress={handleClose} />
                
                <Animated.View 
                    style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}
                >
                    <View {...panResponder.panHandlers} style={styles.headerContainer}>
                        <View style={styles.handleContainer}>
                            <View style={styles.handleBar} />
                        </View>
                        <View style={styles.modalHeader}>
                            <View style={styles.emptyHeaderSpace} />
                            <Text style={styles.modalTitle}>Comentarii</Text>
                            <Pressable onPress={handleClose} style={styles.closeButton} hitSlop={15}>
                                <Text style={styles.closeButtonText}>✕</Text>
                            </Pressable>
                        </View>
                    </View>

                    <KeyboardAvoidingView 
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        enabled={Platform.OS === 'android' ? !visible : true}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={Platform.OS === "ios" ? TOP_OFFSET : 0} 
                    >
                        <View style={styles.commentsBody}>
                            {isLoadingComments && commentsList.length === 0 ? (
                                <CommentListSkeleton />
                            ) : commentsList.length === 0 ? (
                                <View style={styles.emptyCommentsContainer}>
                                    <Text style={styles.emptyCommentsText}>
                                        Nu există comentarii încă. Fii primul care scrie!
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    ref={flatListRef}
                                    data={commentsList}
                                    keyExtractor={(item) => item._id}
                                    onScroll={(e) => {
                                        currentScrollOffset.current = e.nativeEvent.contentOffset.y;
                                    }}
                                    scrollEventThrottle={16}
                                    renderItem={({ item }) => (
                                        <CommentItem 
                                            comment={item} 
                                            onReply={handleReply} 
                                            onLongPress={handleLongPress}
                                            selectedCommentId={highlightedCommentId || (selectedComment ? selectedComment._id : null)}
                                            saleId={saleId}
                                            refreshTrigger={refreshParentId}
                                            showToast={showToast}
                                            onNavigateProfile={handleNavigateProfile} 
                                        />
                                    )}
                                    style={styles.commentsList}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                    showsVerticalScrollIndicator={false}
                                    keyboardDismissMode="interactive"
                                    keyboardShouldPersistTaps="handled"
                                    onEndReached={handleLoadMore}
                                    onEndReachedThreshold={0.5}
                                    onScrollToIndexFailed={info => {
                                        const wait = new Promise(resolve => setTimeout(resolve, 500));
                                        wait.then(() => {
                                            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                                        });
                                    }}
                                    ListFooterComponent={
                                        isLoadingComments && commentsList.length > 0 ? (
                                            <ActivityIndicator size="small" color={COLORS.accent} style={{ marginVertical: 20 }} />
                                        ) : (
                                            <View style={{ height: 400 }} />
                                        )
                                    }
                                    refreshControl={
                                        <RefreshControl
                                            refreshing={isRefreshing}
                                            onRefresh={handleRefresh}
                                            tintColor={COLORS.accent}
                                        />
                                    }
                                />
                            )}
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                ref={inputRef}
                                style={styles.inputField}
                                placeholder={replyingTo ? `Răspunde lui @${replyingTo.username}...` : "Adaugă un comentariu..."}
                                placeholderTextColor={COLORS.placeholder}
                                value={newCommentText}
                                onChangeText={setNewCommentText}
                                multiline={true}
                                maxLength={1000}
                                returnKeyType="send"
                                onSubmitEditing={handleSendComment}
                                blurOnSubmit={true} 
                            />
                            <Pressable onPress={handleSendComment} style={styles.sendButton} hitSlop={10}>
                                <Image source={assets.send_icon} style={styles.sendIcon} />
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                    
                    {!!selectedComment && (
                        <Pressable style={styles.absoluteOptionsOverlay} onPress={closeOptions}>
                            <Animated.View style={styles.optionsCard}>
                                <View style={styles.handleContainer}>
                                    <View style={styles.handleBar} />
                                </View>
                                
                                {canDelete && (
                                    <Pressable style={styles.optionButton} onPress={handleDelete}>
                                        <Text style={[styles.optionText, { color: COLORS.accent, fontWeight: 'bold' }]}>Șterge</Text>
                                    </Pressable>
                                )}

                                <Pressable style={[styles.optionButton, { borderBottomWidth: 0 }]} onPress={() => {
                                    if (selectedComment) {
                                        const commentId = selectedComment._id;
                                        closeOptions();
                                        handleReportPress(commentId, 'comment');
                                    }
                                }}>
                                    <Text style={styles.optionText}>Raportează</Text>
                                </Pressable>
                            </Animated.View>
                        </Pressable>
                    )}

                    <ToastNotification message={toastMessage} visible={toastVisible} type={toastType} />

                </Animated.View>
                <ReportModal 
                    visible={reportModalVisible}
                    onClose={() => setReportModalVisible(false)}
                    reportType={reportTarget.type} 
                    reportId={reportTarget.id}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        height: `${MODAL_HEIGHT_PERCENT * 100}%`, 
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    headerContainer: {
        backgroundColor: COLORS.bg,
        zIndex: 10,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    handleBar: {
        width: 40,
        height: 5,
        backgroundColor: COLORS.borderStrong,
        borderRadius: 3,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    emptyHeaderSpace: {
        width: 30, 
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.text,
    },
    closeButton: {
        width: 30,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    closeButtonText: {
        fontSize: 18, 
        fontWeight: '600',
        color: COLORS.text,
    },
    commentsBody: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    emptyCommentsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyCommentsText: {
        color: COLORS.textMuted,
        fontSize: 14,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.bg,
        paddingBottom: Platform.OS === 'ios' ? 35 : 10, 
    },
    inputField: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        maxHeight: 100,
        marginRight: 10,
        fontSize: 14,
        color: COLORS.text
    },
    sendButton: {
        padding: 5,
    },
    sendIcon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
        tintColor: COLORS.accent
    },
    commentTreeContainer: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    commentRowContainer: {
        paddingVertical: 8, 
    },
    commentRow: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        paddingVertical: 6,
    },
    repliesContainer: {
        marginLeft: 48, 
    },
    highlightedRow: {
        backgroundColor: COLORS.surface, 
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
    },
    commentContent: {
        flex: 1,
        marginRight: 10,
    },
    commentHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 3,
        flexWrap: 'wrap'
    },
    commentUser: {
        fontSize: 13,
        fontWeight: 'bold',
        color: COLORS.text,
        marginRight: 8
    },
    timeAgoText: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
    commentText: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 20,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 6,
        alignItems: 'center',
    },
    seeMoreText: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: '500'
    },
    replyButtonText: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: '600',
    },
    viewRepliesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 0,
        paddingVertical: 8,
        paddingLeft: 60 
    },
    horizontalLine: {
        width: 20, 
        height: 1,
        backgroundColor: COLORS.borderStrong,
    },
    viewRepliesText: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '600',
    },
    commentLikeContainer: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 5,
        width: 30
    },
    iconShadow: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1, 
        shadowRadius: 1,
        elevation: 1, 
    },
    commentLikeIconBase: {
        resizeMode: 'contain',
        marginBottom: 2,
        width: 14,
        height: 14
    },
    commentLikeIconUnliked: {
        tintColor: COLORS.textMuted 
    },
    commentLikeIconLiked: {
        tintColor: COLORS.accent 
    },
    commentLikeCount: {
        fontSize: 10,
        color: COLORS.textMuted,
        marginTop: 2
    },
    absoluteOptionsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 100
    },
    optionsCard: {
        backgroundColor: COLORS.sheet,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        paddingTop: 10,
        width: '100%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    optionButton: {
        paddingVertical: 18,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        width: '100%'
    },
    optionText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text
    },
    toastContainer: {
        position: 'absolute',
        top: 100, 
        alignSelf: 'center',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 25,
        zIndex: 200,
        elevation: 10,
    },
    toastText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14
    },
    commentsList: {
        flex: 1,
        width: '100%',
    },
});

export default CommentsSheet;