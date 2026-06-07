const roomService = require('../services/roomService');
const questionService = require('../services/questionService');

const EVENT_CELL_INDEXES = new Set([3, 5, 7, 9, 13, 16, 18, 20, 22, 26, 28, 30, 33, 34, 37, 39, 41, 43, 46, 49, 52, 53, 54, 57, 59, 63, 64]);

const normalizeName = (name = '') => String(name).trim().toLowerCase();
const generatePlayerId = () => `player-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
const describeShieldBlocks = (blockedEffects = []) => (
  blockedEffects
    .map((item) => `${item.result?.playerName || item.playerName || 'Nguoi choi'} chan ${item.result?.effectName || item.effectName || 'hieu ung bat loi'} bang khien`)
);

const describeTrapTrigger = (trapTrigger) => {
  if (!trapTrigger) return null;

  const trapNames = (trapTrigger.traps || [])
    .map((trap) => trap?.penalty?.name || 'Hinh phat');
  const shieldMessages = describeShieldBlocks(trapTrigger.blockedEffects || []);
  const parts = [`${trapTrigger.playerName} dap ${trapNames.length} bay: ${trapNames.join(', ')}`];

  if (shieldMessages.length) {
    parts.push(shieldMessages.join('; '));
  }

  return parts.join('. ');
};

const describeRewardShieldBlocks = (blockedEffects = []) => {
  const shieldMessages = describeShieldBlocks(blockedEffects);
  return shieldMessages.length ? shieldMessages.join('; ') : null;
};

const emitSocketError = (socket, eventName, error, userInfo = {}) => {
  const message = error?.message || String(error);
  console.error(`[socket:${eventName}] ${message}`, {
    socketId: socket.id,
    roomId: userInfo.roomId,
    name: userInfo.name,
    role: userInfo.role
  });
  socket.emit('error', { message });
};

const emitQuestionToTurnParticipants = (io, socket, roomId, room, question) => {
  const currentPlayer = room.players[room.currentTurnIndex];
  const recipientSocketIds = new Set();

  if (currentPlayer?.socketId) {
    recipientSocketIds.add(currentPlayer.socketId);
  }
  if (currentPlayer?.name) {
    recipientSocketIds.add(socket.id);
  }
  room.spectators
    .map((spectator) => spectator.socketId)
    .filter(Boolean)
    .forEach((spectatorSocketId) => recipientSocketIds.add(spectatorSocketId));

  recipientSocketIds.forEach((recipientSocketId) => {
    io.to(recipientSocketId).emit('showQuestion', { question });
  });
};

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    
    // Store player/spectator info on socket for disconnect handling
    let userInfo = { roomId: null, playerId: null, name: null, isSpectator: false, role: null };

    socket.on('joinRoom', async ({ roomId, name, playerId, character }) => {
      try {
        userInfo = { roomId, playerId, name, isSpectator: false, role: 'player' };
        
        // Update player socketId and connection status
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error('Room not found');
        
        const normalizedJoinName = normalizeName(name);
        const playerIndex = room.players.findIndex((p) => {
          const sameName = normalizeName(p.name) === normalizedJoinName;
          const sameId = playerId && p.playerId === playerId;
          return sameName || sameId;
        });
        if (playerIndex >= 0) {
          room.players[playerIndex].socketId = socket.id;
          room.players[playerIndex].isConnected = true;
          room.players[playerIndex].role = 'player';
          if (character) {
            room.players[playerIndex].character = character;
          }
          await room.save();
        } else {
          // Player not in room yet, need to add them (e.g., room creator joining)
          room.maxPlayers = roomService.normalizeMaxPlayers(room.maxPlayers);
          if (room.players.length >= room.maxPlayers) throw new Error('Room is full');
          const newPlayer = {
            playerId: playerId || generatePlayerId(),
            name,
            socketId: socket.id,
            position: 0,
            character: character || { id: 'dog', name: 'Chó', icon: '🐕', emoji: '🐕' },
            isConnected: true,
            isReady: false,
            role: 'player'
          };
          room.players.push(newPlayer);
          await room.save();
        }
        
        socket.join(roomId);
        io.to(roomId).emit('playerJoined', { 
          socketId: socket.id, 
          playerId,
          name,
          character: character,
          players: room.players,
          spectators: room.spectators
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('joinAsSpectator', async ({ roomId, name, spectatorId }) => {
      try {
        userInfo = { roomId, playerId: spectatorId, name, isSpectator: true, role: 'spectator' };
        
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error('Room not found');
        
        const spectatorIndex = room.spectators.findIndex(s => s.name === name);
        if (spectatorIndex >= 0) {
          room.spectators[spectatorIndex].socketId = socket.id;
          room.spectators[spectatorIndex].isConnected = true;
          await room.save();
        }
        
        socket.join(roomId);
        io.to(roomId).emit('spectatorJoined', {
          socketId: socket.id,
          spectatorId,
          name,
          spectators: room.spectators
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('leaveRoom', async ({ roomId, name }) => {
      try {
        socket.leave(roomId);
        // Fetch updated room data so other clients can update their state
        const room = await roomService.getRoomById(roomId);
        io.to(roomId).emit('playerLeft', {
          socketId: socket.id,
          name,
          players: room ? room.players : [],
          spectators: room ? room.spectators : []
        });
        userInfo = { roomId: null, playerId: null, name: null, isSpectator: false, role: null };
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('leaveAsSpectator', async ({ roomId, name }) => {
      try {
        socket.leave(roomId);
        const room = await roomService.getRoomById(roomId);
        io.to(roomId).emit('spectatorLeft', {
          socketId: socket.id,
          name,
          spectators: room ? room.spectators : []
        });
        userInfo = { roomId: null, playerId: null, name: null, isSpectator: false, role: null };
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('setReady', async ({ roomId, name, isReady }) => {
      try {
        if (userInfo.isSpectator) throw new Error('Spectators cannot set ready');
        const room = await roomService.setPlayerReady(roomId, name, isReady);
        io.to(roomId).emit('playerReadyChanged', {
          name,
          isReady,
          players: room.players
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('startGame', async ({ roomId, name }) => {
      try {
        
        
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error('Room not found');
        if (room.host !== name) throw new Error('Only the host can start the game');
        
        // If room is still waiting, start it via service.
        // If already started (e.g. via HTTP API), just broadcast current state.
        let startedRoom = room;
        if (room.status === 'waiting') {
          startedRoom = await roomService.startRoom(roomId);
        }
        
        io.to(roomId).emit('gameStarted', {
          players: startedRoom.players,
          currentTurnIndex: startedRoom.currentTurnIndex,
          currentPlayer: startedRoom.players[startedRoom.currentTurnIndex],
          boardSize: startedRoom.boardSize,
          traps: startedRoom.traps || [],
          showTrapsOnMap: startedRoom.showTrapsOnMap !== false,
          status: 'playing',
          hasRolledThisTurn: startedRoom.hasRolledThisTurn || false
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('requestQuestion', async ({ roomId, difficulty, meta }, ack) => {
      try {
        if (userInfo.isSpectator) throw new Error('Spectators cannot request questions');
        const result = await questionService.createQuestionForRoom(roomId, userInfo.name, difficulty, meta);

        if (!result.question) {
          if (typeof ack === 'function') {
            ack({ ok: false, message: 'Khong tim thay cau hoi cho muc do nay' });
          }
          return;
        }

        emitQuestionToTurnParticipants(io, socket, roomId, result.room, result.question);
        if (typeof ack === 'function') {
          ack({ ok: true });
        }
      } catch (error) {
        emitSocketError(socket, 'requestQuestion', error, userInfo);
        if (typeof ack === 'function') {
          ack({ ok: false, message: error?.message || String(error) });
        }
      }
    });

    socket.on('showQuestion', async (_payload, ack) => {
      const message = 'Questions must be requested from the server';
      socket.emit('error', { message });
      if (typeof ack === 'function') {
        ack({ ok: false, message });
      }
    });

    socket.on('answerQuestion', async ({ roomId, selectedIndex }, ack) => {
      try {
        if (userInfo.isSpectator) throw new Error('Spectators cannot answer questions');
        const result = await questionService.answerActiveQuestion(roomId, userInfo.name, selectedIndex);

        io.to(roomId).emit('questionAnswerRevealed', result);
        if (typeof ack === 'function') {
          ack({ ok: true, ...result });
        }
      } catch (error) {
        emitSocketError(socket, 'answerQuestion', error, userInfo);
        if (typeof ack === 'function') {
          ack({ ok: false, message: error?.message || String(error) });
        }
      }
    });

    socket.on('questionAnswerRevealed', async () => {
      try {
        throw new Error('Answers must be submitted to the server');
      } catch (error) {
        emitSocketError(socket, 'questionAnswerRevealed', error, userInfo);
      }
    });

    socket.on('rollDice', async ({ roomId }) => {
      try {
        if (userInfo.isSpectator) throw new Error('Spectators cannot roll dice');
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error('Room not found');
        if (room.status !== 'playing') throw new Error('Game is not playing');
        const currentPlayer = room.players[room.currentTurnIndex];

        // Verify turn by name (socketId can become stale on reconnect)
        if (currentPlayer && currentPlayer.name !== userInfo.name) {
          throw new Error('Not your turn!');
        }

        const { diceValues, total, modifier } = await roomService.rollDice(roomId);
        
        io.to(roomId).emit('diceRolled', { 
          socketId: socket.id,
          playerName: currentPlayer.name,
          diceValues,
          diceValue: total,
          total,
          modifier,
          currentTurnIndex: room.currentTurnIndex
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('movePlayer', async ({ roomId, steps }) => {
      try {
        if (userInfo.isSpectator) throw new Error('Spectators cannot move players');
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error('Room not found');
        if (room.status !== 'playing') throw new Error('Game is not playing');
        
        const currentPlayer = room.players[room.currentTurnIndex];
        if (currentPlayer && currentPlayer.name !== userInfo.name) {
          throw new Error('Not your turn!');
        }
        
        if (!room.hasRolledThisTurn) {
          throw new Error('Must roll dice first!');
        }

        const currentPlayerIndex = room.currentTurnIndex;
        const requestedSteps = Math.max(0, Number(steps) || 0);

        if (requestedSteps <= 0) {
          const nextRoom = await roomService.nextTurn(roomId);
          const nextPlayer = nextRoom.players[nextRoom.currentTurnIndex];

          io.to(roomId).emit('turnEnded', {
            previousPlayerIndex: currentPlayerIndex,
            currentTurnIndex: nextRoom.currentTurnIndex,
            currentPlayer: nextPlayer,
            players: nextRoom.players,
            traps: nextRoom.traps || [],
            hasRolledThisTurn: false,
            status: nextRoom.status,
            winner: null
          });
          return;
        }

        const updatedRoom = await roomService.movePlayer(roomId, currentPlayerIndex, requestedSteps, { triggerTraps: false });
        const movedPlayer = updatedRoom.players[currentPlayerIndex];
        const gameFinished = updatedRoom.status === 'finished';
        const pendingTrap = updatedRoom._pendingTrap;

        io.to(roomId).emit('playerMoved', {
          playerName: movedPlayer.name,
          playerIndex: currentPlayerIndex,
          newPosition: movedPlayer.position,
          boardSize: updatedRoom.boardSize,
          players: updatedRoom.players,
          traps: updatedRoom.traps || [],
          trapTriggered: updatedRoom._triggeredTrap || null,
          status: updatedRoom.status,
          winner: gameFinished ? movedPlayer : null,
          message: describeTrapTrigger(updatedRoom._triggeredTrap)
        });

        if (pendingTrap) {
          const trapDelayMs = Math.min(Math.max(requestedSteps * 170 + 450, 800), 4500);

          setTimeout(async () => {
            try {
              const trapRoom = await roomService.triggerTrapsAtCurrentPosition(roomId, currentPlayerIndex);
              const trapPlayer = trapRoom.players[currentPlayerIndex];
              const trapFinished = trapRoom.status === 'finished';
              io.to(roomId).emit('playerMoved', {
                playerName: trapPlayer.name,
                playerIndex: currentPlayerIndex,
                newPosition: trapPlayer.position,
                boardSize: trapRoom.boardSize,
                players: trapRoom.players,
                traps: trapRoom.traps || [],
                trapTriggered: trapRoom._triggeredTrap || null,
                status: trapRoom.status,
                winner: trapFinished ? trapPlayer : null,
                message: describeTrapTrigger(trapRoom._triggeredTrap)
              });

              if (trapFinished) {
                io.to(roomId).emit('turnEnded', {
                  previousPlayerIndex: currentPlayerIndex,
                  currentTurnIndex: trapRoom.currentTurnIndex,
                  currentPlayer: trapPlayer,
                  players: trapRoom.players,
                  traps: trapRoom.traps || [],
                  hasRolledThisTurn: false,
                  status: trapRoom.status,
                  winner: trapPlayer
                });
                return;
              }

              const nextRoom = await roomService.nextTurn(roomId);
              const nextPlayer = nextRoom.players[nextRoom.currentTurnIndex];

              io.to(roomId).emit('turnEnded', {
                previousPlayerIndex: currentPlayerIndex,
                currentTurnIndex: nextRoom.currentTurnIndex,
                currentPlayer: nextPlayer,
                players: nextRoom.players,
                traps: nextRoom.traps || [],
                hasRolledThisTurn: false,
                status: nextRoom.status,
                winner: null
              });
            } catch (error) {
              emitSocketError(socket, 'triggerTrapAfterMove', error, userInfo);
            }
          }, trapDelayMs);
          return;
        }

        if (gameFinished) {
          io.to(roomId).emit('turnEnded', {
            previousPlayerIndex: currentPlayerIndex,
            currentTurnIndex: updatedRoom.currentTurnIndex,
            currentPlayer: movedPlayer,
            players: updatedRoom.players,
            traps: updatedRoom.traps || [],
            hasRolledThisTurn: false,
            status: updatedRoom.status,
            winner: movedPlayer
          });
          return;
        }

        if (EVENT_CELL_INDEXES.has(movedPlayer.position)) {
          io.to(roomId).emit('eventCellLanded', {
            playerName: movedPlayer.name,
            playerIndex: currentPlayerIndex,
            cellIndex: movedPlayer.position,
            players: updatedRoom.players,
            traps: updatedRoom.traps || [],
            status: updatedRoom.status
          });
          return;
        }

        // Auto end turn after moving
        const nextRoom = await roomService.nextTurn(roomId);
        const nextPlayer = nextRoom.players[nextRoom.currentTurnIndex];

        io.to(roomId).emit('turnEnded', {
          previousPlayerIndex: currentPlayerIndex,
          currentTurnIndex: nextRoom.currentTurnIndex,
          currentPlayer: nextPlayer,
          players: nextRoom.players,
          hasRolledThisTurn: false,
          status: nextRoom.status,
          winner: null
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('resolveEventQuestion', async ({ roomId, difficulty, isCorrect, correctCount }, ack) => {
      try {
        if (userInfo.isSpectator) throw new Error('Spectators cannot resolve event questions');
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error('Room not found');
        if (room.status !== 'playing') throw new Error('Game is not playing');

        const currentPlayer = room.players[room.currentTurnIndex];
        if (currentPlayer && currentPlayer.name !== userInfo.name) {
          throw new Error('Not your turn!');
        }

        const resolution = await roomService.resolveEventQuestion(roomId, difficulty, !!isCorrect, correctCount);
        const updatedRoom = resolution.room;

        if (resolution.noReward) {
          io.to(roomId).emit('eventRewardChoices', {
            playerName: currentPlayer?.name,
            playerIndex: resolution.currentPlayerIndex,
            isCorrect: false,
            correctCount: resolution.correctCount,
            difficulty: null,
            rewardDifficulty: null,
            choices: [],
            noReward: true,
            players: updatedRoom.players,
            status: updatedRoom.status,
            message: 'Ban chua tra loi dung cau nao nen khong nhan thuong.'
          });

          const nextRoom = await roomService.nextTurn(roomId);
          const nextPlayer = nextRoom.players[nextRoom.currentTurnIndex];

          io.to(roomId).emit('turnEnded', {
            previousPlayerIndex: resolution.currentPlayerIndex,
            currentTurnIndex: nextRoom.currentTurnIndex,
            currentPlayer: nextPlayer,
            players: nextRoom.players,
            hasRolledThisTurn: false,
            status: nextRoom.status,
            winner: null
          });

          if (typeof ack === 'function') {
            ack({ ok: true });
          }
          return;
        }

        io.to(roomId).emit('eventRewardChoices', {
          playerName: currentPlayer?.name,
          playerIndex: resolution.currentPlayerIndex,
          isCorrect: resolution.isCorrect,
          correctCount: resolution.correctCount,
          difficulty: resolution.rewardDifficulty || difficulty,
          rewardDifficulty: resolution.rewardDifficulty || difficulty,
          choices: resolution.choices,
          players: updatedRoom.players,
          status: updatedRoom.status,
          message: resolution.isCorrect
            ? '✅ Trả lời đúng! Chọn 1 trong 3 phần thưởng.'
            : '❌ Trả lời sai! Chọn 1 trong 3 hình phạt.'
        });
        if (typeof ack === 'function') {
          ack({ ok: true });
        }
      } catch (error) {
        emitSocketError(socket, 'resolveEventQuestion', error, userInfo);
        if (typeof ack === 'function') {
          ack({ ok: false, message: error?.message || String(error) });
        }
      }
    });

    socket.on('chooseEventReward', async ({ roomId, rewardId, targetPlayerId, trapCellIndex }) => {
      try {
        if (userInfo.isSpectator) throw new Error('Spectators cannot choose event rewards');
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error('Room not found');
        if (room.status !== 'playing') throw new Error('Game is not playing');

        const currentPlayer = room.players[room.currentTurnIndex];
        if (currentPlayer && currentPlayer.name !== userInfo.name) {
          throw new Error('Not your turn!');
        }

        const applied = await roomService.applyEventChoice(roomId, rewardId, targetPlayerId, trapCellIndex);
        const updatedRoom = applied.room;
        const resolvedPlayer = updatedRoom.players[applied.currentPlayerIndex];
        const targetPlayer = targetPlayerId
          ? updatedRoom.players.find((player) => player.playerId === targetPlayerId || player.name === targetPlayerId)
          : null;
        const gameFinished = updatedRoom.status === 'finished';
        const shieldBlockMessage = describeRewardShieldBlocks(applied.blockedEffects || []);
        const rewardMessage = shieldBlockMessage
          || (applied.placedTrap
            ? `Da dat bay o o ${applied.placedTrap.cellIndex}: ${applied.placedTrap.penalty?.name || 'Hinh phat'}`
            : (applied.isCorrect
              ? `Nhan: ${applied.reward?.name || 'Phan thuong'}`
              : `Bi phat: ${applied.reward?.name || 'Hinh phat'}`));

        io.to(roomId).emit('eventRewardApplied', {
          playerName: resolvedPlayer?.name,
          playerIndex: applied.currentPlayerIndex,
          reward: applied.reward,
          targetPlayerName: targetPlayer?.name || null,
          placedTrap: applied.placedTrap || null,
          isCorrect: applied.isCorrect,
          players: updatedRoom.players,
          traps: updatedRoom.traps || [],
          status: updatedRoom.status,
          message: applied.placedTrap
            ? `Da dat bay o o ${applied.placedTrap.cellIndex}: ${applied.placedTrap.penalty?.name || 'Hinh phat'}`
            : (applied.isCorrect
              ? `✅ Nhận: ${applied.reward?.name || 'Phần thưởng'}`
              : `❌ Bị phạt: ${applied.reward?.name || 'Hình phạt'}`),
          message: rewardMessage,
          winner: gameFinished ? resolvedPlayer : null
        });

        if (gameFinished) {
          io.to(roomId).emit('turnEnded', {
            previousPlayerIndex: applied.currentPlayerIndex,
            currentTurnIndex: updatedRoom.currentTurnIndex,
            currentPlayer: resolvedPlayer,
            players: updatedRoom.players,
            hasRolledThisTurn: false,
            status: updatedRoom.status,
            winner: resolvedPlayer
          });
          return;
        }

        const nextRoom = await roomService.nextTurn(roomId);
        const nextPlayer = nextRoom.players[nextRoom.currentTurnIndex];

        io.to(roomId).emit('turnEnded', {
          previousPlayerIndex: applied.currentPlayerIndex,
          currentTurnIndex: nextRoom.currentTurnIndex,
          currentPlayer: nextPlayer,
          players: nextRoom.players,
          hasRolledThisTurn: false,
          status: nextRoom.status,
          winner: null
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('eventRewardShuffled', async ({ roomId, choices }) => {
      try {
        if (userInfo.isSpectator) throw new Error('Spectators cannot shuffle event rewards');
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error('Room not found');
        if (room.status !== 'playing') throw new Error('Game is not playing');

        const currentPlayer = room.players[room.currentTurnIndex];
        if (currentPlayer && currentPlayer.name !== userInfo.name) {
          throw new Error('Not your turn!');
        }

        io.to(roomId).emit('eventRewardShuffled', {
          playerName: currentPlayer?.name,
          playerIndex: room.currentTurnIndex,
          choices: Array.isArray(choices) ? choices : []
        });
      } catch (error) {
        emitSocketError(socket, 'eventRewardShuffled', error, userInfo);
      }
    });

    socket.on('eventActionPreview', async ({ roomId, actionType, reward }) => {
      try {
        if (userInfo.isSpectator) throw new Error('Spectators cannot preview event actions');
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error('Room not found');
        if (room.status !== 'playing') throw new Error('Game is not playing');

        const currentPlayer = room.players[room.currentTurnIndex];
        if (currentPlayer && currentPlayer.name !== userInfo.name) {
          throw new Error('Not your turn!');
        }

        if (actionType === 'trapPlacement') {
          return;
        }

        room.spectators
          .map((spectator) => spectator.socketId)
          .filter(Boolean)
          .forEach((spectatorSocketId) => {
            io.to(spectatorSocketId).emit('eventActionPreview', {
              playerName: currentPlayer?.name,
              playerIndex: room.currentTurnIndex,
              actionType,
              reward
            });
          });
      } catch (error) {
        emitSocketError(socket, 'eventActionPreview', error, userInfo);
      }
    });

    socket.on('endTurn', async ({ roomId }) => {
      try {
        if (userInfo.isSpectator) throw new Error('Spectators cannot end turns');
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error('Room not found');
        const currentPlayerIndex = room.currentTurnIndex;
        const currentPlayer = room.players[currentPlayerIndex];

        // Verify turn by name instead of socketId
        if (currentPlayer && currentPlayer.name !== userInfo.name) {
          throw new Error('Not your turn!');
        }

        const updatedRoom = await roomService.nextTurn(roomId);
        const nextPlayer = updatedRoom.players[updatedRoom.currentTurnIndex];

        io.to(roomId).emit('turnEnded', {
          previousPlayerIndex: currentPlayerIndex,
          currentTurnIndex: updatedRoom.currentTurnIndex,
          currentPlayer: nextPlayer,
          players: updatedRoom.players,
          hasRolledThisTurn: false
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('updatePlayerPositions', async ({ roomId, positions }) => {
      try {
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error('Room not found');
        if (room.host !== userInfo.name) throw new Error('Only the host can update player positions');

        const updatedRoom = await roomService.updatePlayerPositions(roomId, positions);
        io.to(roomId).emit('playerPositionsUpdated', {
          roomId,
          players: updatedRoom.players,
          spectators: updatedRoom.spectators,
          currentTurnIndex: updatedRoom.currentTurnIndex,
          currentPlayer: updatedRoom.players[updatedRoom.currentTurnIndex],
          boardSize: updatedRoom.boardSize,
          traps: updatedRoom.traps || [],
          status: updatedRoom.status,
          message: `${userInfo.name} da cap nhat vi tri nguoi choi`
        });
      } catch (error) {
        emitSocketError(socket, 'updatePlayerPositions', error, userInfo);
      }
    });

    socket.on('setTrapVisibility', async ({ roomId, showTrapsOnMap }) => {
      try {
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error('Room not found');
        if (room.host !== userInfo.name) throw new Error('Only the host can update trap visibility');

        const updatedRoom = await roomService.setTrapVisibility(roomId, showTrapsOnMap);
        io.to(roomId).emit('trapVisibilityChanged', {
          roomId,
          showTrapsOnMap: updatedRoom.showTrapsOnMap !== false
        });
      } catch (error) {
        emitSocketError(socket, 'setTrapVisibility', error, userInfo);
      }
    });

    socket.on('getGameState', async ({ roomId }) => {
      try {
        const room = await roomService.getRoomById(roomId);
        socket.emit('gameState', {
          roomId,
          players: room.players,
          spectators: room.spectators,
          currentTurnIndex: room.currentTurnIndex,
          currentPlayer: room.players[room.currentTurnIndex],
          hasRolledThisTurn: room.hasRolledThisTurn,
          boardSize: room.boardSize,
          traps: room.traps || [],
          showTrapsOnMap: room.showTrapsOnMap !== false,
          usedQuestionKeys: room.usedQuestionKeys || [],
          status: room.status
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', async () => {
  console.log('Socket disconnected:', socket.id);

  try {

    // không có thông tin user
    if (!userInfo.roomId || !userInfo.name) {
      return;
    }

    // tìm room hiện tại
    const room = await roomService.getRoomById(userInfo.roomId);

    // room không tồn tại
    if (!room) {
      return;
    }

    // =========================================
    // SPECTATOR
    // =========================================
    if (userInfo.isSpectator) {

      const spectatorExists = room.spectators.some(
        spectator => spectator.name === userInfo.name
      );

      // spectator không tồn tại
      if (!spectatorExists) {
        return;
      }

      // xóa spectator
      const updatedRoom = await roomService.removeSpectator(
        userInfo.roomId,
        userInfo.name
      );

      // broadcast realtime
      io.to(userInfo.roomId).emit('spectatorLeft', {
        socketId: socket.id,
        name: userInfo.name,
        spectators: updatedRoom.spectators
      });

      console.log(
        `Spectator ${userInfo.name} auto removed from room`
      );
    }

    // =========================================
    // PLAYER
    // =========================================
    else {

      const playerExists = room.players.some(
        player => player.name === userInfo.name
      );

      // player không tồn tại
      if (!playerExists) {
        return;
      }

      // xóa player
      const updatedRoom = await roomService.leaveRoom(
        userInfo.roomId,
        userInfo.name
      );

      // broadcast realtime
      io.to(userInfo.roomId).emit('playerLeft', {
        socketId: socket.id,
        name: userInfo.name,
        players: updatedRoom.players,
        spectators: updatedRoom.spectators
      });

      console.log(
        `Player ${userInfo.name} auto removed from room`
      );
    }

    // reset userInfo
    userInfo = {
      roomId: null,
      playerId: null,
      name: null,
      isSpectator: false,
      role: null
    };

  } catch (error) {

    console.error(
      'Disconnect cleanup error:',
      error.message
    );

  }
});
  });
};

