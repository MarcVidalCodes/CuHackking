import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LobbyScreen from '../screens/LobbyScreen';
import GameScreen from '../screens/GameScreen';
import TermsScreen from '../screens/TermsScreen';
import { useLocation } from '../context/LocationContext';

export type RootStackParamList = {
  Terms: undefined;
  Lobby: undefined;
  Game: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function Navigation() {
  const { gameStarted } = useLocation();

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Terms">
        <Stack.Screen 
          name="Terms" 
          component={TermsScreen}
          options={{ headerShown: false }}
        />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}