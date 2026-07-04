/**
 * communitySupabase.js
 * Supabase queries for the Expert Community feature.
 * Uses phone-based auth pattern matching existing app architecture.
 */

import { supabase } from './supabase';

/**
 * Fetch latest 3 community posts with row count of replies
 * Used on Dashboard Widget.
 */
export const fetchLatestCommunityPosts = async (limit = 3) => {
    // Note: We use an inner join or parallel query to get reply counts.
    // In Supabase, the best way to get a count from a related table without
    // pulling all joined rows is to use a subquery/select with count.

    // We select posts, and format the reply_count via counting relationship
    const { data, error } = await supabase
        .from('community_posts')
        .select(`
            id,
            user_phone,
            user_name,
            question_text,
            created_at,
            community_replies ( count )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('fetchLatestCommunityPosts error:', error);
        throw new Error(error.message);
    }

    // Format the response to flatten the count
    return (data || []).map(post => ({
        ...post,
        reply_count: post.community_replies?.[0]?.count || 0,
        community_replies: undefined // cleanup
    }));
};

/**
 * Fetch paginated community posts with reply counts
 * Used on CommunityScreen.
 */
export const fetchCommunityPosts = async (page = 0, pageSize = 15) => {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
        .from('community_posts')
        .select(`
            id,
            user_phone,
            user_name,
            question_text,
            created_at,
            community_replies ( count )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('fetchCommunityPosts error:', error);
        throw new Error(error.message);
    }

    return (data || []).map(post => ({
        ...post,
        reply_count: post.community_replies?.[0]?.count || 0,
        community_replies: undefined
    }));
};

/**
 * Fetch all replies for a specific post.
 * Ordered oldest first to read like a conversation timeline.
 */
export const fetchPostReplies = async (postId) => {
    if (!postId) return [];

    const { data, error } = await supabase
        .from('community_replies')
        .select(`
            id,
            post_id,
            user_phone,
            user_name,
            reply_text,
            created_at
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true }); // oldest first

    if (error) {
        console.error('fetchPostReplies error:', error);
        throw new Error(error.message);
    }

    return data || [];
};

/**
 * Insert a new community post (Ask Question)
 */
export const insertCommunityPost = async (userPhone, userName, questionText) => {
    const { data, error } = await supabase
        .from('community_posts')
        .insert([{
            user_phone: userPhone,
            user_name: userName,
            question_text: questionText
        }])
        .select();

    if (error) {
        console.error('insertCommunityPost error:', error);
        throw new Error(error.message);
    }

    return data ? data[0] : null;
};

/**
 * Insert a reply to an existing post
 */
export const insertCommunityReply = async (postId, userPhone, userName, replyText) => {
    const { data, error } = await supabase
        .from('community_replies')
        .insert([{
            post_id: postId,
            user_phone: userPhone,
            user_name: userName,
            reply_text: replyText
        }])
        .select();

    // After success, we also trigger an auto update of `updated_at` on the post
    // so it bumps back to the top of the feed if we wanted to change the ordering to updated_at in the future.
    if (!error && data?.length > 0) {
        // Best effort bump, no block on UI
        supabase
            .from('community_posts')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', postId)
            .then(() => { });
    }

    if (error) {
        console.error('insertCommunityReply error:', error);
        throw new Error(error.message);
    }

    return data ? data[0] : null;
};
