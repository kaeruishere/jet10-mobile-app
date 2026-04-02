// ─── Difficulty ────────────────────────────────────────────────
let _DIFF = (window.NEON && window.NEON.getDiff()) || { speed:1, density:1 };

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let width, height;

let dpr = window.devicePixelRatio || 1;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
}
window.addEventListener('resize', () => { resize(); if(state==='START') draw(window.innerHeight * 0.7); });
resize();

const scoreDisplay = document.getElementById('score-display');
const perfectDisplay = document.getElementById('perfect-display');

let bestScore = localStorage.getItem('tarzan_best_score') || 0;

let state = 'START'; 
let score = 0;
let platforms = [];
let character = { x: 0, y: 0, width: 20, height: 30 };
let stick = { length: 0, angle: 0, x: 0 };
let cameraX = 0;
let targetCameraX = 0;

let lastTime = performance.now();

const PLATFORM_Y = window.innerHeight * 0.7; 
const MIN_GAP = 40;
const MAX_GAP = 180;
const MIN_WIDTH = 30;
const MAX_WIDTH = 100;
let GROW_SPEED = 300 * _DIFF.speed; 
const FALL_SPEED = Math.PI * 2.0; 
const WALK_SPEED = 220; 
let TRANSFORM_SPEED = 400 * _DIFF.speed; 
const PERFECT_AREA_WIDTH = 12 / _DIFF.density;
const STICK_WIDTH = 4;

function generatePlatform(xOffset) {
    const w = Math.random() * (MAX_WIDTH - MIN_WIDTH) + MIN_WIDTH;
    return {
        x: xOffset,
        w: w,
        perfectCenter: xOffset + w / 2,
        color: `hsl(${Math.random() * 360}, 60%, 50%)`
    };
}

function initGame() {
    score = 0;
    scoreDisplay.innerText = score;
    platforms = [];
    
    let startPlat = generatePlatform(0);
    startPlat.w = 100;
    startPlat.perfectCenter = 50;
    platforms.push(startPlat);
    
    platforms.push(generatePlatform(startPlat.x + startPlat.w + Math.random() * (MAX_GAP - MIN_GAP) + MIN_GAP));
    
    character.x = platforms[0].x + platforms[0].w - character.width - 5;
    character.y = height * 0.7 - character.height;
    
    stick.length = 0;
    stick.angle = -Math.PI / 2;
    stick.x = platforms[0].x + platforms[0].w;
    
    cameraX = 0;
    targetCameraX = 0;
    
            scoreDisplay.classList.add('visible');
    
    state = 'WAITING';
    lastTime = performance.now();
    requestAnimationFrame(update);
}

function startGrow(e) {
    if(e.target.tagName === 'BUTTON') return;
    if (state === 'WAITING') {
        state = 'GROWING';
    }
}

function stopGrow(e) {
    if (state === 'GROWING') {
        state = 'FALLING';
    }
}

window.addEventListener('mousedown', startGrow);
window.addEventListener('touchstart', startGrow, {passive: false});
window.addEventListener('mouseup', stopGrow);
window.addEventListener('touchend', stopGrow);

let deathVelocityY = 0;

function showPerfect() {
    perfectDisplay.classList.add('show');
    setTimeout(() => {
        perfectDisplay.classList.remove('show');
    }, 800);
}

function update(time) {
    let dt = (time - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = time;
    
    const platY = height * 0.7;

    switch (state) {
        case 'GROWING':
            stick.length += GROW_SPEED * dt;
            break;
            
        case 'FALLING':
            stick.angle += FALL_SPEED * dt;
            if (stick.angle >= 0) { 
                stick.angle = 0;
                state = 'WALKING';
            }
            break;
            
        case 'WALKING':
            character.x += WALK_SPEED * _DIFF.speed * dt;
            const stickEnd = stick.x + stick.length;
            const nextPlatform = platforms[1];
            
            // Walk until we reach the end of the stick (centered on character)
            if (character.x >= stickEnd - character.width / 2) {
                // We reached the tip of the stick!
                // CHECK: Is the tip on the platform?
                const onPlatform = (stickEnd >= nextPlatform.x && stickEnd <= nextPlatform.x + nextPlatform.w);
                
                if (onPlatform) {
                    // Safe! Snap to platform right edge or just stop walking and proceed
                    character.x = Math.min(character.x, nextPlatform.x + nextPlatform.w - character.width - 5);
                    state = 'TRANSITIONING';
                    
                    let points = 1;
                    if (Math.abs(stickEnd - nextPlatform.perfectCenter) <= PERFECT_AREA_WIDTH / 2) {
                        points = 2;
                        showPerfect();
                    }
                    score += points;
                    scoreDisplay.innerText = score;
                    
                    platforms.push(generatePlatform(nextPlatform.x + nextPlatform.w + Math.random() * (MAX_GAP - MIN_GAP) + MIN_GAP));
                    targetCameraX = nextPlatform.x - 50; 
                } else {
                    // Fell off!
                    character.x = stickEnd - character.width / 2; // Snap to tip
                    state = 'DEAD';
                    deathVelocityY = 0;
                }
            }
            break;
            
        case 'TRANSITIONING':
            let moveAmount = TRANSFORM_SPEED * dt;
            if (cameraX < targetCameraX) {
                cameraX += moveAmount;
                if (cameraX >= targetCameraX) {
                    cameraX = targetCameraX;
                    platforms.shift(); 
                    stick.length = 0;
                    stick.angle = -Math.PI / 2;
                    stick.x = platforms[0].x + platforms[0].w;
                    state = 'WAITING';
                }
            } else {
                cameraX = targetCameraX;
                platforms.shift(); 
                stick.length = 0;
                stick.angle = -Math.PI / 2;
                stick.x = platforms[0].x + platforms[0].w;
                state = 'WAITING';
            }
            break;
            
        case 'DEAD':
            character.y += deathVelocityY * dt;
            deathVelocityY += 1500 * dt; 
            if (character.y > height + 200) {
                endGame();
                return; 
            }
            break;
    }
    
    if(state === 'DEAD') {
       const stickEnd = stick.x + stick.length;
       const nextPlatform = platforms[1];
       if (stickEnd < nextPlatform.x || stickEnd > nextPlatform.x + nextPlatform.w) {
            stick.angle += FALL_SPEED * dt; 
       }
    }
    
    draw(platY);
    
    if (state !== 'START' && state !== 'END') {
        requestAnimationFrame(update);
    }
}

function draw(platY) {
    ctx.clearRect(0, 0, width, height);
    
    let bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(-cameraX, 0);
    
    platforms.forEach(p => {
        ctx.fillStyle = p.color || '#333';
        ctx.fillRect(p.x, platY, p.w, height - platY);
        
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(p.x, platY, p.w, 4);
        
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(p.perfectCenter - PERFECT_AREA_WIDTH/2, platY, PERFECT_AREA_WIDTH, 4);
    });
    
    if (state !== 'START' && state !== 'END') {
        ctx.save();
        ctx.translate(stick.x, platY);
        ctx.rotate(stick.angle);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, -STICK_WIDTH/2, stick.length, STICK_WIDTH);
        ctx.restore();
    }
    
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.roundRect(character.x, state === 'DEAD' ? character.y : platY - character.height, character.width, character.height, 4);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(character.x + character.width - 5, (state === 'DEAD' ? character.y : platY - character.height) + 8, 3, 0, Math.PI*2);
    ctx.fill();
    
    ctx.restore();
}

function endGame() {
    state = 'END';
    scoreDisplay.classList.remove('visible');
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('tarzan_best_score', bestScore);
    }
    
    NeonMenu.showGameOver(score, bestScore);
}

NeonMenu.init({
    onStart: initGame,
    onRestart: initGame
}).then(() => {
    NeonMenu.showStart();
});


draw(window.innerHeight * 0.7);
