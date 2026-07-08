/**
 * CropSelectionScreen.jsx
 *
 * One-time screen shown after FarmDetails is saved.
 * Features:
 *   - Rule-based suggested crops (max 5)
 *   - Manual crop addition via searchable dropdown
 *   - Per-crop sowing date picker
 *   - Auto-calculated harvest date
 *   - Combined selected list (suggested + manual), max 5
 *   - Persist to Supabase user_selected_crops
 *
 * Flow: Login → FarmDetails → CropSelection → Dashboard
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, SafeAreaView, Modal, FlatList,
    TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

import { fetchAllCrops, insertUserSelectedCrops } from '../db/cropSupabase';
import {
    filterCropsForFarm,
    computeSowingDate,
    computeHarvestDate,
    formatDisplayDate,
    daysUntilHarvest,
    parseLocalDate,
    formatLocalDate,
} from '../engines/cropFilterEngine';

// ─── Static crop icon mapping ─────────────────────────────────────────────────
const CROP_ICONS = {
    'Wheat': 'nutrition-outline',
    'Rice': 'water-outline',
    'Tomato': 'rose-outline',
    'Cotton': 'cloud-outline',
    'Sugarcane': 'trending-up-outline',
    'Maize': 'cafe-outline',
    'Soybean': 'leaf-outline',
    'Groundnut': 'ellipse-outline',
    'Mustard': 'flower-outline',
    'Chickpea': 'radio-button-on-outline',
    'Onion': 'layers-outline',
    'Potato': 'grid-outline',
    'Chilli': 'flame-outline',
    'Turmeric': 'color-palette-outline',
    'Ginger': 'leaf-outline',
    'Bajra': 'cellular-outline',
    'Jowar': 'barcode-outline',
    'Sunflower': 'sunny-outline',
    'Lentil': 'ellipse-outline',
};
const getCropIcon = (name) => CROP_ICONS[name] ?? 'leaf-outline';

const CROP_COLORS = {
    'Wheat': '#FFF8E1', 'Rice': '#E3F2FD', 'Tomato': '#FCE4EC',
    'Cotton': '#F3E5F5', 'Sugarcane': '#E8F5E9', 'Maize': '#FFF3E0',
    'Soybean': '#E8F5E9', 'Groundnut': '#FBE9E7', 'Mustard': '#FFFDE7',
    'Chickpea': '#E8EAF6', 'Onion': '#FCE4EC', 'Potato': '#F1F8E9',
    'Chilli': '#FBE9E7', 'Turmeric': '#FFF8E1', 'Ginger': '#E8F5E9',
    'Bajra': '#F3E5F5', 'Jowar': '#E0F2F1', 'Sunflower': '#FFFDE7',
    'Lentil': '#E8EAF6',
};
const getCropColor = (name) => CROP_COLORS[name] ?? '#E8F5E9';

const MAX_SELECTIONS = 5;

// ─── Component ────────────────────────────────────────────────────────────────

const CropSelectionScreen = ({ onCropSelectionComplete }) => {
    // ── State ────────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [farmData, setFarmData] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [usedFallback, setUsedFallback] = useState(false);

    // All crops from master table (for manual dropdown)
    const [allCrops, setAllCrops] = useState([]);

    // Suggested crop IDs (used for badge display)
    const [suggestedIds, setSuggestedIds] = useState(new Set());

    /**
     * selectedCrops: Map<cropId, { crop, sowingDate, source }>
     *   crop        - full crop object from master
     *   sowingDate  - YYYY-MM-DD string
     *   source      - 'suggested' | 'manual'
     */
    const [selectedCrops, setSelectedCrops] = useState(new Map());

    // Suggestion list shown in the top section
    const [suggestedCrops, setSuggestedCrops] = useState([]);

    // Manual dropdown modal
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Date picker
    const [datePickerCropId, setDatePickerCropId] = useState(null);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());

    useEffect(() => { loadSuggestions(); }, []);

    // ── Load & Filter ──────────────────────────────────────────────────────────
    const loadSuggestions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const farmStr = await AsyncStorage.getItem('farm-details');
            if (!farmStr) {
                setError('Farm details not found. Please complete farm setup first.');
                setLoading(false);
                return;
            }
            const farm = JSON.parse(farmStr);
            setFarmData(farm);

            // Temperature from weather cache or farm record
            let temperature = null;
            try {
                const weatherStr = await AsyncStorage.getItem('weather-cache');
                if (weatherStr) {
                    temperature = JSON.parse(weatherStr)?.temperature ?? null;
                }
            } catch (_) { /* ignore */ }
            if (temperature == null && farm.temperature != null) {
                temperature = farm.temperature;
            }

            const month = farm.current_month ?? (new Date().getMonth() + 1);
            setCurrentMonth(month);

            // Fetch all crops from Supabase
            const masterCrops = await fetchAllCrops();
            setAllCrops(masterCrops);

            // Apply rule-based filter for suggestions
            const { crops: suggested, usedFallback: fallback } = filterCropsForFarm(masterCrops, {
                soil_type: farm.soil_type,
                area_in_hectares: farm.area_in_hectares,
                temperature,
                current_month: month,
                region: farm.formatted_address,
            });

            setSuggestedCrops(suggested);
            setUsedFallback(fallback);
            setSuggestedIds(new Set(suggested.map(c => c.id)));
        } catch (err) {
            console.error('CropSelection loadSuggestions error:', err);
            setError('Failed to load crop suggestions. Please check your internet connection.');
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Selection helpers ─────────────────────────────────────────────────────

    const addCrop = useCallback((crop, source) => {
        setSelectedCrops(prev => {
            if (prev.has(crop.id)) {
                Alert.alert('Already Selected', `${crop.crop_name} is already in your list.`);
                return prev;
            }
            if (prev.size >= MAX_SELECTIONS) {
                Alert.alert('Limit Reached', `You can select maximum ${MAX_SELECTIONS} crops.`);
                return prev;
            }
            const next = new Map(prev);
            const sowingDate = computeSowingDate(crop, currentMonth);
            next.set(crop.id, { crop, sowingDate, source });
            return next;
        });
    }, [currentMonth]);

    const removeCrop = useCallback((cropId) => {
        setSelectedCrops(prev => {
            const next = new Map(prev);
            next.delete(cropId);
            return next;
        });
    }, []);

    const updateSowingDate = useCallback((cropId, newDateStr) => {
        setSelectedCrops(prev => {
            const next = new Map(prev);
            const entry = next.get(cropId);
            if (entry) {
                next.set(cropId, { ...entry, sowingDate: newDateStr });
            }
            return next;
        });
    }, []);

    // ── Toggle suggested crop (tap card) ──────────────────────────────────────
    const toggleSuggested = useCallback((crop) => {
        setSelectedCrops(prev => {
            if (prev.has(crop.id)) {
                const next = new Map(prev);
                next.delete(crop.id);
                return next;
            }
            if (prev.size >= MAX_SELECTIONS) {
                Alert.alert('Limit Reached', `You can select maximum ${MAX_SELECTIONS} crops.`);
                return prev;
            }
            const next = new Map(prev);
            const sowingDate = computeSowingDate(crop, currentMonth);
            next.set(crop.id, { crop, sowingDate, source: 'suggested' });
            return next;
        });
    }, [currentMonth]);

    // ── Dropdown crops (exclude already-selected) ──────────────────────────────
    const dropdownCrops = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return allCrops.filter(c => {
            if (selectedCrops.has(c.id)) return false;
            if (query && !c.crop_name.toLowerCase().includes(query)) return false;
            return true;
        });
    }, [allCrops, selectedCrops, searchQuery]);

    // ── Date picker handlers ─────────────────────────────────────────────────
    const openDatePicker = (cropId) => {
        const entry = selectedCrops.get(cropId);
        if (!entry) return;
        setDatePickerCropId(cropId);
        setTempDate(parseLocalDate(entry.sowingDate));
        setDatePickerVisible(true);
    };

    const handleDateChange = (_event, selectedDate) => {
        if (Platform.OS === 'android') {
            setDatePickerVisible(false);
            if (selectedDate && datePickerCropId) {
                updateSowingDate(datePickerCropId, formatLocalDate(selectedDate));
            }
            setDatePickerCropId(null);
            return;
        }
        // iOS: keep picker open until confirm
        if (selectedDate) setTempDate(selectedDate);
    };

    const confirmIOSDate = () => {
        if (datePickerCropId) {
            updateSowingDate(datePickerCropId, formatLocalDate(tempDate));
        }
        setDatePickerVisible(false);
        setDatePickerCropId(null);
    };

    // ── Save & Continue ───────────────────────────────────────────────────────
    const handleContinue = async () => {
        if (selectedCrops.size === 0) {
            Alert.alert('No Crops Selected', 'Please select at least one crop to continue.');
            return;
        }

        // Validate each crop has sowing date
        for (const [, entry] of selectedCrops) {
            if (!entry.sowingDate) {
                Alert.alert('Missing Date', `Please set a sowing date for ${entry.crop.crop_name}.`);
                return;
            }
        }

        setSaving(true);
        try {
            const profileStr = await AsyncStorage.getItem('user-profile');
            const profile = profileStr ? JSON.parse(profileStr) : {};
            const userPhone = profile.phone || '';

            if (!userPhone) {
                Alert.alert('Error', 'User profile not found. Please log in again.');
                setSaving(false);
                return;
            }

            // Build insert rows
            const rows = [];
            const localCrops = [];

            for (const [cropId, entry] of selectedCrops) {
                const harvestDate = computeHarvestDate(
                    entry.sowingDate,
                    entry.crop.growth_duration_days
                );
                rows.push({
                    user_phone: userPhone,
                    crop_id: cropId,
                    sowing_date: entry.sowingDate,
                    predicted_harvest_date: harvestDate,
                    irrigation_type: 'Drip',
                    last_irrigation_date: null,
                });
                localCrops.push({
                    id: cropId,
                    name: entry.crop.crop_name,
                    sowingDate: entry.sowingDate,
                    harvestDate,
                    growthDays: entry.crop.growth_duration_days,
                    irrigationType: 'Drip',
                    lastIrrigationDate: null,
                });
            }

            await insertUserSelectedCrops(rows);
            await AsyncStorage.setItem('user-crops', JSON.stringify(localCrops));
            await AsyncStorage.setItem('crops-selected', 'true');

            if (onCropSelectionComplete) onCropSelectionComplete();
        } catch (err) {
            console.error('CropSelection handleContinue error:', err);
            Alert.alert('Save Failed', 'Could not save your crop selection. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // ── UI: Loading ───────────────────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color="#2e7d32" />
                <Text style={styles.loadingText}>Finding the best crops for your farm…</Text>
            </SafeAreaView>
        );
    }

    // ── UI: Error ─────────────────────────────────────────────────────────────
    if (error) {
        return (
            <SafeAreaView style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={60} color="#d32f2f" />
                <Text style={styles.errorTitle}>Oops!</Text>
                <Text style={styles.errorMsg}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadSuggestions}>
                    <Ionicons name="refresh" size={18} color="#fff" />
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const selectedCount = selectedCrops.size;
    const selectedEntries = Array.from(selectedCrops.entries());

    // ── UI: Main ──────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safeArea}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <Ionicons name="leaf" size={36} color="#fff" />
                </View>
                <Text style={styles.headerTitle}>Choose Your Crops</Text>
                <Text style={styles.headerSubtitle}>
                    {usedFallback
                        ? 'Top seasonal crops for this time of year (broadened search)'
                        : 'Personalised for your soil, climate, and farm size'}
                </Text>
                <View style={styles.counterPill}>
                    <Ionicons name="checkmark-circle" size={16} color="#2e7d32" />
                    <Text style={styles.counterText}>
                        {selectedCount}/{MAX_SELECTIONS} selected
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Fallback Banner ── */}
                {usedFallback && (
                    <View style={styles.fallbackBanner}>
                        <Ionicons name="information-circle-outline" size={18} color="#f57c00" />
                        <Text style={styles.fallbackText}>
                            Exact matches weren't found — showing top seasonal options instead.
                        </Text>
                    </View>
                )}

                {/* ── Suggested Crops Section ── */}
                {suggestedCrops.length > 0 && (
                    <View style={styles.sectionBlock}>
                        <View style={styles.sectionLabelRow}>
                            <Ionicons name="sparkles-outline" size={18} color="#2e7d32" />
                            <Text style={styles.sectionLabel}>Recommended for You</Text>
                        </View>
                        {suggestedCrops.map(crop => {
                            const isSelected = selectedCrops.has(crop.id);
                            const cardColor = getCropColor(crop.crop_name);
                            return (
                                <TouchableOpacity
                                    key={crop.id}
                                    style={[
                                        styles.cropCard,
                                        { backgroundColor: cardColor },
                                        isSelected && styles.cropCardSelected,
                                    ]}
                                    onPress={() => toggleSuggested(crop)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.tickBox, isSelected && styles.tickBoxSelected]}>
                                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                                    </View>
                                    <View style={[styles.cropIconBg, isSelected && styles.cropIconBgSelected]}>
                                        <Ionicons
                                            name={getCropIcon(crop.crop_name)}
                                            size={32}
                                            color={isSelected ? '#fff' : '#2e7d32'}
                                        />
                                    </View>
                                    <View style={styles.cropInfo}>
                                        <Text style={styles.cropName}>{crop.crop_name}</Text>
                                        <View style={styles.cropMeta}>
                                            <View style={styles.metaChip}>
                                                <Ionicons name="time-outline" size={12} color="#555" />
                                                <Text style={styles.metaText}>{crop.growth_duration_days}d</Text>
                                            </View>
                                            <View style={styles.metaChip}>
                                                <Ionicons name="water-outline" size={12} color="#555" />
                                                <Text style={styles.metaText}>{crop.water_requirement ?? 'Medium'}</Text>
                                            </View>
                                            <View style={styles.metaChip}>
                                                <Ionicons name="thermometer-outline" size={12} color="#555" />
                                                <Text style={styles.metaText}>
                                                    {crop.min_temperature}–{crop.max_temperature}°C
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.badgeRow}>
                                            {crop._soilMatch && (
                                                <View style={styles.matchBadge}>
                                                    <Text style={styles.matchBadgeText}>✓ Soil Match</Text>
                                                </View>
                                            )}
                                            {crop._seasonMatch && (
                                                <View style={[styles.matchBadge, { backgroundColor: '#E8F5E9' }]}>
                                                    <Text style={[styles.matchBadgeText, { color: '#2e7d32' }]}>✓ In Season</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* ── Manual Add Button ── */}
                <TouchableOpacity
                    style={styles.addManualBtn}
                    onPress={() => {
                        if (selectedCount >= MAX_SELECTIONS) {
                            Alert.alert('Limit Reached', `You can select maximum ${MAX_SELECTIONS} crops.`);
                            return;
                        }
                        setSearchQuery('');
                        setDropdownVisible(true);
                    }}
                >
                    <Ionicons name="add-circle-outline" size={22} color="#2e7d32" />
                    <Text style={styles.addManualText}>Add Crop Manually</Text>
                </TouchableOpacity>

                {/* ── Selected Crops Detail Cards ── */}
                {selectedEntries.length > 0 && (
                    <View style={styles.sectionBlock}>
                        <View style={styles.sectionLabelRow}>
                            <Ionicons name="list-outline" size={18} color="#2e7d32" />
                            <Text style={styles.sectionLabel}>Your Selected Crops</Text>
                        </View>

                        {selectedEntries.map(([cropId, entry]) => {
                            const { crop, sowingDate, source } = entry;
                            const harvestDate = computeHarvestDate(sowingDate, crop.growth_duration_days);
                            const daysLeft = daysUntilHarvest(harvestDate);
                            const cardColor = getCropColor(crop.crop_name);
                            const isSuggested = source === 'suggested';

                            return (
                                <View
                                    key={cropId}
                                    style={[styles.selectedCard, { backgroundColor: cardColor }]}
                                >
                                    {/* Top row: icon + name + tag + remove */}
                                    <View style={styles.selectedTopRow}>
                                        <View style={[styles.cropIconBgSmall, { backgroundColor: '#2e7d32' }]}>
                                            <Ionicons name={getCropIcon(crop.crop_name)} size={22} color="#fff" />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={styles.selectedCropName}>{crop.crop_name}</Text>
                                            <View style={[
                                                styles.sourceTag,
                                                { backgroundColor: isSuggested ? '#E8F5E9' : '#E3F2FD' },
                                            ]}>
                                                <Text style={[
                                                    styles.sourceTagText,
                                                    { color: isSuggested ? '#2e7d32' : '#1565c0' },
                                                ]}>
                                                    {isSuggested ? 'Suggested' : 'Manual'}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.removeBtn}
                                            onPress={() => removeCrop(cropId)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <Ionicons name="close-circle" size={24} color="#d32f2f" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Date rows */}
                                    <View style={styles.dateSection}>
                                        {/* Sowing date */}
                                        <TouchableOpacity
                                            style={styles.dateRow}
                                            onPress={() => openDatePicker(cropId)}
                                        >
                                            <Ionicons name="calendar-outline" size={16} color="#2e7d32" />
                                            <Text style={styles.dateLabel}>Sowing:</Text>
                                            <Text style={styles.dateValue}>{formatDisplayDate(sowingDate)}</Text>
                                            <Ionicons name="pencil-outline" size={14} color="#888" />
                                        </TouchableOpacity>

                                        {/* Harvest date (auto) */}
                                        <View style={styles.dateRow}>
                                            <Ionicons name="checkmark-done-outline" size={16} color="#f57c00" />
                                            <Text style={styles.dateLabel}>Harvest:</Text>
                                            <Text style={styles.dateValue}>{formatDisplayDate(harvestDate)}</Text>
                                            <Text style={styles.daysLeft}>
                                                {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Today!' : `${Math.abs(daysLeft)}d ago`}
                                            </Text>
                                        </View>

                                        {/* Growth duration */}
                                        <View style={styles.dateRow}>
                                            <Ionicons name="time-outline" size={16} color="#555" />
                                            <Text style={styles.dateLabel}>Duration:</Text>
                                            <Text style={styles.dateValue}>{crop.growth_duration_days} days</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                <View style={{ height: 160 }} />
            </ScrollView>

            {/* ── Sticky Footer ── */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.continueBtn, selectedCount === 0 && styles.continueBtnDisabled]}
                    onPress={handleContinue}
                    disabled={saving || selectedCount === 0}
                >
                    {saving
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                            <Text style={styles.continueBtnText}>
                                Continue{selectedCount > 0 ? ` with ${selectedCount} crop${selectedCount > 1 ? 's' : ''}` : ''}
                            </Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                        </>
                    }
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.skipFooterBtn}
                    onPress={async () => {
                        await AsyncStorage.setItem('crops-selected', 'true');
                        if (onCropSelectionComplete) onCropSelectionComplete();
                    }}
                >
                    <Text style={styles.skipFooterText}>Skip for now</Text>
                </TouchableOpacity>
            </View>

            {/* ── Manual Crop Dropdown Modal ── */}
            <Modal
                animationType="slide"
                transparent
                visible={dropdownVisible}
                onRequestClose={() => setDropdownVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Crop</Text>

                        {/* Search bar */}
                        <View style={styles.searchBar}>
                            <Ionicons name="search-outline" size={18} color="#888" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search crops…"
                                placeholderTextColor="#999"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color="#aaa" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <FlatList
                            data={dropdownCrops}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                        addCrop(item, 'manual');
                                        setDropdownVisible(false);
                                    }}
                                >
                                    <Ionicons name={getCropIcon(item.crop_name)} size={22} color="#2e7d32" />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.dropdownItemText}>{item.crop_name}</Text>
                                        <Text style={styles.dropdownItemSub}>
                                            {item.growth_duration_days}d · {item.water_requirement}
                                        </Text>
                                    </View>
                                    <Ionicons name="add-circle-outline" size={20} color="#2e7d32" />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={styles.emptyDropdown}>
                                    <Ionicons name="leaf-outline" size={36} color="#ccc" />
                                    <Text style={styles.emptyDropdownText}>
                                        {searchQuery ? 'No crops match your search' : 'All crops already selected'}
                                    </Text>
                                </View>
                            }
                        />

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setDropdownVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Date Picker (iOS modal / Android auto-dismiss) ── */}
            {datePickerVisible && Platform.OS === 'android' && (
                <DateTimePicker
                    value={tempDate}
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
                            <Text style={styles.modalTitle}>Select Sowing Date</Text>
                            <DateTimePicker
                                value={tempDate}
                                mode="date"
                                display="spinner"
                                minimumDate={new Date()}
                                onChange={handleDateChange}
                                style={{ width: '100%' }}
                            />
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                                <TouchableOpacity
                                    style={[styles.closeButton, { flex: 1 }]}
                                    onPress={() => { setDatePickerVisible(false); setDatePickerCropId(null); }}
                                >
                                    <Text style={styles.closeButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.closeButton, { flex: 1, backgroundColor: '#2e7d32' }]}
                                    onPress={confirmIOSDate}
                                >
                                    <Text style={[styles.closeButtonText, { color: '#fff' }]}>Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 30 },
    loadingText: { marginTop: 20, fontSize: 16, color: '#555', textAlign: 'center' },
    errorTitle: { fontSize: 22, fontWeight: 'bold', color: '#d32f2f', marginTop: 16, marginBottom: 8 },
    errorMsg: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2e7d32', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, gap: 8 },
    retryText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    // Header
    header: {
        backgroundColor: '#2e7d32', paddingTop: 20, paddingBottom: 30, paddingHorizontal: 24,
        alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    },
    iconCircle: {
        width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 6, textAlign: 'center' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', paddingHorizontal: 16, lineHeight: 20 },
    counterPill: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 6, marginTop: 14, gap: 6,
    },
    counterText: { fontSize: 14, fontWeight: 'bold', color: '#2e7d32' },

    // List
    list: { flex: 1 },
    listContent: { paddingHorizontal: 16, paddingTop: 16 },
    fallbackBanner: {
        flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF8E1', borderRadius: 10,
        padding: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#f57c00', gap: 8,
    },
    fallbackText: { flex: 1, fontSize: 13, color: '#e65100', lineHeight: 18 },

    // Section
    sectionBlock: { marginBottom: 16 },
    sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
    sectionLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },

    // Crop Card (suggestion list)
    cropCard: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14,
        marginBottom: 12, borderWidth: 2, borderColor: 'transparent',
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
        position: 'relative',
    },
    cropCardSelected: { borderColor: '#2e7d32', borderWidth: 2, elevation: 4, shadowOpacity: 0.15 },
    tickBox: {
        position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11,
        borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff',
    },
    tickBoxSelected: { borderColor: '#2e7d32', backgroundColor: '#2e7d32' },
    cropIconBg: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    cropIconBgSelected: { backgroundColor: '#2e7d32' },
    cropInfo: { flex: 1 },
    cropName: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 6 },
    cropMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    metaChip: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 3,
    },
    metaText: { fontSize: 11, color: '#444', fontWeight: '500' },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    matchBadge: { backgroundColor: '#FFF8E1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    matchBadgeText: { fontSize: 11, color: '#f57c00', fontWeight: '600' },

    // Add Manual Button
    addManualBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#2e7d32', borderStyle: 'dashed',
        borderRadius: 14, paddingVertical: 14, marginBottom: 16, gap: 8, backgroundColor: '#fff',
    },
    addManualText: { fontSize: 15, fontWeight: '600', color: '#2e7d32' },

    // Selected Crop Detail Card
    selectedCard: {
        borderRadius: 16, padding: 16, marginBottom: 14,
        borderWidth: 2, borderColor: '#2e7d32',
        elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    },
    selectedTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cropIconBgSmall: {
        width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    },
    selectedCropName: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a' },
    sourceTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
    sourceTagText: { fontSize: 11, fontWeight: '600' },
    removeBtn: { padding: 4 },
    dateSection: { gap: 8 },
    dateRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10,
    },
    dateLabel: { fontSize: 13, fontWeight: '600', color: '#555', width: 65 },
    dateValue: { flex: 1, fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
    daysLeft: { fontSize: 12, fontWeight: '600', color: '#f57c00' },

    // Footer
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', padding: 16, paddingBottom: 24,
        borderTopWidth: 1, borderTopColor: '#e0e0e0',
        elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4,
    },
    continueBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#1b5e20', borderRadius: 14, paddingVertical: 16, elevation: 3,
    },
    continueBtnDisabled: { backgroundColor: '#a5d6a7', elevation: 0 },
    continueBtnText: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
    skipFooterBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
    skipFooterText: { fontSize: 14, color: '#888' },

    // Modal (Dropdown + DatePicker)
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, maxHeight: '70%',
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5',
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, gap: 8,
    },
    searchInput: { flex: 1, fontSize: 15, color: '#333' },
    dropdownItem: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    dropdownItemText: { fontSize: 16, fontWeight: '600', color: '#333' },
    dropdownItemSub: { fontSize: 12, color: '#888', marginTop: 2 },
    emptyDropdown: { alignItems: 'center', paddingVertical: 40 },
    emptyDropdownText: { fontSize: 14, color: '#999', marginTop: 10 },
    closeButton: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    closeButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
});

export default CropSelectionScreen;
