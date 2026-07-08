import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, FlatList, Alert, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RegionDetectionEngine } from '../engines/regionDetectionEngine';
import { Insight48hEngine } from '../engines/insight48hEngine';
import { NotificationEngine } from '../engines/notificationEngine';
import { WeatherEngine } from '../engines/weatherEngine';
import { HarvestOrchestrator } from '../engines/harvestOrchestrator';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import DAILY_TIPS from '../data/dailyTips.json';
// crop database helpers removed from home screen since sections hidden
// import { getCropTimeline, getUpcomingTasks, getHarvestInfo, getCropData, getRecommendation } from '../data/cropDatabase';
import { fetchLatestCommunityPosts } from '../db/communitySupabase';
import CropClinicWidget from '../components/CropClinicWidget';

// Import local illustrations
const Illustrations = {
    watering: require('../../assets/illustrations/watering.png'),
    fertilizer: require('../../assets/illustrations/fertilizer.png'),
    harvest: require('../../assets/illustrations/harvest.png'),
    seedling: require('../../assets/illustrations/seedling.png'),
    vegetative: require('../../assets/illustrations/vegetative.png'),
};

const getGeocodingApiKey = () =>
    Constants.expoConfig?.extra?.GOOGLE_GEOCODING_API_KEY
    || process.env.GOOGLE_GEOCODING_API_KEY
    || '';

const reverseGeocodeFarmLocation = async (latitude, longitude) => {
    if (!latitude || !longitude) return '';

    const fallbackCoords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    const apiKey = getGeocodingApiKey();

    if (apiKey) {
        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=en`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.status === 'OK' && data.results?.length > 0) {
                return data.results[0].formatted_address;
            }
        } catch (error) {
            console.warn('Google reverse geocoding failed on home screen:', error);
        }
    }

    try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (results?.length > 0) {
            const place = results[0];
            return [
                place.name,
                place.subregion || place.city || place.district,
                place.region,
            ].filter(Boolean).join(', ');
        }
    } catch (error) {
        console.warn('Device reverse geocoding failed on home screen:', error);
    }

    return fallbackCoords;
};

const HomeScreen = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation();
    const [region, setRegion] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [notifVisible, setNotifVisible] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [userName, setUserName] = useState('Farmer');
    const [currentTip, setCurrentTip] = useState(null);
    const [userCrops, setUserCrops] = useState([]);
    const [weather, setWeather] = useState(null);
    const [farmLocation, setFarmLocation] = useState(null);

    // New state for visual guides
    const [taskGuideVisible, setTaskGuideVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [communityPosts, setCommunityPosts] = useState([]);

    useEffect(() => {
        loadData();
        loadUserProfile();
        loadUserCrops();
        loadRandomTip();
    }, []);

    const loadData = async () => {
        setRefreshing(true);
        try {
            const detected = await RegionDetectionEngine.detectRegion();
            setRegion(detected);

            // Load farm location from saved farm details
            let farmCoords = null;
            try {
                const farmStr = await AsyncStorage.getItem('farm-details');
                if (farmStr) {
                    const farm = JSON.parse(farmStr);
                    farmCoords = { latitude: farm.latitude, longitude: farm.longitude };

                    if (!farm.formatted_address && farm.latitude && farm.longitude) {
                        const formattedAddress = await reverseGeocodeFarmLocation(farm.latitude, farm.longitude);
                        farm.formatted_address = formattedAddress;
                        await AsyncStorage.setItem('farm-details', JSON.stringify(farm));
                    }

                    setFarmLocation(farm);
                }
            } catch (e) {
                console.warn('Failed to load farm location:', e);
            }

            // Live weather from Google Weather API using farm coordinates
            const weatherData = await WeatherEngine.getCurrentWeather(detected, farmCoords);
            setWeather(weatherData);

            // Load user crops first
            const crops = await loadUserCrops();

            // Load 48h insights based on user crops
            const generatedInsights = await Insight48hEngine.generateInsights(crops);
            setAlerts(generatedInsights.slice(0, 3));

            await refreshNotifications(crops);

            // Fetch community
            try {
                const posts = await fetchLatestCommunityPosts(3);
                setCommunityPosts(posts);
            } catch (err) {
                console.warn('Failed to load community posts widget', err);
            }

            // Run harvest orchestrator (idempotent, cached 6hrs)
            try {
                const updatedCrops = await HarvestOrchestrator.processAllCrops();
                if (updatedCrops && updatedCrops.length > 0) {
                    setUserCrops(updatedCrops);
                }
            } catch (err) {
                console.warn('Orchestrator failed on dashboard:', err);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false);
        }
    };

    const loadUserProfile = async () => {
        try {
            const profile = await AsyncStorage.getItem('user-profile');
            if (profile) {
                const parsed = JSON.parse(profile);
                setUserName(parsed.name || 'Farmer');
            }
        } catch (e) {
            console.error('Failed to load user profile:', e);
        }
    };

    const loadUserCrops = async () => {
        try {
            const stored = await AsyncStorage.getItem('user-crops');
            if (stored) {
                const crops = JSON.parse(stored);
                setUserCrops(crops);
                return crops;
            }
            return [];
        } catch (e) {
            console.error('Failed to load user crops:', e);
            return [];
        }
    };

    const loadRandomTip = () => {
        const randomIndex = Math.floor(Math.random() * DAILY_TIPS.length);
        setCurrentTip(DAILY_TIPS[randomIndex]);
    };

    const refreshNotifications = async (crops = userCrops) => {
        const notifs = await NotificationEngine.getRecents(crops);
        setNotifications(notifs);
        const count = await NotificationEngine.getUnreadCount(crops);
        setUnreadCount(count);
    };

    const handleNotificationPress = async (item) => {
        Alert.alert(
            item.title,
            item.body,
            [
                { text: 'Later', style: 'cancel' },
                {
                    text: 'Got it (Dismiss)', onPress: async () => {
                        await NotificationEngine.dismiss(item.id);
                        await refreshNotifications();
                    }
                },
                {
                    text: 'Mark Read', onPress: async () => {
                        await NotificationEngine.markAsRead(item.id);
                        await refreshNotifications();
                    }
                }
            ]
        );
        // Auto mark as read on open, if preferred
        await NotificationEngine.markAsRead(item.id);
        await refreshNotifications();
    };

    const getSeverityIcon = (severity) => {
        return severity === 'high' ? 'alert-circle' : 'information-circle';
    };

    const getSeverityColor = (severity) => {
        return severity === 'high' ? '#d32f2f' : '#f57c00';
    };

    const renderQuickAction = (icon, label, route, bgColors, iconColor) => (
        <TouchableOpacity
            style={styles.quickActionTile}
            onPress={() => navigation.navigate(route)}
            accessibilityLabel={`Navigate to ${label}`}
            activeOpacity={0.8}
        >
            <View style={[styles.quickActionIconShell, { backgroundColor: bgColors[0] }]}>
                <Ionicons name={icon} size={28} color={iconColor} />
            </View>
            <Text style={styles.quickActionLabel}>{label}</Text>
        </TouchableOpacity>
    );

    const renderNotificationItem = ({ item }) => (
        <TouchableOpacity style={styles.notifItem} onPress={() => handleNotificationPress(item)}>
            <View style={[styles.notifIcon, { backgroundColor: item.type === 'weather' ? '#e3f2fd' : '#fff3e0' }]}>
                <Ionicons
                    name={item.type === 'weather' ? 'rainy' : item.type === 'market' ? 'trending-up' : 'warning'}
                    size={20}
                    color={item.type === 'weather' ? '#1976d2' : '#e65100'}
                />
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.notifTitle, !item.read && { color: '#2e7d32' }]}>{item.title}</Text>
                    {!item.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.notifTime}>{item.timestamp}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        >
            {/* 1. Top Weather/Info Card */}
            <View style={styles.topGlassCard}>
                <View style={styles.glassHeaderRow}>
                    <View style={styles.glassBranding}>
                        <Text style={styles.glassAppName}>AgriChain</Text>
                        <View style={styles.glassBadge}><Text style={styles.glassBadgeText}>PRO</Text></View>
                    </View>
                    <TouchableOpacity
                        onPress={() => setNotifVisible(true)}
                        style={styles.glassBellBtn}
                    >
                        <Ionicons name="notifications-outline" size={26} color="#fff" />
                        {unreadCount > 0 && (
                            <View style={styles.glassRedDot}>
                                <Text style={styles.dotText}>{unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.glassGreetingRow}>
                    <Text style={styles.glassGreeting}>Hi, {userName} 👋</Text>
                    <Text style={styles.glassLocation} numberOfLines={1}>
                        <Ionicons name="location" size={16} color="#4ade80" /> {farmLocation?.formatted_address
                            ? farmLocation.formatted_address
                            : region ? `${region.district}, ${region.state}` : 'Locating...'}
                    </Text>
                </View>

                <View style={styles.glassWeatherDivider} />

                <View style={styles.glassWeatherSection}>
                    <View style={styles.glassWeatherMain}>
                        <Ionicons name={weather?.icon || 'sunny'} size={42} color="#facc15" />
                        <View style={styles.glassWeatherTemps}>
                            <Text style={styles.glassTemp}>{weather?.temperature || '--'}°</Text>
                            <Text style={styles.glassCondition}>{weather?.condition || 'Clear'}</Text>
                        </View>
                    </View>
                    <View style={styles.glassWeatherMetrics}>
                        <View style={styles.glassMetric}>
                            <Ionicons name="water" size={16} color="#60a5fa" />
                            <Text style={styles.glassMetricVal}>{weather?.humidity || '--'}%</Text>
                        </View>
                        <View style={styles.glassMetric}>
                            <Ionicons name="umbrella" size={16} color="#94a3b8" />
                            <Text style={styles.glassMetricVal}>{weather?.rainfall || 0}mm</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* 2. Quick-Action Tiles */}
            <View style={styles.quickActionsContainer}>
                {renderQuickAction('leaf', t('nav.crop') || 'Crop', 'Crop', ['#e8f5e9', '#c8e6c9'], '#2e7d32')}
                {renderQuickAction('school', 'Educator', 'Educator', ['#e3f2fd', '#bbdefb'], '#1565c0')}
                {renderQuickAction('scan', 'Clinic', 'CropClinic', ['#f3e5f5', '#e1bee7'], '#6a1b9a')}
                {renderQuickAction('trending-up', 'Market', 'Market', ['#fff3e0', '#ffe0b2'], '#e65100')}
                {renderQuickAction('water', 'Irrigate', 'Irrigation', ['#e1f5fe', '#81d4fa'], '#0277bd')}
            </View>

            {/* standalone CropClinicWidget removed from main dashboard per latest request */}

            {/* 3. Expert Community Section */}
            <View style={styles.expertSectionContainer}>
                <View style={styles.expertHeader}>
                    <Text style={styles.expertTitle}>Expert Community</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Community')}>
                        <Text style={styles.expertSeeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                {communityPosts.length > 0 ? (
                    <View style={styles.communityList}>
                        {communityPosts.map((post) => (
                            <TouchableOpacity
                                key={post.id}
                                style={styles.postCard}
                                onPress={() => navigation.navigate('PostDetail', { post })}
                                activeOpacity={0.9}
                            >
                                <View style={styles.postAvatar}>
                                    <Text style={styles.postAvatarText}>
                                        {post.user_name?.charAt(0)?.toUpperCase() || '?'}
                                    </Text>
                                </View>
                                <View style={styles.postBody}>
                                    <View style={styles.postMetaRow}>
                                        <Text style={styles.postAuthor}>{post.user_name}</Text>
                                        <View style={styles.postRepliesBadge}>
                                            <Ionicons name="chatbubble-ellipses" size={12} color="#2e7d32" />
                                            <Text style={styles.postRepliesText}>{post.reply_count || 0}</Text>
                                        </View>
                                    </View>
                                    <Text numberOfLines={2} style={styles.postSnippet}>
                                        {post.question_text}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyCommunityBox}>
                        <Ionicons name="people-circle-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyCommunityText}>Start a discussion with experts!</Text>
                    </View>
                )}
            </View>

            {/* Notifications Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={notifVisible}
                onRequestClose={() => setNotifVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.notifModal}>
                        <View style={styles.notifHeader}>
                            <Text style={styles.notifHeaderTitle}>Notifications ({unreadCount})</Text>
                            <TouchableOpacity onPress={() => setNotifVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={notifications}
                            keyExtractor={(item) => item.id}
                            renderItem={renderNotificationItem}
                            ListEmptyComponent={<Text style={styles.noNotifs}>No new notifications</Text>}
                        />
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
        padding: 20,
        backgroundColor: '#2e7d32', // Green 800
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        paddingTop: 50,
        paddingBottom: 50,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    branding: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    appName: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 1,
    },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    bellBtn: {
        position: 'relative',
        padding: 5,
    },
    redDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ff1744',
        borderWidth: 1.5,
        borderColor: '#2e7d32',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dotText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2e7d32',
        marginLeft: 5,
        marginTop: 5,
    },
    greeting: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 15,
        marginBottom: 2,
    },
    location: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        marginTop: -40,
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 20,
    },
    weatherHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#555',
        textTransform: 'uppercase',
    },
    weatherRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    temp: {
        fontSize: 52,
        fontWeight: 'bold',
        color: '#2e7d32',
        marginRight: 15,
    },
    desc: {
        fontSize: 20,
        color: '#333',
        fontWeight: '600',
    },
    feelsLike: {
        color: '#888',
        fontSize: 14,
    },
    weatherDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 15,
    },
    weatherDetailText: {
        color: '#555',
        fontWeight: '500',
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    actionBtn: {
        width: '23%',
        alignItems: 'center',
    },
    actionIconBox: {
        width: 70,
        height: 70,
        backgroundColor: '#fff',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
    },
    actionLabel: {
        fontSize: 12,
        color: '#555',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: -2,
    },
    actionLabel: {
        fontSize: 12,
        color: '#555',
        fontWeight: '600',
        textAlign: 'center',
    },
    tipCard: {
        backgroundColor: '#2e7d32',
        marginHorizontal: 20,
        borderRadius: 15,
        padding: 20,
        marginBottom: 25,
        overflow: 'hidden',
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    tipTitle: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
        flex: 1,
    },
    refreshTip: {
        padding: 5,
    },
    tipContent: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 15,
        lineHeight: 22,
        fontStyle: 'italic',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    viewAll: {
        color: '#2e7d32',
        fontWeight: '600',
    },
    alertCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 12,
        flexDirection: 'row',
        overflow: 'hidden',
        elevation: 2,
    },
    alertStripe: {
        width: 5,
        height: '100%',
    },
    alertContent: {
        padding: 15,
        flex: 1,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    alertType: {
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 5,
        textTransform: 'uppercase',
    },
    alertMsg: {
        color: '#333',
        fontSize: 15,
        lineHeight: 22,
    },
    emptyAlert: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        padding: 30,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    emptyAlertText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    notifModal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '70%',
        padding: 20,
    },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 15,
    },
    notifHeaderTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    notifItem: {
        flexDirection: 'row',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    notifIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    notifTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
        marginBottom: 4,
    },
    notifBody: {
        color: '#666',
        fontSize: 14,
        lineHeight: 20,
    },
    notifTime: {
        color: '#999',
        fontSize: 12,
        marginTop: 5,
    },
    noNotifs: {
        textAlign: 'center',
        marginTop: 50,
        color: '#999',
    },
    cropDetailCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 15,
        borderRadius: 12,
        padding: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cropDetailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cropIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cropDetailInfo: {
        flex: 1,
    },
    cropDetailName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    cropDetailStage: {
        fontSize: 13,
        color: '#2e7d32',
        fontWeight: '600',
    },
    cropEditBtn: {
        padding: 8,
    },
    cropDetailStats: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
    },
    cropStat: {
        flex: 1,
        alignItems: 'center',
    },
    cropStatLabel: {
        fontSize: 11,
        color: '#666',
        marginTop: 4,
        marginBottom: 2,
    },
    cropStatValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    cropStatDivider: {
        width: 1,
        backgroundColor: '#ddd',
        marginHorizontal: 10,
    },
    cropDetailExtra: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    cropDetailExtraText: {
        fontSize: 13,
        color: '#666',
    },
    visualTaskCard: {
        width: 140,
        height: 180,
        marginRight: 15,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    taskImage: {
        width: '100%',
        height: '100%',
    },
    taskOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 10,
        paddingTop: 15,
    },
    taskTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2,
    },
    taskCrop: {
        color: '#ddd',
        fontSize: 12,
    },
    taskStatusBadge: {
        backgroundColor: '#ff9800',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 6,
    },
    taskStatusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    tasksScroll: {
        marginLeft: 20,
        marginBottom: 25,
    },
    tasksScrollContent: {
        paddingRight: 20,
        paddingBottom: 5,
    },
    noTasksCard: {
        width: 300,
        height: 100,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        flexDirection: 'row',
        gap: 10,
    },
    noTasksText: {
        color: '#2e7d32',
        fontSize: 16,
        fontWeight: '500',
    },
    harvestContainer: {
        flex: 1,
    },
    harvestInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 6,
    },
    harvestLabel: {
        fontSize: 12,
        color: '#555',
    },
    harvestValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4caf50',
        borderRadius: 4,
    },
    guideModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        padding: 20,
    },
    guideCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        maxHeight: '80%',
    },
    guideImage: {
        width: '100%',
        height: 250,
    },
    guideContent: {
        padding: 20,
    },
    guideTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    guideSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    guideSteps: {
        backgroundColor: '#f5f5f5',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    guideStepTitle: {
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    guideStepText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#444',
    },
    guideCloseBtn: {
        backgroundColor: '#2e7d32',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    guideCloseText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    recommendationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff3e0',
        padding: 10,
        borderRadius: 8,
        marginTop: 15,
        gap: 8,
    },
    recommendationText: {
        flex: 1,
        color: '#e65100',
        fontSize: 13,
        fontWeight: '500',
    },
    communityWidgetCard: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        padding: 15,
        borderRadius: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    communityWidgetRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'flex-start',
    },
    communityWidgetIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e3f2fd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        marginTop: 2,
    },
    communityWidgetInitials: {
        color: '#1976d2',
        fontWeight: 'bold',
        fontSize: 14,
    },
    communityWidgetContent: {
        flex: 1,
    },
    communityWidgetUserName: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    communityWidgetQuestion: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginBottom: 4,
    },
    communityWidgetReplies: {
        fontSize: 12,
        color: '#888',
        fontWeight: '500',
    },
    // ---- NEW PREMIUM STYLES ----
    topGlassCard: {
        backgroundColor: '#166534',
        padding: 24,
        paddingTop: 56,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        shadowColor: '#166534',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 18,
        elevation: 10,
        marginBottom: 28,
    },
    glassHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    glassBranding: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    glassAppName: {
        color: '#ffffff',
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    glassBadge: {
        backgroundColor: '#fbbf24',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        marginLeft: 10,
    },
    glassBadgeText: {
        color: '#78350f',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    glassBellBtn: {
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
    },
    glassRedDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#ef4444',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#166534',
    },
    glassGreetingRow: {
        marginBottom: 24,
    },
    glassGreeting: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 16,
        marginBottom: 4,
        fontWeight: '500',
    },
    glassLocation: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: '700',
    },
    glassWeatherDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        marginBottom: 20,
    },
    glassWeatherSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        padding: 16,
        borderRadius: 24,
    },
    glassWeatherMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    glassWeatherTemps: {
        marginLeft: 12,
    },
    glassTemp: {
        color: '#ffffff',
        fontSize: 34,
        fontWeight: '800',
    },
    glassCondition: {
        color: '#bde0fe',
        fontSize: 14,
        fontWeight: '600',
        marginTop: -2,
    },
    glassWeatherMetrics: {
        flexDirection: 'column',
        justifyContent: 'center',
    },
    glassMetric: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    glassMetricVal: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        marginBottom: 15,
        gap: 15,
    },
    quickActionTile: {
        alignItems: 'center',
        width: '28%',
        marginBottom: 10,
    },
    quickActionIconShell: {
        width: 64,
        height: 64,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    quickActionLabel: {
        fontSize: 13,
        color: '#334155',
        fontWeight: '700',
    },
    expertSectionContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    expertHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    expertTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
        letterSpacing: -0.5,
    },
    expertSeeAll: {
        color: '#16a34a',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    communityList: {},
    postCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 16,
        marginBottom: 14,
        flexDirection: 'row',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    postAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    postAvatarText: {
        color: '#475569',
        fontSize: 18,
        fontWeight: '800',
    },
    postBody: {
        flex: 1,
    },
    postMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    postAuthor: {
        fontSize: 15,
        fontWeight: '800',
        color: '#334155',
    },
    postRepliesBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    postRepliesText: {
        color: '#166534',
        fontSize: 12,
        fontWeight: '800',
        marginLeft: 4,
    },
    postSnippet: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
        fontWeight: '500',
    },
    emptyCommunityBox: {
        backgroundColor: '#f8fafc',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#cbd5e1',
    },
    emptyCommunityText: {
        marginTop: 12,
        color: '#94a3b8',
        fontSize: 15,
        fontWeight: '700',
    }
});

export default HomeScreen;
