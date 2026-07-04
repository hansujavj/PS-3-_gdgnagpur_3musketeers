/**
 * EducatorScreen.jsx
 *
 * Help / Educator module with 3 tabs:
 *   1. Crop Disease Info
 *   2. Government Schemes
 *   3. Compensation for Crop Disease
 *
 * Features:
 *   - Debounced search bar across all tabs
 *   - State-based filtering for schemes
 *   - Disease-subsidy matching from diagnosis history
 *   - Loading, empty, error states
 *   - Expandable cards for detail
 *
 * NO AI — fully rule-based from Supabase data.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, ScrollView,
    RefreshControl, Linking, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    fetchDiseases,
    fetchSchemesByState,
    fetchCompensation,
    searchAll,
} from '../db/educatorSupabase';

// ─── Tab Definitions ──────────────────────────────────────────────────────────
const TABS = [
    { key: 'diseases', label: 'Diseases', icon: 'bug-outline' },
    { key: 'schemes', label: 'Schemes', icon: 'document-text-outline' },
    { key: 'compensation', label: 'Compensation', icon: 'cash-outline' },
];

// ─── State extraction helper ──────────────────────────────────────────────────
const extractState = (address) => {
    if (!address) return null;
    const indianStates = [
        'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
        'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
        'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
        'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
        'Tamil Nadu', 'Telangana', 'Tripura', 'Uttarakhand', 'Uttar Pradesh',
        'West Bengal', 'Delhi',
    ];
    const addrLower = address.toLowerCase();
    return indianStates.find(s => addrLower.includes(s.toLowerCase())) || null;
};

const EducatorScreen = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState('diseases');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Data
    const [diseases, setDiseases] = useState([]);
    const [schemes, setSchemes] = useState([]);
    const [compensation, setCompensation] = useState([]);

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const searchTimer = useRef(null);

    // State filter
    const [userState, setUserState] = useState(null);

    // Expanded card tracking
    const [expandedId, setExpandedId] = useState(null);

    // ── Load user state from farm-details ─────────────────────────────────────
    useEffect(() => {
        const loadUserState = async () => {
            try {
                const farmStr = await AsyncStorage.getItem('farm-details');
                if (farmStr) {
                    const farm = JSON.parse(farmStr);
                    const state = extractState(farm.formatted_address);
                    setUserState(state);
                }
            } catch (e) {
                console.warn('Could not load user state', e);
            }
        };
        loadUserState();
    }, []);

    // ── Initial data load ─────────────────────────────────────────────────────
    useEffect(() => {
        loadAllData();
    }, [userState]);

    const loadAllData = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            const [diseasesData, schemesData, compensationData] = await Promise.all([
                fetchDiseases(),
                fetchSchemesByState(userState),
                fetchCompensation(),
            ]);
            setDiseases(diseasesData);
            setSchemes(schemesData);
            setCompensation(compensationData);
        } catch (err) {
            console.error('Educator loadAllData error:', err);
            setError('Failed to load data. Please check your connection and try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userState]);

    // ── Debounced search ──────────────────────────────────────────────────────
    const handleSearch = (text) => {
        setSearchQuery(text);
        if (searchTimer.current) clearTimeout(searchTimer.current);

        if (!text.trim()) {
            loadAllData();
            return;
        }

        searchTimer.current = setTimeout(async () => {
            setLoading(true);
            try {
                const results = await searchAll(text.trim());
                setDiseases(results.diseases);
                setSchemes(results.schemes);
                setCompensation(results.compensation);
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setLoading(false);
            }
        }, 400); // 400ms debounce
    };

    const onRefresh = () => {
        setRefreshing(true);
        setSearchQuery('');
        loadAllData();
    };

    const toggleExpand = (id) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER ITEMS
    // ═══════════════════════════════════════════════════════════════════════════

    // ── Disease Card ──────────────────────────────────────────────────────────
    const renderDiseaseItem = ({ item }) => {
        const isExpanded = expandedId === item.id;
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIconBox, { backgroundColor: '#ffebee' }]}>
                        <Ionicons name="bug" size={22} color="#c62828" />
                    </View>
                    <View style={styles.cardHeaderText}>
                        <Text style={styles.cardTitle}>{item.disease_name}</Text>
                        <View style={styles.chipRow}>
                            <View style={styles.chip}>
                                <Ionicons name="leaf" size={12} color="#2e7d32" />
                                <Text style={styles.chipText}>{item.crop_name}</Text>
                            </View>
                        </View>
                    </View>
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color="#888"
                    />
                </View>

                {isExpanded && (
                    <View style={styles.expandedContent}>
                        <DetailSection icon="alert-circle" color="#c62828" title="Symptoms" text={item.symptoms} />
                        <DetailSection icon="help-circle" color="#f57c00" title="Causes" text={item.causes} />
                        <DetailSection icon="medkit" color="#2e7d32" title="Treatment" text={item.treatment} />
                        {item.pesticide && (
                            <DetailSection icon="flask" color="#6a1b9a" title="Recommended Pesticide" text={item.pesticide} />
                        )}
                        <DetailSection icon="shield-checkmark" color="#1565c0" title="Prevention" text={item.prevention} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // ── Scheme Card ───────────────────────────────────────────────────────────
    const renderSchemeItem = ({ item }) => {
        const isExpanded = expandedId === item.id;
        const relatedColor = item.related_to === 'crop_disease' ? '#c62828'
            : item.related_to === 'insurance' ? '#1565c0'
                : item.related_to === 'equipment' ? '#6a1b9a' : '#2e7d32';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIconBox, { backgroundColor: '#e3f2fd' }]}>
                        <Ionicons name="document-text" size={22} color="#1565c0" />
                    </View>
                    <View style={styles.cardHeaderText}>
                        <Text style={styles.cardTitle} numberOfLines={2}>{item.scheme_name}</Text>
                        <View style={styles.chipRow}>
                            <View style={[styles.chip, { backgroundColor: relatedColor + '15' }]}>
                                <Text style={[styles.chipText, { color: relatedColor }]}>
                                    {item.related_to === 'crop_disease' ? '🦠 Disease'
                                        : item.related_to === 'insurance' ? '🛡️ Insurance'
                                            : item.related_to === 'equipment' ? '🔧 Equipment' : '🌾 General'}
                                </Text>
                            </View>
                            {item.state_applicable?.length > 0 && (
                                <View style={styles.chip}>
                                    <Ionicons name="location" size={12} color="#555" />
                                    <Text style={styles.chipText}>
                                        {item.state_applicable.includes('All India') ? 'All India' : item.state_applicable.join(', ')}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={22} color="#888" />
                </View>

                {isExpanded && (
                    <View style={styles.expandedContent}>
                        <DetailSection icon="information-circle" color="#1565c0" title="About" text={item.description} />
                        <DetailSection icon="checkmark-circle" color="#2e7d32" title="Eligibility" text={item.eligibility} />
                        <DetailSection icon="gift" color="#f57c00" title="Benefits" text={item.benefits} />
                        <DetailSection icon="document-attach" color="#6a1b9a" title="Documents Required" text={item.documents_required} />
                        {item.official_link && (
                            <TouchableOpacity
                                style={styles.linkBtn}
                                onPress={() => Linking.openURL(item.official_link)}
                            >
                                <Ionicons name="open-outline" size={16} color="#1565c0" />
                                <Text style={styles.linkBtnText}>Visit Official Website</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // ── Compensation Card ─────────────────────────────────────────────────────
    const renderCompensationItem = ({ item }) => {
        const isExpanded = expandedId === item.id;
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIconBox, { backgroundColor: '#e8f5e9' }]}>
                        <Ionicons name="cash" size={22} color="#2e7d32" />
                    </View>
                    <View style={styles.cardHeaderText}>
                        <Text style={styles.cardTitle}>{item.disease_name}</Text>
                        <View style={styles.chipRow}>
                            <View style={[styles.chip, { backgroundColor: '#fff3e0' }]}>
                                <Text style={[styles.chipText, { color: '#e65100' }]}>
                                    {item.compensation_type}
                                </Text>
                            </View>
                            <View style={[styles.chip, { backgroundColor: '#e8f5e9' }]}>
                                <Ionicons name="cash" size={12} color="#2e7d32" />
                                <Text style={[styles.chipText, { color: '#2e7d32', fontWeight: 'bold' }]}>
                                    {item.max_amount}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={22} color="#888" />
                </View>

                {isExpanded && (
                    <View style={styles.expandedContent}>
                        <DetailSection icon="checkmark-circle" color="#2e7d32" title="Eligibility" text={item.eligibility_conditions} />
                        <DetailSection icon="list" color="#1565c0" title="How to Claim" text={item.claim_process} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // ── Detail Section Component ──────────────────────────────────────────────
    const DetailSection = ({ icon, color, title, text }) => (
        <View style={styles.detailSection}>
            <View style={styles.detailHeader}>
                <Ionicons name={icon} size={16} color={color} />
                <Text style={[styles.detailTitle, { color }]}>{title}</Text>
            </View>
            <Text style={styles.detailText}>{text}</Text>
        </View>
    );

    // ── Get current tab data ──────────────────────────────────────────────────
    const getActiveData = () => {
        switch (activeTab) {
            case 'diseases': return diseases;
            case 'schemes': return schemes;
            case 'compensation': return compensation;
            default: return [];
        }
    };

    const getActiveRenderer = () => {
        switch (activeTab) {
            case 'diseases': return renderDiseaseItem;
            case 'schemes': return renderSchemeItem;
            case 'compensation': return renderCompensationItem;
            default: return renderDiseaseItem;
        }
    };

    const getEmptyMessage = () => {
        if (searchQuery.trim()) {
            return `No results found for "${searchQuery}"`;
        }
        switch (activeTab) {
            case 'diseases': return 'No disease information available yet.';
            case 'schemes': return userState
                ? `No schemes found for ${userState}. Try removing the state filter.`
                : 'No government schemes loaded.';
            case 'compensation': return 'No compensation information available.';
            default: return 'No data available.';
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>📚 Farmer's Help Desk</Text>
                    {userState && (
                        <Text style={styles.headerSubtitle}>
                            📍 Showing schemes for {userState}
                        </Text>
                    )}
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color="#888" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search diseases, schemes, crops..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <Ionicons name="close-circle" size={20} color="#aaa" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {TABS.map(tab => {
                    const isActive = activeTab === tab.key;
                    const count = tab.key === 'diseases' ? diseases.length
                        : tab.key === 'schemes' ? schemes.length
                            : compensation.length;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tab, isActive && styles.tabActive]}
                            onPress={() => { setActiveTab(tab.key); setExpandedId(null); }}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={18}
                                color={isActive ? '#2e7d32' : '#888'}
                            />
                            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                                {tab.label}
                            </Text>
                            {count > 0 && (
                                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                                    <Text style={[styles.countText, isActive && styles.countTextActive]}>{count}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Content */}
            {error ? (
                <View style={styles.centerBox}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#ccc" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadAllData}>
                        <Ionicons name="refresh" size={18} color="#fff" />
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#2e7d32" />
                    <Text style={styles.loadingText}>Loading knowledge base...</Text>
                </View>
            ) : (
                <FlatList
                    data={getActiveData()}
                    keyExtractor={item => item.id}
                    renderItem={getActiveRenderer()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2e7d32']} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons
                                name={
                                    activeTab === 'diseases' ? 'bug-outline'
                                        : activeTab === 'schemes' ? 'document-text-outline'
                                            : 'cash-outline'
                                }
                                size={48}
                                color="#ccc"
                            />
                            <Text style={styles.emptyTitle}>Nothing Found</Text>
                            <Text style={styles.emptyMsg}>{getEmptyMessage()}</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#2e7d32', paddingVertical: 16, paddingHorizontal: 16, gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    // Search
    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, marginBottom: 8,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08, shadowRadius: 3, gap: 10,
    },
    searchInput: { flex: 1, fontSize: 15, color: '#333' },

    // Tabs
    tabBar: {
        flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
        backgroundColor: '#fff', borderRadius: 12, padding: 4,
        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 2,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, borderRadius: 10, gap: 4,
    },
    tabActive: { backgroundColor: '#e8f5e9' },
    tabLabel: { fontSize: 12, fontWeight: '600', color: '#888' },
    tabLabelActive: { color: '#2e7d32' },
    countBadge: {
        backgroundColor: '#e0e0e0', borderRadius: 10,
        paddingHorizontal: 6, paddingVertical: 1, marginLeft: 2,
    },
    countBadgeActive: { backgroundColor: '#c8e6c9' },
    countText: { fontSize: 10, fontWeight: 'bold', color: '#888' },
    countTextActive: { color: '#2e7d32' },

    // List
    listContent: { paddingHorizontal: 16, paddingBottom: 30 },

    // Card
    card: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08, shadowRadius: 3,
    },
    cardHeader: {
        flexDirection: 'row', alignItems: 'center',
    },
    cardIconBox: {
        width: 44, height: 44, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    cardHeaderText: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#f5f5f5', borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    chipText: { fontSize: 11, color: '#555', fontWeight: '500' },

    // Expanded
    expandedContent: {
        marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0',
    },
    detailSection: { marginBottom: 12 },
    detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    detailTitle: { fontSize: 13, fontWeight: 'bold' },
    detailText: { fontSize: 14, color: '#444', lineHeight: 21, paddingLeft: 22 },
    linkBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#e3f2fd', borderRadius: 8,
        paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start',
    },
    linkBtnText: { fontSize: 13, fontWeight: '600', color: '#1565c0' },

    // States
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    loadingText: { marginTop: 12, fontSize: 14, color: '#888' },
    errorText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 12, marginBottom: 16, lineHeight: 20 },
    retryBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#2e7d32', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
    },
    retryText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    emptyBox: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 12, marginBottom: 4 },
    emptyMsg: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
});

export default EducatorScreen;
