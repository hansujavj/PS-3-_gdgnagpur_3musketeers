// Mock rules for detection (would be loaded from JSON)
const DISEASE_RULES = {
    'wheat': {
        'Rust': {
            symptoms: ['orange_pustules', 'leaf_yellowing'],
            treatment: 'Apply fungicides like Propiconazole.'
        },
        'Leaf Blight': {
            symptoms: ['brown_lesions', 'drying_tips'],
            treatment: 'Use Mancozeb spray.'
        }
    },
    'rice': {
        'Blast': {
            symptoms: ['spindle_spots', 'gray_center'],
            treatment: 'Spray Tricyclazole.'
        }
    }
};

export const DiseaseEngine = {
    /**
     * Analyze image (Mock implementation for offline rule-based)
     * In a real implementation, this would use TensorFlow.js or simple OpenCV-like logic on pixel data.
     */
    detectFromImage: async (imageUri) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock Result
        return {
            diseaseName: 'Rust',
            confidence: 0.88,
            crop: 'wheat',
            symptoms: ['Orange pustules on leaves', 'Yellowing of leaf blade'],
            treatment: 'Apply fungicides like Propiconazole immediately. Ensure proper spacing between plants.'
        };
    },

    /**
     * Fallback questionnaire detection
     */
    detectFromSymptoms: (crop, selectedSymptoms) => {
        const cropDiseases = DISEASE_RULES[crop.toLowerCase()];
        if (!cropDiseases) return null;

        let bestMatch = null;
        let maxMatch = 0;

        for (const [disease, date] of Object.entries(cropDiseases)) {
            const matchCount = date.symptoms.filter(s => selectedSymptoms.includes(s)).length;
            if (matchCount > maxMatch) {
                maxMatch = matchCount;
                bestMatch = {
                    diseaseName: disease,
                    confidence: matchCount / date.symptoms.length,
                    treatment: date.treatment
                };
            }
        }
        return bestMatch;
    }
};
