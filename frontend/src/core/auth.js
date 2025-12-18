import { Platform } from 'react-native';

// Cross-platform token storage helper.
// Uses AsyncStorage on React Native and localStorage on web.
let AsyncStorage = null;
if (Platform.OS !== 'web') {
    try {
        // Optional dependency - only available if installed
        // eslint-disable-next-line global-require
        AsyncStorage = require('@react-native-async-storage/async-storage').default;
    } catch (e) {
        AsyncStorage = null;
    }
}

export async function setCurrentUserId(uid) {
  try {
    if (Platform.OS === 'web') {
        localStorage.setItem('cp_hub_uid', uid);
        return;
    }
    if (AsyncStorage) await AsyncStorage.setItem('cp_hub_uid', uid);
  } catch (e) {}
}

export async function getCurrentUserId() {
  try {
    if (Platform.OS === 'web') {
        return localStorage.getItem('cp_hub_uid') || null;
    }
    if (AsyncStorage) return (await AsyncStorage.getItem('cp_hub_uid')) || null;
    return null;
  } catch (e) { return null; }
}

export async function setIdToken(token) {
  try {
    if (Platform.OS === 'web') {
        localStorage.setItem('cp_hub_id_token', token);
        return;
    }
    if (AsyncStorage) await AsyncStorage.setItem('cp_hub_id_token', token);
  } catch (e) {}
}

export async function getIdToken() {
  try {
    if (Platform.OS === 'web') {
        return localStorage.getItem('cp_hub_id_token') || null;
    }
    if (AsyncStorage) return (await AsyncStorage.getItem('cp_hub_id_token')) || null;
    return null;
  } catch (e) { return null; }
}

