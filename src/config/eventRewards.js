let rewardsData = null;

try {
  // Reuse the same reward table used by the frontend.
  rewardsData = require('../../../FE/vite-project/src/data/rewards.json');
} catch (error) {
  console.warn('Could not load shared rewards.json, fallback to empty rewards.', error?.message || error);
  rewardsData = {};
}

const SUPPORTED_REWARD_TYPES = new Set([
  'move_self',
  'move_self_back',
  'dice_bonus',
  'dice_penalty',
  'shield',
  'skip_turn',
  'move_target_back',
  'move_all_others_back',
  'force_skip_target'
]);

const getRewardsByDifficulty = (difficulty, isCorrect) => {
  const branch = isCorrect ? 'success' : 'failure';
  const byDifficulty = rewardsData?.[difficulty]?.[branch] || [];
  return byDifficulty.filter((item) => SUPPORTED_REWARD_TYPES.has(item.type));
};

const pickUniqueRewardChoices = (difficulty, isCorrect, count = 3) => {
  const candidates = [...getRewardsByDifficulty(difficulty, isCorrect)];
  const choices = [];

  while (candidates.length && choices.length < count) {
    const index = Math.floor(Math.random() * candidates.length);
    choices.push(candidates.splice(index, 1)[0]);
  }

  return choices;
};

const pickRandomReward = (difficulty, isCorrect) => {
  const candidates = getRewardsByDifficulty(difficulty, isCorrect);
  if (!candidates.length) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
};

module.exports = {
  pickRandomReward,
  pickUniqueRewardChoices,
  getRewardsByDifficulty
};
