import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const INITIAL_SENSOR_DATA = {
    soil_moisture: 40.0,
    soil_temp: 9.0,
    soil_ph: 5.8,
    tank_level: 82.0,
    ambient_humidity: 70.0,
    ambient_temp: 35.0,
    rain_next_48h: 10.0
};

const IrrigationScreen = () => {
    const navigation = useNavigation();
    const [step, setStep] = useState(0); // 0: Info, 1: Loading, 2: Decision
    const [pumpStatus, setPumpStatus] = useState(false);
    const [reason, setReason] = useState("");
    const [sensorData, setSensorData] = useState(INITIAL_SENSOR_DATA);

    // Simulation loop for active pump
    useEffect(() => {
        let interval;
        if (pumpStatus && step === 2) {
            interval = setInterval(() => {
                setSensorData(prev => {
                    const newMoisture = prev.soil_moisture + 2.5;
                    const newTank = prev.tank_level - 1.0;

                    // Automatically switch OFF if optimal moisture is reached or tank is low
                    if (newMoisture >= 60.0 || newTank <= 20.0) {
                        setPumpStatus(false);
                        if (newTank <= 20.0) {
                            setReason("Pump automatically stopped: Low tank water level.");
                            Alert.alert("Warning", "Low Water Level");
                        } else {
                            setReason("Pump automatically stopped: Optimal soil moisture reached.");
                        }
                    }

                    return {
                        ...prev,
                        soil_moisture: parseFloat(newMoisture.toFixed(1)),
                        tank_level: parseFloat(newTank.toFixed(1))
                    };
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [pumpStatus, step]);

    const startAnalysis = () => {
        setStep(1);
        setTimeout(() => {
            analyzeData();
            setStep(2);
        }, 2000);
    };

    const analyzeData = () => {
        // Initial Logic (Decision Rules) at the moment of scanning
        if (sensorData.soil_moisture < 50 && sensorData.tank_level > 20 && sensorData.rain_next_48h < 20) {
            setPumpStatus(true);
            setReason("Soil moisture is low and no heavy rain expected. Irrigation activated.");
        } else {
            setPumpStatus(false);
            setReason("Conditions are optimal or water is low. Pump remains off.");
        }

        if (sensorData.tank_level < 20) {
            Alert.alert("Warning", "Low Water Level");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Smart Irrigation</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                
                {step === 0 && (
                    <View style={styles.infoModeContainer}>
                        <View style={styles.infoCard}>
                            <Ionicons name="information-circle-outline" size={48} color="#0288d1" style={{ marginBottom: 10 }} />
                            <Text style={styles.infoTitle}>What does this do?</Text>
                            <Text style={styles.infoText}>
                                The Smart Irrigation system gathers live telemetry from your farm sensors, including soil moisture, pH levels, tank capacity, and weather forecasts.
                            </Text>
                            <Text style={styles.infoText}>
                                It automatically analyzes the data against optimal thresholds and intelligently controls your water pump to conserve water while keeping crops healthy.
                            </Text>
                        </View>
                        
                        <TouchableOpacity style={styles.analyzeBtn} onPress={startAnalysis}>
                            <Ionicons name="scan" size={20} color="#fff" />
                            <Text style={styles.analyzeBtnText}>Analyze the Farm</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 1 && (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color="#2e7d32" />
                        <Text style={styles.loadingTitle}>Gathering Sensor Data...</Text>
                        <Text style={styles.loadingText}>Analyzing soil traits and weather patterns.</Text>
                    </View>
                )}

                {step === 2 && (
                    <View>
                        <View style={styles.stepContainer}>
                            <Text style={[styles.stepText, styles.activeStep]}>Collecting Data</Text>
                            <Ionicons name="checkmark-circle" size={14} color="#2e7d32" />
                            <Text style={[styles.stepText, styles.activeStep]}>Analyzing</Text>
                            <Ionicons name="checkmark-circle" size={14} color="#2e7d32" />
                            <Text style={[styles.stepText, styles.activeStep]}>Decision</Text>
                        </View>

                        <Text style={styles.sectionTitle}>Live Sensor Readings</Text>
                        <View style={styles.sensorGrid}>
                            {Object.entries(sensorData).map(([key, value]) => (
                                <View key={key} style={styles.sensorCard}>
                                    <Text style={styles.sensorLabel}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                                    <Text style={styles.sensorValue}>{value}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.decisionCard}>
                            <View style={[styles.statusBadge, { backgroundColor: pumpStatus ? '#e8f5e9' : '#ffebee' }]}>
                                <Ionicons name={pumpStatus ? 'water' : 'water-outline'} size={32} color={pumpStatus ? '#2e7d32' : '#c62828'} />
                                <Text style={[styles.statusText, { color: pumpStatus ? '#2e7d32' : '#c62828' }]}>
                                    Pump {pumpStatus ? 'ON' : 'OFF'}
                                </Text>
                            </View>
                            <Text style={styles.reasonText}>{reason}</Text>
                        </View>

                        <Text style={styles.sectionTitle}>Manual Control</Text>
                        <View style={styles.controls}>
                            <TouchableOpacity style={[styles.btn, styles.btnOn]} onPress={() => { setPumpStatus(true); setReason("Pump manually overridden to ON."); }}>
                                <Text style={styles.btnText}>Start Irrigation</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, styles.btnOff]} onPress={() => { setPumpStatus(false); setReason("Pump manually overridden to OFF."); }}>
                                <Text style={styles.btnText}>Stop Irrigation</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#fff', borderBottomLeftRadius: 15, borderBottomRightRadius: 15, elevation: 3 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    content: { padding: 20 },
    
    infoModeContainer: { alignItems: 'center', marginTop: 20 },
    infoCard: { backgroundColor: '#e1f5fe', padding: 25, borderRadius: 15, alignItems: 'center', marginBottom: 30, width: '100%', elevation: 2 },
    infoTitle: { fontSize: 20, fontWeight: 'bold', color: '#01579b', marginBottom: 15 },
    infoText: { fontSize: 15, color: '#0277bd', textAlign: 'center', lineHeight: 22, marginBottom: 10 },
    
    analyzeBtn: { flexDirection: 'row', backgroundColor: '#2e7d32', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', gap: 10, elevation: 4 },
    analyzeBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    loadingBox: { padding: 40, alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, marginTop: 40, elevation: 2 },
    loadingTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 10 },
    loadingText: { color: '#666', textAlign: 'center' },

    stepContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 25, gap: 6, flexWrap: 'wrap' },
    stepText: { fontSize: 13, color: '#999', fontWeight: 'bold' },
    activeStep: { color: '#2e7d32' },
    
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#444', marginBottom: 12, marginTop: 5 },
    sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    sensorCard: { flex: 1, minWidth: '30%', backgroundColor: '#fff', padding: 15, borderRadius: 12, elevation: 2, alignItems: 'center' },
    sensorLabel: { fontSize: 9, color: '#888', marginBottom: 5, textAlign: 'center', fontWeight: '600' },
    sensorValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    
    decisionCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 2, marginBottom: 20 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 10, marginBottom: 12 },
    statusText: { fontSize: 22, fontWeight: 'bold' },
    reasonText: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22 },
    
    controls: { flexDirection: 'row', gap: 15 },
    btn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', elevation: 2 },
    btnOn: { backgroundColor: '#2e7d32' },
    btnOff: { backgroundColor: '#c62828' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default IrrigationScreen;
