import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Dynamically determine the API host
const getApiHost = () => {
    // For production or when explicit URL is needed, you can hardcode it here
    // return 'http://YOUR_PUBLIC_IP:5000';

    if (__DEV__) {
        // Attempt to get the IP from Expo Constants (works for physical devices via Expo Go)
        const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;

        if (debuggerHost) {
            // Extract IP from "ip:port" string
            return `http://${debuggerHost.split(':')[0]}:5000`;
        }
    }

    // Fallback for Android Emulator (10.0.2.2) and iOS/Web (localhost)
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:5000';
    }

    return 'http://localhost:5000';
};

const API_HOST = getApiHost();
const API_BASE = `${API_HOST}/api`; // This line already adds '/api' to the base URL.

console.log('API Configured:', API_HOST); // Log to help debug

export { API_HOST, API_BASE };
