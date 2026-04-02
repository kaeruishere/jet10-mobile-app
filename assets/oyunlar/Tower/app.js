const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let dpr = window.devicePixelRatio || 1;
let W, H;

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resize);
resize();

const uiHUD = document.getElementById('hud');
const scoreEl = document.getElementById('score-display');
const bestHudEl = document.getElementById('hud-best-score');
const banner = document.getElementById('perfect-banner');
const comboContainer = document.getElementById('combo-display');

const BLOCK_H = Math.min(H * 0.04, 30);
const START_W = Math.min(W * 0.6, 250);
const MAX_W = Math.min(W * 0.8, 400);
const GROW_AMT = 20;
const COMBO_NEEDED = 3;
const PERFECT_TOLERANCE = 8;
const MIN_OVERLAP = 5;

let bestScore = localStorage.getItem('stack2d_best_score') || 0;
bestHudEl.innerText = bestScore;

for(let i=0; i<COMBO_NEEDED; i++) {
    let dot = document.createElement('div');
    dot.className = 'combo-dot';
    dot.id = 'dot-'+i;
    comboContainer.appendChild(dot);
}

let state = 'START';
let score = 0;
let perfStreak = 0;
let cameraY = 0;
let targetCameraY = 0;
let shakeAmt = 0;

let blocks = [];
let moving = null;
let fallers = [];
let particles = [];
let lastTime = 0;

let baseSpeed = 200; 
let speedInc = 5;

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playTone(freq, type, vol, dur, delay=0) {
    if(!audioCtx) {
        if(AudioContext) audioCtx = new AudioContext();
        else return;
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    let osc = audioCtx.createOscillator();
    let g = audioCtx.createGain();
    osc.connect(g);
    g.connect(audioCtx.destination);
    
    osc.type = type;
    let t0 = audioCtx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
}

function sfxPlace(combo) {
    playTone(220 + combo*20, 'triangle', 0.2, 0.1);
}
function sfxFail() {
    playTone(150, 'sawtooth', 0.3, 0.2);
    playTone(100, 'sawtooth', 0.3, 0.3, 0.1);
}
function sfxPerfect() {
    playTone(523, 'sine', 0.2, 0.1);
    playTone(659, 'sine', 0.2, 0.1, 0.05);
    playTone(784, 'sine', 0.2, 0.1, 0.1);
    playTone(1046, 'sine', 0.2, 0.2, 0.15);
}

function initGame() {
    score = 0;
    perfStreak = 0;
    cameraY = 0;
    targetCameraY = 0;
    shakeAmt = 0;
    blocks = [];
    fallers = [];
    particles = [];
    scoreEl.innerText = score;
    updateComboUI();
    
    for (let i = 0; i < 5; i++) {
        blocks.push({
            x: (W - START_W) / 2,
            y: H - BLOCK_H * (i + 1) - 100,
            w: START_W,
            hue: (190 + i * 10) % 360
        });
    }

    spawnMoving();
    
            uiHUD.classList.add('visible');
    
    state = 'PLAYING';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawnMoving() {
    let top = blocks[blocks.length - 1];
    let speed = baseSpeed + score * speedInc;
    let dir = Math.random() > 0.5 ? 1 : -1;
    let x = dir === 1 ? -top.w * 1.5 : W + top.w * 0.5;
    
    moving = {
        x: x,
        y: top.y - BLOCK_H,
        w: top.w,
        dir: dir,
        speed: speed,
        hue: (top.hue + 10) % 360
    };
    
    targetCameraY = Math.max(0, (H - 100) - moving.y - H/2);
}

function updateComboUI() {
    for (let i = 0; i < COMBO_NEEDED; i++) {
        let el = document.getElementById('dot-' + i);
        if (i < perfStreak) el.classList.add('active');
        else el.classList.remove('active');
    }
}

function showBanner() {
    banner.classList.add('show');
    setTimeout(() => {
        banner.classList.remove('show');
    }, 800);
}

function spawnFaller(x, y, w, hue, dir) {
    fallers.push({
        x: x, y: y, w: w, hue: hue,
        vx: dir * (50 + Math.random() * 100),
        vy: -150,
        alpha: 1
    });
}

function spawnParticles(x, y, w, hue) {
    const cx = x + w / 2;
    for (let i = 0; i < 20; i++) {
        let a = Math.random() * Math.PI * 2;
        let s = 100 + Math.random() * 200;
        particles.push({
            x: cx + (Math.random() - 0.5) * w * 0.5,
            y: y + BLOCK_H / 2,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s - 100,
            hue: hue,
            r: 2 + Math.random() * 4,
            alpha: 1
        });
    }
}

function tap() {
    if(!audioCtx && AudioContext) audioCtx = new AudioContext();
    if(state !== 'PLAYING') return;

    let top = blocks[blocks.length - 1];
    let m = moving;
    
    let ol = Math.max(top.x, m.x);
    let or = Math.min(top.x + top.w, m.x + m.w);
    let overlapWidth = or - ol;
    
    if (overlapWidth <= MIN_OVERLAP) {
        spawnFaller(m.x, m.y, m.w, m.hue, Math.sign(m.x - top.x));
        endGame();
        return;
    }
    
    let diff = Math.abs(m.x - top.x);
    let isPerfect = diff < PERFECT_TOLERANCE;
    
    let finalX, finalW;
    
    if (isPerfect) {
        finalX = top.x;
        finalW = top.w;
        perfStreak++;
        
        if (perfStreak >= COMBO_NEEDED) {
            perfStreak = 0;
            finalW = Math.min(finalW + GROW_AMT, MAX_W);
            finalX -= GROW_AMT / 2;
            sfxPerfect();
            showBanner();
            spawnParticles(finalX, m.y, finalW, m.hue);
            shakeAmt = 12;
        } else {
            playTone(800 + perfStreak*100, 'sine', 0.1, 0.1);
        }
    } else {
        perfStreak = 0;
        finalX = ol;
        finalW = overlapWidth;
        sfxPlace(score);
        
        if (m.x < top.x) {
            spawnFaller(m.x, m.y, top.x - m.x, m.hue, -1);
        } else {
            spawnFaller(top.x + top.w, m.y, (m.x + m.w) - (top.x + top.w), m.hue, 1);
        }
    }
    
    updateComboUI();
    
    blocks.push({
        x: finalX,
        y: m.y,
        w: finalW,
        hue: m.hue
    });
    
    score++;
    scoreEl.innerText = score;
    if(score > bestScore) bestHudEl.innerText = score;
    
    spawnMoving();
}

function endGame() {
    state = 'END';
    shakeAmt = 20;
    moving = null;
    sfxFail();
    uiHUD.classList.remove('visible');
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('stack2d_best_score', bestScore);
    }
    
    NeonMenu.showGameOver(score, bestScore);
}

function loop(time) {
    let dt = (time - lastTime) / 1000;
    if(dt > 0.1) dt = 0.1;
    lastTime = time;
    
    if (state === 'PLAYING' && moving) {
        moving.x += moving.dir * moving.speed * dt;
        if (moving.x > W + moving.w) moving.dir = -1;
        if (moving.x < -moving.w * 2) moving.dir = 1;
    }
    
    if (cameraY < targetCameraY) {
        cameraY += (targetCameraY - cameraY) * 10 * dt;
    }
    
    for (let i = fallers.length - 1; i >= 0; i--) {
        let f = fallers[i];
        f.vy += 800 * dt; 
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.alpha -= 1.0 * dt;
        if (f.alpha <= 0 || f.y > H + 100 + cameraY) fallers.splice(i, 1);
    }
    
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.vy += 600 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= 1.2 * dt;
        if (p.alpha <= 0) particles.splice(i, 1);
    }
    
    if (shakeAmt > 0.5) shakeAmt *= 0.9;
    else shakeAmt = 0;
    
    draw();
    
    if (state !== 'START') {
        requestAnimationFrame(loop);
    }
}

function drawBlock(ctx, x, y, w, hue, a=1) {
    if(w <= 0 || a <= 0) return;
    ctx.globalAlpha = a;
    
    let grad = ctx.createLinearGradient(x, y, x, y + BLOCK_H);
    grad.addColorStop(0, `hsl(${hue}, 80%, 65%)`);
    grad.addColorStop(1, `hsl(${hue}, 80%, 45%)`);
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, BLOCK_H, 4);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, 4, [4,4,0,0]);
    ctx.fill();
    
    ctx.globalAlpha = 1;
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    
    let bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    let topHue = blocks.length > 0 ? blocks[blocks.length-1].hue : 190;
    bgGrad.addColorStop(0, `hsl(${topHue}, 40%, 15%)`);
    bgGrad.addColorStop(1, `#0b0f19`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    
    ctx.save();
    let sx = shakeAmt > 0.5 ? (Math.random() - 0.5) * shakeAmt : 0;
    let sy = shakeAmt > 0.5 ? (Math.random() - 0.5) * shakeAmt : 0;
    ctx.translate(sx, sy + cameraY);
    
    let startIdx = Math.max(0, blocks.length - 30);
    for (let i = startIdx; i < blocks.length; i++) {
        let b = blocks[i];
        drawBlock(ctx, b.x, b.y, b.w, b.hue);
    }
    
    if (moving) {
        drawBlock(ctx, moving.x, moving.y, moving.w, moving.hue);
    }
    
    for (let f of fallers) {
        drawBlock(ctx, f.x, f.y, f.w, f.hue, f.alpha);
    }
    
    for (let p of particles) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = `hsl(${p.hue}, 90%, 70%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    ctx.restore();
}

NeonMenu.init({
    onStart: initGame,
    onRestart: initGame
}).then(() => {
    NeonMenu.showStart();
});


window.addEventListener('mousedown', (e) => {
    if(e.target.tagName !== 'BUTTON') tap();
});
window.addEventListener('touchstart', (e) => {
    if(e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        tap();
    }
}, {passive: false});

draw();
