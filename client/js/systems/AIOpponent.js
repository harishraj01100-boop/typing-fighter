// ============================================================
// AIOpponent: simulates a rival typist for offline Practice Mode.
// Each difficulty has a base ms-per-character speed and an
// accuracy/mistake chance, with natural randomness so it doesn't
// feel robotic.
// ============================================================

class AIOpponent {
  constructor(difficulty = 'medium') {
    this.setDifficulty(difficulty);
    this.combo = 0;
    this.maxCombo = 0;
    this.hp = 100;
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    const profiles = {
      easy:   { msPerChar: 340, variance: 140, mistakeChance: 0.14, reactionMs: 250 },
      medium: { msPerChar: 230, variance: 100, mistakeChance: 0.08, reactionMs: 160 },
      hard:   { msPerChar: 150, variance: 70,  mistakeChance: 0.05, reactionMs: 90 },
      expert: { msPerChar: 95,  variance: 40,  mistakeChance: 0.02, reactionMs: 40 }
    };
    this.profile = profiles[difficulty] || profiles.medium;
  }

  /**
   * Simulates the AI attempting the given word. Calls onResult(exact, elapsedMs, mistakes)
   * after a realistic delay. Returns the timeout handle so it can be cancelled.
   */
  attemptWord(word, onResult) {
    const { msPerChar, variance, mistakeChance, reactionMs } = this.profile;
    const willMistake = Math.random() < mistakeChance;
    const perCharTime = msPerChar + (Math.random() * variance - variance / 2);
    let totalTime = reactionMs + word.length * Math.max(perCharTime, 40);

    if (willMistake) {
      // Mistake costs extra correction time and reduces accuracy
      totalTime += 250 + Math.random() * 300;
    }

    const handle = setTimeout(() => {
      onResult(true, Math.max(150, totalTime), willMistake ? 1 : 0);
    }, totalTime);

    return handle;
  }
}
