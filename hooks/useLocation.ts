import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        console.log('📍 Requesting location permission...');
        
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          console.log('❌ Location permission denied');
          setError('Permission to access location was denied');
          setLoading(false);
          
          Alert.alert(
            'Localização Necessária',
            'Para ver experiências perto de si, precisamos de acesso à sua localização.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { 
                text: 'Abrir Definições', 
                onPress: () => Location.requestForegroundPermissionsAsync() 
              }
            ]
          );
          return;
        }

        console.log('✅ Location permission granted');
        
        // Get initial location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          const coords = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          };
          
          console.log('📍 Initial location obtained:', coords);
          setLocation(coords);
          setError(null);
          setLoading(false);
        }

        // Watch for location updates (user moves)
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30000, // Update every 30 seconds
            distanceInterval: 100, // Or when user moves 100 meters
          },
          (newLocation) => {
            if (isMounted) {
              const coords = {
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
              };
              console.log('🔄 Location updated:', coords);
              setLocation(coords);
            }
          }
        );

      } catch (err) {
        console.error('❌ Error getting location:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error getting location');
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      // Clean up location subscription
      if (locationSubscription) {
        console.log('🛑 Stopping location updates');
        locationSubscription.remove();
      }
    };
  }, []);

  return { location, loading, error };
}
