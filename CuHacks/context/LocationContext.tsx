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
  joinGame: (username: string) => void;
  startGame: () => void;
  updateLocation: (location: Coordinates) => void;
  transferHost: (playerId: string) => void;
  checkForTag: () => void;
  lastTagMessage: string | null;
}

const LocationContext = createContext<LocationContextType | null>(null);

export const LocationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [myLocation, setMyLocation] = useState<Coordinates | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [lastTagMessage, setLastTagMessage] = useState<string | null>(null);
  const locationSubscription = useRef<any>(null);
  const hasRequestedPermissions = useRef(false);

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

    const gameStartedHandler = (gameState: GameState) => {
      console.log('Game started event received');
      setGameStarted(true);
      setPlayers(gameState.players);
    };

    const hostHandler = () => {
      console.log('You are now the host');
      setIsHost(true);
      setCurrentUser(prev => prev ? {...prev, isHost: true} : null);
    };

    const tagEventHandler = (data: {tagger: string, tagged: string}) => {
      console.log(`${data.tagger} tagged ${data.tagged}!`);
      setLastTagMessage(`${data.tagger} tagged ${data.tagged}!`);
      
      // Clear the message after 5 seconds
      setTimeout(() => {
        setLastTagMessage(null);
      }, 5000);
    };

    // Register event handlers
    socketService.on('connect', connectHandler);
    socketService.on('disconnect', disconnectHandler);
    socketService.on('error', errorHandler);
    socketService.on('updatePlayers', updatePlayersHandler);
    socketService.on('gameStarted', gameStartedHandler);
    socketService.on('youAreHost', hostHandler);
    socketService.on('playerTagged', tagEventHandler);

    // Cleanup handlers on unmount
    return () => {
      socketService.off('connect', connectHandler);
      socketService.off('disconnect', disconnectHandler);
      socketService.off('error', errorHandler);
      socketService.off('updatePlayers', updatePlayersHandler);
      socketService.off('gameStarted', gameStartedHandler);
      socketService.off('youAreHost', hostHandler);
      socketService.off('playerTagged', tagEventHandler);
    };
  }, [currentUser?.id]);

  // Request location permissions and start tracking after joining
  useEffect(() => {
    if (currentUser && !hasRequestedPermissions.current) {
      (async () => {
        // Set this first to prevent multiple requests
        hasRequestedPermissions.current = true;
        
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
              timeInterval: 30000, // 30 seconds between updates
              distanceInterval: 10, // Only update if moved at least 10 meters
            },
            (locationUpdate) => {
              const newLocation = {
                latitude: locationUpdate.coords.latitude,
                longitude: locationUpdate.coords.longitude,
              };
              console.log("Location update:", newLocation);
              setMyLocation(newLocation);
              
              // Only send location updates every 30 seconds
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

  useEffect(() => {
    if (currentUser && gameStarted) {
      const tagInterval = setInterval(() => {
        checkForTag();
      }, 3000); // Check for tags every 3 seconds
      
      return () => {
        clearInterval(tagInterval);
      };
    }
  }, [currentUser, gameStarted]);

  // Add useEffect for automatic tag checking
  useEffect(() => {
    // Only run tag checking if the game has started and current user is "it"
    const currentPlayerData = players.find(p => currentUser && p.id === currentUser.id);
    const isCurrentPlayerIt = currentPlayerData?.isIt || false;
    
    if (gameStarted && isCurrentPlayerIt) {
      console.log('Setting up automatic tag checking');
      const tagInterval = setInterval(() => {
        console.log('Auto-checking for tag opportunities...');
        socketService.emit('checkTag');
      }, 5000); // Check every 5 seconds
      
      return () => {
        clearInterval(tagInterval);
      };
    }
  }, [gameStarted, players, currentUser?.id]); // Re-run when game starts or player status changes

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

  const startGame = () => {
    if (!isHost) {
      setError("Only the host can start the game");
      return;
    }
    
    console.log("Starting game as host");
    socketService.startGame();
    
    // Delay setting gameStarted to allow server events to arrive
    setTimeout(() => {
      setGameStarted(true);
    }, 500);
  };

  const updateLocation = (location: Coordinates) => {
    socketService.updateLocation(location);
  };

  const transferHost = (playerId: string) => {
    if (!isHost) {
      console.error("Only the host can transfer host privileges");
      return;
    }
    console.log(`Requesting host transfer to: ${playerId}`);
    socketService.transferHost(playerId);
  };

  const checkForTag = () => {
    socketService.emit('checkTag');
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
        joinGame, 
        startGame, 
        updateLocation,
        transferHost,
        checkForTag,
        lastTagMessage
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