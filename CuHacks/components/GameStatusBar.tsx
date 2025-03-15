import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatTime } from '../utils/timeUtils';

interface GameStatusBarProps {
  itPlayerName: string;
  isCurrentPlayerIt: boolean;
  playersCount: number;
  timeRemaining: number | null;
}

export default function GameStatusBar({ 
  itPlayerName, 
  isCurrentPlayerIt,
  playersCount,
  timeRemaining 
}: GameStatusBarProps) {
  // Format the time for display
  const formattedTime = formatTime(timeRemaining);

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.infoText}>
          {isCurrentPlayerIt 
            ? 'You are IT! Chase others! 🏃‍♂️' 
            : `${itPlayerName} is IT! Run! 😱`}
        </Text>
      </View>
      
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>⏱️ {formattedTime}</Text>
      </View>
      
      <View style={styles.playersContainer}>
        <Text style={styles.playersText}>
          {playersCount} players
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    padding: 10,
  },
  statusContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 20,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  timeContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 15,
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  playersContainer: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 15,
    position: 'absolute',
    top: 10,
    right: 20,
  },
  playersText: {
    fontSize: 14,
    fontWeight: 'bold',
  }
});