const Room = require('../models/Room');
const { pickUniqueRewardChoices } = require('../config/eventRewards');
const DEFAULT_BOARD_SIZE = 68;
const DEFAULT_CHARACTER = { id: 'dog', name: 'Cho', icon: '🐕', emoji: '🐕' };

const normalizeName = (name = '') => String(name).trim().toLowerCase();
const generatePlayerId = () => `player-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const dedupePlayers = (players = []) => {
  const byId = new Set();
  const byName = new Set();
  const result = [];

  for (const player of players) {
    const idKey = player?.playerId || '';
    const nameKey = normalizeName(player?.name);
    if (!nameKey) continue;

    if (idKey && byId.has(idKey)) continue;
    if (byName.has(nameKey)) continue;

    if (idKey) byId.add(idKey);
    byName.add(nameKey);
    result.push(player);
  }

  return result;
};

const clampPosition = (position, boardSize) => {
  const finishPosition = Math.max(0, (boardSize || DEFAULT_BOARD_SIZE) - 1);
  return Math.min(Math.max(0, position), finishPosition);
};

const applyPositionDelta = (room, playerIndex, delta) => {
  const player = room.players[playerIndex];
  if (!player) return;

  const currentPosition = player.position || 0;
  player.position = clampPosition(currentPosition + delta, room.boardSize);
};

const pickRandomOtherPlayerIndex = (room, currentPlayerIndex) => {
  const otherIndexes = room.players
    .map((_, index) => index)
    .filter((index) => index !== currentPlayerIndex);

  if (!otherIndexes.length) return null;
  return otherIndexes[Math.floor(Math.random() * otherIndexes.length)];
};

const applyEventEffect = (room, currentPlayerIndex, reward) => {
  if (!reward) return;

  const currentPlayer = room.players[currentPlayerIndex];
  if (!currentPlayer) return;

  const value = Number(reward.value || 0);

  switch (reward.type) {
    case 'move_self':
      applyPositionDelta(room, currentPlayerIndex, value);
      break;
    case 'move_self_back':
      applyPositionDelta(room, currentPlayerIndex, -value);
      break;
    case 'dice_bonus':
      currentPlayer.pendingDiceModifier = Number(currentPlayer.pendingDiceModifier || 0) + value;
      break;
    case 'dice_penalty':
      currentPlayer.pendingDiceModifier = Number(currentPlayer.pendingDiceModifier || 0) - value;
      break;
    case 'shield':
      currentPlayer.shieldCount = Number(currentPlayer.shieldCount || 0) + Math.max(1, value || 1);
      break;
    case 'skip_turn':
      currentPlayer.skipTurns = Number(currentPlayer.skipTurns || 0) + Math.max(1, value || 1);
      break;
    case 'move_target_back': {
      const targetIndex = pickRandomOtherPlayerIndex(room, currentPlayerIndex);
      if (targetIndex != null) {
        applyPositionDelta(room, targetIndex, -value);
      }
      break;
    }
    case 'move_all_others_back':
      room.players.forEach((_, index) => {
        if (index !== currentPlayerIndex) {
          applyPositionDelta(room, index, -value);
        }
      });
      break;
    case 'force_skip_target': {
      const targetIndex = pickRandomOtherPlayerIndex(room, currentPlayerIndex);
      if (targetIndex != null) {
        const target = room.players[targetIndex];
        target.skipTurns = Number(target.skipTurns || 0) + Math.max(1, value || 1);
      }
      break;
    }
    default:
      break;
  }
};

const getNextTurnIndex = (room) => {
  if (!room.players.length) return 0;

  let nextIndex = room.currentTurnIndex;
  let remainingChecks = room.players.length;

  while (remainingChecks > 0) {
    nextIndex = (nextIndex + 1) % room.players.length;
    const player = room.players[nextIndex];
    const skipTurns = Number(player.skipTurns || 0);

    if (skipTurns > 0) {
      player.skipTurns = skipTurns - 1;
      remainingChecks -= 1;
      continue;
    }

    return nextIndex;
  }

  return nextIndex;
};

module.exports = {
  createRoom: async (data) => {
    const roomData = { ...data };
    if (!roomData.players || roomData.players.length === 0) {
      roomData.players = [{
        playerId: generatePlayerId(),
        name: roomData.host,
        position: 0,
        character: roomData.character || DEFAULT_CHARACTER,
        isConnected: true,
        isReady: false,
        role: 'player'
      }];
    }

    const room = new Room(roomData);
    room.players = dedupePlayers(room.players);
    return room.save();
  },

  getRooms: async () => {
    return Room.find().sort({ createdAt: -1 });
  },

  getRoomById: async (id) => {
    return Room.findById(id);
  },

  updateRoom: async (id, update) => {
    return Room.findByIdAndUpdate(id, update, { new: true });
  },

  deleteRoom: async (id) => {
    return Room.findByIdAndDelete(id);
  },

  joinRoom: async (id, playerData) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');
    // Validate required player fields
    if (!playerData || !playerData.name) throw new Error('Player name required');

    const incomingName = normalizeName(playerData.name);
    const existingPlayer = room.players.find((p) => {
      const sameName = normalizeName(p.name) === incomingName;
      const sameId = playerData.playerId && p.playerId === playerData.playerId;
      return sameName || sameId;
    });

    if (existingPlayer) {
      existingPlayer.socketId = playerData.socketId || existingPlayer.socketId;
      existingPlayer.isConnected = true;
      existingPlayer.role = 'player';
      if (playerData.character) {
        existingPlayer.character = playerData.character;
      }
      room.players = dedupePlayers(room.players);
      return room.save();
    }

    if (room.players.length >= room.maxPlayers) throw new Error('Room is full');

    // Generate playerId if not provided
    const player = {
      playerId: playerData.playerId || generatePlayerId(),
      name: String(playerData.name).trim(),
      socketId: playerData.socketId,
      position: playerData.position || 0,
      character: playerData.character || DEFAULT_CHARACTER,
      isConnected: true,
      isReady: false,
      role: 'player'
    };
    
    room.players.push(player);
    room.players = dedupePlayers(room.players);
    return room.save();
  },

  startRoom: async (id) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'waiting') throw new Error('Room cannot be started');
    if (room.players.length < 2) throw new Error('Need at least 2 players to start');

    room.status = 'playing';
    room.boardSize = room.boardSize && room.boardSize >= DEFAULT_BOARD_SIZE
      ? room.boardSize
      : DEFAULT_BOARD_SIZE;
    room.currentTurnIndex = 0;
    room.hasRolledThisTurn = false;
    return room.save();
  },

  endRoom: async (id) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'playing') throw new Error('Only a playing room can be ended');

    room.status = 'finished';
    return room.save();
  },

  // Turn management functions
  getCurrentPlayer: async (id) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');
    return room.players[room.currentTurnIndex] || null;
  },

  rollDice: async (id) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'playing') throw new Error('Game is not playing');
    if (room.hasRolledThisTurn) throw new Error('Already rolled this turn');

    const currentPlayer = room.players[room.currentTurnIndex];
    const modifier = Number(currentPlayer?.pendingDiceModifier || 0);

    const diceValues = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];
    const baseTotal = diceValues[0] + diceValues[1];
    const total = Math.max(1, baseTotal + modifier);

    if (currentPlayer) {
      currentPlayer.pendingDiceModifier = 0;
    }

    room.hasRolledThisTurn = true;
    await room.save();

    return { diceValues, total, modifier };
  },

  movePlayer: async (id, playerIndex, steps) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');

    if (playerIndex >= room.players.length) throw new Error('Invalid player');

    const finishPosition = Math.max(0, room.boardSize - 1);
    const currentPosition = room.players[playerIndex].position || 0;
    const nextPosition = Math.min(currentPosition + steps, finishPosition);

    room.players[playerIndex].position = nextPosition;

    if (nextPosition >= finishPosition) {
      room.status = 'finished';
    }

    return room.save();
  },

  nextTurn: async (id) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');

    room.currentTurnIndex = getNextTurnIndex(room);
    room.hasRolledThisTurn = false;
    await room.save();

    return room;
  },

  resolveEventQuestion: async (id, difficulty, isCorrect) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'playing') throw new Error('Game is not playing');

    const currentPlayerIndex = room.currentTurnIndex;
    const choices = pickUniqueRewardChoices(difficulty, isCorrect, 3);

    if (!choices.length) {
      throw new Error('Không có thưởng/phạt cho mức độ đã chọn');
    }

    room.pendingEventReward = {
      currentPlayerIndex,
      difficulty,
      isCorrect: !!isCorrect,
      choices
    };

    await room.save();

    return {
      room,
      currentPlayerIndex,
      choices,
      isCorrect
    };
  },

  applyEventChoice: async (id, rewardId) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'playing') throw new Error('Game is not playing');

    const pending = room.pendingEventReward;
    if (!pending) throw new Error('No pending event reward');

    const currentPlayerIndex = pending.currentPlayerIndex;
    const selectedReward = (pending.choices || []).find((item) => item.id === rewardId);
    if (!selectedReward) throw new Error('Invalid reward choice');

    applyEventEffect(room, currentPlayerIndex, selectedReward);
    room.pendingEventReward = null;

    const finishPosition = Math.max(0, room.boardSize - 1);
    const currentPlayer = room.players[currentPlayerIndex];
    if ((currentPlayer?.position || 0) >= finishPosition) {
      room.status = 'finished';
    }

    await room.save();

    return {
      room,
      currentPlayerIndex,
      reward: selectedReward,
      isCorrect: !!pending.isCorrect
    };
  },

  leaveRoom: async (id, playerName) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');

    // Find and remove player by name or playerId
    const playerIndex = room.players.findIndex(p => p.name === playerName || p.playerId === playerName);
    if (playerIndex < 0) throw new Error('Player not found in room');

    room.players.splice(playerIndex, 1);

    // Adjust currentTurnIndex if necessary
    if (room.players.length === 0) {
      room.status = 'waiting';
      room.currentTurnIndex = 0;
    } else if (room.currentTurnIndex >= room.players.length) {
      room.currentTurnIndex = room.currentTurnIndex % room.players.length;
    }

    // If game was playing and only 1 player left, end the game
    if (room.status === 'playing' && room.players.length < 2) {
      room.status = 'finished';
    }

    return room.save();
  },

  setPlayerReady: async (id, playerName, isReady) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');

    const player = room.players.find(p => p.name === playerName || p.playerId === playerName);
    if (!player) throw new Error('Player not found in room');

    player.isReady = isReady;
    return room.save();
  },

  setPlayerConnected: async (id, playerId, isConnected) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');

    const player = room.players.find(p => p.playerId === playerId);
    if (!player) throw new Error('Player not found in room');

    player.isConnected = isConnected;
    // If caller provided a socketId, update it (function previously didn't accept socketId)
    // Keep existing socketId when isConnected === false unless a new one is supplied
    if (arguments.length >= 4) {
      const socketId = arguments[3];
      if (socketId) player.socketId = socketId;
    }
    return room.save();
  },

  addSpectator: async (id, spectatorData) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');

    const spectator = {
      spectatorId: spectatorData.spectatorId || `spec-${Date.now()}-${Math.random()}`,
      name: spectatorData.name,
      socketId: spectatorData.socketId,
      isConnected: true
    };

    room.spectators.push(spectator);
    return room.save();
  },

  removeSpectator: async (id, spectatorName) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');

    const spectatorIndex = room.spectators.findIndex(s => s.name === spectatorName || s.spectatorId === spectatorName);
    if (spectatorIndex < 0) throw new Error('Spectator not found in room');

    room.spectators.splice(spectatorIndex, 1);
    return room.save();
  },

  setSpectatorConnected: async (id, spectatorId, isConnected) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');

    const spectator = room.spectators.find(s => s.spectatorId === spectatorId);
    if (!spectator) throw new Error('Spectator not found in room');

    spectator.isConnected = isConnected;
    return room.save();
  },

  completeRoom: async (id) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');

    room.players = dedupePlayers(room.players);

    // Idempotent behavior: if ranking already exists and game was finished, just return.
    if (room.status === 'finished' && room.ranking && room.ranking.length > 0) {
      return room;
    }

    // Calculate ranking based on highest position
    const sortedPlayers = [...room.players].sort((a, b) => {
      // Primary: position (higher is better)
      if (b.position !== a.position) return b.position - a.position;
      return String(a.name).localeCompare(String(b.name));
    });

    // Create ranking array
    const ranking = sortedPlayers.map((player, index) => ({
      playerId: player.playerId,
      name: player.name,
      rank: index + 1,
      position: player.position,
      character: player.character,
      finishTime: new Date()
    }));

    room.ranking = ranking;
    room.status = 'finished';
    room.gameEndedAt = new Date();

    return room.save();
  }
};
