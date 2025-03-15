import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Coordinates, Player, GameState } from '../types';
import socketService from '../services/socketService';

interface CurrentUser {
  id: string;
  username: string;
  isHost: boolean;
}

interface LocationContextType {
  myLocation: Coordinates | null;
  players: Player[];
  error: string | null;
  gameStarted: boolean;
  currentUser: CurrentUser | null;
  isHost: boolean;
  isTagger: boolean;
  currentTagger: string | null;
  tagCooldown: number;
  lastTagTime: number;
  joinGame: (username: string) => void;
  startGame: () => void;
  updateLocation: (location: Coordinates) => void;
  transferHost: (playerId: string) => void;
  checkForTag: () => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

export const LocationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [myLocation, setMyLocation] = useState<Coordinates | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [currentTagger, setCurrentTagger] = useState<string | null>(null);
  const [tagCooldown, setTagCooldown] = useState(10000); // 10 seconds default
  const [lastTagTime, setLastTagTime] = useState(0);
  const locationSubscription = useRef<any>(null);

  // Derived state for current user's tagger status
  const isTagger = currentUser?.id === currentTagger;

  // Setup socket event handlers
  useEffect(() => {
    // Socket connection events
    const connectHandler = (socketId: string) => {
      console.log('Connected with socket ID:', socketId);
      if (currentUser) {
        // Re-establish user info after reconnect
        setCurrentUser({
          ...currentUser,
          id: socketId
        });
      }
    };

    const disconnectHandler = (reason: string) => {
      console.log('Socket disconnected:', reason);
    };

    const errorHandler = (error: any) => {
      console.error('Socket error:', error);
      setError('Connection error: ' + String(error));
    };

    // Game state events
    const updatePlayersHandler = (updatedPlayers: Player[]) => {
      console.log('Players updated:', updatedPlayers.length);
      setPlayers(updatedPlayers);
      
      // Check if current user is host based on updated player list
      if (currentUser) {
        const me = updatedPlayers.find(p => p.id === currentUser.id);
        if (me && me.isHost) {
          setIsHost(true);
          setCurrentUser(prev => prev ? {...prev, isHost: true} : null);
        }
      }
    };

    const hostHandler = () => {
      console.log('You are now the host');
      setIsHost(true);
      setCurrentUser(prev => prev ? {...prev, isHost: true} : null);
    };

    // Game mechanics events
    const gameStartedHandler = (gameState: GameState) => {
      console.log('Game started, initial tagger:', gameState.currentTagger);
      setGameStarted(true);
      setCurrentTagger(gameState.currentTagger);
      setTagCooldown(gameState.tagCooldown);
      setLastTagTime(gameState.lastTagTime);
    };

    const playerTaggedHandler = (tagInfo: any) => {
      console.log(`${tagInfo.taggerName} tagged ${tagInfo.taggedName}`);
      // Will be used for game events and notifications
    };

    const gameStateUpdateHandler = (gameState: any) => {
      console.log('Game state update, new tagger:', gameState.currentTagger);
      setCurrentTagger(gameState.currentTagger);
      setTagCooldown(gameState.tagCooldown);
      setLastTagTime(gameState.lastTagTime);
    };

    // Register event handlers
    socketService.on('connect', connectHandler);
    socketService.on('disconnect', disconnectHandler);
    socketService.on('error', errorHandler);
    socketService.on('updatePlayers', updatePlayersHandler);
    socketService.on('youAreHost', hostHandler);
    socketService.on('gameStarted', gameStartedHandler);
    socketService.on('playerTagged', playerTaggedHandler);
    socketService.on('gameStateUpdate', gameStateUpdateHandler);

    // Cleanup handlers on unmount
    return () => {
      socketService.off('connect', connectHandler);
      socketService.off('disconnect', disconnectHandler);
      socketService.off('error', errorHandler);
      socketService.off('updatePlayers', updatePlayersHandler);
      socketService.off('youAreHost', hostHandler);
      socketService.off('gameStarted', gameStartedHandler);
      socketService.off('playerTagged', playerTaggedHandler);
      socketService.off('gameStateUpdate', gameStateUpdateHandler);
    };
  }, [currentUser?.id]);

  // Request location permissions and start tracking after joining
  useEffect(() => {
    if (currentUser) {
      (async () => {
        console.log("Requesting location permissions...");
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          return;
        }

        console.log("Location permission granted");
        try {
          // Get initial location
          const initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          
          const location = {
            latitude: initialLocation.coords.latitude,
            longitude: initialLocation.coords.longitude
          };
          
          console.log("Initial location:", location);
          setMyLocation(location);
          socketService.updateLocation(location);

          // Set up location watcher
          locationSubscription.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 10000, // 10 seconds between updates
              distanceInterval: 10, // Only update if moved at least 10 meters
            },
            (locationUpdate) => {
              const newLocation = {
                latitude: locationUpdate.coords.latitude,
                longitude: locationUpdate.coords.longitude,
              };
              console.log("Location update:", newLocation);
              setMyLocation(newLocation);
              socketService.updateLocation(newLocation);
            }
          );
        } catch (err) {
          console.error("Location error:", err);
          setError('Failed to get location');
        }
      })();
    }

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [currentUser?.id]);

  // Check if current user is tagger more frequently when game is started
  useEffect(() => {
    if (gameStarted && isTagger) {
      const tagCheckInterval = setInterval(() => {
        // Only check for tags when cooldown is inactive
        if (Date.now() - lastTagTime > tagCooldown) {
          console.log("Checking for nearby players to tag...");
          socketService.emit('checkForTag', {});
        }
      }, 2000); // Check every 2 seconds
      
      return () => clearInterval(tagCheckInterval);
    }
  }, [gameStarted, isTagger, lastTagTime, tagCooldown]);

  // Join game function
  const joinGame = (username: string) => {
    const socketId = socketService.getSocketId();
    if (!socketId) {
      setError("Cannot join game: Not connected to server");
      return;
    }

    console.log(`Joining game as: ${username} (${socketId})`);
    setCurrentUser({
      id: socketId,
      username,
      isHost: false
    });
    
    socketService.joinGame(username);
  };

  // Start game function (host only)
  const startGame = () => {
    if (!isHost) {
      console.log("Only the host can start the game");
      return;
    }
    
    socketService.startGame();
  };

  // Update location function
  const updateLocation = (location: Coordinates) => {
    socketService.updateLocation(location);
  };

  // Transfer host function (host only)
  const transferHost = (playerId: string) => {
    if (!isHost) {
      console.log("Only the host can transfer host status");
      return;
    }
    
    socketService.transferHost(playerId);
  };

  // Manual tag check function
  const checkForTag = () => {
    if (isTagger) {
      console.log("Attempting to tag nearby player...");
      socketService.emit('checkForTag', {});
    }
  };

  return (
    <LocationContext.Provider 
      value={{ 
        myLocation, 
        players, 
        error,
        gameStarted,
        currentUser,
        isHost,
        isTagger,
        currentTagger,
        tagCooldown,
        lastTagTime,
        joinGame, 
        startGame,
        updateLocation,
        transferHost,
        checkForTag
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};