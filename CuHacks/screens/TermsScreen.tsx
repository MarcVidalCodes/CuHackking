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
    <View style={styles.container}>
      <Text style={styles.title}>Terms and Conditions</Text>
      
      <ScrollView style={styles.termsContainer}>
        <Text style={styles.termsText}>
          Please agree to the following terms:{'\n\n'}
          1. Location Services: I want your location baby gurl{'\n\n'}
          2. Data Usage: MMMMMM DATAAAAAA{'\n\n'}
          3. Fair Play: No hacking noob{'\n\n'}
          4. Safety: Be safe loser {'\n\n'}
          5. Have Fun!!!
          

        </Text>
      </ScrollView>
        
      <View style={styles.checkboxContainer}>
        <TouchableOpacity 
          style={styles.checkbox} 
          onPress={() => setIsChecked(!isChecked)}
        >
          {isChecked && <MaterialIcons name="check" size={24} color="#4285F4" />}
        </TouchableOpacity>
        <Text style={styles.checkboxLabel}>
          I have read and agree to the terms and conditions (L take)
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.continueButton, !isChecked && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={!isChecked}
      >
        <Text style={[styles.continueButtonText, !isChecked && styles.continueButtonTextDisabled]}>
          Continue
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  termsContainer: {
    flex: 1,
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
  },
  termsText: {
    fontSize: 16,
    lineHeight: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#4285F4',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  continueButtonTextDisabled: {
    color: '#666666',
  },
});