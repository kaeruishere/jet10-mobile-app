const fs = require('fs');
const files = [
    'StickMaster/app.js',
    'ZigZag/app.js',
    'Stack2D/app.js',
    'NeonTiles/app.js',
    'NeonSwitch/app.js',
    'NeonDash/app.js',
    'NeonHelix/app.js',
    'NeonChop/app.js',
    'NeonDarts/app.js'
];
files.forEach(f => {
    const path = '/home/kaeru/Belgeler/Projeler/Web/oyunlar/' + f;
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(/setTimeout\(\s*\(\)\s*=>\s*\{?\s*gameOverScreen\.classList\.add\('active'\);\s*\}?,\s*\d+\s*\);?/g, 'NeonMenu.showGameOver(score, bestScore);');
    fs.writeFileSync(path, content);
});
