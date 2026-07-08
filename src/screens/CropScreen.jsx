import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, ScrollView, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchAllCrops } from '../db/cropSupabase';
import { HarvestOrchestrator } from '../engines/harvestOrchestrator';

const STORAGE_KEY = 'user-crops';

const VARIETY_OPTIONS = ['Common', 'Hybrid', 'Local/Desi', 'High Yielding (HYV)', 'Genetically Modified (GM)'];
const SOIL_OPTIONS = ['Black', 'Red', 'Alluvial', 'Laterite', 'Sandy', 'Clay'];
const IRRIGATION_OPTIONS = ['Drip', 'Sprinkler', 'Flood', 'Rainfed', 'Manual'];

const CropScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const [myCrops, setMyCrops] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [allCrops, setAllCrops] = useState([]);
    const [cropsLoading, setCropsLoading] = useState(false);
    const [cropSearch, setCropSearch] = useState('');

    // Load user crops on mount
    useEffect(() => {
        loadCrops();
        loadAllCropsFromSupabase();
    }, []);

    // Re-run orchestrator every time the screen is focused
    useFocusEffect(
        useCallback(() => {
            runOrchestrator();
        }, [])
    );

    const runOrchestrator = async () => {
        try {
            const updated = await HarvestOrchestrator.processAllCrops();
            if (updated && updated.length > 0) {
                setMyCrops(updated);
            }
        } catch (e) {
            console.warn('Orchestrator failed:', e);
        }
    };

    const loadAllCropsFromSupabase = async () => {
        setCropsLoading(true);
        try {
            const crops = await fetchAllCrops();
            setAllCrops(crops);
        } catch (e) {
            console.warn('Failed to fetch crops from Supabase:', e);
        } finally {
            setCropsLoading(false);
        }
    };

    const filteredCrops = cropSearch.trim()
        ? allCrops.filter(c => c.crop_name.toLowerCase().includes(cropSearch.toLowerCase()))
        : allCrops;

    // Save crops whenever they change
    useEffect(() => {
        if (myCrops.length > 0) {
            saveCrops();
        }
    }, [myCrops]);

    const loadCrops = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setMyCrops(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load crops:', e);
        }
    };

    const saveCrops = async () => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(myCrops));
        } catch (e) {
            console.error('Failed to save crops:', e);
        }
    };

    // Form State
    const [newCropName, setNewCropName] = useState('');
    const [variety, setVariety] = useState('');
    const [soilType, setSoilType] = useState('');
    const [irrigation, setIrrigation] = useState('');
    const [sowingDate, setSowingDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1); // Default to yesterday (1 day old)
        return d.toISOString().split('T')[0];
    });
    const [plantAge, setPlantAge] = useState('1');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [cropDropdownVisible, setCropDropdownVisible] = useState(false);
    const [genericDropdownVisible, setGenericDropdownVisible] = useState(false);
    const [dropdownType, setDropdownType] = useState(null);

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const dateText = selectedDate.toISOString().split('T')[0];
            handleSowingDateChange(dateText);
        }
    };

    const handleSowingDateChange = (text) => {
        setSowingDate(text);
        if (text) {
            const date = new Date(text);
            const today = new Date();
            if (!isNaN(date.getTime())) {
                const diffTime = Math.abs(today - date);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                setPlantAge(diffDays.toString());
            }
        }
    };

    const handleAgeChange = (text) => {
        setPlantAge(text);
        if (text && !isNaN(text)) {
            const days = parseInt(text);
            const d = new Date();
            d.setDate(d.getDate() - days);
            setSowingDate(d.toISOString().split('T')[0]);
        }
    };

    const addCrop = () => {
        if (newCropName && variety) {
            // Look up the crop's growth_duration_days from Supabase master list
            const matchedCrop = allCrops.find(
                c => c.crop_name.toLowerCase() === newCropName.toLowerCase()
            );
            const growthDays = matchedCrop?.growth_duration_days || 120;
            const cropId = matchedCrop?.id || null;

            // Compute harvest date
            const sowDate = new Date(sowingDate);
            sowDate.setDate(sowDate.getDate() + growthDays);
            const harvestDate = sowDate.toISOString().split('T')[0];

            setMyCrops([...myCrops, {
                id: Date.now().toString(),
                cropId,              // Supabase crop UUID for risk lookups
                name: newCropName,
                sowingDate: sowingDate,
                harvestDate,         // Auto-computed
                variety: variety,
                soil: soilType || 'Standard',
                irrigation: irrigation || 'Manual',
                duration: growthDays,
                status: 'active',
                harvestStatus: 'growing',
            }]);
            resetForm();
        }
    };

    const harvestCrop = (id) => {
        Alert.alert(
            "Harvest Crop",
            "Are you sure you want to mark this crop as harvested? It will be moved to history.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Harvest", onPress: () => {
                        setMyCrops(prev => prev.filter(c => c.id !== id));
                        // In real app, move to history DB
                        Alert.alert("Success", "Crop harvested successfully! Soil is now free.");
                    }
                }
            ]
        );
    };

    const resetForm = () => {
        setNewCropName('');
        setVariety('');
        setSoilType('');
        setIrrigation('');
        setCropSearch('');
        setShowAdd(false);
        // Reset to default 1 day old
        const d = new Date();
        d.setDate(d.getDate() - 1);
        setSowingDate(d.toISOString().split('T')[0]);
        setPlantAge('1');
    };

    const calculateProgress = (sowingDate, itemHarvestDate, duration) => {
        const start = new Date(sowingDate);
        const end = itemHarvestDate ? new Date(itemHarvestDate) : new Date(start.getTime() + duration * 1000 * 60 * 60 * 24);
        const now = new Date();

        const elapsedMs = now.getTime() - start.getTime();
        const totalMs = end.getTime() - start.getTime();

        const diffDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
        const daysToHarvest = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        let progress = 0;
        if (totalMs > 0) {
            progress = Math.min(Math.max(elapsedMs / totalMs, 0), 1);
        } else {
            progress = Math.min(Math.max(diffDays / duration, 0), 1);
        }

        return { diffDays, progress, daysToHarvest };
    };

    const renderCropItem = ({ item }) => {
        const { diffDays, progress, daysToHarvest } = calculateProgress(item.sowingDate, item.harvestDate, item.duration);

        return (
            <TouchableOpacity
                style={styles.cropCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('CropDetail', { crop: item })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                        <Text style={{ fontSize: 24 }}>🌱</Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.cropName}>{item.name} ({item.variety})</Text>
                        <Text style={styles.cropDate}>Sown: {item.sowingDate}</Text>
                    </View>
                    <View style={[styles.ageBadge, daysToHarvest > 0 ? {} : {backgroundColor: '#e8f5e9'}]}>
                        <Text style={[styles.ageText, daysToHarvest > 0 ? {} : {color: '#2e7d32'}]}>
                            {daysToHarvest > 0 ? `${daysToHarvest} days left` : 'Harvest Ready'}
                        </Text>
                    </View>
                </View>

                <View style={styles.timelineContainer}>
                    <View style={styles.timelineBar}>
                        <View style={[styles.timelineFill, { width: `${progress * 100}%` }]} />
                    </View>
                    <View style={styles.timelineLabels}>
                        <Text style={styles.labelStart}>Sowing</Text>
                        <Text style={styles.labelCurrent}>Vegetative</Text>
                        <Text style={styles.labelEnd}>Harvest</Text>
                    </View>
                </View>

                <View style={styles.statusRow}>
                    {/* Harvest status badge */}
                    {item.harvestStatus === 'ready_for_harvest' ? (
                        <View style={[styles.statusItem, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="checkmark-done-circle" size={16} color="#e65100" />
                            <Text style={[styles.statusText, { color: '#e65100', fontWeight: 'bold' }]}>Ready to Harvest</Text>
                        </View>
                    ) : item.harvestStatus === 'approaching_harvest' ? (
                        <View style={[styles.statusItem, { backgroundColor: '#fff8e1' }]}>
                            <Ionicons name="time" size={16} color="#f57c00" />
                            <Text style={[styles.statusText, { color: '#f57c00' }]}>Approaching Harvest</Text>
                        </View>
                    ) : item.harvestStatus === 'post_harvest' ? (
                        <View style={[styles.statusItem, { backgroundColor: '#fce4ec' }]}>
                            <Ionicons name="archive" size={16} color="#c62828" />
                            <Text style={[styles.statusText, { color: '#c62828' }]}>Post-Harvest</Text>
                        </View>
                    ) : (
                        <View style={styles.statusItem}>
                            <Ionicons name="sunny" size={16} color="#fbc02d" />
                            <Text style={styles.statusText}>Growing</Text>
                        </View>
                    )}

                    {/* Risk badge (if calculated) */}
                    {item.riskLevel && (
                        <View style={[styles.statusItem, {
                            backgroundColor: item.riskLevel === 'High' ? '#ffebee'
                                : item.riskLevel === 'Moderate' ? '#fff3e0' : '#e8f5e9'
                        }]}>
                            <Ionicons
                                name={item.riskLevel === 'High' ? 'alert-circle' : item.riskLevel === 'Moderate' ? 'warning' : 'shield-checkmark'}
                                size={14}
                                color={item.riskLevel === 'High' ? '#c62828' : item.riskLevel === 'Moderate' ? '#f57c00' : '#2e7d32'}
                            />
                            <Text style={[styles.statusText, {
                                color: item.riskLevel === 'High' ? '#c62828' : item.riskLevel === 'Moderate' ? '#f57c00' : '#2e7d32',
                                fontWeight: '600',
                            }]}>{item.riskLevel}</Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.harvestBtn} onPress={() => harvestCrop(item.id)}>
                        <Text style={styles.harvestText}>Harvest</Text>
                    </TouchableOpacity>
                </View>

                {/* Advisory banner (if generated by orchestrator) */}
                {item.advisory && (
                    <View style={[styles.advisoryBanner, {
                        backgroundColor: item.advisory.urgency === 'critical' ? '#ffebee'
                            : item.advisory.urgency === 'high' ? '#fff3e0'
                                : item.advisory.urgency === 'medium' ? '#fff8e1' : '#e8f5e9',
                        borderLeftColor: item.advisory.urgency === 'critical' ? '#c62828'
                            : item.advisory.urgency === 'high' ? '#f57c00'
                                : item.advisory.urgency === 'medium' ? '#fbc02d' : '#2e7d32',
                    }]}>
                        <Text style={styles.advisoryText}>{item.advisory.message}</Text>
                    </View>
                )}

                {/* Tap hint */}
                <View style={styles.tapHint}>
                    <Ionicons name="chevron-forward" size={14} color="#aaa" />
                    <Text style={styles.tapHintText}>Tap for details & spoilage risk</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('nav.crop')}</Text>
                <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addButton}>
                    <Ionicons name="add" size={30} color="#fff" />
                </TouchableOpacity>
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={showAdd}
                onRequestClose={resetForm}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.addForm}>
                        <View style={styles.formHeader}>
                            <Text style={styles.label}>Add New Crop</Text>
                            <TouchableOpacity onPress={resetForm}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Select Crop Name</Text>
                            <TouchableOpacity 
                                style={styles.dropdownSelector} 
                                onPress={() => setCropDropdownVisible(true)}
                            >
                                <Text style={styles.dropdownSelectorText}>
                                    {newCropName || "Choose a Crop..."}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#888" />
                            </TouchableOpacity>

                            <Modal visible={cropDropdownVisible} transparent animationType="fade" onRequestClose={() => setCropDropdownVisible(false)}>
                                <View style={styles.modalOverlay}>
                                    <View style={styles.dropdownModalBox}>
                                        <Text style={styles.dropdownTitle}>Select Crop</Text>
                                        <View style={styles.cropSearchBar}>
                                            <Ionicons name="search-outline" size={18} color="#888" />
                                            <TextInput
                                                style={styles.cropSearchInput}
                                                placeholder="Search crops..."
                                                placeholderTextColor="#999"
                                                value={cropSearch}
                                                onChangeText={setCropSearch}
                                            />
                                        </View>
                                        {cropsLoading ? (
                                            <ActivityIndicator size="small" color="#2e7d32" style={{ marginVertical: 15 }} />
                                        ) : (
                                            <FlatList
                                                data={filteredCrops}
                                                keyExtractor={item => item.id}
                                                style={{ maxHeight: 300 }}
                                                renderItem={({ item }) => (
                                                    <TouchableOpacity 
                                                        style={styles.dropdownItem} 
                                                        onPress={() => {
                                                            setNewCropName(item.crop_name);
                                                            setCropDropdownVisible(false);
                                                            setCropSearch('');
                                                        }}
                                                    >
                                                        <Text style={styles.dropdownItemText}>{item.crop_name}</Text>
                                                    </TouchableOpacity>
                                                )}
                                                ListEmptyComponent={<Text style={{ color: '#999', padding: 10 }}>No crops match.</Text>}
                                            />
                                        )}
                                        <TouchableOpacity style={styles.closeDropdownBtn} onPress={() => setCropDropdownVisible(false)}>
                                            <Text style={{color: '#fff', fontWeight: 'bold'}}>Close</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Modal>

                            <Text style={styles.inputLabel}>Variety (Common/Hybrid)</Text>
                            <TouchableOpacity 
                                style={styles.dropdownSelector} 
                                onPress={() => { setDropdownType('variety'); setGenericDropdownVisible(true); }}
                            >
                                <Text style={styles.dropdownSelectorText}>
                                    {variety || "Select Variety..."}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#888" />
                            </TouchableOpacity>

                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>Start Date (Sown)</Text>
                                    <TouchableOpacity 
                                        style={styles.dateSelectorBtn} 
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Ionicons name="calendar-outline" size={18} color="#666" />
                                        <Text style={styles.dateSelectorText}>{sowingDate}</Text>
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={new Date(sowingDate)}
                                            mode="date"
                                            display="default"
                                            onChange={handleDateChange}
                                            maximumDate={new Date()}
                                        />
                                    )}
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>Or Plant Age (Days)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={plantAge}
                                        onChangeText={handleAgeChange}
                                        placeholder="e.g. 1"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>Soil Type</Text>
                            <TouchableOpacity 
                                style={styles.dropdownSelector} 
                                onPress={() => { setDropdownType('soil'); setGenericDropdownVisible(true); }}
                            >
                                <Text style={styles.dropdownSelectorText}>
                                    {soilType || "Select Soil Type..."}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#888" />
                            </TouchableOpacity>

                            <Text style={styles.inputLabel}>Irrigation Method</Text>
                            <TouchableOpacity 
                                style={styles.dropdownSelector} 
                                onPress={() => { setDropdownType('irrigation'); setGenericDropdownVisible(true); }}
                            >
                                <Text style={styles.dropdownSelectorText}>
                                    {irrigation || "Select Irrigation..."}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#888" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.submitButton} onPress={addCrop}>
                                <Text style={styles.submitButtonText}>Start Crop Journey</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Generic Dropdown Modal for Soil/Irrigation/Variety */}
                        <Modal visible={genericDropdownVisible} transparent animationType="fade" onRequestClose={() => setGenericDropdownVisible(false)}>
                            <View style={styles.modalOverlay}>
                                <View style={styles.dropdownModalBox}>
                                    <Text style={styles.dropdownTitle}>
                                        {dropdownType === 'variety' ? 'Select Variety' : dropdownType === 'soil' ? 'Select Soil Type' : 'Select Irrigation'}
                                    </Text>
                                    <FlatList
                                        data={
                                            dropdownType === 'variety' ? VARIETY_OPTIONS :
                                            dropdownType === 'soil' ? SOIL_OPTIONS :
                                            IRRIGATION_OPTIONS
                                        }
                                        keyExtractor={item => item}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity 
                                                style={styles.dropdownItem} 
                                                onPress={() => {
                                                    if (dropdownType === 'variety') setVariety(item);
                                                    else if (dropdownType === 'soil') setSoilType(item);
                                                    else if (dropdownType === 'irrigation') setIrrigation(item);
                                                    setGenericDropdownVisible(false);
                                                }}
                                            >
                                                <Text style={styles.dropdownItemText}>{item}</Text>
                                            </TouchableOpacity>
                                        )}
                                    />
                                    <TouchableOpacity style={styles.closeDropdownBtn} onPress={() => setGenericDropdownVisible(false)}>
                                        <Text style={{color: '#fff', fontWeight: 'bold'}}>Close</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>
                    </View>
                </View>
            </Modal>

            <FlatList
                data={myCrops}
                renderItem={renderCropItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No crops registered yet.</Text>
                        <Text style={styles.emptySubText}>Add your first crop to track its journey!</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        elevation: 2,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    addButton: {
        width: 45,
        height: 45,
        borderRadius: 25,
        backgroundColor: '#2e7d32',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    addForm: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        height: '80%',
    },
    formHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    label: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    cropSearchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 10,
        gap: 8,
    },
    cropSearchInput: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    chip: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#e0e0e0',
        marginRight: 10,
        marginBottom: 10,
    },
    chipSelected: {
        backgroundColor: '#2e7d32',
    },
    chipText: {
        color: '#333',
    },
    chipTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    submitButton: {
        backgroundColor: '#2e7d32',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    list: {
        padding: 15,
    },
    cropCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    iconContainer: {
        width: 50,
        height: 50,
        backgroundColor: '#e8f5e9',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerInfo: {
        flex: 1,
    },
    cropName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        textTransform: 'capitalize',
    },
    cropDate: {
        color: '#888',
        fontSize: 12,
    },
    ageBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    ageText: {
        color: '#1565C0',
        fontWeight: 'bold',
        fontSize: 12,
    },
    timelineContainer: {
        marginBottom: 15,
    },
    timelineBar: {
        height: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 5,
    },
    timelineFill: {
        height: '100%',
        backgroundColor: '#43a047',
    },
    timelineLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    labelStart: { fontSize: 10, color: '#999' },
    labelCurrent: { fontSize: 12, color: '#2e7d32', fontWeight: 'bold' },
    labelEnd: { fontSize: 10, color: '#999' },
    statusRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
        paddingTop: 10,
        alignItems: 'center',
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 15,
        backgroundColor: '#f9f9f9',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
    },
    statusText: {
        marginLeft: 5,
        fontSize: 12,
        color: '#555',
    },
    harvestBtn: {
        marginLeft: 'auto',
        backgroundColor: '#fff3e0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#ff9800',
    },
    harvestText: {
        color: '#e65100',
        fontWeight: 'bold',
        fontSize: 12,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#888',
    },
    emptySubText: {
        color: '#aaa',
        marginTop: 5,
    },
    tapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    tapHintText: {
        fontSize: 11,
        color: '#aaa',
    },
    advisoryBanner: {
        marginTop: 10,
        padding: 10,
        borderRadius: 8,
        borderLeftWidth: 3,
    },
    advisoryText: {
        fontSize: 12,
        color: '#333',
        lineHeight: 17,
    },
    dropdownSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
    },
    dropdownSelectorText: {
        fontSize: 16,
        color: '#333',
    },
    dropdownModalBox: {
        backgroundColor: '#fff',
        width: '90%',
        alignSelf: 'center',
        borderRadius: 15,
        padding: 20,
        elevation: 5,
        maxHeight: '80%',
        marginTop: '30%',
    },
    dropdownTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    dropdownItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownItemText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    closeDropdownBtn: {
        backgroundColor: '#2e7d32',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    dateSelectorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 10,
        padding: 12,
        gap: 8,
    },
    dateSelectorText: {
        fontSize: 16,
        color: '#333',
    },
});

export default CropScreen;
