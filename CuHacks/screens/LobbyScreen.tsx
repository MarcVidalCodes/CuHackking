import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { useLocation } from '../context/LocationContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';
import PlayerItem from '../components/PlayerItem';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type LobbyScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Lobby'>;

export default function LobbyScreen() {
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [gameDuration, setGameDuration] = useState(5); // Default 5 minutes
  const { players, joinGame, startGame, currentUser, gameStarted, isHost, error, updateGameSettings } = useLocation();
  const navigation = useNavigation<LobbyScreenNavigationProp>();

  useEffect(() => {
    // Only navigate after gameStarted is true
    if (gameStarted) {
      navigation.replace('Game');
    }
  }, [gameStarted, navigation]);

  const handleJoinGame = () => {
    if (username.trim()) {
      joinGame(username);
      setHasJoined(true);
    }
  };

  const handleStartSinglePlayer = () => {
    if (username.trim()) {
      // Navigate to single player setup screen
      navigation.navigate('SinglePlayerSetup', { username });
    }
  };

  const handleStartGame = () => {
    // Set starting flag but don't navigate yet
    setIsStartingGame(true);
    // Pass game settings when starting the game
    startGame({ duration: gameDuration });
    // The navigation happens in the useEffect when gameStarted becomes true
  };

  const handleUpdateSettings = () => {
    updateGameSettings({ duration: gameDuration });
    setShowSettings(false);
  };

  return (
    <LinearGradient
      colors={['#4c669f', '#3b5998', '#192f6a']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>TAG ROYALE</Text>
        <Text style={styles.subtitle}>Ready to play?</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your username"
          placeholderTextColor="#rgba(255,255,255,0.7)"
          value={username}
          onChangeText={setUsername}
        />

        {!hasJoined ? (
          <TouchableOpacity 
            style={styles.button}
            onPress={handleJoinGame}
          >
            <MaterialIcons name="play-circle-filled" size={24} color="white" />
            <Text style={styles.buttonText}>Join Game</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.gameControls}>
            {isHost && (
              <TouchableOpacity 
                style={[styles.button, styles.startButton]}
                onPress={handleStartGame}
                disabled={isStartingGame}
              >
                <MaterialIcons name="sports" size={24} color="white" />
                <Text style={styles.buttonText}>
                  {isStartingGame ? 'Starting...' : 'Start Game'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 24,
    color: 'white',
    marginBottom: 40,
    opacity: 0.9,
  },
  input: {
    width: '80%',
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 18,
    color: 'white',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginVertical: 10,
    width: '80%',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  gameControls: {
    width: '100%',
    alignItems: 'center',
  }
});