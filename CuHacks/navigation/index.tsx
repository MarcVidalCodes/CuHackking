import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LobbyScreen from '../screens/LobbyScreen';
import GameScreen from '../screens/GameScreen';
import TermsScreen from '../screens/TermsScreen';
import SinglePlayerSetupScreen from '../screens/SinglePlayerSetupScreen';
import { useLocation } from '../context/LocationContext';

export type RootStackParamList = {
  Lobby: undefined;
  Game: undefined;
  SinglePlayerSetup: { username: string };
  // ...other screens
};

const Stack = createStackNavigator<RootStackParamList>();

export default function Navigation() {
  const { gameStarted } = useLocation();

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Lobby">
        <Stack.Screen 
          name="Lobby" 
          component={LobbyScreen} 
          options={{ 
            title: 'Game Lobby',
            headerShown: !gameStarted
          }} 
        />
        <Stack.Screen 
          name="Game" 
          component={GameScreen} 
          options={{ 
            title: 'Live Tag Game',
            headerShown: false
          }}
        />
        <Stack.Screen 
          name="SinglePlayerSetup" 
          component={SinglePlayerSetupScreen} 
          options={{ 
            title: 'AI Game Setup',
            headerStyle: {
              backgroundColor: '#34A853',
            },
            headerTintColor: '#fff'
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}