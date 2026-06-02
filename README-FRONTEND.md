# 🎲 Monopoly Game Frontend

A complete React-based frontend for the Monopoly Game with three main pages:
1. **Room List** - Create and join game rooms
2. **Room Lobby** - View players and spectators
3. **Game Board** - Play the board game

## 🚀 Quick Start (Easiest Method)

### Option 1: Standalone HTML (Recommended for Quick Testing)

Simply open **`frontend-complete.html`** in your web browser!

**Requirements:**
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Backend server running on `http://localhost:3000`

**Steps:**
1. Make sure your backend server is running (`npm start` in the root directory)
2. Double-click `frontend-complete.html` or open it with your browser
3. Enter your name, choose an avatar, select your role
4. Create a new room or join an existing one
5. Start playing!

No installation, no npm, no build tools needed!

### Option 2: Full React Development Setup

If you want a proper React development environment:

**Requirements:**
- Node.js 14+ and npm
- Backend server running on `http://localhost:3000`

**Installation:**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The React dev server will start on `http://localhost:3000`.

## 📋 Features

### 🏠 Room List Page
- Browse all available game rooms
- Create new game rooms with custom names
- Enter your player name
- Choose from 8 different player avatars (🤖 🦁 🐯 🦊 🐻 🐼 🐨 🐸)
- Select role: **Player** or **Spectator**
- View room details (host, player count, spectators)
- Real-time room list updates every 3 seconds
- Join existing rooms

### 🎮 Room Lobby Page
- See all connected players with their status
- View spectators watching the game
- Show player money (💰)
- Display player connection status (connected/offline)
- Host can start game (requires minimum 2 players)
- Leave room option
- Real-time updates via Socket.IO

### 🎲 Game Board Page
- **20-tile monopoly board** with positions for all players
- **Dice rolling** - Roll 1-6 randomly
- **Player movement** - Based on dice value
- **Turn system** - Players take turns sequentially
- **Player stats** - Money and current position for each player
- **Real-time sync** - Game state synchronized across all players
- **Spectator view** - Spectators can watch the game
- **Current turn indicator** - Shows whose turn it is

## 🎮 How to Play

### Create a Room
1. Enter your name in "Player Name" field
2. Select your avatar by clicking any emoji
3. Choose role (Player or Spectator)
4. Click "Create Room" button
5. Enter room name in the modal
6. You'll be automatically added as the host

### Join a Room
1. Enter your name and select avatar
2. Find an available room in the list
3. Click "Join Room"
4. Wait for the host to start the game

### Play the Game
1. **Wait for your turn** - Look at "Current Turn" indicator
2. **Roll the dice** - Click "Roll Dice" button (only available on your turn)
3. **Watch your movement** - Player automatically moves based on dice value
4. **End your turn** - Click "End Turn" to pass to next player
5. **Repeat** - Game continues until you leave

## 🔧 Backend Integration

The frontend communicates with the backend using:

### REST API (HTTP)
- `GET /api/rooms` - List all rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms/:id/join` - Join room as player
- `POST /api/rooms/:id/spectators` - Join room as spectator
- `POST /api/rooms/:id/start` - Start the game
- `POST /api/rooms/:id/rollDice` - Roll dice
- `POST /api/rooms/:id/endTurn` - End current turn
- `POST /api/rooms/:id/leave` - Leave room

### Socket.IO Events (Real-time)
**Client → Server:**
- `joinRoom` - Join room
- `joinAsSpectator` - Join as spectator
- `startGame` - Start game
- `rollDice` - Roll dice
- `endTurn` - End turn
- `leaveRoom` - Leave room

**Server → Client:**
- `gameStarted` - Game has started
- `diceRolled` - Dice was rolled (value included)
- `playerMoved` - Player moved on board
- `turnEnded` - Turn ended, next player's turn
- `playerJoined` - New player joined
- `spectatorJoined` - New spectator joined

## 🎨 Customization

### Change Backend URL
In `frontend-complete.html`, find this line:
```javascript
const API_BASE = 'http://localhost:3000';
```
Change the port if your backend runs on a different port.

### Add More Player Avatars
In the code, find the `PLAYER_ICONS` array and add more emojis:
```javascript
const PLAYER_ICONS = ['🤖', '🦁', '🐯', '🦊', '🐻', '🐼', '🐨', '🐸', '🐢', '🦄'];
```

### Customize Board Size
The board size comes from the room's `boardSize` property (default 20 tiles).
To change it, modify the backend's default board size.

## 🌐 Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+

## 📱 Responsive Design

Works on all screen sizes:
- **Desktop** (1200px+) - Full layout with sidebar
- **Tablet** (768px+) - Adjusted grid
- **Mobile** (<768px) - Single column layout

## 🛠️ Troubleshooting

### "Cannot connect to server"
- Check backend is running: `npm start` in root directory
- Backend should be on `http://localhost:3000`
- Check firewall isn't blocking localhost connections

### Players not appearing in real-time
- Check browser console (F12) for errors
- Verify backend is running
- Refresh the page

### Dice roll not working
- Make sure it's your turn (check "Current Turn")
- Ensure you already rolled once (button disables after roll)
- Click "End Turn" to enable next roll

### Can't create/join room
- Make sure backend API is responding
- Check network tab in browser dev tools
- Verify CORS is enabled in backend

## 📁 Files Included

```
monopoly-game/
├── frontend-complete.html      ← OPEN THIS FILE IN BROWSER
├── SETUP-FRONTEND.md           ← Detailed setup guide
├── frontend/                   ← Full React project (optional)
│   ├── public/index.html
│   ├── src/
│   │   ├── pages/
│   │   │   ├── RoomListPage.js
│   │   │   ├── RoomLobbyPage.js
│   │   │   └── GameBoardPage.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   └── App.js
│   └── package.json
└── node_modules/
```

## 💾 Local Storage

Your preferences are saved in browser:
- **playerName** - Your name
- **selectedIcon** - Your avatar
- **userRole** - Your role (player/spectator)
- **serverUrl** - Backend server URL

## 🚀 Deployment

### For Standalone HTML
1. Upload `frontend-complete.html` to any web server
2. Update the `API_BASE` to point to your backend server

### For Full React App
```bash
cd frontend
npm run build
```
Deploy the `frontend/build/` folder to:
- Vercel
- Netlify
- GitHub Pages
- AWS S3
- Any static hosting service

## 📝 Game Rules

- **Basic Board Game** - 20 tiles arranged in a square
- **Dice Rolling** - Roll returns 1-6
- **Turn-based** - Players take turns in order
- **Movement** - Move the number of spaces shown on dice
- **Starting Position** - All players start at position 0
- **Money** - Each player starts with 💰1500
- **No Properties** - This version has basic tiles with no property features

## 🎯 Next Steps

1. Open `frontend-complete.html` in your browser
2. Make sure backend is running on port 3000
3. Enter your player name
4. Create a room or join one
5. Invite friends to play!
6. Click "Start Game" when ready
7. Roll dice and move!

## ❓ FAQ

**Q: Do I need to install anything?**
A: No for standalone HTML! Just open the file. For React version, you need Node.js.

**Q: What if backend is on a different port?**
A: Edit `const API_BASE = 'http://localhost:3000';` to your port.

**Q: Can I play with friends on different computers?**
A: Yes! Update `API_BASE` to point to your server's IP address.

**Q: Is my data saved?**
A: Game state is only kept while the room exists. Once everyone leaves, it's deleted.

**Q: Can spectators play later?**
A: No, spectators can only watch. They must create a new room as a player.

## 🤝 Support

For issues:
1. Check browser console (F12 → Console tab)
2. Verify backend is running and responsive
3. Try refreshing the page
4. Clear browser cache and local storage

## 📄 License

MIT License - Feel free to use and modify!

---

**Happy gaming! 🎲🎮**
