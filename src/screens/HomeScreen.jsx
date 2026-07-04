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
import DAILY_TIPS from '../data/dailyTips.json';
import { getCropTimeline, getUpcomingTasks, getHarvestInfo, getCropData, getRecommendation } from '../data/cropDatabase';
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
                    setFarmLocation(farm);
                    farmCoords = { latitude: farm.latitude, longitude: farm.longitude };
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

    const renderQuickAction = (icon, label, route) => (
        <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate(route)}
            accessibilityLabel={`Navigate to ${label}`}
        >
            <View style={styles.actionIconBox}>
                <Ionicons name={icon} size={24} color="#2e7d32" />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
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
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.branding}>
                        <Text style={styles.appName}>AgriChain</Text>
                        <View style={styles.badge}><Text style={styles.badgeText}>BETA</Text></View>
                    </View>
                    <TouchableOpacity
                        onPress={() => setNotifVisible(true)}
                        style={styles.bellBtn}
                        accessibilityLabel="View notifications"
                        accessibilityHint="Opens notification panel"
                    >
                        <Ionicons name="notifications" size={26} color="#fff" />
                        {unreadCount > 0 && (
                            <View style={styles.redDot}>
                                <Text style={styles.dotText}>{unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
                <View>
                    <Text style={styles.greeting}>Welcome back, {userName}!</Text>
                    <Text style={styles.location}>
                        📍 {farmLocation?.formatted_address
                            ? farmLocation.formatted_address
                            : region
                                ? `${region.district}, ${region.state}`
                                : 'Locating...'}
                    </Text>
                </View>
            </View>

            {/* Weather Card */}
            <View style={styles.card}>
                <View style={styles.weatherHeader}>
                    <Text style={styles.cardTitle}>{t('home.weather')}</Text>
                    <Ionicons name={weather?.icon || 'sunny'} size={24} color="#fbc02d" />
                </View>
                <View style={styles.weatherRow}>
                    <Text style={styles.temp}>{weather?.temperature || '--'}°C</Text>
                    <View>
                        <Text style={styles.desc}>{weather?.condition || 'Loading...'}</Text>
                        <Text style={styles.feelsLike}>Feels like {weather?.feelsLike || '--'}°C</Text>
                    </View>
                </View>
                <View style={styles.weatherDetails}>
                    <Text style={styles.weatherDetailText}><Ionicons name="water-outline" /> {weather?.humidity || '--'}% Humidity</Text>
                    <Text style={styles.weatherDetailText}><Ionicons name="umbrella-outline" /> {weather?.rainfall || 0}mm Rain</Text>
                </View>
            </View>

            {/* Quick Actions Grid */}
            <View style={styles.actionsGrid}>
                {renderQuickAction('leaf-outline', t('nav.crop'), 'Crop')}
                {renderQuickAction('school-outline', 'Educator', 'Educator')}
                {renderQuickAction('scan-outline', 'Crop Clinic', 'CropClinic')}
                {renderQuickAction('trending-up-outline', 'Market', 'Market')}
                {renderQuickAction('layers-outline', t('nav.soil'), 'Soil')}
            </View>

            {/* Crop Clinic Widget */}
            <CropClinicWidget />

            {/* Expert Community Widget (Replaced Tips) */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🤝 Expert Community</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Community')}>
                    <Text style={styles.viewAll}>View All</Text>
                </TouchableOpacity>
            </View>

            {communityPosts.length > 0 ? (
                <View style={styles.communityWidgetCard}>
                    {communityPosts.map((post, index) => (
                        <TouchableOpacity
                            key={post.id}
                            style={[
                                styles.communityWidgetRow,
                                index === communityPosts.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }
                            ]}
                            onPress={() => navigation.navigate('PostDetail', { post })}
                        >
                            <View style={styles.communityWidgetIcon}>
                                <Text style={styles.communityWidgetInitials}>
                                    {post.user_name?.charAt(0)?.toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.communityWidgetContent}>
                                <Text style={styles.communityWidgetUserName}>{post.user_name}</Text>
                                <Text numberOfLines={2} style={styles.communityWidgetQuestion}>
                                    {post.question_text}
                                </Text>
                                <Text style={styles.communityWidgetReplies}>
                                    {post.reply_count || 0} {(post.reply_count === 1) ? 'reply' : 'replies'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <View style={[styles.emptyAlert, { backgroundColor: '#f0f4f8' }]}>
                    <Ionicons name="people-outline" size={40} color="#888" />
                    <Text style={styles.emptyAlertText}>Join the discussion!</Text>
                </View>
            )}

            {/* My Crops Section */}
            {userCrops.length > 0 && (
                <>


                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🌾 My Crops Live Status</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Crop')}>
                            <Text style={styles.viewAll}>Manage</Text>
                        </TouchableOpacity>
                    </View>

                    {userCrops.map((crop, index) => {
                        const harvestInfo = getHarvestInfo(crop.name, crop.sowingDate);
                        const daysSinceSowing = Math.floor((new Date() - new Date(crop.sowingDate)) / (1000 * 60 * 60 * 24));

                        // Determine growth stage visually
                        const isSeedling = daysSinceSowing < 30;
                        const iconSource = isSeedling ? Illustrations.seedling : Illustrations.vegetative;

                        return (
                            <View key={index} style={styles.cropDetailCard}>
                                <View style={styles.cropDetailHeader}>
                                    <View style={[styles.cropIconContainer, { backgroundColor: '#fff', overflow: 'hidden' }]}>
                                        <Image source={iconSource} style={styles.cropIconImage} resizeMode="contain" />
                                    </View>
                                    <View style={styles.cropDetailInfo}>
                                        <Text style={styles.cropDetailName}>{crop.name}</Text>
                                        <Text style={styles.cropDetailStage}>{daysSinceSowing} days old</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.cropEditBtn}
                                        onPress={() => navigation.navigate('Crop')}
                                    >
                                        <Ionicons name="create-outline" size={20} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.cropDetailStats}>
                                    <View style={styles.harvestContainer}>
                                        <View style={styles.harvestInfo}>
                                            <Ionicons name="time" size={18} color="#2e7d32" />
                                            <Text style={styles.harvestLabel}>
                                                {harvestInfo?.type === 'continuous' ? 'First Harvest:' : 'Harvest In:'}
                                            </Text>
                                        </View>
                                        <Text style={styles.harvestValue}>
                                            {harvestInfo?.type === 'continuous'
                                                ? `${harvestInfo.daysToFirstHarvest > 0 ? harvestInfo.daysToFirstHarvest + ' days' : 'Ready Now!'}`
                                                : `${harvestInfo?.daysToHarvest} days`
                                            }
                                        </Text>
                                    </View>

                                    {/* Harvest Progress Bar */}
                                    <View style={styles.progressBarBg}>
                                        <View
                                            style={[
                                                styles.progressBarFill,
                                                { width: `${Math.min(100, Math.max(0, (daysSinceSowing / (daysSinceSowing + (harvestInfo?.daysToHarvest || 100))) * 100))}%` }
                                            ]}
                                        />
                                    </View>
                                </View>
                                <View style={styles.recommendationBox}>
                                    <Ionicons name="bulb-outline" size={16} color="#f57c00" />
                                    <Text style={styles.recommendationText}>
                                        {getRecommendation(crop.name, crop.sowingDate)}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </>
            )}

            {/* Alerts Section */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('home.alerts_title')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AI')}>
                    <Text style={styles.viewAll}>{t('home.view_all')}</Text>
                </TouchableOpacity>
            </View>

            {alerts.length > 0 ? (
                alerts.map((alert, index) => (
                    <TouchableOpacity key={index} style={styles.alertCard} onPress={() => navigation.navigate('AI')}>
                        <View style={[styles.alertStripe, { backgroundColor: getSeverityColor(alert.severity) }]} />
                        <View style={styles.alertContent}>
                            <View style={styles.alertHeader}>
                                <Ionicons name={getSeverityIcon(alert.severity)} size={18} color={getSeverityColor(alert.severity)} />
                                <Text style={[styles.alertType, { color: getSeverityColor(alert.severity) }]}>
                                    {alert.cropName} • {alert.type}
                                </Text>
                            </View>
                            <Text numberOfLines={2} style={styles.alertMsg}>{alert.message}</Text>
                        </View>
                    </TouchableOpacity>
                ))
            ) : (
                <View style={styles.emptyAlert}>
                    <Ionicons name="checkmark-circle-outline" size={40} color="#388e3c" />
                    <Text style={styles.emptyAlertText}>{t('home.no_alerts')}</Text>
                </View>
            )}

            {/* Removed bottom community widget to position it higher up over tips */}

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

            {/* Task Guide Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={taskGuideVisible}
                onRequestClose={() => setTaskGuideVisible(false)}
            >
                <View style={styles.guideModalContainer}>
                    <View style={styles.guideCard}>
                        {selectedTask && (
                            <>
                                <Image
                                    source={
                                        selectedTask.type === 'watering' ? Illustrations.watering :
                                            selectedTask.type === 'fertilizer' ? Illustrations.fertilizer :
                                                selectedTask.type === 'harvest' ? Illustrations.harvest :
                                                    Illustrations.vegetative
                                    }
                                    style={styles.guideImage}
                                    resizeMode="cover"
                                />
                                <ScrollView style={styles.guideContent}>
                                    <Text style={styles.guideTitle}>{selectedTask.task}</Text>
                                    <Text style={styles.guideSubtitle}>For {selectedTask.cropName}</Text>

                                    <View style={styles.guideSteps}>
                                        <Text style={styles.guideStepTitle}>📋 Instructions</Text>
                                        <Text style={styles.guideStepText}>
                                            {selectedTask.description || "Follow standard farming practices for this task."}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.guideCloseBtn}
                                        onPress={() => setTaskGuideVisible(false)}
                                    >
                                        <Text style={styles.guideCloseText}>Close Guide</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </>
                        )}
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
        width: 60,
        height: 60,
        backgroundColor: '#fff',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
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
    }
});

export default HomeScreen;
