/**
 * Map tab route - re-exports the platform-specific MapScreen component.
 * 
 * Metro bundler will automatically resolve:
 * - MapScreen.tsx for iOS/Android (with react-native-maps)
 * - MapScreen.web.tsx for web (fallback UI)
 */
export { default } from '@/components/MapScreen';
