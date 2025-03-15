import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList } from 'react-native';
import { useLocation } from '../context/LocationContext';

export default function LobbyScreen() {
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const { players, joinGame, currentUser, error } = useLocation();

  const handleJoinGame = () => {
    if (username.trim()) {
      joinGame(username);
      setHasJoined(true);
    }
  };

  const renderPlayer = ({ item }: { item: any }) => {
    const isCurrentUser = currentUser?.id === item.id;
    
    return (
      <View style={[
        styles.playerItem, 
        isCurrentUser && styles.currentPlayerItem
      ]}>
        <Text style={styles.playerName}>
          {item.username} {isCurrentUser ? '(You)' : ''}
        </Text>
        {item.isHost && <Text style={styles.hostTag}>Host</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Lobby</Text>
      
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
            renderItem={renderPlayer}
            style={styles.playerList}
          />
          
          <View style={styles.mapPreviewBox}>
            <Text style={styles.mapInfo}>Game map will appear here when the game starts</Text>
          </View>
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
    marginBottom: 20,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  currentPlayerItem: {
    backgroundColor: '#f0f8ff',
  },
  playerName: {
    fontSize: 16,
  },
  hostTag: {
    backgroundColor: '#FFC107',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 12,
  },
  mapPreviewBox: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 20,
  },
  mapInfo: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  }
});