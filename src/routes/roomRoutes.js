const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

/**
 * @openapi
 * tags:
 *   - name: Rooms
 *     description: Room management
 */

/**
 * @openapi
 * /api/rooms:
 *   get:
 *     tags:
 *       - Rooms
 *     summary: List all rooms
 *     description: Get a list of all active game rooms
 *     responses:
 *       200:
 *         description: Array of rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 *             examples:
 *               rooms:
 *                 value:
 *                   - _id: "507f1f77bcf86cd799439011"
 *                     name: "Phòng 1"
 *                     host: "Huy"
 *                     maxPlayers: 4
 *                     status: "waiting"
 *                     players: []
 *                     boardState: {}
 *                     createdAt: "2024-05-25T10:00:00Z"
 *                   - _id: "507f1f77bcf86cd799439012"
 *                     name: "Phòng 2"
 *                     host: "Linh"
 *                     maxPlayers: 4
 *                     status: "playing"
 *                     players:
 *                       - name: "Linh"
 *                         socketId: "abc123"
 *                         position: 5
 *                         money: 1200
 *                     boardState: {}
 *                     createdAt: "2024-05-25T09:30:00Z"
 */
router.get('/', roomController.getRooms);

/**
 * @openapi
 * /api/rooms:
 *   post:
 *     tags:
 *       - Rooms
 *     summary: Create a new room
 *     description: Create a new game room with a specified name, host, and max players
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Phòng cuối tuần"
 *               host:
 *                 type: string
 *                 example: "Huy"
 *               maxPlayers:
 *                 type: integer
 *                 example: 4
 *             required: [name, host]
 *     responses:
 *       201:
 *         description: Room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *             examples:
 *               createdRoom:
 *                 value:
 *                   _id: "507f1f77bcf86cd799439011"
 *                   name: "Phòng cuối tuần"
 *                   host: "Huy"
 *                   maxPlayers: 4
 *                   status: "waiting"
 *                   players: []
 *                   boardState: {}
 *                   createdAt: "2024-05-25T10:00:00Z"
 *       400:
 *         description: Invalid request data
 */
router.post('/', roomController.createRoom);

/**
 * @openapi
 * /api/rooms/{id}:
 *   get:
 *     tags:
 *       - Rooms
 *     summary: Get room details
 *     description: Retrieve details of a specific room by ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Room ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *             examples:
 *               room:
 *                 value:
 *                   _id: "507f1f77bcf86cd799439011"
 *                   name: "Phòng 1"
 *                   host: "Huy"
 *                   maxPlayers: 4
 *                   status: "waiting"
 *                   players:
 *                     - name: "Huy"
 *                       socketId: "socket123"
 *                       position: 0
 *                       money: 1500
 *                   boardState: {}
 *                   createdAt: "2024-05-25T10:00:00Z"
 *       404:
 *         description: Room not found
 */
router.get('/:id', roomController.getRoomById);

/**
 * @openapi
 * /api/rooms/{id}:
 *   put:
 *     tags:
 *       - Rooms
 *     summary: Update room
 *     description: Update room settings like status or maxPlayers
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         example: "507f1f77bcf86cd799439011"
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [waiting, playing, finished]
 *               maxPlayers:
 *                 type: integer
 *             example:
 *               status: "playing"
 *     responses:
 *       200:
 *         description: Room updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       404:
 *         description: Room not found
 */
router.put('/:id', roomController.updateRoom);

/**
 * @openapi
 * /api/rooms/{id}:
 *   delete:
 *     tags:
 *       - Rooms
 *     summary: Delete a room
 *     description: Delete a game room permanently
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         example: "507f1f77bcf86cd799439011"
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Room deleted"
 *       404:
 *         description: Room not found
 */
router.delete('/:id', roomController.deleteRoom);

/**
 * @openapi
 * /api/rooms/{id}/join:
 *   post:
 *     tags:
 *       - Rooms
 *     summary: Join a room as a player
 *     description: Add a player to an existing room (max players limit applies)
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         example: "507f1f77bcf86cd799439011"
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Linh"
 *               socketId:
 *                 type: string
 *                 example: "socket456"
 *             required: [name]
 *     responses:
 *       200:
 *         description: Player joined room successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *             examples:
 *               joined:
 *                 value:
 *                   _id: "507f1f77bcf86cd799439011"
 *                   name: "Phòng 1"
 *                   host: "Huy"
 *                   maxPlayers: 4
 *                   status: "waiting"
 *                   players:
 *                     - name: "Huy"
 *                       socketId: "socket123"
 *                       position: 0
 *                       money: 1500
 *                     - name: "Linh"
 *                       socketId: "socket456"
 *                       position: 0
 *                       money: 1500
 *                   boardState: {}
 *                   createdAt: "2024-05-25T10:00:00Z"
 *       400:
 *         description: Room is full or invalid request
 */
router.post('/:id/join', roomController.joinRoom);

/**
 * @openapi
 * /api/rooms/{id}/start:
 *   post:
 *     tags:
 *       - Rooms
 *     summary: Start a room
 *     description: Start the game for a room. Room must be in waiting state and have at least 2 players.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         example: "507f1f77bcf86cd799439011"
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room started successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Invalid room state or not enough players
 *       404:
 *         description: Room not found
 */
router.post('/:id/start', roomController.startRoom);

/**
 * @openapi
 * /api/rooms/{id}/end:
 *   post:
 *     tags:
 *       - Rooms
 *     summary: End a room
 *     description: End the game for a room. Room must be in playing state.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         example: "507f1f77bcf86cd799439011"
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Invalid room state
 *       404:
 *         description: Room not found
 */
router.post('/:id/end', roomController.endRoom);

/**
 * @openapi
 * /api/rooms/{id}/leave:
 *   post:
 *     tags:
 *       - Rooms
 *     summary: Leave a room as a player
 *     description: Remove a player from a room
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         example: "507f1f77bcf86cd799439011"
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Huy"
 *             required: [name]
 *     responses:
 *       200:
 *         description: Player left room successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Invalid request or player not found
 *       404:
 *         description: Room not found
 */
router.post('/:id/leave', roomController.leaveRoom);

/**
 * @openapi
 * /api/rooms/{id}/ready:
 *   post:
 *     tags:
 *       - Rooms
 *     summary: Set player ready status
 *     description: Mark a player as ready or not ready
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         example: "507f1f77bcf86cd799439011"
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Huy"
 *               isReady:
 *                 type: boolean
 *                 example: true
 *             required: [name, isReady]
 *     responses:
 *       200:
 *         description: Player ready status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Room not found
 */
router.post('/:id/ready', roomController.setPlayerReady);

/**
 * @openapi
 * /api/rooms/{id}/spectators:
 *   post:
 *     tags:
 *       - Rooms
 *     summary: Join room as spectator
 *     description: Add a spectator to a room
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         example: "507f1f77bcf86cd799439011"
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Observer"
 *               socketId:
 *                 type: string
 *                 example: "socket789"
 *             required: [name]
 *     responses:
 *       200:
 *         description: Spectator joined successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Room not found
 */
router.post('/:id/spectators', roomController.addSpectator);

/**
 * @openapi
 * /api/rooms/{id}/spectate:
 *   post:
 *     tags:
 *       - Rooms
 *     summary: Join room as spectator (alternative endpoint)
 *     description: Add a spectator to a room (compatible with test client)
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         example: "507f1f77bcf86cd799439011"
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Observer"
 *               socketId:
 *                 type: string
 *                 example: "socket789"
 *             required: [name]
 *     responses:
 *       200:
 *         description: Spectator joined successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Room not found
 */
router.post('/:id/spectate', roomController.addSpectator);

/**
 * @openapi
 * /api/rooms/{id}/spectators/leave:
 *   post:
 *     tags:
 *       - Rooms
 *     summary: Leave room as spectator
 *     description: Remove a spectator from a room
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         example: "507f1f77bcf86cd799439011"
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Observer"
 *             required: [name]
 *     responses:
 *       200:
 *         description: Spectator left successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Room not found
 */
router.post('/:id/spectators/leave', roomController.removeSpectator);

/**
 * @openapi
 * /api/rooms/{id}/complete:
 *   post:
 *     tags:
 *       - Rooms
 *     summary: Complete a room and calculate rankings
 *     description: End the game and calculate player rankings based on position and money
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         example: "507f1f77bcf86cd799439011"
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room completed successfully with rankings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [finished]
 *                 ranking:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rank:
 *                         type: number
 *                       name:
 *                         type: string
 *                       position:
 *                         type: number
 *                       money:
 *                         type: number
 *                       character:
 *                         type: object
 *             example:
 *               _id: "507f1f77bcf86cd799439011"
 *               name: "Phòng 1"
 *               status: "finished"
 *               ranking:
 *                 - rank: 1
 *                   name: "Huy"
 *                   position: 112
 *                   money: 1500
 *                   character:
 *                     icon: "🐕"
 *                     emoji: "🐕"
 *                 - rank: 2
 *                   name: "Linh"
 *                   position: 80
 *                   money: 1200
 *                   character:
 *                     icon: "🐈"
 *                     emoji: "🐈"
 *       400:
 *         description: Invalid room state
 *       404:
 *         description: Room not found
 */
router.post('/:id/complete', roomController.completeRoom);

module.exports = router;
