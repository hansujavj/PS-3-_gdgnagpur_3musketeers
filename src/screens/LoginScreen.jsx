/**
 * LoginScreen.jsx
 * 
 * Purpose: User authentication - Sign In and Sign Up
 * Features:
 * - Tab-based UI (Sign In / Sign Up)
 * - Sign Up: New user registration with full details
 * - Sign In: Existing user login with phone validation
 * - Phone number validation
 * - Language selection
 * - Data persistence in AsyncStorage
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../utils/constants';

const LoginScreen = ({ onLoginSuccess }) => {
    const { t, i18n } = useTranslation();

    // Tab state: 'signup' or 'signin'
    const [activeTab, setActiveTab] = useState('signup');
    const [loading, setLoading] = useState(false);

    // Sign Up fields
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [village, setVillage] = useState('');
    const [selectedLang, setSelectedLang] = useState(LANGUAGES.EN);

    // Sign In fields
    const [signInPhone, setSignInPhone] = useState('');

    /**
     * Validate phone number format (10 digits)
     */
    const validatePhone = (phoneNum) => {
        return /^\d{10}$/.test(phoneNum);
    };

    /**
     * Handle Sign Up - Create new user profile
     */
    const handleSignUp = async () => {
        // Validation
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter your name');
            return;
        }
        if (!validatePhone(phone)) {
            Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);
        try {
            // Check if phone already exists
            const existing = await AsyncStorage.getItem('user-profile');
            if (existing) {
                const existingProfile = JSON.parse(existing);
                if (existingProfile.phone === phone.trim()) {
                    Alert.alert('Account Exists', 'This phone number is already registered. Please sign in instead.');
                    setLoading(false);
                    setActiveTab('signin');
                    return;
                }
            }

            const profile = {
                name: name.trim(),
                phone: phone.trim(),
                village: village.trim() || 'Not specified',
                language: selectedLang,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };

            // Save profile
            await AsyncStorage.setItem('user-profile', JSON.stringify(profile));

            // Set language
            await i18n.changeLanguage(selectedLang);
            await AsyncStorage.setItem('user-language', selectedLang);

            // Success
            setLoading(false);
            if (onLoginSuccess) {
                onLoginSuccess();
            }
        } catch (e) {
            console.error('Sign up error:', e);
            setLoading(false);
            Alert.alert('Error', 'Failed to create account. Please try again.');
        }
    };

    /**
     * Handle Sign In - Validate existing user
     */
    const handleSignIn = async () => {
        if (!validatePhone(signInPhone)) {
            Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);
        try {
            // Check if profile exists
            const stored = await AsyncStorage.getItem('user-profile');

            if (!stored) {
                setLoading(false);
                Alert.alert(
                    'Account Not Found',
                    'No account found with this phone number. Please sign up first.',
                    [
                        { text: 'OK' },
                        { text: 'Sign Up', onPress: () => setActiveTab('signup') }
                    ]
                );
                return;
            }

            const profile = JSON.parse(stored);

            // Validate phone number
            if (profile.phone === signInPhone.trim()) {
                // Update last login
                profile.lastLogin = new Date().toISOString();
                await AsyncStorage.setItem('user-profile', JSON.stringify(profile));

                // Load user's language preference
                const lang = await AsyncStorage.getItem('user-language');
                if (lang) {
                    await i18n.changeLanguage(lang);
                }

                // Success
                setLoading(false);
                if (onLoginSuccess) {
                    onLoginSuccess();
                }
            } else {
                setLoading(false);
                Alert.alert('Invalid', 'Phone number does not match our records.');
            }
        } catch (e) {
            console.error('Sign in error:', e);
            setLoading(false);
            Alert.alert('Error', 'Failed to sign in. Please try again.');
        }
    };

    /**
     * Render language selection option
     */
    const renderLanguageOption = (lang, label, flag) => (
        <TouchableOpacity
            key={lang}
            style={[styles.langOption, selectedLang === lang && styles.langSelected]}
            onPress={() => setSelectedLang(lang)}
        >
            <Text style={styles.flag}>{flag}</Text>
            <Text style={[styles.langText, selectedLang === lang && styles.langTextSelected]}>
                {label}
            </Text>
            {selectedLang === lang && <Ionicons name="checkmark-circle" size={20} color="#2e7d32" />}
        </TouchableOpacity>
    );

    /**
     * Render Sign Up form
     */
    const renderSignUpForm = () => (
        <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Create Account 🌱</Text>
            <Text style={styles.subtitle}>Join AgriChain to start your farming journey</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Name *</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter your full name"
                        placeholderTextColor="#999"
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="10-digit mobile number"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        maxLength={10}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Village / District</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        value={village}
                        onChangeText={setVillage}
                        placeholder="Your location (optional)"
                        placeholderTextColor="#999"
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Preferred Language</Text>
                <View style={styles.langContainer}>
                    {renderLanguageOption(LANGUAGES.EN, 'English', '🇬🇧')}
                    {renderLanguageOption(LANGUAGES.HI, 'हिंदी', '🇮🇳')}
                    {renderLanguageOption(LANGUAGES.MR, 'मराठी', '🇮🇳')}
                </View>
            </View>

            <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSignUp}
                disabled={loading}
            >
                <Text style={styles.submitButtonText}>{loading ? 'Creating Account...' : 'Create Account'}</Text>
                {!loading && <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 10 }} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setActiveTab('signin')} style={styles.switchTab}>
                <Text style={styles.switchText}>Already have an account? <Text style={styles.switchLink}>Sign In</Text></Text>
            </TouchableOpacity>
        </View>
    );

    /**
     * Render Sign In form
     */
    const renderSignInForm = () => (
        <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome Back! 👋</Text>
            <Text style={styles.subtitle}>Sign in to continue farming with AgriChain</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        value={signInPhone}
                        onChangeText={setSignInPhone}
                        placeholder="Enter your registered number"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        maxLength={10}
                    />
                </View>
            </View>

            <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSignIn}
                disabled={loading}
            >
                <Text style={styles.submitButtonText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
                {!loading && <Ionicons name="log-in-outline" size={20} color="#fff" style={{ marginLeft: 10 }} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setActiveTab('signup')} style={styles.switchTab}>
                <Text style={styles.switchText}>Don't have an account? <Text style={styles.switchLink}>Sign Up</Text></Text>
            </TouchableOpacity>

            <View style={styles.helpBox}>
                <Ionicons name="information-circle-outline" size={20} color="#2e7d32" />
                <Text style={styles.helpText}>
                    Use the phone number you registered with. If you forgot, create a new account.
                </Text>
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <Ionicons name="leaf" size={48} color="#fff" />
                </View>
                <Text style={styles.appName}>AgriChain</Text>
                <Text style={styles.tagline}>Empowering Farmers with Smart Agriculture</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
                    onPress={() => setActiveTab('signup')}
                >
                    <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>
                        Sign Up
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'signin' && styles.activeTab]}
                    onPress={() => setActiveTab('signin')}
                >
                    <Text style={[styles.tabText, activeTab === 'signin' && styles.activeTabText]}>
                        Sign In
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Form Content */}
            {activeTab === 'signup' ? renderSignUpForm() : renderSignInForm()}

            <Text style={styles.disclaimer}>
                By continuing, you agree to use AgriChain for agricultural purposes.
                Your data is stored locally on your device.
            </Text>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        flexGrow: 1,
    },
    header: {
        backgroundColor: '#2e7d32',
        paddingTop: 60,
        paddingBottom: 40,
        alignItems: 'center',
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    appName: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginTop: -20,
        marginHorizontal: 20,
        borderRadius: 15,
        padding: 5,
        elevation: 3,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#2e7d32',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    activeTabText: {
        color: '#fff',
    },
    formContainer: {
        padding: 25,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
        marginTop: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        paddingHorizontal: 15,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 15,
        fontSize: 16,
        color: '#333',
    },
    langContainer: {
        gap: 10,
    },
    langOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    langSelected: {
        backgroundColor: '#e8f5e9',
        borderColor: '#2e7d32',
    },
    flag: {
        fontSize: 24,
        marginRight: 12,
    },
    langText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    langTextSelected: {
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    submitButton: {
        backgroundColor: '#2e7d32',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 12,
        marginTop: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    submitButtonDisabled: {
        backgroundColor: '#a5d6a7',
        opacity: 0.7,
    },
    switchTab: {
        marginTop: 20,
        alignItems: 'center',
    },
    switchText: {
        fontSize: 14,
        color: '#666',
    },
    switchLink: {
        color: '#2e7d32',
        fontWeight: 'bold',
    },
    helpBox: {
        flexDirection: 'row',
        backgroundColor: '#e8f5e9',
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
        alignItems: 'flex-start',
    },
    helpText: {
        flex: 1,
        fontSize: 13,
        color: '#2e7d32',
        marginLeft: 10,
        lineHeight: 18,
    },
    disclaimer: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 30,
        paddingHorizontal: 25,
        lineHeight: 18,
    }
});

export default LoginScreen;
