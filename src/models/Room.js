const mongoose = require('mongoose');
const { Schema } = mongoose;

const PlayerSchema = new Schema({
  playerId: {
    type: String,
    default: function() { return `player-${Date.now()}-${Math.random().toString(36).substr(2,9)}` }
  },

  name: {
    type: String,
    required: true
  },

  socketId: {
    type: String
  },

  position: {
    type: Number,
    default: 0
  },

  character: {
    type: Object,
    default: { id: 'dog', name: 'Chó', icon: '🐕', emoji: '🐕' }
  },

  isConnected: {
    type: Boolean,
    default: true
  },

  isReady: {
    type: Boolean,
    default: false
  },

  role: {
    type: String,
    enum: ['player','spectator'],
    default: 'player'
  },

  pendingDiceModifier: {
    type: Number,
    default: 0
  },

  shieldCount: {
    type: Number,
    default: 0
  },

  skipTurns: {
    type: Number,
    default: 0
  },

  finishedRank: {
    type: Number,
    default: null
  },

  finishedAt: {
    type: Date,
    default: null
  }
});

const SpectatorSchema = new Schema({
  spectatorId: {
    type: String,
    default: function() { return `spec-${Date.now()}-${Math.random().toString(36).substr(2,9)}` }
  },

  name: {
    type: String,
    required: true
  },

  socketId: {
    type: String
  },

  isConnected: {
    type: Boolean,
    default: true
  }
});

const RankingSchema = new Schema({
  playerId: String,
  name: String,
  rank: Number,
  position: Number,
  character: Object,
  finishTime: Date
});

const RoomSchema = new Schema({
  name: { type: String, required: true },
  host: { type: String, required: true },
  players: { type: [PlayerSchema], default: [] },
  spectators: { type: [SpectatorSchema], default: [] },
  maxPlayers: { type: Number, default: 5, min: 2, max: 5 },
  status: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
  boardState: { type: Schema.Types.Mixed, default: {} },
  boardSize: { type: Number, default: 68 },
  currentTurnIndex: { type: Number, default: 0 },
  hasRolledThisTurn: { type: Boolean, default: false },
  pendingEventReward: { type: Schema.Types.Mixed, default: null },
  usedQuestionKeys: { type: [String], default: [] },
  traps: { type: [Schema.Types.Mixed], default: [] },
  gameHistory: { type: [Schema.Types.Mixed], default: [] },
  ranking: { type: [RankingSchema], default: [] },
  gameStartedAt: { type: Date, default: null },
  gameEndedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema);
