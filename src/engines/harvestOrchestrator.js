/**
 * harvestOrchestrator.js
 *
 * Central orchestration engine for the complete crop lifecycle:
 *   1. Harvest Detection (automatic, rule-based)
 *   2. Post-Harvest Risk Calculation (weather + market)
 *   3. Market Advisory Generation (sell/hold/monitor)
 *
 * Runs as a daily process triggered by Dashboard/MyCrops screen loads.
 * Fully idempotent — safe to run multiple times per day.
 *
 * NO AI — all rule-based logic.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeatherEngine } from './weatherEngine';
import { SpoilageRiskEngine } from './spoilageRiskEngine';
import {
    fetchCropWithStorage,
    insertRiskHistory,
    fetchLastRiskRecord,
} from '../db/postHarvestSupabase';
import { getCachedPrediction } from '../db/marketSupabase';

// ─── Constants ───────────────────────────────────────────────────────────────
const CACHE_KEY_PREFIX = 'orchestrator-last-run-';
const CACHE_TTL_HOURS = 6; // Only re-run every 6 hours per crop

// ─── Date Helpers ────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];

const daysBetween = (a, b) => {
    const da = new Date(a);
    const db = new Date(b);
    if (isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
    da.setHours(0, 0, 0, 0);
    db.setHours(0, 0, 0, 0);
    return Math.round((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
};

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: HARVEST STATUS DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine the harvest status for a single crop.
 *
 * @param {Object} crop - user crop from AsyncStorage (user-crops array item)
 * @returns {string} 'growing' | 'ready_for_harvest' | 'harvested_recently' | 'post_harvest'
 */
const detectHarvestStatus = (crop) => {
    const today = todayStr();
    const harvestDate = crop.harvestDate;
    if (!harvestDate) return 'growing'; // no harvest date set

    const daysToHarvest = daysBetween(harvestDate, today);

    if (daysToHarvest > 7) return 'growing';              // Far from harvest
    if (daysToHarvest > 0 && daysToHarvest <= 7) return 'approaching_harvest'; // 1-7 days
    if (daysToHarvest >= -7 && daysToHarvest <= 0) return 'ready_for_harvest';       // Harvest window
    return 'post_harvest';                                   // Past harvest window by > 7 days
};

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: POST-HARVEST RISK CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate combined weather + market risk.
 *
 * @param {Object} params
 * @param {Object} params.supabaseCrop - full crop record from Supabase (with storage fields)
 * @param {string} params.harvestDate - YYYY-MM-DD
 * @param {Object} params.weather - { temperature, humidity, rainfall }
 * @returns {Object} { weatherRisk, totalRisk, riskLevel, advisory, spoilageResult }
 */
const calculateCombinedRisk = (params) => {
    const { supabaseCrop, harvestDate, weather } = params;

    // Spoilage risk from engine (0-100 scale)
    const spoilageResult = SpoilageRiskEngine.calculateRisk({
        crop: supabaseCrop,
        harvestDate,
        weather: weather || { temperature: 25, humidity: 50, rainfall: 0 },
    });

    // Normalize to 0-1 scale
    const weatherRiskScore = spoilageResult.riskPercentage / 100;

    // Market risk is a placeholder — you can integrate your price prediction model here.
    // For now: a simple seasonal heuristic based on shelf life usage.
    const daysAfterHarvest = daysBetween(todayStr(), harvestDate);
    const shelfLife = supabaseCrop.shelf_life_days || 30;
    const shelfUsage = Math.max(0, daysAfterHarvest) / shelfLife;
    const marketRiskScore = shelfUsage > 1 ? 0.8 : shelfUsage > 0.7 ? 0.4 : 0.1;

    const totalRisk = weatherRiskScore + marketRiskScore;

    // Classify
    let riskLevel;
    if (totalRisk < 1) riskLevel = 'Low';
    else if (totalRisk <= 1.5) riskLevel = 'Moderate';
    else riskLevel = 'High';

    return {
        weatherRiskScore: Math.round(weatherRiskScore * 100) / 100,
        marketRiskScore: Math.round(marketRiskScore * 100) / 100,
        totalRisk: Math.round(totalRisk * 100) / 100,
        riskLevel,
        spoilageResult,
    };
};

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: MARKET ADVISORY GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate advisory based on risk level and price trend.
 *
 * @param {string} riskLevel - 'Low' | 'Moderate' | 'High'
 * @param {string} priceTrend - 'rising' | 'falling' | 'stable' (from price model)
 * @returns {Object} { action, message, urgency }
 */
const generateAdvisory = (riskLevel, priceTrend = 'stable') => {
    if (riskLevel === 'High' && priceTrend === 'falling') {
        return {
            action: 'SELL_IMMEDIATELY',
            message: 'High spoilage risk and falling prices. Sell your produce immediately or move to cold storage.',
            urgency: 'critical',
        };
    }
    if (riskLevel === 'High') {
        return {
            action: 'SELL_SOON',
            message: 'High spoilage risk. Consider selling within 2-3 days or improving storage conditions.',
            urgency: 'high',
        };
    }
    if (riskLevel === 'Low' && priceTrend === 'rising') {
        return {
            action: 'HOLD',
            message: 'Low spoilage risk and prices are rising. Hold your produce for better returns.',
            urgency: 'low',
        };
    }
    if (riskLevel === 'Low') {
        return {
            action: 'HOLD',
            message: 'Storage conditions are good. You can safely hold your produce.',
            urgency: 'low',
        };
    }
    // Moderate
    return {
        action: 'MONITOR',
        message: 'Monitor conditions daily. Check weather forecast and market prices before deciding.',
        urgency: 'medium',
    };
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export const HarvestOrchestrator = {

    /**
     * Process all crops for the current user.
     * Called on Dashboard load and MyCrops screen load.
     *
     * Idempotent: Checks last-run timestamp per crop.
     * Updates user-crops in AsyncStorage with status + risk data.
     *
     * @param {boolean} force - skip cache/TTL check
     * @returns {Array} Updated crops with status and risk info
     */
    async processAllCrops(force = false) {
        try {
            const cropsStr = await AsyncStorage.getItem('user-crops');
            if (!cropsStr) return [];
            const crops = JSON.parse(cropsStr);
            if (!Array.isArray(crops) || crops.length === 0) return [];

            // Fetch weather once for all crops
            let weather = null;
            try {
                const farmStr = await AsyncStorage.getItem('farm-details');
                const farm = farmStr ? JSON.parse(farmStr) : null;
                const coords = farm ? { latitude: farm.latitude, longitude: farm.longitude } : null;
                weather = await WeatherEngine.getCurrentWeather(null, coords);
            } catch (e) {
                console.warn('[Orchestrator] weather fetch failed:', e);
                try {
                    const cached = await AsyncStorage.getItem('weather-cache');
                    if (cached) weather = JSON.parse(cached);
                } catch { }
            }

            const userPhone = await getUserPhone();
            const updatedCrops = [];

            for (const crop of crops) {
                try {
                    const updated = await this.processSingleCrop(crop, weather, userPhone, force);
                    updatedCrops.push(updated);
                } catch (e) {
                    console.warn(`[Orchestrator] failed for crop ${crop.name}:`, e);
                    updatedCrops.push(crop); // Keep original if processing fails
                }
            }

            // Persist updated crops
            await AsyncStorage.setItem('user-crops', JSON.stringify(updatedCrops));

            return updatedCrops;
        } catch (e) {
            console.error('[Orchestrator] processAllCrops error:', e);
            return [];
        }
    },

    /**
     * Process a single crop: detect status → run risk → generate advisory.
     */
    async processSingleCrop(crop, weather, userPhone, force = false) {
        // Idempotency check
        if (!force) {
            const lastRun = await AsyncStorage.getItem(CACHE_KEY_PREFIX + crop.id);
            if (lastRun) {
                const lastTime = new Date(lastRun).getTime();
                const diff = (Date.now() - lastTime) / (1000 * 60 * 60);
                if (diff < CACHE_TTL_HOURS) {
                    // Already processed recently — return crop with cached data
                    return crop;
                }
            }
        }

        // Step 1: Detect harvest status
        const harvestStatus = detectHarvestStatus(crop);
        const updatedCrop = { ...crop, harvestStatus };

        // Step 2: Only calculate risk if ready_for_harvest or post_harvest
        if (harvestStatus === 'ready_for_harvest' || harvestStatus === 'post_harvest') {
            try {
                // Try to get full crop data from Supabase
                const { fetchAllCrops } = require('../db/cropSupabase');
                const allCrops = await fetchAllCrops();
                const match = allCrops.find(c =>
                    c.crop_name.toLowerCase() === (crop.name || '').toLowerCase()
                );

                if (match) {
                    let supabaseCrop;
                    try {
                        supabaseCrop = await fetchCropWithStorage(match.id);
                    } catch {
                        supabaseCrop = match; // Use basic data if storage fields not available
                    }

                    const riskResult = calculateCombinedRisk({
                        supabaseCrop,
                        harvestDate: crop.harvestDate,
                        weather,
                    });

                    updatedCrop.riskLevel = riskResult.riskLevel;
                    updatedCrop.riskPercentage = riskResult.spoilageResult.riskPercentage;
                    updatedCrop.totalRisk = riskResult.totalRisk;
                    updatedCrop.shelfLifeRemaining = riskResult.spoilageResult.shelfLifeRemaining;

                    // Step 3: Advisory — try to get price trend from cached prediction
                    let priceTrend = 'stable';
                    try {
                        if (userPhone && match.id) {
                            const cached = await getCachedPrediction(match.id, crop.harvestDate, userPhone);
                            if (cached?.trend) priceTrend = cached.trend;
                        }
                    } catch { }
                    const advisory = generateAdvisory(riskResult.riskLevel, priceTrend);
                    updatedCrop.advisory = advisory;
                    updatedCrop.priceTrend = priceTrend;

                    // Step 4: Store in history (non-blocking, fire-and-forget)
                    if (userPhone && match.id) {
                        insertRiskHistory({
                            user_phone: userPhone,
                            crop_id: match.id,
                            risk_percentage: riskResult.spoilageResult.riskPercentage,
                            risk_level: riskResult.riskLevel,
                            storage_condition_used: supabaseCrop.storage_type || 'Normal',
                            temperature_used: weather?.temperature ?? null,
                            humidity_used: weather?.humidity ?? null,
                        }).catch(e => console.warn('[Orchestrator] risk history save failed:', e));
                    }
                }
            } catch (e) {
                console.warn('[Orchestrator] risk processing failed for', crop.name, e);
            }
        } else if (harvestStatus === 'approaching_harvest') {
            updatedCrop.riskLevel = null;
            updatedCrop.advisory = {
                action: 'PREPARE',
                message: `Harvest approaching in ${daysBetween(crop.harvestDate, todayStr())} days. Prepare storage.`,
                urgency: 'info',
            };
        }

        // Mark last run time
        await AsyncStorage.setItem(CACHE_KEY_PREFIX + crop.id, new Date().toISOString());

        return updatedCrop;
    },

    /**
     * Force re-process (e.g., when user changes sowing date or weather changes).
     */
    async forceRefresh() {
        return this.processAllCrops(true);
    },

    // Expose helpers for external use
    detectHarvestStatus,
    calculateCombinedRisk,
    generateAdvisory,
};

// ─── Helper ──────────────────────────────────────────────────────────────────
const getUserPhone = async () => {
    try {
        const profileStr = await AsyncStorage.getItem('user-profile');
        if (profileStr) return JSON.parse(profileStr).phone || null;
    } catch { }
    return null;
};
