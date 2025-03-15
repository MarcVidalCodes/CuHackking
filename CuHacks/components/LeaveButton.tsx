import React from 'react';
import { TouchableOpacity, Text, StyleSheet, BackHandler, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';
import { useLocation } from '../context/LocationContext';
import socketService from '../services/socketService';
import aiPlayerManager from '../services/aiPlayerManager';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Game'>;

const LeaveButton: React.FC = () => {
  const navigation = useNavigation<GameScreenNavigationProp>();
  const { currentUser, singlePlayerMode, resetGame } = useLocation();

  const handleLeaveGame = () => {
    // Show confirmation dialog
    Alert.alert(
      "Leave Game",
      "Are you sure you want to leave the game?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Leave", 
          onPress: () => confirmLeave(),
          style: "destructive"
        }
      ]
    );
  };

  const confirmLeave = () => {
    if (currentUser) {
      if (singlePlayerMode) {
        // Handle single player mode
        aiPlayerManager.stopUpdating(); // Stop AI player updates
        resetGame();                    // Reset game state
        navigation.navigate('Lobby');   // Go back to lobby
      } else {
        // Handle multiplayer mode
        socketService.disconnect();
        
        // Either navigate back or exit app depending on platform
        if (Platform.OS === 'android') {
          BackHandler.exitApp();
        } else {
          navigation.navigate('Lobby');
        }
      }
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleLeaveGame}>
      <MaterialIcons name="exit-to-app" size={24} color="white" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
    button: {
      position: 'absolute',
      bottom: 20,
      backgroundColor: '#FF0000',
      padding: 12,
      borderRadius: 30,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default LeaveButton;