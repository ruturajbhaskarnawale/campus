// Cross-platform token storage helper.
// Uses AsyncStorage on React Native (if available) and localStorage on web as a fallback.
let AsyncStorage = null;
try {
  // Optional dependency - only available if installed
  // eslint-disable-next-line global-require
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}

export async function setCurrentUserId(uid) {
  try {
    if (AsyncStorage) await AsyncStorage.setItem('cp_hub_uid', uid);
    else localStorage.setItem('cp_hub_uid', uid);
  } catch (e) {}
}

export async function getCurrentUserId() {
  try {
    if (AsyncStorage) return (await AsyncStorage.getItem('cp_hub_uid')) || null;
    return localStorage.getItem('cp_hub_uid') || null;
  } catch (e) { return null; }
}

export async function setIdToken(token) {
  try {
    if (AsyncStorage) await AsyncStorage.setItem('cp_hub_id_token', token);
    else localStorage.setItem('cp_hub_id_token', token);
  } catch (e) {}
}

export async function getIdToken() {
  try {
    if (AsyncStorage) return (await AsyncStorage.getItem('cp_hub_id_token')) || null;
    return localStorage.getItem('cp_hub_id_token') || null;
  } catch (e) { return null; }
}

