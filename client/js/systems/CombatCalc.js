// ============================================================
// CombatCalc: mirrors server/game/combat.js exactly, so Practice
// Mode (fully offline vs AI) feels identical to ranked online play.
// Online matches NEVER use this file - the server is authoritative.
// ============================================================

const CombatCalc = {
  MAX_DAMAGE: 35,
  MIN_DAMAGE: 3,
  EXPECTED_MS_PER_CHAR: 220,

  lengthCategory(word) {
    const len = word.length;
    if (len <= 4) return 'short';
    if (len <= 8) return 'medium';
    return 'long';
  },

  calculateDamage({ word, elapsedMs, accuracy, combo, isSpecial }) {
    const len = word.length;
    const category = this.lengthCategory(word);

    let base;
    if (category === 'short') base = 6;
    else if (category === 'medium') base = 11;
    else base = 16;

    const expectedMs = len * this.EXPECTED_MS_PER_CHAR;
    const speedRatio = expectedMs / Math.max(elapsedMs, 50);
    let speedBonus = Math.max(0, (speedRatio - 0.6)) * 10;
    speedBonus = Math.min(speedBonus, 14);

    let accuracyBonus;
    if (accuracy >= 100) accuracyBonus = 8;
    else if (accuracy >= 90) accuracyBonus = 4;
    else if (accuracy >= 75) accuracyBonus = 0;
    else accuracyBonus = -6;

    const comboBonus = Math.min(combo * 1.2, 12);
    const specialBonus = isSpecial ? 6 : 0;

    let total = base + speedBonus + accuracyBonus + comboBonus + specialBonus;
    total = Math.round(Math.max(this.MIN_DAMAGE, Math.min(this.MAX_DAMAGE, total)));
    const critical = speedBonus >= 11 && accuracy >= 95;

    return { damage: total, critical };
  },

  evaluateTyped(target, typed, mistakes = 0) {
    const exact = typed === target;
    let accuracy = 100;
    if (mistakes > 0 || !exact) {
      const len = Math.max(target.length, typed.length, 1);
      let correct = 0;
      for (let i = 0; i < Math.min(target.length, typed.length); i++) {
        if (target[i] === typed[i]) correct++;
      }
      accuracy = Math.max(0, Math.min(100, (correct / len) * 100 - mistakes * 1.5));
    }
    return { exact, accuracy: Math.round(accuracy) };
  }
};
