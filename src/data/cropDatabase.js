/**
 * Comprehensive Crop Database
 * Includes growth stages, harvest timing, fertilizer schedule, and treatment timeline
 */

export const CROP_DATABASE = {
    'Wheat': {
        name: 'Wheat',
        duration_days: 120,
        harvest_type: 'single', // single or continuous
        growth_stages: [
            { stage: 'Germination', days: '0-10', icon: 'water' },
            { stage: 'Tillering', days: '10-30', icon: 'git-branch' },
            { stage: 'Jointing', days: '30-60', icon: 'resize' },
            { stage: 'Heading', days: '60-90', icon: 'flower' },
            { stage: 'Grain Filling', days: '90-110', icon: 'nutrition' },
            { stage: 'Maturity', days: '110-120', icon: 'checkmark-circle' }
        ],
        treatment_schedule: [
            { day: 0, task: 'Sowing', type: 'planting', status: 'completed', description: 'Seed treatment with fungicide' },
            { day: 15, task: 'First Irrigation', type: 'watering', status: 'pending', description: 'Light irrigation' },
            { day: 21, task: 'First Fertilizer', type: 'fertilizer', status: 'pending', description: 'Urea 60 kg/ha' },
            { day: 30, task: 'Weed Control', type: 'treatment', status: 'pending', description: 'Manual or herbicide' },
            { day: 45, task: 'Second Fertilizer', type: 'fertilizer', status: 'pending', description: 'Urea 40 kg/ha' },
            { day: 60, task: 'Pest Monitoring', type: 'monitoring', status: 'pending', description: 'Check for aphids' },
            { day: 75, task: 'Third Fertilizer', type: 'fertilizer', status: 'pending', description: 'Urea 20 kg/ha' },
            { day: 90, task: 'Disease Check', type: 'monitoring', status: 'pending', description: 'Check for rust' },
            { day: 110, task: 'Pre-Harvest', type: 'monitoring', status: 'pending', description: 'Stop irrigation' },
            { day: 120, task: 'Harvest', type: 'harvest', status: 'pending', description: 'Combine harvesting' }
        ]
    },
    'Rice': {
        name: 'Rice',
        duration_days: 140,
        harvest_type: 'single',
        growth_stages: [
            { stage: 'Seedling', days: '0-20', icon: 'water' },
            { stage: 'Tillering', days: '20-45', icon: 'git-branch' },
            { stage: 'Stem Elongation', days: '45-65', icon: 'resize' },
            { stage: 'Panicle Initiation', days: '65-85', icon: 'flower' },
            { stage: 'Flowering', days: '85-105', icon: 'rose' },
            { stage: 'Grain Filling', days: '105-130', icon: 'nutrition' },
            { stage: 'Maturity', days: '130-140', icon: 'checkmark-circle' }
        ],
        treatment_schedule: [
            { day: 0, task: 'Transplanting', type: 'planting', status: 'completed', description: '2-3 seedlings per hill' },
            { day: 10, task: 'First Fertilizer', type: 'fertilizer', status: 'pending', description: 'NPK 60:30:30 kg/ha' },
            { day: 25, task: 'Weed Control', type: 'treatment', status: 'pending', description: 'First weeding' },
            { day: 40, task: 'Second Fertilizer', type: 'fertilizer', status: 'pending', description: 'Urea 40 kg/ha' },
            { day: 50, task: 'Pest Control', type: 'treatment', status: 'pending', description: 'Stem borer management' },
            { day: 70, task: 'Third Fertilizer', type: 'fertilizer', status: 'pending', description: 'Urea 30 kg/ha' },
            { day: 90, task: 'Disease Monitoring', type: 'monitoring', status: 'pending', description: 'Check for blast' },
            { day: 120, task: 'Drain Field', type: 'watering', status: 'pending', description: 'Stop water 2 weeks before harvest' },
            { day: 140, task: 'Harvest', type: 'harvest', status: 'pending', description: 'When 80% grains are golden' }
        ]
    },
    'Tomato': {
        name: 'Tomato',
        duration_days: 90,
        harvest_type: 'continuous', // Can pluck multiple times
        first_harvest_day: 60,
        last_harvest_day: 90,
        plucking_frequency: 3, // days between plucking
        growth_stages: [
            { stage: 'Seedling', days: '0-15', icon: 'water' },
            { stage: 'Vegetative', days: '15-30', icon: 'leaf' },
            { stage: 'Flowering', days: '30-45', icon: 'flower' },
            { stage: 'Fruit Set', days: '45-60', icon: 'nutrition' },
            { stage: 'Ripening', days: '60-90', icon: 'checkmark-circle' }
        ],
        treatment_schedule: [
            { day: 0, task: 'Transplanting', type: 'planting', status: 'completed', description: 'Plant 30-45 day seedlings' },
            { day: 7, task: 'First Watering', type: 'watering', status: 'pending', description: 'Light irrigation' },
            { day: 15, task: 'First Fertilizer', type: 'fertilizer', status: 'pending', description: 'NPK 19:19:19 @ 5g/plant' },
            { day: 20, task: 'Staking', type: 'treatment', status: 'pending', description: 'Install support stakes' },
            { day: 30, task: 'Second Fertilizer', type: 'fertilizer', status: 'pending', description: 'NPK 19:19:19 @ 10g/plant' },
            { day: 35, task: 'Pruning', type: 'treatment', status: 'pending', description: 'Remove suckers' },
            { day: 45, task: 'Third Fertilizer', type: 'fertilizer', status: 'pending', description: 'Potash boost 5g/plant' },
            { day: 50, task: 'Pest Control', type: 'treatment', status: 'pending', description: 'Check for whitefly' },
            { day: 60, task: 'First Plucking', type: 'harvest', status: 'pending', description: 'Pick ripe red tomatoes' },
            { day: 63, task: 'Plucking', type: 'harvest', status: 'pending', description: 'Continue picking' },
            { day: 66, task: 'Plucking', type: 'harvest', status: 'pending', description: 'Continue picking' },
            { day: 70, task: 'Fourth Fertilizer', type: 'fertilizer', status: 'pending', description: 'NPK 19:19:19 @ 5g/plant' },
            { day: 75, task: 'Plucking', type: 'harvest', status: 'pending', description: 'Continue picking' },
            { day: 80, task: 'Plucking', type: 'harvest', status: 'pending', description: 'Continue picking' },
            { day: 85, task: 'Plucking', type: 'harvest', status: 'pending', description: 'Continue picking' },
            { day: 90, task: 'Final Plucking', type: 'harvest', status: 'pending', description: 'Last harvest' }
        ]
    },
    'Cotton': {
        name: 'Cotton',
        duration_days: 160,
        harvest_type: 'continuous',
        first_harvest_day: 120,
        last_harvest_day: 160,
        plucking_frequency: 15,
        growth_stages: [
            { stage: 'Germination', days: '0-10', icon: 'water' },
            { stage: 'Vegetative', days: '10-60', icon: 'leaf' },
            { stage: 'Flowering', days: '60-90', icon: 'flower' },
            { stage: 'Boll Formation', days: '90-120', icon: 'nutrition' },
            { stage: 'Boll Opening', days: '120-160', icon: 'checkmark-circle' }
        ],
        treatment_schedule: [
            { day: 0, task: 'Sowing', type: 'planting', status: 'completed', description: 'Seed treatment done' },
            { day: 20, task: 'Thinning', type: 'treatment', status: 'pending', description: 'One plant per hill' },
            { day: 30, task: 'First Fertilizer', type: 'fertilizer', status: 'pending', description: 'NPK 60:30:30 kg/ha' },
            { day: 45, task: 'Weed Control', type: 'treatment', status: 'pending', description: 'Manual weeding' },
            { day: 60, task: 'Second Fertilizer', type: 'fertilizer', status: 'pending', description: 'Urea 50 kg/ha' },
            { day: 75, task: 'Pest Control', type: 'treatment', status: 'pending', description: 'Bollworm management' },
            { day: 90, task: 'Third Fertilizer', type: 'fertilizer', status: 'pending', description: 'Urea 30 kg/ha' },
            { day: 105, task: 'Disease Check', type: 'monitoring', status: 'pending', description: 'Check for wilt' },
            { day: 120, task: 'First Picking', type: 'harvest', status: 'pending', description: 'Pick opened bolls' },
            { day: 135, task: 'Second Picking', type: 'harvest', status: 'pending', description: 'Continue picking' },
            { day: 150, task: 'Third Picking', type: 'harvest', status: 'pending', description: 'Continue picking' },
            { day: 160, task: 'Final Picking', type: 'harvest', status: 'pending', description: 'Last harvest' }
        ]
    },
    'Sugarcane': {
        name: 'Sugarcane',
        duration_days: 365,
        harvest_type: 'single',
        growth_stages: [
            { stage: 'Germination', days: '0-30', icon: 'water' },
            { stage: 'Tillering', days: '30-120', icon: 'git-branch' },
            { stage: 'Grand Growth', days: '120-270', icon: 'resize' },
            { stage: 'Maturity', days: '270-365', icon: 'checkmark-circle' }
        ],
        treatment_schedule: [
            { day: 0, task: 'Planting', type: 'planting', status: 'completed', description: 'Set planting' },
            { day: 30, task: 'Gap Filling', type: 'treatment', status: 'pending', description: 'Replace missing sets' },
            { day: 45, task: 'First Fertilizer', type: 'fertilizer', status: 'pending', description: 'NPK 120:60:60 kg/ha' },
            { day: 60, task: 'Earthing Up', type: 'treatment', status: 'pending', description: 'Soil mounding' },
            { day: 90, task: 'Weed Control', type: 'treatment', status: 'pending', description: 'Inter-cultivation' },
            { day: 120, task: 'Second Fertilizer', type: 'fertilizer', status: 'pending', description: 'Urea 100 kg/ha' },
            { day: 180, task: 'Pest Control', type: 'treatment', status: 'pending', description: 'Borer management' },
            { day: 240, task: 'Third Fertilizer', type: 'fertilizer', status: 'pending', description: 'Potash 50 kg/ha' },
            { day: 300, task: 'Pre-Harvest', type: 'monitoring', status: 'pending', description: 'Stop irrigation' },
            { day: 330, task: 'Detrashing', type: 'treatment', status: 'pending', description: 'Remove dry leaves' },
            { day: 365, task: 'Harvest', type: 'harvest', status: 'pending', description: 'Cut at ground level' }
        ]
    }
};

/**
 * Get crop data by name
 */
export const getCropData = (cropName) => {
    return CROP_DATABASE[cropName] || null;
};

/**
 * Calculate treatment timeline for a crop based on sowing date
 */
export const getCropTimeline = (cropName, sowingDate) => {
    const cropData = CROP_DATABASE[cropName];
    if (!cropData) return [];

    const sowing = new Date(sowingDate);
    const today = new Date();
    const daysSinceSowing = Math.floor((today - sowing) / (1000 * 60 * 60 * 24));

    return cropData.treatment_schedule.map(item => {
        const taskDate = new Date(sowing);
        taskDate.setDate(taskDate.getDate() + item.day);

        const isPast = item.day < daysSinceSowing;
        const isToday = item.day === daysSinceSowing;
        const isFuture = item.day > daysSinceSowing;

        return {
            ...item,
            date: taskDate,
            isPast,
            isToday,
            isFuture,
            daysUntil: item.day - daysSinceSowing
        };
    });
};

/**
 * Get next upcoming tasks
 */
export const getUpcomingTasks = (cropName, sowingDate, limit = 3) => {
    const timeline = getCropTimeline(cropName, sowingDate);
    return timeline
        .filter(task => task.isFuture || task.isToday)
        .slice(0, limit);
};

/**
 * Calculate harvest countdown
 */
export const getHarvestInfo = (cropName, sowingDate) => {
    const cropData = CROP_DATABASE[cropName];
    if (!cropData) return null;

    const sowing = new Date(sowingDate);
    const today = new Date();
    const daysSinceSowing = Math.floor((today - sowing) / (1000 * 60 * 60 * 24));

    if (cropData.harvest_type === 'continuous') {
        const firstHarvest = new Date(sowing);
        firstHarvest.setDate(firstHarvest.getDate() + cropData.first_harvest_day);

        const lastHarvest = new Date(sowing);
        lastHarvest.setDate(lastHarvest.getDate() + cropData.last_harvest_day);

        const daysToFirstHarvest = cropData.first_harvest_day - daysSinceSowing;
        const daysToLastHarvest = cropData.last_harvest_day - daysSinceSowing;

        return {
            type: 'continuous',
            firstHarvestDate: firstHarvest,
            lastHarvestDate: lastHarvest,
            daysToFirstHarvest,
            daysToLastHarvest,
            isHarvestTime: daysSinceSowing >= cropData.first_harvest_day && daysSinceSowing <= cropData.last_harvest_day,
            pluckingFrequency: cropData.plucking_frequency
        };
    } else {
        const harvestDate = new Date(sowing);
        harvestDate.setDate(harvestDate.getDate() + cropData.duration_days);

        const daysToHarvest = cropData.duration_days - daysSinceSowing;

        return {
            type: 'single',
            harvestDate,
            daysToHarvest,
            isReady: daysToHarvest <= 0
        };
    }
};

/**
 * Get context-aware recommendation for the crop
 */
export const getRecommendation = (cropName, sowingDate) => {
    const cropData = CROP_DATABASE[cropName];
    if (!cropData) return "Monitor crop health regularly.";

    const sowing = new Date(sowingDate);
    const today = new Date();
    const daysSinceSowing = Math.floor((today - sowing) / (1000 * 60 * 60 * 24));

    // 1. Check for immediate upcoming or overdue tasks (high priority)
    const criticalTask = cropData.treatment_schedule.find(t => {
        const taskDay = t.day;
        return Math.abs(daysSinceSowing - taskDay) <= 2; // Tasks within +/- 2 days
    });

    if (criticalTask) {
        return `Action: ${criticalTask.task} - ${criticalTask.description}`;
    }

    // 2. Fallback to growth stage advice
    const currentStage = cropData.growth_stages.find(s => {
        const [min, max] = s.days.split('-').map(Number);
        return daysSinceSowing >= min && daysSinceSowing <= max;
    });

    if (currentStage) {
        return `Stage: ${currentStage.stage}. Ensure optimal conditions.`;
    }

    return "Keep the field clean and monitor for pests.";
};
