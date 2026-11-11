const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'src/index.html'), 'utf8')
  .replace('/* STYLES */', () => fs.readFileSync(path.join(__dirname, 'src/styles.css'), 'utf8'))
  .replace('/* GAME */', () => fs.readFileSync(path.join(__dirname, 'src/game.js'), 'utf8'));
if (!source.includes('<canvas id="game"') || !source.includes('FRUIT')) throw new Error('Game source is incomplete');
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'index.html'), source);
fs.writeFileSync(path.join(__dirname, 'out', 'index.html'), source);
if (fs.existsSync(path.join(__dirname, 'outputs'))) fs.writeFileSync(path.join(__dirname, 'outputs', '水果忍者.html'), source);
console.log('Static game built successfully.');
