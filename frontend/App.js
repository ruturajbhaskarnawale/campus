import React from 'react';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './src/features/auth/screens/LoginScreen';
import ForgotPasswordScreen from './src/features/auth/screens/ForgotPasswordScreen';
import LoadingScreen from './src/features/startup/screens/LoadingScreen';
// import { ThemeProvider } from './src/context/ThemeContext'; // Deprecated
import { ThemeProvider } from './src/core/contexts/ThemeContext';
import { ToastProvider } from './src/core/providers/ToastProvider';
import { ErrorBoundary } from './src/core/components';
import MainTabNavigator from './src/navigation/MainTabNavigator';

const Stack = createStackNavigator();

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Loading" component={LoadingScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="Main" component={MainTabNavigator} />
            </Stack.Navigator>
          </NavigationContainer>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
registerRootComponent(App);
