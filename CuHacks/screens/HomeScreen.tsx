import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLocation } from '../context/LocationContext';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { myLocation, error, joinGame } = useLocation();
  const [username, setUsername] = useState('');

  const handleJoinGame = () => {
    if (username.trim().length === 0) {
      alert('Please enter a username');
      return;
    }
    
    joinGame(username);
    navigation.navigate('Lobby' as never);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Tag Game</Text>
      
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <Text style={styles.locationText}>
          {myLocation ? 'Location services ready!' : 'Getting your location...'}
        </Text>
      )}
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Enter your username:</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
      </View>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleJoinGame}
        disabled={!myLocation || !!error}
      >
        <Text style={styles.buttonText}>Join Game</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  locationText: {
    fontSize: 16,
    color: 'green',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  }
});