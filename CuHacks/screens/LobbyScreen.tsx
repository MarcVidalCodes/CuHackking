import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import MapView from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { useLocation } from '../context/LocationContext';
import PlayerMarker from '../components/PlayerMarker';

export default function LobbyScreen() {
  const { myLocation, players, currentUser, isHost, error, startGame, transferHost, gameStarted } = useLocation();
  const navigation = useNavigation();

  // Navigate to game screen if game starts
  useEffect(() => {
    if (gameStarted) {
      navigation.navigate('Game' as never);
    }
  }, [gameStarted, navigation]);

  if (!myLocation) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  // Render a player item for the player list
  const renderPlayerItem = ({ item }: { item: any }) => {
    const isCurrentUser = currentUser?.id === item.id;
    
    return (
      <TouchableOpacity 
        style={[styles.playerItem, isCurrentUser && styles.currentPlayerItem]}
        onLongPress={() => {
          if (isHost && !isCurrentUser) {
            Alert.alert(
              "Transfer Host",
              `Make ${item.username} the host?`,
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Confirm", 
                  onPress: () => transferHost(item.id)
                }
              ]
            );
          }
        }}
      >
        <Text style={styles.playerName}>
          {item.username} {isCurrentUser ? '(You)' : ''}
        </Text>
        {item.isHost && <Text style={styles.hostTag}>Host</Text>}
      </TouchableOpacity>
    );
  };

  const handleStartGame = () => {
    if (players.length < 2) {
      Alert.alert("Cannot Start Game", "You need at least 2 players to start the game.");
      return;
    }
    
    startGame();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Game Lobby</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <Text style={styles.playersText}>
        Players ({players.length})
        {isHost && <Text style={styles.hostNote}> - Long press to transfer host</Text>}
      </Text>
      
      <FlatList
        data={players}
        renderItem={renderPlayerItem}
        keyExtractor={(item) => item.id}
        style={styles.playersList}
      />
      
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: myLocation.latitude,
            longitude: myLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {players.map((player) => (
            <PlayerMarker
              key={player.id}
              player={player}
              isCurrentUser={player.id === currentUser?.id}
            />
          ))}
        </MapView>
      </View>
      
      {isHost && (
        <TouchableOpacity 
          style={styles.startButton}
          onPress={handleStartGame}
        >
          <Text style={styles.startButtonText}>Start Game</Text>
        </TouchableOpacity>
      )}

      {!isHost && (
        <Text style={styles.waitingText}>
          Waiting for host to start the game...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  playersText: {
    fontSize: 18,
    marginVertical: 10,
    fontWeight: 'bold',
  },
  hostNote: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'normal',
  },
  playersList: {
    maxHeight: 150,
    marginBottom: 15,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
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
  mapContainer: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 15,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  waitingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  }
});