/**
 * CropClinicScreen.jsx
 *
 * Crop Clinic scan screen.
 * Allows user to capture/pick a plant image and get AI-powered disease diagnosis.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CropClinicEngine from '../engines/cropClinicEngine';

const CropClinicScreen = () => {
    const navigation = useNavigation();
    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');

    const handleScan = async (source) => {
        setLoading(true);
        setLoadingText(source === 'camera' ? 'Capturing image...' : 'Loading image...');

        try {
            setLoadingText('Analyzing crop...');
            const result = await CropClinicEngine.diagnose(source);
            setImageUri(result.imageUri);
            setLoading(false);

            // Navigate to result screen
            navigation.navigate('CropClinicResult', { diagnosis: result });
        } catch (error) {
            setLoading(false);
            const message = CropClinicEngine.getErrorMessage(error);

            // Don't show alert for cancelled actions
            if (
                error.message?.includes('CANCELLED') ||
                error.message?.includes('cancelled')
            ) {
                return;
            }

            Alert.alert('Scan Failed', message, [{ text: 'OK' }]);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Crop Clinic</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Illustration / Preview */}
                <View style={styles.illustrationContainer}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="leaf" size={80} color="#4caf50" />
                            <Text style={styles.placeholderText}>
                                Scan your crop to detect diseases
                            </Text>
                        </View>
                    )}
                </View>

                {/* Instructions */}
                <View style={styles.instructionsCard}>
                    <Text style={styles.instructionsTitle}>How to scan</Text>
                    <View style={styles.instructionRow}>
                        <View style={styles.instructionStep}>
                            <View style={styles.stepCircle}>
                                <Text style={styles.stepNumber}>1</Text>
                            </View>
                            <Text style={styles.stepText}>Take a clear photo of the affected leaf or plant part</Text>
                        </View>
                        <View style={styles.instructionStep}>
                            <View style={styles.stepCircle}>
                                <Text style={styles.stepNumber}>2</Text>
                            </View>
                            <Text style={styles.stepText}>Ensure good lighting and focus on the problem area</Text>
                        </View>
                        <View style={styles.instructionStep}>
                            <View style={styles.stepCircle}>
                                <Text style={styles.stepNumber}>3</Text>
                            </View>
                            <Text style={styles.stepText}>Get instant diagnosis with treatment recommendations</Text>
                        </View>
                    </View>
                </View>

                {/* Scan Buttons */}
                {!loading ? (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.cameraBtn}
                            onPress={() => handleScan('camera')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="camera" size={28} color="#fff" />
                            <Text style={styles.cameraBtnText}>Take Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.galleryBtn}
                            onPress={() => handleScan('gallery')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="images-outline" size={24} color="#2e7d32" />
                            <Text style={styles.galleryBtnText}>Choose from Gallery</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2e7d32" />
                        <Text style={styles.loadingText}>{loadingText}</Text>
                        <Text style={styles.loadingSubtext}>
                            This may take a few seconds...
                        </Text>
                    </View>
                )}

                {/* Tips */}
                <View style={styles.tipsCard}>
                    <Ionicons name="bulb-outline" size={20} color="#f57c00" />
                    <Text style={styles.tipsText}>
                        For best results, photograph a single leaf with visible symptoms against a plain background.
                    </Text>
                </View>
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
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
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
    illustrationContainer: {
        marginHorizontal: 20,
        marginTop: -20,
        height: 220,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e8f5e9',
    },
    placeholderText: {
        marginTop: 12,
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    instructionsCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 20,
        padding: 20,
        borderRadius: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    instructionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    instructionRow: {
        gap: 12,
    },
    instructionStep: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    stepCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    buttonContainer: {
        paddingHorizontal: 20,
        marginTop: 25,
        gap: 12,
    },
    cameraBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2e7d32',
        paddingVertical: 16,
        borderRadius: 15,
        gap: 10,
        elevation: 3,
        shadowColor: '#2e7d32',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    cameraBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    galleryBtn: {
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
    galleryBtnText: {
        color: '#2e7d32',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 18,
        fontWeight: '600',
        color: '#2e7d32',
    },
    loadingSubtext: {
        marginTop: 5,
        fontSize: 14,
        color: '#888',
    },
    tipsCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff3e0',
        marginHorizontal: 20,
        marginTop: 20,
        padding: 15,
        borderRadius: 12,
        gap: 10,
    },
    tipsText: {
        flex: 1,
        fontSize: 13,
        color: '#e65100',
        lineHeight: 20,
    },
});

export default CropClinicScreen;
