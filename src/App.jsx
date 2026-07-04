/**
 * App.jsx
 *
 * Navigation Gate:
 *   !authenticated          → LoginScreen
 *   authenticated, !farm    → FarmDetailsScreen
 *   farm, !cropsSelected    → CropSelectionScreen   ← NEW STAGE
 *   farm + cropsSelected    → MainNavigator (Dashboard)
 */

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainNavigator from './navigation/MainNavigator';
import LoginScreen from './screens/LoginScreen';
import FarmDetailsScreen from './screens/FarmDetailsScreen';
import CropSelectionScreen from './screens/CropSelectionScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { initDB } from './db/initDB';
import { getFarmByPhone } from './db/supabase';
import { hasUserSelectedCrops } from './db/cropSupabase';
import { AuthProvider } from './utils/AuthContext';
import './localization/i18n';

export default function App() {
    const [isReady, setIsReady] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasFarmDetails, setHasFarmDetails] = useState(false);
    const [hasCropsSelected, setHasCropsSelected] = useState(false);

    useEffect(() => { initialize(); }, []);

    const handleLogout = async () => {
        try {
            await AsyncStorage.multiRemove([
                'user-profile', 'farm-details', 'user-crops', 'crops-selected',
                'notifications_v1', 'weather-cache', 'soil-preference',
                'manual-location', 'last-gps-location', 'user-language'
            ]);
        } catch (e) {
            console.warn('Logout cleanup error:', e);
        }
        setIsAuthenticated(false);
        setHasFarmDetails(false);
        setHasCropsSelected(false);
    };

    const authContextValue = useMemo(() => ({ onLogout: handleLogout }), []);

    const initialize = async () => {
        try {
            await initDB();
            const profile = await AsyncStorage.getItem('user-profile');
            if (profile) {
                setIsAuthenticated(true);
                const parsedProfile = JSON.parse(profile);
                const farmExists = await checkFarmDetails(parsedProfile.phone);
                setHasFarmDetails(farmExists);

                if (farmExists) {
                    const cropsExist = await checkCropsSelected();
                    setHasCropsSelected(cropsExist);
                }
            }
        } catch (e) {
            console.warn('Initialization error:', e);
        } finally {
            setIsReady(true);
        }
    };

    const checkFarmDetails = async (phone) => {
        try {
            const cached = await AsyncStorage.getItem('farm-details');
            if (cached) return true;
            const farm = await getFarmByPhone(phone);
            if (farm) {
                await AsyncStorage.setItem('farm-details', JSON.stringify(farm));
                return true;
            }
            return false;
        } catch (e) {
            console.warn('Farm details check failed:', e);
            const cached = await AsyncStorage.getItem('farm-details');
            return !!cached;
        }
    };

    /**
     * Check if user has already selected crops (by phone — phone-based auth).
     * Checks AsyncStorage flag first (fast-path), then Supabase.
     */
    const checkCropsSelected = async () => {
        try {
            // Fast-path: local flag set on completion
            const flag = await AsyncStorage.getItem('crops-selected');
            if (flag === 'true') return true;

            // Also check if user-crops list is non-empty locally
            const localCrops = await AsyncStorage.getItem('user-crops');
            if (localCrops) {
                const parsed = JSON.parse(localCrops);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    await AsyncStorage.setItem('crops-selected', 'true');
                    return true;
                }
            }

            // Fallback: check Supabase using phone
            const profileStr = await AsyncStorage.getItem('user-profile');
            if (profileStr) {
                const profile = JSON.parse(profileStr);
                const exists = await hasUserSelectedCrops(profile.phone);
                if (exists) {
                    await AsyncStorage.setItem('crops-selected', 'true');
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.warn('Crops selected check failed:', e);
            return false;
        }
    };

    const handleLoginSuccess = async () => {
        setIsAuthenticated(true);
        try {
            const profile = await AsyncStorage.getItem('user-profile');
            if (profile) {
                const parsedProfile = JSON.parse(profile);
                const farmExists = await checkFarmDetails(parsedProfile.phone);
                setHasFarmDetails(farmExists);

                if (farmExists) {
                    const cropsExist = await checkCropsSelected();
                    setHasCropsSelected(cropsExist);
                }
            }
        } catch (e) {
            console.warn('Post-login farm check failed:', e);
        }
    };

    const handleFarmSetupComplete = async () => {
        setHasFarmDetails(true);
        // After farm is set up, check crops (always false for new users)
        const cropsExist = await checkCropsSelected();
        setHasCropsSelected(cropsExist);
    };

    const handleCropSelectionComplete = () => {
        setHasCropsSelected(true);
    };

    // ── Splash ────────────────────────────────────────────────────────────────
    if (!isReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2e7d32' }}>
                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 20 }}>AgriChain</Text>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={{ marginTop: 20, color: 'rgba(255,255,255,0.8)' }}>Empowering Farmers...</Text>
            </View>
        );
    }

    // ── Gate 1: Login ─────────────────────────────────────────────────────────
    if (!isAuthenticated) {
        return (
            <ErrorBoundary>
                <SafeAreaProvider>
                    <LoginScreen onLoginSuccess={handleLoginSuccess} />
                </SafeAreaProvider>
            </ErrorBoundary>
        );
    }

    // ── Gate 2: Farm Details ──────────────────────────────────────────────────
    if (!hasFarmDetails) {
        return (
            <ErrorBoundary>
                <SafeAreaProvider>
                    <FarmDetailsScreen onFarmSetupComplete={handleFarmSetupComplete} />
                </SafeAreaProvider>
            </ErrorBoundary>
        );
    }

    // ── Gate 3: Crop Selection ────────────────────────────────────────────────
    if (!hasCropsSelected) {
        return (
            <ErrorBoundary>
                <SafeAreaProvider>
                    <CropSelectionScreen onCropSelectionComplete={handleCropSelectionComplete} />
                </SafeAreaProvider>
            </ErrorBoundary>
        );
    }

    // ── Gate 4: Dashboard (MainNavigator) ─────────────────────────────────────
    return (
        <ErrorBoundary>
            <AuthProvider value={authContextValue}>
                <SafeAreaProvider>
                    <NavigationContainer>
                        <MainNavigator />
                    </NavigationContainer>
                </SafeAreaProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}
