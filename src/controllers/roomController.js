const roomService = require('../services/roomService');

exports.createRoom = async (req, res) => {
  try {
    const data = req.body;
    const room = await roomService.createRoom(data);
    res.status(201).json(room);
  } catch (err) {
    console.error('createRoom error:', err, 'body:', req.body);
    res.status(400).json({ error: err.message });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const rooms = await roomService.getRooms();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const room = await roomService.getRoomById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const room = await roomService.updateRoom(req.params.id, req.body);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await roomService.deleteRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const player = req.body;
    const room = await roomService.joinRoom(req.params.id, player);
    res.json(room);
  } catch (err) {
    console.error('joinRoom error:', err, 'body:', req.body);
    res.status(400).json({ error: err.message });
  }
};

exports.startRoom = async (req, res) => {
  try {
    const room = await roomService.startRoom(req.params.id);
    res.json(room);
  } catch (err) {
    const statusCode = err.message === 'Room not found' ? 404 : 400;
    res.status(statusCode).json({ error: err.message });
  }
};

exports.endRoom = async (req, res) => {
  try {
    const room = await roomService.endRoom(req.params.id);
    res.json(room);
  } catch (err) {
    const statusCode = err.message === 'Room not found' ? 404 : 400;
    res.status(statusCode).json({ error: err.message });
  }
};

exports.leaveRoom = async (req, res) => {
  try {
    const playerName = req.body.name;
    if (!playerName) return res.status(400).json({ error: 'Player name required' });
    
    const room = await roomService.leaveRoom(req.params.id, playerName);
    res.json(room);
  } catch (err) {
    const statusCode = err.message === 'Room not found' ? 404 : 400;
    res.status(statusCode).json({ error: err.message });
  }
};

exports.setPlayerReady = async (req, res) => {
  try {
    const { name, isReady } = req.body;
    if (!name) return res.status(400).json({ error: 'Player name required' });
    
    const room = await roomService.setPlayerReady(req.params.id, name, isReady);
    res.json(room);
  } catch (err) {
    const statusCode = err.message === 'Room not found' ? 404 : 400;
    res.status(statusCode).json({ error: err.message });
  }
};

exports.addSpectator = async (req, res) => {
  try {
    const spectatorData = req.body;
    if (!spectatorData.name) return res.status(400).json({ error: 'Spectator name required' });
    
    const room = await roomService.addSpectator(req.params.id, spectatorData);
    res.json(room);
  } catch (err) {
    console.error('addSpectator error:', err, 'body:', req.body);
    const statusCode = err.message === 'Room not found' ? 404 : 400;
    res.status(statusCode).json({ error: err.message });
  }
};

exports.removeSpectator = async (req, res) => {
  try {
    const spectatorName = req.body.name;
    if (!spectatorName) return res.status(400).json({ error: 'Spectator name required' });
    
    const room = await roomService.removeSpectator(req.params.id, spectatorName);
    res.json(room);
  } catch (err) {
    const statusCode = err.message === 'Room not found' ? 404 : 400;
    res.status(statusCode).json({ error: err.message });
  }
};

exports.completeRoom = async (req, res) => {
  try {
    const room = await roomService.completeRoom(req.params.id);
    res.json(room);
  } catch (err) {
    const statusCode = err.message === 'Room not found' ? 404 : 400;
    res.status(statusCode).json({ error: err.message });
  }
};
