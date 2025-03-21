import { Player, Coordinates } from '../types';
import geminiAIService from './geminiAiService';

export class AIPlayerManager {
  private aiPlayers: Player[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private movementInterval: NodeJS.Timeout | null = null;
  private lastApiUpdate = 0;
  private apiUpdateFrequency = 30000; // 30 seconds between API calls
  private movementUpdateFrequency = 1000; // More frequent small movements
  private targetPositions: Record<string, Coordinates> = {}; // Store target positions for each AI
  
  constructor() {}
  
  generateAIPlayers(
    count: number, 
    humanLocation: Coordinates,
    difficulty: string = 'medium'
  ): Player[] {
    this.aiPlayers = [];
    this.targetPositions = {};
    
    // Names for AI players
    const aiNameOptions = [
      'Hunter', 'Runner', 'Speedy', 'Tactician', 'Tracker',
      'Shadow', 'Dodger', 'Phantom', 'Chaser', 'Navigator'
    ];
    
    // Generate AI players around the human's location
    for (let i = 0; i < count; i++) {
      const randomName = aiNameOptions[Math.floor(Math.random() * aiNameOptions.length)];
      
      // Generate a random position near the human (10-100m away)
      const randomOffset = {
        latitude: (Math.random() * 0.0015 - 0.00075), // About 50-150m in each direction
        longitude: (Math.random() * 0.0015 - 0.00075)
      };
      
      const position = {
        latitude: humanLocation.latitude + randomOffset.latitude,
        longitude: humanLocation.longitude + randomOffset.longitude
      };
      
      const newPlayer = {
        id: `ai-${Date.now()}-${i}`,
        username: `AI-${randomName}`,
        location: position,
        isIt: false, // Human starts as "it"
        isHost: false,
        isAI: true,
        difficulty
      };
      
      this.aiPlayers.push(newPlayer);
      this.targetPositions[newPlayer.id] = position;
    }
    
    return this.aiPlayers;
  }
  
  startUpdating(
    humanPlayer: Player,
    allPlayers: Player[],
    onUpdate: (updatedPlayers: Player[]) => void,
    gameRadius: number = 250
  ) {
    // Clear any existing intervals
    this.stopUpdating();
    
    console.log(`Starting AI updates for ${this.aiPlayers.length} AI players`);
    
    // Initialize target positions if not set
    this.aiPlayers.forEach(player => {
      if (!this.targetPositions[player.id]) {
        this.targetPositions[player.id] = player.location;
      }
    });
    
    // Set up strategic direction updates (less frequent)
    this.updateInterval = setInterval(async () => {
      const now = Date.now();
      
      // Update strategic targets every 3 seconds instead of 30
      if (now - this.lastApiUpdate >= 3000) {
        this.lastApiUpdate = now;
        console.log("Making strategic AI position updates");
        
        // Get fresh copies of players
        const currentHuman = allPlayers.find(p => p.id === humanPlayer.id) || humanPlayer;
        const currentPlayers = allPlayers;
        
        // Find who is "it" now
        const itPlayer = allPlayers.find(p => p.isIt);
        
        // Update target positions for each AI player
        for (const aiPlayer of this.aiPlayers) {
          try {
            // If this AI is "it", make it chase other players
            if (aiPlayer.isIt) {
              console.log(`${aiPlayer.username} is IT - actively chasing`);
              
              // Find closest player to chase
              let closestDist = Infinity;
              let closestPlayer = currentHuman;
              
              for (const player of currentPlayers) {
                if (player.id === aiPlayer.id) continue; // Skip self
                
                const dist = this.getDistance(aiPlayer.location, player.location);
                if (dist < closestDist) {
                  closestDist = dist;
                  closestPlayer = player;
                }
              }
              
              // Set target directly at the closest player
              this.targetPositions[aiPlayer.id] = {
                latitude: closestPlayer.location.latitude,
                longitude: closestPlayer.location.longitude
              };
            } else {
              // If not "it", run away from "it"
              if (itPlayer) {
                console.log(`${aiPlayer.username} running from ${itPlayer.username}`);
                
                // Calculate vector away from "it" player
                const moveX = aiPlayer.location.longitude - itPlayer.location.longitude;
                const moveY = aiPlayer.location.latitude - itPlayer.location.latitude;
                
                // Normalize for a consistent distance
                const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
                if (magnitude > 0) {
                  // Set target about 50m away in the escape direction
                  this.targetPositions[aiPlayer.id] = {
                    latitude: aiPlayer.location.latitude + (moveY / magnitude) * 0.0005,
                    longitude: aiPlayer.location.longitude + (moveX / magnitude) * 0.0005
                  };
                } else {
                  // Random direction if same position
                  this.targetPositions[aiPlayer.id] = {
                    latitude: aiPlayer.location.latitude + (Math.random() - 0.5) * 0.0005,
                    longitude: aiPlayer.location.longitude + (Math.random() - 0.5) * 0.0005
                  };
                }
              } else {
                // If no one is "it", get normal move
                const newPosition = await geminiAIService.getNextMove(
                  aiPlayer, currentPlayers, currentHuman, gameRadius
                );
                this.targetPositions[aiPlayer.id] = newPosition;
              }
            }
          } catch (e) {
            console.error(`AI strategy error for ${aiPlayer.username}:`, e);
            // If API fails, use default behavior
            this.targetPositions[aiPlayer.id] = this.getDefaultTargetPosition(
              aiPlayer, currentPlayers, currentHuman, gameRadius
            );
          }
        }
      }
    }, 3000); // Check every 3 seconds instead of 10
    
    // Set up movement updates (much more frequent for smoother animation)
    this.movementInterval = setInterval(() => {
      const updatedPlayers: Player[] = [];
      
      // Update each AI player's position toward target
      for (const aiPlayer of this.aiPlayers) {
        const target = this.targetPositions[aiPlayer.id];
        if (!target) continue;
        
        // Find the current player to get latest state
        const currentPlayer = allPlayers.find(p => p.id === aiPlayer.id) || aiPlayer;
        
        // Higher interpolation factor for "it" player (faster chase)
        const baseFactor = currentPlayer.isIt ? 0.5 : 0.1;
        
        // Interpolate toward target position with slight randomness
        const interpolatedPosition = this.interpolatePosition(
          currentPlayer.location,
          target,
          baseFactor,
          aiPlayer.difficulty || 'medium'
        );
        
        updatedPlayers.push({
          ...currentPlayer,
          location: interpolatedPosition
        });
      }
      
      this.aiPlayers = updatedPlayers;
      onUpdate(updatedPlayers);
    }, 300); // Update every 300ms instead of 1000ms
  }
  
  private interpolatePosition(
    current: Coordinates, 
    target: Coordinates, 
    factor: number,
    difficulty: string
  ): Coordinates {
    // DRAMATICALLY INCREASED factor by 5x
    factor = factor * 5;
    
    // Add some randomness based on difficulty
    let randomFactor = 0;
    if (difficulty === 'easy') randomFactor = 0.0001;
    else if (difficulty === 'medium') randomFactor = 0.00005;
    else if (difficulty === 'hard') randomFactor = 0.00002;
    
    // Calculate the interpolated position with random drift
    return {
      latitude: current.latitude + (target.latitude - current.latitude) * factor + 
                (Math.random() - 0.5) * randomFactor,
      longitude: current.longitude + (target.longitude - current.longitude) * factor + 
                 (Math.random() - 0.5) * randomFactor
    };
  }
  
  private getDefaultTargetPosition(
    aiPlayer: Player, 
    allPlayers: Player[], 
    humanPlayer: Player,
    gameRadius: number = 250
  ): Coordinates {
    // Get the current position
    const current = aiPlayer.location;
    
    // Simple algorithm for when API fails
    const moveDirection = { lat: 0, lng: 0 };
    
    if (aiPlayer.isIt) {
      // If AI is "it", move toward human player
      moveDirection.lat = humanPlayer.location.latitude > current.latitude ? 1 : -1;
      moveDirection.lng = humanPlayer.location.longitude > current.longitude ? 1 : -1;
    } else {
      // If AI is not "it", move away from whoever is "it"
      const itPlayer = allPlayers.find(p => p.isIt) || humanPlayer;
      moveDirection.lat = itPlayer.location.latitude > current.latitude ? -1 : 1;
      moveDirection.lng = itPlayer.location.longitude > current.longitude ? -1 : 1;
    }
    
    // Add some randomness
    moveDirection.lat += (Math.random() - 0.5) * 0.5;
    moveDirection.lng += (Math.random() - 0.5) * 0.5;
    
    // Make larger movements by multiplying the speed
    const speedMultiplier = aiPlayer.difficulty === 'hard' ? 0.0002 : 
                           (aiPlayer.difficulty === 'easy' ? 0.00005 : 0.0001);
    
    const newPosition = {
      latitude: current.latitude + (moveDirection.lat * speedMultiplier),
      longitude: current.longitude + (moveDirection.lng * speedMultiplier)
    };
    
    // Use the geminiAIService boundary check (reuse their functionality)
    return geminiAIService['ensureWithinBoundary'](
      newPosition,
      humanPlayer.location,
      gameRadius
    );
  }
  
  private getDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1.latitude * Math.PI/180;
    const φ2 = coord2.latitude * Math.PI/180;
    const Δφ = (coord2.latitude-coord1.latitude) * Math.PI/180;
    const Δλ = (coord2.longitude-coord1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  stopUpdating() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.movementInterval) {
      clearInterval(this.movementInterval);
      this.movementInterval = null;
    }
  }
  
  getAIPlayers(): Player[] {
    return this.aiPlayers;
  }
}

export const aiPlayerManager = new AIPlayerManager();
export default aiPlayerManager;