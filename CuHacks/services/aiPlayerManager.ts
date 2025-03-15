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
    // Clear existing intervals
    this.stopUpdating();
    
    // Set AI fallback behavior immediately so there's movement even without API
    for (const aiPlayer of this.aiPlayers) {
      // Initialize with default behavior
      this.targetPositions[aiPlayer.id] = this.getDefaultTargetPosition(
        aiPlayer, 
        allPlayers, 
        humanPlayer,
        gameRadius
      );
    }
    
    // Update AI positions on a short interval regardless of API success
    const movementInterval = 300; // Update every 300ms for smooth movement
    this.movementInterval = setInterval(() => {
      // Create a copy of the AI players to modify
      const updatedPlayers: Player[] = [];
      
      // Update each AI player position, gradually moving toward targets
      for (const aiPlayer of this.aiPlayers) {
        const target = this.targetPositions[aiPlayer.id];
        if (!target) continue;
        
        // Find current player to get latest state
        const currentPlayer = allPlayers.find(p => p.id === aiPlayer.id) || aiPlayer;
        
        // Get interpolation speed based on difficulty
        const speedFactor = currentPlayer.difficulty === 'easy' ? 0.05 :
                           (currentPlayer.difficulty === 'hard' ? 0.15 : 0.1);
        
        // Move gradually toward target, with jitter for realism
        const newLocation = {
          latitude: currentPlayer.location.latitude + 
                   (target.latitude - currentPlayer.location.latitude) * speedFactor +
                   (Math.random() - 0.5) * 0.000001, // Add tiny jitter for realism
          longitude: currentPlayer.location.longitude + 
                   (target.longitude - currentPlayer.location.longitude) * speedFactor +
                   (Math.random() - 0.5) * 0.000001
        };
        
        updatedPlayers.push({
          ...currentPlayer,
          location: newLocation
        });
      }
      
      this.aiPlayers = updatedPlayers;
      onUpdate(updatedPlayers);
    }, movementInterval);
    
    // Try API updates less frequently and with more robust fallback
    this.updateInterval = setInterval(async () => {
      const now = Date.now();
      
      // Only make API calls every 30 seconds
      if (now - this.lastApiUpdate >= this.apiUpdateFrequency) {
        this.lastApiUpdate = now;
        
        // Get latest player states
        const currentHuman = allPlayers.find(p => p.id === humanPlayer.id) || humanPlayer;
        const currentPlayers = allPlayers;
        
        console.log("Computing AI target positions...");
        
        // Set new target positions for each AI player - try API but fallback to logic
        for (const aiPlayer of this.aiPlayers) {
          try {
            // Try to get strategic move from API
            const newTarget = await Promise.race([
              geminiAIService.getNextMove(
                aiPlayer, 
                currentPlayers,
                currentHuman,
                gameRadius
              ),
              // Timeout after 5 seconds to prevent blocking
              new Promise<Coordinates>((_, reject) => 
                setTimeout(() => reject(new Error("API timeout")), 5000)
              )
            ]);
            
            // Store as target position
            this.targetPositions[aiPlayer.id] = newTarget;
            
          } catch (e) {
            console.log(`Using fallback AI movement for ${aiPlayer.username}`);
            // If API fails, use default behavior
            this.targetPositions[aiPlayer.id] = this.getDefaultTargetPosition(
              aiPlayer, 
              currentPlayers, 
              currentHuman,
              gameRadius
            );
          }
        }
      }
    }, 10000); // Check every 10 seconds
  }
  
  private interpolatePosition(
    current: Coordinates, 
    target: Coordinates, 
    factor: number,
    difficulty: string
  ): Coordinates {
    // Add some randomness based on difficulty
    let randomFactor = 0;
    if (difficulty === 'easy') randomFactor = 0.0001;
    else if (difficulty === 'medium') randomFactor = 0.00005;
    else if (difficulty === 'hard') randomFactor = 0.00002; // More precise movement
    
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
    gameRadius: number
  ): Coordinates {
    // Get current position
    const current = aiPlayer.location;
    
    let moveX = 0;
    let moveY = 0;
    
    // Find who is "it"
    const itPlayer = allPlayers.find(p => p.isIt);
    if (!itPlayer) return current;
    
    // AI behavior depends on who is "it"
    if (aiPlayer.isIt) {
      // If this AI is "it", target the human player
      const targetPlayer = humanPlayer;
      
      // Calculate vector toward target player
      moveX = targetPlayer.location.longitude - current.longitude;
      moveY = targetPlayer.location.latitude - current.latitude;
    } else {
      // If AI is NOT "it", avoid whoever is "it"
      // Calculate vector away from "it" player
      moveX = current.longitude - itPlayer.location.longitude;
      moveY = current.latitude - itPlayer.location.latitude;
      
      // If IT player is very close, run away faster
      const distToIt = this.getDistance(current, itPlayer.location);
      if (distToIt < 50) { // 50 meters
        moveX *= 3;
        moveY *= 3;
      }
    }
    
    // Normalize the vector (convert to unit vector)
    const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
    if (magnitude > 0) {
      moveX /= magnitude;
      moveY /= magnitude;
    }
    
    // Add some randomness to make movement less predictable
    moveX += (Math.random() - 0.5) * 0.3;
    moveY += (Math.random() - 0.5) * 0.3;
    
    // Keep speed consistent based on difficulty
    const speedMultiplier = aiPlayer.difficulty === 'easy' ? 0.00005 :
                           (aiPlayer.difficulty === 'hard' ? 0.0002 : 0.0001);
    
    // Calculate new position
    let newPos = {
      latitude: current.latitude + moveY * speedMultiplier,
      longitude: current.longitude + moveX * speedMultiplier
    };
    
    // ENFORCE BOUNDARY: Check if new position would leave game area
    const distanceToCenter = this.getDistance(newPos, humanPlayer.location);
    
    if (distanceToCenter > gameRadius * 0.95) {
      // If too close to boundary, adjust to move back toward center
      const centerDir = {
        x: humanPlayer.location.longitude - newPos.longitude,
        y: humanPlayer.location.latitude - newPos.latitude
      };
      
      // Normalize
      const centerMag = Math.sqrt(centerDir.x * centerDir.x + centerDir.y * centerDir.y);
      if (centerMag > 0) {
        centerDir.x /= centerMag;
        centerDir.y /= centerMag;
      }
      
      // Move toward center - stronger adjustment as you get closer to boundary
      const boundaryForce = Math.min(1, (distanceToCenter - gameRadius * 0.8) / (gameRadius * 0.15));
      moveX = moveX * (1 - boundaryForce) + centerDir.x * boundaryForce;
      moveY = moveY * (1 - boundaryForce) + centerDir.y * boundaryForce;
      
      // Recalculate position with boundary adjustment
      newPos = {
        latitude: current.latitude + moveY * speedMultiplier,
        longitude: current.longitude + moveX * speedMultiplier
      };
    }
    
    return newPos;
  }
  
  // Helper to calculate distance between coordinates in meters
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

  // Add this method to aiPlayerManager
  forceTargetUpdate(allPlayers: Player[], humanPlayer: Player) {
    console.log("Forcing AI target update after game state change");
    
    for (const aiPlayer of this.aiPlayers) {
      this.targetPositions[aiPlayer.id] = this.getDefaultTargetPosition(
        aiPlayer,
        allPlayers,
        humanPlayer,
        250 // Default game radius
      );
    }
    
    // Also reset the API update timer
    this.lastApiUpdate = 0;
  }
}

export const aiPlayerManager = new AIPlayerManager();
export default aiPlayerManager;