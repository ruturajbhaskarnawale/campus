import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileScreen from '../features/auth/screens/ProfileScreen';
import EditProfile from '../features/auth/screens/EditProfile';
import ProfileDetail from '../features/profile/screens/ProfileDetail';
import BookmarksScreen from '../features/feed/screens/BookmarksScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';

const Stack = createStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="MyProfile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditProfile} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="ProfileDetail" component={ProfileDetail} options={{ title: 'Profile' }} />
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} options={{ title: 'Bookmarks' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}
