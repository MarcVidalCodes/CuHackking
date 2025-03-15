const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Initialize express app
const app = express();
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Game state
let gameState = {
  players: []
};

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Handle player joining the game
  socket.on('joinGame', ({ username }) => {
    console.log(`Player ${username} joined with ID: ${socket.id}`);
    
    // Check if player already exists
    const existingPlayerIndex = gameState.players.findIndex(p => p.id === socket.id);
    
    // Check if this is the first player (who becomes host)
    const isFirstPlayer = gameState.players.length === 0;
    
    if (existingPlayerIndex !== -1) {
      console.log(`Player ${username} already exists, updating`);
      gameState.players[existingPlayerIndex].username = username;
    } else {
      console.log(`Adding new player: ${username}`);
      const newPlayer = {
        id: socket.id,
        username,
        location: {
          latitude: 0,
          longitude: 0
        },
        isHost: isFirstPlayer // First player is "host"
      };
      
      gameState.players.push(newPlayer);
      
      // Notify the player if they're the host
      if (isFirstPlayer) {
        console.log(`${username} is the host`);
        socket.emit('youAreHost');
      }
    }
    
    console.log(`Current players: ${gameState.players.length}`);
    // Broadcast updated player list to all clients
    io.emit('updatePlayers', gameState.players);
  });

  // Handle location updates
  socket.on('updateLocation', (location) => {
    const playerIndex = gameState.players.findIndex(player => player.id === socket.id);
    
    if (playerIndex !== -1) {
      gameState.players[playerIndex].location = location;
      io.emit('updatePlayers', gameState.players);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Check if the disconnected player was the host
    const wasHost = gameState.players.some(p => p.id === socket.id && p.isHost);
    
    // Remove player from game
    gameState.players = gameState.players.filter(player => player.id !== socket.id);
    
    // If host left and there are other players, assign a new host
    if (wasHost && gameState.players.length > 0) {
      gameState.players[0].isHost = true;
      const newHostId = gameState.players[0].id;
      console.log(`Assigning new host: ${gameState.players[0].username}`);
      // Notify the new host
      io.to(newHostId).emit('youAreHost');
    }
    
    io.emit('updatePlayers', gameState.players);
  });
});

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Game Server is running');
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});