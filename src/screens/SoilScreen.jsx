import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SoilEngine } from '../engines/soilEngine';
import { RegionDetectionEngine } from '../engines/regionDetectionEngine';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOIL_TYPES = [
    'Alluvial Soil',
    'Black Cotton Soil',
    'Red Soil',
    'Laterite Soil',
    'Mountain Soil',
    'Desert Soil'
];

const SoilScreen = () => {
    const { t } = useTranslation();
    const [soilInfo, setSoilInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedSoilType, setSelectedSoilType] = useState(null);

    useEffect(() => {
        loadSoilData();
    }, []);

    const loadSoilData = async () => {
        setLoading(true);
        try {
            // Try to load saved soil type
            const saved = await AsyncStorage.getItem('soil-preference');

            if (saved) {
                // User has selected a soil type before
                const info = SoilEngine.getSoilDetails(saved);
                setSoilInfo(info);
                setSelectedSoilType(saved);
            } else {
                // First time - detect based on region
                const region = await RegionDetectionEngine.detectRegion();
                const info = SoilEngine.getSoilInfo(region, 'wheat');
                setSoilInfo(info);
                setSelectedSoilType(info.type);
            }
        } catch (e) {
            console.error('Failed to load soil data:', e);
        } finally {
            setLoading(false);
        }
    };

    const changeSoilType = async (newType) => {
        const newInfo = SoilEngine.getSoilDetails(newType);
        setSoilInfo(newInfo);
        setSelectedSoilType(newType);
        setModalVisible(false);

        // Save preference
        try {
            await AsyncStorage.setItem('soil-preference', newType);
        } catch (e) {
            console.error('Failed to save soil preference:', e);
        }
    };

    const renderSoilProperty = (label, value) => (
        <View style={styles.propertyRow}>
            <Text style={styles.propLabel}>{label}</Text>
            <Text style={styles.propValue}>{value}</Text>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('nav.soil')}</Text>
                <TouchableOpacity style={styles.editButton} onPress={() => setModalVisible(true)}>
                    <Ionicons name="pencil" size={20} color="#2e7d32" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {loading ? (
                    <Text style={styles.loading}>{t('common.loading')}</Text>
                ) : (
                    <>
                        <View style={styles.mainCard}>
                            <Text style={styles.soilTypeLabel}>{t('soil.current')}</Text>
                            <Text style={styles.soilType}>{soilInfo?.type}</Text>
                            <TouchableOpacity style={styles.changeBtn} onPress={() => setModalVisible(true)}>
                                <Text style={styles.changeBtnText}>{t('soil.edit_type')}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.detailsCard}>
                            <Text style={styles.sectionTitle}>Properties</Text>
                            {renderSoilProperty('pH Level', soilInfo?.ph)}
                            {renderSoilProperty('Nitrogen (N)', soilInfo?.nitrogen)}
                            {renderSoilProperty('Phosphorus (P)', soilInfo?.phosphorus)}
                            {renderSoilProperty('Potassium (K)', soilInfo?.potassium)}
                            {renderSoilProperty('Moisture', soilInfo?.moisture)}
                        </View>

                        {/* Soil Characteristics */}
                        {soilInfo?.characteristics && (
                            <View style={styles.characteristicsCard}>
                                <Text style={styles.characteristicsTitle}>📋 Soil Characteristics</Text>
                                {soilInfo.characteristics.map((char, idx) => (
                                    <View key={idx} style={styles.characteristicItem}>
                                        <Ionicons name="checkmark-circle" size={16} color="#2e7d32" />
                                        <Text style={styles.characteristicText}>{char}</Text>
                                    </View>
                                ))}
                                {soilInfo.texture && (
                                    <Text style={styles.textureInfo}>Texture: {soilInfo.texture}</Text>
                                )}
                            </View>
                        )}

                        {/* Soil Treatment Section */}
                        <View style={styles.treatmentCard}>
                            <View style={styles.treatmentHeader}>
                                <Ionicons name="flask" size={24} color="#2e7d32" />
                                <Text style={styles.sectionTitle}>Soil Treatment</Text>
                            </View>

                            <View style={styles.treatmentItem}>
                                <Text style={styles.treatmentTitle}>🌿 Recommended Amendments</Text>
                                <Text style={styles.treatmentText}>
                                    {soilInfo?.amendments?.map((amendment, idx) => `• ${amendment}`).join('\n')}
                                </Text>
                            </View>

                            <View style={styles.treatmentItem}>
                                <Text style={styles.treatmentTitle}>💊 Fertilizer Schedule</Text>
                                <Text style={styles.treatmentText}>
                                    • NPK Ratio: {soilInfo?.fertilizer?.npk}{'\n'}
                                    • Organic: {soilInfo?.fertilizer?.organic}{'\n'}
                                    • Timing: {soilInfo?.fertilizer?.timing}
                                </Text>
                            </View>

                            <View style={styles.treatmentItem}>
                                <Text style={styles.treatmentTitle}>🌾 Best Crops for This Soil</Text>
                                <Text style={styles.treatmentText}>
                                    {soilInfo?.bestCrops?.join(', ')}
                                </Text>
                            </View>
                        </View>

                        {/* Soil Management Section */}
                        <View style={styles.managementCard}>
                            <View style={styles.managementHeader}>
                                <Ionicons name="settings" size={24} color="#ff6f00" />
                                <Text style={styles.sectionTitle}>Soil Management</Text>
                            </View>

                            <View style={styles.managementItem}>
                                <Ionicons name="sync" size={20} color="#2e7d32" />
                                <View style={styles.managementContent}>
                                    <Text style={styles.managementTitle}>Crop Rotation</Text>
                                    <Text style={styles.managementText}>
                                        Rotate legumes (pulses) with cereals to fix nitrogen naturally
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.managementItem}>
                                <Ionicons name="water" size={20} color="#2e7d32" />
                                <View style={styles.managementContent}>
                                    <Text style={styles.managementTitle}>Water Management</Text>
                                    <Text style={styles.managementText}>
                                        Use drip irrigation to prevent waterlogging and salt buildup
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.managementItem}>
                                <Ionicons name="leaf" size={20} color="#2e7d32" />
                                <View style={styles.managementContent}>
                                    <Text style={styles.managementTitle}>Mulching</Text>
                                    <Text style={styles.managementText}>
                                        Apply crop residue or plastic mulch to retain moisture
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.managementItem}>
                                <Ionicons name="flask-outline" size={20} color="#2e7d32" />
                                <View style={styles.managementContent}>
                                    <Text style={styles.managementTitle}>Soil Testing</Text>
                                    <Text style={styles.managementText}>
                                        Test soil every 3 years for accurate nutrient management
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.tipCard}>
                            <Text style={styles.tipTitle}>💡 Soil Tip</Text>
                            <Text style={styles.tipText}>
                                Based on your {soilInfo?.type}, consider adding organic compost to improve water retention.
                            </Text>
                        </View>
                    </>
                )}
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('soil.select')}</Text>
                        <FlatList
                            data={SOIL_TYPES}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => changeSoilType(item)}>
                                    <Text style={styles.modalItemText}>{item}</Text>
                                    {soilInfo?.type === item && <Ionicons name="checkmark" size={20} color="#2e7d32" />}
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                            <Text style={styles.closeButtonText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
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
        paddingTop: 50,
        elevation: 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    editButton: {
        padding: 10,
        backgroundColor: '#e8f5e9',
        borderRadius: 10,
    },
    content: {
        padding: 20,
    },
    loading: {
        textAlign: 'center',
        marginTop: 50,
        color: '#666',
    },
    mainCard: {
        backgroundColor: '#795548', // Brown 500
        padding: 25,
        borderRadius: 15,
        marginBottom: 20,
        alignItems: 'center',
    },
    soilTypeLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginBottom: 5,
    },
    soilType: {
        color: '#fff',
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    changeBtn: {
        marginTop: 15,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    changeBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    detailsCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        elevation: 2,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    propertyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    propLabel: {
        color: '#666',
        fontSize: 16,
    },
    propValue: {
        color: '#333',
        fontWeight: 'bold',
        fontSize: 16,
    },
    tipCard: {
        backgroundColor: '#fff3e0',
        padding: 15,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#ff9800',
    },
    tipTitle: {
        fontWeight: 'bold',
        color: '#e65100',
        marginBottom: 5,
    },
    tipText: {
        color: '#5d4037',
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        maxHeight: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
    },
    closeButton: {
        marginTop: 20,
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
    },
    closeButtonText: {
        color: '#666',
        fontWeight: 'bold',
    },
    treatmentCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        elevation: 2,
        marginBottom: 20,
    },
    treatmentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    treatmentItem: {
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    treatmentTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    treatmentText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 22,
    },
    managementCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        elevation: 2,
        marginBottom: 20,
    },
    managementHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    managementItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 15,
        gap: 12,
    },
    managementContent: {
        flex: 1,
    },
    managementTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    managementText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    characteristicsCard: {
        backgroundColor: '#e8f5e9',
        marginHorizontal: 20,
        marginBottom: 15,
        padding: 15,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#2e7d32',
    },
    characteristicsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    characteristicItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingLeft: 5,
    },
    characteristicText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
        flex: 1,
    },
    textureInfo: {
        fontSize: 13,
        color: '#2e7d32',
        fontWeight: '600',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#c8e6c9',
    },
});

export default SoilScreen;
