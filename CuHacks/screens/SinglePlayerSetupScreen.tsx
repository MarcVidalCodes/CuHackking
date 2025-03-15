import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';
import { useLocation } from '../context/LocationContext';

type SinglePlayerScreenRouteProp = RouteProp<RootStackParamList, 'SinglePlayerSetup'>;
type SinglePlayerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SinglePlayerSetup'>;

export default function SinglePlayerSetupScreen() {
  const navigation = useNavigation<SinglePlayerScreenNavigationProp>();
  const route = useRoute<SinglePlayerScreenRouteProp>();
  const { startSinglePlayerGame } = useLocation();
  
  const username = route.params?.username || 'Player';
  const [aiPlayerCount, setAiPlayerCount] = useState(3);
  const [difficulty, setDifficulty] = useState('medium');
  const [gameDuration, setGameDuration] = useState(5); // Default 5 minutes
  
  const handleStartGame = () => {
    // Start single player game with AI opponents
    startSinglePlayerGame(username, aiPlayerCount, difficulty, gameDuration);
    
    // Navigate to game screen
    navigation.navigate('Game');
  };
  
  // Simple number selector instead of slider
  const incrementCount = () => {
    if (aiPlayerCount < 7) {
      setAiPlayerCount(aiPlayerCount + 1);
    }
  };
  
  const decrementCount = () => {
    if (aiPlayerCount > 1) {
      setAiPlayerCount(aiPlayerCount - 1);
    }
  };

  const incrementDuration = () => {
    if (gameDuration < 10) {
      setGameDuration(gameDuration + 1);
    }
  };
  
  const decrementDuration = () => {
    if (gameDuration > 1) {
      setGameDuration(gameDuration - 1);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Play with Gemini AI</Text>
      <Text style={styles.subtitle}>Configure your AI opponents</Text>
      
      <View style={styles.settingContainer}>
        <Text style={styles.settingLabel}>Number of AI Players:</Text>
        <View style={styles.counterContainer}>
          <TouchableOpacity 
            style={styles.counterButton} 
            onPress={decrementCount}
          >
            <Text style={styles.counterButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.counterValue}>{aiPlayerCount}</Text>
          <TouchableOpacity 
            style={styles.counterButton} 
            onPress={incrementCount}
          >
            <Text style={styles.counterButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.settingContainer}>
        <Text style={styles.settingLabel}>AI Difficulty:</Text>
        <View style={styles.difficultyContainer}>
          {['easy', 'medium', 'hard'].map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.difficultyButton,
                difficulty === level && styles.selectedDifficulty
              ]}
              onPress={() => setDifficulty(level)}
            >
              <Text style={[
                styles.difficultyText,
                difficulty === level && styles.selectedDifficultyText
              ]}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.settingContainer}>
        <Text style={styles.settingLabel}>Game Duration:</Text>
        <View style={styles.counterContainer}>
          <TouchableOpacity 
            style={styles.counterButton} 
            onPress={decrementDuration}
          >
            <Text style={styles.counterButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.counterValue}>{gameDuration} minutes</Text>
          <TouchableOpacity 
            style={styles.counterButton} 
            onPress={incrementDuration}
          >
            <Text style={styles.counterButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartGame}
        >
          <Text style={styles.startButtonText}>Start Game</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Define styles INSIDE the component file
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  settingContainer: {
    marginBottom: 30,
  },
  settingLabel: {
    fontSize: 18,
    marginBottom: 15,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButton: {
    width: 50,
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    alignItems: 'center', 
    justifyContent: 'center',
  },
  counterButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  counterValue: {
    fontSize: 20,
    marginHorizontal: 20,
    fontWeight: 'bold',
    width: 100,
    textAlign: 'center',
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    flex: 1,
    padding: 15,
    margin: 5,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  selectedDifficulty: {
    backgroundColor: '#4285F4',
  },
  difficultyText: {
    fontSize: 16,
  },
  selectedDifficultyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  backButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  startButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});