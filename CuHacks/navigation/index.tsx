import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LobbyScreen from '../screens/LobbyScreen';
import GameScreen from '../screens/GameScreen';
import WaitingScreen from '../screens/WaitingScreen';
import TermsScreen from '../screens/TermsScreen';
import SinglePlayerSetupScreen from '../screens/SinglePlayerSetupScreen';
import LoadingScreen from '../screens/LoadingScreen';
import { useLocation } from '../context/LocationContext';

export type RootStackParamList = {
  Terms: undefined;
  Lobby: undefined;
  Waiting: undefined;
  Loading: undefined;
  Game: undefined;
  SinglePlayerSetup: { username: string };
  // ...other screens
};

const Stack = createStackNavigator<RootStackParamList>();

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{
          headerShown: false,
          gestureEnabled: false
        }}
      >
        <Stack.Screen 
          name="Terms" 
          component={TermsScreen} 
        />
        <Stack.Screen 
          name="Lobby" 
          component={LobbyScreen} 
        />
        <Stack.Screen 
          name="Waiting" 
          component={WaitingScreen} 
        />
        <Stack.Screen 
          name="Loading" 
          component={LoadingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Game" 
          component={GameScreen} 
        />
        {/* Add the SinglePlayerSetup screen */}
        <Stack.Screen 
          name="SinglePlayerSetup" 
          component={SinglePlayerSetupScreen} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}