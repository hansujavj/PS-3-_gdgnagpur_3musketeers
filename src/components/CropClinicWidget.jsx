/**
 * CropClinicWidget.jsx
 *
 * Dashboard widget for Crop Clinic.
 * Shows last diagnosis summary with a "Scan Again" button.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLatestDiagnosis } from '../db/cropClinicSupabase';
import { getSeverityLevel } from '../data/cropClinicData';

const CropClinicWidget = () => {
    const navigation = useNavigation();
    const [lastDiagnosis, setLastDiagnosis] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLastDiagnosis();
    }, []);

    const fetchLastDiagnosis = async () => {
        try {
            const profile = await AsyncStorage.getItem('user-profile');
            const userId = profile ? JSON.parse(profile).phone || 'anonymous' : 'anonymous';
            const data = await getLatestDiagnosis(userId);
            setLastDiagnosis(data);
        } catch (err) {
            console.warn('CropClinicWidget fetch error:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
        });
    };

    const severity = lastDiagnosis
        ? getSeverityLevel(lastDiagnosis.confidence || 0)
        : null;

    return (
        <View style={styles.widgetCard}>
            <View style={styles.widgetHeader}>
                <View style={styles.widgetTitleRow}>
                    <View style={styles.widgetIconBox}>
                        <Ionicons name="medkit" size={20} color="#2e7d32" />
                    </View>
                    <Text style={styles.widgetTitle}>Crop Clinic</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('CropClinic')}>
                    <Text style={styles.viewAll}>Scan Now</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Loading...</Text>
                </View>
            ) : lastDiagnosis ? (
                <View style={styles.diagnosisContent}>
                    <View style={styles.diagnosisRow}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: lastDiagnosis.is_healthy ? '#4caf50' : (severity?.color || '#f57c00') }
                        ]} />
                        <View style={styles.diagnosisInfo}>
                            <Text style={styles.diagnosisName}>
                                {lastDiagnosis.disease_name}
                            </Text>
                            <View style={styles.diagnosisMeta}>
                                <Text style={[
                                    styles.severityBadge,
                                    { color: severity?.color || '#888', backgroundColor: (severity?.color || '#888') + '15' }
                                ]}>
                                    {lastDiagnosis.severity || 'Low'}
                                </Text>
                                <Text style={styles.dateText}>
                                    {formatDate(lastDiagnosis.created_at)}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.confidenceText}>
                            {Math.round((lastDiagnosis.confidence || 0) * 100)}%
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.scanBtn}
                        onPress={() => navigation.navigate('CropClinic')}
                    >
                        <Ionicons name="scan-outline" size={18} color="#fff" />
                        <Text style={styles.scanBtnText}>Scan Again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.emptyState}
                    onPress={() => navigation.navigate('CropClinic')}
                >
                    <Ionicons name="scan-outline" size={36} color="#4caf50" />
                    <Text style={styles.emptyTitle}>No scans yet</Text>
                    <Text style={styles.emptyText}>
                        Tap to scan your crop and detect diseases instantly
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    widgetCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 15,
        borderRadius: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    widgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    widgetTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    widgetIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    widgetTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    viewAll: {
        color: '#2e7d32',
        fontWeight: '600',
        fontSize: 14,
    },
    diagnosisContent: {},
    diagnosisRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
    },
    diagnosisInfo: {
        flex: 1,
    },
    diagnosisName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    diagnosisMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    severityBadge: {
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        overflow: 'hidden',
    },
    dateText: {
        fontSize: 12,
        color: '#888',
    },
    confidenceText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2e7d32',
        marginLeft: 10,
    },
    scanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2e7d32',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 8,
    },
    scanBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 15,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginTop: 8,
    },
    emptyText: {
        fontSize: 13,
        color: '#888',
        textAlign: 'center',
        marginTop: 4,
    },
});

export default CropClinicWidget;
