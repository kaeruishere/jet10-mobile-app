/**
 * neon-shared.js — Common palette, difficulty, and sound for all Neon games.
 * Include BEFORE app.js in every game's index.html:
 *   <script src="../shared/neon-shared.js"></script>
 */
(function() {
  'use strict';

  // ── Vivid hypercasual palette ──────────────────────────────
  const PALETTE = {
    bg:      '#0a0014',
    cyan:    '#00f2fe',
    magenta: '#ff2d78',
    yellow:  '#ffe94d',
    green:   '#39ff14',
    purple:  '#b224ef',
    orange:  '#ff7b00',
    pink:    '#ff6eb4',
    blue:    '#4facfe',
    white:   '#ffffff',
  };

  // ── Difficulty multipliers ─────────────────────────────────
  const MULT = {
    easy: {
      speed:      0.65,   // game speed multiplier
      density:    0.55,   // obstacle/enemy density
      scoreBonus: 1.0,    // score multiplier
      startLevel: 0,      // NeonSort: which level to begin at
      ballCount:  4,      // NeonBreaker: starting balls
    },
    normal: {
      speed:      1.0,
      density:    1.0,
      scoreBonus: 1.0,
      startLevel: 2,
      ballCount:  3,
    },
    hard: {
      speed:      1.5,
      density:    1.7,
      scoreBonus: 1.5,
      startLevel: 4,
      ballCount:  2,
    },
  };

  const difficulty = localStorage.getItem('neonDifficulty') || 'normal';

  // ── Audio helpers ─────────────────────────────────────────
  let _actx = null;
  function _ctx() {
    if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
    if (_actx.state === 'suspended') _actx.resume();
    return _actx;
  }

  function _beep(freq, type, dur, vol) {
    try {
      const c = _ctx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.22, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur);
    } catch(e) {}
  }

  const SFX = {
    // Generic pick / select
    pick()    { _beep(440, 'sine',     0.08, 0.2); },
    // Confirm / place
    place()   { _beep(660, 'sine',     0.12, 0.2); },
    // Jump
    jump()    { _beep(380, 'sine',     0.1,  0.2); _beep(520, 'sine', 0.08, 0.15); },
    // Error / cant do
    error()   { _beep(180, 'sawtooth', 0.18, 0.18); },
    // Die / crash
    die()     { _beep(200, 'sawtooth', 0.6,  0.3); },
    // Win jingle
    win() {
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => _beep(f, 'sine', 0.22, 0.22), i * 85));
    },
    // Score tick
    score()   { _beep(900, 'sine', 0.05, 0.12); },
    // Bounce
    bounce()  { _beep(300, 'triangle', 0.07, 0.18); },
    // Slice / cut
    slice()   { _beep(800, 'sawtooth', 0.05, 0.15); },
    // Tile tap
    tap(note) { _beep(note || 600, 'sine', 0.1, 0.25); },
    // Level up
    levelUp() {
      [400,600,800,1000].forEach((f,i)=>setTimeout(()=>_beep(f,'sine',.15,.2),i*60));
    },
    // Init (call on first user gesture to unlock AudioContext)
    init()    { try { _ctx(); } catch(e) {} },
  };

  // ── Public API ────────────────────────────────────────────
  window.NEON = {
    palette:    PALETTE,
    difficulty,
    mult:       MULT,
    sfx:        SFX,
    /** Returns the active difficulty multiplier object */
    getDiff()  { return MULT[this.difficulty]; },
    /** Save difficulty to localStorage (call from DifficultySelector) */
    setDiff(d) {
      if (!MULT[d]) return;
      this.difficulty = d;
      localStorage.setItem('neonDifficulty', d);
    },
  };

})();
