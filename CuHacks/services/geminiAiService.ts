import { GoogleGenerativeAI } from "@google/generative-ai";
import { Player, Coordinates } from '../types';
import { GEMINI_API_KEY } from "@env";


export class GeminiAIService {
  private model;
  private speedMultipliers = {
    easy: 0.00001,    // Slower movement
    medium: 0.00002,  // Medium speed
    hard: 0.00004     // Faster movement
  };
  
  constructor() {
    // Use the key from .env file, with a fallback for development
    const apiKey = GEMINI_API_KEY || "";
    
    if (!apiKey) {
      console.warn("No Gemini API key provided. AI functionality will be limited.");
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }
  
  async getNextMove(aiPlayer: Player, allPlayers: Player[], humanPlayer: Player): Promise<Coordinates> {
    try {
      const prompt = this.createPrompt(aiPlayer, allPlayers, humanPlayer);
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Parse the response
      try {
        const moveData = JSON.parse(responseText);
        return this.calculateNewPosition(
          aiPlayer, 
          moveData.moveDirection, 
          aiPlayer.difficulty || 'medium'
        );
      } catch (e) {
        console.log("Failed to parse Gemini response:", responseText);
        return this.getDefaultMove(aiPlayer, allPlayers, humanPlayer);
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      return this.getDefaultMove(aiPlayer, allPlayers, humanPlayer);
    }
  }
  
  private createPrompt(aiPlayer: Player, allPlayers: Player[], humanPlayer: Player): string {
    const itPlayer = allPlayers.find(p => p.isIt);
    
    return `
      You are controlling an AI player in a GPS-based tag game called "Tag Game".
      
      YOUR STATUS:
      - Name: ${aiPlayer.username}
      - Current position: ${JSON.stringify(aiPlayer.location)}
      - You are ${aiPlayer.isIt ? "IT - your goal is to tag other players" : "NOT IT - avoid being tagged"}
      - Your difficulty level: ${aiPlayer.difficulty || "medium"}
      
      GAME STATE:
      - Human player's position: ${JSON.stringify(humanPlayer.location)}
      - Player who is "IT": ${itPlayer?.username || "unknown"}
      - Other players: ${JSON.stringify(allPlayers.filter(p => 
          p.id !== aiPlayer.id
        ).map(p => ({
          username: p.username,
          isIt: p.isIt,
          location: p.location
        })))}
      
      Return only a JSON object with your next move direction vector:
      {
        "moveDirection": {"lat": <number between -1 and 1>, "lng": <number between -1 and 1>},
        "strategy": "<brief description of your strategy>"
      }
    `;
  }
  
  private calculateNewPosition(
    aiPlayer: Player,
    direction: {lat: number, lng: number},
    difficulty: string
  ): Coordinates {
    const speedMultiplier = this.speedMultipliers[difficulty] || this.speedMultipliers.medium;
    
    return {
      latitude: aiPlayer.location.latitude + (direction.lat * speedMultiplier),
      longitude: aiPlayer.location.longitude + (direction.lng * speedMultiplier)
    };
  }
  
  private getDefaultMove(aiPlayer: Player, allPlayers: Player[], humanPlayer: Player): Coordinates {
    // Simple algorithm for when API fails
    const moveDirection = { lat: 0, lng: 0 };
    
    if (aiPlayer.isIt) {
      // If AI is "it", move toward human player
      moveDirection.lat = humanPlayer.location.latitude > aiPlayer.location.latitude ? 1 : -1;
      moveDirection.lng = humanPlayer.location.longitude > aiPlayer.location.longitude ? 1 : -1;
    } else {
      // If AI is not "it", move away from whoever is "it"
      const itPlayer = allPlayers.find(p => p.isIt) || humanPlayer;
      moveDirection.lat = itPlayer.location.latitude > aiPlayer.location.latitude ? -1 : 1;
      moveDirection.lng = itPlayer.location.longitude > aiPlayer.location.longitude ? -1 : 1;
    }
    
    // Add some randomness
    moveDirection.lat += (Math.random() - 0.5) * 0.5;
    moveDirection.lng += (Math.random() - 0.5) * 0.5;
    
    const difficulty = aiPlayer.difficulty || 'medium';
    return this.calculateNewPosition(aiPlayer, moveDirection, difficulty);
  }
}

// Create singleton instance
export const geminiAIService = new GeminiAIService();
export default geminiAIService;