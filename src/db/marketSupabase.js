/**
 * marketSupabase.js
 *
 * Supabase queries for the Market Price Prediction feature.
 * Table: crop_price_predictions
 */
import { supabase } from './supabase';

// ─── Cache Check ─────────────────────────────────────────────────────────────

/**
 * Check if a fresh prediction exists (< 24 hours old).
 *
 * @param {string} cropId - UUID of the crop
 * @param {string} targetDate - YYYY-MM-DD
 * @param {string} userPhone
 * @returns {Object|null} cached prediction or null
 */
export const getCachedPrediction = async (cropId, targetDate, userPhone) => {
    const { data, error } = await supabase
        .from('crop_price_predictions')
        .select('*')
        .eq('crop_id', cropId)
        .eq('target_date', targetDate)
        .eq('user_phone', userPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.warn('getCachedPrediction error:', error.message);
        return null;
    }

    if (!data) return null;

    // Check freshness: < 24 hours
    const createdAt = new Date(data.created_at).getTime();
    const now = Date.now();
    const diffHours = (now - createdAt) / (1000 * 60 * 60);

    if (diffHours < 24) {
        return { ...data, fromCache: true };
    }

    return null; // Stale — needs refresh
};

// ─── Upsert Prediction ──────────────────────────────────────────────────────

/**
 * Upsert a prediction (insert or update if same crop+date+user).
 *
 * @param {Object} prediction
 * @param {string} prediction.user_phone
 * @param {string} prediction.crop_id
 * @param {string} prediction.target_date
 * @param {number} prediction.predicted_price
 * @param {number} prediction.confidence
 * @param {string} prediction.trend
 * @returns {Object|null} inserted/updated row
 */
export const upsertPrediction = async (prediction) => {
    const { data, error } = await supabase
        .from('crop_price_predictions')
        .upsert(
            {
                ...prediction,
                created_at: new Date().toISOString(),
            },
            {
                onConflict: 'crop_id,target_date,user_phone',
            }
        )
        .select()
        .single();

    if (error) {
        console.error('upsertPrediction error:', error);
        return null;
    }
    return data;
};

// ─── Fetch History ───────────────────────────────────────────────────────────

/**
 * Fetch recent prediction history for a user (last 20).
 */
export const fetchPredictionHistory = async (userPhone) => {
    const { data, error } = await supabase
        .from('crop_price_predictions')
        .select(`
            *,
            crops (
                crop_name
            )
        `)
        .eq('user_phone', userPhone)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.warn('fetchPredictionHistory error:', error.message);
        return [];
    }
    return data || [];
};

/**
 * Fetch predictions for a specific crop (for trend chart).
 */
export const fetchCropPredictions = async (cropId, userPhone) => {
    const { data, error } = await supabase
        .from('crop_price_predictions')
        .select('*')
        .eq('crop_id', cropId)
        .eq('user_phone', userPhone)
        .order('target_date', { ascending: true })
        .limit(30);

    if (error) {
        console.warn('fetchCropPredictions error:', error.message);
        return [];
    }
    return data || [];
};
