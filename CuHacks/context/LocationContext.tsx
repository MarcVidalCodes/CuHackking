import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Coordinates, Player } from '../types';
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
  currentUser: CurrentUser | null;
  isHost: boolean;
  joinGame: (username: string) => void;
  updateLocation: (location: Coordinates) => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

export const LocationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [myLocation, setMyLocation] = useState<Coordinates | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isHost, setIsHost] = useState(false);
  const locationSubscription = useRef<any>(null);

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

    // Register event handlers
    socketService.on('connect', connectHandler);
    socketService.on('disconnect', disconnectHandler);
    socketService.on('error', errorHandler);
    socketService.on('updatePlayers', updatePlayersHandler);
    socketService.on('youAreHost', hostHandler);

    // Cleanup handlers on unmount
    return () => {
      socketService.off('connect', connectHandler);
      socketService.off('disconnect', disconnectHandler);
      socketService.off('error', errorHandler);
      socketService.off('updatePlayers', updatePlayersHandler);
      socketService.off('youAreHost', hostHandler);
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

  const updateLocation = (location: Coordinates) => {
    socketService.updateLocation(location);
  };

  return (
    <LocationContext.Provider 
      value={{ 
        myLocation, 
        players, 
        error,
        currentUser,
        isHost,
        joinGame, 
        updateLocation
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