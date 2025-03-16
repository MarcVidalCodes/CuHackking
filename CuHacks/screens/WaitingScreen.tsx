import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocation } from '../context/LocationContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';
import socketService from '../services/socketService';

type WaitingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Waiting'>;

export default function WaitingScreen() {
  const navigation = useNavigation<WaitingScreenNavigationProp>();
  const [showSettings, setShowSettings] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false); // Add this missing state variable
  
  const { 
    players, 
    isHost, 
    startGame, 
    updateGameSettings, 
    gameStarted, 
    currentUser,
    gameSettings, // Add this to access current game settings
    setPlayers // Add setPlayers from context
  } = useLocation();

  // Initialize setting states from gameSettings
  const [gameDuration, setGameDuration] = useState(gameSettings?.duration || 5);
  const [initialCircleSize, setInitialCircleSize] = useState(gameSettings?.initialCircleSize || 100);
  const [circleShrinkPercent, setCircleShrinkPercent] = useState(gameSettings?.circleShrinkPercent || 30);
  const [shrinkDuration, setShrinkDuration] = useState(gameSettings?.shrinkDuration || 30);
  const [shrinkInterval, setShrinkInterval] = useState(gameSettings?.shrinkInterval || 10);

  // Update local state when gameSettings change
  useEffect(() => {
    if (gameSettings) {
      if (gameSettings.duration) setGameDuration(gameSettings.duration);
      if (gameSettings.initialCircleSize) setInitialCircleSize(gameSettings.initialCircleSize);
      if (gameSettings.circleShrinkPercent) setCircleShrinkPercent(gameSettings.circleShrinkPercent);
      if (gameSettings.shrinkDuration) setShrinkDuration(gameSettings.shrinkDuration);
      if (gameSettings.shrinkInterval) setShrinkInterval(gameSettings.shrinkInterval);
    }
  }, [gameSettings]);

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
    // Apply ALL current settings before starting the game
    const currentSettings = {
      duration: gameDuration,
      initialCircleSize: initialCircleSize,
      circleShrinkPercent: circleShrinkPercent,
      shrinkDuration: shrinkDuration,
      shrinkInterval: shrinkInterval
    };
    
    console.log("🎲 Starting game with settings:", currentSettings);
    
    // First update settings explicitly
    updateGameSettings(currentSettings);
    
    // Then start game with the same settings for redundancy
    await startGame(currentSettings);
    
    // Navigate to loading screen
    navigation.replace('Loading');
  };

  const handleTransferHost = (newHostId: string) => {
    if (isHost) {
      // Emit transfer event
      socketService.emit('transferHost', { 
        newHostId,
        currentHostId: currentUser?.id 
      });

      // Update local state
      setPlayers(prevPlayers => 
        prevPlayers.map(player => ({
          ...player,
          isHost: player.id === newHostId
        }))
      );

      // Close modal and show confirmation
      setShowTransferModal(false);
      Alert.alert('Host Transferred', 'Host abilities have been transferred successfully');
    }
  };

  // Function to save settings when they change
  const handleSettingsChange = (setting, value) => {
    switch(setting) {
      case 'duration':
        setGameDuration(value);
        break;
      case 'initialCircleSize':
        setInitialCircleSize(value);
        break;
      case 'circleShrinkPercent':
        setCircleShrinkPercent(value);
        break;
      case 'shrinkDuration':
        setShrinkDuration(value);
        break;
      case 'shrinkInterval':
        setShrinkInterval(value);
        break;
    }
    
    // Update context immediately
    updateGameSettings({
      duration: setting === 'duration' ? value : gameDuration,
      initialCircleSize: setting === 'initialCircleSize' ? value : initialCircleSize,
      circleShrinkPercent: setting === 'circleShrinkPercent' ? value : circleShrinkPercent,
      shrinkDuration: setting === 'shrinkDuration' ? value : shrinkDuration,
      shrinkInterval: setting === 'shrinkInterval' ? value : shrinkInterval
    });
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

          <TouchableOpacity 
            style={styles.transferButton}
            onPress={() => setShowTransferModal(true)}
          >
            <MaterialIcons name="switch-account" size={24} color="white" />
            <Text style={styles.buttonText}>Transfer Host</Text>
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
              <Text style={styles.settingLabel}>Game Duration (min)</Text>
              <View style={styles.settingControls}>
                <TouchableOpacity 
                  style={styles.durationButton}
                  onPress={() => handleSettingsChange('duration', Math.max(1, gameDuration - 1))}
                >
                  <MaterialIcons name="remove" size={20} color="white" />
                </TouchableOpacity>
                <Text style={styles.durationText}>{gameDuration}</Text>
                <TouchableOpacity 
                  style={styles.durationButton}
                  onPress={() => handleSettingsChange('duration', gameDuration + 1)}
                >
                  <MaterialIcons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Initial Safe Zone (m)</Text>
              <View style={styles.settingControls}>
                <TouchableOpacity 
                  style={styles.durationButton}
                  onPress={() => handleSettingsChange('initialCircleSize', Math.max(50, initialCircleSize - 10))}
                >
                  <MaterialIcons name="remove" size={20} color="white" />
                </TouchableOpacity>
                <Text style={styles.durationText}>{initialCircleSize}</Text>
                <TouchableOpacity 
                  style={styles.durationButton}
                  onPress={() => handleSettingsChange('initialCircleSize', initialCircleSize + 10)}
                >
                  <MaterialIcons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Shrink By (%)</Text>
              <View style={styles.settingControls}>
                <TouchableOpacity 
                  style={styles.durationButton}
                  onPress={() => handleSettingsChange('circleShrinkPercent', Math.max(10, circleShrinkPercent - 5))}
                >
                  <MaterialIcons name="remove" size={20} color="white" />
                </TouchableOpacity>
                <Text style={styles.durationText}>{circleShrinkPercent}</Text>
                <TouchableOpacity 
                  style={styles.durationButton}
                  onPress={() => handleSettingsChange('circleShrinkPercent', Math.min(50, circleShrinkPercent + 5))}
                >
                  <MaterialIcons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Shrink Duration (sec)</Text>
              <View style={styles.settingControls}>
                <TouchableOpacity 
                  style={styles.durationButton}
                  onPress={() => handleSettingsChange('shrinkDuration', Math.max(1, shrinkDuration - 1))}
                >
                  <MaterialIcons name="remove" size={20} color="white" />
                </TouchableOpacity>
                <Text style={styles.durationText}>{shrinkDuration}</Text>
                <TouchableOpacity 
                  style={styles.durationButton}
                  onPress={() => handleSettingsChange('shrinkDuration', shrinkDuration + 1)}
                >
                  <MaterialIcons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Shrink Interval (sec)</Text>
              <View style={styles.settingControls}>
                <TouchableOpacity 
                  style={styles.durationButton}
                  onPress={() => handleSettingsChange('shrinkInterval', Math.max(5, shrinkInterval - 1))}
                >
                  <MaterialIcons name="remove" size={20} color="white" />
                </TouchableOpacity>
                <Text style={styles.durationText}>{shrinkInterval}</Text>
                <TouchableOpacity 
                  style={styles.durationButton}
                  onPress={() => handleSettingsChange('shrinkInterval', shrinkInterval + 1)}
                >
                  <MaterialIcons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.buttonText}>Close Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTransferModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select New Host</Text>
            <FlatList
              data={players.filter(p => p.id !== currentUser?.id)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.playerTransferItem}
                  onPress={() => handleTransferHost(item.id)}
                >
                  <MaterialIcons name="person" size={24} color="white" />
                  <Text style={styles.playerTransferName}>{item.username}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowTransferModal(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
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
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
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
    padding: 15,
    borderRadius: 15,
    width: '85%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settingLabel: {
    color: 'white',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  settingControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 6,
    borderRadius: 5,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationText: {
    color: 'white',
    fontSize: 14,
    width: 30,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerTransferItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  playerTransferName: {
    color: 'white',
    fontSize: 18,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#FF0000',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  }
});