/**
 * cropFilterEngine.js
 *
 * Rule-based engine to filter and rank crops from Supabase master table
 * based on farm conditions: soil type, temperature, area, current month, region.
 *
 * NO AI — pure deterministic scoring.
 */

/**
 * Calculate a match score for one crop given farm context.
 *
 * Scoring weights:
 *   Soil match      → 40 pts (exact match)
 *   Season match    → 30 pts (current month in ideal_sowing_months)
 *   Temperature     → 20 pts (inverse of distance from ideal mid-range)
 *   Region          → 10 pts (region_tags contains farm region)
 *
 * @param {Object} crop   - crop row from DB
 * @param {Object} farm   - { soil_type, area_in_hectares, temperature, current_month, region }
 * @returns {{ score: number, soilMatch: boolean, seasonMatch: boolean }}
 */
const scoreCrop = (crop, farm) => {
    let score = 0;
    let soilMatch = false;
    let seasonMatch = false;

    // ── 1. Soil match ─────────────────────────────────────────────────────────
    if (Array.isArray(crop.suitable_soil_types) && farm.soil_type) {
        const normalised = farm.soil_type.trim().toLowerCase();
        soilMatch = crop.suitable_soil_types.some(
            s => s.trim().toLowerCase() === normalised
        );
        if (soilMatch) score += 40;
    }

    // ── 2. Season match ───────────────────────────────────────────────────────
    if (Array.isArray(crop.ideal_sowing_months) && farm.current_month) {
        seasonMatch = crop.ideal_sowing_months.includes(farm.current_month);
        if (seasonMatch) score += 30;
    }

    // ── 3. Temperature closeness ──────────────────────────────────────────────
    if (farm.temperature != null) {
        const mid = (crop.min_temperature + crop.max_temperature) / 2;
        const range = (crop.max_temperature - crop.min_temperature) || 1;
        // Distance from mid-point normalised to [0,1]
        const dist = Math.abs(farm.temperature - mid) / (range / 2);
        // Give max 20 when exactly at mid, 0 when outside range
        const tempScore = Math.max(0, 20 * (1 - dist));
        score += tempScore;
    }

    // ── 4. Region tags ─────────────────────────────────────────────────────────
    if (Array.isArray(crop.region_tags) && farm.region) {
        const farmRegion = farm.region.trim().toLowerCase();
        const regionMatch = crop.region_tags.some(
            r => r.trim().toLowerCase() === farmRegion
        );
        if (regionMatch) score += 10;
    }

    return { score, soilMatch, seasonMatch };
};

/**
 * Primary filter: strict match on soil, temperature, area, month.
 *
 * @param {Array}  crops - all crops from DB
 * @param {Object} farm  - farm context object
 * @returns {Array} filtered + scored crops, max 5
 */
const applyStrictFilter = (crops, farm) => {
    const temp = farm.temperature;
    const month = farm.current_month;
    const area = farm.area_in_hectares;

    const candidates = crops
        .filter(crop => {
            // Area check
            if (crop.min_area_required && area < crop.min_area_required) return false;
            // Temperature window
            if (temp != null) {
                if (temp < crop.min_temperature || temp > crop.max_temperature) return false;
            }
            // Season
            if (month && Array.isArray(crop.ideal_sowing_months)) {
                if (!crop.ideal_sowing_months.includes(month)) return false;
            }
            return true;
        })
        .map(crop => {
            const { score, soilMatch, seasonMatch } = scoreCrop(crop, farm);
            return { ...crop, _score: score, _soilMatch: soilMatch, _seasonMatch: seasonMatch };
        })
        .sort((a, b) => b._score - a._score)
        .slice(0, 5);

    return candidates;
};

/**
 * Fallback filter: ignore region, relax soil, keep only season (month) match.
 * Returns top 3 seasonal crops.
 *
 * @param {Array}  crops
 * @param {Object} farm
 * @returns {Array}
 */
const applyFallbackFilter = (crops, farm) => {
    const month = farm.current_month;

    return crops
        .filter(crop => {
            if (Array.isArray(crop.ideal_sowing_months) && month) {
                return crop.ideal_sowing_months.includes(month);
            }
            return true;
        })
        .map(crop => {
            const { score, soilMatch, seasonMatch } = scoreCrop(crop, farm);
            return { ...crop, _score: score, _soilMatch: soilMatch, _seasonMatch: seasonMatch };
        })
        .sort((a, b) => b._score - a._score)
        .slice(0, 3);
};

/**
 * Main entry point.
 *
 * @param {Array}  allCrops - crops master list from Supabase
 * @param {Object} farmData - {
 *   soil_type, area_in_hectares, temperature,
 *   current_month (1-12 int), region (optional string)
 * }
 * @returns {{ crops: Array, usedFallback: boolean }}
 */
export const filterCropsForFarm = (allCrops, farmData) => {
    if (!allCrops || allCrops.length === 0) {
        return { crops: [], usedFallback: false };
    }

    const farm = {
        soil_type: farmData.soil_type || '',
        area_in_hectares: typeof farmData.area_in_hectares === 'number' ? farmData.area_in_hectares : 0,
        temperature: typeof farmData.temperature === 'number' ? farmData.temperature : null,
        current_month: typeof farmData.current_month === 'number' ? farmData.current_month : new Date().getMonth() + 1,
        region: farmData.region || '',
    };

    // Try strict filter first (soil + temp + area + month)
    const strict = applyStrictFilter(allCrops, farm);

    if (strict.length > 0) {
        return { crops: strict, usedFallback: false };
    }

    // Fallback: season-only filter, ignore region
    const fallback = applyFallbackFilter(allCrops, farm);
    return { crops: fallback, usedFallback: true };
};

/**
 * Auto-generate the sowing date for a selected crop.
 *
 * Rule:
 *   - If current_month is in ideal_sowing_months → today
 *   - Else → first day of the next ideal sowing month
 *
 * All dates are timezone-safe (local midnight, formatted as YYYY-MM-DD).
 *
 * @param {Object} crop
 * @param {number} currentMonth (1-12)
 * @returns {string} date string (YYYY-MM-DD)
 */
export const computeSowingDate = (crop, currentMonth) => {
    const today = new Date();

    if (!Array.isArray(crop.ideal_sowing_months) || crop.ideal_sowing_months.length === 0) {
        return formatLocalDate(today);
    }

    if (crop.ideal_sowing_months.includes(currentMonth)) {
        return formatLocalDate(today);
    }

    // Find the next ideal month (could wrap into next year)
    const futureMths = crop.ideal_sowing_months
        .map(m => (m < currentMonth ? m + 12 : m))   // normalise for wrap-around
        .sort((a, b) => a - b);

    const nextNormMonth = futureMths[0];
    const actualMonth = ((nextNormMonth - 1) % 12) + 1;  // back to 1-12
    const yearOffset = nextNormMonth > 12 ? 1 : 0;

    const sowDate = new Date(today.getFullYear() + yearOffset, actualMonth - 1, 1);
    return formatLocalDate(sowDate);
};

// ─── Harvest & Date Helpers (timezone-safe) ──────────────────────────────────

/**
 * Format a Date as YYYY-MM-DD using local timezone (avoids UTC-shift issues).
 * @param {Date} date
 * @returns {string}
 */
export const formatLocalDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Parse a YYYY-MM-DD string into a Date at local midnight.
 * @param {string} dateStr
 * @returns {Date}
 */
export const parseLocalDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
};

/**
 * Compute predicted_harvest_date from sowing_date + growth_duration_days.
 *
 * @param {string} sowingDateStr  - YYYY-MM-DD
 * @param {number} growthDays     - crop.growth_duration_days
 * @returns {string} YYYY-MM-DD
 */
export const computeHarvestDate = (sowingDateStr, growthDays) => {
    const sow = parseLocalDate(sowingDateStr);
    sow.setDate(sow.getDate() + growthDays);
    return formatLocalDate(sow);
};

/**
 * Calculate days remaining until harvest from today.
 *
 * @param {string} harvestDateStr - YYYY-MM-DD
 * @returns {number} days (negative = already past)
 */
export const daysUntilHarvest = (harvestDateStr) => {
    const harvest = parseLocalDate(harvestDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = harvest.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Format a YYYY-MM-DD string for user display (e.g. "15 Mar 2026").
 * @param {string} dateStr
 * @returns {string}
 */
export const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = parseLocalDate(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
