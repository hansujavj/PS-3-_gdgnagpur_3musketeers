/**
 * CropDetailScreen.jsx
 *
 * Shows detailed crop info + Post-Harvest Spoilage Risk section.
 * Routes: CropScreen → (tap crop card) → CropDetailScreen
 *
 * Params expected via route.params:
 *   crop: { id, name, variety, sowingDate, soil, irrigation, duration, status }
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SpoilageRiskEngine } from '../engines/spoilageRiskEngine';
import { WeatherEngine } from '../engines/weatherEngine';
import { fetchCropWithStorage, insertRiskHistory } from '../db/postHarvestSupabase';
import { fetchAllCrops } from '../db/cropSupabase';

const CropDetailScreen = ({ navigation, route }) => {
    const cropParam = route.params?.crop;

    // State
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cropData, setCropData] = useState(null);    // Full supabase crop record
    const [weather, setWeather] = useState(null);
    const [riskResult, setRiskResult] = useState(null);
    const [error, setError] = useState(null);

    const harvestDate = cropParam?.harvestDate || null;

    // ── Load data on mount ────────────────────────────────────────────────────
    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            // 1. Find the matching crop_id from Supabase by name
            let supabaseCrop = null;
            if (cropParam?.cropId) {
                // If passed directly
                supabaseCrop = await fetchCropWithStorage(cropParam.cropId);
            } else {
                // Match by name
                const allCrops = await fetchAllCrops();
                const match = allCrops.find(c =>
                    c.crop_name.toLowerCase() === (cropParam?.name || '').toLowerCase()
                );
                if (match) {
                    supabaseCrop = await fetchCropWithStorage(match.id);
                }
            }
            setCropData(supabaseCrop);

            // 2. Fetch weather
            let weatherData = null;
            try {
                const farmStr = await AsyncStorage.getItem('farm-details');
                const farm = farmStr ? JSON.parse(farmStr) : null;
                const coords = farm ? { latitude: farm.latitude, longitude: farm.longitude } : null;
                weatherData = await WeatherEngine.getCurrentWeather(null, coords);
            } catch (e) {
                console.warn('Weather fetch failed for CropDetail:', e);
                // Try cache
                try {
                    const cached = await AsyncStorage.getItem('weather-cache');
                    if (cached) weatherData = JSON.parse(cached);
                } catch { }
            }
            setWeather(weatherData);

            // 3. Calculate risk
            if (supabaseCrop && cropParam) {
                const computedHarvestDate = harvestDate || computeDefaultHarvest(cropParam.sowingDate, supabaseCrop.growth_duration_days);
                const result = SpoilageRiskEngine.calculateRisk({
                    crop: supabaseCrop,
                    harvestDate: computedHarvestDate,
                    weather: weatherData || { temperature: 25, humidity: 50, rainfall: 0 },
                });
                setRiskResult(result);

                // 4. Store result in history (non-blocking)
                if (!result.isPreHarvest) {
                    storeRiskHistory(supabaseCrop, result, weatherData);
                }
            }
        } catch (err) {
            console.error('CropDetailScreen load error:', err);
            setError('Failed to load crop details. Check your connection.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [cropParam]);

    const computeDefaultHarvest = (sowingDate, durationDays) => {
        if (!sowingDate) return new Date().toISOString().split('T')[0];
        const d = new Date(sowingDate);
        d.setDate(d.getDate() + (durationDays || 120));
        return d.toISOString().split('T')[0];
    };

    const storeRiskHistory = async (crop, result, weatherData) => {
        try {
            const phoneStr = await AsyncStorage.getItem('user-profile');
            const phone = phoneStr ? JSON.parse(phoneStr).phone : null;
            if (!phone || !crop.id) return;

            await insertRiskHistory({
                user_phone: phone,
                crop_id: crop.id,
                risk_percentage: result.riskPercentage,
                risk_level: result.riskLevel,
                storage_condition_used: crop.storage_type,
                temperature_used: weatherData?.temperature ?? null,
                humidity_used: weatherData?.humidity ?? null,
            });
        } catch (e) {
            console.warn('Failed to store risk history:', e);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadAll();
    };

    // ── Calculate progress ────────────────────────────────────────────────────
    const daysSinceSowing = cropParam?.sowingDate
        ? Math.max(0, Math.floor((new Date() - new Date(cropParam.sowingDate)) / (1000 * 60 * 60 * 24)))
        : 0;
    const progress = cropParam?.duration
        ? Math.min(1, daysSinceSowing / cropParam.duration)
        : 0;

    // ── Render ────────────────────────────────────────────────────────────────
    if (!cropParam) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Text style={{ color: '#888' }}>No crop data available.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{cropParam.name}</Text>
                    <Text style={styles.headerSub}>{cropParam.variety || 'Standard'} • {cropParam.soil || 'Unknown'} Soil</Text>
                </View>
                <View style={styles.ageBadge}>
                    <Text style={styles.ageText}>Day {daysSinceSowing}</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2e7d32']} />}
            >
                {/* Crop Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <InfoItem icon="calendar" label="Sown" value={cropParam.sowingDate || 'N/A'} />
                        <InfoItem icon="water" label="Irrigation" value={cropParam.irrigation || 'Manual'} />
                    </View>
                    <View style={styles.infoRow}>
                        <InfoItem icon="time" label="Duration" value={`${cropParam.duration || '?'} days`} />
                        <InfoItem icon="leaf" label="Status" value={cropParam.status || 'Active'} />
                    </View>

                    {/* Progress */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressLabel}>
                            <Text style={styles.progressLabelText}>Growth Progress</Text>
                            <Text style={styles.progressPercentText}>{Math.round(progress * 100)}%</Text>
                        </View>
                        <View style={styles.progressBg}>
                            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                        <View style={styles.progressLabels}>
                            <Text style={styles.stageLabel}>Sowing</Text>
                            <Text style={styles.stageLabel}>Vegetative</Text>
                            <Text style={styles.stageLabel}>Harvest</Text>
                        </View>
                    </View>
                </View>

                {/* Weather Conditions */}
                {weather && (
                    <View style={styles.weatherCard}>
                        <View style={styles.weatherHeader}>
                            <Ionicons name={weather.icon || 'partly-sunny'} size={22} color="#1565c0" />
                            <Text style={styles.weatherTitle}>Current Conditions</Text>
                        </View>
                        <View style={styles.weatherRow}>
                            <WeatherChip icon="thermometer" label={`${weather.temperature}°C`} />
                            <WeatherChip icon="water" label={`${weather.humidity}%`} />
                            <WeatherChip icon="rainy" label={`${weather.rainfall || 0}mm`} />
                        </View>
                    </View>
                )}

                {/* ══════════════════════════════════════════════════════════════
                   POST-HARVEST SPOILAGE RISK SECTION
                ══════════════════════════════════════════════════════════════ */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionIcon}>📦</Text>
                    <Text style={styles.sectionTitle}>Post-Harvest Risk</Text>
                </View>

                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="small" color="#2e7d32" />
                        <Text style={styles.loadingText}>Calculating risk...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.errorBox}>
                        <Ionicons name="cloud-offline-outline" size={32} color="#ccc" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={loadAll}>
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : !riskResult ? (
                    <View style={styles.errorBox}>
                        <Ionicons name="information-circle-outline" size={32} color="#ccc" />
                        <Text style={styles.errorText}>
                            Crop not found in database. Ensure your crops table is up-to-date.
                        </Text>
                    </View>
                ) : riskResult.isPreHarvest ? (
                    /* Pre-Harvest State */
                    <View style={styles.preHarvestCard}>
                        <Ionicons name="hourglass-outline" size={36} color="#1565c0" />
                        <Text style={styles.preHarvestTitle}>Pre-Harvest Stage</Text>
                        <Text style={styles.preHarvestSub}>
                            {riskResult.daysToHarvest} days until expected harvest
                        </Text>
                        <Text style={styles.preHarvestHint}>
                            Post-harvest risk analysis will be available after harvest date
                        </Text>
                    </View>
                ) : (
                    /* Risk Result */
                    <>
                        {/* Risk Gauge */}
                        <View style={[
                            styles.riskGaugeCard,
                            { borderColor: SpoilageRiskEngine.getRiskColor(riskResult.riskLevel) + '40' }
                        ]}>
                            <View style={styles.riskGaugeTop}>
                                <View style={[
                                    styles.riskCircle,
                                    { backgroundColor: SpoilageRiskEngine.getRiskColor(riskResult.riskLevel) + '15' }
                                ]}>
                                    <Ionicons
                                        name={SpoilageRiskEngine.getRiskIcon(riskResult.riskLevel)}
                                        size={28}
                                        color={SpoilageRiskEngine.getRiskColor(riskResult.riskLevel)}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={styles.riskPercentage}>
                                        {riskResult.riskPercentage}%
                                        <Text style={styles.riskPercentLabel}> Spoilage Risk</Text>
                                    </Text>
                                    <View style={[
                                        styles.riskLevelBadge,
                                        { backgroundColor: SpoilageRiskEngine.getRiskColor(riskResult.riskLevel) + '18' }
                                    ]}>
                                        <Text style={[
                                            styles.riskLevelText,
                                            { color: SpoilageRiskEngine.getRiskColor(riskResult.riskLevel) }
                                        ]}>
                                            {riskResult.riskLevel} Risk
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Risk Bar */}
                            <View style={styles.riskBarBg}>
                                <View style={[
                                    styles.riskBarFill,
                                    {
                                        width: `${riskResult.riskPercentage}%`,
                                        backgroundColor: SpoilageRiskEngine.getRiskColor(riskResult.riskLevel),
                                    }
                                ]} />
                            </View>

                            {/* Shelf Life Info */}
                            <View style={styles.shelfLifeRow}>
                                <Ionicons name="time-outline" size={16} color="#555" />
                                <Text style={styles.shelfLifeText}>
                                    Shelf Life: {riskResult.shelfLifeRemaining} days remaining
                                    {riskResult.shelfLifeRemaining === 0 ? ' ⚠️ EXPIRED' : ''}
                                </Text>
                            </View>
                        </View>

                        {/* High Risk Alert */}
                        {riskResult.riskLevel === 'High' && (
                            <View style={styles.alertCard}>
                                <Ionicons name="alert-circle" size={22} color="#c62828" />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.alertTitle}>⚠️ Immediate Action Required</Text>
                                    <Text style={styles.alertText}>
                                        Sell produce immediately or move to improved storage. Risk of significant spoilage is high.
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Breakdown */}
                        <View style={styles.breakdownCard}>
                            <Text style={styles.breakdownTitle}>Risk Breakdown</Text>
                            {riskResult.breakdown.map((item, idx) => (
                                <View key={idx} style={styles.breakdownRow}>
                                    <View style={[styles.breakdownIcon, { backgroundColor: item.color + '15' }]}>
                                        <Ionicons name={item.icon} size={18} color={item.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.breakdownFactorRow}>
                                            <Text style={styles.breakdownFactor}>{item.factor}</Text>
                                            <Text style={[
                                                styles.breakdownScore,
                                                { color: item.score > 0 ? item.color : '#2e7d32' }
                                            ]}>
                                                {item.score > 0 ? `+${item.score}` : '✓ OK'}
                                            </Text>
                                        </View>
                                        <Text style={styles.breakdownDetail}>{item.detail}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Storage Recommendation */}
                        {riskResult.storageRecommendation && (
                            <View style={styles.storageCard}>
                                <View style={styles.storageHeader}>
                                    <Ionicons
                                        name={riskResult.storageRecommendation.icon}
                                        size={22}
                                        color="#1565c0"
                                    />
                                    <Text style={styles.storageTitle}>
                                        Storage: {cropData?.storage_type || 'Normal'}
                                    </Text>
                                </View>
                                <Text style={styles.storageDesc}>
                                    {riskResult.storageRecommendation.recommendation}
                                </Text>
                                <View style={styles.storageTips}>
                                    {riskResult.storageRecommendation.tips.map((tip, idx) => (
                                        <View key={idx} style={styles.tipRow}>
                                            <Text style={styles.tipBullet}>•</Text>
                                            <Text style={styles.tipText}>{tip}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const InfoItem = ({ icon, label, value }) => (
    <View style={styles.infoItem}>
        <Ionicons name={icon} size={16} color="#2e7d32" />
        <View style={{ marginLeft: 6 }}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);

const WeatherChip = ({ icon, label }) => (
    <View style={styles.weatherChip}>
        <Ionicons name={icon} size={16} color="#1565c0" />
        <Text style={styles.weatherChipText}>{label}</Text>
    </View>
);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#2e7d32', paddingVertical: 16, paddingHorizontal: 16, gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    ageBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    },
    ageText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

    // Info Card
    infoCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
    },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    infoItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    infoLabel: { fontSize: 11, color: '#888' },
    infoValue: { fontSize: 14, fontWeight: '600', color: '#333' },

    // Progress
    progressSection: { marginTop: 4 },
    progressLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    progressLabelText: { fontSize: 13, fontWeight: '600', color: '#555' },
    progressPercentText: { fontSize: 13, fontWeight: 'bold', color: '#2e7d32' },
    progressBg: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#43a047', borderRadius: 4 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    stageLabel: { fontSize: 10, color: '#999' },

    // Weather
    weatherCard: {
        backgroundColor: '#e3f2fd', borderRadius: 12, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: '#bbdefb',
    },
    weatherHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    weatherTitle: { fontSize: 14, fontWeight: 'bold', color: '#1565c0' },
    weatherRow: { flexDirection: 'row', gap: 10 },
    weatherChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    },
    weatherChipText: { fontSize: 13, fontWeight: '600', color: '#333' },

    // Section Header
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 6,
    },
    sectionIcon: { fontSize: 18 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },

    // Loading/Error
    loadingBox: { alignItems: 'center', paddingVertical: 30, gap: 10 },
    loadingText: { fontSize: 13, color: '#888' },
    errorBox: { alignItems: 'center', paddingVertical: 30 },
    errorText: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8, marginBottom: 12 },
    retryBtn: { backgroundColor: '#2e7d32', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
    retryText: { color: '#fff', fontWeight: 'bold' },

    // Pre-Harvest
    preHarvestCard: {
        backgroundColor: '#e3f2fd', borderRadius: 14, padding: 24, alignItems: 'center',
        borderWidth: 1, borderColor: '#bbdefb',
    },
    preHarvestTitle: { fontSize: 18, fontWeight: 'bold', color: '#1565c0', marginTop: 10 },
    preHarvestSub: { fontSize: 14, color: '#555', marginTop: 6 },
    preHarvestHint: { fontSize: 12, color: '#888', marginTop: 10, textAlign: 'center' },

    // Risk Gauge
    riskGaugeCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
        borderWidth: 1.5, elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
    },
    riskGaugeTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    riskCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    riskPercentage: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
    riskPercentLabel: { fontSize: 13, fontWeight: '500', color: '#888' },
    riskLevelBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
    riskLevelText: { fontSize: 12, fontWeight: 'bold' },
    riskBarBg: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
    riskBarFill: { height: '100%', borderRadius: 4 },
    shelfLifeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    shelfLifeText: { fontSize: 13, color: '#555' },

    // Alert
    alertCard: {
        flexDirection: 'row', backgroundColor: '#ffebee', borderRadius: 12, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: '#ffcdd2',
    },
    alertTitle: { fontSize: 14, fontWeight: 'bold', color: '#c62828', marginBottom: 4 },
    alertText: { fontSize: 13, color: '#555', lineHeight: 19 },

    // Breakdown
    breakdownCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    },
    breakdownTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 12 },
    breakdownRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    breakdownIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    breakdownFactorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    breakdownFactor: { fontSize: 14, fontWeight: '600', color: '#333' },
    breakdownScore: { fontSize: 13, fontWeight: 'bold' },
    breakdownDetail: { fontSize: 12, color: '#888', marginTop: 2 },

    // Storage
    storageCard: {
        backgroundColor: '#e8f5e9', borderRadius: 14, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: '#c8e6c9',
    },
    storageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    storageTitle: { fontSize: 15, fontWeight: 'bold', color: '#2e7d32' },
    storageDesc: { fontSize: 13, color: '#444', lineHeight: 20, marginBottom: 10 },
    storageTips: { marginTop: 4 },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
    tipBullet: { fontSize: 14, color: '#2e7d32', marginRight: 6, fontWeight: 'bold' },
    tipText: { fontSize: 13, color: '#555', flex: 1 },
});

export default CropDetailScreen;
