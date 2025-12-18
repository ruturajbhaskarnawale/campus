import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import FeedStack from './FeedStack';
import SearchStack from './SearchStack';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import ProfileStack from './ProfileStack';
import MessagesStack from './MessagesStack';
import CreatePostScreen from '../features/feed/screens/CreatePostScreen';

import { View } from 'react-native';
import { NavigationProvider } from '../context/NavigationContext';
import NavBar from './components/NavBar';
import TopLoadingBar from './components/TopLoadingBar';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <NavigationProvider>
      <View style={{ flex: 1 }}>
        <TopLoadingBar />
        <Tab.Navigator
          tabBar={(props) => <NavBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tab.Screen name="Feed" component={FeedStack} />
          <Tab.Screen name="Search" component={SearchStack} />
          <Tab.Screen name="Create" component={CreatePostScreen} />
          <Tab.Screen name="Notifications" component={NotificationsScreen} />
          <Tab.Screen name="Messages" component={MessagesStack} />
          <Tab.Screen name="Profile" component={ProfileStack} />
        </Tab.Navigator>
      </View>
    </NavigationProvider>
  );
}
