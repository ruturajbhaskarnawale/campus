import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MessagesScreen from '../features/messages/screens/MessagesScreen';
import ChatScreen from '../features/messages/screens/ChatScreen';
import NewMessageScreen from '../features/messages/screens/NewMessageScreen';

const Stack = createStackNavigator();

export default function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="MessagesList" component={MessagesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="NewMessage" component={NewMessageScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
