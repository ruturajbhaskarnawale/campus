import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SearchScreen from '../features/search/screens/SearchScreen';
import ProfileDetail from '../features/profile/screens/ProfileDetail';
import FollowListScreen from '../features/profile/screens/FollowListScreen';

const Stack = createStackNavigator();

export default function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="SearchMain" component={SearchScreen} options={{ title: 'Search' }} />
      <Stack.Screen name="ProfileDetail" component={ProfileDetail} options={{ title: 'Profile' }} />
      <Stack.Screen name="FollowList" component={FollowListScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
