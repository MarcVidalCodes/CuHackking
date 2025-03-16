import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, Region, Circle, Polyline } from 'react-native-maps';
import { useLocation } from '../context/LocationContext';
import PlayerMarker from '../components/PlayerMarker';
import GameStatusBar from '../components/GameStatusBar';
import PlayersList from '../components/PlayersList';
import { formatTime } from '../utils/timeUtils';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';
import LeaveButton from '../components/LeaveButton';

type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Game'>;

export default function GameScreen() {
  const { myLocation, players, currentUser, error, lastTagMessage, checkForTag, gameTimeRemaining, gameStarted, gameSettings } = useLocation();
  
  // Log and create a non-null version of gameSettings with defaults
  const safeGameSettings = gameSettings || {
    duration: 5,
    initialCircleSize: 100,
    circleShrinkPercent: 30,
    shrinkDuration: 30,
    shrinkInterval: 10
  };
  
  // Create a stable circle size value derived from safe settings
  const [stableCircleSize, setStableCircleSize] = useState(() => {
    // Ensure we have a valid number even if settings are undefined
    const size = safeGameSettings.initialCircleSize;
    console.log("⭕ Initial circle size:", size);
    return size;
  });
  
  const navigation = useNavigation<GameScreenNavigationProp>();
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapKey, setMapKey] = useState(1); 
  const [userMovedMap, setUserMovedMap] = useState(false);
  
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: myLocation?.latitude || 37.78825,
    longitude: myLocation?.longitude || -122.4324,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Circle state variables - directly use gameSettings.initialCircleSize for initialization
  const [circleCenter, setCircleCenter] = useState<Coordinates | null>(null);
  const [circleRadius, setCircleRadius] = useState(() => {
    const initialSize = gameSettings?.initialCircleSize;
    console.log("INITIAL CIRCLE SIZE FROM SETTINGS:", initialSize || 100);
    return initialSize || 100;
  });
  const [isShrinking, setIsShrinking] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(10);
  const [futureCircle, setFutureCircle] = useState<{center: Coordinates, radius: number} | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shrinkAnimationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add timer phase state - "waiting", "warning", or "shrinking"
  const [timerPhase, setTimerPhase] = useState<"waiting" | "warning" | "shrinking">("waiting");

  // Add a stronger effect to update circle radius when gameSettings change
  useEffect(() => {
    // Check specifically for initialCircleSize changes
    if (gameSettings?.initialCircleSize) {
      console.log("⚠️ IMPORTANT: Game settings changed circle size to:", gameSettings.initialCircleSize);
      setCircleRadius(gameSettings.initialCircleSize);
    }
  }, [gameSettings?.initialCircleSize]); // Only depend on this specific property

  // Effect to set initial circle center based on player locations when game starts
  useEffect(() => {
    if (gameStarted && players.length > 0 && myLocation) {
      // For now, just use your location as the circle center
      setCircleCenter(myLocation);
    }
  }, [gameStarted, myLocation]);

  // Effect to set initial circle center and radius when game starts
  useEffect(() => {
    if (gameStarted && players.length > 0 && myLocation) {
      // Set the circle center to your location
      setCircleCenter(myLocation);
      
      // Explicitly set the circle radius from game settings when game starts
      if (gameSettings && gameSettings.initialCircleSize) {
        console.log("Game started - setting initial circle radius to:", gameSettings.initialCircleSize);
        setCircleRadius(gameSettings.initialCircleSize);
      }
    }
  }, [gameStarted, myLocation, players, gameSettings]);

  // Update map region when your location changes
  useEffect(() => {
    if (myLocation && myLocation.latitude && myLocation.longitude && !userMovedMap) {
      mapRef.current?.setCamera({
        center: {
          latitude: myLocation.latitude,
          longitude: myLocation.longitude,
        },
      });
    }
  }, [myLocation, userMovedMap]);

  // Effect to handle game end navigation
  useEffect(() => {
    if (!gameStarted) {
      // Navigate back to lobby when game ends
      navigation.replace('Lobby');
    }
  }, [gameStarted, navigation]);

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

  // Function to shrink the circle - make sure this works properly
  const shrinkCircle = useCallback(() => {
    if (!circleCenter || isShrinking) return;
    
    console.log("STARTING CIRCLE SHRINK ANIMATION");
    
    // Calculate new radius based on shrink percentage (default to 30% if not set)
    const shrinkPercent = gameSettings?.circleShrinkPercent || 30;
    const startRadius = circleRadius;
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
        console.log("CIRCLE SHRINK COMPLETE. New radius:", endRadius);
        
        // Reset to waiting phase after shrinking completes
        const intervalSeconds = gameSettings?.shrinkInterval || 10;
        const warningSeconds = Math.min(5, Math.floor(intervalSeconds / 2));
        setTimerSeconds(intervalSeconds - warningSeconds);
        setTimerPhase("waiting");
      }
    }, 50);
  }, [circleCenter, circleRadius, isShrinking, calculateNewCenter, futureCircle, gameSettings]);

  // Set up the timer for circle shrinking - fix this to properly transition between phases
  useEffect(() => {
    if (!gameStarted || !circleCenter) return;
    
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Use the configured shrink interval or fall back to 10 seconds
    const intervalSeconds = gameSettings?.shrinkInterval || 10;
    // Warning phase is 5 seconds before shrinking
    const warningSeconds = 5;
    
    // Initial setup based on current phase
    if (timerPhase === "waiting") {
      // First phase: waiting to show the future circle
      setTimerSeconds(intervalSeconds - warningSeconds);
      console.log(`Starting "waiting" phase: ${intervalSeconds - warningSeconds}s`);
    } else if (timerPhase === "warning") {
      // Second phase: showing the future circle, counting down to shrink
      setTimerSeconds(warningSeconds);
      console.log(`Starting "warning" phase: ${warningSeconds}s`);
    }
    
    // Create the countdown timer
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        // When timer reaches zero
        if (prev <= 1) {
          if (timerPhase === "waiting") {
            // Transition from waiting to warning phase
            console.log("Timer reached 0 - Transitioning to warning phase");
            // Calculate and show future circle
            if (circleCenter) {
              const shrinkPercent = gameSettings?.circleShrinkPercent || 30;
              const newRadius = Math.max(50, circleRadius * (1 - shrinkPercent / 100));
              const newCenter = calculateNewCenter(circleCenter, circleRadius, newRadius);
              setFutureCircle({
                center: newCenter,
                radius: newRadius
              });
              console.log("Future circle calculated:", newCenter, newRadius);
            }
            // Switch to warning phase
            setTimerPhase("warning");
            return warningSeconds; // Reset timer to warning duration
          }
          else if (timerPhase === "warning") {
            // Transition from warning to shrinking phase
            console.log("Warning timer reached 0 - Starting circle shrink");
            setTimerPhase("shrinking");
            // Start the shrinking process
            shrinkCircle();
            return 0;
          }
          return 0;
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
  }, [gameStarted, timerPhase, circleCenter, circleRadius, calculateNewCenter, gameSettings, shrinkCircle]);

  // Clean up animation when component unmounts
  useEffect(() => {
    return () => {
      if (shrinkAnimationRef.current) {
        clearInterval(shrinkAnimationRef.current);
        shrinkAnimationRef.current = null;
      }
    };
  }, []);

  // Use this flag to track if we've properly applied settings
  const settingsApplied = useRef(false);

  // Force update when gameSettings changes
  const [forceUpdate, setForceUpdate] = useState(0);

  // Log whenever game settings change
  useEffect(() => {
    console.log("⚠️ GAME SETTINGS CHANGED:", gameSettings);
    // Force Circle component to remount
    setForceUpdate(prev => prev + 1);
    settingsApplied.current = true;
  }, [gameSettings]);

  // Add this debug useEffect to track all relevant state changes
  useEffect(() => {
    if (gameSettings) {
      console.log("⚠️ Game settings updated in GameScreen:", 
                  JSON.stringify({
                    initialCircleSize: gameSettings.initialCircleSize,
                    duration: gameSettings.duration
                  }));
    }
  }, [gameSettings]);

  // Always update the stable circle size when settings change
  useEffect(() => {
    if (gameSettings && typeof gameSettings.initialCircleSize === 'number') {
      const newSize = gameSettings.initialCircleSize;
      console.log("⭕ Updating circle size to:", newSize);
      setStableCircleSize(newSize);
      setCircleRadius(newSize);
    }
  }, [gameSettings]);

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
        onMapReady={() => setMapReady(true)}
        onRegionChangeComplete={() => setUserMovedMap(true)}
      >
        {renderPlayerMarkers()}
        
        {/* FIXED Circle component with stable circle size and safety fallback */}
        {circleCenter && (
          <Circle
            key={`circle-${stableCircleSize}-${forceUpdate}`}
            center={{
              latitude: circleCenter.latitude,
              longitude: circleCenter.longitude,
            }}
            radius={stableCircleSize || 100} // Added fallback for extra safety
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

      {/* Safe zone info and timer - ensure this shows the right phase */}
      {gameStarted && circleCenter && (
        <View style={styles.circleInfo}>
          {timerPhase === "waiting" ? (
            <Text style={styles.timerText}>
              Next Circle shown in: {timerSeconds}s
            </Text>
          ) : timerPhase === "warning" ? (
            <Text style={styles.warningText}>
              Shrinking in: {timerSeconds}s
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
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
  },
  warningText: {
    color: '#FFA500', // Orange color for warning phase
    fontSize: 14,
    fontWeight: 'bold',
  },
  debugRadiusInfo: {
    position: 'absolute',
    top: 150,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 5,
    borderRadius: 5,
  },
  debugRadiusText: {
    color: 'white',
    fontSize: 10,
  },
});