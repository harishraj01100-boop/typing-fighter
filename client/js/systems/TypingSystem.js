// ============================================================
// TypingSystem: captures raw keyboard input directly via a
// hidden <input> element. This bypasses Phaser key capture blocks,
// works natively with mobile virtual keyboards and IMEs,
// and ensures zero perceptible input latency.
// ============================================================

class TypingSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentWord = '';
    this.typed = '';
    this.mistakes = 0;          // corrected/incorrect keystrokes this word
    this.startTime = 0;
    this.active = false;

    this.totalCorrectChars = 0;
    this.totalTypedChars = 0;
    this.sessionStart = performance.now();

    this.onWordComplete = null;   // callback(typed, elapsedMs, mistakes)
    this.onProgress = null;       // callback(typed)
    this.onMistakeChar = null;    // callback() - wrong char pressed

    this._hiddenInput = document.getElementById('hidden-typing-input');
    
    // Bind handlers
    this._inputHandler = this._handleInput.bind(this);
    this._refocusHandler = this._focusHiddenInput.bind(this);

    if (this._hiddenInput) {
      this._hiddenInput.addEventListener('input', this._inputHandler);
    }
  }

  _focusHiddenInput() {
    if (!this.active || !this._hiddenInput) return;
    try {
      this._hiddenInput.focus({ preventScroll: true });
    } catch (e) {
      /* noop */
    }
  }

  enable() {
    this.active = true;
    this._focusHiddenInput();

    // Refocus the hidden input on any interaction to ensure keyboard remains active
    window.addEventListener('click', this._refocusHandler);
    window.addEventListener('touchstart', this._refocusHandler);
    window.addEventListener('keydown', this._refocusHandler);
  }

  disable() {
    this.active = false;
    window.removeEventListener('click', this._refocusHandler);
    window.removeEventListener('touchstart', this._refocusHandler);
    window.removeEventListener('keydown', this._refocusHandler);
    if (this._hiddenInput) {
      this._hiddenInput.blur();
    }
  }

  setWord(word) {
    this.currentWord = word;
    this.typed = '';
    this.mistakes = 0;
    this.startTime = performance.now();
    if (this._hiddenInput) {
      this._hiddenInput.value = '';
    }
    this._focusHiddenInput();
  }

  reset() {
    this.typed = '';
    this.mistakes = 0;
    if (this._hiddenInput) {
      this._hiddenInput.value = '';
    }
  }

  getWPM() {
    const elapsedMin = (performance.now() - this.sessionStart) / 60000;
    if (elapsedMin <= 0) return 0;
    const words = this.totalCorrectChars / 5;
    return Math.round(words / elapsedMin);
  }

  getAccuracy() {
    if (this.totalTypedChars === 0) return 100;
    return Math.round((this.totalCorrectChars / this.totalTypedChars) * 100);
  }

  _handleInput(e) {
    if (!this.active) return;

    const val = this._hiddenInput.value;
    const expectedLength = this.typed.length;

    // Check if backspace / deletion occurred
    if (val.length < expectedLength) {
      this.typed = val;
      if (this.onProgress) this.onProgress(this.typed);
      return;
    }

    // Capture the newly input characters
    const addedText = val.slice(expectedLength);
    if (!addedText) return;

    this.totalTypedChars += addedText.length;

    let newTyped = this.typed;

    for (let i = 0; i < addedText.length; i++) {
      const char = addedText[i];
      const nextIndex = newTyped.length;
      const expectedChar = this.currentWord[nextIndex];

      // Handle capitalization mapping if word is all uppercase (like special words)
      const target = this.currentWord.charAt(0) === this.currentWord.charAt(0).toUpperCase() &&
        this.currentWord === this.currentWord.toUpperCase() ? char.toUpperCase() : char;

      if (expectedChar !== undefined && target === expectedChar) {
        newTyped += target;
        this.totalCorrectChars++;
      } else {
        this.mistakes++;
        if (this.onMistakeChar) this.onMistakeChar();
      }
    }

    this.typed = newTyped;
    this._hiddenInput.value = this.typed;

    if (this.onProgress) this.onProgress(this.typed);

    if (this.typed.length === this.currentWord.length && this.typed === this.currentWord) {
      const elapsedMs = performance.now() - this.startTime;
      if (this.onWordComplete) this.onWordComplete(this.typed, elapsedMs, this.mistakes);
    }
  }

  destroy() {
    this.disable();
    if (this._hiddenInput && this._inputHandler) {
      this._hiddenInput.removeEventListener('input', this._inputHandler);
    }
  }
}
