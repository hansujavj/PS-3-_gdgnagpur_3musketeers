/**
 * FarmDetailsScreen.jsx
 *
 * One-time farm setup for new users.
 * Sections:
 *   1. Farm Location (GPS + Google Geocoding + Static Map preview)
 *   2. Farm Area (numeric + unit dropdown + hectare conversion)
 *   3. Soil Type (manual selection only)
 *   4. Save & Continue (Supabase + AsyncStorage)
 */

import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, Image, Modal, FlatList,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { insertFarmDetails } from '../db/supabase';
import { convertToHectares, AREA_UNITS, SOIL_TYPES_LIST } from '../utils/farmUtils';

// ─── Helpers ───────────────────────────────────────────────

const getGeocodingApiKey = () =>
    Constants.expoConfig?.extra?.GOOGLE_GEOCODING_API_KEY
    || process.env.GOOGLE_GEOCODING_API_KEY
    || '';

const reverseGeocode = async (lat, lng) => {
    const apiKey = getGeocodingApiKey();
    if (!apiKey) {
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (results?.length > 0) {
            const r = results[0];
            return [r.name, r.subregion || r.city, r.region].filter(Boolean).join(', ');
        }
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=en`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results.length > 0) return data.results[0].formatted_address;
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

const getStaticMapUrl = (lat, lng) => {
    const apiKey = getGeocodingApiKey();
    if (!apiKey) return null;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&maptype=hybrid&markers=color:green%7C${lat},${lng}&key=${apiKey}`;
};

// ─── Component ─────────────────────────────────────────────

const FarmDetailsScreen = ({ onFarmSetupComplete }) => {
    // Location
    const [locationLoading, setLocationLoading] = useState(false);
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [formattedAddress, setFormattedAddress] = useState('');
    const [locationError, setLocationError] = useState('');

    // Area
    const [areaValue, setAreaValue] = useState('');
    const [areaUnit, setAreaUnit] = useState('hectare');
    const [unitModalVisible, setUnitModalVisible] = useState(false);

    // Soil
    const [soilType, setSoilType] = useState('');
    const [soilModalVisible, setSoilModalVisible] = useState(false);

    // Save
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchLocation(); }, []);

    const numericArea = parseFloat(areaValue) || 0;
    const areaInHectares = convertToHectares(numericArea, areaUnit);
    const selectedUnitLabel = AREA_UNITS.find(u => u.value === areaUnit)?.label || 'Hectare';
    const mapUrl = latitude && longitude ? getStaticMapUrl(latitude, longitude) : null;

    // ── Location ──────────────────────────────────────────────
    const fetchLocation = async () => {
        setLocationLoading(true);
        setLocationError('');
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('Location permission denied. Please enable it in Settings.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;
            setLatitude(lat);
            setLongitude(lng);
            try {
                const address = await reverseGeocode(lat, lng);
                setFormattedAddress(address);
            } catch {
                setFormattedAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
        } catch (err) {
            console.error('Location error:', err);
            setLocationError('Failed to fetch location. Please try again.');
        } finally {
            setLocationLoading(false);
        }
    };

    // ── Soil ──────────────────────────────────────────────────
    const handleManualSoilSelect = (type) => {
        setSoilType(type);
        setSoilModalVisible(false);
    };

    // ── Save ──────────────────────────────────────────────────
    const validateAndSave = async () => {
        if (!latitude || !longitude) {
            Alert.alert('Location Required', 'Please fetch your farm location first.');
            return;
        }
        if (numericArea <= 0) {
            Alert.alert('Invalid Area', 'Please enter a valid farm area greater than 0.');
            return;
        }
        if (!soilType) {
            Alert.alert('Soil Type Required', 'Please select a soil type.');
            return;
        }
        setSaving(true);
        try {
            const profileStr = await AsyncStorage.getItem('user-profile');
            if (!profileStr) {
                Alert.alert('Error', 'User profile not found. Please log in again.');
                return;
            }
            const profile = JSON.parse(profileStr);
            const farmData = {
                user_phone: profile.phone,
                latitude,
                longitude,
                formatted_address: formattedAddress,
                area_value: numericArea,
                area_unit: areaUnit,
                area_in_hectares: areaInHectares,
                soil_type: soilType,
                soil_confidence: null,
                soil_detection_method: 'manual',
            };

            await insertFarmDetails(farmData);
            await AsyncStorage.setItem('farm-details', JSON.stringify(farmData));

            if (onFarmSetupComplete) onFarmSetupComplete();
        } catch (err) {
            console.error('Save farm error:', err);
            Alert.alert('Save Failed', 'Could not save farm details. Check your internet connection.');
        } finally {
            setSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="leaf" size={40} color="#fff" />
                    </View>
                    <Text style={styles.headerTitle}>Set Up Your Farm</Text>
                    <Text style={styles.headerSubtitle}>
                        Tell us about your farm to get personalized recommendations
                    </Text>
                </View>

                {/* Section 1: Location */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="location" size={22} color="#2e7d32" />
                        <Text style={styles.sectionTitle}>Farm Location</Text>
                    </View>

                    {mapUrl ? (
                        <Image source={{ uri: mapUrl }} style={styles.mapPreview} resizeMode="cover" />
                    ) : (
                        <View style={styles.mapPlaceholder}>
                            <Ionicons name="map-outline" size={48} color="#ccc" />
                            <Text style={styles.mapPlaceholderText}>
                                {locationLoading ? 'Detecting location...' : 'No location detected'}
                            </Text>
                        </View>
                    )}

                    {formattedAddress ? (
                        <View style={styles.addressBox}>
                            <Ionicons name="navigate" size={16} color="#2e7d32" />
                            <Text style={styles.addressText}>{formattedAddress}</Text>
                        </View>
                    ) : null}

                    {latitude && longitude && (
                        <Text style={styles.coordsText}>
                            📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
                        </Text>
                    )}

                    {locationError ? (
                        <View style={styles.errorBox}>
                            <Ionicons name="alert-circle" size={16} color="#d32f2f" />
                            <Text style={styles.errorText}>{locationError}</Text>
                        </View>
                    ) : null}

                    <TouchableOpacity style={styles.secondaryButton} onPress={fetchLocation} disabled={locationLoading}>
                        {locationLoading
                            ? <ActivityIndicator size="small" color="#2e7d32" />
                            : <Ionicons name="refresh" size={18} color="#2e7d32" />}
                        <Text style={styles.secondaryButtonText}>
                            {locationLoading ? 'Detecting...' : 'Refresh Location'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Section 2: Farm Area */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="resize" size={22} color="#2e7d32" />
                        <Text style={styles.sectionTitle}>Farm Area</Text>
                    </View>

                    <View style={styles.areaRow}>
                        <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
                            <Ionicons name="expand-outline" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={areaValue}
                                onChangeText={setAreaValue}
                                placeholder="Enter area"
                                placeholderTextColor="#999"
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <TouchableOpacity style={styles.unitSelector} onPress={() => setUnitModalVisible(true)}>
                            <Text style={styles.unitText}>{selectedUnitLabel}</Text>
                            <Ionicons name="chevron-down" size={16} color="#2e7d32" />
                        </TouchableOpacity>
                    </View>

                    {numericArea > 0 && (
                        <View style={styles.conversionBox}>
                            <Ionicons name="swap-horizontal" size={16} color="#2e7d32" />
                            <Text style={styles.conversionText}>= {areaInHectares} hectares</Text>
                        </View>
                    )}
                </View>

                {/* Section 3: Soil Type */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="layers" size={22} color="#2e7d32" />
                        <Text style={styles.sectionTitle}>Soil Type</Text>
                    </View>

                    {soilType ? (
                        <View style={styles.soilResultCard}>
                            <View style={styles.soilResultRow}>
                                <Ionicons name="checkmark-circle" size={24} color="#2e7d32" />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.soilResultType}>{soilType}</Text>
                                    <Text style={styles.manualLabel}>Tap below to change</Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.soilPlaceholder}>
                            <Ionicons name="layers-outline" size={36} color="#ccc" />
                            <Text style={styles.soilPlaceholderText}>No soil type selected</Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.scanButton} onPress={() => setSoilModalVisible(true)}>
                        <Ionicons name="list" size={20} color="#fff" />
                        <Text style={styles.scanButtonText}>
                            {soilType ? 'Change Soil Type' : 'Select Soil Type'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Section 4: Save & Continue */}
                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.buttonDisabled]}
                    onPress={validateAndSave}
                    disabled={saving}
                >
                    {saving
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                            <Text style={styles.saveButtonText}>Save & Continue</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 10 }} />
                        </>
                    }
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                    Your farm data is stored securely and used only for personalized farming recommendations.
                </Text>

                {/* Unit Picker Modal */}
                <Modal animationType="slide" transparent visible={unitModalVisible} onRequestClose={() => setUnitModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select Area Unit</Text>
                            <FlatList
                                data={AREA_UNITS}
                                keyExtractor={item => item.value}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.modalItem} onPress={() => { setAreaUnit(item.value); setUnitModalVisible(false); }}>
                                        <Text style={styles.modalItemText}>{item.label}</Text>
                                        {areaUnit === item.value && <Ionicons name="checkmark" size={20} color="#2e7d32" />}
                                    </TouchableOpacity>
                                )}
                            />
                            <TouchableOpacity style={styles.closeButton} onPress={() => setUnitModalVisible(false)}>
                                <Text style={styles.closeButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Soil Type Picker Modal */}
                <Modal animationType="slide" transparent visible={soilModalVisible} onRequestClose={() => setSoilModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select Soil Type</Text>
                            <FlatList
                                data={SOIL_TYPES_LIST}
                                keyExtractor={item => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.modalItem} onPress={() => handleManualSoilSelect(item)}>
                                        <Text style={styles.modalItemText}>{item}</Text>
                                        {soilType === item && <Ionicons name="checkmark" size={20} color="#2e7d32" />}
                                    </TouchableOpacity>
                                )}
                            />
                            <TouchableOpacity style={styles.closeButton} onPress={() => setSoilModalVisible(false)}>
                                <Text style={styles.closeButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// ─── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    content: { flexGrow: 1, paddingBottom: 40 },
    header: {
        backgroundColor: '#2e7d32',
        paddingTop: 60, paddingBottom: 40, paddingHorizontal: 25,
        alignItems: 'center',
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    },
    iconCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 15,
    },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8, textAlign: 'center' },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', paddingHorizontal: 20 },
    sectionCard: {
        backgroundColor: '#fff', marginHorizontal: 20, marginTop: 20,
        borderRadius: 15, padding: 20,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 8 },
    mapPreview: { width: '100%', height: 180, borderRadius: 12, marginBottom: 12, backgroundColor: '#e8f5e9' },
    mapPlaceholder: {
        width: '100%', height: 150, borderRadius: 12,
        backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#e0e0e0', borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    mapPlaceholderText: { fontSize: 13, color: '#999', marginTop: 8 },
    addressBox: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#e8f5e9', padding: 12, borderRadius: 10, marginBottom: 8,
    },
    addressText: { flex: 1, fontSize: 14, color: '#2e7d32', marginLeft: 8, lineHeight: 20 },
    coordsText: { fontSize: 12, color: '#999', marginBottom: 12 },
    errorBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#ffebee', padding: 10, borderRadius: 8, marginBottom: 10,
    },
    errorText: { flex: 1, fontSize: 13, color: '#d32f2f', marginLeft: 8 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f9f9f9', borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', paddingHorizontal: 15,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#333' },
    areaRow: { flexDirection: 'row', alignItems: 'center' },
    unitSelector: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#e8f5e9', paddingHorizontal: 15, paddingVertical: 16,
        borderRadius: 12, borderWidth: 1, borderColor: '#2e7d32',
    },
    unitText: { fontSize: 14, fontWeight: '600', color: '#2e7d32', marginRight: 5 },
    conversionBox: {
        flexDirection: 'row', alignItems: 'center',
        marginTop: 12, padding: 10, backgroundColor: '#f1f8e9', borderRadius: 8,
    },
    conversionText: { fontSize: 14, color: '#33691e', fontWeight: '600', marginLeft: 8 },
    soilPlaceholder: {
        width: '100%', height: 100, borderRadius: 12,
        backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#e0e0e0', borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    soilPlaceholderText: { fontSize: 13, color: '#999', marginTop: 6 },
    soilResultCard: {
        backgroundColor: '#f1f8e9', padding: 15, borderRadius: 12, marginBottom: 12,
        borderLeftWidth: 4, borderLeftColor: '#2e7d32',
    },
    soilResultRow: { flexDirection: 'row', alignItems: 'center' },
    soilResultType: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    manualLabel: { fontSize: 12, color: '#2e7d32', marginTop: 2 },
    scanButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#2e7d32', padding: 15, borderRadius: 12,
        marginTop: 8, gap: 8,
    },
    scanButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    secondaryButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#2e7d32', padding: 13, borderRadius: 12,
        marginTop: 10, gap: 8, backgroundColor: '#fff',
    },
    secondaryButtonText: { fontSize: 15, fontWeight: '600', color: '#2e7d32' },
    saveButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#1b5e20', marginHorizontal: 20, marginTop: 25, padding: 18,
        borderRadius: 15, elevation: 4,
    },
    saveButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    buttonDisabled: { opacity: 0.6 },
    disclaimer: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 16, paddingHorizontal: 30 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
    modalItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 10,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    modalItemText: { fontSize: 16, color: '#333' },
    closeButton: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    closeButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
});

export default FarmDetailsScreen;
