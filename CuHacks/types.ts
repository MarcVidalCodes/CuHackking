export interface Coordinates {
    latitude: number;
    longitude: number;
  }
  
export interface Player {
    id: string;
    username: string;
    location?: Coordinates;
}