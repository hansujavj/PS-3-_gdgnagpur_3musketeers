export const CropAdvisoryEngine = {
    /**
     * Generate advisory based on inputs
     */
    getAdvisory: (crop, soil, weather, daysSinceSowing) => {
        const advice = [];

        // 1. Irrigation Logic
        if (weather.rainfall < 5 && soil.moisture < '30%') {
            advice.push({
                type: 'irrigation',
                severity: 'high',
                message: 'Soil moisture is low. Irrigate immediately.'
            });
        }

        // 2. Fertilizer Logic (Rule-based on days)
        if (daysSinceSowing > 20 && daysSinceSowing < 30) {
            advice.push({
                type: 'fertilizer',
                severity: 'medium',
                message: 'Apply first dose of Nitrogen (Urea).'
            });
        }

        // 3. Pest Logic (Mock)
        if (weather.humidity > 80 && weather.temp > 25) {
            advice.push({
                type: 'pest',
                severity: 'medium',
                message: 'High humidity detected. Watch out for Fungal Blight.'
            });
        }

        return advice;
    }
};
