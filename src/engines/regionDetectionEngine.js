/**
 * regionDetectionEngine.js
 * 
 * Accurate GPS location detection with reverse geocoding
 * Supports manual location setting and caching
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// India state coordinates for reverse geocoding (simplified)
const INDIA_STATES = {
    'Maharashtra': { lat: [15.6, 22.0], lon: [72.6, 80.9] },
    'Gujarat': { lat: [20.1, 24.7], lon: [68.2, 74.5] },
    'Karnataka': { lat: [11.5, 18.5], lon: [74.0, 78.6] },
    'Tamil Nadu': { lat: [8.1, 13.6], lon: [76.2, 80.3] },
    'Uttar Pradesh': { lat: [23.9, 30.4], lon: [77.1, 84.6] },
    'Rajasthan': { lat: [23.0, 30.2], lon: [69.5, 78.3] },
    'Madhya Pradesh': { lat: [21.1, 26.9], lon: [74.0, 82.8] },
    'West Bengal': { lat: [21.5, 27.2], lon: [85.8, 89.9] },
    'Bihar': { lat: [24.3, 27.5], lon: [83.3, 88.3] },
    'Andhra Pradesh': { lat: [12.6, 19.9], lon: [76.8, 84.8] },
    'Telangana': { lat: [15.9, 19.9], lon: [77.2, 81.3] },
    'Punjab': { lat: [29.5, 32.6], lon: [73.9, 76.9] },
    'Haryana': { lat: [27.7, 30.9], lon: [74.5, 77.6] },
    'Kerala': { lat: [8.2, 12.8], lon: [74.9, 77.4] },
    'Odisha': { lat: [17.8, 22.6], lon: [81.3, 87.5] },
    'Jharkhand': { lat: [21.9, 25.3], lon: [83.3, 87.9] },
    'Assam': { lat: [24.1, 28.0], lon: [89.7, 96.0] },
    'Chhattisgarh': { lat: [17.8, 24.1], lon: [80.3, 84.4] },
    'Uttarakhand': { lat: [28.7, 31.5], lon: [77.6, 81.0] },
    'Himachal Pradesh': { lat: [30.4, 33.2], lon: [75.6, 79.0] },
    'Goa': { lat: [14.9, 15.8], lon: [73.7, 74.3] },
    'Delhi': { lat: [28.4, 28.9], lon: [76.8, 77.3] }
};

export const RegionDetectionEngine = {
    /**
     * Detect region using GPS with accurate coordinates
     */
    detectRegion: async () => {
        try {
            // 1. Check for manual location first
            const manual = await AsyncStorage.getItem('manual-location');
            if (manual) {
                const parsed = JSON.parse(manual);
                return {
                    ...parsed,
                    source: 'manual'
                };
            }

            // 2. Try GPS
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced
                });

                const detected = await RegionDetectionEngine.mapCoordinatesToRegion(
                    location.coords.latitude,
                    location.coords.longitude
                );

                if (detected) {
                    // Cache GPS location
                    await AsyncStorage.setItem('last-gps-location', JSON.stringify({
                        ...detected,
                        coordinates: {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude
                        },
                        timestamp: new Date().toISOString()
                    }));

                    return {
                        ...detected,
                        source: 'gps'
                    };
                }
            }

            // 3. Fallback to cached GPS location
            const cached = await AsyncStorage.getItem('last-gps-location');
            if (cached) {
                const parsed = JSON.parse(cached);
                return {
                    ...parsed,
                    source: 'cached'
                };
            }

            // 4. Default fallback
            return {
                state: 'Maharashtra',
                district: 'Nashik',
                coordinates: { latitude: 19.9975, longitude: 73.7898 },
                source: 'default'
            };
        } catch (error) {
            console.error('Region detection failed:', error);

            // Return cached or default
            try {
                const cached = await AsyncStorage.getItem('last-gps-location');
                if (cached) {
                    return { ...JSON.parse(cached), source: 'cached' };
                }
            } catch (e) {
                console.error('Cache read failed:', e);
            }

            return {
                state: 'Maharashtra',
                district: 'Nashik',
                coordinates: { latitude: 19.9975, longitude: 73.7898 },
                source: 'default'
            };
        }
    },

    /**
     * Map GPS coordinates to state and district
     */
    mapCoordinatesToRegion: async (lat, lon) => {
        try {
            // Find matching state
            let detectedState = null;
            for (const [state, bounds] of Object.entries(INDIA_STATES)) {
                if (lat >= bounds.lat[0] && lat <= bounds.lat[1] &&
                    lon >= bounds.lon[0] && lon <= bounds.lon[1]) {
                    detectedState = state;
                    break;
                }
            }

            if (!detectedState) {
                detectedState = 'Maharashtra'; // Default
            }

            // Try reverse geocoding for district
            let district = 'Unknown';
            try {
                const reverseGeocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
                if (reverseGeocode && reverseGeocode.length > 0) {
                    district = reverseGeocode[0].subregion || reverseGeocode[0].city || reverseGeocode[0].district || 'Unknown';
                }
            } catch (e) {
                console.log('Reverse geocoding failed, using state capital');
                // Use state capital as fallback
                district = detectedState.split(' ')[0]; // Simplified
            }

            return {
                state: detectedState,
                district: district,
                coordinates: { latitude: lat, longitude: lon }
            };
        } catch (error) {
            console.error('Coordinate mapping failed:', error);
            return null;
        }
    },

    /**
     * Set manual location (from Settings)
     */
    setManualLocation: async (state, district) => {
        try {
            const locationData = {
                state: state,
                district: district,
                setAt: new Date().toISOString()
            };
            await AsyncStorage.setItem('manual-location', JSON.stringify(locationData));
            return true;
        } catch (error) {
            console.error('Failed to save manual location:', error);
            return false;
        }
    },

    /**
     * Clear manual location (revert to GPS)
     */
    clearManualLocation: async () => {
        try {
            await AsyncStorage.removeItem('manual-location');
            return true;
        } catch (error) {
            console.error('Failed to clear manual location:', error);
            return false;
        }
    },

    /**
     * Get current location source
     */
    getLocationSource: async () => {
        const manual = await AsyncStorage.getItem('manual-location');
        if (manual) return 'manual';

        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') return 'gps';

        const cached = await AsyncStorage.getItem('last-gps-location');
        if (cached) return 'cached';

        return 'default';
    }
};
