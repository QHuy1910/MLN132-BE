# Monopoly Game Frontend - Complete Setup Guide

## 📋 Overview

This frontend provides a complete React-based UI for the Monopoly Game with three main pages:

1. **Room List Page** - Browse and create game rooms
2. **Room Lobby Page** - View players and spectators before starting
3. **Game Board Page** - Play the monopoly board game

## 🚀 Quick Start (Standalone HTML Version)

The easiest way to run the frontend is using the standalone HTML file:

1. **Open the file in a browser:**
   - Simply open `frontend-complete.html` in any modern web browser
   - No build tools or npm installation required
   - Make sure the backend server is running on `http://localhost:3000`

2. **Or serve it with a simple HTTP server:**
   ```bash
   # Using Python 3
   python -m http.server 8000
   # Then open http://localhost:8000 and navigate to frontend-complete.html
   ```

## 📦 Full React Setup (Optional)

If you prefer a full React development setup:

### Prerequisites
- Node.js 14+ and npm

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The app will open at `http://localhost:3000` (React dev server uses port 3000 by default, but you can change the port).

## 🏗️ Project Structure

```
monopoly-game/
├── frontend-complete.html          # Standalone version (recommended for easy use)
├── frontend/                        # Full React project
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── index.js
│   │   ├── index.css
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── services/
│   │   │   ├── api.js               # API calls
│   │   │   └── socket.js            # Socket.IO setup
│   │   └── pages/
│   │       ├── RoomListPage.js      # Room listing & creation
│   │       ├── RoomListPage.css
│   │       ├── RoomLobbyPage.js     # Lobby with player list
│   │       ├── RoomLobbyPage.css
│   │       ├── GameBoardPage.js     # Game board & gameplay
│   │       └── GameBoardPage.css
│   └── package.json
└── SETUP-GUIDE.md                   # This file
```

## 🎮 Features

### Room List Page
- ✅ View all available game rooms
- ✅ Create new game rooms
- ✅ Enter player name
- ✅ Select player avatar (8 different icons)
- ✅ Choose role (Player or Spectator)
- ✅ Join existing rooms
- ✅ Real-time room list updates

### Room Lobby Page
- ✅ Display list of connected players
- ✅ Display list of spectators
- ✅ Show player status (connected/disconnected)
- ✅ Show player money
- ✅ Host can start the game (requires 2+ players)
- ✅ Leave room option
- ✅ Real-time updates via Socket.IO

### Game Board Page
- ✅ 20-tile monopoly board (customizable)
- ✅ Players shown on board positions
- ✅ Roll dice functionality
- ✅ Take turns with other players
- ✅ End turn button
- ✅ Player stats panel (money, position)
- ✅ Current turn indicator
- ✅ Real-time game state synchronization

## 🔗 Backend Integration

The frontend connects to the backend on `http://localhost:3000` with:

- **REST API** for room management, player joining, and game actions
- **Socket.IO** for real-time events (player joined, game started, dice rolled, etc.)

### Key API Endpoints Used
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create room
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms/:id/join` - Join as player
- `POST /api/rooms/:id/spectators` - Join as spectator
- `POST /api/rooms/:id/start` - Start game
- `POST /api/rooms/:id/rollDice` - Roll dice
- `POST /api/rooms/:id/endTurn` - End turn

### Key Socket Events
- `joinRoom` - Join room as player
- `joinAsSpectator` - Join as spectator
- `startGame` - Start the game
- `rollDice` - Roll the dice
- `endTurn` - End current turn
- `gameStarted`, `diceRolled`, `playerMoved`, `turnEnded` - Events from server

## 🎨 Customization

### Change Backend URL
In the standalone HTML or React app, look for:
```javascript
const API_BASE = 'http://localhost:3000';
```
Change `3000` to your backend port if needed.

### Add More Player Icons
Edit the `PLAYER_ICONS` array:
```javascript
const PLAYER_ICONS = ['🤖', '🦁', '🐯', '🦊', '🐻', '🐼', '🐨', '🐸'];
```

### Customize Board Size
The board size is read from the room's `boardSize` property (default 20 tiles).

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## 🛠️ Troubleshooting

### "Cannot connect to server"
- Ensure backend is running on port 3000
- Check that CORS is enabled in backend
- Verify firewall isn't blocking localhost connections

### Socket connection errors
- Check that Socket.IO is enabled in backend
- Verify backend is accepting WebSocket connections
- Check browser console for detailed error messages

### Players not showing up in real-time
- Ensure Socket.IO connection is established
- Check network tab in browser dev tools
- Verify backend is broadcasting socket events

## 📱 Responsive Design

The frontend is fully responsive:
- Desktop (1200px+) - Full layout with sidebar
- Tablet (768px+) - Adjusted grid layout
- Mobile (<768px) - Single column layout

## 📝 Local Storage

The app uses browser local storage to remember:
- `playerName` - Your player name
- `selectedIcon` - Your chosen avatar
- `userRole` - Your role (player/spectator)
- `serverUrl` - Backend server URL

## 🚀 Production Deployment

For production, build the React app:

```bash
cd frontend
npm run build
```

This creates an optimized build in `frontend/build/` directory that can be deployed to any static hosting service (Vercel, Netlify, GitHub Pages, etc.).

## 📝 Notes

- The game board is a simple 20-tile layout with no property features yet
- Players move based on dice rolls (1-6)
- Turn system ensures players take turns in order
- All game state is synchronized in real-time via Socket.IO
- Spectators can watch the game but cannot interact

## 🤝 Support

For issues or questions, check:
1. Browser console (F12) for errors
2. Backend logs for server-side issues
3. Network tab to verify API calls are working
