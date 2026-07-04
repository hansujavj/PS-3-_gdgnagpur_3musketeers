const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

export default {
  expo: {
    name: 'AgriChain',
    slug: 'agri-chain', // must be URL-safe (lowercase, no spaces)
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,

    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },

    ios: {
      supportsTablet: true,
    },

    android: {
      package: 'com.agrichain.app', // must be lowercase (IMPORTANT)
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
    },

    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },

    plugins: [
      'expo-sqlite',
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
      eas: {
        projectId: '35f5b900-eefc-421f-94b6-d6d8daf89e6f',
      },
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GOOGLE_GEOCODING_API_KEY: process.env.GOOGLE_GEOCODING_API_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      PRICE_PREDICTION_API_URL: process.env.PRICE_PREDICTION_API_URL,
    },
  },
};
