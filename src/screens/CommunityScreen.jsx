/**
 * CommunityScreen.jsx
 *
 * Feed of questions from the community.
 * Users can view posts, see reply counts, and create new posts via floating action button (FAB).
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCommunityPosts, insertCommunityPost } from '../db/communitySupabase';

const CommunityScreen = ({ navigation }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Modal state for Ask Question
    const [modalVisible, setModalVisible] = useState(false);
    const [questionText, setQuestionText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadPosts(0, false);
    }, []);

    const loadPosts = async (pageNum = 0, isLoadMore = false) => {
        if (!isLoadMore) setLoading(pageNum === 0 && !refreshing);
        else setLoadingMore(true);

        try {
            const size = 15;
            const newPosts = await fetchCommunityPosts(pageNum, size);

            if (newPosts.length < size) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            if (isLoadMore) {
                setPosts(prev => [...prev, ...newPosts]);
            } else {
                setPosts(newPosts);
            }
            setPage(pageNum);
        } catch (error) {
            console.error(error);
            if (!isLoadMore) Alert.alert('Network Error', 'Could not load community posts. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadPosts(0, false);
    }, []);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            loadPosts(page + 1, true);
        }
    };

    const handleSubmitPost = async () => {
        const text = questionText.trim();
        if (text.length < 10) {
            Alert.alert('Too Short', 'Your question should be at least 10 characters long so others can understand.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Get user info from AsyncStorage
            const profileStr = await AsyncStorage.getItem('user-profile');
            if (!profileStr) throw new Error('User profile not found. Please log in again.');

            const profile = JSON.parse(profileStr);
            const userPhone = profile.phone || '';
            const userName = profile.name || 'Farmer';

            const newPost = await insertCommunityPost(userPhone, userName, text);

            if (newPost) {
                // Optimistically insert to top of list
                setPosts(prev => [{ ...newPost, reply_count: 0 }, ...prev]);
                setModalVisible(false);
                setQuestionText('');
            }
        } catch (error) {
            console.error('Submit error:', error);
            Alert.alert('Failed to Post', 'Could not submit your question. Check internet connection.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format date nicely like "2h ago" or "Oct 12"
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

        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    // ─── Render Items ─────────────────────────────────────────────────────────────

    const renderPostItem = ({ item }) => (
        <TouchableOpacity
            style={styles.postCard}
            onPress={() => navigation.navigate('PostDetail', { post: item })}
            activeOpacity={0.7}
        >
            <View style={styles.postHeader}>
                <View style={styles.avatarBox}>
                    <Text style={styles.avatarText}>{item.user_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.userName}>{item.user_name}</Text>
                    <Text style={styles.timeText}>{formatDate(item.created_at)}</Text>
                </View>
            </View>

            <Text style={styles.questionText} numberOfLines={3}>{item.question_text}</Text>

            <View style={styles.postFooter}>
                <View style={styles.footerIconBox}>
                    <Ionicons name="chatbubble-outline" size={16} color="#666" />
                    <Text style={styles.replyCount}>
                        {item.reply_count || 0} {item.reply_count === 1 ? 'reply' : 'replies'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const ListFooter = () => {
        if (!loadingMore) return <View style={{ height: 80 }} />; // Space for FAB
        return (
            <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color="#2e7d32" />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Expert Community</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* List */}
            {loading && !refreshing ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#2e7d32" />
                    <Text style={styles.loadingText}>Loading questions...</Text>
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={item => item.id}
                    renderItem={renderPostItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={<ListFooter />}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons name="people-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyTitle}>Be the first to ask!</Text>
                            <Text style={styles.emptyMsg}>There are no questions in the community yet. Ask for advice or share a problem.</Text>
                        </View>
                    }
                />
            )}

            {/* Floating Action Button (FAB) */}
            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
                <Ionicons name="add" size={28} color="#fff" />
                <Text style={styles.fabText}>Ask</Text>
            </TouchableOpacity>

            {/* Ask Question Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => !isSubmitting && setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Ask the Community</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} disabled={isSubmitting}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.textArea}
                            placeholder="Describe your farming issue, crop disease, or ask for advice (min 10 characters)..."
                            placeholderTextColor="#999"
                            multiline
                            textAlignVertical="top"
                            value={questionText}
                            onChangeText={setQuestionText}
                            autoFocus
                        />

                        <TouchableOpacity
                            style={[styles.submitBtn, (isSubmitting || questionText.trim().length < 10) && styles.submitBtnDisabled]}
                            onPress={handleSubmitPost}
                            disabled={isSubmitting || questionText.trim().length < 10}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.submitBtnText}>Post Question</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

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
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 15,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        zIndex: 10,
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
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
    listContent: {
        padding: 16,
    },
    postCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    headerText: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },
    timeText: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    questionText: {
        fontSize: 15,
        color: '#1a1a1a',
        lineHeight: 22,
        marginBottom: 12,
    },
    postFooter: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
    },
    footerIconBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    replyCount: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    footerLoading: {
        paddingVertical: 20,
        alignItems: 'center',
        height: 80,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        backgroundColor: '#2e7d32',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    fabText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 4,
    },
    emptyBox: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyMsg: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    textArea: {
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        minHeight: 120,
        color: '#333',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    submitBtn: {
        backgroundColor: '#2e7d32',
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CommunityScreen;
