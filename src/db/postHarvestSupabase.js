/**
 * postHarvestSupabase.js
 *
 * Supabase queries for the Post-Harvest Spoilage Risk feature.
 * Tables: crops (extended), post_harvest_risk_history
 */
import { supabase } from './supabase';

// ─── Fetch Crop with Storage Fields ──────────────────────────────────────────

/**
 * Fetch full crop record including storage fields.
 */
export const fetchCropWithStorage = async (cropId) => {
    const { data, error } = await supabase
        .from('crops')
        .select(`
            id,
            crop_name,
            growth_duration_days,
            water_requirement,
            optimal_storage_temp_min,
            optimal_storage_temp_max,
            moisture_sensitivity,
            shelf_life_days,
            storage_type
        `)
        .eq('id', cropId)
        .single();

    if (error) {
        console.error('fetchCropWithStorage error:', error);
        throw new Error(error.message);
    }
    return data;
};

// ─── Risk History ────────────────────────────────────────────────────────────

/**
 * Insert a new risk calculation record.
 */
export const insertRiskHistory = async (record) => {
    const { data, error } = await supabase
        .from('post_harvest_risk_history')
        .insert([record])
        .select()
        .single();

    if (error) {
        console.error('insertRiskHistory error:', error);
        // Non-critical — don't throw, just warn
        return null;
    }
    return data;
};

/**
 * Fetch last risk record for a user+crop.
 */
export const fetchLastRiskRecord = async (userPhone, cropId) => {
    const { data, error } = await supabase
        .from('post_harvest_risk_history')
        .select('*')
        .eq('user_phone', userPhone)
        .eq('crop_id', cropId)
        .order('calculated_on', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // no rows
        console.warn('fetchLastRiskRecord error:', error.message);
        return null;
    }
    return data;
};

/**
 * Fetch risk history for a user+crop (last 10).
 */
export const fetchRiskHistory = async (userPhone, cropId) => {
    const { data, error } = await supabase
        .from('post_harvest_risk_history')
        .select('*')
        .eq('user_phone', userPhone)
        .eq('crop_id', cropId)
        .order('calculated_on', { ascending: false })
        .limit(10);

    if (error) {
        console.warn('fetchRiskHistory error:', error.message);
        return [];
    }
    return data || [];
};
