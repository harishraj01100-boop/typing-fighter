// ============================================================
// WORD BANK - categorized by difficulty, no database required.
// ============================================================

const EASY = [
  'cat','dog','run','sun','box','pen','red','sky','hat','arm',
  'leg','fox','owl','bee','ant','ice','oak','elm','egg','fan',
  'gem','ink','jaw','key','log','map','net','oar','pig','rat',
  'sap','tap','urn','van','web','yak','zip','ash','bat','cup',
  'dot','ear','fig','gap','hip','jam','kit','lip','mud','nap',
  'orb','pit','rib','sun','tag','vex','win','zoo','axe','bud'
];

const MEDIUM = [
  'warrior','shadow','castle','dragon','hunter','forest','thunder','crystal',
  'phantom','battle','knight','wizard','armor','blade','falcon','glacier',
  'temple','rocket','planet','vortex','engine','cannon','signal','victory',
  'legend','mirror','desert','island','bridge','tunnel','harbor','meteor',
  'volcano','falcon','shield','arrow','flame','frost','spirit','venom',
  'gravity','circuit','fusion','matrix','nebula','plasma','quartz','raptor',
  'saber','talon','umbra','vertex','whisper','zephyr','anchor','beacon'
];

const HARD = [
  'destruction','revolution','avalanche','earthquake','hurricane',
  'annihilate','resistance','equilibrium','phenomenon','catastrophe',
  'imagination','constellation','architecture','independence','electricity',
  'psychology','technology','philosophy','mathematics','communication',
  'exploration','regeneration','transformation','determination','concentration',
  'illumination','manifestation','synchronize','vulnerability','extraordinary',
  'unstoppable','relentless','formidable','indomitable','cataclysm'
];

const EXPERT = [
  'incomprehensible','disproportionate','counterintuitive','unforeseeable',
  'multidimensional','disenfranchisement','characteristically','overcompensating',
  'interdisciplinary','uncharacteristically','extraterritoriality','deinstitutionalization',
  'antidisestablishmentarianism','pneumonoultramicroscopicsilicovolcanoconiosis',
  'incontrovertible','unpredictability','misappropriation','notwithstanding',
  'quintessentially','unconstitutional','disproportionately','institutionalization'
];

// Special power words - trigger unique special attacks & effects
const SPECIAL = ['FIRE', 'LIGHTNING', 'SHADOW', 'THUNDER', 'STORM', 'FROST', 'VOID', 'BLAZE'];

const ALL_WORDS = {
  easy: EASY,
  medium: MEDIUM,
  hard: HARD,
  expert: EXPERT,
  special: SPECIAL
};

/**
 * Category weighting changes as the match/combo progresses so the game
 * ramps in intensity, and special words appear occasionally for spectacle.
 */
function pickCategory(comboCount) {
  const specialChance = Math.min(0.06 + comboCount * 0.01, 0.18);
  const r = Math.random();
  if (r < specialChance) return 'special';

  const roll = Math.random();
  if (comboCount >= 8) {
    if (roll < 0.15) return 'easy';
    if (roll < 0.45) return 'medium';
    if (roll < 0.8) return 'hard';
    return 'expert';
  } else if (comboCount >= 4) {
    if (roll < 0.3) return 'easy';
    if (roll < 0.65) return 'medium';
    if (roll < 0.92) return 'hard';
    return 'expert';
  }
  if (roll < 0.45) return 'easy';
  if (roll < 0.8) return 'medium';
  if (roll < 0.97) return 'hard';
  return 'expert';
}

/**
 * Returns a random word avoiding immediate repeats.
 */
function getRandomWord(recentWords = [], comboCount = 0) {
  let category = pickCategory(comboCount);
  let list = ALL_WORDS[category];
  let attempts = 0;
  let word;
  do {
    word = list[Math.floor(Math.random() * list.length)];
    attempts++;
    if (attempts > 12) break;
  } while (recentWords.includes(word.toLowerCase()));

  return {
    word: category === 'special' ? word.toUpperCase() : word,
    category,
    isSpecial: category === 'special'
  };
}

function lengthCategory(word) {
  const len = word.length;
  if (len <= 4) return 'short';
  if (len <= 8) return 'medium';
  return 'long';
}

module.exports = { ALL_WORDS, getRandomWord, lengthCategory };
