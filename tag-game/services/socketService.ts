import io, { Socket } from 'socket.io-client';
import { Coordinates, Player } from '../types';

const SOCKET_SERVER_URL = 'http://172.17.67.197:3000';

class SocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private eventHandlers: Record<string, Function[]> = {};

  constructor() {
    this.connect();
  }

  connect() {
    if (this.socket) {
      return;
    }

    console.log("SocketService: Connecting to", SOCKET_SERVER_URL);
    this.socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling']
    });

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log("SocketService: Connected with ID", this.socket?.id);
      this.connected = true;
      this.emitEvent('connect', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log("SocketService: Disconnected -", reason);
      this.connected = false;
      this.emitEvent('disconnect', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.log("SocketService: Connection error -", error);
      this.emitEvent('error', error);
    });

    this.socket.on('updatePlayers', (players: Player[]) => {
      console.log("SocketService: Received players update", players.length);
      this.emitEvent('updatePlayers', players);
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
    return this.emit('joinGame', { username });
  }

  updateLocation(location: Coordinates) {
    return this.emit('updateLocation', location);
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
}

// Create singleton instance
const socketService = new SocketService();

// Export for use in components
export default socketService;