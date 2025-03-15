const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const geolib = require('geolib');

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
  players: [],
  gameStarted: false,
  currentTagger: null,
  tagCooldown: 0,
  lastTagTime: 0,
  tagRadius: 30, // Meters
  tagCooldownTime: 10000 // 10 seconds between tags
};

// Helper functions
function getRandomPlayer(players) {
  if (players.length === 0) return null;
  return players[Math.floor(Math.random() * players.length)];
}

function calculateDistance(point1, point2) {
  return geolib.getDistance(
    { latitude: point1.latitude, longitude: point1.longitude },
    { latitude: point2.latitude, longitude: point2.longitude }
  );
}

function setNewTagger(playerId) {
  gameState.currentTagger = playerId;
  
  // Find the player and update their tagger status
  gameState.players.forEach(player => {
    player.isTagger = player.id === playerId;
  });
  
  console.log(`New tagger set: ${playerId}`);
  
  // Reset tag cooldown
  gameState.tagCooldown = Date.now() + gameState.tagCooldownTime;
  gameState.lastTagTime = Date.now();
  
  // Broadcast updated game state
  io.emit('gameStateUpdate', {
    currentTagger: gameState.currentTagger,
    tagCooldown: gameState.tagCooldown
  });
}

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
        isHost: isFirstPlayer, // First player is "host"
        isTagger: false, 
        score: 0
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
    
    // Check for tagging if game is started and this player is the tagger
    if (gameState.gameStarted && 
        gameState.currentTagger === socket.id && 
        Date.now() > gameState.tagCooldown) {
      
      // Find closest player to tag
      const tagger = gameState.players[playerIndex];
      let closestPlayer = null;
      let closestDistance = Infinity;
      
      gameState.players.forEach(player => {
        if (player.id !== socket.id && player.location) {
          const distance = calculateDistance(tagger.location, player.location);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPlayer = player;
          }
        }
      });
      
      // Check if close enough to tag
      if (closestPlayer && closestDistance <= gameState.tagRadius) {
        console.log(`${tagger.username} tagged ${closestPlayer.username} (${closestDistance}m)`);
        
        // Update scores
        tagger.score += 1;
        
        // Broadcast tag event
        io.emit('playerTagged', {
          taggerId: tagger.id,
          taggerName: tagger.username,
          taggedId: closestPlayer.id,
          taggedName: closestPlayer.username,
          timestamp: Date.now()
        });
        
        // Set the tagged player as the new tagger
        setNewTagger(closestPlayer.id);
      }
    }
  });

  // Start the game
  socket.on('startGame', () => {
    // Check if this socket is the host
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) {
      console.log('Non-host tried to start game');
      return;
    }
    
    if (gameState.players.length < 2) {
      console.log('Not enough players to start game');
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }
    
    console.log('Game starting...');
    gameState.gameStarted = true;
    
    // Choose a random player as the tagger
    const randomPlayer = getRandomPlayer(gameState.players);
    setNewTagger(randomPlayer.id);
    
    // Broadcast game started
    io.emit('gameStarted', {
      gameStarted: true,
      currentTagger: gameState.currentTagger,
      tagCooldown: gameState.tagCooldown,
      players: gameState.players
    });
  });

  // Check for tag (manual tag attempt)
  socket.on('checkForTag', () => {
    // Check if the game is started and this player is the tagger
    if (!gameState.gameStarted) return;
    
    const taggerIndex = gameState.players.findIndex(player => player.id === socket.id);
    if (taggerIndex === -1 || gameState.players[taggerIndex].id !== gameState.currentTagger) {
      console.log('Non-tagger tried to tag someone');
      return;
    }
    
    // Check if tagger is on cooldown
    if (Date.now() < gameState.tagCooldown) {
      console.log('Tagger on cooldown');
      socket.emit('tagResult', { 
        success: false, 
        message: 'You are on cooldown' 
      });
      return;
    }
    
    const tagger = gameState.players[taggerIndex];
    let taggedPlayer = null;
    let shortestDistance = Infinity;
    
    // Find the closest player within tag radius
    gameState.players.forEach(player => {
      if (player.id !== socket.id && player.location && tagger.location) {
        const distance = calculateDistance(tagger.location, player.location);
        
        if (distance <= gameState.tagRadius && distance < shortestDistance) {
          shortestDistance = distance;
          taggedPlayer = player;
        }
      }
    });
    
    if (taggedPlayer) {
      console.log(`${tagger.username} tagged ${taggedPlayer.username} (${shortestDistance}m)`);
      
      // Update score for tagger
      tagger.score += 1;
      
      // Notify everyone about the tag
      io.emit('playerTagged', {
        taggerId: tagger.id,
        taggerName: tagger.username,
        taggedId: taggedPlayer.id,
        taggedName: taggedPlayer.username,
        distance: Math.round(shortestDistance),
        timestamp: Date.now()
      });
      
      // Tell the tagger they were successful
      socket.emit('tagResult', {
        success: true,
        message: `You tagged ${taggedPlayer.username}!`
      });
      
      // Set the tagged player as the new tagger
      setNewTagger(taggedPlayer.id);
    } else {
      // Tell the tagger they failed
      socket.emit('tagResult', {
        success: false,
        message: 'No players within tagging range'
      });
    }
  });

  // Transfer host
  socket.on('transferHost', (newHostId) => {
    // Check if this socket is the current host
    const playerIndex = gameState.players.findIndex(player => player.id === socket.id);
    if (playerIndex === -1 || !gameState.players[playerIndex].isHost) {
      console.log('Non-host tried to transfer host privileges');
      return;
    }
    
    // Find the new host
    const newHostIndex = gameState.players.findIndex(player => player.id === newHostId);
    if (newHostIndex === -1) {
      console.log('Cannot find new host player');
      return;
    }
    
    // Update host status
    gameState.players[playerIndex].isHost = false;
    gameState.players[newHostIndex].isHost = true;
    
    console.log(`Host transferred from ${gameState.players[playerIndex].username} to ${gameState.players[newHostIndex].username}`);
    
    // Notify new host
    io.to(newHostId).emit('youAreHost');
    
    // Update all players
    io.emit('updatePlayers', gameState.players);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Check if the disconnected player was the host or tagger
    const wasHost = gameState.players.some(p => p.id === socket.id && p.isHost);
    const wasTagger = gameState.currentTagger === socket.id;
    
    // Remove player from game
    gameState.players = gameState.players.filter(player => player.id !== socket.id);
    
    // Handle tagger disconnection
    if (wasTagger && gameState.gameStarted && gameState.players.length > 0) {
      const newTagger = getRandomPlayer(gameState.players);
      setNewTagger(newTagger.id);
      io.emit('systemMessage', `${newTagger.username} is the new tagger!`);
    }
    
    // Handle host disconnection
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