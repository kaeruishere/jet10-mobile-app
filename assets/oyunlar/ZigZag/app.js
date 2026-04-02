// ─── Difficulty ────────────────────────────────────────────────
let _DIFF = (window.NEON && window.NEON.getDiff()) || { speed: 1, density: 1 };

let camera, scene, renderer;
let lastTime;
let gameStarted = false;
let gameOver = false;
let score = 0;
let bestScore = localStorage.getItem('zigzag_best_score') || 0;

let ball;
let path = [];
let dir = 'x'; // 'x' or 'z'
let speed = 4.0 * _DIFF.speed;
const TILE_SIZE = 2;
const MathTolerance = TILE_SIZE / 2;
const GRAVITY = -15;
let ballVelY = 0;
let isFalling = false;

const scoreDisplay = document.getElementById('score-display');

NeonMenu.init({
    onStart: startGame,
    onRestart: startGame
}).then(() => {
    NeonMenu.showStart();
});


window.addEventListener('pointerdown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    if (gameStarted && !gameOver && !isFalling) {
        changeDirection();
    }
});
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameStarted && !gameOver && !isFalling) {
        changeDirection();
    }
});

function init() {
    scene = new THREE.Scene();

    // Linear fog: starts clear, fades in distance
    // Near 25 = clear around ball (dist to camera is ~34)
    // Far 70 = objects ~35 units ahead of ball are visible
    const fogFar = 50 / _DIFF.density;
    const fogNear = 10;
    scene.fog = new THREE.Fog(0x0f172a, fogNear, fogFar);

    const aspect = window.innerWidth / window.innerHeight;
    const d = 15;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, -100, 1000);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x0f172a, 1);
    document.getElementById('game-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(-10, 20, -10);
    scene.add(dirLight);

    window.addEventListener('resize', onWindowResize, false);

    createBall();
    resetGame();

    renderer.setAnimationLoop(animation);
}

function createBall() {
    const geometry = new THREE.SphereGeometry(0.6, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 100,
        specular: 0x555555
    });
    ball = new THREE.Mesh(geometry, material);
    scene.add(ball);
}

function generateInitialPath() {
    for (let i = 0; i < 3; i++) {
        addTile(i * TILE_SIZE, 0, 'x', i === 0);
    }
    for (let i = 0; i < 30; i++) {
        addNextTile();
    }
}

function addTile(x, z, type, isStartItem = false) {
    const hue = (path.length * 2) % 360;
    const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color(`hsl(${hue}, 80%, 60%)`)
    });

    const geometry = new THREE.BoxGeometry(TILE_SIZE, 1, TILE_SIZE);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, -0.5, z);

    scene.add(mesh);
    path.push({ mesh: mesh, x: x, z: z });
}

function addNextTile() {
    const lastTile = path[path.length - 1];
    let nextX = lastTile.x;
    let nextZ = lastTile.z;

    const nextDir = Math.random() > 0.5 ? 'x' : 'z';

    if (nextDir === 'x') {
        nextX += TILE_SIZE;
    } else {
        nextZ += TILE_SIZE;
    }

    addTile(nextX, nextZ, nextDir);
}

function resetGame() {
    path.forEach(t => scene.remove(t.mesh));
    path = [];
    score = 0;
    speed = 5.0 * _DIFF.speed;
    dir = 'x';
    isFalling = false;
    gameOver = false;
    ballVelY = 0;

    updateScoreUI();

    generateInitialPath();

    ball.position.set(0, 0.6, 0);
    ball.rotation.set(0, 0, 0);
    camera.position.set(ball.position.x + 20, 20, ball.position.z + 20);
    camera.lookAt(ball.position.x, 0, ball.position.z);

    const envHue = 220 / 360;
    scene.fog.color.setHSL(envHue, 0.5, 0.1);
    renderer.setClearColor(scene.fog.color);
}

function startGame() {
    scoreDisplay.classList.add('visible');

    if (gameOver || isFalling) {
        resetGame();
    }

    gameStarted = true;
    gameOver = false;
    lastTime = 0;
}

function changeDirection() {
    dir = dir === 'x' ? 'z' : 'x';
    score++;
    updateScoreUI();
    speed += 0.05;
}

function updateScoreUI() {
    scoreDisplay.innerText = score;
}

function checkFall() {
    let onTile = false;

    for (let i = 0; i < path.length; i++) {
        const t = path[i];
        if (Math.abs(ball.position.x - t.x) <= MathTolerance &&
            Math.abs(ball.position.z - t.z) <= MathTolerance) {
            onTile = true;
            break;
        }
    }

    if (!onTile && !isFalling) {
        isFalling = true;
        endGame();
    }
}

function endGame() {
    gameOver = true;
    scoreDisplay.classList.remove('visible');

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('zigzag_best_score', bestScore);
    }

    NeonMenu.showGameOver(score, bestScore);
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const d = 15;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animation(time) {
    let dt = (time - lastTime) / 1000;
    if (!lastTime) dt = 0;
    if (dt > 0.1) dt = 0.1;
    lastTime = time;

    if (gameStarted) {
        if (!isFalling) {
            if (dir === 'x') {
                ball.position.x += speed * dt;
            } else {
                ball.position.z += speed * dt;
            }

            const targetX = ball.position.x + 20;
            const targetZ = ball.position.z + 20;
            camera.position.x += (targetX - camera.position.x) * 0.1;
            camera.position.z += (targetZ - camera.position.z) * 0.1;

            checkFall();

            if (path.length > 0) {
                const firstTile = path[0];
                const dx = ball.position.x - firstTile.x;
                const dz = ball.position.z - firstTile.z;
                if (Math.sqrt(dx * dx + dz * dz) > 10) {
                    scene.remove(firstTile.mesh);
                    path.shift();
                    addNextTile();
                }
            }

            if (dir === 'x') {
                ball.rotation.z -= speed * dt;
            } else {
                ball.rotation.x += speed * dt;
            }

            const envHue = ((score * 2) % 360) / 360;
            scene.fog.color.setHSL(envHue, 0.4, 0.15);
            renderer.setClearColor(scene.fog.color);
        } else {
            ballVelY += GRAVITY * dt;
            ball.position.y += ballVelY * dt;
            if (ball.position.y < -20) {
                gameStarted = false;
            }
        }
    }

    renderer.render(scene, camera);
}

init();
