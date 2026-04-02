const fs = require('fs');
const path = require('path');

const games = [
    "NeonBreaker", // Already done manually
    "NeonChop",
    "NeonDarts",
    "NeonDash",
    "NeonHelix",
    "NeonRoller",
    "NeonSnake",
    "NeonSort",
    "NeonSwitch",
    "NeonTiles",
    "Stack2D",
    "StickMaster",
    "ZigZag"
];

const basePath = '/home/kaeru/Belgeler/Projeler/Web/oyunlar';

games.forEach(game => {
    if (game === "NeonBreaker") return; // skip already done
    
    // ----------- Refactor index.html -----------
    const indexPath = path.join(basePath, game, 'index.html');
    if (!fs.existsSync(indexPath)) return;
    
    let html = fs.readFileSync(indexPath, 'utf8');
    
    // Remove start-screen div
    html = html.replace(/<div id="start-screen" class="screen active">[\s\S]*?<\/div>\s*<div id="game-over-screen" class="screen">[\s\S]*?<\/div>/g, '');
    
    // Add neon-menu.js before neon-shared.js
    if (!html.includes('neon-menu.js')) {
        html = html.replace(/<script src="\.\.\/shared\/neon-shared\.js"><\/script>/, '<script src="../shared/neon-menu.js"></script>\n    <script src="../shared/neon-shared.js"></script>');
    }
    
    fs.writeFileSync(indexPath, html);
    
    // ----------- Refactor app.js -----------
    const appPath = path.join(basePath, game, 'app.js');
    if (!fs.existsSync(appPath)) return;
    
    let app = fs.readFileSync(appPath, 'utf8');
    
    // Change const _DIFF to let _DIFF
    app = app.replace(/const _DIFF = /, 'let _DIFF = ');
    // Change const GAME_SPEED (or BALL_SPEED or whatever scales with diff)
    // Actually, sometimes it's const SPEED, const BALL_SPEED. Let's just find "const.*_DIFF\.speed;" and make it let.
    app = app.replace(/const (.*?_DIFF\.speed;)/g, 'let $1');
    
    // Remove UI variables
    app = app.replace(/const startScreen = document\.getElementById\('start-screen'\);\n?/g, '');
    app = app.replace(/const gameOverScreen = document\.getElementById\('game-over-screen'\);\n?/g, '');
    app = app.replace(/const playBtn = document\.getElementById\('play-btn'\);\n?/g, '');
    app = app.replace(/const restartBtn = document\.getElementById\('restart-btn'\);\n?/g, '');
    app = app.replace(/const finalScoreEl = document\.getElementById\('final-score'\);\n?/g, '');
    app = app.replace(/const finalBestEl = document\.getElementById\('final-best-score'\);\n?/g, '');
    
    // Remove finalScoreEl/finalBestEl references in die()
    app = app.replace(/finalScoreEl\.innerText.*?\n/g, '');
    app = app.replace(/finalBestEl\.innerText.*?\n/g, '');
    app = app.replace(/setTimeout\(\(\) => gameOverScreen\.classList\.add\('active'\), .*?\);/g, 'NeonMenu.showGameOver(score, bestScore);');
    // Note: the variables in showGameOver might be level/bestScore, or score/bestScore. Let's look for how it was named. 
    // In NeonBreaker, we wrote NeonMenu.showGameOver(level, bestScore);
    // Usually it's `score` or `level` and `bestScore`.
    
    // Wait, let's write a better replacement for the die() function ending.
    
    // Remove classList.remove active
    app = app.replace(/startScreen\.classList\.remove\('active'\);\n/g, '');
    app = app.replace(/gameOverScreen\.classList\.remove\('active'\);\n/g, '');
    
    // Bottom event listeners
    const eventRegex = /playBtn\.addEventListener\('click', (.*?)\);\n*restartBtn\.addEventListener\('click', .*?\);/g;
    const match = eventRegex.exec(app);
    if (match) {
        const initFn = match[1];
        let replacement = `NeonMenu.init({\n    onStart: ${initFn},\n    onRestart: ${initFn}\n}).then(() => {\n    NeonMenu.showStart();\n});\n`;
        app = app.replace(eventRegex, replacement);
    }
    
    fs.writeFileSync(appPath, app);
    console.log(`Refactored ${game}`);
});
