# Hierarchical Map Clustering Implementation

## Overview
Implementar sistema de clustering hierárquico baseado em 3 níveis de zoom:

### Zoom Levels
1. **Zoom < 5**: Mostrar PAÍSES (ex: "Portugal 16")
2. **Zoom 5-10**: Mostrar CIDADES (ex: "Lisbon 12", "Amadora 1")
3. **Zoom > 10**: Mostrar POIs INDIVIDUAIS (spots clicáveis)

## Implementation Steps

### 1. Remover ClusteredMapView
- Substituir por MapView normal
- Implementar clustering custom

### 2. Agrupar Dados
```typescript
// Group by country
const groupByCountry = (spots: Spot[]) => {
  const groups = {};
  spots.forEach(spot => {
    if (!groups[spot.country]) {
      groups[spot.country] = {
        name: spot.country,
        count: 0,
        spots: [],
        center: { lat: 0, lng: 0 }
      };
    }
    groups[spot.country].count++;
    groups[spot.country].spots.push(spot);
  });
  
  // Calculate center coordinates
  Object.keys(groups).forEach(country => {
    const avgLat = groups[country].spots.reduce((sum, s) => sum + s.coordinates.latitude, 0) / groups[country].count;
    const avgLng = groups[country].spots.reduce((sum, s) => sum + s.coordinates.longitude, 0) / groups[country].count;
    groups[country].center = { lat: avgLat, lng: avgLng };
  });
  
  return groups;
};

// Group by city
const groupByCity = (spots: Spot[]) => {
  const groups = {};
  spots.forEach(spot => {
    const city = spot.region || spot.spot_name.split(',')[0];
    const key = `${city}-${spot.country}`;
    
    if (!groups[key]) {
      groups[key] = {
        name: city,
        country: spot.country,
        count: 0,
        spots: [],
        center: { lat: 0, lng: 0 }
      };
    }
    groups[key].count++;
    groups[key].spots.push(spot);
  });
  
  // Calculate center coordinates
  Object.keys(groups).forEach(key => {
    const avgLat = groups[key].spots.reduce((sum, s) => sum + s.coordinates.latitude, 0) / groups[key].count;
    const avgLng = groups[key].spots.reduce((sum, s) => sum + s.coordinates.longitude, 0) / groups[key].count;
    groups[key].center = { lat: avgLat, lng: avgLng };
  });
  
  return groups;
};
```

### 3. Custom Marker Components
```typescript
// Country Marker
const CountryMarker = ({ name, count, coordinate }) => (
  <Marker coordinate={coordinate}>
    <View style={styles.countryBadge}>
      <Text style={styles.badgeText}>{name}</Text>
      <View style={styles.badgeCount}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  </Marker>
);

// City Marker
const CityMarker = ({ name, count, coordinate }) => (
  <Marker coordinate={coordinate}>
    <View style={styles.cityBadge}>
      <Text style={styles.badgeText}>{name}</Text>
      <View style={styles.badgeCount}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  </Marker>
);

// POI Marker
const POIMarker = ({ spot, onPress }) => (
  <Marker 
    coordinate={{
      latitude: spot.coordinates.latitude,
      longitude: spot.coordinates.longitude
    }}
    onPress={() => onPress(spot)}
  >
    <View style={styles.poiPin}>
      <Text style={styles.poiEmoji}>📍</Text>
    </View>
  </Marker>
);
```

### 4. Zoom Detection
```typescript
const [zoomLevel, setZoomLevel] = useState(5);

const onRegionChangeComplete = (region) => {
  // Calculate zoom level from latitudeDelta
  const zoom = Math.log2(360 / region.latitudeDelta);
  setZoomLevel(zoom);
};
```

### 5. Render Logic
```typescript
const renderMarkers = () => {
  if (zoomLevel < 5) {
    // Show countries
    return Object.values(countryGroups).map(group => (
      <CountryMarker 
        key={group.name}
        name={group.name}
        count={group.count}
        coordinate={{
          latitude: group.center.lat,
          longitude: group.center.lng
        }}
      />
    ));
  } else if (zoomLevel < 10) {
    // Show cities
    return Object.values(cityGroups).map(group => (
      <CityMarker 
        key={`${group.name}-${group.country}`}
        name={group.name}
        count={group.count}
        coordinate={{
          latitude: group.center.lat,
          longitude: group.center.lng
        }}
      />
    ));
  } else {
    // Show individual POIs
    return spots.map(spot => (
      <POIMarker 
        key={spot.id}
        spot={spot}
        onPress={handleSpotPress}
      />
    ));
  }
};
```

### 6. Styles
```typescript
const styles = StyleSheet.create({
  countryBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  badgeCount: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  poiPin: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiEmoji: {
    fontSize: 28,
  },
});
```

## Next Steps
1. Backup current map.tsx
2. Implement grouping functions
3. Replace ClusteredMapView with MapView
4. Add zoom detection
5. Implement custom markers
6. Test with different zoom levels
7. Handle marker press events for navigation
