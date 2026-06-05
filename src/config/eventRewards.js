let rewardsData = null;

try {
  rewardsData = require('./rewards.json');
} catch (error) {
  try {
    // Local development fallback when backend and frontend live in the same workspace.
    rewardsData = require('../../../FE/vite-project/src/data/rewards.json');
  } catch (fallbackError) {
    console.warn('Could not load rewards.json, fallback to empty rewards.', fallbackError?.message || fallbackError);
    rewardsData = {};
  }
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
  'force_skip_target',
  'place_trap'
]);

const getRewardsByDifficulty = (difficulty, isCorrect) => {
  const branch = isCorrect ? 'success' : 'failure';
  const byDifficulty = rewardsData?.[difficulty]?.[branch] || [];
  return byDifficulty.filter((item) => {
    if (!SUPPORTED_REWARD_TYPES.has(item.type)) return false;
    if (item.type === 'place_trap') return !!item.trapPenalty;
    return true;
  });
};

const getRewardChoiceGroup = (reward) => (
  reward.type === 'place_trap'
    ? reward.type
    : reward.type
);

const pickUniqueRewardChoices = (difficulty, isCorrect, count = 3) => {
  const candidates = [...getRewardsByDifficulty(difficulty, isCorrect)];
  const choices = [];
  const usedGroups = new Set();

  while (candidates.length && choices.length < count) {
    const availableCandidates = candidates.filter((reward) => (
      reward.type !== 'place_trap' || !usedGroups.has(getRewardChoiceGroup(reward))
    ));
    if (!availableCandidates.length) break;

    const uniqueGroupCandidates = availableCandidates.filter((reward) => !usedGroups.has(getRewardChoiceGroup(reward)));
    const selectableCandidates = uniqueGroupCandidates.length ? uniqueGroupCandidates : availableCandidates;
    const reward = selectableCandidates[Math.floor(Math.random() * selectableCandidates.length)];
    const candidateIndex = candidates.findIndex((candidate) => candidate.id === reward.id);

    choices.push(candidates.splice(candidateIndex, 1)[0]);
    usedGroups.add(getRewardChoiceGroup(reward));
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
