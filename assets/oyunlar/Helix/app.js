// ─── Difficulty ────────────────────────────────────────────────
let _DIFF = (window.NEON && window.NEON.getDiff()) || { speed:1, density:1 };

let camera, scene, renderer;
let dirLight, purpleLight;
let pivot;
let ball;
let lastTime;

let dpr = window.devicePixelRatio || 1;

let isDragging = false;
let previousMouseX = 0;

let gameStarted = false;
let gameOver = false;
let score = 0;
let bestScore = localStorage.getItem('neonhelix_best') || 0;

const scoreDisplay = document.getElementById('score-display');

NeonMenu.init({
    onStart: startGame,
    onRestart: startGame
}).then(() => {
    NeonMenu.showStart();
});


const PLATFORM_Y_DIST = 6;
const PILLAR_RADIUS = 1.2;
const RING_RADIUS_OUTER = 4;
const BALL_RADIUS = 0.4;
let GRAVITY = 30 * _DIFF.speed;
const BOUNCE_FORCE = 12 * Math.sqrt(_DIFF.speed);

let platforms = [];
let ballVy = 0;
let currentPlatformIndex = 0;

function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0c10, 0.02);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.set(0, 8, 16);
    camera.lookAt(0, 3, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x0b0c10, 1);
    document.getElementById('game-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    
    purpleLight = new THREE.PointLight(0xb224ef, 3, 50);
    purpleLight.position.set(-5, -5, 5);
    scene.add(purpleLight);

    window.addEventListener('resize', onWindowResize, false);
    
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('touchstart', onTouchStart, {passive: false});
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, {passive: false});
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onMouseUp);

    createBall();
    resetGame();
    
    renderer.setAnimationLoop(animation);
}

function onMouseDown(e) {
    if(e.target.tagName === 'BUTTON') return;
    isDragging = true;
    previousMouseX = e.clientX;
}
function onTouchStart(e) {
    if(e.target.tagName !== 'BUTTON') e.preventDefault();
    isDragging = true;
    previousMouseX = e.touches[0].clientX;
}
function onMouseMove(e) {
    if(!isDragging || !gameStarted || gameOver) return;
    let deltaX = e.clientX - previousMouseX;
    pivot.rotation.y += deltaX * 0.01;
    previousMouseX = e.clientX;
}
function onTouchMove(e) {
    if(!isDragging || !gameStarted || gameOver) return;
    e.preventDefault();
    let deltaX = e.touches[0].clientX - previousMouseX;
    pivot.rotation.y += deltaX * 0.01;
    previousMouseX = e.touches[0].clientX;
}
function onMouseUp() {
    isDragging = false;
}

function createBall() {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x00f2fe,
        emissive: 0x00f2fe,
        emissiveIntensity: 0.5,
        roughness: 0.2
    });
    ball = new THREE.Mesh(geometry, material);
    scene.add(ball);
}

function generatePlatform(yLevel, index) {
    let slices = [];
    let gapAngle = Math.random() * Math.PI * 2;
    let gapSize = (Math.PI / 2) / _DIFF.density; // smaller gap for higher density
    if (index === 0) gapSize = Math.PI * 0.8; 
    
    let totalSolid = Math.PI * 2 - gapSize;
    
    let dangerSize = Math.random() < 0.5 * _DIFF.density ? (Math.PI / 4) * _DIFF.density : 0; 
    if(index === 0) dangerSize = 0; 
    
    let slicesData = [];
    
    if (dangerSize > 0) {
        let safeSize = totalSolid - dangerSize;
        slicesData.push({ start: gapAngle + gapSize, length: safeSize, isDanger: false });
        slicesData.push({ start: gapAngle + gapSize + safeSize, length: dangerSize, isDanger: true });
    } else {
        slicesData.push({ start: gapAngle + gapSize, length: totalSolid, isDanger: false });
    }
    
    let platGroup = new THREE.Group();
    platGroup.position.y = yLevel;
    
    for(let sd of slicesData) {
        let geom = new THREE.RingGeometry(PILLAR_RADIUS, RING_RADIUS_OUTER, 30, 1, sd.start, sd.length);
        geom.rotateX(-Math.PI / 2);
        
        let mat = new THREE.MeshLambertMaterial({
            color: sd.isDanger ? 0xff0844 : (index % 2 === 0 ? 0x00f2fe : 0x4facfe),
            emissive: sd.isDanger ? 0xaa0000 : 0x003355,
            emissiveIntensity: sd.isDanger ? 0.6 : 0.4,
            side: THREE.DoubleSide
        });
        
        let mesh = new THREE.Mesh(geom, mat);
        platGroup.add(mesh);
        
        slices.push({
            start: sd.start,
            end: sd.start + sd.length,
            isDanger: sd.isDanger
        });
    }
    
    pivot.add(platGroup);
    
    return {
        y: yLevel,
        group: platGroup,
        slices: slices,
        passed: false
    };
}

function resetGame() {
    if(pivot) scene.remove(pivot);
    
    pivot = new THREE.Group();
    scene.add(pivot);
    
    const pillarGeom = new THREE.CylinderGeometry(PILLAR_RADIUS, PILLAR_RADIUS, PLATFORM_Y_DIST * 80, 32);
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const pillarMesh = new THREE.Mesh(pillarGeom, pillarMat);
    pillarMesh.position.y = -PLATFORM_Y_DIST * 35;
    pivot.add(pillarMesh);
    
    platforms = [];
    
    for(let i=0; i<80; i++) {
        platforms.push(generatePlatform(-i * PLATFORM_Y_DIST, i));
    }
    
    ball.position.set(0, 5, RING_RADIUS_OUTER - BALL_RADIUS - 0.5);
    ballVy = 0;
    
    pivot.position.y = 0;
    pivot.rotation.y = 0;
    
    if(camera) camera.position.set(0, 8, 16);
    if(dirLight) dirLight.position.set(5, 10, 7);
    if(purpleLight) purpleLight.position.set(-5, -5, 5);
    
    currentPlatformIndex = 0;
    score = 0;
    updateScoreUI();
}

function startGame() {
            scoreDisplay.classList.add('visible');
    
    if(gameOver) resetGame();
    
    gameStarted = true;
    gameOver = false;
    lastTime = performance.now();
}

function updateScoreUI() {
    scoreDisplay.innerText = score;
}

function checkCollision(prevY, currY) {
    if(currentPlatformIndex >= platforms.length) return;
    
    let plat = platforms[currentPlatformIndex];
    let absPlatY = plat.y + pivot.position.y;
    
    let bottomPrev = prevY - BALL_RADIUS;
    let bottomCurr = currY - BALL_RADIUS;
    
    if (bottomPrev >= absPlatY && bottomCurr <= absPlatY) {
        
        let hitAngleRaw = (3 * Math.PI / 2) - pivot.rotation.y;

        let hitType = 'gap'; 
        
        for(let s of plat.slices) {
            for(let k = -10; k <= 10; k++) {
                let testAngle = hitAngleRaw + k * Math.PI * 2;
                if (testAngle >= s.start - 0.05 && testAngle <= s.end + 0.05) {
                    hitType = s.isDanger ? 'danger' : 'safe';
                    break;
                }
            }
            if(hitType !== 'gap') break;
        }
        
        if (hitType === 'safe') {
            ballVy = BOUNCE_FORCE;
            ball.position.y = absPlatY + BALL_RADIUS;
            ball.scale.set(1.2, 0.8, 1.2);
            setTimeout(()=> ball.scale.set(1,1,1), 100);
        } else if (hitType === 'danger') {
            endGame();
        }
    }
    
    if (ball.position.y < absPlatY) {
        score++;
        updateScoreUI();
        currentPlatformIndex++;
    }
}

function endGame() {
    gameOver = true;
    gameStarted = false;
    scoreDisplay.classList.remove('visible');
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('neonhelix_best', bestScore);
    }
    
    NeonMenu.showGameOver(score, bestScore);
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animation(time) {
    let dt = (time - lastTime) / 1000;
    if(dt > 0.1) dt = 0.1;
    lastTime = time;

    if (gameStarted && !gameOver) {
        ballVy -= GRAVITY * dt;
        let prevY = ball.position.y;
        ball.position.y += ballVy * dt;
        
        checkCollision(prevY, ball.position.y);
        
        let targetCamY = ball.position.y + 3; 
        if (targetCamY < camera.position.y) {
            let diff = targetCamY - camera.position.y;
            camera.position.y += diff * 10 * dt;
            if(dirLight) dirLight.position.y = camera.position.y + 2;
            if(purpleLight) purpleLight.position.y = camera.position.y - 13;
        }
        
        let hue = ((score * 10) % 360) / 360;
        scene.fog.color.setHSL(hue, 0.5, 0.05);
        renderer.setClearColor(scene.fog.color);
    }

    if (gameOver) {
        ballVy -= GRAVITY * dt;
        ball.position.y += ballVy * dt;
    }

    renderer.render(scene, camera);
}

init();
