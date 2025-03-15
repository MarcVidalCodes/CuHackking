import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocation } from '../context/LocationContext';
import { Player } from '../types';

interface PlayerItemProps {
  player: Player;
  isCurrentUser: boolean;
}

export default function PlayerItem({ player, isCurrentUser }: PlayerItemProps) {
  const { isHost, transferHost, currentUser } = useLocation();
  
  const canTransferHost = isHost && currentUser?.id !== player.id && !player.isHost;
  
  const handleTransferHost = () => {
    if (canTransferHost) {
      transferHost(player.id);
    }
  };

  return (
    <View style={[
      styles.container,
      isCurrentUser ? styles.currentUserContainer : null
    ]}>
      <View style={styles.infoContainer}>
        <Text style={styles.username}>
          {player.username}
        </Text>
        <View style={styles.tagsContainer}>
          {player.isHost && (
            <View style={styles.hostTag}>
              <Text style={styles.hostTagText}>Host</Text>
            </View>
          )}
          {isCurrentUser && (
            <View style={styles.meTag}>
              <Text style={styles.meTagText}>You</Text>
            </View>
          )}
        </View>
      </View>
      
      {canTransferHost && (
        <TouchableOpacity 
          style={styles.transferButton}
          onPress={handleTransferHost}
        >
          <Text style={styles.transferText}>Make Host</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentUserContainer: {
    backgroundColor: '#f0f8ff',
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  hostTag: {
    backgroundColor: '#FFC107',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  hostTagText: {
    fontSize: 12,
    color: '#000',
  },
  meTag: {
    backgroundColor: '#4285F4',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  meTagText: {
    fontSize: 12,
    color: 'white',
  },
  transferButton: {
    backgroundColor: '#34A853',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  transferText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});