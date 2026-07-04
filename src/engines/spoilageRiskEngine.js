/**
 * spoilageRiskEngine.js
 *
 * Rule-based post-harvest spoilage risk calculator.
 * NO AI — purely deterministic scoring.
 *
 * Scoring:
 *   Temperature mismatch   → +30
 *   Humidity (by sensitivity) → +5/+15/+25
 *   Days past shelf life    → +20/+40
 *   Rain probability >60%   → +10
 *   Final = min(score, 100)
 *
 * Risk Levels:
 *   0–30  → Low
 *   31–60 → Moderate
 *   61–100 → High
 */

// ─── Storage Recommendation Mapping ──────────────────────────────────────────
const STORAGE_RECOMMENDATIONS = {
    Dry: {
        recommendation: 'Store in a cool, dry place with low humidity. Use moisture-proof bags or airtight containers. Keep away from direct sunlight.',
        icon: 'archive-outline',
        tips: ['Use jute or polypropylene bags', 'Add neem leaves to prevent insects', 'Keep storage area well-ventilated'],
    },
    Cold: {
        recommendation: 'Requires cold storage facility (2–10°C). Transport quickly after harvest. Do not break the cold chain.',
        icon: 'snow-outline',
        tips: ['Pre-cool produce before storage', 'Maintain consistent temperature', 'Check for condensation regularly'],
    },
    Ventilated: {
        recommendation: 'Store in well-ventilated area with good airflow. Avoid stacking too high. Use raised platforms.',
        icon: 'thunderstorm-outline',
        tips: ['Use bamboo mats or pallets', 'Turn produce regularly', 'Monitor for sprouting or mold'],
    },
    Normal: {
        recommendation: 'Standard indoor storage. Keep in a clean, dry area. Protect from pests and rodents.',
        icon: 'home-outline',
        tips: ['Use clean storage bags', 'Keep away from walls', 'Regular pest inspection'],
    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Safe day-difference: returns number of days between two dates.
 * Negative = dateB is in the future relative to dateA.
 */
const daysBetween = (dateStrA, dateStrB) => {
    if (!dateStrA || !dateStrB) return 0;
    const a = new Date(dateStrA);
    const b = new Date(dateStrB);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
    a.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
};

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// ─── Main Engine ─────────────────────────────────────────────────────────────

export const SpoilageRiskEngine = {

    /**
     * Calculate spoilage risk.
     *
     * @param {Object} params
     * @param {Object} params.crop - crop record from Supabase (crops table row)
     * @param {string} params.harvestDate - predicted_harvest_date (YYYY-MM-DD)
     * @param {Object} params.weather - { temperature, humidity, rainfall }
     * @returns {Object} { riskPercentage, riskLevel, breakdown, isPreHarvest, daysSinceHarvest, shelfLifeRemaining, storageRecommendation }
     */
    calculateRisk(params) {
        const { crop, harvestDate, weather } = params;

        const today = new Date().toISOString().split('T')[0];

        // ── Pre-harvest check ────────────────────────────────────────────────
        const daysSinceHarvest = daysBetween(today, harvestDate);
        if (daysSinceHarvest < 0) {
            return {
                riskPercentage: 0,
                riskLevel: 'Pre-Harvest',
                isPreHarvest: true,
                daysToHarvest: Math.abs(daysSinceHarvest),
                daysSinceHarvest: 0,
                shelfLifeRemaining: crop.shelf_life_days || 30,
                breakdown: [],
                storageRecommendation: this.getStorageRecommendation(crop.storage_type),
            };
        }

        // ── Scoring ──────────────────────────────────────────────────────────
        let riskScore = 0;
        const breakdown = [];

        const currentTemp = weather?.temperature ?? 25;
        const currentHumidity = weather?.humidity ?? 50;
        const rainfall = weather?.rainfall ?? 0;

        const tempMin = crop.optimal_storage_temp_min ?? 10;
        const tempMax = crop.optimal_storage_temp_max ?? 30;
        const moistureSensitivity = crop.moisture_sensitivity || 'Medium';
        const shelfLifeDays = crop.shelf_life_days || 30;

        // 1️⃣ Temperature mismatch
        if (currentTemp < tempMin || currentTemp > tempMax) {
            riskScore += 30;
            breakdown.push({
                factor: 'Temperature',
                score: 30,
                detail: `Current ${currentTemp}°C is outside optimal range (${tempMin}–${tempMax}°C)`,
                icon: 'thermometer',
                color: '#c62828',
            });
        } else {
            breakdown.push({
                factor: 'Temperature',
                score: 0,
                detail: `${currentTemp}°C is within optimal range (${tempMin}–${tempMax}°C)`,
                icon: 'thermometer',
                color: '#2e7d32',
            });
        }

        // 2️⃣ Humidity risk (based on moisture sensitivity)
        if (currentHumidity > 75) {
            const humidityScore = moistureSensitivity === 'High' ? 25
                : moistureSensitivity === 'Medium' ? 15 : 5;
            riskScore += humidityScore;
            breakdown.push({
                factor: 'Humidity',
                score: humidityScore,
                detail: `${currentHumidity}% humidity (${moistureSensitivity} sensitivity)`,
                icon: 'water',
                color: humidityScore >= 20 ? '#c62828' : '#f57c00',
            });
        } else {
            breakdown.push({
                factor: 'Humidity',
                score: 0,
                detail: `${currentHumidity}% humidity is acceptable`,
                icon: 'water',
                color: '#2e7d32',
            });
        }

        // 3️⃣ Days after harvest vs shelf life
        const shelfLifeUsedPct = (daysSinceHarvest / shelfLifeDays) * 100;
        if (daysSinceHarvest > shelfLifeDays) {
            riskScore += 40;
            breakdown.push({
                factor: 'Shelf Life',
                score: 40,
                detail: `Exceeded shelf life by ${daysSinceHarvest - shelfLifeDays} days`,
                icon: 'alert-circle',
                color: '#c62828',
            });
        } else if (shelfLifeUsedPct > 70) {
            riskScore += 20;
            breakdown.push({
                factor: 'Shelf Life',
                score: 20,
                detail: `${Math.round(shelfLifeUsedPct)}% of shelf life used (${shelfLifeDays - daysSinceHarvest} days remaining)`,
                icon: 'time',
                color: '#f57c00',
            });
        } else {
            breakdown.push({
                factor: 'Shelf Life',
                score: 0,
                detail: `${shelfLifeDays - daysSinceHarvest} of ${shelfLifeDays} days remaining`,
                icon: 'time',
                color: '#2e7d32',
            });
        }

        // 4️⃣ Rain probability
        if (rainfall > 60) {
            riskScore += 10;
            breakdown.push({
                factor: 'Rainfall',
                score: 10,
                detail: `${rainfall}mm rainfall increases moisture risk`,
                icon: 'rainy',
                color: '#f57c00',
            });
        }

        // ── Final ────────────────────────────────────────────────────────────
        const riskPercentage = clamp(riskScore, 0, 100);
        const riskLevel = riskPercentage <= 30 ? 'Low'
            : riskPercentage <= 60 ? 'Moderate' : 'High';

        return {
            riskPercentage,
            riskLevel,
            isPreHarvest: false,
            daysSinceHarvest,
            shelfLifeRemaining: Math.max(0, shelfLifeDays - daysSinceHarvest),
            breakdown,
            storageRecommendation: this.getStorageRecommendation(crop.storage_type),
        };
    },

    /**
     * Get storage recommendation object.
     */
    getStorageRecommendation(storageType) {
        return STORAGE_RECOMMENDATIONS[storageType] || STORAGE_RECOMMENDATIONS.Normal;
    },

    /**
     * Get color for risk level.
     */
    getRiskColor(riskLevel) {
        switch (riskLevel) {
            case 'Low': return '#2e7d32';
            case 'Moderate': return '#f57c00';
            case 'High': return '#c62828';
            case 'Pre-Harvest': return '#1565c0';
            default: return '#888';
        }
    },

    /**
     * Get icon for risk level.
     */
    getRiskIcon(riskLevel) {
        switch (riskLevel) {
            case 'Low': return 'shield-checkmark';
            case 'Moderate': return 'warning';
            case 'High': return 'alert-circle';
            case 'Pre-Harvest': return 'hourglass';
            default: return 'help-circle';
        }
    },
};
