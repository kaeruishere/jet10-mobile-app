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

let bestScore = localStorage.getItem('neonswitch_best') || 0;

const COLORS = ['#32E2B4', '#FF0080', '#00f2fe', '#FFD700'];

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

function sfxJump() { playTone(300, 'sine', 0.2, 0.1); }
function sfxStar() { [523, 659, 784, 1046].forEach((f,i)=>playTone(f, 'sine', 0.1, 0.1, i*0.05)); }
function sfxSwitch() { playTone(800, 'sine', 0.1, 0.1); playTone(600, 'sine', 0.1, 0.1, 0.1); }
function sfxDead() { playTone(150, 'sawtooth', 0.3, 0.3); playTone(100, 'sawtooth', 0.4, 0.4, 0.1); }

let state = 'START';
let score = 0;
let lastTime = 0;

const GRAVITY = 1200;
const JUMP_FORCE = -450;
const BALL_RADIUS = Math.min(W, H) * 0.03;
const RING_RADIUS = Math.min(W, H) * 0.25;
const RING_THICKNESS = BALL_RADIUS * 1.2;

let ball = {
    y: 0,
    vy: 0,
    colorIdx: 0
};

let cameraY = 0;
let targetCameraY = 0;

let entities = []; 
let particles = [];
let highestY = 0;

function getRandomColorIdx(exclude=-1) {
    let idx;
    do { idx = Math.floor(Math.random() * 4); } while (idx === exclude);
    return idx;
}

function spawnSegment(yOffset) {
    let type = Math.random() > 0.3 ? 'ring' : (Math.random() > 0.5 ? 'cross' : 'ring'); 
    let rotSpeed = (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 1.5);
    
    entities.push({
        type: type,
        y: yOffset,
        rot: 0,
        speed: rotSpeed,
        passed: false
    });
    
    entities.push({
        type: 'star',
        y: yOffset,
        collected: false
    });
    
    entities.push({
        type: 'switcher',
        y: yOffset - RING_RADIUS * 2.5,
        rot: 0,
        collected: false
    });
}

function initGame() {
    score = 0;
    scoreEl.innerText = score;
    state = 'PLAY';
    
    ball.colorIdx = getRandomColorIdx();
    ball.y = H * 0.7;
    ball.vy = 0;
    
    cameraY = 0;
    targetCameraY = Math.max(0, H - ball.y - H/2);
    
    entities = [];
    particles = [];
    highestY = ball.y;
    
    for(let i=0; i<5; i++) {
        spawnSegment(H * 0.3 - i*600);
        highestY = H * 0.3 - i*600;
    }
    
            uiHUD.classList.add('visible');
    
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function jump() {
    if(!audioCtx && AudioContext) audioCtx = new AudioContext();
    if(state === 'PLAY') {
        ball.vy = JUMP_FORCE;
        sfxJump();
        
        for(let i=0; i<5; i++) {
            particles.push({
                x: W/2 + (Math.random()-0.5)*10,
                y: ball.y + BALL_RADIUS,
                vx: (Math.random()-0.5)*50,
                vy: Math.random()*50,
                c: COLORS[ball.colorIdx],
                size: 2, alpha: 1
            });
        }
    }
}

function spawnParticles(x, y, color) {
    for(let i=0; i<30; i++) {
        let a = Math.random()*Math.PI*2;
        let s = 100 + Math.random()*300;
        particles.push({
            x, y,
            vx: Math.cos(a)*s, vy: Math.sin(a)*s,
            c: color, size: 2 + Math.random()*5, alpha: 1
        });
    }
}

function die() {
    state = 'DEAD';
    sfxDead();
    spawnParticles(W/2, ball.y, COLORS[ball.colorIdx]);
    
    uiHUD.classList.remove('visible');
    
    if(score > bestScore) {
        bestScore = score;
        localStorage.setItem('neonswitch_best', bestScore);
    }
    
            
    NeonMenu.showGameOver(score, bestScore);
}

function getQuadrantColor(angle) {
    let a = angle % (Math.PI*2);
    if(a < 0) a += Math.PI*2;
    if(a < Math.PI/2) return 0;
    if(a < Math.PI) return 1;
    if(a < Math.PI*1.5) return 2;
    return 3;
}

function checkCollisions() {
    if(ball.y > H + -cameraY + 100) {
        die();
        return;
    }
    
    for(let e of entities) {
        if(e.type === 'star' && !e.collected) {
            let dist = Math.abs(ball.y - e.y);
            if(dist < BALL_RADIUS*2) {
                e.collected = true;
                score++;
                scoreEl.innerText = score;
                sfxStar();
                spawnParticles(W/2, e.y, '#fff');
            }
        }
        else if(e.type === 'switcher' && !e.collected) {
            let dist = Math.abs(ball.y - e.y);
            if(dist < BALL_RADIUS*2) {
                e.collected = true;
                ball.colorIdx = getRandomColorIdx(ball.colorIdx);
                sfxSwitch();
                spawnParticles(W/2, e.y, COLORS[ball.colorIdx]);
            }
        }
        else if(e.type === 'ring') {
            let distY = Math.abs(ball.y - e.y);
            
            if (Math.abs(distY - RING_RADIUS) < BALL_RADIUS + RING_THICKNESS/2) {
                let ballAngle = ball.y < e.y ? Math.PI*1.5 : Math.PI/2;
                
                let hitAngle = ballAngle - e.rot;
                
                let hitColor = getQuadrantColor(hitAngle);
                if(hitColor !== ball.colorIdx) {
                    die();
                    return;
                }
            }
        }
        else if(e.type === 'cross') {
            let distY = ball.y - e.y;
            if(Math.abs(distY) < RING_RADIUS + BALL_RADIUS) {
                let localX = -distY * Math.sin(-e.rot); 
                let localY = distY * Math.cos(-e.rot);
                
                let t = RING_THICKNESS/2;
                if(localX > -t && localX < t) {
                    let hitColor = localY < 0 ? 0 : 2; 
                    if(hitColor !== ball.colorIdx && Math.abs(localY) < RING_RADIUS) die();
                }
                if(localY > -t && localY < t) {
                    let hitColor = localX > 0 ? 1 : 3;
                    if(hitColor !== ball.colorIdx && Math.abs(localX) < RING_RADIUS) die();
                }
            }
        }
    }
}

function loop(time) {
    let dt = (time - lastTime) / 1000;
    if(dt > 0.1) dt = 0.1;
    lastTime = time;

    if(state === 'PLAY') {
        ball.vy += GRAVITY * dt;
        ball.y += ball.vy * dt;
        
        if(ball.y < H/2 - cameraY) {
            cameraY = H/2 - ball.y;
        }
        
        if(ball.y - cameraY < 1000) {
            highestY -= 600;
            spawnSegment(highestY);
            
            entities = entities.filter(e => e.y < -cameraY + H + 500);
        }
        
        for(let e of entities) {
            if(e.rot !== undefined && e.speed !== undefined) {
                e.rot += e.speed * dt;
            }
            if(e.type === 'switcher') {
                e.rot += 3 * dt;
            }
        }
        
        checkCollisions();
    }
    
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.vy += GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= 2 * dt;
        if(p.alpha <= 0) particles.splice(i, 1);
    }

    draw();

    if(state !== 'START') {
        requestAnimationFrame(loop);
    }
}

function drawRing(ctx, x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    
    ctx.lineWidth = RING_THICKNESS;
    
    for(let i=0; i<4; i++) {
        ctx.beginPath();
        ctx.strokeStyle = COLORS[i];
        ctx.shadowColor = COLORS[i];
        ctx.shadowBlur = 10;
        ctx.arc(0, 0, RING_RADIUS, i*Math.PI/2, (i+1)*Math.PI/2);
        ctx.stroke();
    }
    
    ctx.restore();
}

function drawCross(ctx, x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    
    ctx.lineCap = 'round';
    ctx.lineWidth = RING_THICKNESS;
    
    ctx.strokeStyle = COLORS[0];
    ctx.shadowColor = COLORS[0];
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, -RING_RADIUS); ctx.stroke();
    
    ctx.strokeStyle = COLORS[1];
    ctx.shadowColor = COLORS[1];
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(RING_RADIUS, 0); ctx.stroke();
    
    ctx.strokeStyle = COLORS[2];
    ctx.shadowColor = COLORS[2];
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, RING_RADIUS); ctx.stroke();
    
    ctx.strokeStyle = COLORS[3];
    ctx.shadowColor = COLORS[3];
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-RING_RADIUS, 0); ctx.stroke();
    
    ctx.restore();
}

function drawSwitcher(ctx, x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    
    const r = BALL_RADIUS * 1.5;
    
    for(let i=0; i<4; i++) {
        ctx.fillStyle = COLORS[i];
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.arc(0,0,r, i*Math.PI/2, (i+1)*Math.PI/2);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawStar(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    let spikes = 5, outer = BALL_RADIUS*1.2, inner = BALL_RADIUS*0.5;
    for(let i=0; i<spikes*2; i++) {
        let r = i%2===0 ? outer : inner;
        let a = (i/spikes) * Math.PI - Math.PI/2;
        if(i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
        else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

function draw() {
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#121212';
    ctx.fillRect(0,0,W,H);
    
    ctx.save();
    ctx.translate(0, cameraY);
    
    const cx = W/2;
    
    for(let e of entities) {
        if(e.y > -cameraY + H + 50 || e.y < -cameraY - 50) continue; 
        
        if(e.type === 'ring') drawRing(ctx, cx, e.y, e.rot);
        else if(e.type === 'cross') drawCross(ctx, cx, e.y, e.rot);
        else if(e.type === 'star' && !e.collected) drawStar(ctx, cx, e.y);
        else if(e.type === 'switcher' && !e.collected) drawSwitcher(ctx, cx, e.y, e.rot);
    }
    
    if(state !== 'DEAD') {
        ctx.beginPath();
        ctx.fillStyle = COLORS[ball.colorIdx];
        ctx.shadowColor = COLORS[ball.colorIdx];
        ctx.shadowBlur = 20;
        ctx.arc(cx, ball.y, BALL_RADIUS, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    for(let p of particles) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    ctx.restore();
}

NeonMenu.init({
    onStart: initGame,
    onRestart: initGame
}).then(() => {
    NeonMenu.showStart();
});


window.addEventListener('mousedown', (e) => {
    if(e.target.tagName !== 'BUTTON') jump();
});
window.addEventListener('touchstart', (e) => {
    if(e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        jump();
    }
}, {passive: false});

resize();
draw();
