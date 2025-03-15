import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useLocation } from '../context/LocationContext';
import PlayerMarker from '../components/PlayerMarker';
import GameStatusBar from '../components/GameStatusBar';
import PlayersList from '../components/PlayersList';
import { formatTime } from '../utils/timeUtils';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';

type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Game'>;
import LeaveButton from '../components/LeaveButton';

export default function GameScreen() {
  const { myLocation, players, currentUser, error, lastTagMessage, checkForTag, gameTimeRemaining, gameStarted } = useLocation();
  const navigation = useNavigation<GameScreenNavigationProp>();
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapKey, setMapKey] = useState(1); // Add a key to force remount if needed
  const [userMovedMap, setUserMovedMap] = useState(false); // Add this state to track if user has manually moved the map
  
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
    // 2. Either it's the first time loading OR user hasn't manually moved the map
    if (myLocation && myLocation.latitude && myLocation.longitude && !userMovedMap) {
      const newRegion = {
        latitude: myLocation.latitude,
        longitude: myLocation.longitude,
        latitudeDelta: mapRegion.latitudeDelta, // Preserve current zoom
        longitudeDelta: mapRegion.longitudeDelta, // Preserve current zoom
      };
      
      // Update map without animation to avoid jumps
      mapRef.current?.setCamera({
        center: {
          latitude: myLocation.latitude,
          longitude: myLocation.longitude,
        },
        // Don't change the zoom level
      });
    }
  }, [myLocation, userMovedMap]);

  // Handle map errors by remounting
  useEffect(() => {
    const mapErrorTimeout = setTimeout(() => {
      if (!mapReady) {
        console.log("Map failed to load, remounting...");
        setMapKey(prev => prev + 1);
      }
    }, 5000);

    return () => clearTimeout(mapErrorTimeout);
  }, [mapReady]);

  // Effect to handle game end navigation
  useEffect(() => {
    if (!gameStarted) {
      // Navigate back to lobby when game ends
      navigation.replace('Lobby');
    }
  }, [gameStarted, navigation]);

  // Add console log to debug
  useEffect(() => {
    console.log("Current time remaining:", gameTimeRemaining);
  }, [gameTimeRemaining]);

  // Find the player who is "it"
  const itPlayer = players.find(player => player.isIt);
  
  // Find current player in the players list
  const currentPlayerData = players.find(player => currentUser && player.id === currentUser.id);
  const isCurrentPlayerIt = currentPlayerData?.isIt || false;

  const recenterMap = () => {
    if (myLocation) {
      mapRef.current?.animateCamera({
        center: {
          latitude: myLocation.latitude,
          longitude: myLocation.longitude,
        }
      });
      setUserMovedMap(false); // Allow auto-centering again
    }
  };

  const renderPlayerMarkers = () => {
    if (!mapReady) return null;
    
    // Only render markers for players with valid coordinates
    return players.filter(player => 
      player.location && 
      typeof player.location.latitude === 'number' && 
      typeof player.location.longitude === 'number' &&
      !isNaN(player.location.latitude) && 
      !isNaN(player.location.longitude)
    ).map(player => (
      <PlayerMarker
        key={player.id}
        player={player}
        isCurrentUser={currentUser?.id === player.id}
      />
    ));
  };

  // Format time for display
  const formattedTime = gameTimeRemaining !== null ? formatTime(gameTimeRemaining) : '--:--';

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!myLocation) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        key={`map-${mapKey}`}
        ref={mapRef}
        style={styles.map}
        showsUserLocation={false}
        initialRegion={mapRegion}
        onMapReady={() => {
          console.log("Map is ready");
          setMapReady(true);
        }}
        onError={(error) => {
          console.error("Map error:", error);
          // Try to remount the map if there's an error
          setMapKey(k => k + 1);
        }}
        onRegionChangeComplete={() => {
          // User has moved the map
          setUserMovedMap(true);
        }}
      >
        {renderPlayerMarkers()}
      </MapView>

      <GameStatusBar 
        itPlayerName={itPlayer?.username || 'Unknown'} 
        isCurrentPlayerIt={isCurrentPlayerIt}
        playersCount={players.length}
        timeRemaining={gameTimeRemaining}
      />

      <PlayersList 
        players={players} 
        currentUserId={currentUser?.id}
      />
      
      <LeaveButton />
      
      {/* Add tag button if current player is "it" */}
      {isCurrentPlayerIt && (
        <TouchableOpacity 
          style={styles.tagButton}
          onPress={() => checkForTag()}
        >
          <Text style={styles.tagButtonText}>👋 TAG!</Text>
        </TouchableOpacity>
      )}
      
      {lastTagMessage && (
        <View style={styles.tagMessage}>
          <Text style={styles.tagMessageText}>{lastTagMessage}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
        <Text style={styles.recenterButtonText}>📍</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  gameInfo: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  recenterButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recenterButtonText: {
    fontSize: 24,
  },
  tagButton: {
    position: 'absolute',
    bottom: 90,
    right: 10,
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tagButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tagMessage: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  tagMessageText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});