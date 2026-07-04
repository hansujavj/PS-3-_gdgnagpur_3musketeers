/**
 * DiseaseScreen.jsx
 * 
 * Purpose: Help farmers identify and treat plant diseases and pests
 * Features:
 * - Step-by-step symptom checker
 * - Disease diagnosis based on symptoms
 * - Treatment recommendations (organic & chemical)
 * - Preventive measures
 * - Emergency contacts
 * 
 * Flow:
 * 1. Select crop
 * 2. Choose symptoms
 * 3. View diagnosis
 * 4. Get treatment plan
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import DiseaseEngine from '../engines/diseaseDetectionEngine';

const DiseaseScreen = () => {
    const { t } = useTranslation();

    // Wizard state
    const [step, setStep] = useState(1); // 1: Crop, 2: Symptoms, 3: Results
    const [selectedCrop, setSelectedCrop] = useState('');
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [diagnosis, setDiagnosis] = useState([]);

    // Memoize crops list as it's static
    const crops = useMemo(() => DiseaseEngine.getAvailableCrops(), []);

    // Memoize symptoms based on selected crop to avoid recalculation on every render
    const symptoms = useMemo(() => {
        if (!selectedCrop) return [];
        return DiseaseEngine.getCommonSymptoms(selectedCrop);
    }, [selectedCrop]);

    /**
     * Handle crop selection and move to symptom selection
     */
    const handleCropSelect = (crop) => {
        setSelectedCrop(crop);
        setSelectedSymptoms([]);
        setStep(2);
    };

    /**
     * Toggle symptom selection
     */
    const toggleSymptom = (symptom) => {
        if (selectedSymptoms.includes(symptom)) {
            setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
        } else {
            setSelectedSymptoms([...selectedSymptoms, symptom]);
        }
    };

    /**
     * Perform diagnosis based on selected symptoms
     */
    const handleDiagnose = () => {
        if (selectedSymptoms.length === 0) {
            Alert.alert(t('common.error'), t('disease.step2_title'));
            return;
        }

        const results = DiseaseEngine.diagnoseBySymptoms(selectedCrop, selectedSymptoms);
        setDiagnosis(results);
        setStep(3);
    };

    /**
     * Reset wizard to start
     */
    const handleReset = () => {
        setStep(1);
        setSelectedCrop('');
        setSelectedSymptoms([]);
        setDiagnosis([]);
    };

    /**
     * Render crop selection step
     */
    const renderCropSelection = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('disease.step1_title')}</Text>
            <Text style={styles.stepSubtitle}>{t('disease.step1_subtitle')}</Text>

            <View style={styles.cropGrid}>
                {crops.length > 0 ? (
                    crops.map(crop => (
                        <TouchableOpacity
                            key={crop}
                            style={styles.cropCard}
                            onPress={() => handleCropSelect(crop)}
                        >
                            <View style={styles.cropIcon}>
                                <Text style={styles.cropEmoji}>🌾</Text>
                            </View>
                            <Text style={styles.cropName}>{t(`crops.${crop}`, { defaultValue: crop.charAt(0).toUpperCase() + crop.slice(1) })}</Text>
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={styles.noResultsText}>{t('common.error')}</Text>
                )}
            </View>
        </View>
    );

    /**
     * Render symptom selection step
     */
    const renderSymptomSelection = () => {
        return (
            <View style={styles.stepContainer}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#2e7d32" />
                    <Text style={styles.backText}>{t('disease.change_crop')}</Text>
                </TouchableOpacity>

                <Text style={styles.stepTitle}>{t('disease.step2_title')}</Text>
                <Text style={styles.stepSubtitle}>
                    Crop: <Text style={styles.highlight}>{selectedCrop}</Text> •
                    Selected: <Text style={styles.highlight}>{selectedSymptoms.length}</Text>
                </Text>

                <ScrollView style={styles.symptomList} showsVerticalScrollIndicator={false}>
                    {symptoms.length > 0 ? (
                        symptoms.map((symptom, index) => {
                            const isSelected = selectedSymptoms.includes(symptom);
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.symptomCard, isSelected && styles.symptomSelected]}
                                    onPress={() => toggleSymptom(symptom)}
                                >
                                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                        {isSelected && <Ionicons name="checkmark" size={18} color="#fff" />}
                                    </View>
                                    <Text style={[styles.symptomText, isSelected && styles.symptomTextSelected]}>
                                        {symptom}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <Text style={styles.noResultsText}>No symptoms found for this crop.</Text>
                    )}
                </ScrollView>

                <TouchableOpacity
                    style={[styles.diagnoseBtn, { opacity: selectedSymptoms.length > 0 ? 1 : 0.6 }]}
                    onPress={handleDiagnose}
                    disabled={selectedSymptoms.length === 0}
                >
                    <Text style={styles.diagnoseBtnText}>{t('disease.diagnose_btn')}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 10 }} />
                </TouchableOpacity>
            </View>
        );
    };

    /**
     * Render diagnosis results
     */
    const renderResults = () => {
        const emergencyContacts = DiseaseEngine.getEmergencyContacts();
        const preventiveTips = DiseaseEngine.getPreventiveTips(selectedCrop);

        return (
            <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
                <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
                    <Ionicons name="refresh" size={20} color="#2e7d32" />
                    <Text style={styles.resetText}>{t('disease.start_new')}</Text>
                </TouchableOpacity>

                <Text style={styles.resultsTitle}>{t('disease.results_title')}</Text>
                <Text style={styles.resultsSubtitle}>
                    Based on {selectedSymptoms.length} symptom(s) for {selectedCrop}
                </Text>

                {diagnosis.length === 0 ? (
                    <View style={styles.noResults}>
                        <Ionicons name="help-circle-outline" size={60} color="#ccc" />
                        <Text style={styles.noResultsText}>{t('disease.no_match')}</Text>
                    </View>
                ) : (
                    diagnosis.map((disease, index) => (
                        <View key={index} style={styles.diseaseCard}>
                            <View style={styles.diseaseHeader}>
                                <View style={[styles.severityBadge,
                                disease.severity === 'high' && styles.severityHigh,
                                disease.severity === 'medium' && styles.severityMedium
                                ]}>
                                    <Text style={styles.severityText}>
                                        {disease.severity === 'high' ? '⚠️ High' : '⚡ Medium'}
                                    </Text>
                                </View>
                                <Text style={styles.matchText}>{disease.matchPercentage}% match</Text>
                            </View>

                            <Text style={styles.diseaseName}>{disease.name}</Text>
                            <Text style={styles.diseaseType}>Type: {disease.type}</Text>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>📋 Symptoms</Text>
                                {disease.symptoms.map((s, i) => (
                                    <Text key={i} style={styles.bulletPoint}>• {s}</Text>
                                ))}
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>🌿 {t('disease.organic_treatment')}</Text>
                                <Text style={styles.treatmentText}>{disease.treatment.organic}</Text>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>💊 {t('disease.chemical_treatment')}</Text>
                                <Text style={styles.treatmentText}>{disease.treatment.chemical}</Text>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>🛡️ {t('disease.prevention')}</Text>
                                <Text style={styles.treatmentText}>{disease.treatment.preventive}</Text>
                            </View>

                            {disease.season && (
                                <Text style={styles.seasonText}>{t('disease.season')}: {disease.season}</Text>
                            )}
                        </View>
                    ))
                )}

                {/* Preventive Tips */}
                <View style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>💡 {t('disease.prevention')} - {selectedCrop}</Text>
                    {preventiveTips.map((tip, i) => (
                        <Text key={i} style={styles.tipItem}>• {tip}</Text>
                    ))}
                </View>

                {/* Emergency Contacts */}
                <View style={styles.emergencyCard}>
                    <Text style={styles.emergencyTitle}>🚨 {t('disease.expert_help')}</Text>
                    {Object.values(emergencyContacts).map((contact, i) => (
                        <View key={i} style={styles.contactItem}>
                            <Text style={styles.contactName}>{contact.name}</Text>
                            {contact.number && (
                                <Text style={styles.contactNumber}>{contact.number}</Text>
                            )}
                            <Text style={styles.contactDesc}>{contact.description}</Text>
                        </View>
                    ))}
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="medkit" size={28} color="#2e7d32" />
                <Text style={styles.headerTitle}>{t('disease.title')}</Text>
            </View>

            {step === 1 && renderCropSelection()}
            {step === 2 && renderSymptomSelection()}
            {step === 3 && renderResults()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50,
        backgroundColor: '#fff',
        elevation: 2,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 10,
    },
    stepContainer: {
        flex: 1,
        padding: 20,
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    stepSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    highlight: {
        color: '#2e7d32',
        fontWeight: 'bold',
    },
    cropGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    cropCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
        alignItems: 'center',
        elevation: 2,
    },
    cropIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    cropEmoji: {
        fontSize: 32,
    },
    cropName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        textTransform: 'capitalize',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backText: {
        marginLeft: 5,
        color: '#2e7d32',
        fontWeight: '600',
    },
    symptomList: {
        flex: 1,
        marginBottom: 20,
    },
    symptomCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    symptomSelected: {
        backgroundColor: '#e8f5e9',
        borderColor: '#2e7d32',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#ccc',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#2e7d32',
        borderColor: '#2e7d32',
    },
    symptomText: {
        flex: 1,
        fontSize: 15,
        color: '#333',
    },
    symptomTextSelected: {
        fontWeight: '600',
        color: '#2e7d32',
    },
    diagnoseBtn: {
        flexDirection: 'row',
        backgroundColor: '#2e7d32',
        padding: 18,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },
    diagnoseBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    resultsContainer: {
        flex: 1,
        padding: 20,
    },
    resetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginBottom: 20,
    },
    resetText: {
        marginLeft: 5,
        color: '#2e7d32',
        fontWeight: '600',
    },
    resultsTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    resultsSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    diseaseCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
        elevation: 2,
    },
    diseaseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    severityBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#fff3e0',
    },
    severityHigh: {
        backgroundColor: '#ffebee',
    },
    severityMedium: {
        backgroundColor: '#fff3e0',
    },
    severityText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#e65100',
    },
    matchText: {
        fontSize: 12,
        color: '#2e7d32',
        fontWeight: 'bold',
    },
    diseaseName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    diseaseType: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
        textTransform: 'capitalize',
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    bulletPoint: {
        fontSize: 14,
        color: '#555',
        marginBottom: 4,
        lineHeight: 20,
    },
    treatmentText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 22,
    },
    seasonText: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
        marginTop: 10,
    },
    tipsCard: {
        backgroundColor: '#e8f5e9',
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
    },
    tipsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2e7d32',
        marginBottom: 12,
    },
    tipItem: {
        fontSize: 14,
        color: '#333',
        marginBottom: 8,
        lineHeight: 20,
    },
    emergencyCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        borderWidth: 2,
        borderColor: '#ff9800',
    },
    emergencyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#e65100',
        marginBottom: 15,
    },
    contactItem: {
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    contactName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    contactNumber: {
        fontSize: 18,
        color: '#2e7d32',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    contactDesc: {
        fontSize: 13,
        color: '#666',
    },
    noResults: {
        alignItems: 'center',
        padding: 40,
    },
    noResultsText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#999',
        marginTop: 15,
    },
    noResultsHint: {
        fontSize: 14,
        color: '#bbb',
        marginTop: 5,
        textAlign: 'center',
    }
});

export default DiseaseScreen;
