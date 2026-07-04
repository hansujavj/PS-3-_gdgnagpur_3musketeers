/**
 * supabase.js
 * Supabase client for farm details storage.
 */
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const SUPABASE_URL = Constants.expoConfig?.extra?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Insert farm details into Supabase
 */
export const insertFarmDetails = async (farmData) => {
    const { data, error } = await supabase
        .from('farm_details')
        .upsert([farmData], { onConflict: 'user_phone' });

    if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(error.message);
    }
    return data;
};

/**
 * Get farm details for a user by phone
 */
export const getFarmByPhone = async (phone) => {
    if (!phone) return null;
    const { data, error } = await supabase
        .from('farm_details')
        .select('*')
        .eq('user_phone', phone)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // no rows found
        console.warn('Supabase fetch error:', error.message);
        return null;
    }
    return data;
};
