// ─── Difficulty ────────────────────────────────────────────────
let _DIFF = (window.NEON && window.NEON.getDiff()) || { speed:1, density:1 };

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let dpr = window.devicePixelRatio || 1;
let W, H, LANE_W;

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    LANE_W = W / 4;
}
window.addEventListener('resize', resize);
resize();

const uiHUD = document.getElementById('hud');
const scoreEl = document.getElementById('score-display');

let bestScore = localStorage.getItem('neontiles_best') || 0;

const seq = [
    261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 466.16, 392.00,
    261.63, 311.13, 349.23, 311.13, 261.63, 196.00, 233.08, 261.63
];
let noteIdx = 0;

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playNote() {
    if(!audioCtx) {
        if(AudioContext) audioCtx = new AudioContext();
        else return;
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    let freq = seq[noteIdx % seq.length];
    noteIdx++;
    
    let osc = audioCtx.createOscillator();
    let filter = audioCtx.createBiquadFilter();
    let g = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
    
    g.gain.setValueAtTime(0.3, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.connect(filter);
    filter.connect(g);
    g.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
}

function sfxError() {
    if(!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let g = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
    g.gain.setValueAtTime(0.4, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.5);
}


let state = 'START';
let score = 0;
let lastTime = 0;

let BASE_SPEED = H * 0.8 * _DIFF.speed;   // difficulty scales speed
let currentSpeed = BASE_SPEED;
let tileHeight = H * 0.25;

let tiles = []; 
let particles = [];
let errorTile = null;

const COLORS = ['#00f2fe', '#f093fb', '#f5576c', '#4facfe', '#a18cd1', '#ff0844'];
let bgOffset = 0;

function getRandomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function initGame() {
    score = 0;
    scoreEl.innerText = score;
    state = 'PLAY';
    noteIdx = 0;
    
    tiles = [];
    particles = [];
    errorTile = null;
    
    currentSpeed = BASE_SPEED;
    
    for(let i=0; i<6; i++) {
        let lane = Math.floor(Math.random() * 4);
        let ty = H * 0.4 - (i * tileHeight);
        tiles.push({
            lane: lane,
            y: ty,
            tapped: false,
            color: getRandomColor(),
            tVal: 0 
        });
    }
    
            uiHUD.classList.add('visible');
    
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawnTile() {
    let topY = tiles[tiles.length-1].y;
    let lane = Math.floor(Math.random() * 4);
    if (tiles.length >= 2) {
        if (tiles[tiles.length-1].lane === lane && tiles[tiles.length-2].lane === lane) {
            lane = (lane + 1 + Math.floor(Math.random()*2)) % 4;
        }
    }
    
    tiles.push({
        lane: lane,
        y: topY - tileHeight,
        tapped: false,
        color: getRandomColor(),
        tVal: 0
    });
}

function die(reasonLane=-1, reasonY=0) {
    state = 'DEAD';
    sfxError();
    uiHUD.classList.remove('visible');
    
    if (reasonLane !== -1) {
        errorTile = { lane: reasonLane, y: reasonY };
    }
    
    if(score > bestScore) {
        bestScore = score;
        localStorage.setItem('neontiles_best', bestScore);
    }
    
            
    NeonMenu.showGameOver(score, bestScore);
}

function tapLane(lane) {
    if(state !== 'PLAY') return;
    if(!audioCtx && AudioContext) audioCtx = new AudioContext();
    
    let targetTile = null;
    for(let i=0; i<tiles.length; i++) {
        if(!tiles[i].tapped) {
            targetTile = tiles[i];
            break;
        }
    }
    
    if (targetTile) {
        if(targetTile.lane === lane) {
            targetTile.tapped = true;
            playNote();
            score++;
            scoreEl.innerText = score;
            // Speed scales with difficulty multiplier too
            currentSpeed += H * 0.005 * _DIFF.speed;
            
            let tx = lane * LANE_W + LANE_W/2;
            let ty = targetTile.y + tileHeight/2;
            for(let i=0; i<15; i++) {
                let a = Math.random()*Math.PI*2;
                let s = 100 + Math.random()*200;
                particles.push({
                    x: tx, y: ty,
                    vx: Math.cos(a)*s, vy: Math.sin(a)*s,
                    alpha: 1, c: targetTile.color
                });
            }
            
        } else {
            let eY = targetTile.y > H - tileHeight ? H - tileHeight : targetTile.y;
            die(lane, eY);
        }
    }
}

function loop(time) {
    let dt = (time - lastTime) / 1000;
    if(dt > 0.1) dt = 0.1;
    lastTime = time;
    
    if (state === 'PLAY') {
        let moveY = currentSpeed * dt;
        bgOffset = (bgOffset + moveY * 0.2) % H;
        
        for(let i=0; i<tiles.length; i++) {
            tiles[i].y += moveY;
            if(tiles[i].tapped && tiles[i].tVal < 1) {
                tiles[i].tVal += dt * 5;
                if(tiles[i].tVal > 1) tiles[i].tVal = 1;
            }
        }
        
        for(let t of tiles) {
            if(!t.tapped && t.y > H) {
                die(t.lane, t.y); 
            }
        }
        
        while(tiles.length > 0 && tiles[0].y > H + tileHeight) {
            tiles.shift();
        }
        
        while(tiles[tiles.length-1].y > -tileHeight*2) {
            spawnTile();
        }
    }
    
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= 3 * dt;
        if(p.alpha <= 0) particles.splice(i,1);
    }
    
    draw();

    if(state !== 'START') {
        requestAnimationFrame(loop);
    }
}

function draw() {
    ctx.clearRect(0,0,W,H);
    
    ctx.fillStyle = '#070014';
    ctx.fillRect(0,0,W,H);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i=1; i<4; i++) {
        ctx.moveTo(i*LANE_W, 0);
        ctx.lineTo(i*LANE_W, H);
    }
    ctx.stroke();
    
    ctx.beginPath();
    for(let i=0; i<5; i++) {
        let lineY = (bgOffset + i * (H/4)) % H;
        ctx.moveTo(0, lineY);
        ctx.lineTo(W, lineY);
    }
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
    ctx.stroke();

    for(let t of tiles) {
        let tx = t.lane * LANE_W;
        if (!t.tapped) {
            ctx.fillStyle = 'rgba(30, 0, 50, 0.8)';
            ctx.shadowColor = t.color;
            ctx.shadowBlur = 15;
            ctx.fillRect(tx + 4, t.y + 4, LANE_W - 8, tileHeight - 8);
            
            ctx.strokeStyle = t.color;
            ctx.lineWidth = 3;
            ctx.strokeRect(tx + 4, t.y + 4, LANE_W - 8, tileHeight - 8);
        } else {
            let s = 1 - t.tVal * 0.5; 
            ctx.save();
            ctx.translate(tx + LANE_W/2, t.y + tileHeight/2);
            ctx.scale(s, s);
            ctx.fillStyle = t.color;
            ctx.shadowColor = t.color;
            ctx.shadowBlur = 30 * (1-t.tVal);
            ctx.globalAlpha = 1 - t.tVal;
            ctx.fillRect(-LANE_W/2 + 4, -tileHeight/2 + 4, LANE_W - 8, tileHeight - 8);
            ctx.restore();
        }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    
    if (state === 'DEAD' && errorTile) {
        let blinkPhase = Math.floor(performance.now() / 150) % 2;
        if(blinkPhase === 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
            ctx.shadowColor = 'red';
            ctx.shadowBlur = 20;
            ctx.fillRect(errorTile.lane * LANE_W, errorTile.y, LANE_W, tileHeight);
        }
        ctx.shadowBlur = 0;
    }
    
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.8)';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(0, H - 10);
    ctx.lineTo(W, H - 10);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    for(let p of particles) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c;
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
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


const tapZones = document.querySelectorAll('.touch-lane');
tapZones.forEach(zone => {
    zone.addEventListener('mousedown', (e) => {
        if(e.button !== 0) return;
        tapLane(parseInt(zone.dataset.lane));
    });
    zone.addEventListener('touchstart', (e) => {
        e.preventDefault(); 
        tapLane(parseInt(zone.dataset.lane));
    }, {passive: false});
});

window.addEventListener('keydown', (e) => {
    if(e.key === 'd' || e.key === 'D') tapLane(0);
    if(e.key === 'f' || e.key === 'F') tapLane(1);
    if(e.key === 'j' || e.key === 'J') tapLane(2);
    if(e.key === 'k' || e.key === 'K') tapLane(3);
});

draw();
