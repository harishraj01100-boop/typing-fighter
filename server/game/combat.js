const { lengthCategory } = require('./words');

const MAX_DAMAGE = 35;
const MIN_DAMAGE = 3;

// Rough "expected" typing time per character used to score speed (ms/char)
const EXPECTED_MS_PER_CHAR = 220;

/**
 * Computes damage for a successful attack.
 * All inputs are server-trusted (elapsedMs measured server-side from the
 * moment the word was issued; accuracy computed from the submitted string
 * compared against the authoritative word).
 */
function calculateDamage({ word, elapsedMs, accuracy, combo, isSpecial }) {
  const len = word.length;
  const category = lengthCategory(word);

  // Base damage scales with word length/difficulty
  let base;
  if (category === 'short') base = 6;
  else if (category === 'medium') base = 11;
  else base = 16;

  // Speed bonus: faster than expected = more bonus, capped
  const expectedMs = len * EXPECTED_MS_PER_CHAR;
  const speedRatio = expectedMs / Math.max(elapsedMs, 50); // >1 means faster than expected
  let speedBonus = Math.max(0, (speedRatio - 0.6)) * 10;
  speedBonus = Math.min(speedBonus, 14);

  // Accuracy bonus/penalty - accuracy is 0-100, heavily rewards precision
  let accuracyBonus;
  if (accuracy >= 100) accuracyBonus = 8;
  else if (accuracy >= 90) accuracyBonus = 4;
  else if (accuracy >= 75) accuracyBonus = 0;
  else accuracyBonus = -6; // sloppy typing weakens the hit

  // Combo bonus, capped so late-game combos don't one-shot
  const comboBonus = Math.min(combo * 1.2, 12);

  // Special word bonus for flair
  const specialBonus = isSpecial ? 6 : 0;

  let total = base + speedBonus + accuracyBonus + comboBonus + specialBonus;
  total = Math.round(Math.max(MIN_DAMAGE, Math.min(MAX_DAMAGE, total)));

  const critical = speedBonus >= 11 && accuracy >= 95;

  return { damage: total, critical, breakdown: { base, speedBonus: Math.round(speedBonus), accuracyBonus, comboBonus: Math.round(comboBonus), specialBonus } };
}

/**
 * Compares the typed string to the target word and returns an accuracy
 * percentage plus whether it's an exact match (required to "win" the word).
 */
function evaluateTyped(target, typed, clientMistakes = 0) {
  const t = target;
  const s = typed || '';
  const exact = s === t;

  // Character-level accuracy using simple positional comparison as a
  // sanity-checked baseline; clientMistakes (keystrokes corrected while
  // typing) further reduces the score, clamped server-side to avoid abuse.
  let correct = 0;
  const len = Math.max(t.length, s.length);
  for (let i = 0; i < Math.min(t.length, s.length); i++) {
    if (t[i] === s[i]) correct++;
  }
  let baseAccuracy = len === 0 ? 100 : (correct / len) * 100;
  const mistakesPenalty = Math.min(Math.max(clientMistakes, 0), 20) * 1.5;
  let accuracy = Math.max(0, Math.min(100, baseAccuracy - mistakesPenalty));
  if (exact && clientMistakes === 0) accuracy = 100;

  return { exact, accuracy: Math.round(accuracy) };
}

module.exports = { calculateDamage, evaluateTyped, MAX_DAMAGE, MIN_DAMAGE };
