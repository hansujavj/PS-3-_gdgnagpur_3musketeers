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
    SafeAreaView,
    Alert,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { insertDiagnosis, insertOrderSummary } from '../db/cropClinicSupabase';
import { LOW_CONFIDENCE_THRESHOLD } from '../data/cropClinicData';

const CropClinicResultScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { diagnosis } = route.params;

    const [saved, setSaved] = useState(false);
    const [treatmentModalVisible, setTreatmentModalVisible] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(null);
    const [selectedSeller, setSelectedSeller] = useState(null);

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

    const handleBuyTreatment = async () => {
        if (!selectedSeller) {
            Alert.alert("Action Required", "Please select a platform to order from.");
            return;
        }

        setIsPurchasing(true);
        
        setTimeout(async () => {
            const profile = await AsyncStorage.getItem('user-profile');
            const userId = profile ? JSON.parse(profile).phone || 'anonymous' : 'anonymous';
            const price = selectedSeller.price; 

            const order = {
                product_name: treatment?.pesticide || 'Organic Remedy',
                price: price,
                crop_name: diagnosis.matchedLabels?.[0] || 'Unknown Crop',
                disease_name: disease?.name || 'Unknown',
                platform: selectedSeller.name
            };

            const result = await insertOrderSummary(order, userId);
            setIsPurchasing(false);
            setOrderSuccess(result ? order : false);
        }, 2000); // UI loading pause
    };

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

                        <TouchableOpacity style={styles.getTreatmentBtn} onPress={() => setTreatmentModalVisible(true)}>
                            <Ionicons name="cart-outline" size={20} color="#fff" />
                            <Text style={styles.getTreatmentBtnText}>Get Treatment Now</Text>
                        </TouchableOpacity>
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

            {/* Treatment Modal */}
            <Modal visible={treatmentModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.treatmentModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Order Treatment</Text>
                            <TouchableOpacity onPress={() => { setTreatmentModalVisible(false); setOrderSuccess(null); }}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {isPurchasing ? (
                            <View style={styles.modalLoading}>
                                <ActivityIndicator size="large" color="#2e7d32" />
                                <Text style={styles.modalLoadingText}>Processing your order securely...</Text>
                            </View>
                        ) : orderSuccess ? (
                            <View style={styles.modalSuccess}>
                                <Ionicons name="checkmark-circle" size={64} color="#4caf50" />
                                <Text style={styles.modalSuccessTitle}>Order Placed Successfully!</Text>
                                <View style={styles.receiptBox}>
                                    <Text style={styles.receiptText}>Platform: {orderSuccess.platform}</Text>
                                    <Text style={styles.receiptText}>Product: {orderSuccess.product_name}</Text>
                                    <Text style={styles.receiptText}>Total Charged: ₹{orderSuccess.price}</Text>
                                    <Text style={styles.receiptText}>Est. Delivery: 2-3 Days</Text>
                                </View>
                                <TouchableOpacity style={styles.doneBtn} onPress={() => setTreatmentModalVisible(false)}>
                                    <Text style={styles.doneBtnText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <ScrollView style={styles.modalScroll}>
                                <Text style={styles.productRecommendedTitle}>Recommended Product</Text>
                                <View style={styles.productCard}>
                                    <Ionicons name="flask-outline" size={32} color="#1565c0" />
                                    <View style={styles.productInfo}>
                                        <Text style={styles.productName}>{treatment?.pesticide || 'Agri Med'}</Text>
                                        <Text style={styles.productSub}>Verified authentic</Text>
                                    </View>
                                </View>

                                <Text style={styles.productRecommendedTitle}>Available Platforms</Text>
                                <TouchableOpacity 
                                    style={[styles.sellerRow, selectedSeller?.name === 'AgroStar' && styles.sellerRowSelected]} 
                                    onPress={() => setSelectedSeller({name: 'AgroStar', price: 240})}
                                >
                                    <View style={styles.sellerPlatform}>
                                        <View style={[styles.platformLogoBg, { backgroundColor: '#e53935' }]}><Text style={styles.platformLogoText}>A</Text></View>
                                        <View>
                                            <Text style={styles.sellerName}>AgroStar</Text>
                                            <Text style={styles.sellerDistance}>Estimated delivery: 2 Days</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.sellerPrice}>₹240</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.sellerRow, selectedSeller?.name === 'BigHaat' && styles.sellerRowSelected]} 
                                    onPress={() => setSelectedSeller({name: 'BigHaat', price: 235})}
                                >
                                    <View style={styles.sellerPlatform}>
                                        <View style={[styles.platformLogoBg, { backgroundColor: '#43a047' }]}><Text style={styles.platformLogoText}>B</Text></View>
                                        <View>
                                            <Text style={styles.sellerName}>BigHaat</Text>
                                            <Text style={styles.sellerDistance}>Estimated delivery: 3 Days</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.sellerPrice}>₹235</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.sellerRow, selectedSeller?.name === 'DeHaat' && styles.sellerRowSelected]} 
                                    onPress={() => setSelectedSeller({name: 'DeHaat', price: 245})}
                                >
                                    <View style={styles.sellerPlatform}>
                                        <View style={[styles.platformLogoBg, { backgroundColor: '#1e88e5' }]}><Text style={styles.platformLogoText}>D</Text></View>
                                        <View>
                                            <Text style={styles.sellerName}>DeHaat</Text>
                                            <Text style={styles.sellerDistance}>Estimated delivery: 2 Days</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.sellerPrice}>₹245</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.sellerRow, selectedSeller?.name === 'IndiaMART' && styles.sellerRowSelected]} 
                                    onPress={() => setSelectedSeller({name: 'IndiaMART', price: 220})}
                                >
                                    <View style={styles.sellerPlatform}>
                                        <View style={[styles.platformLogoBg, { backgroundColor: '#fb8c00' }]}><Text style={styles.platformLogoText}>I</Text></View>
                                        <View>
                                            <Text style={styles.sellerName}>IndiaMART</Text>
                                            <Text style={styles.sellerDistance}>Bulk orders available</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.sellerPrice}>₹220</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.buyConfirmBtn} onPress={handleBuyTreatment}>
                                    <Ionicons name="cart" size={20} color="#fff" />
                                    <Text style={styles.buyConfirmBtnText}>Buy Directly</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
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
    getTreatmentBtn: {
        backgroundColor: '#1565c0',
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        gap: 8,
    },
    getTreatmentBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    treatmentModal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderColor: '#eee',
        paddingBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalScroll: {
        paddingBottom: 20,
    },
    productRecommendedTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#666',
        marginTop: 15,
        marginBottom: 10,
    },
    productCard: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        gap: 15,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    productSub: {
        fontSize: 12,
        color: '#1565c0',
        marginTop: 2,
    },
    sellerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 8,
    },
    sellerRowSelected: {
        backgroundColor: '#e8f5e9',
        borderColor: '#2e7d32',
        borderBottomWidth: 2,
    },
    sellerPlatform: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    platformLogoBg: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    platformLogoText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    sellerName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    sellerDistance: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
    },
    sellerPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    buyConfirmBtn: {
        backgroundColor: '#2e7d32',
        flexDirection: 'row',
        paddingVertical: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        marginTop: 25,
        marginBottom: 30,
        gap: 10,
    },
    buyConfirmBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    modalLoading: {
        alignItems: 'center',
        padding: 40,
    },
    modalLoadingText: {
        marginTop: 15,
        color: '#555',
        fontSize: 15,
    },
    modalSuccess: {
        alignItems: 'center',
        padding: 20,
        paddingBottom: 40,
    },
    modalSuccessTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2e7d32',
        marginTop: 15,
        marginBottom: 20,
    },
    receiptBox: {
        backgroundColor: '#f5f5f5',
        padding: 15,
        borderRadius: 10,
        width: '100%',
        marginBottom: 20,
    },
    receiptText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 5,
    },
    doneBtn: {
        backgroundColor: '#1565c0',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 10,
    },
    doneBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default CropClinicResultScreen;
