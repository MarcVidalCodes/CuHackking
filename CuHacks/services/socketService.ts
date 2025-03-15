import io, { Socket } from 'socket.io-client';
import { Coordinates, GameState, Player } from '../types';

const SOCKET_SERVER_URL = 'http://172.17.67.197:3000';

class SocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private eventHandlers: Record<string, Function[]> = {};
  private previousPlayerCount: number = 0;
  private lastPlayerUpdateLog = 0;
  private lastUsername: string | null = null;

  constructor() {
    this.connect();
  }

  connect() {
    if (this.socket) {
      return;
    }

    console.log("SocketService: Connecting to", SOCKET_SERVER_URL);
    this.socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],  // Try websocket only first
      reconnection: true,
      reconnectionAttempts: Infinity, // Keep trying forever
      reconnectionDelay: 1000,
      timeout: 10000,  // Increase timeout
      forceNew: false,
    });

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log(`SocketService: Connected with ID ${this.socket?.id}`);
      this.connected = true;
      this.emitEvent('connect', null);
      
      // Re-join the game if we reconnected
      if (this.lastUsername) {
        console.log(`SocketService: Reconnecting as ${this.lastUsername}`);
        this.joinGame(this.lastUsername);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log("SocketService: Disconnected -", reason);
      this.connected = false;
      this.emitEvent('disconnect', reason);
      
      // More aggressive reconnection for transport close errors
      if (reason === 'transport close') {
        this.socket?.disconnect();
        this.socket = null;
        
        console.log("SocketService: Transport closed, attempting full reconnect in 2s");
        setTimeout(() => {
          this.connect();  // Will create a new socket
        }, 2000);
      }

      // Auto-reconnect
      if (reason === 'io client disconnect' || reason === 'transport close') {
        setTimeout(() => {
          console.log("SocketService: Attempting reconnect...");
          this.socket?.connect();
        }, 1000);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.log("SocketService: Connection error -", error);
      this.emitEvent('error', error);
    });

    this.socket.on('updatePlayers', (players: Player[]) => {
      console.log("SocketService: Received players update", players.length);
      this.emitEvent('updatePlayers', players);
    });

    this.socket.on('gameStarted', (gameState: GameState) => {
      console.log("SocketService: Game started");
      this.emitEvent('gameStarted', gameState);
    });

    this.socket.on('youAreHost', () => {
      console.log("SocketService: You are now the host");
      this.emitEvent('youAreHost');
    });
  }

  on(event: string, callback: Function) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: Function) {
    if (!this.eventHandlers[event]) return;
    this.eventHandlers[event] = this.eventHandlers[event].filter(cb => cb !== callback);
  }

  private emitEvent(event: string, ...args: any[]) {
    if (!this.eventHandlers[event]) return;
    this.eventHandlers[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in ${event} event handler:`, error);
      }
    });
  }

  emit(event: string, data: any) {
    if (!this.socket || !this.connected) {
      console.log(`SocketService: Cannot emit ${event}, socket not connected`);
      return false;
    }
    this.socket.emit(event, data);
    return true;
  }

  joinGame(username: string) {
    this.lastUsername = username;
    return this.emit('joinGame', { username });
  }

  startGame() {
    return this.emit('startGame');
  }

  updateLocation(location: Coordinates) {
    return this.emit('updateLocation', location);
  }

  transferHost(playerId: string) {
    return this.emit('transferHost', playerId);
  }

  getSocketId() {
    return this.socket?.id;
  }

  isConnected() {
    return this.connected;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Game state events
  updatePlayersHandler(updatedPlayers: Player[]) {
    // Only log player updates once every 10 seconds max
    const now = Date.now();
    if (now - this.lastPlayerUpdateLog > 10000) {
      console.log('Players updated:', updatedPlayers.length);
      this.lastPlayerUpdateLog = now;
    }
    
    setPlayers(updatedPlayers);
    
    // Check if current user is host (only if needed)
    if (currentUser && !currentUser.isHost) {
      const me = updatedPlayers.find(p => p.id === currentUser.id);
      if (me && me.isHost) {
        setIsHost(true);
        setCurrentUser(prev => prev ? {...prev, isHost: true} : null);
      }
    }
  }
}

// Create singleton instance
export const socketService = new SocketService();

// Export for use in components
export default socketService;