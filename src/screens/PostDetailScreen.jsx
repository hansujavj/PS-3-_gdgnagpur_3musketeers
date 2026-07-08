/**
 * PostDetailScreen.jsx
 *
 * View a specific community post and its replies.
 * Includes optimistic updates and an input field for adding new replies.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPostReplies, insertCommunityReply } from '../db/communitySupabase';

const PostDetailScreen = ({ route, navigation }) => {
    // The post object passed from CommunityScreen/Widget
    const { post } = route.params;

    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const flatListRef = useRef(null);

    useEffect(() => {
        loadReplies();
    }, [post.id]);

    const loadReplies = async () => {
        try {
            const data = await fetchPostReplies(post.id);
            setReplies(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Could not load replies. Pull to try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendReply = async () => {
        const textStr = replyText.trim();
        if (!textStr) return;

        setIsSubmitting(true);
        try {
            // Get user info from AsyncStorage
            const profileStr = await AsyncStorage.getItem('user-profile');
            if (!profileStr) throw new Error('User profile not found. Please log in again.');

            const profile = JSON.parse(profileStr);
            const userPhone = profile.phone || '';
            const userName = profile.name || 'Farmer';

            // Optimistic Update
            const tempId = `temp_${Date.now()}`;
            const optimisticReply = {
                id: tempId,
                post_id: post.id,
                user_phone: userPhone,
                user_name: userName,
                reply_text: textStr,
                created_at: new Date().toISOString(),
                isPending: true // custom flag for UI if needed
            };

            setReplies(prev => [...prev, optimisticReply]);
            setReplyText('');

            // Scroll to bottom immediately
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);

            // DB Insert
            const actualReply = await insertCommunityReply(post.id, userPhone, userName, textStr);

            if (actualReply) {
                // Replace temp optimistic reply with real from DB
                setReplies(prev => prev.map(r => r.id === tempId ? actualReply : r));
            }

        } catch (error) {
            console.error('Reply submit error:', error);
            Alert.alert('Send Failed', 'Could not post your reply.');
            // Revert optimistic insert ideally, but a full reload is safer:
            loadReplies();
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format date similarly
    const formatDate = (isoString) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.round(diffMs / 60000);

        if (diffMin < 60) return `${Math.max(1, diffMin)}m ago`;
        if (diffMin < 1440) return `${Math.round(diffMin / 60)}h ago`;

        const diffDays = Math.round(diffMin / 1440);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // ─── Render Items ─────────────────────────────────────────────────────────────

    // The question is rendered as the header of the FlatList
    const renderHeader = () => (
        <View style={styles.postContainer}>
            <View style={styles.postHeader}>
                <View style={[styles.avatarBox, { backgroundColor: '#e3f2fd' }]}>
                    <Text style={[styles.avatarText, { color: '#1976d2' }]}>
                        {post.user_name.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.userName}>{post.user_name}</Text>
                    <Text style={styles.timeText}>{formatDate(post.created_at)}</Text>
                </View>
            </View>
            <Text style={styles.questionText}>{post.question_text}</Text>

            <View style={styles.divider} />
            <Text style={styles.repliesCountLabel}>
                {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
            </Text>
        </View>
    );

    const renderReplyItem = ({ item }) => (
        <View style={[styles.replyCard, item.isPending && styles.replyPending]}>
            <View style={styles.replyHeader}>
                <View style={styles.avatarBoxSmall}>
                    <Text style={styles.avatarTextSmall}>{item.user_name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.replyUserName}>{item.user_name}</Text>
                <Text style={styles.replyTimeText}>{formatDate(item.created_at)}</Text>
            </View>
            <Text style={styles.replyText}>{item.reply_text}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Discussion</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#2e7d32" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={replies}
                    keyExtractor={item => item.id}
                    renderItem={renderReplyItem}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyTitle}>No replies yet</Text>
                            <Text style={styles.emptyMsg}>Be the first to help {post.user_name} out!</Text>
                        </View>
                    }
                />
            )}

            {/* Input Box fixed at bottom */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Write a reply..."
                        placeholderTextColor="#999"
                        value={replyText}
                        onChangeText={setReplyText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!replyText.trim() || isSubmitting) && styles.sendBtnDisabled]}
                        onPress={handleSendReply}
                        disabled={!replyText.trim() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={18} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// React Navigation implicitly wraps SafeAreas but it's good practice
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backBtn: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 20,
    },
    postContainer: {
        backgroundColor: '#fff',
        padding: 20,
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerText: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    timeText: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
    },
    questionText: {
        fontSize: 18,
        color: '#1a1a1a',
        lineHeight: 26,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginTop: 20,
        marginBottom: 16,
    },
    repliesCountLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    replyCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    replyPending: {
        opacity: 0.6,
    },
    replyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatarBoxSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    avatarTextSmall: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    replyUserName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#444',
        marginRight: 8,
    },
    replyTimeText: {
        fontSize: 12,
        color: '#999',
    },
    replyText: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
        paddingLeft: 36, // alight with text, past avatar
    },
    emptyBox: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#555',
        marginTop: 12,
        marginBottom: 4,
    },
    emptyMsg: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        minHeight: 40,
        maxHeight: 120,
        fontSize: 15,
        color: '#333',
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2e7d32',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
        marginBottom: 2, // align with input bottom visually
    },
    sendBtnDisabled: {
        backgroundColor: '#a5d6a7',
    },
});

export default PostDetailScreen;
