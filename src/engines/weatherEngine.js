/**
 * weatherEngine.js
 *
 * Live weather data from Google Cloud Weather API.
 * Falls back to AsyncStorage cache, then offline seasonal estimation.
 */

import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getGoogleApiKey = () =>
    Constants.expoConfig?.extra?.GOOGLE_GEOCODING_API_KEY
    || process.env.GOOGLE_GEOCODING_API_KEY
    || '';

// Google Weather API condition type → icon mapping
const CONDITION_ICON_MAP = {
    CLEAR: 'sunny',
    MOSTLY_CLEAR: 'sunny',
    PARTLY_CLOUDY: 'partly-sunny',
    MOSTLY_CLOUDY: 'cloudy',
    CLOUDY: 'cloudy',
    FOG: 'cloudy',
    LIGHT_FOG: 'cloudy',
    DRIZZLE: 'rainy',
    RAIN: 'rainy',
    LIGHT_RAIN: 'rainy',
    HEAVY_RAIN: 'rainy',
    SNOW: 'snow',
    LIGHT_SNOW: 'snow',
    HEAVY_SNOW: 'snow',
    THUNDERSTORM: 'thunderstorm',
    HAIL: 'thunderstorm',
};

const getIconForCondition = (type) => CONDITION_ICON_MAP[type] || 'partly-sunny';

// Offline fallback — season-based estimation
const offlineFallback = (region) => {
    const month = new Date().getMonth() + 1;
    let temp = 28, humidity = 60, condition = 'Clear', icon = 'sunny', rainfall = 0;
    if (month >= 12 || month <= 2) { temp = 15; condition = 'Cool'; icon = 'partly-sunny'; humidity = 50; }
    else if (month >= 3 && month <= 5) { temp = 36; humidity = 35; condition = 'Hot'; icon = 'sunny'; }
    else if (month >= 6 && month <= 9) { temp = 30; humidity = 80; condition = 'Rainy'; icon = 'rainy'; rainfall = 40; }
    return { temperature: temp, feelsLike: temp + 2, condition, humidity, rainfall, icon, windSpeed: 0, uvIndex: 0, visibility: 10, lastUpdated: new Date().toISOString(), source: 'offline' };
};

export const WeatherEngine = {
    /**
     * Get current weather from Google Cloud Weather API.
     * Falls back to cache → offline estimate.
     * @param {Object} region - { state, district }
     * @param {Object} farmCoords - { latitude, longitude } from farm details
     */
    getCurrentWeather: async (region, farmCoords = null) => {
        const apiKey = getGoogleApiKey();
        const lat = farmCoords?.latitude ?? 19.9975;
        const lng = farmCoords?.longitude ?? 73.7898;

        if (apiKey) {
            try {
                const url = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${apiKey}&location.latitude=${lat}&location.longitude=${lng}`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();

                    const conditionType = data.weatherCondition?.type || 'CLEAR';
                    const conditionText = data.weatherCondition?.description?.text || conditionType;
                    const icon = getIconForCondition(conditionType);

                    // Wind speed comes in km/h, convert to m/s for consistency
                    const windSpeedKmh = data.wind?.speed?.value ?? 0;
                    const windSpeedMs = Math.round((windSpeedKmh / 3.6) * 10) / 10;

                    const result = {
                        temperature: Math.round(data.temperature?.degrees ?? 0),
                        feelsLike: Math.round(data.feelsLikeTemperature?.degrees ?? data.temperature?.degrees ?? 0),
                        condition: conditionText,
                        humidity: Math.round(data.relativeHumidity ?? 0),
                        rainfall: Math.round((data.precipitation?.qpf?.quantity ?? 0) * 10) / 10,
                        icon,
                        windSpeed: windSpeedMs,
                        uvIndex: data.uvIndex ?? 0,
                        visibility: Math.round((data.visibility?.distance ?? 0) * 10) / 10,
                        lastUpdated: new Date().toISOString(),
                        source: 'google-weather',
                    };
                    await AsyncStorage.setItem('weather-cache', JSON.stringify(result));
                    return result;
                }
            } catch (err) {
                console.warn('Google Weather API failed, using fallback:', err.message);
            }
        }

        // Try cache
        try {
            const cached = await AsyncStorage.getItem('weather-cache');
            if (cached) return { ...JSON.parse(cached), source: 'cached' };
        } catch { }

        return offlineFallback(region);
    },

    /**
     * Get farming advice based on current weather.
     */
    getFarmingAdvice: (weather) => {
        if (!weather) return 'Weather data unavailable.';
        if (weather.rainfall > 50) return 'Heavy rainfall. Ensure drainage and delay fertilizer application.';
        if (weather.rainfall > 20) return 'Moderate rain. Good for irrigation. Watch for waterlogging.';
        if (weather.temperature > 38) return 'Extreme heat. Irrigate early morning or evening. Protect crops from sunburn.';
        if (weather.temperature > 32) return 'Hot weather. Ensure adequate irrigation. Monitor for heat stress.';
        if (weather.temperature < 10) return 'Cold weather. Protect sensitive crops from frost damage.';
        if (weather.humidity > 80) return 'High humidity. Watch for fungal diseases. Ensure good air circulation.';
        return 'Favorable weather conditions. Good time for regular farm activities.';
    },
};
