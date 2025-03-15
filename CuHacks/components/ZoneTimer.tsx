import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface ZoneTimerProps {
  timeToMove: number;
  isMoving: boolean;
  moveDuration?: number;
  moveProgress?: number;
}

export default function ZoneTimer({ 
  timeToMove, 
  isMoving, 
  moveDuration = 30,
  moveProgress = 0
}: ZoneTimerProps) {
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      {isMoving ? (
        <View style={styles.movingContainer}>
          <Text style={styles.movingText}>STORM MOVING</Text>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${moveProgress * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.timeText}>
            {formatTime(Math.ceil(moveDuration * (1 - moveProgress)))}
          </Text>
        </View>
      ) : (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>STORM SHRINKS IN</Text>
          <Text style={[
            styles.countdownTime,
            timeToMove <= 10 ? styles.warningTime : null
          ]}>
            {formatTime(timeToMove)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 120,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  countdownTime: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  warningTime: {
    color: '#FF5555',
  },
  movingContainer: {
    alignItems: 'center',
  },
  movingText: {
    color: '#FF5555',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginTop: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF5555',
  },
}); 