import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Coordinates, Player, GameState } from '../types';
import socketService from '../services/socketService';
import aiPlayerManager from '../services/aiPlayerManager';

interface CurrentUser {
  id: string;
  username: string;
  isHost: boolean;
}

interface GameSettings {
  duration: number; // in minutes
  initialCircleSize?: number; // Add initialCircleSize to the interface
}

interface LocationContextType {
  myLocation: Coordinates | null;
  players: Player[];
  error: string | null;
  gameStarted: boolean;
  currentUser: CurrentUser | null;
  isHost: boolean;
  gameTimeRemaining: number | null; // in seconds
  joinGame: (username: string) => void;
  startGame: (settings?: GameSettings) => void;
  updateLocation: (location: Coordinates) => void;
  transferHost: (playerId: string) => void;
  checkForTag: () => void;
  lastTagMessage: string | null;
  updateGameSettings: (settings: GameSettings) => void;
  singlePlayerMode: boolean;
  startSinglePlayerGame: (username: string, aiCount: number, difficulty: string, duration: number) => void;
  resetGame: () => void;
  gameSettings: GameSettings; // Add gameSettings to the context type
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
  const [gameSettings, setGameSettings] = useState<GameSettings>({ 
    duration: 5,
    initialCircleSize: 100 // Set default value
  });
  const [gameTimeRemaining, setGameTimeRemaining] = useState<number | null>(null);
  const [singlePlayerMode, setSinglePlayerMode] = useState(false);
  const [aiUpdateInterval, setAiUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const locationSubscription = useRef<any>(null);
  const hasRequestedPermissions = useRef(false);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Set up game timer when game starts
  useEffect(() => {
    if (gameStarted && gameSettings.duration > 0) {
      // Convert minutes to seconds
      const initialSeconds = gameSettings.duration * 60;
      console.log("Setting initial game time:", initialSeconds);
      setGameTimeRemaining(initialSeconds);
      
      // Start the timer
      gameTimerRef.current = setInterval(() => {
        setGameTimeRemaining(prev => {
          // Ensure prev is a valid number
          if (prev === null || isNaN(prev) || prev <= 1) {
            // End the game when timer hits 0
            if (gameTimerRef.current) {
              clearInterval(gameTimerRef.current);
            }
            
            // Emit game ended event to server if current user is host
            if (isHost) {
              socketService.emit('gameEnded', { reason: 'timeUp' });
            }
            
            // Navigate back to lobby
            setGameStarted(false);
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Reset timer when game is not active
      setGameTimeRemaining(null);
    }

    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
        gameTimerRef.current = null;
      }
    };
  }, [gameStarted, gameSettings.duration, isHost]);

  // Listen for game ended event
  useEffect(() => {
    const gameEndedHandler = (data: any) => {
      console.log('Game ended:', data);
      
      // Clean up timer
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
      
      // Reset game state
      setGameStarted(false);
      setGameTimeRemaining(null);
    };

    socketService.on('gameEnded', gameEndedHandler);

    return () => {
      socketService.off('gameEnded', gameEndedHandler);
    };
  }, []);

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

  const startGame = (settings?: GameSettings) => {
    if (!isHost) {
      setError("Only the host can start the game");
      return;
    }
    
    // Update settings if provided
    if (settings) {
      console.log("Updating game settings:", settings);
      setGameSettings(prev => ({ ...prev, ...settings }));
    }
    
    console.log("Starting game as host with settings:", settings || gameSettings);
    socketService.emit('startGame', settings || gameSettings);
    
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
    if (!gameStarted || !myLocation || !currentUser) {
      return;
    }

    const me = players.find(p => p.id === currentUser.id);
    if (!me) return;

    // For multiplayer mode, use the socketService
    if (!singlePlayerMode) {
      socketService.emit('checkTag');
      return;
    }
    
    // For single player mode, handle tags locally
    if (me.isIt) {
      // Check if player can tag any AI players
      const tagRadius = 20; // meters
      
      for (const player of players) {
        if (player.id === currentUser.id || !player.isAI || !player.location) {
          continue; // Skip self, non-AI players, or players without location
        }
        
        // Calculate distance between current player and AI player
        const distance = getDistanceBetweenCoordinates(
          myLocation,
          player.location
        );
        
        if (distance <= tagRadius) {
          console.log(`Tagged AI player: ${player.username} at distance ${distance}m`);
          
          // Update players list - make the AI player "it" and current player not "it"
          setPlayers(prevPlayers => prevPlayers.map(p => ({
            ...p,
            isIt: p.id === player.id ? true : (p.id === currentUser.id ? false : p.isIt)
          })));
          
          // Show tag message
          setLastTagMessage(`You tagged ${player.username}!`);
          
          // Clear message after 3 seconds
          setTimeout(() => {
            setLastTagMessage(null);
          }, 3000);
          
          break;
        }
      }
    } else {
      // AI players can tag the human player
      const tagRadius = 20; // meters
      const itPlayer = players.find(p => p.isIt && p.isAI);
      
      if (itPlayer && itPlayer.location) {
        const distance = getDistanceBetweenCoordinates(myLocation, itPlayer.location);
        
        if (distance <= tagRadius) {
          console.log(`AI player ${itPlayer.username} tagged you at distance ${distance}m`);
          
          // Update players list
          setPlayers(prevPlayers => prevPlayers.map(p => ({
            ...p,
            isIt: p.id === currentUser.id ? true : (p.id === itPlayer.id ? false : p.isIt)
          })));
          
          // Show tag message
          setLastTagMessage(`${itPlayer.username} tagged you!`);
          
          // Clear message after 3 seconds
          setTimeout(() => {
            setLastTagMessage(null);
          }, 3000);
        }
      }
    }
  };

  // Helper function for distance calculation (if not already using geolib)
  const getDistanceBetweenCoordinates = (coord1: Coordinates, coord2: Coordinates) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1.latitude * Math.PI/180;
    const φ2 = coord2.latitude * Math.PI/180;
    const Δφ = (coord2.latitude-coord1.latitude) * Math.PI/180;
    const Δλ = (coord2.longitude-coord1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const updateGameSettings = (settings: GameSettings) => {
    setGameSettings(prev => ({ ...prev, ...settings }));
    // Notify server about settings update
    socketService.emit('updateGameSettings', settings);
  };

  const startSinglePlayerGame = async (username: string, aiCount: number, difficulty: string, duration: number) => {
    try {
      // Request location permissions if needed
      await requestLocationPermissions();
      
      // Create player
      const userId = `local-${Date.now()}`;
      const newCurrentUser = { id: userId, username, isHost: true };
      setCurrentUser(newCurrentUser);
      
      // Create player object with location
      const initialLocation = myLocation || { latitude: 0, longitude: 0 };
      const userPlayer: Player = {
        id: userId,
        username,
        location: initialLocation,
        isIt: true, // Player starts as "it"
        isHost: true
      };
      
      // Generate AI players around the player
      const aiPlayers = aiPlayerManager.generateAIPlayers(aiCount, initialLocation, difficulty);
      
      // Combine user and AI players
      const allPlayers = [userPlayer, ...aiPlayers];
      setPlayers(allPlayers);
      
      // Set up game state
      setGameStarted(true);
      setSinglePlayerMode(true);
      setGameTimeRemaining(duration * 60); // Convert minutes to seconds
      startGameTimer();
      
      // Start AI player update cycle
      aiPlayerManager.startUpdating(userPlayer, allPlayers, (updatedAIPlayers) => {
        setPlayers(prevPlayers => {
          const humanPlayer = prevPlayers.find(p => !p.isAI);
          return humanPlayer ? [humanPlayer, ...updatedAIPlayers] : updatedAIPlayers;
        });
        
        // Check for tags
        checkForTag();
      });
    } catch (error) {
      setError(`Failed to start single player game: ${error}`);
    }
  };

  useEffect(() => {
    return () => {
      // ...existing cleanup
      
      // Stop AI player updates
      if (singlePlayerMode) {
        aiPlayerManager.stopUpdating();
      }
    };
  }, [singlePlayerMode]);

  const resetGame = () => {
    // Stop any active timers
    if (gameTimerId) {
      clearInterval(gameTimerId);
      setGameTimerId(null);
    }
    
    // Reset game state
    setGameStarted(false);
    setPlayers([]);
    setGameTimeRemaining(0);
    setSinglePlayerMode(false);
    setIsHost(false);
    setLastTagMessage(null);
    
    // Other reset operations as needed
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
        gameTimeRemaining,
        joinGame, 
        startGame, 
        updateLocation,
        transferHost,
        checkForTag,
        lastTagMessage,
        updateGameSettings,
        singlePlayerMode,
        startSinglePlayerGame,
        resetGame,
        gameSettings // Expose gameSettings in the context
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