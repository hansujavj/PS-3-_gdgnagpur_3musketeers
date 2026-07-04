/**
 * SettingsScreen.jsx
 * 
 * Purpose: User preferences, profile management, and app settings
 * Features:
 * - Editable farmer profile
 * - Language selection (EN/HI/MR)
 * - Data export/import
 * - Help & Support section
 * - App information
 * - Logout functionality
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, Linking, Share, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES } from '../utils/constants';
import { RegionDetectionEngine } from '../engines/regionDetectionEngine';
import { useAuth } from '../utils/AuthContext';

const SettingsScreen = () => {
    const { onLogout } = useAuth();
    const { t, i18n } = useTranslation();
    const [user, setUser] = useState({ name: 'Guest Farmer', phone: '', village: '' });
    const [modalVisible, setModalVisible] = useState(false);
    const [tempName, setTempName] = useState('');
    const [tempPhone, setTempPhone] = useState('');
    const [tempVillage, setTempVillage] = useState('');
    const [currentLocation, setCurrentLocation] = useState(null);
    const [locationSource, setLocationSource] = useState('default');
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [locationModalVisible, setLocationModalVisible] = useState(false);
    const [manualState, setManualState] = useState('');
    const [manualDistrict, setManualDistrict] = useState('');

    useEffect(() => {
        loadProfile();
        loadCurrentLocation();
    }, []);

    /**
     * Load user profile from AsyncStorage
     */
    const loadProfile = async () => {
        try {
            const stored = await AsyncStorage.getItem('user-profile');
            if (stored) {
                setUser(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load profile:', e);
        }
    };

    /**
     * Save updated profile to AsyncStorage
     */
    const saveProfile = async () => {
        const newProfile = {
            name: tempName || user.name,
            phone: tempPhone || user.phone,
            village: tempVillage || user.village
        };
        await AsyncStorage.setItem('user-profile', JSON.stringify(newProfile));
        setUser(newProfile);
        setModalVisible(false);
        Alert.alert('Success', 'Profile updated successfully!');
    };

    /**
     * Change app language and persist preference
     */
    const changeLanguage = async (lang) => {
        await i18n.changeLanguage(lang);
        await AsyncStorage.setItem('user-language', lang);
        Alert.alert('Success', 'Language changed successfully!');
    };

    /**
     * Load current location
     */
    const loadCurrentLocation = async () => {
        try {
            const region = await RegionDetectionEngine.detectRegion();
            setCurrentLocation(region);
            const source = await RegionDetectionEngine.getLocationSource();
            setLocationSource(source);
        } catch (e) {
            console.error('Failed to load location:', e);
        }
    };

    /**
     * Auto-detect location using GPS
     */
    const autoDetectLocation = async () => {
        setLoadingLocation(true);
        try {
            // Clear manual location first
            await RegionDetectionEngine.clearManualLocation();

            // Detect using GPS
            const region = await RegionDetectionEngine.detectRegion();
            setCurrentLocation(region);

            const source = await RegionDetectionEngine.getLocationSource();
            setLocationSource(source);

            Alert.alert('Success', `Location detected: ${region.district}, ${region.state}`);
        } catch (e) {
            console.error('GPS detection failed:', e);
            Alert.alert('Error', 'Failed to detect location. Please check GPS permissions.');
        } finally {
            setLoadingLocation(false);
        }
    };

    /**
     * Set manual location
     */
    const setManualLocation = () => {
        setManualState(currentLocation?.state || '');
        setManualDistrict(currentLocation?.district || '');
        setLocationModalVisible(true);
    };

    /**
     * Save manual location
     */
    const saveManualLocation = async () => {
        if (!manualState.trim() || !manualDistrict.trim()) {
            Alert.alert('Invalid', 'Please enter both state and district');
            return;
        }

        const success = await RegionDetectionEngine.setManualLocation(manualState.trim(), manualDistrict.trim());

        if (success) {
            await loadCurrentLocation();
            setLocationModalVisible(false);
            Alert.alert('Success', `Location set to: ${manualDistrict}, ${manualState}`);
        } else {
            Alert.alert('Error', 'Failed to save location');
        }
    };


    /**
     * Open external link (helpline, website, etc.)
     */
    const openLink = (url) => {
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Could not open link');
        });
    };

    /**
     * Render a setting item with icon, title, value, and action
     */
    const renderSettingItem = (icon, title, value, onPress, description = '', isAction = false) => (
        <TouchableOpacity style={styles.item} onPress={onPress}>
            <View style={styles.itemLeft}>
                <View style={[styles.iconBox, isAction && styles.actionIcon]}>
                    <Ionicons name={icon} size={22} color={isAction ? "#d32f2f" : "#2e7d32"} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, isAction && { color: '#d32f2f' }]}>{title}</Text>
                    {description ? <Text style={styles.itemDesc}>{description}</Text> : null}
                </View>
            </View>
            <View style={styles.itemRight}>
                <Text style={styles.itemValue}>{value}</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('settings.title')}</Text>
            </View>

            {/* Profile Card */}
            <View style={styles.profileCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                </View>
                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{user.name}</Text>
                    <Text style={styles.profileSub}>{user.phone || 'No phone linked'}</Text>
                    {user.village && <Text style={styles.profileVillage}>📍 {user.village}</Text>}
                </View>
                <TouchableOpacity style={styles.editBtn} onPress={() => {
                    setTempName(user.name);
                    setTempPhone(user.phone);
                    setTempVillage(user.village || '');
                    setModalVisible(true);
                }}>
                    <Ionicons name="pencil" size={20} color="#2e7d32" />
                </TouchableOpacity>
            </View>

            {/* General Settings */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>⚙️ General</Text>
                {renderSettingItem('language-outline', t('settings.language'), i18n.language.toUpperCase(), () => {
                    Alert.alert('Select Language', 'Choose your preferred language', [
                        { text: 'English', onPress: () => changeLanguage(LANGUAGES.EN) },
                        { text: 'हिंदी', onPress: () => changeLanguage(LANGUAGES.HI) },
                        { text: 'मराठी', onPress: () => changeLanguage(LANGUAGES.MR) },
                        { text: 'Cancel', style: 'cancel' }
                    ]);
                }, 'App display language')}
                {renderSettingItem('notifications-outline', 'Notifications', 'Enabled', () => {
                    Alert.alert('Notifications', 'Notification settings will be available in future updates.');
                }, 'Weather alerts, pest warnings')}
            </View>

            {/* Location Settings */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>📍 Location</Text>
                <View style={styles.locationCard}>
                    <View style={styles.locationInfo}>
                        <Text style={styles.locationLabel}>Current Location</Text>
                        <Text style={styles.locationText}>
                            {currentLocation ? `${currentLocation.district}, ${currentLocation.state}` : 'Loading...'}
                        </Text>
                        <Text style={styles.locationSource}>
                            Source: {locationSource === 'gps' ? '🛰️ GPS' : locationSource === 'manual' ? '✏️ Manual' : locationSource === 'cached' ? '💾 Cached' : '📍 Default'}
                        </Text>
                    </View>
                    <View style={styles.locationActions}>
                        <TouchableOpacity
                            style={styles.locationBtn}
                            onPress={autoDetectLocation}
                            disabled={loadingLocation}
                        >
                            {loadingLocation ? (
                                <ActivityIndicator size="small" color="#2e7d32" />
                            ) : (
                                <Ionicons name="navigate" size={20} color="#2e7d32" />
                            )}
                            <Text style={styles.locationBtnText}>Auto-Detect</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.locationBtn} onPress={setManualLocation}>
                            <Ionicons name="pencil" size={20} color="#2e7d32" />
                            <Text style={styles.locationBtnText}>Set Manual</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>


            {/* Help & Support */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>🆘 Help & Support</Text>
                {renderSettingItem('book-outline', 'User Guide', '', () => {
                    Alert.alert(
                        'AgriChainn User Guide',
                        '1. Home: View weather, notifications, quick actions\n\n' +
                        '2. Crop: Add crops, track timeline, harvest\n\n' +
                        '3. Plant Clinic: Diagnose diseases, get treatments\n\n' +
                        '4. Soil: Check soil info and tips\n\n' +
                        '5. AI Assistant: Ask farming questions\n\n' +
                        '6. Settings: Manage profile and preferences'
                    );
                }, 'How to use AgriChainn')}
                {renderSettingItem('call-outline', 'Kisan Call Center', '1800-180-1551', () => {
                    Alert.alert(
                        'Kisan Call Center',
                        'Toll-free helpline for farmers\n\n📞 1800-180-1551\n\nAvailable 24/7 in multiple languages',
                        [
                            { text: 'Close', style: 'cancel' },
                            { text: 'Call Now', onPress: () => openLink('tel:18001801551') }
                        ]
                    );
                }, '24/7 toll-free helpline')}
                {renderSettingItem('information-circle-outline', 'FAQ', '', () => {
                    Alert.alert(
                        'Frequently Asked Questions',
                        'Q: Does AgriChainn need internet?\n' +
                        'A: No! Works 100% offline.\n\n' +
                        'Q: How to add a crop?\n' +
                        'A: Go to Crop tab → Tap + button\n\n' +
                        'Q: How to diagnose disease?\n' +
                        'A: Tap "Plant Clinic" → Select crop → Choose symptoms\n\n' +
                        'Q: Can I change language?\n' +
                        'A: Yes! Settings → Language'
                    );
                }, 'Common questions answered')}
            </View>

            {/* Government Resources */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>🏛️ Government Resources</Text>
                {renderSettingItem('globe-outline', 'PM-KISAN Portal', '', () => {
                    openLink('https://pmkisan.gov.in');
                }, 'Check scheme benefits')}
                {renderSettingItem('newspaper-outline', 'Agri News', '', () => {
                    Alert.alert('Coming Soon', 'Latest agriculture news will be available in next update.');
                }, 'Latest farming updates')}
            </View>

            {/* About */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>ℹ️ About</Text>
                {renderSettingItem('information-outline', 'App Version', 'v1.0.0', () => {
                    Alert.alert('AgriChainn v1.0.0', 'Production-ready farming assistant\n\nDeveloped for farmers by farmers.');
                })}
                {renderSettingItem('shield-checkmark-outline', 'Privacy Policy', '', () => {
                    Alert.alert(
                        'Privacy Policy',
                        'AgriChainn stores all data locally on your device. We do not collect or share your personal information.\n\n' +
                        'Your data is yours and stays on your device.'
                    );
                })}
            </View>

            {/* Account Actions */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>👤 Account</Text>
                {renderSettingItem('log-out-outline', 'Log Out', '', async () => {
                    Alert.alert('Log Out', 'This will clear all your data and return to login screen. Are you sure?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Log Out', style: 'destructive', onPress: async () => {
                                if (onLogout) await onLogout();
                            }
                        }
                    ]);
                }, 'Clear data and exit', true)}
            </View>

            <View style={{ height: 30 }} />

            {/* Edit Profile Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>

                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            value={tempName}
                            onChangeText={setTempName}
                            placeholder="Your name"
                        />

                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            value={tempPhone}
                            onChangeText={setTempPhone}
                            placeholder="10-digit number"
                            keyboardType="phone-pad"
                            maxLength={10}
                        />

                        <Text style={styles.label}>Village / District</Text>
                        <TextInput
                            style={styles.input}
                            value={tempVillage}
                            onChangeText={setTempVillage}
                            placeholder="Your location"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
                                <Text style={styles.saveText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Location Modal */}
            <Modal
                visible={locationModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setLocationModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Set Manual Location</Text>
                        <Text style={styles.modalSubtitle}>Enter your state and district</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="State (e.g., Maharashtra)"
                            value={manualState}
                            onChangeText={setManualState}
                            autoCapitalize="words"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="District (e.g., Nashik)"
                            value={manualDistrict}
                            onChangeText={setManualDistrict}
                            autoCapitalize="words"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setLocationModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={saveManualLocation}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
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
        backgroundColor: '#2e7d32',
        padding: 20,
        paddingTop: 50,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        margin: 15,
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        elevation: 2,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#2e7d32',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileInfo: {
        flex: 1,
        marginLeft: 15,
    },
    profileName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    profileSub: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    profileVillage: {
        fontSize: 13,
        color: '#2e7d32',
        marginTop: 4,
    },
    editBtn: {
        padding: 10,
    },
    section: {
        backgroundColor: '#fff',
        marginHorizontal: 15,
        marginBottom: 15,
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 1,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        padding: 15,
        paddingBottom: 10,
        backgroundColor: '#f9f9f9',
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    actionIcon: {
        backgroundColor: '#ffebee',
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    itemDesc: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemValue: {
        fontSize: 14,
        color: '#666',
        marginRight: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 25,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: 25,
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    saveBtn: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        backgroundColor: '#2e7d32',
        alignItems: 'center',
    },
    saveText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#d32f2f',
    },
    locationCard: {
        backgroundColor: '#f5f5f5',
        margin: 15,
        padding: 15,
        borderRadius: 12,
    },
    locationInfo: {
        marginBottom: 15,
    },
    locationLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
    },
    locationText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    locationSource: {
        fontSize: 13,
        color: '#2e7d32',
    },
    locationActions: {
        flexDirection: 'row',
        gap: 10,
    },
    locationBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#2e7d32',
        gap: 8,
    },
    locationBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2e7d32',
    },
});

export default SettingsScreen;
