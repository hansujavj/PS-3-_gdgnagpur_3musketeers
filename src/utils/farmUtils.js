/**
 * farmUtils.js
 * Utility constants and helpers for farm setup.
 */

export const AREA_UNITS = [
    { value: 'hectare', label: 'Hectare' },
    { value: 'acre', label: 'Acre' },
    { value: 'bigha', label: 'Bigha' },
    { value: 'guntha', label: 'Guntha' },
    { value: 'cent', label: 'Cent' },
    { value: 'sqft', label: 'Sq. Feet' },
    { value: 'sqm', label: 'Sq. Meter' },
];

export const SOIL_TYPES_LIST = [
    'Black Cotton Soil',
    'Alluvial Soil',
    'Laterite Soil',
    'Loamy',
    'Red Soil',
    'Sandy Soil',
    'Clay Soil',
    'Silty Soil',
    'Peaty Soil',
    'Chalky Soil',
];

/**
 * Convert any area unit to hectares
 * @param {number} value - numeric area
 * @param {string} unit - unit key from AREA_UNITS
 * @returns {number} area in hectares (rounded to 4 decimals)
 */
export const convertToHectares = (value, unit) => {
    const factors = {
        hectare: 1,
        acre: 0.404686,
        bigha: 0.165,          // 1 Bigha ≈ 0.165 ha (varies by state)
        guntha: 0.010117,      // 1 Guntha = 0.010117 ha
        cent: 0.004047,        // 1 Cent = 0.004047 ha
        sqft: 0.0000929,       // 1 sq ft = 0.0000929 ha
        sqm: 0.0001,           // 1 sq m = 0.0001 ha
    };
    const factor = factors[unit] ?? 1;
    return Math.round(value * factor * 10000) / 10000;
};
