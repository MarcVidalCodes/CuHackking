import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Player } from '../types';

interface PlayersListProps {
  players: Player[];
  currentUserId: string | undefined;
}

export default function PlayersList({ players, currentUserId }: PlayersListProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Players: {players.length}</Text>
      <ScrollView style={styles.scrollView}>
        {players.map(player => (
          <View key={player.id} style={styles.playerRow}>
            <Text style={[
              styles.playerName,
              player.id === currentUserId && styles.currentUser
            ]}>
              {player.username}
            </Text>
            {player.isIt && <Text style={styles.itBadge}>IT</Text>}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 160, // Move it higher to avoid conflicts with the tag button
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    padding: 10,
    maxHeight: 200,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  scrollView: {
    maxHeight: 160,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  playerName: {
    flex: 1,
  },
  currentUser: {
    fontWeight: 'bold',
  },
  itBadge: {
    backgroundColor: 'red',
    color: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 'bold',
  }
});