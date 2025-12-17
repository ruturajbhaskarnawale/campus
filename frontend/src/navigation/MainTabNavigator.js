import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import FeedStack from './FeedStack';
import SearchStack from './SearchStack';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import ProfileStack from './ProfileStack';
import MessagesStack from './MessagesStack';
import CreatePostScreen from '../features/feed/screens/CreatePostScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ color, size }) => {
        let name = 'ellipse';
        if (route.name === 'Feed') name = 'home-outline';
        if (route.name === 'Search') name = 'search-outline';
        if (route.name === 'Notifications') name = 'notifications-outline';
        if (route.name === 'Create') name = 'add-circle-outline';
        if (route.name === 'Messages') name = 'chatbubble-ellipses-outline';
        if (route.name === 'Profile') name = 'person-outline';
        return <Ionicons name={name} size={size} color={color} />;
      }
    })}>
      <Tab.Screen name="Feed" component={FeedStack} />
      <Tab.Screen name="Search" component={SearchStack} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Create" component={CreatePostScreen} />
      <Tab.Screen name="Messages" component={MessagesStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}
