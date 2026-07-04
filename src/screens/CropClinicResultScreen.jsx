/**
 * CropClinicResultScreen.jsx
 *
 * Displays diagnosis results including disease, confidence,
 * severity, treatment, and prevention tips.
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { insertDiagnosis } from '../db/cropClinicSupabase';
import { LOW_CONFIDENCE_THRESHOLD } from '../data/cropClinicData';

const CropClinicResultScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { diagnosis } = route.params;

    const [saved, setSaved] = useState(false);

    useEffect(() => {
        saveDiagnosis();
    }, []);

    const saveDiagnosis = async () => {
        try {
            const profile = await AsyncStorage.getItem('user-profile');
            const userId = profile ? JSON.parse(profile).phone || 'anonymous' : 'anonymous';
            await insertDiagnosis(diagnosis, userId);
            setSaved(true);
        } catch (err) {
            console.warn('Failed to save diagnosis:', err.message);
        }
    };

    const confidencePercent = Math.round((diagnosis.confidence || 0) * 100);
    const isHealthy = diagnosis.isHealthy;
    const disease = diagnosis.disease;
    const treatment = diagnosis.treatment;
    const severity = diagnosis.severity;

    const handleScanAgain = () => {
        navigation.replace('CropClinic');
    };

    const handleGoHome = () => {
        navigation.navigate('MainTabs');
    };

    // Not a plant image
    if (diagnosis.notPlant) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Scan Result</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {diagnosis.imageUri && (
                        <Image source={{ uri: diagnosis.imageUri }} style={styles.resultImage} />
                    )}

                    <View style={styles.notPlantCard}>
                        <Ionicons name="help-circle-outline" size={60} color="#f57c00" />
                        <Text style={styles.notPlantTitle}>Not a Plant Image</Text>
                        <Text style={styles.notPlantText}>
                            We couldn't detect a plant or crop in this image. Please take a clear photo of the affected leaf or plant part.
                        </Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={handleScanAgain}>
                            <Ionicons name="camera" size={20} color="#fff" />
                            <Text style={styles.retryBtnText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Diagnosis Result</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Scanned Image */}
                {diagnosis.imageUri && (
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: diagnosis.imageUri }} style={styles.resultImage} />
                    </View>
                )}

                {/* Disease Result Card */}
                <View style={[styles.resultCard, { borderLeftColor: disease?.color || '#2e7d32' }]}>
                    <View style={styles.resultHeader}>
                        <View style={[styles.resultIconBox, { backgroundColor: (disease?.color || '#2e7d32') + '20' }]}>
                            <Ionicons
                                name={disease?.icon || 'checkmark-circle'}
                                size={32}
                                color={disease?.color || '#2e7d32'}
                            />
                        </View>
                        <View style={styles.resultInfo}>
                            <Text style={styles.diseaseLabel}>
                                {isHealthy ? 'HEALTHY' : 'DETECTED'}
                            </Text>
                            <Text style={styles.diseaseName}>
                                {disease?.name || 'Unknown'}
                            </Text>
                        </View>
                    </View>

                    {/* Metrics Row */}
                    <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Confidence</Text>
                            <Text style={[styles.metricValue, { color: disease?.color || '#2e7d32' }]}>
                                {confidencePercent}%
                            </Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Severity</Text>
                            <View style={styles.severityBadge}>
                                <Ionicons name={severity?.icon || 'information-circle'} size={16} color={severity?.color || '#fbc02d'} />
                                <Text style={[styles.severityText, { color: severity?.color || '#fbc02d' }]}>
                                    {severity?.level || 'Low'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Low Confidence Warning */}
                {diagnosis.lowConfidence && (
                    <View style={styles.warningCard}>
                        <Ionicons name="warning" size={24} color="#f57c00" />
                        <View style={styles.warningContent}>
                            <Text style={styles.warningTitle}>Low Confidence</Text>
                            <Text style={styles.warningText}>
                                The confidence level is below {Math.round(LOW_CONFIDENCE_THRESHOLD * 100)}%. We recommend consulting an agricultural expert for accurate diagnosis.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Treatment Section */}
                {treatment && !isHealthy && (
                    <View style={styles.treatmentCard}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="medkit" size={18} color="#2e7d32" /> Treatment Plan
                        </Text>

                        <View style={styles.treatmentRow}>
                            <View style={styles.treatmentItem}>
                                <Text style={styles.treatmentLabel}>Recommended Pesticide</Text>
                                <Text style={styles.treatmentValue}>{treatment.pesticide}</Text>
                            </View>
                        </View>

                        <View style={styles.treatmentRow}>
                            <View style={styles.treatmentItem}>
                                <Text style={styles.treatmentLabel}>Dosage</Text>
                                <Text style={styles.treatmentValue}>{treatment.dosage}</Text>
                            </View>
                        </View>

                        {treatment.spray_interval && treatment.spray_interval !== 'N/A' && (
                            <View style={styles.treatmentRow}>
                                <View style={styles.treatmentItem}>
                                    <Text style={styles.treatmentLabel}>Spray Interval</Text>
                                    <Text style={styles.treatmentValue}>{treatment.spray_interval}</Text>
                                </View>
                            </View>
                        )}

                        {treatment.organic_alternative && (
                            <View style={styles.organicCard}>
                                <Ionicons name="leaf" size={16} color="#2e7d32" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.organicLabel}>Organic Alternative</Text>
                                    <Text style={styles.organicText}>{treatment.organic_alternative}</Text>
                                </View>
                            </View>
                        )}

                        {treatment.emergency && (
                            <View style={styles.emergencyCard}>
                                <Ionicons name="alert-circle" size={16} color="#d32f2f" />
                                <Text style={styles.emergencyText}>{treatment.emergency}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Prevention Tips */}
                {treatment?.prevention && treatment.prevention.length > 0 && (
                    <View style={styles.preventionCard}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="shield-checkmark" size={18} color="#2e7d32" /> {isHealthy ? 'Care Tips' : 'Prevention Tips'}
                        </Text>
                        {treatment.prevention.map((tip, index) => (
                            <View key={index} style={styles.preventionItem}>
                                <View style={styles.preventionBullet}>
                                    <Text style={styles.preventionBulletText}>{index + 1}</Text>
                                </View>
                                <Text style={styles.preventionText}>{tip}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Healthy Message */}
                {isHealthy && (
                    <View style={styles.healthyCard}>
                        <Ionicons name="checkmark-circle" size={40} color="#2e7d32" />
                        <Text style={styles.healthyTitle}>Your crop looks healthy!</Text>
                        <Text style={styles.healthyText}>
                            No disease detected. Continue your current farming practices and monitor regularly.
                        </Text>
                    </View>
                )}

                {/* Matched Labels */}
                {diagnosis.matchedLabels && diagnosis.matchedLabels.length > 0 && (
                    <View style={styles.labelsCard}>
                        <Text style={styles.labelsTitle}>Detected Features</Text>
                        <View style={styles.labelsContainer}>
                            {diagnosis.matchedLabels.map((label, index) => (
                                <View key={index} style={styles.labelChip}>
                                    <Text style={styles.labelChipText}>{label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.scanAgainBtn} onPress={handleScanAgain}>
                        <Ionicons name="camera" size={20} color="#fff" />
                        <Text style={styles.scanAgainText}>Scan Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.homeBtn} onPress={handleGoHome}>
                        <Ionicons name="home-outline" size={20} color="#2e7d32" />
                        <Text style={styles.homeBtnText}>Go Home</Text>
                    </TouchableOpacity>
                </View>

                {saved && (
                    <Text style={styles.savedText}>
                        <Ionicons name="checkmark" size={14} color="#4caf50" /> Diagnosis saved to history
                    </Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#2e7d32',
    },
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#2e7d32',
        paddingHorizontal: 20,
        paddingVertical: 15,
        paddingTop: 50,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    imageContainer: {
        height: 200,
        backgroundColor: '#000',
    },
    resultImage: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    resultCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 20,
        padding: 20,
        borderRadius: 15,
        borderLeftWidth: 5,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    resultIconBox: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    resultInfo: {
        flex: 1,
    },
    diseaseLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    diseaseName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 2,
    },
    metricsRow: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 15,
    },
    metricItem: {
        flex: 1,
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 5,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    metricDivider: {
        width: 1,
        backgroundColor: '#e0e0e0',
        marginHorizontal: 10,
    },
    severityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    severityText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    warningCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff3e0',
        marginHorizontal: 20,
        marginTop: 15,
        padding: 15,
        borderRadius: 12,
        gap: 12,
    },
    warningContent: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#e65100',
        marginBottom: 4,
    },
    warningText: {
        fontSize: 13,
        color: '#bf360c',
        lineHeight: 20,
    },
    treatmentCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 15,
        padding: 20,
        borderRadius: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    treatmentRow: {
        marginBottom: 12,
    },
    treatmentItem: {},
    treatmentLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 3,
        textTransform: 'uppercase',
    },
    treatmentValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    organicCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#e8f5e9',
        padding: 12,
        borderRadius: 10,
        marginTop: 10,
        gap: 10,
    },
    organicLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2e7d32',
        marginBottom: 2,
    },
    organicText: {
        fontSize: 14,
        color: '#1b5e20',
        lineHeight: 20,
    },
    emergencyCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#ffebee',
        padding: 12,
        borderRadius: 10,
        marginTop: 10,
        gap: 10,
    },
    emergencyText: {
        flex: 1,
        fontSize: 13,
        color: '#c62828',
        lineHeight: 20,
    },
    preventionCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 15,
        padding: 20,
        borderRadius: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    preventionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
        gap: 10,
    },
    preventionBullet: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    preventionBulletText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    preventionText: {
        flex: 1,
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    healthyCard: {
        alignItems: 'center',
        backgroundColor: '#e8f5e9',
        marginHorizontal: 20,
        marginTop: 15,
        padding: 25,
        borderRadius: 15,
    },
    healthyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2e7d32',
        marginTop: 10,
    },
    healthyText: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    labelsCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 15,
        padding: 20,
        borderRadius: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    labelsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#888',
        marginBottom: 10,
    },
    labelsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    labelChip: {
        backgroundColor: '#f0f4f8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    labelChipText: {
        fontSize: 13,
        color: '#555',
        fontWeight: '500',
    },
    actionButtons: {
        paddingHorizontal: 20,
        marginTop: 25,
        gap: 12,
    },
    scanAgainBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2e7d32',
        paddingVertical: 16,
        borderRadius: 15,
        gap: 10,
        elevation: 3,
    },
    scanAgainText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    homeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 14,
        borderRadius: 15,
        gap: 10,
        borderWidth: 2,
        borderColor: '#2e7d32',
    },
    homeBtnText: {
        color: '#2e7d32',
        fontSize: 16,
        fontWeight: '600',
    },
    savedText: {
        textAlign: 'center',
        color: '#4caf50',
        fontSize: 13,
        marginTop: 15,
    },
    // Not plant styles
    notPlantCard: {
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 25,
        padding: 30,
        borderRadius: 15,
        elevation: 2,
    },
    notPlantTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f57c00',
        marginTop: 15,
    },
    notPlantText: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2e7d32',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 12,
        gap: 8,
        marginTop: 20,
    },
    retryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CropClinicResultScreen;
