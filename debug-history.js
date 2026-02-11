// Debug script to check AsyncStorage history
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_STORAGE_KEY = '@bored_search_history';

export async function debugHistory() {
  try {
    const historyJson = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    if (historyJson) {
      const history = JSON.parse(historyJson);
      console.log('📦 HISTORY DEBUG:');
      console.log('Total items:', history.length);
      
      history.forEach((item, index) => {
        console.log(`\n[${index}] ${item.activity}`);
        console.log(`  - Full: ${item.fullActivity}`);
        console.log(`  - Thumbnail: ${item.thumbnail ? (item.thumbnail.startsWith('http') ? 'URL: ' + item.thumbnail.substring(0, 80) : 'BASE64 (' + Math.round(item.thumbnail.length/1024) + 'KB)') : 'NULL'}`);
        console.log(`  - Last searched: ${item.lastSearched}`);
        console.log(`  - Search count: ${item.searchCount}`);
      });
    } else {
      console.log('📦 History is empty');
    }
  } catch (error) {
    console.error('Error reading history:', error);
  }
}

export async function clearHistory() {
  try {
    await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
    console.log('✅ History cleared!');
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}
