import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocation } from '../context/LocationContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';

type LoadingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Loading'>;

export default function LoadingScreen() {
  const { gameSettings, gameStarted } = useLocation();
  const navigation = useNavigation<LoadingScreenNavigationProp>();

  useEffect(() => {
    console.log("⏳ LoadingScreen - Checking settings:", gameSettings);
    
    // Wait 1 second to ensure settings are propagated
    const timer = setTimeout(() => {
      console.log("⏳ LoadingScreen - Timer complete, settings:", gameSettings);
      
      // Move to game screen only if game is marked as started
      if (gameStarted) {
        console.log("⏳ LoadingScreen - Navigating to Game screen");
        navigation.replace('Game');
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [gameStarted, navigation, gameSettings]);
  
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4285F4" />
      <Text style={styles.text}>Loading Game...</Text>
      {gameSettings && (
        <Text style={styles.settingsText}>
          Game Duration: {gameSettings.duration} min{'\n'}
          Circle Size: {gameSettings.initialCircleSize} m
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#192f6a',
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    color: 'white',
  },
  settingsText: {
    marginTop: 20,
    color: '#FFC107',
    textAlign: 'center',
    fontSize: 14,
  },
});