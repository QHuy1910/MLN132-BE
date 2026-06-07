const Room = require('../models/Room');
const easyQuestions = require('../config/questions/easyQuestions.json');
const mediumQuestions = require('../config/questions/mediumQuestions.json');
const hardQuestions = require('../config/questions/hardQuestions.json');

const QUESTIONS_BY_DIFFICULTY = {
  easy: easyQuestions,
  medium: mediumQuestions,
  hard: hardQuestions
};

const getQuestionKey = (question = {}) => {
  const questionId = question.id ?? question.question;
  if (questionId === undefined || questionId === null || questionId === '') return '';
  return `${question.difficulty || 'easy'}:${questionId}`;
};

const toPublicQuestion = (question = {}) => {
  const {
    correctAnswer,
    questionKey,
    requestedBy,
    currentTurnIndex,
    ...publicQuestion
  } = question;

  return publicQuestion;
};

const normalizeQuestionMeta = (meta = {}) => ({
  isPreRoll: !!meta.isPreRoll,
  isEventSequence: !!meta.isEventSequence,
  eventStep: Number.isFinite(Number(meta.eventStep)) ? Number(meta.eventStep) : undefined,
  eventTotal: Number.isFinite(Number(meta.eventTotal)) ? Number(meta.eventTotal) : undefined
});

const pickUnusedQuestion = (difficulty, usedQuestionKeys = []) => {
  const normalizedDifficulty = difficulty || 'easy';
  const questionPool = QUESTIONS_BY_DIFFICULTY[normalizedDifficulty] || [];
  const usedKeys = new Set(usedQuestionKeys || []);
  const unusedQuestions = questionPool.filter((question) => (
    !usedKeys.has(getQuestionKey({ ...question, difficulty: normalizedDifficulty }))
  ));

  if (!unusedQuestions.length) return null;
  return unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)];
};

const getCurrentPlayer = (room) => room.players?.[room.currentTurnIndex] || null;

const createQuestionForRoom = async (roomId, playerName, difficulty, meta = {}) => {
  const room = await Room.findById(roomId);
  if (!room) throw new Error('Room not found');
  if (room.status !== 'playing') throw new Error('Game is not playing');

  const currentPlayer = getCurrentPlayer(room);
  if (currentPlayer && currentPlayer.name !== playerName) {
    throw new Error('Not your turn!');
  }

  const normalizedDifficulty = difficulty || 'easy';
  const randomQuestion = pickUnusedQuestion(normalizedDifficulty, room.usedQuestionKeys || []);
  if (!randomQuestion) {
    return { room, question: null };
  }

  const question = {
    ...randomQuestion,
    ...normalizeQuestionMeta(meta),
    difficulty: normalizedDifficulty
  };
  const questionKey = getQuestionKey(question);

  room.activeQuestion = {
    ...question,
    questionKey,
    requestedBy: currentPlayer?.name || playerName || '',
    currentTurnIndex: room.currentTurnIndex
  };

  if (questionKey && !room.usedQuestionKeys.includes(questionKey)) {
    room.usedQuestionKeys.push(questionKey);
  }

  await room.save();

  return {
    room,
    question: toPublicQuestion(room.activeQuestion)
  };
};

const answerActiveQuestion = async (roomId, playerName, selectedIndex) => {
  const room = await Room.findById(roomId);
  if (!room) throw new Error('Room not found');
  if (room.status !== 'playing') throw new Error('Game is not playing');

  const currentPlayer = getCurrentPlayer(room);
  if (currentPlayer && currentPlayer.name !== playerName) {
    throw new Error('Not your turn!');
  }

  const activeQuestion = room.activeQuestion;
  if (!activeQuestion) throw new Error('No active question');
  if (Number(activeQuestion.currentTurnIndex) !== Number(room.currentTurnIndex)) {
    throw new Error('Question is no longer active');
  }

  const selected = Number(selectedIndex);
  const correctIndex = Number(activeQuestion.correctAnswer);
  const isCorrect = selected === correctIndex;

  room.activeQuestion = null;
  await room.save();

  return {
    playerName: currentPlayer?.name || playerName || '',
    playerIndex: room.currentTurnIndex,
    selectedIndex: selected,
    correctIndex,
    isCorrect
  };
};

module.exports = {
  createQuestionForRoom,
  answerActiveQuestion,
  getQuestionKey
};
