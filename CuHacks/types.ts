export interface Coordinates {
    latitude: number;
    longitude: number;
  }
  
  export interface Player {
    id: string;
    username: string;
    location?: Coordinates;
    isHost: boolean;
    isTagger?: boolean;
    score?: number;
  }
  
  export interface GameState {
    gameStarted: boolean;
    currentTagger: string | null;
    tagCooldown: number;
    players: Player[];
  }
  
  export interface TagEvent {
    taggerId: string;
    taggerName: string;
    taggedId: string;
    taggedName: string;
    distance?: number;
    timestamp: number;
  }