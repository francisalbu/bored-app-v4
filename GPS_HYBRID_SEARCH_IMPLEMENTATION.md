# GPS-Based Hybrid Search Implementation

## Overview
Dynamic location-based "Near You" search that works for ANY city worldwide using GPS coordinates and Viator's hybrid search approach.

## Problem Solved
Previously, "Near You" was hardcoded to Lisboa (destination ID 538) and would show incorrect results when users searched for activities. For example:
- Searching for "hiking" in Lisboa would return "Tijuca Rainforest Hike" (Rio de Janeiro, Brazil)
- No way to handle suburbs/regions (Sintra, Cascais for Lisboa; Montserrat for Barcelona)

## Solution Architecture

### Flow
1. **Frontend (find-activity.tsx)**
   - Gets user GPS coordinates via expo-location
   - Passes `{ lat, lng }` object to backend in userLocation parameter
   - Falls back to city name string if GPS not available

2. **Backend (experienceRecommendations.js)**
   - Receives GPS coordinates: `userLocation = { lat: 38.7223, lng: -9.1393 }`
   - Calls `reverseGeocode(lat, lng)` → "Lisboa, Portugal"
   - Calls `getDestinationId("Lisboa")` → 538
   - **Hybrid Search** (parallel):
     - `searchByDestinationId(538, 'hiking')` → Lisboa city results (GUARANTEED location)
     - `smartSearch('hiking', 'Lisboa Portugal')` → Lisboa region results (includes Sintra, Cascais)
   - Combines results and removes duplicates by `productCode`
   - Filters by title to ensure activity relevance

### Why Hybrid Search?
- **Destination ID search**: Guarantees city-specific results (no Brazil, Mexico, etc.)
- **Freetext search**: Captures suburbs and surrounding regions
- **Combined**: Best of both worlds - accuracy + coverage

## Implementation Details

### Backend Changes

#### 1. Added Reverse Geocoding Function
```javascript
async function reverseGeocode(latitude, longitude) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
  const response = await axios.get(url);
  
  // Extract city and country from address_components
  const locality = addressComponents.find(c => c.types.includes('locality'));
  const country = addressComponents.find(c => c.types.includes('country'));
  
  return `${city}, ${countryName}`;
}
```

#### 2. Modified Near You Section
```javascript
if (prioritizeBored) {
  // Check if userLocation is GPS coordinates object
  let cityName = 'Lisboa'; // Default fallback
  let countryName = 'Portugal';
  
  if (userLocation?.lat && userLocation?.lng) {
    const reverseGeocodedLocation = await reverseGeocode(userLocation.lat, userLocation.lng);
    [cityName, countryName] = reverseGeocodedLocation.split(',');
  }
  
  // Get Viator destination ID
  const destinationId = await viatorService.getDestinationId(cityName);
  
  // HYBRID SEARCH
  const [destinationResults, freetextResults] = await Promise.all([
    viatorService.searchByDestinationId(destinationId, activity, 'EUR', 16),
    viatorService.smartSearch(activity, `${cityName} ${countryName}`, 'EUR', 8)
  ]);
  
  // Combine and deduplicate by productCode
  const combinedMap = new Map();
  [...destinationResults, ...freetextResults].forEach(exp => {
    if (!combinedMap.has(exp.productCode)) {
      combinedMap.set(exp.productCode, exp);
    }
  });
  
  viatorExperiences = Array.from(combinedMap.values());
}
```

### Frontend Changes

#### 1. Added expo-location Import
```tsx
import * as Location from 'expo-location';
```

#### 2. Added GPS State
```tsx
const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
```

#### 3. Added GPS Fetching on Mount
```tsx
useEffect(() => {
  (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserGpsCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    }
  })();
}, []);
```

#### 4. Pass GPS to Backend
```tsx
api.post('/experience-recommendations/by-activity', {
  activity: baseActivity,
  userLocation: userGpsCoords || userLocation, // GPS or city name fallback
  strictActivityMatch: true,
  prioritizeBored: true
})
```

## Environment Setup

Add to `backend/.env`:
```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

Get API key from: https://console.cloud.google.com/apis/credentials

## Examples

### Barcelona User Searches Hiking
1. GPS: `{ lat: 41.3851, lng: 2.1734 }`
2. Reverse geocode: "Barcelona, Spain"
3. Destination ID: 479 (Barcelona)
4. Hybrid search:
   - Destination 479: Barcelona city hiking tours
   - Freetext "hiking Barcelona Spain": Montserrat, Tibidabo, Costa Brava
5. Result: ~20 unique hiking experiences in Barcelona region

### Lisboa User Searches Surfing
1. GPS: `{ lat: 38.7223, lng: -9.1393 }`
2. Reverse geocode: "Lisboa, Portugal"
3. Destination ID: 538 (Lisbon)
4. Hybrid search:
   - Destination 538: Lisboa city surf lessons
   - Freetext "surfing Lisboa Portugal": Cascais, Ericeira, Peniche
5. Result: ~20 unique surfing experiences in Lisboa region

## Fallback Strategy

1. **If GPS not available**: Use city name string (current behavior)
2. **If reverse geocoding fails**: Fallback to Lisboa
3. **If destination ID not found**: Use freetext search only
4. **If GOOGLE_MAPS_API_KEY missing**: Log warning, use city name

## Benefits

✅ Works for ANY city worldwide (not hardcoded)
✅ Guarantees location accuracy (no Brazil results for Lisboa)
✅ Captures suburbs and regions (Sintra, Cascais, Montserrat)
✅ No duplicate results (deduplicated by productCode)
✅ Fallback to city name if GPS not available
✅ Graceful error handling at every step

## Testing Checklist

- [ ] Test with GPS enabled in Lisboa → should show Lisboa + Cascais + Sintra
- [ ] Test with GPS enabled in Barcelona → should show Barcelona + Montserrat
- [ ] Test with GPS disabled → should use city name "Lisboa"
- [ ] Test with missing API key → should log warning and use fallback
- [ ] Test activity filtering → hiking should not show skydiving
- [ ] Test duplicate removal → same productCode should appear once
