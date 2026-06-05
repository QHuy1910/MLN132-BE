const Room = require('../models/Room');
const { pickUniqueRewardChoices } = require('../config/eventRewards');
const DEFAULT_BOARD_SIZE = 68;
const MAX_PLAYERS = 5;
const EVENT_CELL_INDEXES = new Set([3, 5, 7, 9, 13, 16, 18, 20, 22, 26, 28, 30, 33, 34, 37, 39, 41, 43, 46, 49, 52, 53, 54, 57, 59, 63, 64]);
const DEFAULT_CHARACTER = { id: 'dog', name: 'Cho', icon: '🐕', emoji: '🐕' };

const normalizeName = (name = '') => String(name).trim().toLowerCase();
const generatePlayerId = () => `player-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
const normalizeMaxPlayers = (maxPlayers) => Math.min(MAX_PLAYERS, Math.max(2, Number(maxPlayers) || MAX_PLAYERS));

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
  if (player.finishedRank) return;

  const currentPosition = player.position || 0;
  player.position = clampPosition(currentPosition + delta, room.boardSize);
};

const consumeShield = (player) => {
  const shieldCount = Number(player?.shieldCount || 0);
  if (shieldCount <= 0) return false;

  player.shieldCount = shieldCount - 1;
  return true;
};

const getEffectName = (effect) => effect?.name || 'Hieu ung bat loi';

const applyHarmfulEffectToPlayer = (room, playerIndex, effect) => {
  const player = room.players[playerIndex];
  if (!player || !effect) return null;

  const blocked = consumeShield(player);
  const result = {
    blocked,
    playerIndex,
    playerName: player.name || '',
    effectName: getEffectName(effect),
    effect
  };

  if (blocked) return result;

  const value = Number(effect.value || 0);

  switch (effect.type) {
    case 'move_self_back':
      applyPositionDelta(room, playerIndex, -value);
      break;
    case 'dice_penalty':
      player.pendingDiceModifier = Number(player.pendingDiceModifier || 0) - value;
      break;
    case 'skip_turn':
      player.skipTurns = Number(player.skipTurns || 0) + Math.max(1, value || 1);
      break;
    default:
      break;
  }

  return result;
};

const createTrapId = () => `trap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getTargetPlayerIndex = (room, currentPlayerIndex, targetPlayerId) => {
  if (!targetPlayerId) return null;

  const targetIndex = room.players.findIndex((player, index) => {
    if (index === currentPlayerIndex || player.finishedRank) return false;
    return player.playerId === targetPlayerId || player.name === targetPlayerId;
  });

  return targetIndex >= 0 ? targetIndex : null;
};

const applyEventEffect = (room, currentPlayerIndex, reward, targetPlayerId = null) => {
  const effectResult = { appliedEffects: [], blockedEffects: [] };
  if (!reward) return effectResult;

  const currentPlayer = room.players[currentPlayerIndex];
  if (!currentPlayer) return effectResult;

  const value = Number(reward.value || 0);
  const recordHarmfulResult = (result) => {
    if (!result) return;
    if (result.blocked) {
      effectResult.blockedEffects.push(result);
    } else {
      effectResult.appliedEffects.push(result);
    }
  };

  switch (reward.type) {
    case 'move_self':
      applyPositionDelta(room, currentPlayerIndex, value);
      break;
    case 'move_self_back':
      recordHarmfulResult(applyHarmfulEffectToPlayer(room, currentPlayerIndex, reward));
      break;
    case 'dice_bonus':
      currentPlayer.pendingDiceModifier = Number(currentPlayer.pendingDiceModifier || 0) + value;
      break;
    case 'dice_penalty':
      recordHarmfulResult(applyHarmfulEffectToPlayer(room, currentPlayerIndex, reward));
      break;
    case 'shield':
      currentPlayer.shieldCount = Number(currentPlayer.shieldCount || 0) + Math.max(1, value || 1);
      break;
    case 'skip_turn':
      recordHarmfulResult(applyHarmfulEffectToPlayer(room, currentPlayerIndex, reward));
      break;
    case 'move_target_back': {
      const targetIndex = getTargetPlayerIndex(room, currentPlayerIndex, targetPlayerId);
      if (targetIndex == null) {
        throw new Error('Vui lòng chọn người chơi để lùi bước');
      }
      recordHarmfulResult(applyHarmfulEffectToPlayer(room, targetIndex, {
        ...reward,
        type: 'move_self_back'
      }));
      break;
    }
    case 'move_all_others_back':
      room.players.forEach((_, index) => {
        if (index !== currentPlayerIndex) {
          recordHarmfulResult(applyHarmfulEffectToPlayer(room, index, {
            ...reward,
            type: 'move_self_back'
          }));
        }
      });
      break;
    case 'force_skip_target': {
      const targetIndex = getTargetPlayerIndex(room, currentPlayerIndex, targetPlayerId);
      if (targetIndex == null) {
        throw new Error('Vui long chon nguoi choi bi mat luot');
      }
      recordHarmfulResult(applyHarmfulEffectToPlayer(room, targetIndex, {
        ...reward,
        type: 'skip_turn'
      }));
      break;
    }
    default:
      break;
  }

  return effectResult;
};

const applyTrapPenalty = (room, playerIndex, penalty) => {
  return applyHarmfulEffectToPlayer(room, playerIndex, penalty);
};

const triggerTrapAtPosition = (room, playerIndex, position) => {
  const traps = Array.isArray(room.traps) ? room.traps : [];
  const triggeredTraps = traps.filter((trap) => Number(trap.cellIndex) === Number(position));
  if (!triggeredTraps.length) return null;

  room.traps = traps.filter((trap) => Number(trap.cellIndex) !== Number(position));
  const penaltyResults = triggeredTraps
    .map((trap) => ({ trap, result: applyTrapPenalty(room, playerIndex, trap.penalty) }));

  return {
    trap: triggeredTraps[0],
    traps: triggeredTraps,
    appliedEffects: penaltyResults.filter((item) => item.result && !item.result.blocked),
    blockedEffects: penaltyResults.filter((item) => item.result?.blocked),
    playerIndex,
    playerName: room.players[playerIndex]?.name || ''
  };
};

const getTrapsAtPosition = (room, position) => (
  (Array.isArray(room.traps) ? room.traps : [])
    .filter((trap) => Number(trap.cellIndex) === Number(position))
);

const placeTrap = (room, currentPlayerIndex, reward, trapCellIndex) => {
  const cellIndex = Number(trapCellIndex);
  const finishPosition = getFinishPosition(room);

  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > finishPosition) {
    throw new Error('O dat bay khong hop le');
  }

  if (EVENT_CELL_INDEXES.has(cellIndex)) {
    throw new Error('Khong the dat bay tren o event');
  }

  const penalty = reward.trapPenalty;
  if (!penalty) {
    throw new Error('Bay chua co hinh phat');
  }

  const traps = Array.isArray(room.traps) ? room.traps : [];
  const currentPlayer = room.players[currentPlayerIndex];
  const trap = {
    id: createTrapId(),
    cellIndex,
    rewardId: reward.id,
    difficulty: reward.trapDifficulty || reward.difficulty || null,
    createdByPlayerId: currentPlayer?.playerId || null,
    createdByName: currentPlayer?.name || '',
    penalty
  };

  room.traps = [...traps, trap];
  return trap;
};

const getFinishPosition = (room) => Math.max(0, (room.boardSize || DEFAULT_BOARD_SIZE) - 1);

const getFinishedCount = (room) => room.players.filter((player) => player.finishedRank).length;

const markPlayerFinishedIfNeeded = (room, playerIndex) => {
  const player = room.players[playerIndex];
  if (!player || player.finishedRank) return false;

  if ((player.position || 0) < getFinishPosition(room)) return false;

  player.finishedRank = getFinishedCount(room) + 1;
  player.finishedAt = new Date();
  player.skipTurns = 0;
  return true;
};

const areAllPlayersFinished = (room) => {
  if (!room.players.length) return false;
  return room.players.every((player) => player.finishedRank);
};

const getNextTurnIndex = (room) => {
  if (!room.players.length) return 0;

  let nextIndex = room.currentTurnIndex;
  let remainingChecks = room.players.length;

  while (remainingChecks > 0) {
    nextIndex = (nextIndex + 1) % room.players.length;
    const player = room.players[nextIndex];
    if (player.finishedRank) {
      remainingChecks -= 1;
      continue;
    }

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
  MAX_PLAYERS,
  normalizeMaxPlayers,

  createRoom: async (data) => {
    const roomData = { ...data };
    roomData.maxPlayers = normalizeMaxPlayers(roomData.maxPlayers);
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
    const normalizedUpdate = { ...update };
    if (Object.prototype.hasOwnProperty.call(normalizedUpdate, 'maxPlayers')) {
      normalizedUpdate.maxPlayers = normalizeMaxPlayers(normalizedUpdate.maxPlayers);
    }
    return Room.findByIdAndUpdate(id, normalizedUpdate, { new: true, runValidators: true });
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

    room.maxPlayers = normalizeMaxPlayers(room.maxPlayers);
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
    room.traps = [];
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
    const total = Math.max(0, baseTotal + modifier);

    if (currentPlayer) {
      currentPlayer.pendingDiceModifier = 0;
    }

    room.hasRolledThisTurn = true;
    await room.save();

    return { diceValues, total, modifier };
  },

  movePlayer: async (id, playerIndex, steps, options = {}) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');

    if (playerIndex >= room.players.length) throw new Error('Invalid player');

    const shouldTriggerTraps = options.triggerTraps !== false;
    const finishPosition = getFinishPosition(room);
    const currentPosition = room.players[playerIndex].position || 0;
    const nextPosition = Math.min(currentPosition + steps, finishPosition);

    room.players[playerIndex].position = nextPosition;
    const pendingTrap = !shouldTriggerTraps ? getTrapsAtPosition(room, nextPosition) : [];
    const triggeredTrap = shouldTriggerTraps ? triggerTrapAtPosition(room, playerIndex, nextPosition) : null;
    const hasTrapAtLanding = !!triggeredTrap || pendingTrap.length > 0;
    const shouldDelayFinish = !!triggeredTrap && nextPosition >= finishPosition;

    if (!shouldDelayFinish && !(hasTrapAtLanding && nextPosition >= finishPosition)) {
      markPlayerFinishedIfNeeded(room, playerIndex);
    }
    if (areAllPlayersFinished(room)) {
      room.status = 'finished';
    }

    const savedRoom = await room.save();
    savedRoom._triggeredTrap = triggeredTrap;
    savedRoom._pendingTrap = pendingTrap.length
      ? {
          trap: pendingTrap[0],
          traps: pendingTrap,
          playerIndex,
          playerName: room.players[playerIndex]?.name || ''
        }
      : null;
    return savedRoom;
  },

  triggerTrapsAtCurrentPosition: async (id, playerIndex) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');
    if (playerIndex >= room.players.length) throw new Error('Invalid player');

    const position = room.players[playerIndex].position || 0;
    const triggeredTrap = triggerTrapAtPosition(room, playerIndex, position);

    if (!triggeredTrap) {
      markPlayerFinishedIfNeeded(room, playerIndex);
    }

    if (areAllPlayersFinished(room)) {
      room.status = 'finished';
    }

    const savedRoom = await room.save();
    savedRoom._triggeredTrap = triggeredTrap;
    return savedRoom;
  },

  nextTurn: async (id) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');

    room.currentTurnIndex = getNextTurnIndex(room);
    room.hasRolledThisTurn = false;
    await room.save();

    return room;
  },

  resolveEventQuestion: async (id, difficulty, isCorrect, correctCountArg = null) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'playing') throw new Error('Game is not playing');

    const currentPlayerIndex = room.currentTurnIndex;
    const hasCorrectCount = correctCountArg !== null && correctCountArg !== undefined;
    const correctCount = hasCorrectCount
      ? Math.max(0, Math.min(3, Number(correctCountArg) || 0))
      : (isCorrect ? 1 : 0);
    const rewardDifficulty = hasCorrectCount
      ? (correctCount >= 3 ? 'hard' : correctCount === 2 ? 'medium' : correctCount === 1 ? 'easy' : null)
      : difficulty;

    if (!rewardDifficulty) {
      return {
        room,
        currentPlayerIndex,
        choices: [],
        isCorrect: false,
        correctCount,
        rewardDifficulty: null,
        noReward: true
      };
    }

    const choices = pickUniqueRewardChoices(rewardDifficulty, true, 3);

    if (!choices.length) {
      throw new Error('Không có phần thưởng cho mức độ đã đạt');
    }

    room.pendingEventReward = {
      currentPlayerIndex,
      difficulty: rewardDifficulty,
      isCorrect: true,
      correctCount,
      choices
    };

    await room.save();

    return {
      room,
      currentPlayerIndex,
      choices,
      isCorrect: true,
      correctCount,
      rewardDifficulty,
      noReward: false
    };
  },

  applyEventChoice: async (id, rewardId, targetPlayerId = null, trapCellIndex = null) => {
    const room = await Room.findById(id);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'playing') throw new Error('Game is not playing');

    const pending = room.pendingEventReward;
    if (!pending) throw new Error('No pending event reward');

    const currentPlayerIndex = pending.currentPlayerIndex;
    const selectedReward = (pending.choices || []).find((item) => item.id === rewardId);
    if (!selectedReward) throw new Error('Invalid reward choice');

    const placedTrap = selectedReward.type === 'place_trap'
      ? placeTrap(room, currentPlayerIndex, selectedReward, trapCellIndex)
      : null;

    const effectResult = !placedTrap
      ? applyEventEffect(room, currentPlayerIndex, selectedReward, targetPlayerId)
      : { appliedEffects: [], blockedEffects: [] };
    room.pendingEventReward = null;

    markPlayerFinishedIfNeeded(room, currentPlayerIndex);
    if (areAllPlayersFinished(room)) {
      room.status = 'finished';
    }

    await room.save();

    return {
      room,
      currentPlayerIndex,
      reward: selectedReward,
      placedTrap,
      appliedEffects: effectResult.appliedEffects || [],
      blockedEffects: effectResult.blockedEffects || [],
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

    // Calculate ranking based on finish order first, then highest position.
    const sortedPlayers = [...room.players].sort((a, b) => {
      const aFinishedRank = Number(a.finishedRank || 0);
      const bFinishedRank = Number(b.finishedRank || 0);

      if (aFinishedRank && bFinishedRank && aFinishedRank !== bFinishedRank) {
        return aFinishedRank - bFinishedRank;
      }
      if (aFinishedRank && !bFinishedRank) return -1;
      if (!aFinishedRank && bFinishedRank) return 1;

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
      finishTime: player.finishedAt || new Date()
    }));

    room.ranking = ranking;
    room.status = 'finished';
    room.gameEndedAt = new Date();

    return room.save();
  }
};
