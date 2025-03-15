import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';

const { width } = Dimensions.get('window');
const BAR_WIDTH = width * 0.8;

type LoadingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Loading'>;

export default function LoadingScreen() {
  const navigation = useNavigation<LoadingScreenNavigationProp>();
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);

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
    marginBottom: 40,
    fontWeight: 'bold',
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