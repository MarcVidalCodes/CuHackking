import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LocationProvider } from './context/LocationContext';
import Navigation from './navigation/index'; // Explicitly include index

export default function App() {
  return (
    <SafeAreaProvider>
      <LocationProvider>
        <Navigation />
        <StatusBar style="auto" />
      </LocationProvider>
    </SafeAreaProvider>
  );
}