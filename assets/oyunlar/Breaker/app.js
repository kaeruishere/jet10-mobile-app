// ─── Difficulty ────────────────────────────────────────────────
let _DIFF = (window.NEON && window.NEON.getDiff()) || { speed:1, density:1, ballCount:3 };

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let dpr = window.devicePixelRatio || 1;
let W, H;
let COL_W;
let ROWS = 11;
let COLS = 7;
let BLOCK_SIZE;
let MARGIN;

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    COL_W = W / COLS;
    BLOCK_SIZE = COL_W * 0.8;
    MARGIN = COL_W * 0.1;
}
window.addEventListener('resize', resize);
resize();

const uiHUD = document.getElementById('hud');
const scoreEl = document.getElementById('score-display');

let bestScore = localStorage.getItem('neonbreaker_best') || 0;

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

function sfxBounce() { playTone(600, 'triangle', 0.05, 0.05); }
function sfxHit()   { playTone(200 + Math.random()*100, 'square', 0.1, 0.05); }
function sfxBreak() { playTone(100, 'sawtooth', 0.2, 0.2); playTone(80, 'square', 0.3, 0.3, 0.1); }
function sfxShoot() { playTone(400, 'sine', 0.05, 0.02); }
function sfxCatch() { playTone(800, 'sine', 0.1, 0.1); }

let state = 'START';
let level = 1;
let lastTime = 0;

const BALL_R = Math.min(W, H) * 0.015;
let BALL_SPEED = 1800 * _DIFF.speed;   // scales with difficulty
const TOP_MARGIN  = H * 0.1;
const BOTTOM_LINE = H * 0.9;

let balls = []; 
let ballCount = 1; 
let ballsLeftToShoot = 0;
let shootTimer = 0;
let shootAngle = 0;

let blocks = []; 
let powers = []; 
let particles = [];

let startX = W / 2;
let newStartX = -1;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragCurrX = 0;
let dragCurrY = 0;

function getBlockColor(ratio) {
    let hue = 320 - (ratio * 40); 
    return `hsl(${hue}, 100%, 60%)`;
}

function initGame() {
    _DIFF = (window.NEON && window.NEON.getDiff()) || { speed:1, density:1, ballCount:3 };
    BALL_SPEED = 1800 * _DIFF.speed;
    
    level = 1;
    ballCount = _DIFF.ballCount || 1;   // easy=4, normal=3, hard=2
    startX = W / 2;
    scoreEl.innerText = level;
    
    blocks = [];
    powers = [];
    particles = [];
    balls = [];
    
    spawnRow(0);
    
    uiHUD.classList.add('visible');
    
    state = 'AIMING';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawnRow(r) {
    let count = 0;
    for(let c=0; c<COLS; c++) {
        // Block density scales with difficulty
        if(Math.random() < 0.4 * _DIFF.density) {
            blocks.push({ r: r, c: c, val: level, maxVal: level, hitAnim: 0 });
            count++;
        } else if (Math.random() < 0.1) {
            powers.push({ r: r, c: c });
        }
    }
    if (count === 0) {
        let c = Math.floor(Math.random() * COLS);
        blocks.push({ r: r, c: c, val: level, maxVal: level, hitAnim: 0 });
    }
}

function spawnParticles(x, y, color) {
    for (let i = 0; i < 20; i++) {
        let a = Math.random() * Math.PI * 2;
        let s = 100 + Math.random() * 300;
        particles.push({
            x, y,
            vx: Math.cos(a)*s, vy: Math.sin(a)*s,
            r: 1 + Math.random()*3,
            alpha: 1, c: color
        });
    }
}

function die() {
    state = 'DEAD';
    uiHUD.classList.remove('visible');
    if (level > bestScore) {
        bestScore = level;
        localStorage.setItem('neonbreaker_best', bestScore);
    }
    NeonMenu.showGameOver(level, bestScore);
}

function shoot(angle) {
    if(state !== 'AIMING') return;
    state = 'SHOOTING';
    shootAngle = angle;
    ballsLeftToShoot = ballCount;
    shootTimer = 0;
    newStartX = -1;
}

function finishTurn() {
    state = 'MOVING_DOWN';
    level++;
    scoreEl.innerText = level;
    
    for(let b of blocks) b.r++;
    for(let p of powers) p.r++;
    
    spawnRow(0);
    
    let died = false;
    for(let b of blocks) {
        let by = TOP_MARGIN + b.r * COL_W;
        if (by + COL_W >= BOTTOM_LINE) {
            died = true;
        }
    }
    
    if (died) {
        die();
    } else {
        if(newStartX !== -1) startX = newStartX;
        state = 'AIMING';
    }
}

function loop(time) {
    let dt = (time - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = time;
    
    if (state === 'SHOOTING') {
        shootTimer -= dt;
        if (shootTimer <= 0 && ballsLeftToShoot > 0) {
            balls.push({
                x: startX,
                y: BOTTOM_LINE - BALL_R,
                vx: Math.cos(shootAngle) * BALL_SPEED,
                vy: Math.sin(shootAngle) * BALL_SPEED,
                active: true
            });
            ballsLeftToShoot--;
            shootTimer = 0.08; 
            sfxShoot();
        }
        
        let allDead = ballsLeftToShoot === 0;
        
        if (balls.length > 0) {
            const SUBSTEPS = 10;
            const subDt = dt / SUBSTEPS;
            
            for(let step=0; step<SUBSTEPS; step++) {
                for(let i=0; i<balls.length; i++) {
                    let b = balls[i];
                    if(!b.active) continue;
                    allDead = false;
                    
                    b.x += b.vx * subDt;
                    if (b.x < BALL_R) { b.x = BALL_R; b.vx *= -1; sfxBounce(); }
                    if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx *= -1; sfxBounce(); }
                    
                    checkBlockCollide(b, true);
                    
                    b.y += b.vy * subDt;
                    if (b.y < BALL_R) { b.y = BALL_R; b.vy *= -1; sfxBounce(); }
                    
                    if (b.y > BOTTOM_LINE - BALL_R) {
                        b.y = BOTTOM_LINE - BALL_R;
                        b.active = false;
                        if (newStartX === -1) newStartX = b.x; 
                        b.x = newStartX; 
                    }
                    
                    checkBlockCollide(b, false);
                    
                    for(let pIdx = powers.length-1; pIdx>=0; pIdx--) {
                        let p = powers[pIdx];
                        let px = p.c * COL_W + COL_W/2;
                        let py = TOP_MARGIN + p.r * COL_W + COL_W/2;
                        if (Math.hypot(b.x - px, b.y - py) < BALL_R + COL_W*0.15) {
                            ballCount++;
                            powers.splice(pIdx, 1);
                            sfxCatch();
                            spawnParticles(px, py, '#fff');
                        }
                    }
                }
            }
            
            for(let i=blocks.length-1; i>=0; i--) {
                if (blocks[i].val <= 0) {
                    let c = blocks[i].c; let r = blocks[i].r;
                    let bx = c * COL_W + COL_W/2;
                    let by = TOP_MARGIN + r * COL_W + COL_W/2;
                    spawnParticles(bx, by, getBlockColor(0));
                    sfxBreak();
                    blocks.splice(i, 1);
                }
            }
        }
        
        if (allDead) {
            finishTurn();
        }
    }
    
    for(let b of blocks) {
        if(b.hitAnim > 0) b.hitAnim -= dt*5;
        if(b.hitAnim < 0) b.hitAnim = 0;
    }
    
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= 2 * dt;
        if (p.alpha <= 0) particles.splice(i, 1);
    }
    
    if (state === 'SHOOTING' && newStartX !== -1) {
        for(let b of balls) {
            if (!b.active) {
                b.x += (newStartX - b.x) * 15 * dt;
            }
        }
    }
    
    draw();
    if(state !== 'START') requestAnimationFrame(loop);
}

function checkBlockCollide(b, isX) {
    for(let bl of blocks) {
        if (bl.val <= 0) continue;
        let bx = bl.c * COL_W + MARGIN;
        let by = TOP_MARGIN + bl.r * COL_W + MARGIN;
        
        let hR = BALL_R * 0.8; 
        
        if (b.x + hR > bx && b.x - hR < bx + BLOCK_SIZE &&
            b.y + hR > by && b.y - hR < by + BLOCK_SIZE) {
            
            if (isX) {
                b.vx *= -1;
                if (b.vx > 0) b.x = bx + BLOCK_SIZE + hR;
                else b.x = bx - hR;
            } else {
                b.vy *= -1;
                if (b.vy > 0) b.y = by + BLOCK_SIZE + hR;
                else b.y = by - hR;
            }
            
            bl.val--;
            bl.hitAnim = 1;
            sfxHit();
        }
    }
}

function draw() {
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#0b0213';
    ctx.fillRect(0,0,W,H);
    
    ctx.strokeStyle = 'rgba(255,0,128,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, TOP_MARGIN); ctx.lineTo(W, TOP_MARGIN);
    ctx.moveTo(0, BOTTOM_LINE); ctx.lineTo(W, BOTTOM_LINE);
    ctx.stroke();
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + (BLOCK_SIZE*0.4) + 'px Chakra Petch';
    
    for(let b of blocks) {
        let bx = b.c * COL_W + MARGIN;
        let by = TOP_MARGIN + b.r * COL_W + MARGIN;
        
        let cx = bx + BLOCK_SIZE/2;
        let cy = by + BLOCK_SIZE/2;
        
        ctx.save();
        ctx.translate(cx, cy);
        let s = 1 + b.hitAnim * 0.1;
        ctx.scale(s, s);
        
        let col = getBlockColor(b.val / 50); 
        
        ctx.fillStyle = col + '22';
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 10 + b.hitAnim * 10;
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        let r = 8;
        let x = -BLOCK_SIZE/2, y = -BLOCK_SIZE/2, w = BLOCK_SIZE, h = BLOCK_SIZE;
        ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
        ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
        ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
        ctx.fill(); ctx.stroke();
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.fillText(b.val, 0, 2);
        
        ctx.restore();
    }
    
    for(let p of powers) {
        let px = p.c * COL_W + COL_W/2;
        let py = TOP_MARGIN + p.r * COL_W + COL_W/2;
        
        ctx.beginPath();
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#00f2fe';
        ctx.fillStyle = 'rgba(0, 242, 254, 0.2)';
        ctx.lineWidth = 3;
        ctx.arc(px, py, COL_W*0.15, 0, Math.PI*2);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#fff';
        ctx.font = '700 ' + (COL_W*0.25) + 'px Chakra Petch';
        ctx.fillText('+1', px, py + 2);
    }
    
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 15;
    
    if (state === 'AIMING') {
        ctx.beginPath(); ctx.arc(startX, BOTTOM_LINE - BALL_R, BALL_R, 0, Math.PI*2); ctx.fill();
        ctx.fillText('x' + ballCount, startX, BOTTOM_LINE + 20);
        
        if (isDragging) {
            let dx = dragStartX - dragCurrX;
            let dy = dragStartY - dragCurrY; 
            if (dy < 0) { 
                let dist = Math.hypot(dx, dy);
                if (dist > 10) {
                    let angle = Math.atan2(dy, dx);
                    
                    const minAbsAngle = Math.PI * 0.1; 
                    if (angle > -minAbsAngle) angle = -minAbsAngle;
                    if (angle < -Math.PI + minAbsAngle) angle = -Math.PI + minAbsAngle;
                    
                    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                    ctx.setLineDash([10, 10]);
                    ctx.lineWidth = 2;
                    ctx.shadowBlur = 0;
                    ctx.beginPath();
                    ctx.moveTo(startX, BOTTOM_LINE - BALL_R);
                    ctx.lineTo(startX + Math.cos(angle)*W, (BOTTOM_LINE - BALL_R) + Math.sin(angle)*W);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }
    } else if (state === 'SHOOTING') {
        for(let b of balls) {
            ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI*2); ctx.fill();
        }
        if (ballsLeftToShoot > 0) {
            ctx.beginPath(); ctx.arc(startX, BOTTOM_LINE - BALL_R, BALL_R, 0, Math.PI*2); ctx.fill();
            ctx.fillText('x' + ballsLeftToShoot, startX, BOTTOM_LINE + 20);
        }
    }
    ctx.shadowBlur = 0;
    
    for(let p of particles) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c;
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

window.addEventListener('mousedown', e => { 
    if(e.target.tagName==='BUTTON' || state !== 'AIMING') return;
    if(!audioCtx && AudioContext) audioCtx = new AudioContext();
    isDragging = true; dragStartX = e.clientX; dragStartY = e.clientY;
    dragCurrX = dragStartX; dragCurrY = dragStartY;
});
window.addEventListener('mousemove', e => {
    if(!isDragging) return;
    dragCurrX = e.clientX; dragCurrY = e.clientY;
});
window.addEventListener('mouseup', () => {
    if(!isDragging) return;
    isDragging = false;
    let dx = dragStartX - dragCurrX;
    let dy = dragStartY - dragCurrY;
    if (dy < -10) {
        let angle = Math.atan2(dy, dx);
        const minAbsAngle = Math.PI * 0.1;
        if (angle > -minAbsAngle) angle = -minAbsAngle;
        if (angle < -Math.PI + minAbsAngle) angle = -Math.PI + minAbsAngle;
        shoot(angle);
    }
});

window.addEventListener('touchstart', e => { 
    if(e.target.tagName !== 'BUTTON') e.preventDefault();
    if(state !== 'AIMING') return;
    if(!audioCtx && AudioContext) audioCtx = new AudioContext();
    isDragging = true; dragStartX = e.touches[0].clientX; dragStartY = e.touches[0].clientY;
    dragCurrX = dragStartX; dragCurrY = dragStartY;
}, {passive: false});
window.addEventListener('touchmove', e => {
    if(!isDragging) return;
    dragCurrX = e.touches[0].clientX; dragCurrY = e.touches[0].clientY;
});
window.addEventListener('touchend', () => {
    if(!isDragging) return;
    isDragging = false;
    let dx = dragStartX - dragCurrX;
    let dy = dragStartY - dragCurrY;
    if (dy < -10) {
        let angle = Math.atan2(dy, dx);
        const minAbsAngle = Math.PI * 0.1;
        if (angle > -minAbsAngle) angle = -minAbsAngle;
        if (angle < -Math.PI + minAbsAngle) angle = -Math.PI + minAbsAngle;
        shoot(angle);
    }
});

NeonMenu.init({
    onStart: initGame,
    onRestart: initGame
}).then(() => {
    NeonMenu.showStart();
});

draw();
