import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocation } from '../context/LocationContext';

export default function GameStatusBar() {
  const { currentUser, gameStarted, currentTagger, players } = useLocation();
  
  if (!gameStarted || !currentUser) {
    return null;
  }
  
  // Find current tagger
  const tagger = players.find(player => player.id === currentTagger);
  const isUserTagger = currentUser.id === currentTagger;
  
  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        {isUserTagger ? (
          <Text style={[styles.statusText, styles.taggerText]}>
            You are IT! Find and tag someone!
          </Text>
        ) : (
          <Text style={styles.statusText}>
            {tagger ? `${tagger.username} is IT! Run away!` : 'Game in progress'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  statusBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  taggerText: {
    color: '#FF5252',
  }
});