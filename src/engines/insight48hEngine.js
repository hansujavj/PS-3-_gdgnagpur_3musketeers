import { CropAdvisoryEngine } from './cropAdvisoryEngine';
import { SoilEngine } from './soilEngine';
import { RegionDetectionEngine } from './regionDetectionEngine';

// Mock Weather Data (In real app, this would come from an API or offline snapshot)
const MOCK_WEATHER = {
    temp: 28,
    humidity: 65,
    rainfall: 0,
    forecast: 'Sunny'
};

export const Insight48hEngine = {
    /**
     * Generate 48-hour insights for all registered crops
     */
    generateInsights: async (myCrops) => {
        const region = await RegionDetectionEngine.detectRegion();
        const insights = [];

        for (const crop of myCrops) {
            const soil = SoilEngine.getSoilInfo(region, crop.name);
            const cropSpecificAdvice = CropAdvisoryEngine.getAdvisory(crop, soil, MOCK_WEATHER, calculateDays(crop.sowingDate));

            cropSpecificAdvice.forEach(advice => {
                insights.push({
                    id: Math.random().toString(),
                    cropName: crop.name,
                    ...advice,
                    timestamp: new Date().toISOString()
                });
            });
        }

        // General Weather Insight
        if (MOCK_WEATHER.temp > 35) {
            insights.push({
                id: 'weather-heat',
                cropName: 'General',
                type: 'weather',
                severity: 'high',
                message: 'Heatwave alert! Protect young saplings from direct sun.',
                timestamp: new Date().toISOString()
            });
        }

        return insights;
    }
};

const calculateDays = (dateString) => {
    const start = new Date(dateString);
    const now = new Date();
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
};
