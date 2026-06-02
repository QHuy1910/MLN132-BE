# 🎲 Monopoly Game - Test Guide

## Quick Start

### 1. Start the Server
```bash
npm run dev
# or
npm start
```
Server will run on `http://localhost:5000`

### 2. Open Test Client
Open **2 or more** browser windows/tabs:
- Go to: `http://localhost:5000/test-client.html`

### 3. Testing Workflow

#### Player 1:
1. Enter name (e.g., "Player1")
2. Click "🔌 Connect"
3. Click "➕ Create Room" (auto-generates room ID)
4. Click "✅ Join Room"
5. Wait for other players

#### Player 2:
1. Enter name (e.g., "Player2")
2. Click "🔌 Connect"
3. Copy Player 1's room ID and paste it
4. Click "✅ Join Room"

#### Player 3+ (optional):
- Repeat Player 2 steps

#### Start Game:
1. Host clicks "🚀 Start Game"
2. Game starts, board updates
3. Turn system begins

#### Gameplay:
1. Current player sees "Your Turn!" section
2. Click "🎲 Roll Dice"
3. Dice display shows result
4. Click "➡️ Move Player"
5. Player moves that many tiles
6. Click "⏭️ End Turn"
7. Next player's turn begins

## Features Implemented

✅ **Room Management**
- Create and join rooms
- Multiple players per room

✅ **Turn System**
- Turn order management
- Only current player can roll
- Prevent double-rolling

✅ **Dice & Movement**
- Random dice rolls (1-6 per die)
- Position updates
- Board wrapping (20 tiles default)

✅ **Real-time Sync**
- All players see same game state
- Live position updates
- Turn notifications

✅ **Event Logging**
- Real-time action log
- Connection status
- Error messages

## Events Used

### Socket Events
- `joinRoom` - Player joins a room
- `startGame` - Initialize game
- `rollDice` - Roll dice (validated)
- `movePlayer` - Update position
- `endTurn` - Pass turn to next player
- `getGameState` - Fetch current state

### Broadcasting
- `playerJoined` - New player joined
- `gameStarted` - Game is ready
- `diceRolled` - Dice result
- `playerMoved` - Position changed
- `turnEnded` - Next player's turn

## Troubleshooting

**Issue**: "Room not found"
- Solution: Make sure room ID is correct and server is running

**Issue**: "Not your turn!"
- Solution: Wait for your turn, watch event log for turn notifications

**Issue**: "Must roll dice first!"
- Solution: Click "🎲 Roll Dice" before moving

**Issue**: Players not syncing
- Solution: Check browser console for errors, refresh and rejoin

## Next Steps

After testing, you can add:
1. Property system (buy/sell)
2. Money management
3. Game end conditions
4. Chat system
5. Animations
