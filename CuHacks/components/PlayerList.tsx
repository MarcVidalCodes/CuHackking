import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Player } from '../types';

interface PlayersListProps {
  players: Player[];
  currentUserId?: string;
}

export default function PlayersList({ players, currentUserId }: PlayersListProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    // Sort by score (if available)
    if (a.score !== undefined && b.score !== undefined) {
      return b.score - a.score;
    }
    return 0;
  });

  const renderItem = ({ item }: { item: Player }) => {
    const isCurrentUser = item.id === currentUserId;
    const isTagger = item.isTagger;
    
    return (
      <View style={[
        styles.playerItem,
        isCurrentUser && styles.currentUserItem,
        isTagger && styles.taggerItem
      ]}>
        <View style={styles.playerInfo}>
          <Text style={[
            styles.playerName, 
            isTagger && styles.taggerName
          ]}>
            {item.username} {isCurrentUser ? '(You)' : ''}
          </Text>
          
          {item.isHost && <Text style={styles.hostTag}>Host</Text>}
        </View>
        
        {item.score !== undefined && (
          <Text style={styles.scoreText}>{item.score}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedPlayers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentUserItem: {
    backgroundColor: '#f0f8ff',
  },
  taggerItem: {
    backgroundColor: '#fff3f3',
  },
  playerName: {
    fontSize: 16,
  },
  taggerName: {
    color: '#FF5252',
    fontWeight: 'bold',
  },
  hostTag: {
    backgroundColor: '#FFC107',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 12,
    marginLeft: 8,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  }
});