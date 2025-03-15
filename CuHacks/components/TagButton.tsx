import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';

interface TagButtonProps {
  onPress: () => void;
  cooldown: number;
  lastTagTime: number;
  isTagger: boolean;
}

export default function TagButton({ onPress, cooldown, lastTagTime, isTagger }: TagButtonProps) {
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const animatedValue = useState(new Animated.Value(1))[0];
  
  // Update cooldown timer
  useEffect(() => {
    if (lastTagTime === 0 || !cooldown) return;

    const updateCooldown = () => {
      const elapsed = Date.now() - lastTagTime;
      const remaining = Math.max(0, Math.ceil((cooldown - elapsed) / 1000));
      setRemainingCooldown(remaining);
      
      if (remaining > 0) {
        requestAnimationFrame(updateCooldown);
      }
    };
    
    updateCooldown();
  }, [cooldown, lastTagTime]);

  // Pulse animation when ready to tag
  useEffect(() => {
    if (isTagger && remainingCooldown === 0) {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Repeat animation
        if (isTagger && remainingCooldown === 0) {
          animatedValue.setValue(1);
        }
      });
    }
  }, [animatedValue, isTagger, remainingCooldown]);

  if (!isTagger) {
    return null;
  }

  return (
    <Animated.View style={{ transform: [{ scale: animatedValue }] }}>
      <TouchableOpacity
        style={[
          styles.button,
          remainingCooldown > 0 ? styles.cooldownButton : styles.activeButton
        ]}
        onPress={remainingCooldown > 0 ? undefined : onPress}
        disabled={remainingCooldown > 0}
      >
        <Text style={styles.buttonText}>
          {remainingCooldown > 0 
            ? `Wait ${remainingCooldown}s` 
            : 'TAG!'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  activeButton: {
    backgroundColor: '#e74c3c',
  },
  cooldownButton: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});