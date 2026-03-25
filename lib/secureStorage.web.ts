/**
 * Web fallback for secure storage - uses localStorage
 * Note: localStorage is not as secure as native SecureStore, but works for web
 */

const PREFIX = 'bored_secure_';

export async function getItemAsync(key: string): Promise<string | null> {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch (error) {
    console.warn('[SecureStorage Web] getItemAsync error:', error);
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch (error) {
    console.warn('[SecureStorage Web] setItemAsync error:', error);
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (error) {
    console.warn('[SecureStorage Web] deleteItemAsync error:', error);
  }
}

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
};
