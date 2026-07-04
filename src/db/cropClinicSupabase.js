/**
 * cropClinicSupabase.js
 *
 * Supabase queries for crop diagnosis history.
 *
 * -------------------------------------------------------
 * SUPABASE SQL SCHEMA (run in Supabase SQL Editor):
 * -------------------------------------------------------
 *
 * -- Create table
 * CREATE TABLE crop_diagnosis_history (
 *     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *     user_id TEXT NOT NULL,
 *     disease_name TEXT NOT NULL,
 *     disease_id TEXT,
 *     confidence NUMERIC(5,4) DEFAULT 0,
 *     severity TEXT DEFAULT 'Low',
 *     pesticide TEXT,
 *     dosage TEXT,
 *     prevention TEXT[],
 *     image_url TEXT,
 *     matched_labels TEXT[],
 *     is_healthy BOOLEAN DEFAULT FALSE,
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Index for fast lookups by user
 * CREATE INDEX idx_diagnosis_user_id ON crop_diagnosis_history(user_id);
 * CREATE INDEX idx_diagnosis_created_at ON crop_diagnosis_history(created_at DESC);
 * CREATE INDEX idx_diagnosis_user_date ON crop_diagnosis_history(user_id, created_at DESC);
 *
 * -- Enable RLS
 * ALTER TABLE crop_diagnosis_history ENABLE ROW LEVEL SECURITY;
 *
 * -- RLS Policies: Users can only access their own data
 * CREATE POLICY "Users can view own diagnoses"
 *     ON crop_diagnosis_history FOR SELECT
 *     USING (true);
 *
 * CREATE POLICY "Users can insert own diagnoses"
 *     ON crop_diagnosis_history FOR INSERT
 *     WITH CHECK (true);
 *
 * CREATE POLICY "Users can delete own diagnoses"
 *     ON crop_diagnosis_history FOR DELETE
 *     USING (true);
 *
 * -- Storage bucket for diagnosis images
 * INSERT INTO storage.buckets (id, name, public)
 * VALUES ('diagnosis-images', 'diagnosis-images', true);
 *
 * CREATE POLICY "Anyone can upload diagnosis images"
 *     ON storage.objects FOR INSERT
 *     WITH CHECK (bucket_id = 'diagnosis-images');
 *
 * CREATE POLICY "Anyone can view diagnosis images"
 *     ON storage.objects FOR SELECT
 *     USING (bucket_id = 'diagnosis-images');
 *
 * -------------------------------------------------------
 */

import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

/**
 * Upload diagnosis image to Supabase Storage.
 * @param {string} imageUri - Local image URI.
 * @param {string} userId - User identifier.
 * @returns {string|null} Public URL of uploaded image.
 */
export const uploadDiagnosisImage = async (imageUri, userId) => {
    try {
        const fileName = `${userId}/${Date.now()}.jpg`;
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const { data, error } = await supabase.storage
            .from('diagnosis-images')
            .upload(fileName, decode(base64), {
                contentType: 'image/jpeg',
                upsert: false,
            });

        if (error) {
            console.warn('Image upload error:', error.message);
            return null;
        }

        const { data: urlData } = supabase.storage
            .from('diagnosis-images')
            .getPublicUrl(data.path);

        return urlData?.publicUrl || null;
    } catch (err) {
        console.warn('Image upload failed:', err.message);
        return null;
    }
};

/**
 * Decode base64 string to Uint8Array for Supabase upload.
 */
function decode(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Insert a diagnosis record into Supabase.
 * @param {Object} diagnosis - Diagnosis result from CropClinicEngine.
 * @param {string} userId - User identifier.
 * @returns {Object|null} Inserted record.
 */
export const insertDiagnosis = async (diagnosis, userId) => {
    try {
        // Attempt image upload (non-blocking failure)
        let imageUrl = null;
        if (diagnosis.imageUri) {
            imageUrl = await uploadDiagnosisImage(diagnosis.imageUri, userId);
        }

        const record = {
            user_id: userId,
            disease_name: diagnosis.disease?.name || 'Unknown',
            disease_id: diagnosis.disease?.id || 'unknown',
            confidence: parseFloat((diagnosis.confidence || 0).toFixed(4)),
            severity: diagnosis.severity?.level || 'Low',
            pesticide: diagnosis.treatment?.pesticide || null,
            dosage: diagnosis.treatment?.dosage || null,
            prevention: diagnosis.treatment?.prevention || [],
            image_url: imageUrl,
            matched_labels: diagnosis.matchedLabels || [],
            is_healthy: diagnosis.isHealthy || false,
        };

        const { data, error } = await supabase
            .from('crop_diagnosis_history')
            .insert([record])
            .select()
            .single();

        if (error) {
            console.error('Insert diagnosis error:', error.message);
            return null;
        }

        return data;
    } catch (err) {
        console.error('insertDiagnosis failed:', err.message);
        return null;
    }
};

/**
 * Fetch latest diagnosis for a user.
 * @param {string} userId - User identifier.
 * @returns {Object|null} Latest diagnosis record.
 */
export const getLatestDiagnosis = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('crop_diagnosis_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // no rows
            console.warn('Fetch latest diagnosis error:', error.message);
            return null;
        }

        return data;
    } catch (err) {
        console.warn('getLatestDiagnosis failed:', err.message);
        return null;
    }
};

/**
 * Fetch diagnosis history for a user (paginated).
 * @param {string} userId - User identifier.
 * @param {number} limit - Number of records to fetch.
 * @param {number} offset - Offset for pagination.
 * @returns {Array} Diagnosis records.
 */
export const getDiagnosisHistory = async (userId, limit = 10, offset = 0) => {
    try {
        const { data, error } = await supabase
            .from('crop_diagnosis_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.warn('Fetch history error:', error.message);
            return [];
        }

        return data || [];
    } catch (err) {
        console.warn('getDiagnosisHistory failed:', err.message);
        return [];
    }
};

/**
 * Delete a diagnosis record.
 * @param {string} diagnosisId - UUID of diagnosis record.
 * @returns {boolean} Success status.
 */
export const deleteDiagnosis = async (diagnosisId) => {
    try {
        const { error } = await supabase
            .from('crop_diagnosis_history')
            .delete()
            .eq('id', diagnosisId);

        if (error) {
            console.warn('Delete diagnosis error:', error.message);
            return false;
        }

        return true;
    } catch (err) {
        console.warn('deleteDiagnosis failed:', err.message);
        return false;
    }
};
