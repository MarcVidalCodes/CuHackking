const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with more permissive CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  },
  transports: ['websocket', 'polling'] // Try both transport methods
});

// Game state
let gameState = {
  gameInProgress: false,
  players: []
};

// Change these variables near the top of your server file
let lastTagTime = 0;
const TAG_COOLDOWN = 30000; // 30 seconds cooldown
const TAG_DISTANCE = 0.0005; // Increase to ~50 meters (was likely too small before)

// Make sure the calculateDistance function is implemented:
function calculateDistance(loc1, loc2) {
  if (!loc1 || !loc2) return Infinity;
  
  // Better distance calculation using Haversine formula for more accuracy
  // This calculates the "as the crow flies" distance between two points
  const R = 6371000; // Earth radius in meters
  const lat1 = loc1.latitude * Math.PI / 180;
  const lat2 = loc2.latitude * Math.PI / 180;
  const latDiff = (loc2.latitude - loc1.latitude) * Math.PI / 180;
  const lngDiff = (loc2.longitude - loc1.longitude) * Math.PI / 180;

  const a = Math.sin(latDiff/2) * Math.sin(latDiff/2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(lngDiff/2) * Math.sin(lngDiff/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c / 111000; // Convert meters to approximate coordinate distance
}

// Socket.IO connection handler
io.on('connection', (socket) => {
  let isNewConnection = true;

  // Handle player joining the game
  socket.on('joinGame', ({ username }) => {
    if (isNewConnection) {
      console.log(`Player ${username} connected: ${socket.id}`);
      isNewConnection = false;
    }
    
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
        isIt: isFirstPlayer, // First player is "it"
        isHost: isFirstPlayer // First player is "host"
      };
      
      gameState.players.push(newPlayer);
      
      // Notify the player if they're the host
      if (isFirstPlayer) {
        console.log(`${username} is the host`);
        socket.emit('youAreHost');
      }
    }
    
    console.log(`Current players: ${JSON.stringify(gameState.players)}`);
    // Broadcast updated player list to all clients
    io.emit('updatePlayers', gameState.players);
  });

  // Handle location updates
  socket.on('updateLocation', (location) => {
    const playerIndex = gameState.players.findIndex(player => player.id === socket.id);
    
    if (playerIndex !== -1) {
      // Only emit updates if location has changed significantly
      const oldLoc = gameState.players[playerIndex].location;
      const newLoc = location;
      
      // Check if location has changed more than a threshold (now using a larger threshold)
      const threshold = 0.0001; // ~10 meters, doubled from before
      const hasChangedSignificantly = 
        !oldLoc || 
        Math.abs(oldLoc.latitude - newLoc.latitude) > threshold || 
        Math.abs(oldLoc.longitude - newLoc.longitude) > threshold;
      
      // Always update the player's stored location
      gameState.players[playerIndex].location = location;
      
      // Only broadcast significant location changes and throttle
      if (hasChangedSignificantly) {
        throttledEmitUpdate(); // Use our throttled update function
      }
    }
  });

  // Handle game start
  socket.on('startGame', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) {
      console.log(`Player ${socket.id} attempted to start game but is not host`);
      return; // Only host can start game
    }
    
    console.log('Game started by host');
    gameState.gameInProgress = true;
    
    // Make sure at least one player is "it"
    if (gameState.players.length > 0) {
      const itIndex = Math.floor(Math.random() * gameState.players.length);
      gameState.players = gameState.players.map((player, index) => ({
        ...player,
        isIt: index === itIndex
      }));
    }
    
    io.emit('gameStarted', gameState);
    io.emit('updatePlayers', gameState.players);
  });

  // Handle host transfer request
  socket.on('transferHost', (newHostId) => {
    console.log(`Host transfer request from ${socket.id} to ${newHostId}`);
    
    // Check if the requesting socket is the current host
    const currentHostIndex = gameState.players.findIndex(p => p.isHost === true);
    const newHostIndex = gameState.players.findIndex(p => p.id === newHostId);
    
    console.log('Current host index:', currentHostIndex);
    console.log('New host index:', newHostIndex);
    console.log('Current host ID:', currentHostIndex !== -1 ? gameState.players[currentHostIndex].id : 'none');
    
    if (currentHostIndex !== -1 && gameState.players[currentHostIndex].id === socket.id && newHostIndex !== -1) {
      console.log(`Transferring host from ${gameState.players[currentHostIndex].username} to ${gameState.players[newHostIndex].username}`);
      
      // Remove host status from current host
      gameState.players[currentHostIndex].isHost = false;
      
      // Set new host
      gameState.players[newHostIndex].isHost = true;
      
      // Notify new host
      io.to(newHostId).emit('youAreHost');
      
      // Notify all clients of updated player list
      io.emit('updatePlayers', gameState.players);
    } else {
      console.log('Host transfer failed: Invalid request');
      if (currentHostIndex === -1) {
        console.log('No current host found');
      } else if (gameState.players[currentHostIndex].id !== socket.id) {
        console.log('Requesting player is not the host');
      } else if (newHostIndex === -1) {
        console.log('New host not found in players list');
      }
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

  // Handle ping/pong for keeping connections alive
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Add a new socket event for checking tags
  socket.on('checkTag', () => {
    const now = Date.now();
    
    // Don't process if we're in cooldown
    if (now - lastTagTime < TAG_COOLDOWN) {
      // Add debug log for cooldown
      console.log(`Tag check: Cooldown active. ${Math.floor((TAG_COOLDOWN - (now - lastTagTime))/1000)}s remaining`);
      return;
    }
    
    const currentPlayer = gameState.players.find(p => p.id === socket.id);
    if (!currentPlayer || !currentPlayer.location) {
      console.log('Tag check: Current player not found or has no location');
      return;
    }
    
    // Only process if this player is "it"
    if (!currentPlayer.isIt) {
      console.log(`Tag check: ${currentPlayer.username} is not "it"`);
      return;
    }
    
    console.log(`Tag check: ${currentPlayer.username} is looking for players to tag`);
    
    // Find a player to tag
    const taggedPlayer = gameState.players.find(p => {
      // Skip self and players who are already "it"
      if (p.id === socket.id || p.isIt) return false;
      
      // Calculate distance
      const distance = calculateDistance(currentPlayer.location, p.location);
      console.log(`Distance to ${p.username}: ${distance} (threshold: ${TAG_DISTANCE})`);
      return distance < TAG_DISTANCE;
    });
    
    // If we found someone to tag
    if (taggedPlayer) {
      console.log(`${currentPlayer.username} tagged ${taggedPlayer.username}!`);
      
      // Update who is "it"
      gameState.players = gameState.players.map(p => ({
        ...p,
        isIt: p.id === taggedPlayer.id
      }));
      
      // Update the last tag time
      lastTagTime = now;
      
      // Notify everyone about the tag
      io.emit('playerTagged', {
        tagger: currentPlayer.username,
        tagged: taggedPlayer.username
      });
      
      // Send updated players list
      io.emit('updatePlayers', gameState.players);
    } else {
      console.log(`No players in range for ${currentPlayer.username} to tag`);
    }
  });
});

// Set up a periodic cleanup process to check for disconnected players
setInterval(() => {
  // Check if any sockets are disconnected
  const connectedSockets = Array.from(io.sockets.sockets.keys());
  const disconnectedPlayers = gameState.players.filter(p => !connectedSockets.includes(p.id));
  
  if (disconnectedPlayers.length > 0) {
    console.log('Cleaning up disconnected players:', disconnectedPlayers.map(p => p.username));
    
    // For each disconnected player, check if they were host
    disconnectedPlayers.forEach(player => {
      const wasHost = player.isHost;
      
      // Remove from players list
      gameState.players = gameState.players.filter(p => p.id !== player.id);
      
      // If host left and there are other players, assign a new host
      if (wasHost && gameState.players.length > 0) {
        gameState.players[0].isHost = true;
        const newHostId = gameState.players[0].id;
        console.log(`Assigning new host due to cleanup: ${gameState.players[0].username}`);
        io.to(newHostId).emit('youAreHost');
      }
    });
    
    // Notify all clients of updated player list
    io.emit('updatePlayers', gameState.players);
  }
}, 10000); // Check every 10 seconds

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Tag Game Server is running');
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => { // Listen on all interfaces
  console.log(`Server running on port ${PORT}`);
});

// Also add throttling to updatePlayers broadcasts
// Keep a timestamp of the last broadcast
let lastUpdateBroadcast = Date.now();

// Create a throttled version of the broadcast
const throttledEmitUpdate = () => {
  const now = Date.now();
  if (now - lastUpdateBroadcast > 5000) { // 5 seconds between broadcasts (instead of 2)
    io.emit('updatePlayers', gameState.players);
    lastUpdateBroadcast = now;
  }
};