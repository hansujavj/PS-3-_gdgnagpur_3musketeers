/**
 * Soil Engine - Enhanced with detailed soil type information
 * Provides comprehensive soil data, recommendations, and best practices
 */

// Comprehensive soil type database
const SOIL_TYPES = {
    'Black Cotton Soil': {
        type: 'Black Cotton Soil',
        ph: '7.2 - 8.5 (Slightly Alkaline)',
        nitrogen: 'Low',
        phosphorus: 'Medium',
        potassium: 'High',
        moisture: '55-65%',
        texture: 'Heavy clay',
        color: 'Deep black',
        bestCrops: ['Cotton', 'Wheat', 'Jowar', 'Sugarcane', 'Sunflower'],
        characteristics: [
            'High water retention capacity',
            'Swells when wet, shrinks when dry',
            'Rich in calcium and magnesium',
            'Poor drainage'
        ],
        amendments: [
            'Add organic matter (5-10 tons FYM/ha)',
            'Apply gypsum (2-3 tons/ha) to improve structure',
            'Use green manure crops',
            'Incorporate sand for better drainage'
        ],
        fertilizer: {
            npk: '120:60:40 kg/ha',
            organic: 'Vermicompost 2-3 tons/ha',
            timing: 'Split application - Basal + Top dressing'
        }
    },
    'Alluvial Soil': {
        type: 'Alluvial Soil',
        ph: '6.0 - 7.5 (Neutral)',
        nitrogen: 'High',
        phosphorus: 'Medium',
        potassium: 'Medium',
        moisture: '40-50%',
        texture: 'Loamy to sandy loam',
        color: 'Light brown to grey',
        bestCrops: ['Rice', 'Wheat', 'Sugarcane', 'Maize', 'Vegetables'],
        characteristics: [
            'Highly fertile and productive',
            'Good water holding capacity',
            'Rich in potash and lime',
            'Excellent for irrigation'
        ],
        amendments: [
            'Regular organic matter addition',
            'Balanced NPK fertilization',
            'Crop rotation recommended',
            'Minimal pH correction needed'
        ],
        fertilizer: {
            npk: '100:50:50 kg/ha',
            organic: 'FYM 8-10 tons/ha',
            timing: 'Basal + 2-3 split doses'
        }
    },
    'Laterite Soil': {
        type: 'Laterite Soil',
        ph: '5.0 - 6.5 (Acidic)',
        nitrogen: 'Low',
        phosphorus: 'Low',
        potassium: 'Low',
        moisture: '30-40%',
        texture: 'Gravelly clay',
        color: 'Red to reddish-brown',
        bestCrops: ['Cashew', 'Coffee', 'Tea', 'Rubber', 'Coconut'],
        characteristics: [
            'High iron and aluminum content',
            'Low fertility',
            'Good drainage',
            'Acidic in nature'
        ],
        amendments: [
            'Apply lime (3-5 tons/ha) to reduce acidity',
            'Heavy organic manuring required',
            'Add rock phosphate for P deficiency',
            'Mulching to retain moisture'
        ],
        fertilizer: {
            npk: '150:80:60 kg/ha',
            organic: 'Compost 10-12 tons/ha',
            timing: 'Frequent light applications'
        }
    },
    'Loamy Soil': {
        type: 'Loamy Soil',
        ph: '6.5 - 7.5 (Neutral)',
        nitrogen: 'High',
        phosphorus: 'High',
        potassium: 'High',
        moisture: '45-55%',
        texture: 'Balanced sand-silt-clay',
        color: 'Dark brown',
        bestCrops: ['Wheat', 'Vegetables', 'Fruits', 'Pulses', 'Oilseeds'],
        characteristics: [
            'Ideal soil for most crops',
            'Perfect balance of drainage and retention',
            'High nutrient availability',
            'Easy to work with'
        ],
        amendments: [
            'Maintain organic matter levels',
            'Regular compost addition',
            'Minimal amendments needed',
            'Focus on nutrient balance'
        ],
        fertilizer: {
            npk: '80:40:40 kg/ha',
            organic: 'FYM 6-8 tons/ha',
            timing: 'Basal + Top dressing'
        }
    },
    'Red Soil': {
        type: 'Red Soil',
        ph: '5.5 - 7.0 (Slightly Acidic)',
        nitrogen: 'Low',
        phosphorus: 'Low',
        potassium: 'Medium',
        moisture: '35-45%',
        texture: 'Sandy to loamy',
        color: 'Red to reddish-brown',
        bestCrops: ['Groundnut', 'Millets', 'Pulses', 'Cotton', 'Tobacco'],
        characteristics: [
            'Rich in iron oxides',
            'Porous and friable',
            'Low water retention',
            'Deficient in nitrogen and phosphorus'
        ],
        amendments: [
            'Add lime if pH < 6.0',
            'Heavy organic manuring',
            'Apply phosphatic fertilizers',
            'Mulching for moisture conservation'
        ],
        fertilizer: {
            npk: '140:70:50 kg/ha',
            organic: 'FYM 10-12 tons/ha',
            timing: 'Split doses with irrigation'
        }
    },
    'Sandy Soil': {
        type: 'Sandy Soil',
        ph: '6.0 - 7.0 (Neutral)',
        nitrogen: 'Very Low',
        phosphorus: 'Low',
        potassium: 'Low',
        moisture: '20-30%',
        texture: 'Coarse and gritty',
        color: 'Light yellow to brown',
        bestCrops: ['Millets', 'Groundnut', 'Watermelon', 'Carrots', 'Radish'],
        characteristics: [
            'Excellent drainage',
            'Low water holding capacity',
            'Low fertility',
            'Easy to cultivate'
        ],
        amendments: [
            'Heavy organic matter addition (15-20 tons/ha)',
            'Clay incorporation for water retention',
            'Frequent light fertilization',
            'Mulching essential'
        ],
        fertilizer: {
            npk: '160:80:60 kg/ha',
            organic: 'Compost 15-20 tons/ha',
            timing: 'Frequent small doses'
        }
    }
};

// Regional soil mapping
const REGIONAL_SOIL_MAP = {
    'Maharashtra': {
        'Pune': 'Black Cotton Soil',
        'Nashik': 'Black Cotton Soil',
        'Mumbai': 'Laterite Soil',
        'Nagpur': 'Black Cotton Soil',
        'Aurangabad': 'Black Cotton Soil'
    },
    'Punjab': {
        'Ludhiana': 'Alluvial Soil',
        'Amritsar': 'Alluvial Soil',
        'Jalandhar': 'Alluvial Soil'
    },
    'Karnataka': {
        'Bangalore': 'Red Soil',
        'Mysore': 'Red Soil',
        'Mangalore': 'Laterite Soil'
    },
    'Tamil Nadu': {
        'Chennai': 'Red Soil',
        'Coimbatore': 'Red Soil',
        'Madurai': 'Black Cotton Soil'
    },
    'Uttar Pradesh': {
        'Lucknow': 'Alluvial Soil',
        'Kanpur': 'Alluvial Soil',
        'Varanasi': 'Alluvial Soil'
    },
    'West Bengal': {
        'Kolkata': 'Alluvial Soil',
        'Darjeeling': 'Laterite Soil'
    },
    'Gujarat': {
        'Ahmedabad': 'Alluvial Soil',
        'Surat': 'Black Cotton Soil',
        'Rajkot': 'Black Cotton Soil'
    },
    'Rajasthan': {
        'Jaipur': 'Sandy Soil',
        'Jodhpur': 'Sandy Soil',
        'Udaipur': 'Red Soil'
    },
    'default': 'Loamy Soil'
};

export const SoilEngine = {
    /**
     * Get soil info based on region
     */
    getSoilInfo: (region, cropName) => {
        try {
            let soilType = REGIONAL_SOIL_MAP['default'];

            if (region && region.state && region.district) {
                const stateData = REGIONAL_SOIL_MAP[region.state];
                if (stateData) {
                    soilType = stateData[region.district] || stateData['default'] || REGIONAL_SOIL_MAP['default'];
                }
            }

            return SoilEngine.getSoilDetails(soilType);
        } catch (e) {
            console.error('Soil info error:', e);
            return SoilEngine.getSoilDetails(REGIONAL_SOIL_MAP['default']);
        }
    },

    /**
     * Get detailed soil information by type
     */
    getSoilDetails: (soilType) => {
        return SOIL_TYPES[soilType] || SOIL_TYPES['Loamy Soil'];
    },

    /**
     * Get all available soil types
     */
    getAllSoilTypes: () => {
        return Object.keys(SOIL_TYPES);
    },

    /**
     * Get soil recommendations for specific crop
     */
    getCropSoilRecommendations: (soilType, cropName) => {
        const soilData = SOIL_TYPES[soilType] || SOIL_TYPES['Loamy Soil'];

        return {
            suitable: soilData.bestCrops.includes(cropName),
            recommendations: soilData.amendments,
            fertilizer: soilData.fertilizer
        };
    }
};
