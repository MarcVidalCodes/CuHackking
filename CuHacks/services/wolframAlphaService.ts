import { Coordinates } from '../types';

const WOLFRAM_APP_ID = '2G75RQ-TUP4WETY9G';

export class WolframAlphaService {
  async getLocationFacts(location: Coordinates): Promise<string[]> {
    try {
      console.log("🌎 Fetching facts for location:", location);
      
      // First try to get the location name
      const locationName = await this.getLocationName(location);
      console.log("📍 Location name result:", locationName);
      
      // Then get facts about that named location
      if (locationName && locationName !== "your current location") {
        console.log("🔍 Getting facts about place:", locationName);
        const facts = await this.getFactsAboutPlace(locationName);
        console.log(`📚 Got ${facts.length} facts about place`);
        if (facts.length > 0) {
          return facts;
        }
      }
      
      // If that fails, try a more general query about the coordinates
      console.log("🌐 Getting coordinate facts");
      const coordinatesFacts = await this.getCoordinatesFacts(location);
      console.log(`📊 Got ${coordinatesFacts.length} coordinate facts`);
      if (coordinatesFacts.length > 0) {
        return coordinatesFacts;
      }
      
      // Last resort - return generic facts
      console.log("⚠️ Falling back to generic facts");
      return await this.getGenericLocationFacts(location);
    } catch (error) {
      console.error('❌ Error fetching Wolfram Alpha data:', error);
      return [
        'Did you know that GPS technology was originally developed for military use?',
        'The Earth is approximately 40,000 kilometers in circumference.',
        'Maps were first created by ancient Babylonians on clay tablets.',
        'The concept of longitude and latitude was developed by the ancient Greek astronomer Hipparchus.',
        'GPS satellites orbit Earth at an altitude of about 20,000 kilometers.'
      ];
    }
  }
  
  private async getLocationName(location: Coordinates): Promise<string> {
    try {
      // Try multiple query formats to get location name
      const queries = [
        `nearest city to ${location.latitude},${location.longitude}`,
        `city near ${location.latitude},${location.longitude}`,
        `address of ${location.latitude},${location.longitude}`
      ];
      
      for (const query of queries) {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.wolframalpha.com/v2/query?input=${encodedQuery}&format=plaintext&output=JSON&appid=${WOLFRAM_APP_ID}`;
        
        console.log(`🔎 Querying Wolfram Alpha: "${query}"`);
        console.log(`🌐 URL: ${url}`);
        
        try {
          const response = await fetch(url);
          console.log(`📥 Response status: ${response.status}`);
          
          if (!response.ok) {
            console.log(`⚠️ Bad response: ${response.status} ${response.statusText}`);
            continue;
          }
          
          const data = await response.json();
          console.log(`📦 Response data:`, JSON.stringify(data).substring(0, 200) + "...");
          
          if (data.error) {
            console.log(`⚠️ API error:`, data.error);
            continue;
          }
          
          if (data.queryresult && data.queryresult.pods) {
            for (const pod of data.queryresult.pods) {
              if (pod.subpods && pod.subpods[0] && pod.subpods[0].plaintext) {
                const text = pod.subpods[0].plaintext;
                console.log(`📋 Pod text: "${text}"`);
                
                // Look for city or region names
                if (text.includes(" | ")) {
                  return text.split(" | ")[0];
                }
                if (text.includes(",")) {
                  return text.split(",")[0];
                }
                // If we found anything meaningful, return it
                if (text.length > 3 && !text.includes("latitude") && !text.includes("longitude")) {
                  return text;
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error with query "${query}":`, error);
        }
      }
      
      return "your current location";
    } catch (error) {
      console.error('❌ Error getting location name:', error);
      return "your current location";
    }
  }
  
  private async getFactsAboutPlace(placeName: string): Promise<string[]> {
    try {
      const query = `interesting facts about ${placeName}`;
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.wolframalpha.com/v2/query?input=${encodedQuery}&format=plaintext&output=JSON&appid=${WOLFRAM_APP_ID}`;
      
      console.log(`🔎 Querying facts about place: "${query}"`);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`⚠️ Bad response: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      
      const facts: string[] = [];
      
      if (data.queryresult && data.queryresult.pods) {
        for (const pod of data.queryresult.pods) {
          // Skip certain pod types
          if (pod.id === 'Input' || pod.id === 'Result') continue;
          
          if (pod.subpods) {
            for (const subpod of pod.subpods) {
              if (subpod.plaintext && subpod.plaintext.length > 0) {
                // Skip very short responses or those that just repeat the query
                if (subpod.plaintext.length > 15 && 
                    !subpod.plaintext.toLowerCase().includes("wolfram alpha")) {
                  console.log(`📝 Found fact: "${subpod.plaintext.substring(0, 50)}..."`);
                  facts.push(`${placeName}: ${subpod.plaintext}`);
                }
              }
            }
          }
        }
      }
      
      return facts.slice(0, 5); // Return up to 5 facts
    } catch (error) {
      console.error('❌ Error fetching place facts:', error);
      return [];
    }
  }
  
  private async getCoordinatesFacts(location: Coordinates): Promise<string[]> {
    try {
      // Try different queries to get interesting information about the coordinates
      const queries = [
        `geographical features near ${location.latitude},${location.longitude}`,
        `elevation at ${location.latitude},${location.longitude}`,
        `climate at ${location.latitude},${location.longitude}`,
        `current weather at ${location.latitude},${location.longitude}`
      ];
      
      const facts: string[] = [];
      
      for (const query of queries) {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.wolframalpha.com/v2/query?input=${encodedQuery}&format=plaintext&output=JSON&appid=${WOLFRAM_APP_ID}`;
        
        console.log(`🔎 Querying coordinates fact: "${query}"`);
        
        try {
          const response = await fetch(url);
          
          if (!response.ok) {
            console.log(`⚠️ Bad response: ${response.status} ${response.statusText}`);
            continue;
          }
          
          const data = await response.json();
          
          if (data.queryresult && data.queryresult.pods) {
            for (const pod of data.queryresult.pods) {
              if (pod.id === 'Input') continue;
              
              if (pod.subpods) {
                for (const subpod of pod.subpods) {
                  if (subpod.plaintext && 
                     subpod.plaintext.length > 15 && 
                     !subpod.plaintext.includes("Wolfram")) {
                    console.log(`📝 Found coordinate fact: "${subpod.plaintext.substring(0, 50)}..."`);
                    facts.push(subpod.plaintext);
                    if (facts.length >= 5) break;
                  }
                }
              }
              if (facts.length >= 5) break;
            }
          }
          if (facts.length >= 5) break;
        } catch (error) {
          console.error(`❌ Error with query "${query}":`, error);
        }
      }
      
      return facts;
    } catch (error) {
      console.error('❌ Error fetching coordinate facts:', error);
      return [];
    }
  }
  
  private async getGenericLocationFacts(location: Coordinates): Promise<string[]> {
    try {
      // Try to get nearby city or region
      const locationName = await this.getLocationName(location);
      console.log(`🌍 Using generic facts with location name: ${locationName}`);
      
      return [
        `${locationName} is at coordinates ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}.`,
        `The average walking speed of a human is about 5 km/h.`,
        `In a game of tag, quick direction changes can help you evade being tagged.`,
        `The world's largest game of tag involved over 2,000 participants.`,
        `GPS accuracy can vary between 3 to 15 meters depending on your device and surroundings.`
      ];
    } catch (error) {
      console.error('❌ Error fetching generic location data:', error);
      return [
        'Did you know that GPS technology was originally developed for military use?',
        'The Earth is approximately 40,000 kilometers in circumference.',
        'Maps were first created by ancient Babylonians on clay tablets.',
        'The concept of longitude and latitude was developed by the ancient Greek astronomer Hipparchus.',
        'GPS satellites orbit Earth at an altitude of about 20,000 kilometers.'
      ];
    }
  }
}

export const wolframAlphaService = new WolframAlphaService();
export default wolframAlphaService;