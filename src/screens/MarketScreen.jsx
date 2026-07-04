/**
 * MarketScreen.jsx
 *
 * Crop Price Prediction screen.
 * Flow: Select crop → Select date → Predict → Show result (cached or fresh)
 *
 * Accessible from Dashboard quick action → 'Market' route
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, FlatList, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

import { fetchAllCrops } from '../db/cropSupabase';
import { getCachedPrediction, upsertPrediction, fetchPredictionHistory } from '../db/marketSupabase';
import { predictPrice, getTrendInfo, getConfidenceInfo } from '../engines/pricePredictionEngine';

const MarketScreen = ({ navigation }) => {
    // ── State ────────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [cropsLoading, setCropsLoading] = useState(true);
    const [allCrops, setAllCrops] = useState([]);
    const [selectedCrop, setSelectedCrop] = useState(null);
    const [targetDate, setTargetDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7); // Default: 1 week from now
        return d;
    });
    const [prediction, setPrediction] = useState(null);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);

    // Modals
    const [cropPickerVisible, setCropPickerVisible] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [cropSearch, setCropSearch] = useState('');
    const [userPhone, setUserPhone] = useState(null);

    // ── Init ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        initScreen();
    }, []);

    const initScreen = async () => {
        setCropsLoading(true);
        try {
            // Load user phone
            const profileStr = await AsyncStorage.getItem('user-profile');
            const profile = profileStr ? JSON.parse(profileStr) : {};
            setUserPhone(profile.phone || null);

            // Load crops
            const crops = await fetchAllCrops();
            setAllCrops(crops);

            // Pre-select user's first crop if available
            const userCropsStr = await AsyncStorage.getItem('user-crops');
            if (userCropsStr) {
                const userCrops = JSON.parse(userCropsStr);
                if (userCrops.length > 0 && crops.length > 0) {
                    const match = crops.find(c =>
                        c.crop_name.toLowerCase() === userCrops[0].name?.toLowerCase()
                    );
                    if (match) setSelectedCrop(match);
                }
            }

            // Load history
            if (profile.phone) {
                const hist = await fetchPredictionHistory(profile.phone);
                setHistory(hist);
            }
        } catch (e) {
            console.warn('MarketScreen init failed:', e);
        } finally {
            setCropsLoading(false);
        }
    };

    // ── Filter crops for picker ──────────────────────────────────────────────
    const filteredCrops = cropSearch.trim()
        ? allCrops.filter(c => c.crop_name.toLowerCase().includes(cropSearch.toLowerCase()))
        : allCrops;

    // ── Date formatting ──────────────────────────────────────────────────────
    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatDateISO = (date) => {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    };

    // ── Main Predict Flow ────────────────────────────────────────────────────
    const handlePredict = async () => {
        // Validate
        if (!selectedCrop) {
            Alert.alert('Select Crop', 'Please select a crop first.');
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);
        if (target < today) {
            Alert.alert('Invalid Date', 'Please select today or a future date.');
            return;
        }

        if (!userPhone) {
            Alert.alert('Error', 'User profile not found. Please log in again.');
            return;
        }

        setLoading(true);
        setError(null);
        setPrediction(null);

        const dateStr = formatDateISO(targetDate);

        try {
            // Step 1: Check cache (Supabase)
            const cached = await getCachedPrediction(selectedCrop.id, dateStr, userPhone);
            if (cached) {
                setPrediction(cached);
                setLoading(false);
                return;
            }

            // Step 2: Call backend API
            const result = await predictPrice(selectedCrop, dateStr);

            // Step 3: Store in Supabase (upsert)
            const stored = await upsertPrediction({
                user_phone: userPhone,
                crop_id: selectedCrop.id,
                target_date: dateStr,
                predicted_price: result.predicted_price,
                confidence: result.confidence,
                trend: result.trend,
            });

            setPrediction(stored || result);

            // Refresh history
            const hist = await fetchPredictionHistory(userPhone);
            setHistory(hist);
        } catch (err) {
            console.error('Prediction failed:', err);
            setError(err.message || 'Prediction failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Date picker handler ──────────────────────────────────────────────────
    const handleDateChange = (_event, selectedDate) => {
        if (Platform.OS === 'android') {
            setDatePickerVisible(false);
            if (selectedDate) setTargetDate(selectedDate);
            return;
        }
        if (selectedDate) setTargetDate(selectedDate);
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>📊 Market Prices</Text>
                    <Text style={styles.headerSub}>Predict crop prices for any date</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Crop Selector ── */}
                <Text style={styles.inputLabel}>Select Crop</Text>
                <TouchableOpacity
                    style={styles.selector}
                    onPress={() => { setCropSearch(''); setCropPickerVisible(true); }}
                >
                    {selectedCrop ? (
                        <View style={styles.selectorContent}>
                            <Ionicons name="leaf" size={20} color="#2e7d32" />
                            <Text style={styles.selectorText}>{selectedCrop.crop_name}</Text>
                        </View>
                    ) : (
                        <View style={styles.selectorContent}>
                            <Ionicons name="add-circle-outline" size={20} color="#888" />
                            <Text style={styles.selectorPlaceholder}>Choose a crop...</Text>
                        </View>
                    )}
                    <Ionicons name="chevron-down" size={20} color="#888" />
                </TouchableOpacity>

                {/* ── Date Selector ── */}
                <Text style={styles.inputLabel}>Prediction Date</Text>
                <TouchableOpacity
                    style={styles.selector}
                    onPress={() => setDatePickerVisible(true)}
                >
                    <View style={styles.selectorContent}>
                        <Ionicons name="calendar" size={20} color="#1565c0" />
                        <Text style={styles.selectorText}>{formatDate(targetDate)}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#888" />
                </TouchableOpacity>

                {/* ── Predict Button ── */}
                <TouchableOpacity
                    style={[styles.predictBtn, loading && styles.predictBtnDisabled]}
                    onPress={handlePredict}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="analytics" size={20} color="#fff" />
                            <Text style={styles.predictBtnText}>Predict Price</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* ── Error ── */}
                {error && (
                    <View style={styles.errorCard}>
                        <Ionicons name="cloud-offline-outline" size={24} color="#c62828" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={handlePredict} style={styles.retryBtn}>
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ═══════════════════════════════════════════
                   PREDICTION RESULT
                ═══════════════════════════════════════════ */}
                {prediction && (
                    <View style={styles.resultCard}>
                        {/* Cache indicator */}
                        {prediction.fromCache && (
                            <View style={styles.cacheBadge}>
                                <Ionicons name="time-outline" size={12} color="#888" />
                                <Text style={styles.cacheText}>Cached result</Text>
                            </View>
                        )}

                        {/* Price */}
                        <Text style={styles.resultLabel}>Predicted Price</Text>
                        <Text style={styles.resultPrice}>
                            ₹{Number(prediction.predicted_price).toLocaleString('en-IN')}
                            <Text style={styles.resultPriceUnit}> /quintal</Text>
                        </Text>

                        {/* Date */}
                        <View style={styles.resultRow}>
                            <Ionicons name="calendar-outline" size={16} color="#555" />
                            <Text style={styles.resultDateText}>
                                {formatDate(prediction.target_date)}
                            </Text>
                        </View>

                        {/* Trend + Confidence */}
                        <View style={styles.metricsRow}>
                            {/* Trend */}
                            {(() => {
                                const trend = getTrendInfo(prediction.trend);
                                return (
                                    <View style={[styles.metricChip, { backgroundColor: trend.bgColor }]}>
                                        <Ionicons name={trend.icon} size={20} color={trend.color} />
                                        <Text style={[styles.metricText, { color: trend.color }]}>
                                            {trend.label}
                                        </Text>
                                    </View>
                                );
                            })()}

                            {/* Confidence */}
                            {(() => {
                                const conf = getConfidenceInfo(prediction.confidence);
                                return (
                                    <View style={[styles.metricChip, { backgroundColor: '#f5f5f5' }]}>
                                        <Ionicons name="speedometer-outline" size={18} color={conf.color} />
                                        <Text style={[styles.metricText, { color: conf.color }]}>
                                            {Math.round(prediction.confidence * 100)}% Confidence
                                        </Text>
                                    </View>
                                );
                            })()}
                        </View>

                        {/* Low confidence warning */}
                        {prediction.confidence < 0.5 && (
                            <View style={styles.warningBanner}>
                                <Ionicons name="warning-outline" size={18} color="#e65100" />
                                <Text style={styles.warningText}>
                                    Low confidence prediction. Actual prices may vary significantly. Use as a rough guide only.
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* ── History ── */}
                {history.length > 0 && (
                    <View style={styles.historySection}>
                        <Text style={styles.historyTitle}>📋 Recent Predictions</Text>
                        {history.slice(0, 5).map((item, idx) => {
                            const trend = getTrendInfo(item.trend);
                            return (
                                <View key={item.id || idx} style={styles.historyItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.historyName}>
                                            {item.crops?.crop_name || 'Unknown'}
                                        </Text>
                                        <Text style={styles.historyDate}>
                                            {formatDate(item.target_date)}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.historyPrice}>
                                            ₹{Number(item.predicted_price).toLocaleString('en-IN')}
                                        </Text>
                                        <View style={[styles.historyTrend, { backgroundColor: trend.bgColor }]}>
                                            <Ionicons name={trend.icon} size={12} color={trend.color} />
                                            <Text style={[styles.historyTrendText, { color: trend.color }]}>
                                                {trend.label}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>

            {/* ── Crop Picker Modal ── */}
            <Modal
                animationType="slide"
                transparent
                visible={cropPickerVisible}
                onRequestClose={() => setCropPickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Crop</Text>
                            <TouchableOpacity onPress={() => setCropPickerVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchBar}>
                            <Ionicons name="search-outline" size={18} color="#888" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search crops..."
                                placeholderTextColor="#999"
                                value={cropSearch}
                                onChangeText={setCropSearch}
                                autoFocus
                            />
                            {cropSearch.length > 0 && (
                                <TouchableOpacity onPress={() => setCropSearch('')}>
                                    <Ionicons name="close-circle" size={18} color="#aaa" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {cropsLoading ? (
                            <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 30 }} />
                        ) : (
                            <FlatList
                                data={filteredCrops}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.cropItem,
                                            selectedCrop?.id === item.id && styles.cropItemSelected,
                                        ]}
                                        onPress={() => {
                                            setSelectedCrop(item);
                                            setCropPickerVisible(false);
                                            setPrediction(null);
                                        }}
                                    >
                                        <Ionicons name="leaf-outline" size={20} color="#2e7d32" />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.cropItemName}>{item.crop_name}</Text>
                                            <Text style={styles.cropItemSub}>
                                                {item.growth_duration_days}d • {item.water_requirement}
                                            </Text>
                                        </View>
                                        {selectedCrop?.id === item.id && (
                                            <Ionicons name="checkmark-circle" size={22} color="#2e7d32" />
                                        )}
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <View style={{ alignItems: 'center', padding: 30 }}>
                                        <Text style={{ color: '#888' }}>No crops found</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* ── Date Picker ── */}
            {datePickerVisible && Platform.OS === 'android' && (
                <DateTimePicker
                    value={targetDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={handleDateChange}
                />
            )}

            {Platform.OS === 'ios' && (
                <Modal
                    animationType="slide"
                    transparent
                    visible={datePickerVisible}
                    onRequestClose={() => setDatePickerVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { maxHeight: '45%' }]}>
                            <Text style={styles.modalTitle}>Select Date</Text>
                            <DateTimePicker
                                value={targetDate}
                                mode="date"
                                display="spinner"
                                minimumDate={new Date()}
                                onChange={handleDateChange}
                                style={{ width: '100%' }}
                            />
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, { backgroundColor: '#f5f5f5' }]}
                                    onPress={() => setDatePickerVisible(false)}
                                >
                                    <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalBtn, { backgroundColor: '#2e7d32' }]}
                                    onPress={() => setDatePickerVisible(false)}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '600' }}>Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    content: { padding: 16 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#2e7d32',
        paddingVertical: 16, paddingHorizontal: 16, gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    // Input
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 6 },
    selector: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: '#e0e0e0',
        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    },
    selectorContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    selectorText: { fontSize: 16, fontWeight: '600', color: '#333' },
    selectorPlaceholder: { fontSize: 15, color: '#aaa' },

    // Predict button
    predictBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#2e7d32', borderRadius: 12, paddingVertical: 15, marginTop: 20, gap: 8,
        elevation: 3, shadowColor: '#2e7d32', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5,
    },
    predictBtnDisabled: { backgroundColor: '#aaa' },
    predictBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    // Error
    errorCard: {
        alignItems: 'center', backgroundColor: '#ffebee', borderRadius: 12,
        padding: 20, marginTop: 16, borderWidth: 1, borderColor: '#ffcdd2',
    },
    errorText: { fontSize: 13, color: '#c62828', textAlign: 'center', marginTop: 8, marginBottom: 12 },
    retryBtn: { backgroundColor: '#c62828', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
    retryText: { color: '#fff', fontWeight: 'bold' },

    // Result
    resultCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 20,
        borderWidth: 1.5, borderColor: '#c8e6c9',
        elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5,
    },
    cacheBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        alignSelf: 'flex-end', marginBottom: 8,
    },
    cacheText: { fontSize: 11, color: '#888' },
    resultLabel: { fontSize: 13, color: '#888', marginBottom: 4 },
    resultPrice: { fontSize: 36, fontWeight: 'bold', color: '#1a1a1a' },
    resultPriceUnit: { fontSize: 14, fontWeight: '500', color: '#888' },
    resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    resultDateText: { fontSize: 14, color: '#555' },
    metricsRow: { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' },
    metricChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    },
    metricText: { fontSize: 14, fontWeight: '600' },
    warningBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: '#fff3e0', borderRadius: 10, padding: 12, marginTop: 14,
        borderLeftWidth: 3, borderLeftColor: '#f57c00',
    },
    warningText: { fontSize: 12, color: '#e65100', flex: 1, lineHeight: 18 },

    // History
    historySection: { marginTop: 24 },
    historyTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
    historyItem: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    },
    historyName: { fontSize: 15, fontWeight: '600', color: '#333' },
    historyDate: { fontSize: 12, color: '#888', marginTop: 2 },
    historyPrice: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
    historyTrend: {
        flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 3, marginTop: 4,
    },
    historyTrendText: { fontSize: 11, fontWeight: '600' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5',
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14, color: '#333' },
    cropItem: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    cropItemSelected: { backgroundColor: '#e8f5e9', borderRadius: 10, paddingHorizontal: 10 },
    cropItemName: { fontSize: 16, fontWeight: '600', color: '#333' },
    cropItemSub: { fontSize: 12, color: '#888', marginTop: 2 },
    modalBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
});

export default MarketScreen;
