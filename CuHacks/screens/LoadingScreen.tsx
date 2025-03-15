import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';
import { useLocation } from '../context/LocationContext';
import wolframAlphaService from '../services/wolframAlphaService';

const { width } = Dimensions.get('window');
const BAR_WIDTH = width * 0.8;

type LoadingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Loading'>;

export default function LoadingScreen() {
  const navigation = useNavigation<LoadingScreenNavigationProp>();
  const { players } = useLocation();
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);
  const [locationFacts, setLocationFacts] = useState<string[]>([
    'Loading interesting facts about this location...'
  ]);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);

  // Find the host player to get their location
  useEffect(() => {
    const fetchLocationFacts = async () => {
      // Find the host player
      const hostPlayer = players.find(player => player.isHost);
      
      if (hostPlayer && hostPlayer.location) {
        try {
          // Get location facts from Wolfram Alpha
          const facts = await wolframAlphaService.getLocationFacts(hostPlayer.location);
          setLocationFacts(facts.length > 0 ? facts : [
            'Did you know? GPS technology was originally developed for military use.',
            'The game of tag has been played for centuries across many cultures.',
            'The average human can run at about 24 km/h for short bursts.',
            'Quick direction changes improve your chances in a game of tag.',
            'In tag, the optimal strategy is to keep moving in unpredictable patterns.'
          ]);
        } catch (error) {
          console.error('Failed to fetch location facts:', error);
        }
      }
    };
    
    fetchLocationFacts();
  }, [players]);

  // Rotate through facts during loading
  useEffect(() => {
    if (locationFacts.length <= 1) return;
    
    const factInterval = setInterval(() => {
      setCurrentFactIndex(prev => (prev + 1) % locationFacts.length);
    }, 5000); // Switch facts every 5 seconds
    
    return () => clearInterval(factInterval);
  }, [locationFacts]);

  useEffect(() => {
    Animated.timing(loadingProgress, {
      toValue: BAR_WIDTH,
      duration: 10000,
      useNativeDriver: false
    }).start(({ finished }) => {
      if (finished) {
        setIsLoadingComplete(true);
      }
    });
  }, []);

  useEffect(() => {
    if (isLoadingComplete) {
      navigation.replace('Game');
    }
  }, [isLoadingComplete, navigation]);

  return (
    <LinearGradient
      colors={['#4c669f', '#3b5998', '#192f6a']}
      style={styles.container}
    >
      <Text style={styles.title}>Preparing Game...</Text>
      
      <View style={styles.factContainer}>
        <Text style={styles.factLabel}>Did You Know?</Text>
        <Text style={styles.factText}>
          {locationFacts[currentFactIndex]}
        </Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <Animated.View 
            style={[
              styles.progressBar,
              {
                width: loadingProgress
              }
            ]}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  factContainer: {
    width: BAR_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 30,
  },
  factLabel: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  factText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  progressContainer: {
    width: BAR_WIDTH,
    alignItems: 'center',
  },
  progressBackground: {
    width: '100%',
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  }
});