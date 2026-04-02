// ─── Difficulty ────────────────────────────────────────────────
let _DIFF = (window.NEON && window.NEON.getDiff()) || { speed:1, density:1 };

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
const timeBarCont = document.getElementById('time-bar-container');
const timeBar = document.getElementById('time-bar');

let bestScore = localStorage.getItem('neonchop_best') || 0;

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
    osc.connect(g); g.connect(audioCtx.destination);
    osc.type = type;
    let t0 = audioCtx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
}

function sfxChop() { playTone(150 + Math.random()*50, 'sawtooth', 0.15, 0.1); }
function sfxHit() { playTone(100, 'sawtooth', 0.3, 0.2); playTone(80, 'square', 0.4, 0.4, 0.1); }
function sfxTimeout() { playTone(200, 'sine', 0.3, 0.3); playTone(150, 'sine', 0.3, 0.4, 0.2); }

const BLOCK_H = Math.min((H * 0.15), 100);
const BLOCK_W = Math.min((W * 0.25), 80);
const BRANCH_W = Math.min((W * 0.3), 100);
const BRANCH_H = BLOCK_H * 0.4;
const CHAR_SIZE = BLOCK_W * 0.8;
const GRAVITY = 3000;

let state = 'START'; 
let score = 0;
let timeLeft = 0.5; 
const TIME_DROP_RATE_BASE = 0.15; 
let timeDropRate = TIME_DROP_RATE_BASE;

let blocks = []; 
let flyingBlocks = []; 
let particles = [];
let shakeAmt = 0;

let charPos = -1; 
let lastTime = 0;
let timeMult = 1.0;

function genBlock(isFirstParams) {
    if(isFirstParams) return { type: 0, yOffset: 0, scale: 1 };
    
    let last = blocks[blocks.length - 1];
    let type = 0;
    
    if (last && last.type !== 0) {
        type = 0;
    } else {
        let r = Math.random();
        if (r < 0.4) type = 1; 
        else if (r < 0.8) type = 2; 
        else type = 0; 
    }
    return { type, yOffset: 0, scale: 1 };
}

function initGame() {
    score = 0;
    scoreEl.innerText = score;
    timeLeft = 0.5;
    timeDropRate = TIME_DROP_RATE_BASE;
    timeMult = 1.0;
    shakeAmt = 0;
    charPos = -1;
    
    blocks = [];
    flyingBlocks = [];
    particles = [];
    
    for(let i=0; i<8; i++) {
        blocks.push(genBlock(i < 3)); 
    }
    
            uiHUD.classList.add('visible');
    timeBarCont.classList.add('visible');
    
    state = 'PLAY';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawnParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        let a = Math.random() * Math.PI * 2;
        let s = 100 + Math.random() * 300;
        particles.push({
            x, y,
            vx: Math.cos(a)*s, vy: Math.sin(a)*s,
            r: 3 + Math.random()*6,
            alpha: 1, c: color
        });
    }
}

function chop(side) { 
    if (!audioCtx && AudioContext) audioCtx = new AudioContext();
    if(state !== 'PLAY') return;
    
    charPos = side;
    
    let bottom = blocks[0];
    blocks.shift();
    blocks.push(genBlock(false));
    
    let throwVX = (side === -1 ? 1 : -1) * (500 + Math.random()*400); 
    flyingBlocks.push({
        x: W/2, y: H - BLOCK_H,
        vx: throwVX, vy: -500 - Math.random()*300,
        type: bottom.type, rot: 0, vrot: (Math.random()-0.5)*10
    });
    
    sfxChop();
    spawnParticles(W/2 + (side===1 ? -BLOCK_W/2 : BLOCK_W/2), H - BLOCK_H/2, '#00f2fe');
    
    score++;
    scoreEl.innerText = score;
    
    timeLeft += 0.035; 
    if(timeLeft > 1) timeLeft = 1;
    
    timeDropRate = TIME_DROP_RATE_BASE + (score * 0.003); 
    
    let newBottom = blocks[0];
    if (newBottom.type === (charPos === -1 ? 1 : 2)) {
        die('BRANCH HIT');
    }
}

function die(reason) {
    state = 'DEAD';
    shakeAmt = 20;
    
    if(reason === 'TIME OUT') sfxTimeout();
    else sfxHit();
    
    spawnParticles(W/2 + (charPos*BLOCK_W/2), H - BLOCK_H/2, '#ff0844');
    
    uiHUD.classList.remove('visible');
    timeBarCont.classList.remove('visible');
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('neonchop_best', bestScore);
    }
    
            
    NeonMenu.showGameOver(score, bestScore);
}

function loop(time) {
    let dt = (time - lastTime) / 1000;
    if(dt > 0.1) dt = 0.1;
    lastTime = time;
    
    if(state === 'PLAY') {
        timeLeft -= timeDropRate * dt;
        let barW = Math.max(0, timeLeft * 100);
        timeBar.style.width = barW + '%';
        
        if (timeLeft < 0.2) timeBar.style.background = '#ff0844';
        else timeBar.style.background = 'linear-gradient(90deg, #ff0844 0%, #ffb199 100%)';
        
        if(timeLeft <= 0) {
            die('TIME OUT');
        }
    }
    
    for(let i=0; i<blocks.length; i++) {
        let targetOff = 0;
        blocks[i].yOffset += (targetOff - blocks[i].yOffset) * 20 * dt;
    }
    
    for (let i=flyingBlocks.length-1; i>=0; i--) {
        let f = flyingBlocks[i];
        f.vy += GRAVITY * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rot += f.vrot * dt;
        if(f.y > H + 200) flyingBlocks.splice(i, 1);
    }
    
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.vy += GRAVITY/2 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= 1.5 * dt;
        if (p.alpha <= 0) particles.splice(i, 1);
    }
    
    if(shakeAmt > 0.5) shakeAmt *= 0.85;
    else shakeAmt = 0;
    
    draw();
    
    if(state !== 'START') {
        requestAnimationFrame(loop);
    }
}

function drawBlockExt(ctx, cx, y, type) {
    ctx.fillStyle = '#1e1a38';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 15;
    ctx.fillRect(cx - BLOCK_W/2, y - BLOCK_H, BLOCK_W, BLOCK_H);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#00f2fe';
    ctx.fillRect(cx - BLOCK_W/2, y - BLOCK_H, BLOCK_W, 2);
    ctx.fillStyle = '#0d0a1b';
    ctx.fillRect(cx - BLOCK_W/2, y - 5, BLOCK_W, 5);
    
    if(type !== 0) {
        ctx.fillStyle = '#ff0844';
        ctx.shadowColor = '#ff0844';
        ctx.shadowBlur = 20;
        
        let brX = type === 1 ? cx - BLOCK_W/2 - BRANCH_W : cx + BLOCK_W/2;
        let brY = y - BLOCK_H/2 - BRANCH_H/2;
        
        ctx.fillRect(brX, brY, BRANCH_W, BRANCH_H);
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#ff7b9a';
        ctx.fillRect(brX, brY, BRANCH_W, 2);
    }
}

function draw() {
    ctx.clearRect(0,0,W,H);
    
    let bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0, '#110e1b');
    bg.addColorStop(1, '#050308');
    ctx.fillStyle = bg;
    ctx.fillRect(0,0,W,H);
    
    ctx.save();
    let sx = shakeAmt > 0.5 ? (Math.random()-0.5)*shakeAmt : 0;
    let sy = shakeAmt > 0.5 ? (Math.random()-0.5)*shakeAmt : 0;
    ctx.translate(sx, sy);
    
    const cx = W/2;
    const baseObjY = H - 20;
    
    ctx.fillStyle = '#222';
    ctx.fillRect(0, baseObjY, W, H-baseObjY);
    
    for(let i=blocks.length-1; i>=0; i--) {
        let b = blocks[i];
        let y = baseObjY - (i * BLOCK_H) + b.yOffset;
        drawBlockExt(ctx, cx, y, b.type);
    }
    
    if (state !== 'START') {
        ctx.save();
        let charX = cx + charPos * (BLOCK_W/2 + CHAR_SIZE/2 + 20);
        let charY = baseObjY - CHAR_SIZE/2;
        
        ctx.translate(charX, charY);
        if(state === 'PLAY') {
            ctx.rotate(Math.sin(performance.now()/100)*0.1 * charPos);
        } else if (state === 'DEAD') {
            ctx.rotate(Math.PI/2 * -charPos); 
            ctx.translate(0, CHAR_SIZE/2);
        }
        
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(-CHAR_SIZE/2, -CHAR_SIZE/2, CHAR_SIZE, CHAR_SIZE, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#110e1b';
        let eyeX = charPos === -1 ? CHAR_SIZE/4 : -CHAR_SIZE/4;
        ctx.beginPath();
        ctx.arc(eyeX, -CHAR_SIZE/6, CHAR_SIZE/8, 0, Math.PI*2);
        ctx.fill();
        
        ctx.restore();
    }
    
    for(let f of flyingBlocks) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        drawBlockExt(ctx, 0, BLOCK_H/2, f.type);
        ctx.restore();
    }
    
    for(let p of particles) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    
    ctx.restore();
}

NeonMenu.init({
    onStart: initGame,
    onRestart: initGame
}).then(() => {
    NeonMenu.showStart();
});


document.getElementById('left-btn').addEventListener('mousedown', (e)=> chop(-1));
document.getElementById('left-btn').addEventListener('touchstart', (e)=> { e.preventDefault(); chop(-1); }, {passive: false});

document.getElementById('right-btn').addEventListener('mousedown', (e)=> chop(1));
document.getElementById('right-btn').addEventListener('touchstart', (e)=> { e.preventDefault(); chop(1); }, {passive: false});

window.addEventListener('keydown', (e) => {
    if(e.code === 'ArrowLeft') chop(-1);
    if(e.code === 'ArrowRight') chop(1);
});

draw();
