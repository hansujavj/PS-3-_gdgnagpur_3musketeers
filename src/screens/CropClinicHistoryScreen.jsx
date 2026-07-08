import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDiagnosisHistory, getOrderHistory } from '../db/cropClinicSupabase';

const CropClinicHistoryScreen = () => {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState('scans'); // 'scans' or 'orders'
    const [scans, setScans] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const profile = await AsyncStorage.getItem('user-profile');
            const userId = profile ? JSON.parse(profile).phone || 'anonymous' : 'anonymous';

            const fetchedScans = await getDiagnosisHistory(userId, 20);
            const fetchedOrders = await getOrderHistory(userId);

            setScans(fetchedScans || []);
            setOrders(fetchedOrders || []);
        } catch (err) {
            console.warn(err);
        } finally {
            setLoading(false);
        }
    };

    const renderScanItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.scanHeader}>
                <Ionicons name={item.is_healthy ? 'checkmark-circle' : 'bug'} size={24} color={item.is_healthy ? '#2e7d32' : '#d32f2f'} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.cardTitle}>{item.disease_name}</Text>
                    <Text style={styles.cardSub}>Detected on: {new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: item.severity === 'Severe' ? '#ffebee' : '#e8f5e9' }]}>
                    <Text style={[styles.badgeText, { color: item.severity === 'Severe' ? '#c62828' : '#2e7d32' }]}>{item.severity}</Text>
                </View>
            </View>

            {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.scanImage} />
            ) : (
                <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={32} color="#ccc" />
                </View>
            )}

            {!item.is_healthy && item.pesticide && (
                <View style={styles.treatmentBox}>
                    <Text style={styles.treatmentLabel}>Recommended Treatment:</Text>
                    <Text style={styles.treatmentText}>{item.pesticide}</Text>
                </View>
            )}
        </View>
    );

    const renderOrderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.orderHeader}>
                <Ionicons name="cart" size={24} color="#1565c0" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.cardTitle}>{item.product_name}</Text>
                    <Text style={styles.cardSub}>Ordered on: {new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.orderPrice}>₹{item.price}</Text>
            </View>

            <View style={styles.orderDetailRow}>
                <Text style={styles.orderDetailLabel}>Target Crop:</Text>
                <Text style={styles.orderDetailValue}>{item.crop_name}</Text>
            </View>
            <View style={styles.orderDetailRow}>
                <Text style={styles.orderDetailLabel}>Disease Focus:</Text>
                <Text style={styles.orderDetailValue}>{item.disease_name}</Text>
            </View>
            <View style={styles.orderDetailRow}>
                <Text style={styles.orderDetailLabel}>Status:</Text>
                <Text style={[styles.orderDetailValue, { color: '#f57c00' }]}>{item.status}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Clinic History</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'scans' && styles.activeTab]}
                    onPress={() => setActiveTab('scans')}
                >
                    <Ionicons name="scan" size={20} color={activeTab === 'scans' ? '#2e7d32' : '#888'} />
                    <Text style={[styles.tabText, activeTab === 'scans' && styles.activeTabText]}>Scans</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
                    onPress={() => setActiveTab('orders')}
                >
                    <Ionicons name="cube-outline" size={20} color={activeTab === 'orders' ? '#2e7d32' : '#888'} />
                    <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>Orders</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#2e7d32" />
                    <Text style={{ marginTop: 10, color: '#666' }}>Fetching records...</Text>
                </View>
            ) : activeTab === 'scans' ? (
                <FlatList
                    data={scans}
                    keyExtractor={(item) => item.id}
                    renderItem={renderScanItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.emptyText}>No scanned crops found.</Text>}
                />
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item) => item.id}
                    renderItem={renderOrderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.emptyText}>No treatment orders placed yet.</Text>}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#fff', elevation: 3 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    
    tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    tab: { flex: 1, flexDirection: 'row', paddingVertical: 15, justifyContent: 'center', alignItems: 'center', gap: 8 },
    activeTab: { borderBottomWidth: 3, borderBottomColor: '#2e7d32' },
    tabText: { fontSize: 16, color: '#888', fontWeight: 'bold' },
    activeTabText: { color: '#2e7d32' },

    listContent: { padding: 20, paddingBottom: 50 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
    scanHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    orderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderColor: '#f0f0f0' },
    
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    cardSub: { fontSize: 13, color: '#888', marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: 'bold' },
    orderPrice: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },

    scanImage: { width: '100%', height: 180, borderRadius: 10, marginBottom: 15 },
    imagePlaceholder: { width: '100%', height: 100, borderRadius: 10, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    
    treatmentBox: { backgroundColor: '#e8f5e9', padding: 12, borderRadius: 8 },
    treatmentLabel: { fontSize: 12, color: '#555', fontWeight: 'bold', marginBottom: 4 },
    treatmentText: { fontSize: 15, color: '#2e7d32', fontWeight: '600' },

    orderDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    orderDetailLabel: { fontSize: 14, color: '#666' },
    orderDetailValue: { fontSize: 14, fontWeight: '600', color: '#333' },

    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#888', fontStyle: 'italic' }
});

export default CropClinicHistoryScreen;
