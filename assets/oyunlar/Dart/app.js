// ─── Difficulty ────────────────────────────────────────────────
let _DIFF = (window.NEON && window.NEON.getDiff()) || { speed:1, density:1 };

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let W, H;
let dpr = window.devicePixelRatio || 1;

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
const levelEl = document.getElementById('level-display');
const scoreEl = document.getElementById('score-display');
const dartsContainer = document.getElementById('darts-container');
const banner = document.getElementById('perfect-banner');

let bestScore = localStorage.getItem('neondarts_best') || 0;

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
    g.gain.exponentialRampToValueAtTime(0.01, t0 + dur);
    
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
}

function sfxThrow() { playTone(800, 'sine', 0.1, 0.05); }
function sfxHit()   { playTone(150, 'square', 0.2, 0.1); playTone(300, 'triangle', 0.1, 0.1); }
function sfxFail()  { playTone(100, 'sawtooth', 0.3, 0.2); playTone(80, 'sawtooth', 0.4, 0.4, 0.1); }
function sfxLevelUp(){ [523, 659, 784, 1046].forEach((f,i)=>playTone(f, 'sine', 0.15, 0.1, i*0.08)); }


let state = 'START'; 
let level = 1;
let score = 0;

let circleRotation = 0;
let circleSpeed = 1; 
let dartsInCircle = [];  
let flyingDart = null; 
let dartsLeft = 5;
let particles = [];
let shakeAmt = 0;
let lastTime = performance.now();

const CIRCLE_RADIUS = Math.min(W, H) * 0.15;
const DART_LENGTH = Math.min(W, H) * 0.12;
const DART_WIDTH = 6;

function getLevelSpeed(lvl) {
    return (1.2 + (lvl * 0.15)) * _DIFF.speed; // difficulty scales speed
}

function getLevelDarts(lvl) {
    // Round to ensure integer dart count, harder density = more darts to throw
    return Math.round((4 + Math.floor(lvl * 1.2)) * _DIFF.density);
}

function startLevel() {
    circleRotation = 0;
    circleSpeed = getLevelSpeed(level) * (Math.random() > 0.5 ? 1 : -1);
    
    dartsInCircle = [];
    if(level > 1) {
        let obstaclesCount = Math.floor(level / 2);
        for(let i=0; i<obstaclesCount; i++){
            dartsInCircle.push({angle: Math.random() * Math.PI * 2});
        }
    }
    
    dartsLeft = getLevelDarts(level);
    updateDartsUI();
    
    levelEl.innerText = level;
    state = 'PLAYING';
    flyingDart = null;
    particles = [];
}

function initGame() {
    level = 1;
    score = 0;
    scoreEl.innerText = score;
            uiHUD.classList.add('visible');
    
    lastTime = performance.now();
    startLevel();
    requestAnimationFrame(loop);
}

function updateDartsUI() {
    dartsContainer.innerHTML = '';
    for(let i=0; i<dartsLeft; i++){
        let d = document.createElement('div');
        d.className = 'dart-dot';
        dartsContainer.appendChild(d);
    }
}

function showBanner() {
    banner.classList.add('show');
    setTimeout(() => {
        banner.classList.remove('show');
    }, 1000);
}

function spawnParticles(x, y, color) {
    for (let i = 0; i < 30; i++) {
        let a = Math.random() * Math.PI * 2;
        let s = 100 + Math.random() * 400;
        particles.push({
            x: x, y: y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            r: 2 + Math.random() * 5,
            alpha: 1,
            color: color
        });
    }
}

function tap() {
    if(!audioCtx && AudioContext) audioCtx = new AudioContext();
    if(state !== 'PLAYING') return;
    
    if(!flyingDart && dartsLeft > 0) {
        flyingDart = { y: H * 0.85, vy: -3000 };
        dartsLeft--;
        if(dartsContainer.firstChild) {
            dartsContainer.removeChild(dartsContainer.firstChild);
        }
        sfxThrow();
    }
}

function levelComplete() {
    state = 'LEVEL_UP';
    sfxLevelUp();
    showBanner();
    
    spawnParticles(W/2, H * 0.35, '#00f2fe');
    spawnParticles(W/2, H * 0.35, '#f5576c');
    
    shakeAmt = 20;

    setTimeout(() => {
        level++;
        score += 100;
        scoreEl.innerText = score;
        startLevel();
    }, 1200);
}

function gameOver() {
    state = 'GAME_OVER';
    shakeAmt = 30;
    uiHUD.classList.remove('visible');
    sfxFail();
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('neondarts_best', bestScore);
    }
    
    NeonMenu.showGameOver(score, bestScore);
}

function checkHit() {
    let hitAngle = -circleRotation; 
    
    hitAngle = hitAngle % (Math.PI * 2);
    if(hitAngle < 0) hitAngle += Math.PI * 2;

    let hitDistance = Math.PI / 10; 
    
    for(let d of dartsInCircle) {
        let angleDiff = Math.abs(d.angle - hitAngle);
        if(angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
        
        if(angleDiff < hitDistance) {
            spawnParticles(W/2, H * 0.35 + CIRCLE_RADIUS, '#fff');
            flyingDart.vy = 1200; 
            flyingDart.vx = (Math.random() - 0.5) * 800;
            return false;
        }
    }
    
    dartsInCircle.push({angle: hitAngle});
    score += 10;
    scoreEl.innerText = score;
    shakeAmt = 10;
    sfxHit();
    return true;
}

function loop(time) {
    let dt = (time - lastTime) / 1000;
    if(dt > 0.1) dt = 0.1;
    lastTime = time;

    if (state === 'PLAYING') {
        if(level > 2) {
           circleSpeed += Math.sin(time/500)*0.05;
        }
    }

    if (state !== 'LEVEL_UP') {
        circleRotation += circleSpeed * dt;
    }

    if (flyingDart) {
        flyingDart.y += flyingDart.vy * dt;
        if(flyingDart.vx) flyingDart.x += flyingDart.vx * dt; 
        
        if (state === 'PLAYING' && flyingDart.y <= H * 0.35 + CIRCLE_RADIUS) {
            if (checkHit()) {
                flyingDart = null;
                if(dartsLeft === 0) {
                    levelComplete();
                }
            } else {
                gameOver();
            }
        }
        
        if (state === 'GAME_OVER' && flyingDart && flyingDart.y > H + 100) {
            flyingDart = null;
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.vy += 800 * dt; 
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= 1.5 * dt;
        if (p.alpha <= 0) particles.splice(i, 1);
    }
    
    if (shakeAmt > 0.5) shakeAmt *= 0.9;
    else shakeAmt = 0;

    draw();

    if (state !== 'START') {
        requestAnimationFrame(loop);
    }
}

function drawDart(ctx, x, y, angle=0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-DART_WIDTH/2, 0);
    ctx.lineTo(0, -DART_LENGTH*0.8);
    ctx.lineTo(DART_WIDTH/2, 0);
    ctx.fill();
    
    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 10;
    ctx.fillRect(-DART_WIDTH/2+1, 0, DART_WIDTH-2, DART_LENGTH*0.4);
    
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    
    let bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    let levelHue = (level * 40) % 360;
    bgGrad.addColorStop(0, `hsl(${levelHue}, 50%, 15%)`);
    bgGrad.addColorStop(1, `#050510`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    let sx = shakeAmt > 0.5 ? (Math.random() - 0.5) * shakeAmt : 0;
    let sy = shakeAmt > 0.5 ? (Math.random() - 0.5) * shakeAmt : 0;
    ctx.translate(sx, sy);

    const cx = W / 2;
    const cy = H * 0.35;

    if (state !== 'LEVEL_UP') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(circleRotation);
        for(let d of dartsInCircle) {
            ctx.save();
            ctx.rotate(d.angle);
            ctx.translate(0, CIRCLE_RADIUS);
            drawDart(ctx, 0, 0, 0); 
            ctx.restore();
        }
        
        ctx.shadowColor = `hsl(${levelHue}, 100%, 60%)`;
        ctx.shadowBlur = 40;
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(0, 0, CIRCLE_RADIUS, 0, Math.PI*2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `hsl(${levelHue}, 100%, 60%)`;
        ctx.lineWidth = 6;
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = '900 2.5rem Montserrat';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(level, 0, 0);
        
        ctx.restore();
    }

    if (flyingDart) {
        let dx = flyingDart.x || cx;
        drawDart(ctx, dx, flyingDart.y, flyingDart.vy > 0 ? Math.PI : 0);
    }
    
    if (state === 'PLAYING' && !flyingDart && dartsLeft > 0) {
        drawDart(ctx, cx, H * 0.85, 0);
    }

    for (let p of particles) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
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
