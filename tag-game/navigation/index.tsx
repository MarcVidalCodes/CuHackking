import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; 

import LobbyScreen from '../screens/LobbyScreen';
import HomeScreen from '../screens/HomeScreen';
import { useLocation } from '../context/LocationContext';

export type RootStackParamList = {
  Home: undefined;
  Lobby: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen 
          name="Lobby" 
          component={LobbyScreen} 
          options={{ 
            title: 'Game Lobby'
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}