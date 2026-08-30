// ============================================================
// Client-side word bank. Used ONLY for Practice Mode (offline vs AI).
// Online multiplayer always trusts the server's word selection.
// ============================================================

const WordBank = {
  easy: [
    'cat','dog','run','sun','box','pen','red','sky','hat','arm',
    'leg','fox','owl','bee','ant','ice','oak','elm','egg','fan',
    'gem','ink','jaw','key','log','map','net','oar','pig','rat',
    'sap','tap','urn','van','web','yak','zip','ash','bat','cup',
    'dot','ear','fig','gap','hip','jam','kit','lip','mud','nap'
  ],
  medium: [
    'warrior','shadow','castle','dragon','hunter','forest','thunder','crystal',
    'phantom','battle','knight','wizard','armor','blade','falcon','glacier',
    'temple','rocket','planet','vortex','engine','cannon','signal','victory',
    'legend','mirror','desert','island','bridge','tunnel','harbor','meteor',
    'volcano','shield','arrow','flame','frost','spirit','venom','gravity'
  ],
  hard: [
    'destruction','revolution','avalanche','earthquake','hurricane',
    'annihilate','resistance','equilibrium','phenomenon','catastrophe',
    'imagination','constellation','architecture','independence','electricity',
    'psychology','technology','philosophy','mathematics','communication',
    'exploration','regeneration','transformation','determination'
  ],
  expert: [
    'incomprehensible','disproportionate','counterintuitive','unforeseeable',
    'multidimensional','characteristically','overcompensating',
    'interdisciplinary','extraterritoriality','incontrovertible',
    'unpredictability','misappropriation','notwithstanding',
    'quintessentially','unconstitutional'
  ],
  special: ['FIRE', 'LIGHTNING', 'SHADOW', 'THUNDER', 'STORM', 'FROST', 'VOID', 'BLAZE']
};

const WordSystem = {
  recent: [],

  pickCategory(comboCount) {
    const specialChance = Math.min(0.06 + comboCount * 0.01, 0.18);
    if (Math.random() < specialChance) return 'special';
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
  },

  getRandomWord(comboCount = 0) {
    const category = this.pickCategory(comboCount);
    const list = WordBank[category];
    let word, attempts = 0;
    do {
      word = list[Math.floor(Math.random() * list.length)];
      attempts++;
    } while (this.recent.includes(word.toLowerCase()) && attempts < 12);

    this.recent.push(word.toLowerCase());
    if (this.recent.length > 6) this.recent.shift();

    const isSpecial = category === 'special';
    return { word: isSpecial ? word.toUpperCase() : word, category, isSpecial };
  },

  lengthCategory(word) {
    const len = word.length;
    if (len <= 4) return 'short';
    if (len <= 8) return 'medium';
    return 'long';
  }
};
