// Game state
let gameState = {
    gameInProgress: false,
    players: []
  };
  
  // Initialize game
  const initializeGame = () => {
    gameState = {
      gameInProgress: false,
      players: []
    };
    return gameState;
  };
  
  // Add a player to the game
  const joinPlayer = (id, username) => {
    // Check if player already exists
    const existingPlayer = gameState.players.find(player => player.id === id);
    
    if (!existingPlayer) {
      const newPlayer = {
        id,
        username,
        location: {
          latitude: 0,
          longitude: 0
        },
        isIt: gameState.players.length === 0 // First player is "it"
      };
      
      gameState.players.push(newPlayer);
    }
    
    return gameState;
  };
  
  // Update player location
  const updatePlayerLocation = (id, location) => {
    const playerIndex = gameState.players.findIndex(player => player.id === id);
    
    if (playerIndex !== -1) {
      gameState.players[playerIndex].location = location;
      
      // Check for tag (collision) if game is in progress
      if (gameState.gameInProgress) {
        checkForTag(gameState.players[playerIndex]);
      }
      
      return gameState.players;
    }
    
    return null;
  };
  
  // Start the game
  const startGame = () => {
    gameState.gameInProgress = true;
    
    // Make sure at least one player is "it"
    if (gameState.players.length > 0) {
      const itIndex = Math.floor(Math.random() * gameState.players.length);
      gameState.players = gameState.players.map((player, index) => ({
        ...player,
        isIt: index === itIndex
      }));
    }
    
    return gameState;
  };
  
  // Check for tag (when players are close to each other)
  const checkForTag = (currentPlayer) => {
    // Skip if the current player is not "it"
    if (!currentPlayer.isIt) return;
    
    const TAG_DISTANCE = 0.00015; // Approximately 15 meters in coordinate units
    
    gameState.players.forEach(player => {
      // Skip the current player and players who are already "it"
      if (player.id === currentPlayer.id || player.isIt) return;
      
      // Calculate distance between players
      const distance = calculateDistance(
        currentPlayer.location.latitude,
        currentPlayer.location.longitude,
        player.location.latitude,
        player.location.longitude
      );
      
      // If players are close enough, tag occurs
      if (distance < TAG_DISTANCE) {
        // Tag the other player
        player.isIt = true;
        currentPlayer.isIt = false;
        console.log(`Player ${player.username} was tagged by ${currentPlayer.username}`);
      }
    });
  };
  
  // Calculate distance between two coordinates using Haversine formula
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
  }
  
  function deg2rad(deg) {
    return deg * (Math.PI/180);
  }
  
  module.exports = {
    initializeGame,
    joinPlayer,
    updatePlayerLocation,
    startGame
  };