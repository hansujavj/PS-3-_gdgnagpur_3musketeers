/**
 * cropClinicEngine.js
 *
 * Handles image capture, Google Cloud Vision API calls,
 * label parsing, and disease mapping for Crop Clinic.
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { DISEASE_RULES, TREATMENTS, getSeverityLevel, LOW_CONFIDENCE_THRESHOLD } from '../data/cropClinicData';

const VISION_API_KEY = Constants.expoConfig?.extra?.GOOGLE_GEOCODING_API_KEY || '';
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;

// Max image size in bytes (4MB for Vision API)
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

/**
 * Request camera permissions.
 * @returns {boolean} Whether permission was granted.
 */
const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('CAMERA_PERMISSION_DENIED');
    }
    return true;
};

/**
 * Capture image from camera using expo-image-picker.
 * Returns base64-encoded image string and URI.
 */
const captureImage = async () => {
    await requestCameraPermission();

    const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: true,
        aspect: [4, 3],
    });

    if (result.canceled) {
        throw new Error('IMAGE_CAPTURE_CANCELLED');
    }

    const asset = result.assets[0];
    let base64 = asset.base64;

    // If base64 is too large, re-read with compression
    if (!base64 || base64.length * 0.75 > MAX_IMAGE_SIZE) {
        base64 = await compressAndEncode(asset.uri);
    }

    return {
        base64,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
    };
};

/**
 * Pick image from gallery.
 * Returns base64-encoded image string and URI.
 */
const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('GALLERY_PERMISSION_DENIED');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: true,
        aspect: [4, 3],
    });

    if (result.canceled) {
        throw new Error('IMAGE_PICK_CANCELLED');
    }

    const asset = result.assets[0];
    let base64 = asset.base64;

    if (!base64 || base64.length * 0.75 > MAX_IMAGE_SIZE) {
        base64 = await compressAndEncode(asset.uri);
    }

    return {
        base64,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
    };
};

/**
 * Compress and encode image to base64 from URI.
 */
const compressAndEncode = async (uri) => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
};

/**
 * Send image to Google Cloud Vision API for label detection.
 * @param {string} base64Image - Base64-encoded image string.
 * @returns {Array} Array of label annotations.
 */
const analyzeImage = async (base64Image) => {
    if (!VISION_API_KEY) {
        throw new Error('VISION_API_KEY_MISSING');
    }

    const requestBody = {
        requests: [
            {
                image: {
                    content: base64Image,
                },
                features: [
                    { type: 'LABEL_DETECTION', maxResults: 15 },
                ],
            },
        ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(VISION_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 429) throw new Error('API_QUOTA_EXCEEDED');
            if (response.status === 403) throw new Error('API_KEY_INVALID');
            throw new Error(`API_ERROR_${response.status}`);
        }

        const data = await response.json();

        if (data.responses?.[0]?.error) {
            throw new Error(`VISION_ERROR: ${data.responses[0].error.message}`);
        }

        return data.responses?.[0]?.labelAnnotations || [];
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('API_TIMEOUT');
        }
        throw error;
    }
};

/**
 * Parse Vision API labels into structured format.
 * @param {Array} labelAnnotations - Raw labels from Vision API.
 * @returns {Array} Parsed labels with description and score.
 */
const parseLabels = (labelAnnotations) => {
    if (!Array.isArray(labelAnnotations) || labelAnnotations.length === 0) {
        return [];
    }

    return labelAnnotations.map((label) => ({
        description: label.description?.toLowerCase() || '',
        score: label.score || 0,
        topicality: label.topicality || 0,
    }));
};

/**
 * Map parsed labels to disease categories using rule-based matching.
 * Handles multiple disease labels by selecting the best match.
 * @param {Array} parsedLabels - Parsed label objects.
 * @returns {Object} Diagnosis result.
 */
const mapToDisease = (parsedLabels) => {
    if (!parsedLabels || parsedLabels.length === 0) {
        return {
            disease: DISEASE_RULES.find((r) => r.id === 'healthy'),
            confidence: 0,
            severity: getSeverityLevel(0),
            matchedLabels: [],
            allLabels: [],
            isHealthy: true,
            lowConfidence: true,
        };
    }

    const matches = [];

    for (const rule of DISEASE_RULES) {
        let bestScore = 0;
        const matchedKeywords = [];

        for (const label of parsedLabels) {
            for (const keyword of rule.keywords) {
                if (label.description.includes(keyword) || keyword.includes(label.description)) {
                    if (label.score > bestScore) {
                        bestScore = label.score;
                    }
                    matchedKeywords.push({ keyword, label: label.description, score: label.score });
                }
            }
        }

        if (matchedKeywords.length > 0) {
            // Boost score slightly for multiple keyword matches
            const boostFactor = Math.min(1, bestScore + matchedKeywords.length * 0.02);
            matches.push({
                rule,
                score: boostFactor,
                matchedKeywords,
            });
        }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    // If healthy is the best match, return healthy
    const healthyMatch = matches.find((m) => m.rule.id === 'healthy');
    const diseaseMatches = matches.filter((m) => m.rule.id !== 'healthy');

    // Prefer disease match over healthy if both exist and disease score is reasonable
    const bestMatch = diseaseMatches.length > 0 && diseaseMatches[0].score >= 0.3
        ? diseaseMatches[0]
        : healthyMatch || (matches.length > 0 ? matches[0] : null);

    if (!bestMatch) {
        // No match found — check if plant-related labels exist
        const plantLabels = parsedLabels.filter(
            (l) => l.description.includes('plant') || l.description.includes('leaf') || l.description.includes('crop') || l.description.includes('vegetation')
        );

        if (plantLabels.length > 0) {
            return {
                disease: DISEASE_RULES.find((r) => r.id === 'healthy'),
                confidence: plantLabels[0].score,
                severity: getSeverityLevel(plantLabels[0].score),
                matchedLabels: plantLabels.map((l) => l.description),
                allLabels: parsedLabels,
                isHealthy: true,
                lowConfidence: plantLabels[0].score < LOW_CONFIDENCE_THRESHOLD,
            };
        }

        // Not even a plant image
        return {
            disease: null,
            confidence: 0,
            severity: getSeverityLevel(0),
            matchedLabels: [],
            allLabels: parsedLabels,
            isHealthy: false,
            lowConfidence: true,
            notPlant: true,
        };
    }

    const isHealthy = bestMatch.rule.id === 'healthy';

    return {
        disease: bestMatch.rule,
        confidence: bestMatch.score,
        severity: getSeverityLevel(bestMatch.score),
        matchedLabels: bestMatch.matchedKeywords.map((m) => m.label),
        allLabels: parsedLabels,
        isHealthy,
        lowConfidence: bestMatch.score < LOW_CONFIDENCE_THRESHOLD,
    };
};

/**
 * Get treatment for a diagnosed disease.
 * @param {string} diseaseId - Disease category ID.
 * @returns {Object|null} Treatment details.
 */
const getTreatment = (diseaseId) => {
    return TREATMENTS[diseaseId] || null;
};

/**
 * Full diagnosis pipeline: capture → analyze → parse → map → treat.
 * @param {'camera'|'gallery'} source - Image source.
 * @returns {Object} Complete diagnosis result with treatment.
 */
const diagnose = async (source = 'camera') => {
    // 1. Capture / pick image
    const image = source === 'camera' ? await captureImage() : await pickImage();

    // 2. Analyze with Vision API
    const labels = await analyzeImage(image.base64);

    // 3. Parse labels
    const parsedLabels = parseLabels(labels);

    // 4. Map to disease
    const diagnosisResult = mapToDisease(parsedLabels);

    // 5. Get treatment
    const treatment = diagnosisResult.disease
        ? getTreatment(diagnosisResult.disease.id)
        : null;

    return {
        ...diagnosisResult,
        treatment,
        imageUri: image.uri,
        rawLabels: labels,
        timestamp: new Date().toISOString(),
    };
};

/**
 * Get user-friendly error message from error code.
 */
const getErrorMessage = (error) => {
    const errorMap = {
        CAMERA_PERMISSION_DENIED: 'Camera permission is required to scan crops. Please enable it in settings.',
        GALLERY_PERMISSION_DENIED: 'Gallery access is required. Please enable it in settings.',
        IMAGE_CAPTURE_CANCELLED: 'Image capture was cancelled.',
        IMAGE_PICK_CANCELLED: 'Image selection was cancelled.',
        VISION_API_KEY_MISSING: 'API key is not configured. Please contact support.',
        API_QUOTA_EXCEEDED: 'API limit reached. Please try again later.',
        API_KEY_INVALID: 'API key is invalid. Please contact support.',
        API_TIMEOUT: 'Request timed out. Please check your internet connection.',
    };

    const message = error?.message || '';

    for (const [code, msg] of Object.entries(errorMap)) {
        if (message.includes(code)) return msg;
    }

    if (message.includes('Network request failed') || message.includes('network')) {
        return 'No internet connection. Please check your network and try again.';
    }

    return 'Something went wrong. Please try again.';
};

export const CropClinicEngine = {
    captureImage,
    pickImage,
    analyzeImage,
    parseLabels,
    mapToDisease,
    getTreatment,
    diagnose,
    getErrorMessage,
};

export default CropClinicEngine;
