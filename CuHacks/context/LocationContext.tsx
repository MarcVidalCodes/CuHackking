import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Coordinates, Player } from '../types';

interface LocationContextType {
  myLocation: Coordinates | null;
  error: string | null;
  username: string;
  setUsername: (name: string) => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

export const LocationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [myLocation, setMyLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const locationSubscription = useRef<any>(null);

  useEffect(() => {
    (async () => {
      // Request location permissions when the app starts
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        return;
      }

      try {
        // Get initial location
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        setMyLocation({
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude
        });

        // Set up location watcher
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000, // 5 seconds
            distanceInterval: 10, // 10 meters
          },
          (locationUpdate) => {
            setMyLocation({
              latitude: locationUpdate.coords.latitude,
              longitude: locationUpdate.coords.longitude,
            });
          }
        );
      } catch (err) {
        console.error("Location error:", err);
        setError('Failed to get location');
      }
    })();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  return (
    <LocationContext.Provider value={{ 
      myLocation, 
      error, 
      username, 
      setUsername 
    }}>
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