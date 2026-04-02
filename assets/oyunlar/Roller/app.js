// ─── Difficulty ────────────────────────────────────────────────
let _DIFF = (window.NEON && window.NEON.getDiff()) || { speed:1, density:1 };
const _sfx  = (window.NEON && window.NEON.sfx)     || {};

let camera, scene, renderer;
let dpr = window.devicePixelRatio || 1;

let gameStarted = false;
let gameOver = false;
let score = 0;
let bestScore = parseInt(localStorage.getItem('neonroller_best') || '0');

const scoreDisplay = document.getElementById('score-display');

NeonMenu.init({
    onStart: startGame,
    onRestart: startGame
}).then(() => {
    NeonMenu.showStart();
});


// ── Constants ────────────────────────────────────────────────
const COLS = 7;
const TILE_W = 2;
const TILE_H = 0.4;
const TILE_D = 2;
const LANE_W = COLS * TILE_W;
const BALL_R = 0.5;
const GRAVITY = 35;
let BASE_SPEED  = 18 * _DIFF.speed;   // scaled by difficulty
const CHUNK_LEN   = 30;
const LOOK_AHEAD_CHUNKS = 4;
const PURGE_BEHIND = 3;
// Danger tile probability per tile (approx 30% * density)
const DANGER_CHANCE = Math.min(0.55, 0.3 * _DIFF.density);

// ── Materials ────────────────────────────────────────────────
const MAT_FLOOR = new THREE.MeshLambertMaterial({ color: 0x0077aa, emissive: 0x003355, emissiveIntensity: 0.5 });
const MAT_DANGER = new THREE.MeshLambertMaterial({ color: 0xff0844, emissive: 0x880022, emissiveIntensity: 0.6 });
const MAT_BORDER = new THREE.MeshLambertMaterial({ color: 0x9b59b6, emissive: 0x4a235a, emissiveIntensity: 0.4 });
const GEO_TILE = new THREE.BoxGeometry(TILE_W - 0.1, TILE_H, TILE_D - 0.1);
const GEO_BLOCK = new THREE.BoxGeometry(TILE_W - 0.1, 1.4, TILE_D - 0.1);
const GEO_BORDER = new THREE.BoxGeometry(0.3, 2, TILE_D - 0.1);
const GEO_BALL = new THREE.SphereGeometry(BALL_R, 24, 24);
const MAT_BALL = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00ccff, emissiveIntensity: 0.8 });

// ── Game state ────────────────────────────────────────────────
let ball;
let ballX = 0, ballY = 2, ballZ = 0;
let velY = 0;
let currentSpeed = BASE_SPEED;
let lastTime = 0;

let chunkPool = []; // active chunks [{zStart, group, tiles:[{x,y,z,isDanger}]}]
let nextChunkZ = 0;
let chunksSpawned = 0;

let dragX = 0; // accumulated drag this frame
let pointerActive = false;
let lastPointerX = 0;
let steerVelocity = 0; // smooth horizontal velocity

let particles = [];

// ── Audio ─────────────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function ensureAudio() {
    if (!audioCtx && AudioCtx) audioCtx = new AudioCtx();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function sfxJump() {
    if (!audioCtx) return;
    let o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(300, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    g.gain.setValueAtTime(0.2, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.2);
}
function sfxDie() {
    if (!audioCtx) return;
    let o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(200, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.6);
    g.gain.setValueAtTime(0.4, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.65);
}

// ── Three.js init ─────────────────────────────────────────────
function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06020c, 0.03);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x06020c);
    document.getElementById('game-container').appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    let dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 10, 5);
    scene.add(dir);
    let pinkLight = new THREE.PointLight(0xff00ff, 2, 60);
    pinkLight.position.set(-10, 5, 0);
    scene.add(pinkLight);

    ball = new THREE.Mesh(GEO_BALL, MAT_BALL);
    scene.add(ball);
    let ballLight = new THREE.PointLight(0x00ccff, 2, 15);
    ball.add(ballLight);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchstart', onTouchDown, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);

    resetGame();
    renderer.setAnimationLoop(loop);
}

// ── Input ──────────────────────────────────────────────────────
function onDown(e) {
    if (e.target.tagName === 'BUTTON') return;
    ensureAudio();
    pointerActive = true;
    lastPointerX = e.clientX;
}
function onMove(e) {
    if (!pointerActive) return;
    dragX += (e.clientX - lastPointerX);
    lastPointerX = e.clientX;
}
function onUp() { pointerActive = false; }
function onTouchDown(e) {
    if (e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    ensureAudio();
    pointerActive = true;
    lastPointerX = e.touches[0].clientX;
}
function onTouchMove(e) {
    if (!pointerActive) return;
    e.preventDefault();
    dragX += (e.touches[0].clientX - lastPointerX);
    lastPointerX = e.touches[0].clientX;
}

// ── Chunk generation ───────────────────────────────────────────
function makeChunk(zStart, index) {
    let group = new THREE.Group();
    let tiles = [];

    let numRows = CHUNK_LEN;
    for (let row = 0; row < numRows; row++) {
        let zCenter = zStart - row * TILE_D - TILE_D * 0.5;

        // Full floor row always
        for (let col = 0; col < COLS; col++) {
            let xCenter = (col - (COLS - 1) / 2) * TILE_W;
            let yTop = -TILE_H / 2; // top face at y=0

            let tile = new THREE.Mesh(GEO_TILE, MAT_FLOOR);
            tile.position.set(xCenter, yTop, zCenter);
            group.add(tile);
            tiles.push({ x: xCenter, y: 0, z: zCenter, w: TILE_W, d: TILE_D, isDanger: false });
        }

        // Left/right border walls
        [-1, 1].forEach(side => {
            let wx = side * (LANE_W / 2 + 0.15);
            let border = new THREE.Mesh(GEO_BORDER, MAT_BORDER);
            border.position.set(wx, 1, zCenter);
            group.add(border);
        });

        // Danger obstacle blocks (only after intro)
        if (index > 0 && row > 2 && Math.random() < 0.25) {
            let numBlocks = Math.random() < 0.2 ? 2 : 1;
            let usedCols = new Set();
            for (let b = 0; b < numBlocks; b++) {
                let col;
                let tries = 0;
                do { col = Math.floor(Math.random() * COLS); tries++; } while (usedCols.has(col) && tries < 10);
                usedCols.add(col);
                let xCenter = (col - (COLS - 1) / 2) * TILE_W;
                let block = new THREE.Mesh(GEO_BLOCK, MAT_DANGER);
                block.position.set(xCenter, 0.7 + TILE_H / 2, zCenter);
                group.add(block);
                // dangerous tile overrides
                tiles.push({ x: xCenter, y: 1.4 + TILE_H, z: zCenter, w: TILE_W * 0.9, d: TILE_D * 0.9, isDanger: true });
            }
        }
    }

    scene.add(group);
    return { zStart, zEnd: zStart - numRows * TILE_D, group, tiles, index };
}

function spawnChunks() {
    while (chunkPool.length === 0 || chunkPool[chunkPool.length - 1].zEnd > ballZ - CHUNK_LEN * TILE_D * LOOK_AHEAD_CHUNKS) {
        let zStart = nextChunkZ;
        chunkPool.push(makeChunk(zStart, chunksSpawned));
        nextChunkZ -= CHUNK_LEN * TILE_D;
        chunksSpawned++;
    }
}

function purgeChunks() {
    while (chunkPool.length > 0 && chunkPool[0].zStart > ballZ + CHUNK_LEN * TILE_D * PURGE_BEHIND) {
        let old = chunkPool.shift();
        scene.remove(old.group);
    }
}

// ── Reset ──────────────────────────────────────────────────────
function resetGame() {
    chunkPool.forEach(c => scene.remove(c.group));
    chunkPool = [];
    nextChunkZ = 20; // start chunks AHEAD of ball so z=18 is covered
    chunksSpawned = 0;
    particles = [];

    ballX = 0; ballY = 2; ballZ = 18; // ball well inside first chunk
    velY = 0;
    currentSpeed = BASE_SPEED;
    steerVelocity = 0;
    dragX = 0;
    score = 0;
    updateScoreUI();

    spawnChunks();

    ball.position.set(ballX, ballY, ballZ);
    camera.position.set(0, 4, ballZ + 9);
    camera.lookAt(0, 0, ballZ - 5);
}

function startGame() {
            scoreDisplay.classList.add('visible');

    if (gameOver) resetGame();

    gameStarted = true;
    gameOver = false;
    lastTime = performance.now();
}

function updateScoreUI() {
    scoreDisplay.innerText = score + 'm';
}

function endGame() {
    gameOver = true;
    gameStarted = false;
    scoreDisplay.classList.remove('visible');
    sfxDie();

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('neonroller_best', bestScore);
    }
    NeonMenu.showGameOver(score, bestScore);
}

// ── Physics & Collision ────────────────────────────────────────
function physicsStep(dt) {
    // Horizontal steering
    let steerInput = dragX * 0.06;
    dragX = 0;
    if (!pointerActive) steerInput *= 0.5;

    steerVelocity += steerInput;
    steerVelocity *= 0.7; // friction

    ballX += steerVelocity;

    // Clamp to track
    let halfLane = (LANE_W / 2) - BALL_R;
    if (ballX < -halfLane) { ballX = -halfLane; steerVelocity = 0; }
    if (ballX > halfLane) { ballX = halfLane; steerVelocity = 0; }

    // Forward movement
    ballZ -= currentSpeed * dt;

    // Gravity
    velY -= GRAVITY * dt;
    ballY += velY * dt;

    // Collision: find highest platform under ball
    let groundY = -999;
    let onDanger = false;

    for (let chunk of chunkPool) {
        if (ballZ + BALL_R < chunk.zEnd || ballZ - BALL_R > chunk.zStart) continue;

        for (let t of chunk.tiles) {
            // XZ overlap check
            if (ballX + BALL_R * 0.7 < t.x - t.w / 2) continue;
            if (ballX - BALL_R * 0.7 > t.x + t.w / 2) continue;
            if (ballZ + BALL_R * 0.7 < t.z - t.d / 2) continue;
            if (ballZ - BALL_R * 0.7 > t.z + t.d / 2) continue;

            if (t.isDanger) {
                // If ball is about to land on it from above
                if (ballY - BALL_R <= t.y + 0.1) {
                    onDanger = true;
                }
                continue;
            }

            // Solid tile — track highest
            if (t.y > groundY) groundY = t.y;
        }
    }

    if (groundY > -999 && ballY - BALL_R <= groundY + 0.15) {
        if (velY < 0) velY = 0;
        ballY = groundY + BALL_R;
        if (onDanger) endGame();
    } else if (onDanger && ballY - BALL_R <= 1.5) {
        endGame();
    }

    // Fell off
    if (ballY < -6) endGame();
}

function spawnParticle(x, y, z) {
    for (let i = 0; i < 6; i++) {
        let angle = Math.random() * Math.PI * 2;
        particles.push({
            x, y, z,
            vx: Math.cos(angle) * (1 + Math.random() * 2),
            vy: 2 + Math.random() * 3,
            vz: Math.sin(angle) * (1 + Math.random() * 2),
            life: 1,
            mesh: (() => {
                let m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
                m.position.set(x, y, z);
                scene.add(m);
                return m;
            })()
        });
    }
}

// ── Main loop ──────────────────────────────────────────────────
function loop(time) {
    let dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    if (gameStarted && !gameOver) {
        physicsStep(dt);
        spawnChunks();
        purgeChunks();

        currentSpeed += dt * 0.4; // accelerate slowly

        let newScore = Math.max(0, Math.floor(-ballZ / 5));
        if (newScore > score) score = newScore;
        updateScoreUI();

        // Smooth camera follow
        let camTargetX = ballX * 0.4;
        let camTargetY = ballY + 3.5;
        let camTargetZ = ballZ + 8;
        camera.position.x += (camTargetX - camera.position.x) * 8 * dt;
        camera.position.y += (camTargetY - camera.position.y) * 8 * dt;
        camera.position.z += (camTargetZ - camera.position.z) * 10 * dt;
        camera.lookAt(ballX * 0.2, ballY, ballZ - 8);

        ball.position.set(ballX, ballY, ballZ);
        ball.rotation.x -= (currentSpeed * dt) / BALL_R;
        ball.rotation.z -= (steerVelocity * 0.3) / BALL_R;
    }

    if (gameOver) {
        velY -= GRAVITY * dt;
        ballY += velY * dt;
        ball.position.set(ballX, ballY, ballZ);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.life -= dt * 2;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.vy -= 10 * dt;
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.material.opacity = Math.max(0, p.life);
        if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    }

    renderer.render(scene, camera);
}

init();
