/*
          By using this application, you agree to the following terms:{'\n\n'}
          1. Location Services: This app requires access to your device's location services to function properly.{'\n\n'}
          2. Data Usage: Your location data will be shared with other players during gameplay.{'\n\n'}
          3. Fair Play: You agree to play fairly and not exploit any game mechanics.{'\n\n'}
          4. Safety: You are responsible for your own safety while playing the game.{'\n\n'}
          5. Privacy: Your location data will only be used during active gameplay sessions.
          
*/

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../navigation';

type TermsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Terms'>;

export default function TermsScreen() {
  const [isChecked, setIsChecked] = useState(false);
  const navigation = useNavigation<TermsScreenNavigationProp>();

  const handleContinue = () => {
    if (isChecked) {
      navigation.replace('Lobby');
    }
  };

  return (
    <LinearGradient
      colors={['#4c669f', '#3b5998', '#192f6a']}
      style={styles.container}
    >
      <Text style={styles.title}>Terms and Conditions</Text>
      
      <ScrollView style={styles.termsContainer}>
        <Text style={styles.termsText}>
          Welcome to Tag Royale!{'\n\n'}
          By using this application, you agree to the following terms:{'\n\n'}
          1. Location Services: This app requires access to your device's location services to function properly.{'\n\n'}
          2. Data Usage: Your location data will be shared with other players during gameplay.{'\n\n'}
          3. Fair Play: You agree to play fairly and not exploit any game mechanics.{'\n\n'}
          4. Safety: You are responsible for your own safety while playing the game.{'\n\n'}
          5. Privacy: Your location data will only be used during active gameplay sessions.
        </Text>
      </ScrollView>

      <View style={styles.checkboxContainer}>
        <TouchableOpacity 
          style={[styles.checkbox, isChecked && styles.checkboxChecked]} 
          onPress={() => setIsChecked(!isChecked)}
        >
          {isChecked && <MaterialIcons name="check" size={20} color="white" />}
        </TouchableOpacity>
        <Text style={styles.checkboxLabel}>
          I have read and agree to the terms and conditions
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.continueButton, !isChecked && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={!isChecked}
      >
        <Text style={styles.continueButtonText}>Continue to Game</Text>
        {isChecked && <MaterialIcons name="arrow-forward" size={24} color="white" />}
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: '15%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  termsContainer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  termsText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 6,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkboxLabel: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
});