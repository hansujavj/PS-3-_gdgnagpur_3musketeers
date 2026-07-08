const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

module.exports = ({ config }) => {
    return {
        ...config,
        plugins: [
            ...(config.plugins || []),
            [
                'expo-location',
                {
                    locationAlwaysAndWhenInUsePermission:
                        'Allow AgriChain to use your location to detect your farm location.',
                },
            ],
            '@react-native-community/datetimepicker',
        ],
        extra: {
            ...config.extra,
            GEMINI_API_KEY: process.env.GEMINI_API_KEY,
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            GOOGLE_GEOCODING_API_KEY: process.env.GOOGLE_GEOCODING_API_KEY,
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
            PRICE_PREDICTION_API_URL: process.env.PRICE_PREDICTION_API_URL,
        },
    };
};
