export type Coordinates = {
    latitude: number;
    longitude: number;
  };
  
  export type Player = {
    id: string;
    username: string;
    location: Coordinates;
    isIt: boolean;
    isHost: boolean; 
  };
  
  export type GameState = {
    gameInProgress: boolean;
    players: Player[];
  };