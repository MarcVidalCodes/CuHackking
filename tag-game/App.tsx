import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import { LocationProvider } from './context/LocationContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <LocationProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home">
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'Tag Game' }}
            />
            <Stack.Screen 
              name="Lobby" 
              component={LobbyScreen} 
              options={{ title: 'Game Lobby' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </LocationProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}