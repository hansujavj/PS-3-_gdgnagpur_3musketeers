import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BottomTabNavigator from './BottomTabNavigator';
import EducatorScreen from '../screens/EducatorScreen';
import CommunityScreen from '../screens/CommunityScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import CropClinicScreen from '../screens/CropClinicScreen';
import CropClinicResultScreen from '../screens/CropClinicResultScreen';
import CropDetailScreen from '../screens/CropDetailScreen';
import MarketScreen from '../screens/MarketScreen';

const Stack = createStackNavigator();

const MainNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
            <Stack.Screen
                name="Educator"
                component={EducatorScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="Community"
                component={CommunityScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="PostDetail"
                component={PostDetailScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="CropClinic"
                component={CropClinicScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="CropClinicResult"
                component={CropClinicResultScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="CropDetail"
                component={CropDetailScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="Market"
                component={MarketScreen}
                options={{
                    headerShown: false,
                }}
            />
        </Stack.Navigator>
    );
};

export default MainNavigator;
