/**
 * pricePredictionEngine.js
 *
 * Integrates with the external crop price prediction REST API.
 * Handles: retries, timeouts, error parsing, structured responses.
 *
 */
import Constants from 'expo-constants';

// ─── Configuration ───────────────────────────────────────────────────────────
const env = typeof process !== 'undefined' ? process.env : {};
const expoExtra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
const PREDICTION_API_URL =
    expoExtra.PRICE_PREDICTION_API_URL
    || env.PRICE_PREDICTION_API_URL
    || '';

const TIMEOUT_MS = 15000; // 15 second timeout
const MAX_RETRIES = 2;

const getPredictionEndpoint = () => {
    if (!PREDICTION_API_URL) {
        throw new Error('Missing PRICE_PREDICTION_API_URL in Expo config');
    }

    const trimmed = PREDICTION_API_URL.trim().replace(/\/+$/, '');
    if (!trimmed) {
        throw new Error('PRICE_PREDICTION_API_URL is empty');
    }

    return /\/predict$/i.test(trimmed) ? `${trimmed}/` : `${trimmed}/predict/`;
};

const buildPredictionUrl = (targetDate, cropName) => {
    try {
        const url = new URL(getPredictionEndpoint());
        url.searchParams.set('date', targetDate);
        url.searchParams.set('commodity', cropName);
        return url.toString();
    } catch (err) {
        if (err.message?.includes('PRICE_PREDICTION_API_URL')) throw err;
        throw new Error('Invalid PRICE_PREDICTION_API_URL');
    }
};

// ─── Timeout wrapper ─────────────────────────────────────────────────────────
const fetchWithTimeout = (url, options, timeout) => {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout — server took too long')), timeout)
        ),
    ]);
};

// ─── Main Prediction Function ────────────────────────────────────────────────

/**
 * Call the price prediction backend.
 *
 * @param {Object|string} crop - crop row or crop UUID
 * @param {string} targetDate - YYYY-MM-DD
 * @param {string} cropName - crop name/commodity for the backend model
 * @returns {Object} { predicted_price, confidence, trend, crop_id, target_date }
 * @throws {Error} on network/API failure after retries
 */
export const predictPrice = async (crop, targetDate, cropName) => {
    const cropId = typeof crop === 'object' ? crop?.id : crop;
    const commodity = cropName || (typeof crop === 'object' ? crop?.crop_name : null);

    if (!cropId) throw new Error('Missing crop ID');
    if (!commodity) throw new Error('Missing crop name');
    if (!targetDate) throw new Error('Missing target date');

    // Validate date is today or future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    if (target < today) {
        throw new Error('Target date must be today or in the future');
    }

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetchWithTimeout(
                buildPredictionUrl(targetDate, commodity),
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                },
                TIMEOUT_MS
            );

            // Handle non-OK responses
            if (!response.ok) {
                const errorBody = await response.text().catch(() => 'No response body');
                throw new Error(`API Error (${response.status}): ${errorBody}`);
            }

            // Parse JSON
            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error('Invalid JSON response from prediction API');
            }

            // Validate required fields
            const predictedPrice = data.predicted_price ?? data.predicted_modal_price;
            if (predictedPrice == null || isNaN(predictedPrice)) {
                throw new Error('Missing or invalid predicted price in response');
            }

            return {
                crop_id: data.crop_id || cropId,
                target_date: data.target_date || targetDate,
                predicted_price: Number(predictedPrice),
                confidence: Number(data.confidence ?? 0),
                trend: ['rising', 'falling', 'stable'].includes(data.trend)
                    ? data.trend
                    : 'stable',
            };
        } catch (err) {
            lastError = err;
            console.warn(`[PricePrediction] Attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);

            // Don't retry on validation errors
            if (err.message.includes('Missing') || err.message.includes('must be')) {
                throw err;
            }

            // Wait before retry (exponential backoff)
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }

    throw lastError || new Error('Price prediction failed after retries');
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get trend display properties.
 */
export const getTrendInfo = (trend) => {
    switch (trend) {
        case 'rising':
            return {
                label: 'Rising',
                icon: 'trending-up',
                color: '#2e7d32',
                bgColor: '#e8f5e9',
            };
        case 'falling':
            return {
                label: 'Falling',
                icon: 'trending-down',
                color: '#c62828',
                bgColor: '#ffebee',
            };
        default:
            return {
                label: 'Stable',
                icon: 'remove-outline',
                color: '#f57c00',
                bgColor: '#fff3e0',
            };
    }
};

/**
 * Get confidence level label and color.
 */
export const getConfidenceInfo = (confidence) => {
    if (confidence >= 0.8) return { label: 'High', color: '#2e7d32' };
    if (confidence >= 0.5) return { label: 'Medium', color: '#f57c00' };
    return { label: 'Low', color: '#c62828' };
};
