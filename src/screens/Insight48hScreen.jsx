import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Insight48hEngine } from '../engines/insight48hEngine';
import { Ionicons } from '@expo/vector-icons';

const Insight48hScreen = () => {
    const { t } = useTranslation();
    const [insights, setInsights] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    // Mock crops for demo if none exist
    const DEMO_CROPS = [
        { name: 'wheat', sowingDate: '2023-10-15', stage: 'Vegetative' },
        { name: 'rice', sowingDate: '2023-08-01', stage: 'Flowering' }
    ];

    useEffect(() => {
        loadInsights();
    }, []);

    const loadInsights = async () => {
        setRefreshing(true);
        // In production, fetch actual user crops from DB
        const data = await Insight48hEngine.generateInsights(DEMO_CROPS);
        setInsights(data);
        setRefreshing(false);
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'high': return '#d32f2f';
            case 'medium': return '#f57c00';
            default: return '#388e3c';
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'irrigation': return 'water';
            case 'pest': return 'bug';
            case 'fertilizer': return 'flask';
            case 'weather': return 'sunny';
            default: return 'notifications';
        }
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadInsights} />}
        >
            <View style={styles.header}>
                <Text style={styles.title}>{t('nav.insights')}</Text>
                <Text style={styles.subtitle}>Advice for next 48 hours</Text>
            </View>

            <View style={styles.timeline}>
                {insights.length === 0 ? (
                    <Text style={styles.empty}>No alerts for now. Everything looks good!</Text>
                ) : (
                    insights.map((item, index) => (
                        <View key={index} style={styles.card}>
                            <View style={[styles.priorityStrip, { backgroundColor: getSeverityColor(item.severity) }]} />
                            <View style={styles.cardContent}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.typeTag}>
                                        <Ionicons name={getIcon(item.type)} size={16} color="#555" />
                                        <Text style={styles.typeText}>{item.cropName} • {item.type}</Text>
                                    </View>
                                    <Text style={styles.time}>Today</Text>
                                </View>
                                <Text style={styles.message}>{item.message}</Text>
                            </View>
                        </View>
                    ))
                )}
            </View>
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
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        color: '#666',
        marginTop: 5,
    },
    timeline: {
        padding: 15,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 15,
        flexDirection: 'row',
        overflow: 'hidden',
        elevation: 2,
    },
    priorityStrip: {
        width: 6,
        height: '100%',
    },
    cardContent: {
        flex: 1,
        padding: 15,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    typeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    typeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#555',
        marginLeft: 5,
        textTransform: 'capitalize',
    },
    time: {
        fontSize: 12,
        color: '#999',
    },
    message: {
        fontSize: 16,
        color: '#333',
        lineHeight: 22,
    },
    empty: {
        textAlign: 'center',
        marginTop: 50,
        color: '#999',
    }
});

export default Insight48hScreen;
