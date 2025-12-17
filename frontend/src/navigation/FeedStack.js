import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import FeedScreen from '../features/feed/screens/FeedScreen';
import CommentsScreen from '../features/feed/screens/CommentsScreen';
import PostDetail from '../features/feed/screens/PostDetail';

const Stack = createStackNavigator();

export default function FeedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="FeedMain" component={FeedScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PostDetail" component={PostDetail} options={{ title: 'Post' }} />
      <Stack.Screen name="Comments" component={CommentsScreen} />
    </Stack.Navigator>
  );
}
