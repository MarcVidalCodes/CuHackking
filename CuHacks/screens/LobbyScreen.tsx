import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { useLocation } from '../context/LocationContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';
import PlayerItem from '../components/PlayerItem';

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
    <View style={styles.container}>
      <Text style={styles.title}>Tag Game Lobby</Text>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {!hasJoined ? (
        <View style={styles.joinForm}>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.multiplayerButton]}
              onPress={handleJoinGame}
            >
              <Text style={styles.buttonText}>Join Multiplayer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.singlePlayerButton]}
              onPress={handleStartSinglePlayer}
            >
              <Text style={styles.buttonText}>Play with AI</Text>
              <Text style={styles.buttonSubtext}>powered by Gemini</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.waitingText}>
            {players.length > 0 ? `Players in lobby: ${players.length}` : 'Waiting for players to join...'}
          </Text>
          
          {isHost && (
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => setShowSettings(true)}
            >
              <Text style={styles.settingsButtonText}>⚙️ Game Settings</Text>
            </TouchableOpacity>
          )}
          
          <FlatList
            data={players}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PlayerItem 
                player={item}
                isCurrentUser={currentUser?.id === item.id}
              />
            )}
            style={styles.playerList}
          />
          
          {isStartingGame ? (
            <View style={styles.startingContainer}>
              <ActivityIndicator size="small" color="#4285F4" />
              <Text style={styles.startingText}>Starting game...</Text>
            </View>
          ) : isHost ? (
            <Button 
              title="Start Game" 
              onPress={handleStartGame} 
              disabled={players.length < 1}
            />
          ) : (
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="small" color="#0000ff" />
              <Text style={styles.waitingHostText}>Waiting for host to start game...</Text>
            </View>
          )}
          
          {/* Game Settings Modal */}
          <Modal
            visible={showSettings}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowSettings(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Game Settings</Text>
                
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Game Duration (minutes):</Text>
                  <View style={styles.durationControls}>
                    <TouchableOpacity 
                      style={styles.durationButton}
                      onPress={() => setGameDuration(Math.max(1, gameDuration - 1))}
                    >
                      <Text style={styles.durationButtonText}>-</Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.durationText}>{gameDuration}</Text>
                    
                    <TouchableOpacity 
                      style={styles.durationButton}
                      onPress={() => setGameDuration(gameDuration + 1)}
                    >
                      <Text style={styles.durationButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.modalButtons}>
                  <Button title="Cancel" onPress={() => setShowSettings(false)} />
                  <View style={{ width: 20 }} />
                  <Button title="Save Settings" onPress={handleUpdateSettings} />
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  joinForm: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 15,
  },
  button: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  multiplayerButton: {
    backgroundColor: '#4285F4',
  },
  singlePlayerButton: {
    backgroundColor: '#34A853',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
  waitingText: {
    fontSize: 18,
    marginVertical: 20,
  },
  playerList: {
    width: '100%',
    marginVertical: 20,
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waitingHostText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#555',
  },
  startingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  startingText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#4285F4',
  },
  settingsButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginVertical: 10,
    alignSelf: 'center',
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingRow: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  durationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationButton: {
    backgroundColor: '#e0e0e0',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  durationText: {
    fontSize: 18,
    marginHorizontal: 20,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  }
});