// ─── Difficulty (reads localStorage via neon-shared.js) ─────────
let _DIFF = (window.NEON && window.NEON.getDiff()) || { speed:1, density:1, startLevel:2 };

// ─── Canvas setup ─────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W, H, dpr;

function resize() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  if (state.playing) layout();
}
window.addEventListener('resize', () => { resize(); });

// ─── Palette ──────────────────────────────────────────────────
const PALETTE = [
  { fill:'#00f2fe', glow:'rgba(0,242,254,.45)',   dark:'#006b8f' },
  { fill:'#ff0844', glow:'rgba(255, 8, 68,.45)',  dark:'#880020' },
  { fill:'#f9d423', glow:'rgba(249,212,35,.45)',  dark:'#7d6100' },
  { fill:'#b224ef', glow:'rgba(178,36,239,.45)',  dark:'#540080' },
  { fill:'#0ee89b', glow:'rgba(14,232,155,.45)',  dark:'#05614a' },
  { fill:'#ff6f00', glow:'rgba(255,111,0,.45)',   dark:'#883c00' },
  { fill:'#e040fb', glow:'rgba(224,64,251,.45)',  dark:'#7b0088' },
  { fill:'#76ff03', glow:'rgba(118,255,3,.45)',   dark:'#3a7a00' },
];

// ─── Game constants ────────────────────────────────────────────
const TUBE_CAPACITY = 4;        // balls per tube
const BALL_PAD      = 4;        // gap between balls

// ─── Levels: [numColors, numEmpty] ───────────────────────────
const LEVELS = [
  [3,1],[4,2],[4,2],[5,2],[5,2],[6,2],[6,3],[7,3],[7,3],[8,3],
];

// ─── Audio (delegate to NEON.sfx if available) ───────────────
const _sfx   = (window.NEON && window.NEON.sfx) || {};
function initAudio() { if (_sfx.init) _sfx.init(); }
function sfxPick()   { if (_sfx.pick)  _sfx.pick();  }
function sfxPlace()  { if (_sfx.place) _sfx.place(); }
function sfxError()  { if (_sfx.error) _sfx.error(); }
function sfxWin()    { if (_sfx.win)   _sfx.win();   }

// ─── State ────────────────────────────────────────────────────
const state = {
  playing: false,
  level: _DIFF.startLevel || 0,   // start from harder level based on difficulty
  moves: 0,
  tubes: [],
  selected: -1,
  history: [],
  won: false,
};

// Layout computed values
let tubeW, tubeH, ballR, tubeGap, startX, startY, tubesPerRow;

// ─── Level generation ─────────────────────────────────────────
function generateLevel() {
  const [nColors, nEmpty] = LEVELS[Math.min(state.level, LEVELS.length-1)];
  const nTubes = nColors + nEmpty;

  // Fill nColors * TUBE_CAPACITY balls
  let balls = [];
  for (let c=0; c<nColors; c++) for (let b=0; b<TUBE_CAPACITY; b++) balls.push(c);

  // Fisher-Yates shuffle
  for (let i=balls.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [balls[i],balls[j]] = [balls[j],balls[i]];
  }

  // Distribute into tubes (fill from back → random-looking)
  state.tubes = [];
  for (let t=0; t<nColors; t++) {
    state.tubes.push(balls.slice(t*TUBE_CAPACITY, (t+1)*TUBE_CAPACITY));
  }
  for (let e=0; e<nEmpty; e++) state.tubes.push([]);

  state.selected = -1;
  state.history  = [];
  state.moves    = 0;
  state.won      = false;
  updateHUD();
}

// ─── Layout ───────────────────────────────────────────────────
function layout() {
  const n = state.tubes.length;
  const margin = 16;
  const bottomBar = 90; // space for icon buttons

  // Clamp tubes per row
  tubesPerRow = n <= 6 ? Math.ceil(n/2) : Math.min(Math.ceil(n/2), 6);

  tubeW = Math.min(56, Math.floor((W - margin*2 - (tubesPerRow-1)*12) / tubesPerRow));
  tubeGap = 12;
  ballR = Math.floor((tubeW - 8) / 2);

  // Height of tube = 4 balls stacked + padding
  tubeH = TUBE_CAPACITY * (ballR*2 + BALL_PAD) + BALL_PAD + 16;

  const rows = Math.ceil(n / tubesPerRow);
  const totalW = tubesPerRow * tubeW + (tubesPerRow-1)*tubeGap;
  const totalH = rows * tubeH + (rows-1)*tubeGap;

  startX = (W - totalW) / 2;
  startY = (H - totalH - bottomBar) / 2 + 20;
}

function tubeRect(i) {
  const row = Math.floor(i / tubesPerRow);
  const col = i % tubesPerRow;
  // Center-align each row
  const rowCount = Math.min(tubesPerRow, state.tubes.length - row*tubesPerRow);
  const rowW = rowCount*tubeW + (rowCount-1)*tubeGap;
  const rx = (W - rowW)/2 + col*(tubeW+tubeGap);
  const ry = startY + row*(tubeH+tubeGap);
  return { x:rx, y:ry, w:tubeW, h:tubeH };
}

// ─── Draw ─────────────────────────────────────────────────────
let anim = null; // {fromTube, toTube, balls, ball, t, done}

function draw() {
  ctx.clearRect(0,0,W,H);
  if (!state.playing) return;

  // Tick animation
  let frameAnim = null;
  if (anim && !anim.done) {
    anim.t += 0.05;
    if (anim.t >= 1) { anim.t = 1; anim.done = true; }
    frameAnim = anim;
  }

  for (let i=0; i<state.tubes.length; i++) {
    drawTube(i, i===state.selected, frameAnim);
  }

  if (frameAnim && frameAnim.done) {
    finishAnimation();
  }
}

function drawTube(i, selected, frameAnim) {
  const r = tubeRect(i);
  const cx = r.x + r.w/2;

  // Lift selected tube
  const liftY = selected ? -14 : 0;

  ctx.save();
  ctx.translate(0, liftY);

  // Shadow / glow when selected
  if (selected) {
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 18;
  }

  // Tube body
  const rx = 10;
  ctx.beginPath();
  roundedRect(ctx, r.x, r.y, r.w, r.h, rx);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.strokeStyle = selected ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.13)';
  ctx.lineWidth = selected ? 2 : 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Balls
  const tube = state.tubes[i];
  for (let b=0; b<tube.length; b++) {
    // Skip top ball if it's being animated away FROM this tube
    const isAnimatingFrom = frameAnim && frameAnim.fromTube===i && b===tube.length-1 && !frameAnim.done && frameAnim.t<1;
    if (isAnimatingFrom) continue;
    drawBallAt(tube[b], ballX(i, b), ballY(i, b, liftY));
  }

  ctx.restore();

  // If animating TO this tube, draw the ball in arc
  if (frameAnim && (frameAnim.fromTube===i || frameAnim.toTube===i)) {
    if (frameAnim.fromTube===i) {
      // Draw arc ball flying out of tube
      if (frameAnim.t<1) {
        const bx = lerp(frameAnim.sx, frameAnim.tx, easeInOut(frameAnim.t));
        const midY = Math.min(frameAnim.sy, frameAnim.ty) - 80;
        const by = quadBez(frameAnim.sy, midY, frameAnim.ty, easeInOut(frameAnim.t));
        drawBallAt(frameAnim.color, bx, by);
      }
    }
  }
}

function ballX(tubeIdx, ballIdx) {
  const r = tubeRect(tubeIdx);
  return r.x + r.w/2;
}

function ballY(tubeIdx, ballIdx, liftY=0) {
  const r = tubeRect(tubeIdx);
  // Stack from bottom of tube upward
  const bottomY = r.y + r.h - BALL_PAD - ballR;
  return bottomY - ballIdx * (ballR*2 + BALL_PAD) + liftY;
}

function drawBallAt(colorIdx, x, y) {
  const col = PALETTE[colorIdx];

  // Glow
  const grad = ctx.createRadialGradient(x-ballR*.3, y-ballR*.3, ballR*.05, x, y, ballR*1.2);
  ctx.shadowColor = col.glow;
  ctx.shadowBlur = 18;

  ctx.beginPath();
  ctx.arc(x, y, ballR, 0, Math.PI*2);

  const fill = ctx.createRadialGradient(x-ballR*.3, y-ballR*.3, 1, x, y, ballR);
  fill.addColorStop(0, '#fff');
  fill.addColorStop(0.25, col.fill);
  fill.addColorStop(1, col.dark);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Top gleam
  ctx.beginPath();
  ctx.ellipse(x-ballR*.22, y-ballR*.3, ballR*.28, ballR*.16, -Math.PI/6, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fill();
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r);
  ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h);
  ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r);
  ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}

// Maths helpers
function lerp(a,b,t) { return a+(b-a)*t; }
function easeInOut(t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t; }
function quadBez(p0,p1,p2,t) { return (1-t)*(1-t)*p0 + 2*(1-t)*t*p1 + t*t*p2; }

// ─── Game loop ─────────────────────────────────────────────────
function gameLoop() {
  draw();
  requestAnimationFrame(gameLoop);
}

// ─── Move logic ───────────────────────────────────────────────
function canMoveTo(from, to) {
  if (from === to) return false;
  const src = state.tubes[from];
  const dst = state.tubes[to];
  if (src.length === 0) return false;
  if (dst.length >= TUBE_CAPACITY) return false;
  if (dst.length === 0) return true;
  return dst[dst.length-1] === src[src.length-1];
}

function countMoveableBalls(from, to) {
  // Move all same-coloured top-most balls at once (stack move)
  const src = state.tubes[from];
  const color = src[src.length-1];
  let count = 0;
  for (let i=src.length-1; i>=0; i--) {
    if (src[i]===color) count++;
    else break;
  }
  const dst = state.tubes[to];
  const space = TUBE_CAPACITY - dst.length;
  return Math.min(count, space);
}

function applyMove(from, to, push=true) {
  const count = countMoveableBalls(from, to);
  if (count === 0) return false;
  const moving = state.tubes[from].splice(state.tubes[from].length-count, count);
  state.tubes[to].push(...moving);
  if (push) state.history.push({from,to,count});
  state.moves++;
  updateHUD();
  return true;
}

function undoMove() {
  if (!state.history.length || anim) return;
  const {from,to,count} = state.history.pop();
  const moving = state.tubes[to].splice(state.tubes[to].length-count, count);
  state.tubes[from].push(...moving);
  state.moves = Math.max(0, state.moves-1);
  updateHUD();
}

function checkWin() {
  return state.tubes.every(t =>
    t.length === 0 ||
    (t.length === TUBE_CAPACITY && t.every(b => b===t[0]))
  );
}

// ─── Animation bridge ─────────────────────────────────────────
function startAnimation(from, to, color) {
  const f = tubeRect(from);
  const t = tubeRect(to);
  const srcLen = state.tubes[from].length;  // length BEFORE pop
  const dstLen = state.tubes[to].length;    // length BEFORE push

  const sy = ballY(from, srcLen - 1, from===state.selected ? -14 : 0);
  const ty = ballY(to, dstLen);

  anim = {
    fromTube: from, toTube: to, color,
    sx: f.x + f.w/2,
    sy,
    tx: t.x + t.w/2,
    ty,
    t: 0, done: false,
  };
}

function finishAnimation() {
  anim = null;
  if (checkWin()) {
    state.won = true;
    sfxWin();
    setTimeout(showWin, 600);
  }
}

// ─── Selection / tap logic ────────────────────────────────────
function handleTap(px, py) {
  if (!state.playing || state.won || anim) return;
  initAudio();

  const hit = hitTest(px, py);
  if (hit === -1) {
    state.selected = -1;
    return;
  }

  if (state.selected === -1) {
    if (state.tubes[hit].length === 0) return;
    state.selected = hit;
    sfxPick();
    return;
  }

  // Already selected
  if (hit === state.selected) {
    state.selected = -1;
    return;
  }

  if (canMoveTo(state.selected, hit)) {
    const from = state.selected;
    const to   = hit;
    const color = state.tubes[from][state.tubes[from].length-1];
    const srcLenBefore = state.tubes[from].length;
    const dstLenBefore = state.tubes[to].length;

    startAnimation(from, to, color);
    applyMove(from, to);
    state.selected = -1;
    sfxPlace();
  } else {
    // Switch selection if tapping non-empty tube
    if (state.tubes[hit].length > 0) {
      state.selected = hit;
      sfxPick();
    } else {
      sfxError();
      state.selected = -1;
    }
  }
}

function hitTest(px, py) {
  for (let i=0; i<state.tubes.length; i++) {
    const r = tubeRect(i);
    const liftY = i===state.selected ? -14 : 0;
    if (px>=r.x && px<=r.x+r.w && py>=r.y+liftY && py<=r.y+r.h+liftY) return i;
  }
  return -1;
}

// ─── UI helpers ───────────────────────────────────────────────
function updateHUD() {
  document.getElementById('h-level').textContent = state.level + 1;
  document.getElementById('h-moves').textContent = state.moves;
}

function showWin() {
  document.getElementById('win-moves').textContent = `${state.moves} MOVES`;
  document.getElementById('win-screen').classList.add('active');
}

function startGame() {
  document.getElementById('win-screen').classList.remove('active');
  document.getElementById('hud').classList.add('visible');
  document.getElementById('btns').classList.add('visible');

  state.playing = true;
  generateLevel();
  layout();
}

function nextLevel() {
  state.level++;
  document.getElementById('win-screen').classList.remove('active');
  generateLevel();
  layout();
}

function restartLevel() {
  if (anim) return;
  generateLevel();
  layout();
}

// ─── Event listeners ──────────────────────────────────────────
canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  handleTap(e.clientX - r.left, e.clientY - r.top);
});
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  handleTap(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top);
}, { passive: false });

document.getElementById('next-btn').addEventListener('click', () => { initAudio(); nextLevel(); });
document.getElementById('undo-btn').addEventListener('click', () => { initAudio(); undoMove(); });
document.getElementById('restart-btn').addEventListener('click', () => { initAudio(); restartLevel(); });

// ─── Background ───────────────────────────────────────────────
function drawBg() {
  ctx.clearRect(0,0,W,H);
  // Radial centre glow
  const g = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*.7);
  g.addColorStop(0, 'rgba(50,0,80,.55)');
  g.addColorStop(1, 'rgba(7,0,15,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);
}

// Override draw to include bg
const _draw = draw;
window.draw = function() {
  ctx.clearRect(0,0,W,H);
  drawBg();
  _draw();
};

// ─── Boot ─────────────────────────────────────────────────────
NeonMenu.init({
    onStart: startGame,
    onRestart: startGame
}).then(() => {
    NeonMenu.showStart();
});

resize();
requestAnimationFrame(gameLoop);
