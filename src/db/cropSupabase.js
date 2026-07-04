/**
 * cropSupabase.js
 * Supabase queries for crop master table and user_selected_crops.
 *
 * NOTE: This app uses phone-based auth (not Supabase Auth).
 * user_selected_crops uses user_phone TEXT (matches farm_details pattern).
 */

import { supabase } from './supabase';

// ─── CROP MASTER QUERIES ─────────────────────────────────────────────────────

/**
 * Fetch all crops from master table (used for client-side filtering + manual dropdown)
 */
export const fetchAllCrops = async () => {
    const { data, error } = await supabase
        .from('crops')
        .select('*')
        .order('crop_name', { ascending: true });
    if (error) {
        console.error('fetchAllCrops error:', error);
        throw new Error(error.message);
    }
    return data || [];
};

// ─── USER SELECTED CROPS QUERIES ─────────────────────────────────────────────

/**
 * Insert selected crops for the user.
 * @param {Array} cropInserts - array of row objects for user_selected_crops
 *   Each row: { user_phone, crop_id, sowing_date, predicted_harvest_date,
 *               irrigation_type, last_irrigation_date }
 */
export const insertUserSelectedCrops = async (cropInserts) => {
    const { data, error } = await supabase
        .from('user_selected_crops')
        .insert(cropInserts)
        .select();

    if (error) {
        console.error('insertUserSelectedCrops error:', error);
        throw new Error(error.message);
    }
    return data;
};

/**
 * Check if the user has already selected crops (by phone number).
 * @param {string} userPhone
 * @returns {boolean}
 */
export const hasUserSelectedCrops = async (userPhone) => {
    if (!userPhone) return false;
    const { data, error } = await supabase
        .from('user_selected_crops')
        .select('id')
        .eq('user_phone', userPhone)
        .limit(1);

    if (error) {
        console.warn('hasUserSelectedCrops error:', error.message);
        return false;
    }
    return data && data.length > 0;
};

/**
 * Fetch user's selected crops with crop details joined.
 * @param {string} userPhone
 */
export const fetchUserSelectedCrops = async (userPhone) => {
    if (!userPhone) return [];
    const { data, error } = await supabase
        .from('user_selected_crops')
        .select(`
            id,
            sowing_date,
            predicted_harvest_date,
            irrigation_type,
            last_irrigation_date,
            created_at,
            crops (
                id,
                crop_name,
                growth_duration_days,
                water_requirement
            )
        `)
        .eq('user_phone', userPhone);

    if (error) {
        console.error('fetchUserSelectedCrops error:', error);
        return [];
    }
    return data || [];
};

/**
 * Delete all user_selected_crops for a user (used before re-inserting on re-selection).
 * @param {string} userPhone
 */
export const deleteUserSelectedCrops = async (userPhone) => {
    if (!userPhone) return;
    const { error } = await supabase
        .from('user_selected_crops')
        .delete()
        .eq('user_phone', userPhone);
    if (error) {
        console.error('deleteUserSelectedCrops error:', error);
        throw new Error(error.message);
    }
};
