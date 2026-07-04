import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import HomeScreen from '../screens/HomeScreen';
import CropScreen from '../screens/CropScreen';
import SoilScreen from '../screens/SoilScreen';
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
                    } else if (route.name === 'Soil') {
                        iconName = focused ? 'layers' : 'layers-outline';
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
                    height: 65,
                    paddingBottom: 10,
                    paddingTop: 5,
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: '#e0e0e0',
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: -2,
                    marginBottom: 2,
                },
                tabBarItemStyle: {
                    paddingTop: 5,
                },
                tabBarIconStyle: {
                    marginTop: 3,
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
                name="Soil"
                component={SoilScreen}
                options={{ title: t('nav.soil') }}
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
