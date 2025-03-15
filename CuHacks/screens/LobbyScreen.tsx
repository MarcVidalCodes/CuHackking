import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, ActivityIndicator } from 'react-native';
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
  const { players, joinGame, startGame, currentUser, gameStarted, isHost, error } = useLocation();
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

  const handleStartGame = () => {
    // Set starting flag but don't navigate yet
    setIsStartingGame(true);
    startGame();
    // The navigation happens in the useEffect when gameStarted becomes true
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
          <Button title="Join Game" onPress={handleJoinGame} />
        </View>
      ) : (
        <>
          <Text style={styles.waitingText}>
            {players.length > 0 ? `Players in lobby: ${players.length}` : 'Waiting for players to join...'}
          </Text>
          
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
  }
});