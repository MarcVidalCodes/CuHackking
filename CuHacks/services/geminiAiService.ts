import { GoogleGenerativeAI } from "@google/generative-ai";
import { Player, Coordinates } from '../types';
import { GEMINI_API_KEY } from "@env";

export class GeminiAIService {
  private model;
  private speedMultipliers = {
    easy: 0.00005,    // Slower movement
    medium: 0.0001,   // Medium speed
    hard: 0.0002      // Faster movement
  };
  private lastApiCallTime = 0;
  private consecutiveErrors = 0;
  private baseRateLimitDelay = 1000; // Base delay between API calls (1 second)
  private maxRateLimitDelay = 300000; // Max delay (5 minutes)
  private currentRateLimitDelay = 1000;
  private useApiCall = true; // Flag to completely disable API calls if too many errors
  
  constructor() {
    const apiKey = GEMINI_API_KEY || "";
    
    // DRAMATICALLY INCREASED SPEEDS (10x faster than before)
    this.speedMultipliers = {
      easy: 0.0005,    // 10x faster
      medium: 0.001,   // 10x faster
      hard: 0.002      // 10x faster
    };
    
    // Rest of constructor stays the same
    if (!apiKey) {
      console.warn("No Gemini API key provided. AI functionality will be limited.");
      this.useApiCall = false;
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }
  
  async getNextMove(aiPlayer: Player, allPlayers: Player[], humanPlayer: Player, gameRadius: number = 250): Promise<Coordinates> {
    // Check if API calls are disabled due to rate limiting
    if (!this.useApiCall) {
      return this.getDefaultMove(aiPlayer, allPlayers, humanPlayer, gameRadius);
    }
    
    // Check rate limiting
    const now = Date.now();
    if (now - this.lastApiCallTime < this.currentRateLimitDelay) {
      // If too soon, use default behavior
      return this.getDefaultMove(aiPlayer, allPlayers, humanPlayer, gameRadius);
    }
    
    this.lastApiCallTime = now;
    
    try {
      const prompt = this.createPrompt(aiPlayer, allPlayers, humanPlayer, gameRadius);
      const result = await this.model.generateContent(prompt);
      let responseText = result.response.text();
      
      // API call succeeded, reduce backoff time
      this.consecutiveErrors = 0;
      this.currentRateLimitDelay = Math.max(
        this.baseRateLimitDelay,
        this.currentRateLimitDelay / 2
      );
      
      // Remove markdown code block formatting if present
      if (responseText.includes('```')) {
        responseText = responseText
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
      }
      
      // Try to find JSON in the response
      const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[1]) {
        responseText = jsonMatch[1];
      }
      
      // Parse the cleaned response
      try {
        const moveData = JSON.parse(responseText);
        
        // Validate moveDirection properties
        if (typeof moveData?.moveDirection?.lat === 'number' && 
            typeof moveData?.moveDirection?.lng === 'number') {
          
          // Constrain values to reasonable ranges
          const lat = Math.max(-1, Math.min(1, moveData.moveDirection.lat));
          const lng = Math.max(-1, Math.min(1, moveData.moveDirection.lng));
          
          // Calculate new position
          const newPosition = this.calculateNewPosition(
            aiPlayer, 
            { lat, lng }, 
            aiPlayer.difficulty || 'medium'
          );
          
          // Ensure position is within game boundary
          return this.ensureWithinBoundary(
            newPosition, 
            humanPlayer.location, 
            gameRadius
          );
        } else {
          throw new Error("Invalid move direction format");
        }
      } catch (e) {
        console.log("Failed to parse Gemini response:", responseText);
        return this.getDefaultMove(aiPlayer, allPlayers, humanPlayer, gameRadius);
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      
      // Implement exponential backoff for rate limiting
      this.consecutiveErrors++;
      
      // Exponentially increase delay
      this.currentRateLimitDelay = Math.min(
        this.maxRateLimitDelay,
        this.baseRateLimitDelay * Math.pow(2, this.consecutiveErrors)
      );
      
      console.log(`API backoff: ${this.currentRateLimitDelay / 1000}s until next attempt`);
      
      // If too many consecutive errors, disable API calls completely
      if (this.consecutiveErrors > 10) {
        console.log("Too many API errors, disabling Gemini API calls");
        this.useApiCall = false;
      }
      
      return this.getDefaultMove(aiPlayer, allPlayers, humanPlayer, gameRadius);
    }
  }
  
  private createPrompt(aiPlayer: Player, allPlayers: Player[], humanPlayer: Player, gameRadius: number): string {
    const itPlayer = allPlayers.find(p => p.isIt);
    
    return `
      You are controlling an AI player in a GPS-based tag game. Act like a human player.
      
      YOUR PLAYER:
      - Name: ${aiPlayer.username}
      - Current position: lat ${aiPlayer.location.latitude.toFixed(6)}, lng ${aiPlayer.location.longitude.toFixed(6)}
      - You are ${aiPlayer.isIt ? "IT - your goal is to tag other players" : "NOT IT - avoid being tagged"}
      
      GAME ENVIRONMENT:
      - Human player: ${humanPlayer.username} at lat ${humanPlayer.location.latitude.toFixed(6)}, lng ${humanPlayer.location.longitude.toFixed(6)}
      - Player who is "IT": ${itPlayer?.username || "unknown"}
      - Game boundary: ${gameRadius} meters radius from center point
      - Center point: lat ${humanPlayer.location.latitude.toFixed(6)}, lng ${humanPlayer.location.longitude.toFixed(6)}
      
      INSTRUCTIONS:
      - If you're IT: Move strategically toward the nearest player to tag them
      - If you're NOT IT: Move away from whoever is IT, but move naturally like a human
      - IMPORTANT: Stay within the game boundary! Don't go more than ${gameRadius} meters from the center
      - Respond ONLY with a JSON object that contains your next move direction
      - Direction should be values between -1 and 1 for latitude and longitude
      - Positive lat = north, negative lat = south
      - Positive lng = east, negative lng = west
      
      ONLY RESPOND WITH:
      {
        "moveDirection": {"lat": <number>, "lng": <number>},
        "strategy": "<brief explanation>"
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
  
  private getDefaultMove(
    aiPlayer: Player, 
    allPlayers: Player[], 
    humanPlayer: Player,
    gameRadius: number
  ): Coordinates {
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
    
    // Add some randomness (less than before to ensure more predictable behavior)
    moveDirection.lat += (Math.random() - 0.5) * 0.5;
    moveDirection.lng += (Math.random() - 0.5) * 0.5;
    
    const difficulty = aiPlayer.difficulty || 'medium';
    const newPosition = this.calculateNewPosition(aiPlayer, moveDirection, difficulty);
    
    // Ensure position is within game boundary
    return this.ensureWithinBoundary(newPosition, humanPlayer.location, gameRadius);
  }
  
  // New method to ensure AI stays within game boundary
  private ensureWithinBoundary(
    position: Coordinates, 
    centerPoint: Coordinates, 
    radiusMeters: number
  ): Coordinates {
    // Calculate distance to center in meters
    const distance = this.getDistanceBetweenCoordinates(position, centerPoint);
    
    if (distance <= radiusMeters) {
      // Position is within boundary, return as is
      return position;
    }
    
    // Position is outside boundary, move it back toward center
    const bearing = this.getBearing(centerPoint, position);
    const ratio = radiusMeters / distance; // How far along the line to place the point
    
    // Move position back inside the boundary (95% of max radius)
    return this.getDestinationPoint(
      centerPoint,
      bearing, 
      radiusMeters * 0.95
    );
  }
  
  // Helper to get distance between coordinates in meters
  private getDistanceBetweenCoordinates(
    coord1: Coordinates, 
    coord2: Coordinates
  ): number {
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
  
  // Calculate bearing from point1 to point2
  private getBearing(point1: Coordinates, point2: Coordinates): number {
    const φ1 = point1.latitude * Math.PI/180;
    const φ2 = point2.latitude * Math.PI/180;
    const λ1 = point1.longitude * Math.PI/180;
    const λ2 = point2.longitude * Math.PI/180;

    const y = Math.sin(λ2-λ1) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2-λ1);
    const θ = Math.atan2(y, x);
    
    return (θ * 180/Math.PI + 360) % 360; // in degrees, 0-360
  }
  
  // Calculate destination point given a starting point, bearing and distance
  private getDestinationPoint(
    startPoint: Coordinates, 
    bearing: number, 
    distance: number
  ): Coordinates {
    const R = 6371e3; // Earth's radius in meters
    const δ = distance / R; // angular distance
    const θ = bearing * Math.PI/180; // bearing in radians
    
    const φ1 = startPoint.latitude * Math.PI/180;
    const λ1 = startPoint.longitude * Math.PI/180;
    
    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) + 
      Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
    );
    
    const λ2 = λ1 + Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );
    
    return {
      latitude: φ2 * 180/Math.PI,
      longitude: λ2 * 180/Math.PI
    };
  }
}

// Create singleton instance
export const geminiAIService = new GeminiAIService();
export default geminiAIService;