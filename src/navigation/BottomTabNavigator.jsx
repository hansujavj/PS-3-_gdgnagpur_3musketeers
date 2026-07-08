import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import HomeScreen from '../screens/HomeScreen';
import CropScreen from '../screens/CropScreen';
import MarketScreen from '../screens/MarketScreen';
import AiAssistantScreen from '../screens/AiAssistantScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
    const { t } = useTranslation();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Crop') {
                        iconName = focused ? 'leaf' : 'leaf-outline';
                    } else if (route.name === 'Market') {
                        iconName = focused ? 'trending-up' : 'trending-up-outline';
                    } else if (route.name === 'AI') {
                        iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'settings' : 'settings-outline';
                    }

                    return <Ionicons name={iconName} size={26} color={color} />;
                },
                tabBarActiveTintColor: '#2e7d32',
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
                tabBarStyle: {
                    height: 100,
                    paddingBottom: 20,
                    paddingTop: 8,
                    backgroundColor: '#ffffff',
                    borderTopWidth: 0,
                    elevation: 15,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -5 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginTop: 4,
                    marginBottom: 4,
                },
                tabBarItemStyle: {
                    paddingTop: 5,
                },
                tabBarIconStyle: {
                    marginTop: 0,
                },
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: t('nav.home') }}
            />
            <Tab.Screen
                name="Crop"
                component={CropScreen}
                options={{ title: t('nav.crop') }}
            />
            <Tab.Screen
                name="Market"
                component={MarketScreen}
                options={{ title: 'Market' }}
            />
            <Tab.Screen
                name="AI"
                component={AiAssistantScreen}
                options={{ title: 'AgriSahayak' }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: t('nav.settings') }}
            />
        </Tab.Navigator>
    );
};

export default BottomTabNavigator;
