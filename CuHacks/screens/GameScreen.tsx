import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, Platform, Animated } from 'react-native';
import MapView, { Marker, Region, Circle, Polyline } from 'react-native-maps';
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
  const { myLocation, players, currentUser, error, lastTagMessage, checkForTag, gameTimeRemaining, gameStarted, gameSettings } = useLocation();
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

  // Circle state variables
  const [circleCenter, setCircleCenter] = useState<Coordinates | null>(null);
  const [circleRadius, setCircleRadius] = useState(gameSettings?.initialCircleSize || 100); // Use the initialCircleSize from settings
  const [isShrinking, setIsShrinking] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(10);
  const [futureCircle, setFutureCircle] = useState<{center: Coordinates, radius: number} | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shrinkAnimationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add useEffect to update circle radius when gameSettings changes
  useEffect(() => {
    if (gameSettings?.initialCircleSize) {
      console.log("Updating circle radius to:", gameSettings.initialCircleSize);
      setCircleRadius(gameSettings.initialCircleSize);
    }
  }, [gameSettings]);

  // Effect to set initial circle center based on player locations when game starts
  useEffect(() => {
    if (gameStarted && players.length > 0 && myLocation) {
      // For now, just use your location as the circle center
      setCircleCenter(myLocation);
    }
  }, [gameStarted, myLocation]);

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

  // Calculate a new position to ensure new circle stays fully within the old one
  const calculateNewCenter = useCallback((center: Coordinates, currentRadius: number, newRadius: number) => {
    // Maximum distance the center can move while keeping the new circle inside the old one
    const maxMoveDistance = currentRadius - newRadius;
    
    // Choose a smaller value to ensure containment (70% of max)
    const safeDistance = maxMoveDistance * 0.7;
    
    // Random distance within the safe range
    const randomDistance = Math.random() * safeDistance;
    const randomAngle = Math.random() * 2 * Math.PI;
    
    // Convert to x,y offset
    const xOffset = randomDistance * Math.cos(randomAngle);
    const yOffset = randomDistance * Math.sin(randomAngle);
    
    // Convert to lat/lng (approximately)
    const latOffset = yOffset * 0.00001;
    const lngOffset = xOffset * 0.00001;
    
    return {
      latitude: center.latitude + latOffset,
      longitude: center.longitude + lngOffset
    };
  }, []);

  // Calculate the nearest point on a circle from a given point
  const calculateNearestCirclePoint = useCallback((circleCenter: Coordinates, radius: number, point: Coordinates) => {
    // Calculate direction vector from circle center to point
    const dx = point.longitude - circleCenter.longitude;
    const dy = point.latitude - circleCenter.latitude;
    
    // Calculate distance (Euclidean for simplicity, not perfect for geo)
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If point is inside circle, we'll just use the point itself
    if (distance * 111000 < radius) { // Convert approx to meters
      return point;
    }
    
    // Normalize the direction vector
    const normX = dx / distance;
    const normY = dy / distance;
    
    // Calculate the point on the circle (radius converted to approx degrees)
    const radiusInDegrees = radius / 111000; // Approximate conversion
    
    return {
      longitude: circleCenter.longitude + normX * radiusInDegrees,
      latitude: circleCenter.latitude + normY * radiusInDegrees
    };
  }, []);

  // Function to shrink the circle
  const shrinkCircle = useCallback(() => {
    if (!circleCenter || isShrinking) return;
    
    // Calculate new radius based on shrink percentage (default to 80% if not set)
    const shrinkPercent = gameSettings?.circleShrinkPercent || 30;
    const startRadius = circleRadius;
    // Changed formula: New radius should be (100% - shrinkPercent%) of original
    const endRadius = Math.max(50, startRadius * (1 - shrinkPercent / 100));
    
    // Use the pre-calculated future circle if available
    const newCenter = futureCircle ? futureCircle.center : calculateNewCenter(circleCenter, startRadius, endRadius);
    
    // Clear the future circle preview
    setFutureCircle(null);
    
    // Start shrinking animation
    setIsShrinking(true);
    
    // Set up animation for smooth shrinking over the configured duration
    const startTime = Date.now();
    const duration = (gameSettings?.shrinkDuration || 30) * 1000;
    const radiusDiff = startRadius - endRadius;
    
    if (shrinkAnimationRef.current) {
      clearInterval(shrinkAnimationRef.current);
    }
    
    shrinkAnimationRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Update radius based on progress
      const currentRadius = startRadius - (radiusDiff * progress);
      setCircleRadius(currentRadius);
      
      // Also update center during animation
      if (newCenter && circleCenter) {
        const latDiff = newCenter.latitude - circleCenter.latitude;
        const lngDiff = newCenter.longitude - circleCenter.longitude;
        setCircleCenter({
          latitude: circleCenter.latitude + (latDiff * progress),
          longitude: circleCenter.longitude + (lngDiff * progress)
        });
      }
      
      // End animation when complete
      if (progress >= 1) {
        if (shrinkAnimationRef.current) {
          clearInterval(shrinkAnimationRef.current);
          shrinkAnimationRef.current = null;
        }
        setCircleRadius(endRadius);
        setCircleCenter(newCenter);
        setIsShrinking(false);
        // Reset the timer when shrinking is complete
        setTimerSeconds(10);
      }
    }, 50);
  }, [circleCenter, circleRadius, isShrinking, calculateNewCenter, futureCircle, gameSettings]);

  // Set up the timer for circle shrinking
  useEffect(() => {
    if (!gameStarted) return;
    
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    // Use the configured shrink interval or fall back to 10 seconds
    const intervalSeconds = gameSettings?.shrinkInterval || 10;
    
    // Start with the full interval time
    setTimerSeconds(intervalSeconds);
    
    // Create a new timer that counts down from the configured interval to 0
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        // When timer hits 5, calculate and show the future circle
        if (prev === 5 && !futureCircle && circleCenter) {
          const shrinkPercent = gameSettings?.circleShrinkPercent || 30;
          const newRadius = Math.max(50, circleRadius * (1 - shrinkPercent / 100));
          const newCenter = calculateNewCenter(circleCenter, circleRadius, newRadius);
          setFutureCircle({
            center: newCenter,
            radius: newRadius
          });
        }
        
        if (prev <= 1) {
          // When timer reaches 0, start shrinking process
          shrinkCircle();
          // Reset timer to the full interval for the next cycle
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [gameStarted, shrinkCircle, circleCenter, circleRadius, futureCircle, calculateNewCenter, gameSettings]);

  // Clean up animation when component unmounts
  useEffect(() => {
    return () => {
      if (shrinkAnimationRef.current) {
        clearInterval(shrinkAnimationRef.current);
        shrinkAnimationRef.current = null;
      }
    };
  }, []);

  // Calculate the path to the future circle (if it exists)
  const getPathToFutureCircle = useCallback(() => {
    if (!myLocation || !futureCircle) return null;
    
    // Calculate nearest point on future circle
    const nearestPoint = calculateNearestCirclePoint(
      futureCircle.center, 
      futureCircle.radius, 
      myLocation
    );
    
    // Return the path coordinates
    return [
      { latitude: myLocation.latitude, longitude: myLocation.longitude },
      { latitude: nearestPoint.latitude, longitude: nearestPoint.longitude }
    ];
  }, [myLocation, futureCircle, calculateNearestCirclePoint]);

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
          setMapKey(k => k + 1);
        }}
        onRegionChangeComplete={() => {
          setUserMovedMap(true);
        }}
      >
        {renderPlayerMarkers()}
        
        {/* Current circle */}
        {circleCenter && (
          <Circle
            center={{
              latitude: circleCenter.latitude,
              longitude: circleCenter.longitude,
            }}
            radius={circleRadius}
            strokeWidth={3}
            strokeColor="rgba(255, 0, 0, 0.8)"
            fillColor="rgba(255, 0, 0, 0.1)"
          />
        )}
        
        {/* Future circle (shown 5 seconds before shrinking) */}
        {futureCircle && (
          <Circle
            center={{
              latitude: futureCircle.center.latitude,
              longitude: futureCircle.center.longitude,
            }}
            radius={futureCircle.radius}
            strokeWidth={2}
            strokeColor="rgba(255, 255, 0, 0.8)"
            fillColor="rgba(255, 255, 0, 0.05)"
            // Dashed line effect (not supported in all versions)
            // Use lineDashPattern if available in your version
          />
        )}
        
        {/* Dotted line path to future circle */}
        {futureCircle && myLocation && (
          <Polyline
            coordinates={getPathToFutureCircle() || []}
            strokeColor="rgba(255, 255, 0, 0.8)"
            strokeWidth={2}
            lineDashPattern={[5, 5]} // Dotted line pattern
          />
        )}
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
      
      
      {lastTagMessage && (
        <View style={styles.tagMessage}>
          <Text style={styles.tagMessageText}>{lastTagMessage}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
        <Text style={styles.recenterButtonText}>📍</Text>
      </TouchableOpacity>

      {/* Safe zone info and timer */}
      {gameStarted && circleCenter && (
        <View style={styles.circleInfo}>
          <Text style={styles.circleInfoText}>
            Safe zone: {Math.round(circleRadius)}m
          </Text>
          {!isShrinking ? (
            <Text style={styles.timerText}>
              Circle shrinks in: {timerSeconds}s
              {futureCircle && " (New zone visible)"}
            </Text>
          ) : (
            <Text style={styles.shrinkingText}>Circle shrinking...</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  playersBox: {
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 10,
    minWidth: 150,
  },
  safeZoneBox: {
    position: 'absolute',
    top: 150, // Position below players box
    right: 50,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 10,
    minWidth: 150,
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
    top: 10,
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
  circleInfo: {
    position: 'absolute',
    bottom: 90,
    left: 10,
    top: 700,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
  },
  circleInfoText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
  timerText: {
    color: '#FFC107',  // Amber color for the timer
    fontSize: 14,
    fontWeight: 'bold',
  },
  shrinkingText: {
    color: '#FF5252',  // Red color for the shrinking warning
    fontSize: 14,
    fontWeight: 'bold',
  }
});