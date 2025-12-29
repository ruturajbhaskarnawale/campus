import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileScreen from '../features/auth/screens/ProfileScreen';
import EditProfile from '../features/auth/screens/EditProfile';
import ProfileDetail from '../features/profile/screens/ProfileDetail';
import BookmarksScreen from '../features/feed/screens/BookmarksScreen';
import PostDetail from '../features/feed/screens/PostDetail';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import { ChangePassword, PrivacySettings, NotificationSettings, HelpCenter, ReportProblem, DataUsage } from '../features/settings/screens/SettingsSubScreens';
import FollowListScreen from '../features/profile/screens/FollowListScreen';

const Stack = createStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="MyProfile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditProfile} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="ProfileDetail" component={ProfileDetail} options={{ title: 'Profile' }} />
      <Stack.Screen name="FollowList" component={FollowListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} options={{ title: 'Bookmarks' }} />
      <Stack.Screen name="PostDetail" component={PostDetail} options={{ title: 'Post' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      
      {/* Settings Sub-Screens */}
      <Stack.Screen name="ChangePassword" component={ChangePassword} options={{ title: 'Password' }} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettings} options={{ title: 'Privacy' }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettings} options={{ title: 'Notifications' }} />
      <Stack.Screen name="HelpCenter" component={HelpCenter} options={{ title: 'Help Center' }} />
      <Stack.Screen name="ReportProblem" component={ReportProblem} options={{ title: 'Report Problem' }} />
      <Stack.Screen name="DataUsage" component={DataUsage} options={{ title: 'Data & Storage' }} />
    </Stack.Navigator>
  );
}
