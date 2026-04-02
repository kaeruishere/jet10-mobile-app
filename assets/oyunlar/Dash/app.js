// ─── Difficulty ────────────────────────────────────────────────
let _DIFF = (window.NEON && window.NEON.getDiff()) || { speed:1, density:1 };

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');

let dpr = window.devicePixelRatio || 1;
let W, H;

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    
    bgCanvas.width = W * dpr;
    bgCanvas.height = H * dpr;
    bgCtx.scale(dpr, dpr);
    
    if(state === 'START') drawBG();
}
window.addEventListener('resize', resize);

const uiHUD = document.getElementById('hud');
const scoreEl = document.getElementById('score-display');

let bestScore = localStorage.getItem('neondash_best') || 0;

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

function sfxJump() { playTone(300, 'sine', 0.2, 0.15); playTone(400, 'sine', 0.2, 0.2, 0.05); }
function sfxCrash() { playTone(100, 'sawtooth', 0.3, 0.3); playTone(50, 'sawtooth', 0.4, 0.4, 0.1); }

const GRAVITY = 2500;
const JUMP_FORCE = -850;
let SPEED = 400;
const BASE_SPEED = 400;

let state = 'START';
let score = 0;
let lastTime = performance.now();
let cameraX = 0;

let player = {
    x: 100, y: 0,
    size: 30,
    vy: 0,
    rotation: 0,
    isGrounded: false
};

let obstacles = [];
let particles = [];
let trail = [];

const getFloorY = () => H * 0.75;

function initGame() {
    score = 0;
    scoreEl.innerText = score;
    SPEED = BASE_SPEED;
    cameraX = 0;
    
    player.x = W * 0.2;
    player.y = getFloorY() - player.size;
    player.vy = 0;
    player.rotation = 0;
    player.isGrounded = true;
    
    obstacles = [];
    particles = [];
    trail = [];
    
    lastTime = performance.now();
    state = 'PLAY';
    
            uiHUD.classList.add('visible');
    
    generateChunk(player.x + W);
    
    requestAnimationFrame(loop);
}

function generateChunk(startX) {
    let x = startX + 200 + Math.random() * 300;
    for(let i=0; i<10; i++) {
        let type = Math.random() > 0.6 ? 'block' : 'spike';
        let w = type === 'block' ? 40 + Math.random() * 60 : 30;
        let h = type === 'block' ? 30 + Math.random() * 40 : 30;
        
        let y = getFloorY() - h;
        
        if (type === 'block' && Math.random() > 0.5) {
            y -= 40 + Math.random()*40;
        }
        
        obstacles.push({ x, y, w, h, type, passed: false });
        
        x += w + 200 + Math.random() * 300;
    }
}

function jump() {
    if(!audioCtx && AudioContext) audioCtx = new AudioContext();
    if(state === 'PLAY' && player.isGrounded) {
        player.vy = JUMP_FORCE;
        player.isGrounded = false;
        sfxJump();
        
        spawnParticles(player.x + player.size/2, player.y + player.size, '#00f2fe', 10);
    }
}

function spawnParticles(x, y, color, count=30) {
    for (let i = 0; i < count; i++) {
        let a = Math.random() * Math.PI * 2;
        let s = 50 + Math.random() * 400;
        particles.push({
            x, y,
            vx: Math.cos(a)*s, vy: Math.sin(a)*s,
            r: 2 + Math.random()*5,
            alpha: 1, c: color
        });
    }
}

function die() {
    state = 'DEAD';
    sfxCrash();
    
    spawnParticles(player.x + player.size/2, player.y + player.size/2, '#00f2fe', 40);
    spawnParticles(player.x + player.size/2, player.y + player.size/2, '#f0f', 40);
    
    uiHUD.classList.remove('visible');
    
    if(score > bestScore) {
        bestScore = score;
        localStorage.setItem('neondash_best', bestScore);
    }
    
            
    NeonMenu.showGameOver(score, bestScore);
}

function checkCollisions() {
    let px = player.x;
    let py = player.y;
    let s = player.size;
    
    let floorY = getFloorY();
    
    if (py + s >= floorY) {
        player.y = floorY - s;
        player.vy = 0;
        player.isGrounded = true;
    } else {
        player.isGrounded = false; 
    }

    const margin = 2; 

    for(let o of obstacles) {
        if (px + s - margin > o.x && px + margin < o.x + o.w) {
            
            if (o.type === 'block') {
                if (py + s >= o.y && py < o.y + o.h) {
                    let prevY = player.y - player.vy * 0.016; 
                    if (prevY + s <= o.y + 15 && player.vy > 0) { 
                        player.y = o.y - s;
                        player.vy = 0;
                        player.isGrounded = true;
                    } else { 
                        die();
                        return;
                    }
                }
            } 
            else if (o.type === 'spike') {
                let spikeMargin = 8;
                if (py + s > o.y + spikeMargin && py + spikeMargin < o.y + o.h) {
                    die();
                    return;
                }
            }
        }
        
        if (!o.passed && o.x + o.w < px) {
            o.passed = true;
        }
    }
}

function drawBG() {
    bgCtx.clearRect(0,0,W,H);
    
    let grad = bgCtx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, '#090014');
    grad.addColorStop(0.5, '#19002e');
    grad.addColorStop(0.75, '#2e0052');
    grad.addColorStop(1, '#090014');
    
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0,0,W,H);
    
    let floorY = getFloorY();
    bgCtx.strokeStyle = 'rgba(179, 0, 255, 0.4)';
    bgCtx.lineWidth = 2;
    
    bgCtx.shadowColor = '#b300ff';
    bgCtx.shadowBlur = 15;
    bgCtx.beginPath();
    bgCtx.moveTo(0, floorY);
    bgCtx.lineTo(W, floorY);
    bgCtx.stroke();
    
    bgCtx.shadowBlur = 0;
    bgCtx.beginPath();
    const GRID_SIZE = 50;
    let offsetX = -(cameraX % GRID_SIZE);
    
    for(let x=offsetX; x<W; x+=GRID_SIZE) {
        bgCtx.moveTo(W/2, floorY);
        bgCtx.lineTo(x + (x - W/2)*2, H);
    }
    
    let zOffset = (cameraX * 0.1) % 100;
    for(let y=10; y<200; y+=y*0.2) {
        let lineY = floorY + y;
        if(lineY > H) break;
        bgCtx.moveTo(0, lineY);
        bgCtx.lineTo(W, lineY);
    }
    bgCtx.stroke();
    
    bgCtx.shadowColor = '#ff0055';
    bgCtx.shadowBlur = 40;
    
    let sunGrad = bgCtx.createLinearGradient(0, floorY-150, 0, floorY);
    sunGrad.addColorStop(0, '#ff0055');
    sunGrad.addColorStop(1, '#ffc371');
    bgCtx.fillStyle = sunGrad;
    
    bgCtx.beginPath();
    bgCtx.arc(W/2, floorY - 20, 100, Math.PI, 0);
    bgCtx.fill();
    
    bgCtx.shadowBlur = 0;
    bgCtx.globalCompositeOperation = 'destination-out';
    for(let i=0; i<6; i++) {
        bgCtx.fillRect(W/2 - 120, floorY - 30 - i*20 + (cameraX*0.02 % 20), 240, i*1.5 + 2);
    }
    bgCtx.globalCompositeOperation = 'source-over';
}

function loop(time) {
    let dt = (time - lastTime) / 1000;
    if(dt > 0.1) dt = 0.1;
    lastTime = time;

    resize(); 
    drawBG();

    if(state === 'PLAY') {
        SPEED += dt * 5; 
        
        player.x += SPEED * dt;
        player.vy += GRAVITY * dt;
        player.y += player.vy * dt;
        
        cameraX = player.x - W * 0.2;
        
        checkCollisions();
        
        if(!player.isGrounded) {
            player.rotation += 5 * dt; 
        } else {
            let dest = Math.round(player.rotation / (Math.PI/2)) * (Math.PI/2);
            player.rotation += (dest - player.rotation) * 10 * dt;
        }
        
        score = Math.floor(player.x / 100);
        scoreEl.innerText = score;
        
        if(Math.random() > 0.5) {
            trail.push({x: player.x, y: player.y, a: 1});
            if(trail.length > 20) trail.shift();
        }
        
        if(obstacles.length > 0 && obstacles[obstacles.length-1].x < player.x + W*1.5) {
            generateChunk(obstacles[obstacles.length-1].x);
        }
        
        if(obstacles.length > 0 && obstacles[0].x < player.x - W) {
            obstacles.shift();
        }
    }
    
    for(let t of trail) t.a -= dt*2;
    trail = trail.filter(t => t.a > 0);
    
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.vy += GRAVITY/2 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= 2.0 * dt;
        if(p.alpha <= 0) particles.splice(i, 1);
    }
    
    draw();

    if(state !== 'START') {
        requestAnimationFrame(loop);
    }
}

function draw() {
    ctx.clearRect(0,0,W,H);
    ctx.lineJoin = 'round';
    
    ctx.save();
    ctx.translate(-cameraX, 0);
    
    ctx.globalCompositeOperation = 'lighter';
    
    for(let t of trail) {
        ctx.globalAlpha = Math.max(0, t.a * 0.5);
        ctx.fillStyle = '#00f2fe';
        ctx.fillRect(t.x, t.y, player.size, player.size);
    }
    ctx.globalAlpha = 1;
    
    for(let o of obstacles) {
        if(o.x > cameraX + W || o.x + o.w < cameraX) continue;
        
        if (o.type === 'block') {
            ctx.shadowColor = '#00f2fe';
            ctx.shadowBlur = 10;
            ctx.fillStyle = 'rgba(0, 242, 254, 0.2)';
            ctx.strokeStyle = '#00f2fe';
            ctx.lineWidth = 3;
            
            ctx.fillRect(o.x, o.y, o.w, o.h);
            ctx.strokeRect(o.x, o.y, o.w, o.h);
            
            ctx.beginPath();
            ctx.moveTo(o.x, o.y);
            ctx.lineTo(o.x+o.w, o.y+o.h);
            ctx.moveTo(o.x+o.w, o.y);
            ctx.lineTo(o.x, o.y+o.h);
            ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
            ctx.stroke();
            
        } else if (o.type === 'spike') {
            ctx.shadowColor = '#f0f';
            ctx.shadowBlur = 15;
            ctx.fillStyle = 'rgba(255, 0, 255, 0.2)';
            ctx.strokeStyle = '#f0f';
            ctx.lineWidth = 3;
            
            ctx.beginPath();
            ctx.moveTo(o.x + o.w/2, o.y);
            ctx.lineTo(o.x + o.w, o.y + o.h);
            ctx.lineTo(o.x, o.y + o.h);
            ctx.closePath();
            
            ctx.fill();
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }
    
    if(state !== 'DEAD') {
        ctx.save();
        ctx.translate(player.x + player.size/2, player.y + player.size/2);
        ctx.rotate(player.rotation);
        
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 25;
        
        ctx.fillStyle = '#fff';
        ctx.fillRect(-player.size/2, -player.size/2, player.size, player.size);
        
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#00f2fe';
        ctx.strokeRect(-player.size/2, -player.size/2, player.size, player.size);
        
        ctx.restore();
    }
    
    for(let p of particles) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c;
        ctx.shadowBlur = 15;
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


window.addEventListener('mousedown', (e) => {
    if(e.target.tagName !== 'BUTTON') jump();
});
window.addEventListener('touchstart', (e) => {
    if(e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        jump();
    }
}, {passive: false});
window.addEventListener('keydown', (e) => {
    if(e.code === 'Space' || e.code === 'ArrowUp') jump();
});

resize();
drawBG();
