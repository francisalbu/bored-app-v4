import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Platform-aware secure storage
 * - Uses expo-secure-store on native (iOS/Android)
 * - Uses localStorage on web (expo-secure-store doesn't support web)
 */

const isWeb = Platform.OS === 'web';

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('localStorage.getItem error:', error);
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.setItem(key, value);
      return;
    } catch (error) {
      console.error('localStorage.setItem error:', error);
      return;
    }
  }
  return SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.removeItem(key);
      return;
    } catch (error) {
      console.error('localStorage.removeItem error:', error);
      return;
    }
  }
  return SecureStore.deleteItemAsync(key);
}

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
};
