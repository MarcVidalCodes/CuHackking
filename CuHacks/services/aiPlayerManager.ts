import { Player, Coordinates } from '../types';
import geminiAIService from './geminiAiService';
import { v4 as uuidv4 } from 'uuid';

export class AIPlayerManager {
  private aiPlayers: Player[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private lastUpdate = 0;
  private updateFrequency = 2000; // ms between updates
  
  constructor() {}
  
  generateAIPlayers(
    count: number, 
    humanLocation: Coordinates,
    difficulty: string = 'medium'
  ): Player[] {
    this.aiPlayers = [];
    
    // Names for AI players
    const aiNameOptions = [
      'Hunter', 'Runner', 'Speedy', 'Tactician', 'Tracker',
      'Shadow', 'Dodger', 'Phantom', 'Chaser', 'Navigator'
    ];
    
    // Generate AI players around the human's location
    for (let i = 0; i < count; i++) {
      const randomName = aiNameOptions[Math.floor(Math.random() * aiNameOptions.length)];
      
      // Generate a random position near the human
      const randomOffset = {
        latitude: (Math.random() * 0.002 - 0.001), // About 100m in each direction
        longitude: (Math.random() * 0.002 - 0.001)
      };
      
      this.aiPlayers.push({
        id: `ai-${Math.floor(Math.random() * 10000)}`,
        username: `AI-${randomName}`,
        location: {
          latitude: humanLocation.latitude + randomOffset.latitude,
          longitude: humanLocation.longitude + randomOffset.longitude
        },
        isIt: false, // Human starts as "it"
        isHost: false,
        isAI: true,
        difficulty
      });
    }
    
    return this.aiPlayers;
  }
  
  startUpdating(
    humanPlayer: Player,
    allPlayers: Player[],
    onUpdate: (updatedPlayers: Player[]) => void
  ) {
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(async () => {
      const now = Date.now();
      // Only update if minimum time has passed
      if (now - this.lastUpdate < this.updateFrequency) return;
      this.lastUpdate = now;
      
      const updatedPlayers = [];
      
      // Update each AI player's position
      for (const aiPlayer of this.aiPlayers) {
        try {
          const newLocation = await geminiAIService.getNextMove(
            aiPlayer, 
            allPlayers,
            humanPlayer
          );
          
          updatedPlayers.push({
            ...aiPlayer,
            location: newLocation
          });
        } catch (e) {
          console.error("Failed to update AI player:", e);
          updatedPlayers.push(aiPlayer);
        }
      }
      
      this.aiPlayers = updatedPlayers;
      onUpdate(updatedPlayers);
    }, 1000); // Check every second, but only update based on updateFrequency
  }
  
  stopUpdating() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  getAIPlayers(): Player[] {
    return this.aiPlayers;
  }
}

export const aiPlayerManager = new AIPlayerManager();
export default aiPlayerManager;