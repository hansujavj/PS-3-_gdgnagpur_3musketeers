/**
 * cropClinicData.js
 *
 * Static disease mapping and treatment data for Crop Clinic.
 * Maps Google Cloud Vision labels to disease categories and treatments.
 */

/**
 * Label-to-disease mapping rules.
 * Each rule has keywords (matched against Vision label descriptions)
 * and the disease category it maps to.
 */
export const DISEASE_RULES = [
    {
        id: 'fungal_disease',
        name: 'Fungal Disease',
        keywords: ['leaf spot', 'fungal infection', 'blight', 'fungus', 'rust', 'mold', 'mildew', 'anthracnose', 'scab', 'rot', 'canker', 'wilt'],
        icon: 'bug-outline',
        color: '#d32f2f',
    },
    {
        id: 'powdery_mildew',
        name: 'Powdery Mildew',
        keywords: ['powdery mildew', 'white powder', 'powdery', 'white coating'],
        icon: 'snow-outline',
        color: '#7b1fa2',
    },
    {
        id: 'bacterial_disease',
        name: 'Bacterial Disease',
        keywords: ['bacterial', 'bacteria', 'bacterial spot', 'bacterial wilt', 'fire blight', 'soft rot', 'crown gall'],
        icon: 'warning-outline',
        color: '#e65100',
    },
    {
        id: 'viral_disease',
        name: 'Viral Disease',
        keywords: ['mosaic', 'virus', 'viral', 'yellowing', 'curl', 'leaf curl', 'stunting', 'mottle'],
        icon: 'alert-circle-outline',
        color: '#c62828',
    },
    {
        id: 'nutrient_deficiency',
        name: 'Nutrient Deficiency',
        keywords: ['chlorosis', 'yellowing', 'deficiency', 'necrosis', 'pale', 'discoloration', 'browning'],
        icon: 'flask-outline',
        color: '#f57c00',
    },
    {
        id: 'pest_damage',
        name: 'Pest Damage',
        keywords: ['pest', 'insect', 'aphid', 'caterpillar', 'beetle', 'mite', 'whitefly', 'larvae', 'borer', 'thrips', 'bug', 'insect damage'],
        icon: 'bug-outline',
        color: '#795548',
    },
    {
        id: 'drought_stress',
        name: 'Drought Stress',
        keywords: ['wilting', 'drought', 'dry', 'dehydration', 'shriveled', 'crispy'],
        icon: 'water-outline',
        color: '#ff8f00',
    },
    {
        id: 'healthy',
        name: 'Healthy',
        keywords: ['healthy plant', 'green leaf', 'healthy', 'fresh', 'lush', 'vibrant', 'normal'],
        icon: 'checkmark-circle-outline',
        color: '#2e7d32',
    },
];

/**
 * Treatment recommendations mapped by disease ID.
 */
export const TREATMENTS = {
    fungal_disease: {
        pesticide: 'Mancozeb',
        dosage: '2g per liter of water',
        spray_interval: '7 days',
        prevention: [
            'Avoid excess moisture on leaves',
            'Ensure good air circulation',
            'Remove and destroy infected plant parts',
            'Use disease-free seeds',
            'Apply copper-based fungicide preventively',
        ],
        organic_alternative: 'Neem oil spray (5ml per liter)',
        emergency: 'Remove severely infected plants immediately to prevent spread',
    },
    powdery_mildew: {
        pesticide: 'Sulfur fungicide',
        dosage: '3g per liter of water',
        spray_interval: '10 days',
        prevention: [
            'Improve air circulation around plants',
            'Avoid overhead watering',
            'Plant resistant varieties',
            'Apply potassium bicarbonate solution',
        ],
        organic_alternative: 'Baking soda solution (1 tbsp per liter + few drops dish soap)',
        emergency: 'Prune heavily infected leaves and apply sulfur immediately',
    },
    bacterial_disease: {
        pesticide: 'Copper hydroxide',
        dosage: '2.5g per liter of water',
        spray_interval: '5-7 days',
        prevention: [
            'Use certified disease-free seeds',
            'Avoid working with wet plants',
            'Sanitize tools between plants',
            'Rotate crops every season',
            'Remove infected debris from field',
        ],
        organic_alternative: 'Bordeaux mixture (copper sulfate + lime)',
        emergency: 'Isolate and remove infected plants. Disinfect all tools.',
    },
    viral_disease: {
        pesticide: 'No direct cure (control vectors)',
        dosage: 'Use Imidacloprid 0.5ml/L for vector control',
        spray_interval: '14 days (for vector control)',
        prevention: [
            'Control insect vectors (aphids, whiteflies)',
            'Use virus-free planting material',
            'Remove and destroy infected plants',
            'Use reflective mulches to repel vectors',
            'Plant resistant varieties',
        ],
        organic_alternative: 'Yellow sticky traps for vector monitoring',
        emergency: 'Remove infected plants immediately. No cure exists for viral infections.',
    },
    nutrient_deficiency: {
        pesticide: 'Balanced NPK fertilizer',
        dosage: 'As per soil test recommendation',
        spray_interval: 'Apply foliar spray every 15 days',
        prevention: [
            'Conduct regular soil testing',
            'Maintain soil pH between 6.0-7.0',
            'Use organic compost regularly',
            'Apply micronutrient mixtures',
            'Mulch to retain soil moisture',
        ],
        organic_alternative: 'Vermicompost + seaweed extract foliar spray',
        emergency: 'Apply foliar micronutrient spray for quick recovery',
    },
    pest_damage: {
        pesticide: 'Chlorpyrifos / Cypermethrin',
        dosage: '2ml per liter of water',
        spray_interval: '10-14 days',
        prevention: [
            'Use pheromone traps for monitoring',
            'Introduce beneficial insects (ladybugs)',
            'Practice crop rotation',
            'Remove crop residues after harvest',
            'Use intercropping with pest-repellent plants',
        ],
        organic_alternative: 'Neem oil (5ml/L) + garlic extract spray',
        emergency: 'Handpick visible pests. Apply contact insecticide if infestation is severe.',
    },
    drought_stress: {
        pesticide: 'No pesticide needed',
        dosage: 'Ensure adequate irrigation',
        spray_interval: 'N/A',
        prevention: [
            'Mulch around plants to retain moisture',
            'Install drip irrigation system',
            'Water deeply but less frequently',
            'Use drought-resistant varieties',
            'Add organic matter to improve water retention',
        ],
        organic_alternative: 'Apply hydrogel crystals in soil',
        emergency: 'Provide immediate deep watering. Apply shade cloth if possible.',
    },
    healthy: {
        pesticide: 'No treatment needed',
        dosage: 'N/A',
        spray_interval: 'N/A',
        prevention: [
            'Continue current farming practices',
            'Monitor regularly for early signs of disease',
            'Maintain proper nutrition schedule',
            'Ensure adequate watering',
        ],
        organic_alternative: 'Preventive neem oil spray every 15 days',
        emergency: 'No action required. Crop appears healthy.',
    },
};

/**
 * Severity levels based on confidence scores.
 */
export const getSeverityLevel = (score) => {
    if (score > 0.85) return { level: 'High', color: '#d32f2f', icon: 'alert-circle' };
    if (score >= 0.65) return { level: 'Moderate', color: '#f57c00', icon: 'warning' };
    return { level: 'Low', color: '#fbc02d', icon: 'information-circle' };
};

/**
 * Low confidence threshold for expert consultation warning.
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.60;
