/**
 * educatorSupabase.js
 *
 * All Supabase queries for the Educator module.
 * Tables: disease_education, government_schemes, subsidy_compensation
 * ALL read-only (no inserts from client).
 */
import { supabase } from './supabase';

// ─── Disease Education ────────────────────────────────────────────────────────

/**
 * Fetch all diseases, optionally filtered by crop_name.
 */
export const fetchDiseases = async (cropName = null) => {
    let query = supabase
        .from('disease_education')
        .select('*')
        .order('crop_name', { ascending: true });

    if (cropName) {
        query = query.ilike('crop_name', `%${cropName}%`);
    }

    const { data, error } = await query;
    if (error) {
        console.error('fetchDiseases error:', error);
        throw new Error(error.message);
    }
    return data || [];
};

/**
 * Search diseases by disease name or crop name.
 */
export const searchDiseases = async (searchTerm) => {
    const term = `%${searchTerm}%`;
    const { data, error } = await supabase
        .from('disease_education')
        .select('*')
        .or(`crop_name.ilike.${term},disease_name.ilike.${term}`)
        .order('crop_name', { ascending: true });

    if (error) {
        console.error('searchDiseases error:', error);
        throw new Error(error.message);
    }
    return data || [];
};

// ─── Government Schemes ───────────────────────────────────────────────────────

/**
 * Fetch all government schemes.
 * @param {string|null} relatedTo - filter by related_to ('crop_disease', 'insurance', 'equipment', 'general')
 */
export const fetchSchemes = async (relatedTo = null) => {
    let query = supabase
        .from('government_schemes')
        .select('*')
        .order('scheme_name', { ascending: true });

    if (relatedTo) {
        query = query.eq('related_to', relatedTo);
    }

    const { data, error } = await query;
    if (error) {
        console.error('fetchSchemes error:', error);
        throw new Error(error.message);
    }
    return data || [];
};

/**
 * Fetch schemes filtered by user's state.
 * state_applicable is TEXT[]; we match if it contains the state OR 'All India'.
 */
export const fetchSchemesByState = async (userState) => {
    if (!userState) return fetchSchemes();

    const { data, error } = await supabase
        .from('government_schemes')
        .select('*')
        .or(`state_applicable.cs.{${userState}},state_applicable.cs.{All India}`)
        .order('scheme_name', { ascending: true });

    if (error) {
        console.error('fetchSchemesByState error:', error);
        throw new Error(error.message);
    }
    return data || [];
};

/**
 * Search schemes by name or description.
 */
export const searchSchemes = async (searchTerm) => {
    const term = `%${searchTerm}%`;
    const { data, error } = await supabase
        .from('government_schemes')
        .select('*')
        .or(`scheme_name.ilike.${term},description.ilike.${term}`)
        .order('scheme_name', { ascending: true });

    if (error) {
        console.error('searchSchemes error:', error);
        throw new Error(error.message);
    }
    return data || [];
};

// ─── Subsidy / Compensation ──────────────────────────────────────────────────

/**
 * Fetch all compensation entries.
 */
export const fetchCompensation = async () => {
    const { data, error } = await supabase
        .from('subsidy_compensation')
        .select('*')
        .order('disease_name', { ascending: true });

    if (error) {
        console.error('fetchCompensation error:', error);
        throw new Error(error.message);
    }
    return data || [];
};

/**
 * Fetch compensation by disease name.
 */
export const fetchCompensationByDisease = async (diseaseName) => {
    const { data, error } = await supabase
        .from('subsidy_compensation')
        .select('*')
        .ilike('disease_name', `%${diseaseName}%`);

    if (error) {
        console.error('fetchCompensationByDisease error:', error);
        throw new Error(error.message);
    }
    return data || [];
};

/**
 * Search across ALL tables simultaneously.
 * Returns { diseases, schemes, compensation }.
 */
export const searchAll = async (searchTerm) => {
    const term = `%${searchTerm}%`;

    const [diseasesRes, schemesRes, compensationRes] = await Promise.all([
        supabase
            .from('disease_education')
            .select('*')
            .or(`crop_name.ilike.${term},disease_name.ilike.${term}`)
            .order('crop_name', { ascending: true }),
        supabase
            .from('government_schemes')
            .select('*')
            .or(`scheme_name.ilike.${term},description.ilike.${term}`)
            .order('scheme_name', { ascending: true }),
        supabase
            .from('subsidy_compensation')
            .select('*')
            .or(`disease_name.ilike.${term},compensation_type.ilike.${term}`)
            .order('disease_name', { ascending: true }),
    ]);

    return {
        diseases: diseasesRes.data || [],
        schemes: schemesRes.data || [],
        compensation: compensationRes.data || [],
    };
};

// ─── Disease–Subsidy Matching ─────────────────────────────────────────────────

/**
 * Given a detected disease name, fetch matching compensation + related schemes.
 * Used when user has a crop diagnosis result.
 */
export const fetchMatchingSubsidies = async (diseaseName) => {
    const [compensation, schemes] = await Promise.all([
        fetchCompensationByDisease(diseaseName),
        fetchSchemes('crop_disease'),
    ]);
    return { compensation, schemes };
};
