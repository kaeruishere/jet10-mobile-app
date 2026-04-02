// ─── Difficulty ────────────────────────────────────────────────
let _DIFF = (window.NEON && window.NEON.getDiff()) || { speed: 1, density: 1 };

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let dpr = window.devicePixelRatio || 1;
let W, H;
let COL_W;

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    COL_W = W / 5;
}
window.addEventListener('resize', resize);
resize();

const uiHUD = document.getElementById('hud');
const scoreEl = document.getElementById('score-display');

let bestScore = localStorage.getItem('neonsnake_best') || 0;

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playTone(freq, type, vol, dur, delay = 0) {
    if (!audioCtx) {
        if (AudioContext) audioCtx = new AudioContext();
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

function sfxBreak() { playTone(150 + Math.random() * 50, 'square', 0.1, 0.05); }
function sfxPick() { playTone(600, 'sine', 0.1, 0.1); playTone(800, 'sine', 0.1, 0.1, 0.05); }
function sfxDie() { playTone(100, 'sawtooth', 0.3, 0.3); playTone(60, 'sawtooth', 0.3, 0.4, 0.1); }

const BALL_R = Math.min(W * 0.04, 12);
const GAP_Y = BALL_R * 2.2;
const BASE_SPEED = H * 0.4;
const MAX_HISTORY = 600;

let state = 'START';
let score = 0;
let lastTime = 0;

let snakeHistory = [];
let pathDistance = 0;

let snakeLength = 4;
let snakeHeadX = W / 2;
const SNAKE_Y = H * 0.75;
let currentSpeed = BASE_SPEED;

let isDragging = false;
let startDragX = 0;

let blocks = [];
let pickups = [];
let walls = [];
let particles = [];

let breakTimer = 0;
let breakingBlock = null;

let distanceTravelled = 0;
let nextSpawnDist = 0;

function getBlockColor(value) {
    if (value < 5) return '#00f2fe';
    if (value < 15) return '#fbc2eb';
    if (value < 30) return '#f093fb';
    if (value < 50) return '#f5576c';
    return '#ff0844';
}

function initGame() {
    score = 0;
    scoreEl.innerText = score;
    snakeLength = 4;
    snakeHeadX = W / 2;
    snakeHistory = [];
    pathDistance = 0;

    for (let i = 0; i < snakeLength * 15; i++) {
        snakeHistory.unshift({ x: snakeHeadX, dist: -i * 2 });
    }

    blocks = [];
    pickups = [];
    walls = [];
    particles = [];

    breakingBlock = null;
    breakTimer = 0;
    distanceTravelled = 0;
    nextSpawnDist = H * 0.5;

    currentSpeed = BASE_SPEED;

    uiHUD.classList.add('visible');

    state = 'PLAY';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawnRow() {
    let r = Math.random();
    let y = -100;

    if (r < 0.4) {
        let cols = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
        let numBlocks = Math.floor(Math.random() * 4) + 1;
        if (Math.random() < 0.2) numBlocks = 5;

        for (let i = 0; i < numBlocks; i++) {
            let val = Math.floor(Math.random() * (snakeLength * 1.5 + 5)) + 1;
            blocks.push({ col: cols[i], y: y, value: val, alpha: 1, hitScale: 1 });
        }
    } else if (r < 0.8) {
        let numP = Math.floor(Math.random() * 3) + 1;
        let cols = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
        for (let i = 0; i < numP; i++) {
            let val = Math.floor(Math.random() * 5) + 1;
            pickups.push({ col: cols[i], y: y, value: val });
        }
    }

    if (Math.random() < 0.5) {
        let wh = 100 + Math.random() * 200;
        let colLine = Math.floor(Math.random() * 4);
        walls.push({ colStart: colLine, y: y, h: wh });
    }
}

function die() {
    state = 'DEAD';
    sfxDie();
    uiHUD.classList.remove('visible');

    for (let i = 0; i < snakeLength; i++) {
        let pos = getHistoryPos(pathDistance - i * GAP_Y);
        spawnParticles(pos.x, pos.y, '#00f2fe', 10);
    }

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('neonsnake_best', bestScore);
    }

    NeonMenu.showGameOver(score, bestScore);
}

function spawnParticles(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        let a = Math.random() * Math.PI * 2;
        let s = 50 + Math.random() * 200;
        particles.push({
            x, y,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            r: 2 + Math.random() * 4,
            alpha: 1, c: color
        });
    }
}

function loop(time) {
    let dt = (time - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = time;

    if (state === 'PLAY') {
        let travelThisFrame = currentSpeed * dt;

        if (breakingBlock) {
            currentSpeed = 0;
            breakTimer -= dt;
            if (breakTimer <= 0) {
                snakeLength--;
                breakingBlock.value--;
                breakingBlock.hitScale = 0.8;
                score += 1; // Block breaking reduced to +1 bonus
                scoreEl.innerText = score;
                sfxBreak();

                spawnParticles(snakeHeadX, SNAKE_Y - BALL_R, getBlockColor(breakingBlock.value), 8);

                if (snakeLength <= 0) {
                    die();
                } else if (breakingBlock.value <= 0) {
                    breakingBlock.alpha = 0;
                    breakingBlock = null;
                    currentSpeed = BASE_SPEED;
                } else {
                    breakTimer = 0.08;
                }
            }
        } else {
            currentSpeed = BASE_SPEED;
        }

        if (currentSpeed > 0) {
            distanceTravelled += travelThisFrame;

            if (distanceTravelled > nextSpawnDist) {
                spawnRow();
                nextSpawnDist = distanceTravelled + H * 0.35 + Math.random() * H * 0.2;
            }
        }

        let moveY = currentSpeed * dt;
        for (let b of blocks) b.y += moveY;
        for (let p of pickups) p.y += moveY;
        for (let w of walls) w.y += moveY;

        let abstractSpeed = travelThisFrame + (Math.abs(lastDragDelta) * 0.5);
        pathDistance += abstractSpeed > 0 ? abstractSpeed : 50 * dt;
        lastDragDelta = 0;

        snakeHistory.push({ x: snakeHeadX, dist: pathDistance });
        if (snakeHistory.length > MAX_HISTORY) snakeHistory.shift();

        if (!breakingBlock) {
            const bounds = getBounds(snakeHeadX);
            let leftWall = bounds.left, rightWall = bounds.right;

            for (let i = pickups.length - 1; i >= 0; i--) {
                let p = pickups[i];
                let px = p.col * COL_W + COL_W / 2;
                let dist = Math.hypot(px - snakeHeadX, p.y - SNAKE_Y);
                if (dist < COL_W / 2) {
                    snakeLength += p.value;
                    sfxPick();
                    spawnParticles(px, p.y, '#00f2fe', 15);
                    pickups.splice(i, 1);
                }
            }

            for (let b of blocks) {
                if (b.alpha <= 0) continue;
                let bx = b.col * COL_W;
                let by = b.y;
                let bw = COL_W - 4;
                let bh = COL_W - 4;
                bx += 2; by += 2;

                if (snakeHeadX + BALL_R > bx && snakeHeadX - BALL_R < bx + bw &&
                    SNAKE_Y - BALL_R < by + bh && SNAKE_Y + BALL_R > by) {

                    if (SNAKE_Y > by + bh - BALL_R * 2 && snakeHeadX > bx && snakeHeadX < bx + bw) {
                        breakingBlock = b;
                        breakTimer = 0;
                        break;
                    }

                    if (snakeHeadX < bx) rightWall = Math.min(rightWall, bx - BALL_R * 2);
                    if (snakeHeadX > bx + bw) leftWall = Math.max(leftWall, bx + bw + BALL_R * 2);
                }
            }

            if (snakeHeadX < BALL_R) snakeHeadX = BALL_R;
            if (snakeHeadX > W - BALL_R) snakeHeadX = W - BALL_R;
            if (snakeHeadX < leftWall) snakeHeadX = leftWall;
            if (snakeHeadX > rightWall) snakeHeadX = rightWall;
        }

        blocks = blocks.filter(b => b.y < H + 100 && b.alpha > 0);
        pickups = pickups.filter(p => p.y < H + 100);
        walls = walls.filter(w => w.y < H + 100);
    }

    for (let b of blocks) {
        if (b.hitScale < 1) b.hitScale += dt * 2;
        if (b.hitScale > 1) b.hitScale = 1;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= 2 * dt;
        if (p.alpha <= 0) particles.splice(i, 1);
    }

    draw();

    if (state !== 'START') {
        requestAnimationFrame(loop);
    }
}

let lastDragDelta = 0;
function moveHead(deltaX) {
    if (state !== 'PLAY' || breakingBlock) return;

    let targetX = snakeHeadX + deltaX * 1.5;
    const bounds = getBounds(snakeHeadX);

    // Clamp to boundaries found at current X
    snakeHeadX = Math.max(bounds.left, Math.min(bounds.right, targetX));

    lastDragDelta = deltaX;
}

function getBounds(currentX) {
    let left = BALL_R, right = W - BALL_R;

    for (let w of walls) {
        let lineX = (w.colStart + 1) * COL_W;
        // Check if wall is active at snake's Y height
        if (SNAKE_Y > w.y && SNAKE_Y < w.y + w.h) {
            if (currentX < lineX) right = Math.min(right, lineX - BALL_R);
            if (currentX > lineX) left = Math.max(left, lineX + BALL_R);
        }
    }

    // Also check blocks as obstacles for side-movement
    for (let b of blocks) {
        if (b.alpha <= 0) continue;
        let bx = b.col * COL_W;
        let by = b.y;
        let bw = COL_W, bh = COL_W;
        if (SNAKE_Y > by && SNAKE_Y < by + bh) {
            if (currentX < bx) right = Math.min(right, bx - BALL_R);
            if (currentX > bx + bw) left = Math.max(left, bx + bw + BALL_R);
        }
    }

    return { left, right };
}

window.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON') return;
    if (!audioCtx && AudioContext) audioCtx = new AudioContext();
    isDragging = true; startDragX = e.clientX;
});
window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    moveHead(e.clientX - startDragX);
    startDragX = e.clientX;
});
window.addEventListener('mouseup', () => isDragging = false);

window.addEventListener('touchstart', e => {
    if (e.target.tagName !== 'BUTTON') e.preventDefault();
    if (!audioCtx && AudioContext) audioCtx = new AudioContext();
    isDragging = true; startDragX = e.touches[0].clientX;
}, { passive: false });
window.addEventListener('touchmove', e => {
    if (!isDragging) return;
    moveHead(e.touches[0].clientX - startDragX);
    startDragX = e.touches[0].clientX;
});
window.addEventListener('touchend', () => isDragging = false);

function getHistoryPos(targetDist) {
    if (!snakeHistory.length) return { x: snakeHeadX, y: SNAKE_Y };

    for (let i = snakeHistory.length - 1; i >= 0; i--) {
        if (snakeHistory[i].dist <= targetDist) {
            return { x: snakeHistory[i].x, y: SNAKE_Y + (pathDistance - targetDist) };
        }
    }
    return { x: snakeHistory[0].x, y: SNAKE_Y + (pathDistance - targetDist) };
}

function drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#07090f';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 5; i++) {
        ctx.moveTo(i * COL_W, 0);
        ctx.lineTo(i * COL_W, H);
    }
    ctx.stroke();

    ctx.strokeStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 15;
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    for (let w of walls) {
        ctx.beginPath();
        let wx = (w.colStart + 1) * COL_W;
        ctx.moveTo(wx, w.y);
        ctx.lineTo(wx, w.y + w.h);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + (COL_W * 0.4) + 'px Teko';

    for (let b of blocks) {
        if (b.alpha <= 0) continue;
        let bx = b.col * COL_W + 2;
        let by = b.y + 2;
        let bw = COL_W - 4;
        let bh = COL_W - 4;

        let cx = bx + bw / 2;
        let cy = by + bh / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(b.hitScale, b.hitScale);

        let bcolor = getBlockColor(b.value);
        ctx.fillStyle = bcolor + '33';
        ctx.strokeStyle = bcolor;
        ctx.lineWidth = 3;
        ctx.shadowColor = bcolor;
        ctx.shadowBlur = 10;

        drawRoundRect(ctx, -bw / 2, -bh / 2, bw, bh, 10);

        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.fillText(b.value, 0, 5);

        ctx.restore();
    }

    for (let p of pickups) {
        let px = p.col * COL_W + COL_W / 2;
        ctx.beginPath();
        ctx.arc(px, p.y, COL_W * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 242, 254, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '700 ' + (COL_W * 0.3) + 'px Teko';
        ctx.fillText(p.value, px, p.y + 2);
    }

    if (state !== 'DEAD') {
        ctx.beginPath();
        ctx.arc(snakeHeadX, SNAKE_Y, BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = '#00f2fe';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 15;
        ctx.fill();

        let drawnLength = Math.min(snakeLength, 20);
        for (let i = 1; i < drawnLength; i++) {
            let pos = getHistoryPos(pathDistance - i * GAP_Y);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, BALL_R * 0.8, 0, Math.PI * 2);
            ctx.globalAlpha = 1 - (i / 30);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff';
        ctx.font = '700 ' + (BALL_R * 2) + 'px Teko';
        ctx.fillText(snakeLength, snakeHeadX, SNAKE_Y - BALL_R - 15);
    }

    for (let p of particles) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

NeonMenu.init({
    onStart: initGame,
    onRestart: initGame
}).then(() => {
    NeonMenu.showStart();
});


draw();
