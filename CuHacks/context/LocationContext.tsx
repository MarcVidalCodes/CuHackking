import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Coordinates, Player, GameState } from '../types';
import socketService from '../services/socketService';
import aiPlayerManager from '../services/aiPlayerManager';

// Extract the location permission logic to a reusable function
const requestLocationPermissions = async () => {
  console.log("Requesting location permissions...");
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    throw new Error('Permission to access location was denied');
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
    return location;
  } catch (err) {
    console.error("Location error:", err);
    throw new Error('Failed to get location'); 
  }
};

interface CurrentUser {
  id: string;
  username: string;
  isHost: boolean;
}

interface GameSettings {
  duration: number; // in minutes
  initialCircleSize?: number; // in meters
  circleShrinkPercent?: number; // percentage to shrink by
  shrinkDuration?: number; // in seconds
  shrinkInterval?: number; // in seconds
  // Add other game settings as needed
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
    initialCircleSize: 100,
    circleShrinkPercent: 30,
    shrinkDuration: 30,
    shrinkInterval: 10
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
        
        try {
          const location = await requestLocationPermissions();
          setMyLocation(location);
          socketService.updateLocation(location);
          
          // Set up location watcher with HIGH accuracy
          locationSubscription.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation, // Change from Balanced to highest accuracy
              timeInterval: 1000, // Update every 1 second, not 2 seconds
              distanceInterval: 0.1, // Update with tiny movements (0.1 meters)
            },
            (locationUpdate) => {
              const newLocation = {
                latitude: locationUpdate.coords.latitude,
                longitude: locationUpdate.coords.longitude,
              };
              console.log("Location update:", newLocation);
              setMyLocation(newLocation);
              
              // Send location updates EVERY time
              socketService.updateLocation(newLocation);
            }
          );
        } catch (err) {
          console.error("Location error:", err);
          setError(`Failed to get location: ${err}`);
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

  // Add AI-to-AI tag checking
  useEffect(() => {
    // Only run in single player mode when game is started
    if (!singlePlayerMode || !gameStarted) return;
    
    console.log("Starting AI tag checking");
    
    // Set up interval to check for AI-to-AI tags
    const aiTagInterval = setInterval(() => {
      // Find the "it" AI player
      const itAi = players.find(p => p.isIt && p.isAI);
      if (!itAi) return;
      
      console.log(`Checking if ${itAi.username} (IT) can tag anyone...`);
      
      // Check if this AI can tag any other player (including human)
      const tagRadius = 20; // meters
      let taggedPlayer = null;
      
      // Find potential tags
      for (const target of players) {
        // Skip the "it" player itself
        if (target.id === itAi.id) continue;
        
        // Calculate distance
        const distance = getDistanceBetweenCoordinates(
          itAi.location,
          target.location
        );
        
        // If within tag radius, this player gets tagged
        if (distance <= tagRadius) {
          console.log(`${itAi.username} tagged ${target.username}! (${Math.round(distance)}m)`);
          taggedPlayer = target;
          break;
        }
      }
      
      // If a tag was made, update all players
      if (taggedPlayer) {
        // Show tag message
        setLastTagMessage(`${itAi.username} tagged ${taggedPlayer.username}!`);
        setTimeout(() => setLastTagMessage(null), 3000);
        
        // Update all players - only the tagged player is "it" now
        setPlayers(prevPlayers => 
          prevPlayers.map(p => ({
            ...p,
            isIt: p.id === taggedPlayer.id
          }))
        );
      }
    }, 1000); // Check every second
    
    return () => clearInterval(aiTagInterval);
  }, [singlePlayerMode, gameStarted, players]);

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

const startGame = (settings?: Partial<GameSettings>) => {
  if (!isHost) {
    setError("Only the host can start the game");
    return;
  }
  
  console.log("🎮 Starting game with settings input:", JSON.stringify(settings || 'using current settings'));
  
  // Save a copy of the current settings
  let finalSettings = { ...gameSettings };
  
  // If specific settings were provided, apply them on top
  if (settings) {
    // Process each field individually to ensure they're numbers
    if (settings.duration !== undefined) {
      const duration = Number(settings.duration);
      finalSettings.duration = !isNaN(duration) ? duration : 5;
    }
    
    if (settings.initialCircleSize !== undefined) {
      const size = Number(settings.initialCircleSize);
      finalSettings.initialCircleSize = !isNaN(size) ? size : 100;
    }
    
    if (settings.circleShrinkPercent !== undefined) {
      const percent = Number(settings.circleShrinkPercent);
      finalSettings.circleShrinkPercent = !isNaN(percent) ? percent : 30;
    }
    
    if (settings.shrinkDuration !== undefined) {
      const duration = Number(settings.shrinkDuration);
      finalSettings.shrinkDuration = !isNaN(duration) ? duration : 30;
    }
    
    if (settings.shrinkInterval !== undefined) {
      const interval = Number(settings.shrinkInterval);
      finalSettings.shrinkInterval = !isNaN(interval) ? interval : 10;
    }
  }
  
  // Log the final settings being used
  console.log("🎮 FINAL GAME SETTINGS:", JSON.stringify(finalSettings));
  
  // Make sure we update the state with the final settings
  setGameSettings(finalSettings);
  
  // Send to server
  socketService.emit('startGame', finalSettings);
  
  // Delay setting gameStarted to allow settings to propagate
  setTimeout(() => {
    // Check once more that settings are applied
    console.log("🎮 Game starting now, settings:", JSON.stringify(gameSettings));
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

const updateGameSettings = (settings: Partial<GameSettings>) => {
  // Validate and log the incoming settings
  console.log("🔄 UPDATING GAME SETTINGS:", JSON.stringify(settings));
  
  // Process settings into numbers more carefully
  const processedSettings: Partial<GameSettings> = {};
  
  if (settings.initialCircleSize !== undefined) {
    // Ensure it's a valid number and not too small
    const rawSize = Number(settings.initialCircleSize);
    const size = !isNaN(rawSize) ? Math.max(50, rawSize) : 100; 
    processedSettings.initialCircleSize = size;
    console.log(`🔵 Circle size processed: ${settings.initialCircleSize} → ${size}`);
  }
  
  // Process other settings similarly
  // ...existing code for other settings...
  
  // Create a new settings object by spreading the current settings first,
  // then applying the processed settings on top
  const newSettings = { ...gameSettings, ...processedSettings };
  
  // Log the final settings that will be applied
  console.log("✅ FINAL SETTINGS:", JSON.stringify(newSettings));
  
  // Update the state with the new settings - use a direct setState instead of callback
  setGameSettings(newSettings);
  
  // Also notify server about settings update
  socketService.emit('updateGameSettings', newSettings);
  
  return newSettings;
};

  const startSinglePlayerGame = async (username: string, aiCount: number, difficulty: string, duration: number) => {
    try {
      // Request location permissions and get current location
      const initialLocation = await requestLocationPermissions();
      
      // Create player
      const userId = `local-${Date.now()}`;
      const newCurrentUser = { id: userId, username, isHost: true };
      setCurrentUser(newCurrentUser);
      
      // Create player object with location - NOT "it" anymore
      const userPlayer: Player = {
        id: userId,
        username,
        location: initialLocation,
        isIt: false, // CHANGED: Player is NOT "it" to start
        isHost: true
      };
      
      // Set my location state
      setMyLocation(initialLocation);
      
      // Generate AI players around the player
      const aiPlayers = aiPlayerManager.generateAIPlayers(aiCount, initialLocation, difficulty);
      
      // Make one random AI player "it" at the start
      if (aiPlayers.length > 0) {
        const randomIndex = Math.floor(Math.random() * aiPlayers.length);
        aiPlayers[randomIndex].isIt = true;
        console.log(`Game starting with ${aiPlayers[randomIndex].username} as IT`);
      }
      
      // Combine user and AI players
      const allPlayers = [userPlayer, ...aiPlayers];
      setPlayers(allPlayers);
      
      // Set up game state
      setGameStarted(true);
      setSinglePlayerMode(true);
      setGameTimeRemaining(duration * 60); // Convert minutes to seconds
      
      // Start game timer
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
      
      gameTimerRef.current = setInterval(() => {
        setGameTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            if (gameTimerRef.current) {
              clearInterval(gameTimerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Start AI player update cycle
      aiPlayerManager.startUpdating(
        userPlayer, 
        allPlayers, 
        (updatedAIPlayers) => {
          setPlayers(prevPlayers => {
            const humanPlayer = prevPlayers.find(p => !p.isAI);
            return humanPlayer ? [humanPlayer, ...updatedAIPlayers] : updatedAIPlayers;
          });
        },
        250 // Game radius in meters
      );
    } catch (error) {
      console.error("Single player game start error:", error);
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
    if (gameTimerRef.current) {  // Changed from gameTimerId to gameTimerRef.current
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    
    // Reset game state
    setGameStarted(false);
    setPlayers([]);
    setGameTimeRemaining(0);
    setSinglePlayerMode(false);
    setIsHost(false);
    setLastTagMessage(null);
    
    // Stop AI updates
    aiPlayerManager.stopUpdating();
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
        resetGame
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