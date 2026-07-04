import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OfflineIndicator = () => {
    // In a real app, this would use NetInfo
    const isOffline = false; // Mock status

    if (!isOffline) return null;

    return (
        <View style={styles.container}>
            <Ionicons name="cloud-offline" size={16} color="#fff" />
            <Text style={styles.text}>You are offline. Features still work.</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#333',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
        position: 'absolute',
        bottom: 50, // Above bottom tab
        left: 0,
        right: 0,
        zIndex: 100,
    },
    text: {
        color: '#fff',
        marginLeft: 10,
        fontSize: 12,
    }
});

export default OfflineIndicator;
