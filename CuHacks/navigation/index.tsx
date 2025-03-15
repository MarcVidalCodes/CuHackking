import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LobbyScreen from '../screens/LobbyScreen';
import GameScreen from '../screens/GameScreen';
import TermsScreen from '../screens/TermsScreen';
import SinglePlayerSetupScreen from '../screens/SinglePlayerSetupScreen';
import { useLocation } from '../context/LocationContext';

export type RootStackParamList = {
  Terms: undefined;
  Lobby: undefined;
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
          name="Game" 
          component={GameScreen} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}