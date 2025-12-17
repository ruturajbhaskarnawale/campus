import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MessagesList from '../features/messages/screens/MessagesList';
import ChatScreen from '../features/messages/screens/ChatScreen';
import NewMessageScreen from '../features/messages/screens/NewMessageScreen';

const Stack = createStackNavigator();

export default function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="MessagesList" component={MessagesList} options={{ title: 'Messages' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="NewMessage" component={NewMessageScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
