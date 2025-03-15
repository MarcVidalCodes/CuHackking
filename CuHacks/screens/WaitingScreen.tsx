import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocation } from '../context/LocationContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';

type WaitingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Waiting'>;

export default function WaitingScreen() {
  const navigation = useNavigation<WaitingScreenNavigationProp>();
  const [showSettings, setShowSettings] = useState(false);
  const [gameDuration, setGameDuration] = useState(5);
  const [initialCircleSize, setInitialCircleSize] = useState(100); // Add initial circle size state
  const { players, isHost, startGame, updateGameSettings, gameStarted } = useLocation();

  useEffect(() => {
    if (gameStarted) {
      navigation.replace('Loading');
    }
  }, [gameStarted, navigation]);

  const renderPlayer = ({ item }) => (
    <View style={styles.playerCard}>
      <MaterialIcons name="person" size={24} color="white" />
      <Text style={styles.playerName}>{item.username}</Text>
      {item.isHost && <Text style={styles.hostBadge}>Host</Text>}
    </View>
  );

  const handleStartGame = async () => {
    updateGameSettings({ 
      duration: gameDuration,
      initialCircleSize: initialCircleSize // Include circle size in settings
    });
    await startGame();
    navigation.replace('Loading'); // Navigate to loading instead of game
  };

  return (
    <LinearGradient
      colors={['#4c669f', '#3b5998', '#192f6a']}
      style={styles.container}
    >
      <Text style={styles.title}>Waiting Room</Text>
      
      <View style={styles.playersContainer}>
        <Text style={styles.subtitle}>Players ({players.length})</Text>
        <FlatList
          data={players}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.playersList}
        />
      </View>

      {isHost && (
        <View style={styles.hostControls}>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
          >
            <MaterialIcons name="settings" size={24} color="white" />
            <Text style={styles.buttonText}>Game Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartGame}
          >
            <MaterialIcons name="play-arrow" size={24} color="white" />
            <Text style={styles.buttonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showSettings}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Game Settings</Text>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Game Duration (minutes)</Text>
              <TouchableOpacity 
                style={styles.durationButton}
                onPress={() => setGameDuration(Math.max(1, gameDuration - 1))}
              >
                <MaterialIcons name="remove" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.durationText}>{gameDuration}</Text>
              <TouchableOpacity 
                style={styles.durationButton}
                onPress={() => setGameDuration(gameDuration + 1)}
              >
                <MaterialIcons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            {/* Add new setting for initial circle size */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Initial Safe Zone Size (meters)</Text>
              <TouchableOpacity 
                style={styles.durationButton}
                onPress={() => setInitialCircleSize(Math.max(50, initialCircleSize - 10))}
              >
                <MaterialIcons name="remove" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.durationText}>{initialCircleSize}</Text>
              <TouchableOpacity 
                style={styles.durationButton}
                onPress={() => setInitialCircleSize(initialCircleSize + 10)}
              >
                <MaterialIcons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.buttonText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginVertical: 20,
  },
  playersContainer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 15,
  },
  subtitle: {
    fontSize: 20,
    color: 'white',
    marginBottom: 10,
  },
  playersList: {
    padding: 10,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  playerName: {
    color: 'white',
    fontSize: 18,
    marginLeft: 10,
    flex: 1,
  },
  hostBadge: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hostControls: {
    marginTop: 20,
    gap: 10,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#3b5998',
    padding: 20,
    borderRadius: 15,
    width: '80%',
  },
  modalTitle: {
    fontSize: 24,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  settingLabel: {
    color: 'white',
    fontSize: 14,
  },
  durationButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 0.5,
    borderRadius: 5,
  },
  durationText: {
    color: 'white',
    fontSize: 14,
    marginHorizontal: 2,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
});