import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useLocation } from '../context/LocationContext';
import PlayerMarker from '../components/PlayerMarker';
import GameStatusBar from '../components/GameStatusBar';
import PlayersList from '../components/PlayersList';

export default function GameScreen() {
  const { myLocation, players, currentUser, error, lastTagMessage, checkForTag } = useLocation();
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [userMovedMap, setUserMovedMap] = useState(false);
  
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: myLocation?.latitude || 37.78825,
    longitude: myLocation?.longitude || -122.4324,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Update map region when your location changes
  useEffect(() => {
    // Only update the map region if:
    // 1. We have a location AND
    // 2. User hasn't manually moved the map
    if (myLocation && !userMovedMap) {
      const newRegion = {
        latitude: myLocation.latitude,
        longitude: myLocation.longitude,
        latitudeDelta: mapRegion.latitudeDelta,
        longitudeDelta: mapRegion.longitudeDelta,
      };
      
      setMapRegion(newRegion);
      
      // Animate map to new position
      if (mapRef.current && mapReady) {
        mapRef.current.animateToRegion(newRegion, 300);
      }
    }
  }, [myLocation, userMovedMap, mapReady]);

  const handleMapReady = () => {
    setMapReady(true);
  };

  // Handle user map movement - track when they manually move the map
  const handleRegionChangeComplete = (region: Region) => {
    if (myLocation) {
      // Check if this change was more than a small delta from current position
      // (to differentiate between automatic updates and user movement)
      const latDiff = Math.abs(region.latitude - myLocation.latitude);
      const lonDiff = Math.abs(region.longitude - myLocation.longitude);
      
      if (latDiff > 0.0005 || lonDiff > 0.0005) {
        setUserMovedMap(true);
      }
    }
    
    setMapRegion(region);
  };

  const handleRecenterMap = () => {
    if (!myLocation) return;
    
    const newRegion = {
      latitude: myLocation.latitude,
      longitude: myLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    
    setMapRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 300);
    setUserMovedMap(false);
  };

  if (!myLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  const isPlayerTagger = currentUser && 
    players.find(p => p.id === currentUser.id)?.isTagger;

  return (
    <View style={styles.container}>
      <GameStatusBar />
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {lastTagMessage && (
        <View style={styles.tagMessageContainer}>
          <Text style={styles.tagMessageText}>{lastTagMessage}</Text>
        </View>
      )}
      
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={mapRegion}
          onMapReady={handleMapReady}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
        >
          {players.map((player) => (
            <PlayerMarker
              key={player.id}
              player={player}
              isCurrentUser={player.id === currentUser?.id}
            />
          ))}
        </MapView>
        
        {userMovedMap && (
          <TouchableOpacity 
            style={styles.recenterButton}
            onPress={handleRecenterMap}
          >
            <Text style={styles.recenterButtonText}>Recenter</Text>
          </TouchableOpacity>
        )}
        
        {isPlayerTagger && (
          <TouchableOpacity 
            style={styles.tagButton}
            onPress={checkForTag}
          >
            <Text style={styles.tagButtonText}>TAG!</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.playersContainer}>
        <Text style={styles.playersHeader}>Players</Text>
        <PlayersList 
          players={players} 
          currentUserId={currentUser?.id} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#ffdddd',
    padding: 10,
    margin: 10,
    borderRadius: 5,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
  },
  tagMessageContainer: {
    backgroundColor: '#e8f5e9',
    padding: 10,
    margin: 10,
    borderRadius: 5,
  },
  tagMessageText: {
    color: '#2e7d32',
    textAlign: 'center',
  },
  mapContainer: {
    height: Dimensions.get('window').height * 0.6,
    width: '100%',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  recenterButtonText: {
    fontWeight: '500',
  },
  tagButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#FF5252',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  tagButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  playersContainer: {
    padding: 16,
    flex: 1,
  },
  playersHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});