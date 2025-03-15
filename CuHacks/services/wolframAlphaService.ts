import { Coordinates } from '../types';

const WOLFRAM_APP_ID = '2G75RQ-X3XR3WVUVH';

export class WolframAlphaService {
  async getLocationFacts(location: Coordinates): Promise<string[]> {
    try {
      console.log("🌎 Fetching facts about Carleton University");
      
      // Get facts about Carleton University directly
      const facts = await this.getFactsAboutPlace("Carleton University");
      console.log(`📚 Got ${facts.length} facts about Carleton University`);
      
      if (facts.length > 0) {
        return facts;
      }
      
      // Fallback to hardcoded Carleton University facts
      return this.getCarletonFacts();
    } catch (error) {
      console.error('❌ Error fetching Wolfram Alpha data:', error);
      return this.getCarletonFacts();
    }
  }
  
  private async getFactsAboutPlace(placeName: string): Promise<string[]> {
    try {
      const query = `interesting facts about ${placeName}`;
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.wolframalpha.com/v2/query?input=${encodedQuery}&format=plaintext&output=JSON&appid=${WOLFRAM_APP_ID}`;
      
      console.log(`🔎 Querying facts about: "${query}"`);
      
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
                  facts.push(subpod.plaintext);
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
  
  // New method to provide Carleton University facts
  private getCarletonFacts(): string[] {
    return [
      'Carleton University was founded in 1942 to serve veterans returning from World War II.',
      'The campus is located on 62 hectares (153 acres) between the Rideau Canal and Rideau River.',
      'Carleton has over 31,000 undergraduate and graduate students from across Canada and 150 countries.',
      'The university is named after Carleton County, Ontario, which was in turn named after Sir Guy Carleton.',
      'Carleton University is home to Canada\'s first dedicated school of Public Affairs, founded in 1966.'
    ];
  }
}

export const wolframAlphaService = new WolframAlphaService();
export default wolframAlphaService;