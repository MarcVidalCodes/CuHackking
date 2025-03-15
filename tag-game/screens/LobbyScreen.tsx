import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLocation } from '../context/LocationContext';

export default function LobbyScreen() {
  const { myLocation, username } = useLocation();

  if (!myLocation) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome, {username}!</Text>
      <Text style={styles.infoText}>This is where we'll implement the game lobby.</Text>
      
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
          <Marker
            coordinate={{
              latitude: myLocation.latitude,
              longitude: myLocation.longitude,
            }}
            title={username}
            description="Your location"
          />
        </MapView>
      </View>
      
      <Text style={styles.coordinatesText}>
        Your coordinates: {myLocation.latitude.toFixed(6)}, {myLocation.longitude.toFixed(6)}
      </Text>
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
  infoText: {
    fontSize: 16,
    marginBottom: 20,
  },
  mapContainer: {
    height: 300,
    marginVertical: 20,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  map: {
    height: '100%',
    width: '100%',
  },
  coordinatesText: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  }
});