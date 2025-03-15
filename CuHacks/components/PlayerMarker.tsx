import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Player } from '../types';

interface PlayerMarkerProps {
  player: Player;
  isCurrentUser: boolean;
}

export default function PlayerMarker({ player, isCurrentUser }: PlayerMarkerProps) {
  if (!player.location || 
      typeof player.location.latitude !== 'number' || 
      isNaN(player.location.latitude)) {
    return null;
  }
  
  return (
    <Marker
      coordinate={{
        latitude: player.location.latitude,
        longitude: player.location.longitude,
      }}
    >
      <View style={[
        styles.markerContainer, 
        isCurrentUser ? styles.currentUserMarker : styles.otherUserMarker
      ]}>
        <Text style={styles.markerText}>
          {player.username.charAt(0).toUpperCase()}
        </Text>
        {player.isHost && <View style={styles.hostIndicator} />}
      </View>
      
      <Callout>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{player.username}</Text>
          <Text>{isCurrentUser ? "(You)" : ""}</Text>
          {player.isHost && <Text style={styles.hostText}>Host</Text>}
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  currentUserMarker: {
    backgroundColor: '#4285F4',
  },
  otherUserMarker: {
    backgroundColor: '#34A853',
  },
  markerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  hostIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFC107',
    borderWidth: 2,
    borderColor: 'white',
  },
  callout: {
    padding: 8,
    width: 120,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  hostText: {
    fontSize: 12,
    color: '#FFC107',
    fontWeight: 'bold',
    marginTop: 2,
  }
});