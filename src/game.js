(() => {
  'use strict';
  const dom = {};
  const $ = id => dom[id] ||= document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d'), arena = $('arena');
  const TAU = Math.PI * 2;
  const modes = {
    classic: { name: '经典模式', seconds: 0, tip: '按住鼠标划过水果 · 漏果三次或碰到炸弹即结束' },
    arcade: { name: '街机模式', seconds: 60, tip: '连切 20 个水果触发狂热 · 炸弹扣 10 分' },
    zen: { name: '禅模式', seconds: 90, tip: '没有炸弹，没有漏果惩罚 · 享受每一刀' }
  };
  const fruits = {
    watermelon: { color: '#f65461', mid: '#529646', dark: '#174731', light: '#afd65c', juice: '#ff5165', size: 1.13, pitch: 150 },
    orange: { color: '#ffa62e', mid: '#ff9820', dark: '#cd5214', light: '#ffda67', juice: '#ffaf30', size: 1, pitch: 220 },
    apple: { color: '#ec4842', mid: '#e93d43', dark: '#95152c', light: '#ff997e', juice: '#ff7065', size: 1.03, pitch: 190 },
    kiwi: { color: '#a7d33e', mid: '#997748', dark: '#604127', light: '#bd9f65', juice: '#b6e246', size: .95, pitch: 265 },
    strawberry: { color: '#f95459', mid: '#f04663', dark: '#a51538', light: '#ff9c91', juice: '#ff5870', size: .92, pitch: 310 },
    plum: { color: '#d45ba1', mid: '#945aab', dark: '#45204f', light: '#d9a8da', juice: '#d781b5', size: .96, pitch: 245 }
  };
  const fruitNames = Object.keys(fruits);
  const storageKey = 'fruit-ninja-dojo-v1';
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { saved = {}; }
  const records = Object.fromEntries(Object.keys(modes).map(m => [m, Math.max(0, Number(saved[m]) || 0)]));
  let soundOn = saved.sound !== false;
  const prefs = { volume: Math.max(0, Math.min(1, Number.isFinite(saved.volume) ? saved.volume : .65)), quality: ['auto','rich','light'].includes(saved.quality) ? saved.quality : 'auto', motion: saved.motion !== false, blade: ['mint','gold','ice'].includes(saved.blade) ? saved.blade : 'mint' };
  function save() { try { localStorage.setItem(storageKey, JSON.stringify({ ...records, sound: soundOn, ...prefs })); } catch {} }
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let W = 1200, H = 700, dpr = 1, background;
  let phase = 'menu', selectedMode = 'classic';
  let entities = [], particles = [], pieces = [], splats = [], texts = [], trails = [];
  let score = 0, misses = 0, sliced = 0, maxCombo = 0, elapsed = 0, remaining = 0;
  let spawnIn = .6, wave = 0, frenzy = 0, frenzyThreshold = 20, shake = 0, flash = 0;
  let countdown = 0, endDelay = 0, endReason = '', priorRecord = 0, newRecord = false;
  let pointer = null, stroke = [], lastSlice = -100, strokeTotal = 0;
  let helpPaused = false, ambientTime = 0, lastFrame = 0, uiIn = 0, lastWhoosh = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FIXED_STEP = 1 / 120;
  const COMBO_GAP = .34;
  const bladeColors = { mint: '#a5ffe0', gold: '#ffd274', ice: '#92dfff' };
  let accumulator = 0, renderAlpha = 0, slowMotion = 0, avgFrame = 1 / 60;
  let impacts = [], missFlash = 0, missNoticeLife = 0, comboLife = 0;
  let cameraX = 0, cameraY = 0, gestureRect = null, missAlarms = 0, dangerCues = 0, lastDanger = -10;
  let settingsPaused = false, lastTimerBeep = -1, longestStreak = 0, streak = 0;
  const uiValues = {};
  const motionEnabled = () => prefs.motion && !reducedMotion;
  const lightEffects = () => reducedMotion || prefs.quality === 'light' || (prefs.quality === 'auto' && avgFrame > .025);
  function setText(id, value) { value = String(value); if (uiValues[id] !== value) { uiValues[id] = value; $(id).textContent = value; } }
  function pulse(id, keyframes, duration = 230) { if (!reducedMotion) $(id).animate(keyframes, {duration, easing:'cubic-bezier(.16,1,.3,1)'}); }
  function haptic(pattern) { if (motionEnabled() && navigator.vibrate) { try { navigator.vibrate(pattern); } catch {} } }
  function radiusFor(type) { return clamp(Math.min(W / (W < 700 ? 9.5 : 24), H / 13), 32, 48) * (fruits[type]?.size || .96); }
  function renderPosition(e) { return {x: (e.px ?? e.x) + (e.x - (e.px ?? e.x)) * renderAlpha, y: (e.py ?? e.y) + (e.y - (e.py ?? e.y)) * renderAlpha}; }

  // Procedural art keeps the game self-contained and available offline.
  function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function ellipse(c, x, y, rx, ry, color, rotation = 0) {
    c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, TAU); c.fill();
  }
  function fruitPath(c, type) {
    c.beginPath();
    if (type === 'apple') {
      c.moveTo(0, -.76); c.bezierCurveTo(-.68, -1.12, -1.15, -.52, -.91, .19);
      c.bezierCurveTo(-.75, .91, -.28, 1.02, 0, .83); c.bezierCurveTo(.39, 1.06, .83, .62, .95, .03);
      c.bezierCurveTo(1.08, -.75, .54, -1.05, 0, -.76);
    } else if (type === 'strawberry') {
      c.moveTo(0, -.79); c.bezierCurveTo(-.79, -1.1, -1.11, -.51, -.8, .08);
      c.bezierCurveTo(-.5, .73, -.1, 1.02, .08, 1.01); c.bezierCurveTo(.3, .9, .82, .23, .87, -.2);
      c.bezierCurveTo(1.02, -.83, .46, -.99, 0, -.79);
    } else if (type === 'kiwi') c.ellipse(0, 0, .89, 1, -.15, 0, TAU);
    else if (type === 'plum') c.ellipse(0, 0, .89, .99, .05, 0, TAU);
    else c.arc(0, 0, .97, 0, TAU);
    c.closePath();
  }
  function leaf(c, x, y, angle, size = 1) {
    c.save(); c.translate(x, y); c.rotate(angle); c.scale(size, size);
    const g = c.createLinearGradient(0, -.12, .55, .1); g.addColorStop(0, '#b5d851'); g.addColorStop(1, '#3c7535');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(.12, -.31, .5, -.25, .6, -.05); c.bezierCurveTo(.39, .19, .16, .19, 0, 0); c.fill();
    c.strokeStyle = '#ceda7055'; c.lineWidth = .014; c.beginPath(); c.moveTo(.02, 0); c.quadraticCurveTo(.24, -.025, .54, -.04); c.stroke(); c.restore();
  }
  const sprites = {};
  function makeSprite(type, inside) {
    const surface = document.createElement('canvas'); surface.width = surface.height = 320;
    const c = surface.getContext('2d'); c.translate(160, 170); c.scale(124, 124);
    const f = fruits[type], rng = seeded(type.length * 57 + type.charCodeAt(0));
    // Bake fruit shadows once instead of running blur filters every animation frame.
    c.save(); c.shadowColor = '#090c0766'; c.shadowBlur = 13; c.shadowOffsetY = 8;
    fruitPath(c, type); c.fillStyle = f.dark; c.fill(); c.restore();
    c.save(); fruitPath(c, type); c.clip();
    const base = c.createRadialGradient(-.37, -.43, .01, .04, .05, 1.25);
    base.addColorStop(0, f.light); base.addColorStop(.5, f.mid); base.addColorStop(1, f.dark);
    c.fillStyle = base; c.fillRect(-1.2, -1.2, 2.4, 2.4);
    if (type === 'watermelon') {
      for (let i = -4; i <= 4; i++) {
        c.strokeStyle = i % 2 ? '#b4c7589c' : '#a2b74a9c'; c.lineWidth = .105;
        c.beginPath(); c.moveTo(i * .08, -1.02);
        c.bezierCurveTo(i * .4 + .09, -.6, i * .37 - .07, .46, i * .075, 1.02); c.stroke();
        c.strokeStyle = '#c9d6863b'; c.lineWidth = .023; c.stroke();
      }
    }
    if (type === 'kiwi') {
      for (let i = 0; i < 340; i++) { let x = rng() * 2 - 1, y = rng() * 2 - 1; c.strokeStyle = rng() > .5 ? '#d3b16a77' : '#36200f77'; c.lineWidth = .009; c.beginPath(); c.moveTo(x, y); c.lineTo(x + .025, y - .045); c.stroke(); }
    } else {
      for (let i = 0; i < 250; i++) ellipse(c, rng() * 2 - 1, rng() * 2 - 1, rng() * .016 + .003, rng() * .016 + .003, rng() > .5 ? '#fff4bf1b' : '#190c0710');
    }
    if (type === 'strawberry') {
      for (let row = 0; row < 6; row++) for (let col = -3; col <= 3; col++) {
        const y = -.58 + row * .245, x = col * .245 + (row % 2 ? .12 : 0);
        if (Math.abs(x) > .72 - row * .065) continue;
        ellipse(c, x + .01, y + .02, .031, .066, '#a41b3677', x * -.3); ellipse(c, x, y, .019, .047, '#ffe49c', x * -.3);
      }
    }
    if (type === 'apple') { c.strokeStyle = '#ffb78025'; c.lineWidth = .025; for (let i = 0; i < 18; i++) { const x = -.85 + i * .1; c.beginPath(); c.moveTo(x, -.5); c.quadraticCurveTo(x * 1.1, .1, x * .8, .85); c.stroke(); } }
    if (type === 'plum') { c.strokeStyle = '#e3bfd23d'; c.lineWidth = .021; c.beginPath(); c.moveTo(.02, -.94); c.bezierCurveTo(-.15, -.3, .21, .3, .13, .93); c.stroke(); }
    const light = c.createRadialGradient(-.36, -.43, .01, -.28, -.38, .66); light.addColorStop(0, '#fffbd693'); light.addColorStop(.34, '#ffffff30'); light.addColorStop(1, '#ffffff00');
    c.fillStyle = light; c.fillRect(-1, -1, 2, 2);
    c.strokeStyle = '#fff4ca3f'; c.lineWidth = .035; c.beginPath(); c.ellipse(-.35, -.44, .16, .3, .58, 3.35, 5.62); c.stroke();
    const rim = c.createLinearGradient(-1, 0, 1, .7); rim.addColorStop(0, '#ffffff00'); rim.addColorStop(.7, '#ffffff00'); rim.addColorStop(1, '#ffdca22f'); c.fillStyle = rim; c.fillRect(-1,-1,2,2);
    c.restore();
    if (inside) {
      c.save(); fruitPath(c, type); c.clip();
      c.scale(.94, .94); fruitPath(c, type); c.fillStyle = type === 'watermelon' ? '#daedaf' : type === 'orange' ? '#fff0b7' : type === 'kiwi' ? '#b1be57' : '#ffd5b3'; c.fill();
      c.scale(.91, .91); fruitPath(c, type);
      const pulp = c.createRadialGradient(-.26, -.35, .01, .1, .15, 1.2);
      const colors = { watermelon: ['#ff9290', '#f24a5b'], orange: ['#ffd866', '#ff992c'], apple: ['#fff9d9', '#f2d89c'], kiwi: ['#d5e97f', '#72ab39'], strawberry: ['#ffb096', '#ee5267'], plum: ['#ffd599', '#ebac54'] };
      pulp.addColorStop(0, colors[type][0]); pulp.addColorStop(1, colors[type][1]); c.fillStyle = pulp; c.fill();
      if (type === 'orange') {
        for (let i = 0; i < 10; i++) { const a = i * TAU / 10; c.strokeStyle = '#fff2c89e'; c.lineWidth = .024; c.beginPath(); c.moveTo(Math.cos(a) * .11, Math.sin(a) * .11); c.lineTo(Math.cos(a) * .94, Math.sin(a) * .94); c.stroke();
          for (let j = 0; j < 16; j++) { let aa = a + .07 + rng() * .48, r = .25 + rng() * .59; ellipse(c, Math.cos(aa) * r, Math.sin(aa) * r, .013, .035, '#ffe78b66', aa); }
        } ellipse(c, 0, 0, .12, .12, '#fff0bb');
      } else if (type === 'watermelon') {
        for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + .1, r = i % 2 ? .55 : .71; ellipse(c, Math.cos(a) * r, Math.sin(a) * r, .034, .063, '#542b2a', a + Math.PI / 2); ellipse(c, Math.cos(a) * r - .011, Math.sin(a) * r - .013, .01, .021, '#ae6260', a + Math.PI / 2); }
      } else if (type === 'kiwi') {
        for (let i = 0; i < 38; i++) { const a = i * TAU / 38; c.strokeStyle = '#ecf4a57a'; c.lineWidth = .019; c.beginPath(); c.moveTo(Math.cos(a) * .28, Math.sin(a) * .36); c.lineTo(Math.cos(a) * .84, Math.sin(a) * .91); c.stroke(); if(i % 2 === 0) ellipse(c, Math.cos(a) * .48, Math.sin(a) * .56, .024, .042, '#403b26', a + Math.PI / 2); }
        ellipse(c, 0, 0, .23, .32, '#f4efc2');
      } else if (type === 'apple') {
        ellipse(c, 0, .1, .14, .35, '#ead192'); ellipse(c, -.12, .08, .044, .075, '#6b422a', -.3); ellipse(c, .12, .08, .044, .075, '#6b422a', .3);
      } else if (type === 'plum') {
        ellipse(c, 0, .03, .24, .34, '#a6552e', .1); ellipse(c, -.045, -.02, .15, .24, '#c98745', .1);
      } else {
        c.fillStyle = '#fff0bcaa'; c.beginPath(); c.moveTo(-.21, -.72); c.quadraticCurveTo(.1, -.48, .15, .79); c.quadraticCurveTo(.4, -.41, .3, -.76); c.fill();
      }
      // Fine, deterministic pulp speckles make each cross-section look freshly cut.
      c.save(); fruitPath(c, type); c.clip();
      for (let i = 0; i < 90; i++) { const a = rng()*TAU, r = Math.sqrt(rng())*.86; ellipse(c,Math.cos(a)*r,Math.sin(a)*r,.008+rng()*.009,.005+rng()*.007,'#fff2ce38'); }
      c.restore();
      c.restore();
    } else if (type !== 'kiwi' && type !== 'watermelon') {
      if (type === 'strawberry') {
        for (let i = 0; i < 5; i++) leaf(c, -.01, -.81, Math.PI + i * .69, .8);
        leaf(c, .02, -.85, -.8, .8);
      } else {
        c.strokeStyle = '#705333'; c.lineWidth = .065; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -.8); c.quadraticCurveTo(.06, -1.0, -.01, -1.12); c.stroke(); leaf(c, .015, -.97, -.12, type === 'orange' ? .72 : 1);
      }
    }
    return surface;
  }
  for (const type of fruitNames) { sprites[type] = makeSprite(type, false); sprites[type + '-cut'] = makeSprite(type, true); }

  function drawFruit(c, type, x, y, r, angle = 0, cut = false) {
    c.save(); c.translate(x, y); c.rotate(angle);
    c.drawImage(sprites[type + (cut ? '-cut' : '')], -r * 160 / 124, -r * 170 / 124, r * 320 / 124, r * 320 / 124);
    c.restore();
  }
  function drawBomb(c, e, t) {
    c.save(); c.translate(e.x, e.y); c.rotate(e.a); const r = e.r;
    c.shadowColor = '#0006'; c.shadowBlur = 15; c.shadowOffsetY = 7;
    const grad = c.createRadialGradient(-r * .3, -r * .45, 1, 0, 0, r);
    grad.addColorStop(0, '#667075'); grad.addColorStop(.36, '#363c3b'); grad.addColorStop(1, '#141817');
    ellipse(c, 0, 0, r, r, grad); c.shadowColor = 'transparent';
    c.fillStyle = '#484a3b'; c.fillRect(-r * .22, -r * 1.12, r * .43, r * .26);
    c.strokeStyle = '#ba9b63'; c.lineWidth = r * .085; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -r * 1.08); c.quadraticCurveTo(r * .1, -r * 1.65, r * .47, -r * 1.43); c.stroke();
    const sx = r * .47, sy = -r * 1.43;
    c.shadowColor = '#ffc944'; c.shadowBlur = 18; ellipse(c, sx, sy, r * .075, r * .075, '#fff6a5'); c.shadowBlur = 0;
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * 8, d = r * (.2 + Math.sin(t * 28 + i) * .08); c.strokeStyle = i % 2 ? '#fff1a1' : '#ffaa35'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(sx + Math.cos(a) * d * .4, sy + Math.sin(a) * d * .4); c.lineTo(sx + Math.cos(a) * d, sy + Math.sin(a) * d); c.stroke(); }
    c.globalAlpha = .85; c.strokeStyle = '#e8d9bd'; c.lineWidth = r * .09; c.beginPath(); c.moveTo(-r * .21, -r * .23); c.lineTo(r * .21, r * .23); c.moveTo(r * .21, -r * .23); c.lineTo(-r * .21, r * .23); c.stroke(); c.restore();
  }
  function makeBackground() {
    background = document.createElement('canvas'); background.width = W * dpr; background.height = H * dpr;
    const c = background.getContext('2d'); c.scale(dpr, dpr); const rng = seeded(2476);
    const plankWidth = Math.max(135, W / 7);
    for (let x = 0, i = 0; x < W; x += plankWidth, i++) {
      const grad = c.createLinearGradient(x, 0, x + plankWidth, 0);
      const light = i % 3 === 0 ? 25 : 23; grad.addColorStop(0, `hsl(28 26% ${light - 5}%)`); grad.addColorStop(.26, `hsl(29 25% ${light}%)`); grad.addColorStop(.78, `hsl(28 28% ${light - 2}%)`); grad.addColorStop(1, `hsl(28 28% ${light - 6}%)`);
      c.fillStyle = grad; c.fillRect(x, 0, plankWidth, H);
      c.strokeStyle = '#120f0b88'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
      c.strokeStyle = '#bc92601b'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 2, 0); c.lineTo(x + 2, H); c.stroke();
      for (let j = 0; j < 54; j++) {
        let gx = x + rng() * plankWidth, start = -100 + rng() * 180, bend = rng() * 25;
        c.strokeStyle = rng() > .5 ? `rgba(195,148,89,${rng() * .065})` : `rgba(9,6,2,${rng() * .15})`; c.lineWidth = rng() * 1.5 + .4;
        c.beginPath(); c.moveTo(gx, start); c.bezierCurveTo(gx + bend, H * .27, gx - bend, H * .54, gx + rng() * 12, H + 80); c.stroke();
      }
      if (i % 2) {
        c.save(); c.translate(x + plankWidth * .57, H * (.28 + rng() * .5)); c.scale(1, 3.8);
        for (let k = 0; k < 8; k++) { c.strokeStyle = '#150d0618'; c.lineWidth = .5; c.beginPath(); c.ellipse(0, 0, 3 + k * 3, 6 + k * 4, 0, 0, TAU); c.stroke(); } c.restore();
      }
    }
    const vignette = c.createRadialGradient(W * .55, H * .37, H * .05, W * .5, H * .5, Math.max(W, H) * .72);
    vignette.addColorStop(0, '#100a0000'); vignette.addColorStop(.6, '#130c0430'); vignette.addColorStop(1, '#0a0808ac'); c.fillStyle = vignette; c.fillRect(0, 0, W, H);
    c.save(); c.globalAlpha = .075; c.strokeStyle = '#ead2a0'; c.lineWidth = 2;
    const cx = W * .72, cy = H * .41, radius = Math.min(W * .23, H * .31);
    c.beginPath(); c.arc(cx, cy, radius, .16, TAU - .25); c.stroke(); c.lineWidth = 10; c.beginPath(); c.arc(cx, cy, radius + 11, .1, 2.8); c.stroke();
    c.font = `${radius * 1.45}px KaiTi, STKaiti, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#e5c38e'; c.fillText('斩', cx, cy + 4); c.restore();
    // Faint diagonal blade scars in the wood.
    for (let i = 0; i < 7; i++) { const x = rng() * W, y = rng() * H; c.strokeStyle = '#f6c78906'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 130 + rng() * 240, y - 90); c.stroke(); }
  }
  function resize() {
    const oldW = W, oldH = H, bounds = arena.getBoundingClientRect();
    W = bounds.width - 2; H = bounds.height - 2; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (oldW && phase !== 'menu') for (const e of [...entities, ...pieces]) { e.x *= W / oldW; e.y *= H / oldH; e.px = e.x; e.py = e.y; e.vx *= W / oldW; e.vy *= Math.sqrt(H / oldH); e.r = radiusFor(e.type); }
    pointer = null; gestureRect = null; trails = []; stroke = []; accumulator = 0; makeBackground();
    const backdrop = $('backdrop'); backdrop.width = canvas.width; backdrop.height = canvas.height;
    backdrop.getContext('2d').drawImage(background, 0, 0);
  }
  new ResizeObserver(resize).observe(arena);

  // All sound is synthesized locally. The audio context opens only after a gesture.
  let audioCtx, masterGain, noiseBuffer;
  function initAudio() {
    if (!soundOn) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)({latencyHint:'interactive'});
        masterGain = audioCtx.createGain(); masterGain.gain.value = prefs.volume;
        const limiter = audioCtx.createDynamicsCompressor(); limiter.threshold.value = -12; limiter.knee.value = 12; limiter.ratio.value = 5; limiter.attack.value = .002; limiter.release.value = .12;
        masterGain.connect(limiter); limiter.connect(audioCtx.destination);
        noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
        const data = noiseBuffer.getChannelData(0), rng = seeded(7139);
        for (let i = 0; i < data.length; i++) data[i] = rng() * 2 - 1;
      }
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    } catch { audioCtx = null; }
  }
  function connectSound(node, x = W / 2) {
    if (audioCtx.createStereoPanner) { const pan = audioCtx.createStereoPanner(); pan.pan.value = clamp((x / W - .5) * 1.25, -.75, .75); node.connect(pan); pan.connect(masterGain); return pan; }
    node.connect(masterGain); return null;
  }
  function tone(freq, duration, type = 'sine', volume = .07, endFreq = freq, delay = 0, x = W / 2) {
    if (!soundOn || !audioCtx) return;
    const t = audioCtx.currentTime + delay, osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);
    gain.gain.setValueAtTime(.001, t); gain.gain.linearRampToValueAtTime(volume, t + .006); gain.gain.exponentialRampToValueAtTime(.001, t + duration);
    osc.connect(gain); const pan = connectSound(gain, x); osc.start(t); osc.stop(t + duration + .01);
    osc.onended = () => {osc.disconnect();gain.disconnect();pan?.disconnect();};
  }
  function noise(duration, volume, lowpass, x = W / 2) {
    if (!soundOn || !audioCtx) return;
    const source = audioCtx.createBufferSource(), gain = audioCtx.createGain(), filter = audioCtx.createBiquadFilter();
    const t = audioCtx.currentTime;
    source.buffer = noiseBuffer; filter.type = 'lowpass'; filter.frequency.value = lowpass;
    gain.gain.setValueAtTime(.001,t); gain.gain.linearRampToValueAtTime(volume,t+.004); gain.gain.exponentialRampToValueAtTime(.001,t+duration);
    source.connect(filter); filter.connect(gain); const pan = connectSound(gain,x);
    source.start(t, .1, duration); source.stop(t+duration+.01);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();pan?.disconnect();};
  }
  function sliceSound(e, count) {
    const pitch = fruits[e.type].pitch;
    noise(.11, .15, 3200 + count * 180, e.x);
    tone(pitch, .13, 'sine', .14, pitch * .43, 0, e.x);
    tone(560 + Math.min(count, 8) * 65, .065, 'triangle', .035, 920, .018, e.x);
  }
  function missAlarm(x) {
    missAlarms++;
    tone(660,.12,'triangle',.15,510,0,x); tone(440,.2,'triangle',.14,290,.13,x);
    noise(.12,.055,1400,x); haptic([30,45,45]);
  }
  function setSound() { $('sound-button').classList.toggle('muted', !soundOn); $('sound-button').setAttribute('aria-pressed', String(soundOn)); $('sound-button').setAttribute('aria-label', soundOn ? '关闭音效' : '开启音效'); }
  function toggleSound() { soundOn = !soundOn; setSound(); save(); if (masterGain) masterGain.gain.setTargetAtTime(soundOn ? prefs.volume : 0, audioCtx.currentTime, .015); if (soundOn) { initAudio(); tone(620, .1); } }

  function updateBest() { $('menu-best').textContent = records[selectedMode] > 0 ? `${modes[selectedMode].name} · 个人最佳 ${records[selectedMode]} 分` : '你的第一项纪录，等你来创造'; }
  function selectMode(mode) {
    selectedMode = mode;
    document.querySelectorAll('[data-mode]').forEach(button => { const active = button.dataset.mode === mode; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); }); updateBest();
  }
  function syncUI() {
    const changed = uiValues.score !== String(score);
    setText('score', score); setText('best', Math.max(records[selectedMode], score));
    if (changed && score) pulse('score',[{transform:'scale(1.14)'},{transform:'scale(1)'}],190);
    if (uiValues.misses !== misses) { [...$('lives').children].forEach((life,i)=>life.classList.toggle('lost',i<misses)); $('lives').setAttribute('aria-label',`剩余 ${Math.max(0,3-misses)} 次机会`); uiValues.misses = misses; }
    setText('time', Math.max(0,Math.ceil(remaining))); $('timer').classList.toggle('urgent', remaining <= 10);
    setText('wave-label', selectedMode === 'arcade' ? `狂热进度 ${sliced % 20} / 20` : selectedMode === 'zen' ? `已经切开 ${sliced} 个水果` : `连续命中 ${streak} 个 · 第 ${Math.max(1,wave)} 波`);
    $('frenzy-banner').hidden = frenzy <= 0; if (frenzy > 0) $('frenzy-progress').style.transform = `scaleX(${frenzy / 6})`;
  }
  function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); }
  function startGame() {
    initAudio(); closeDialogs(); helpPaused = false;
    score = misses = sliced = maxCombo = elapsed = wave = frenzy = shake = flash = 0;
    entities = []; pieces = []; particles = []; splats = []; texts = []; trails = []; pointer = null; stroke = [];
    lastSlice = -100; strokeTotal = 0; frenzyThreshold = 20; spawnIn = .1; remaining = modes[selectedMode].seconds;
    accumulator = slowMotion = missFlash = missNoticeLife = comboLife = cameraX = cameraY = missAlarms = dangerCues = streak = longestStreak = 0;
    impacts = []; lastDanger = -10; lastWhoosh = -1; lastTimerBeep = -1; $('miss-notice').hidden = true; $('combo-readout').hidden = true;
    priorRecord = records[selectedMode]; newRecord = false; countdown = 2.4; phase = 'countdown';
    arena.classList.add('playing'); $('menu').hidden = true; $('hud').hidden = false; $('arena-bottom').hidden = true;
    $('lives').hidden = selectedMode !== 'classic'; $('timer').hidden = selectedMode === 'classic'; $('mode-label').textContent = modes[selectedMode].name;
    $('game-tip').hidden = false; $('game-tip').textContent = modes[selectedMode].tip;
    $('countdown').hidden = false; $('countdown').textContent = '3'; syncUI();
    tone(440, .12, 'sine', .07); canvas.focus({ preventScroll: true });
  }
  function goHome() {
    closeDialogs(); phase = 'menu'; helpPaused = false; entities = []; pieces = []; particles = []; texts = []; splats = []; trails = []; pointer = null; stroke = [];
    $('menu').hidden = false; $('hud').hidden = true; $('arena-bottom').hidden = false; $('game-tip').hidden = true; $('countdown').hidden = true; $('frenzy-banner').hidden = true;
    arena.classList.remove('playing'); updateBest(); $('start-button').focus({ preventScroll: true });
    $('miss-notice').hidden = $('combo-readout').hidden = true; missFlash = 0; impacts = []; settingsPaused = false;
  }
  function pause() {
    if (phase !== 'playing' && phase !== 'countdown') return;
    phase = phase === 'countdown' ? 'paused-countdown' : 'paused'; pointer = null; finishStroke(); trails = []; $('pause-dialog').showModal();
  }
  function resume() { if (!['paused', 'paused-countdown'].includes(phase)) return; $('pause-dialog').close(); phase = phase === 'paused-countdown' ? 'countdown' : 'playing'; lastFrame = performance.now(); accumulator = 0; for(const e of entities){e.px=e.x;e.py=e.y;} }
  function finish(reason) {
    if (phase !== 'playing') return;
    phase = 'ending'; endDelay = .85; endReason = reason; pointer = null; finishStroke(); frenzy = 0;
    newRecord = score > priorRecord;
    if (score > records[selectedMode]) { records[selectedMode] = score; save(); }
    syncUI();
  }
  function showResults() {
    phase = 'result'; $('result-kicker').textContent = newRecord ? 'A NEW PERSONAL BEST' : 'NICELY SLICED';
    $('result-title').textContent = newRecord ? '新纪录，漂亮！' : score > 0 ? '这一刀，够痛快。' : '热个身，再来一次。';
    $('result-reason').textContent = endReason; $('result-score').textContent = score; $('result-fruits').textContent = sliced;
    $('result-combo').textContent = maxCombo; $('result-best').textContent = records[selectedMode]; $('result-dialog').showModal();
    if (newRecord) { tone(523, .25, 'triangle', .05); tone(659, .35, 'triangle', .04); tone(784, .5, 'triangle', .04); }
  }

  function gravity() { return H * 1.03; }
  function spawnWave() {
    wave++; const level = Math.min(elapsed / 65, 1.7), mobile = W < 600;
    const count = Math.min(mobile ? 4 : 5, 3 + Math.floor(rand(0, 2.9)) + Math.floor(level));
    const spread = mobile ? Math.min(W*.35,radiusFor('orange')*(count-1)*1.08) : Math.min(W*.24,220);
    const margin=radiusFor('watermelon')*1.2,center=clamp(rand(W*.29,W*.71),Math.min(W/2,spread+margin),Math.max(W/2,W-spread-margin)),g=gravity();
    const crest = rand(H * .29, H * .39);
    for (let i = 0; i < count; i++) {
      const type = fruitNames[Math.floor(rand(0,fruitNames.length))], r = radiusFor(type);
      const offset = (i - (count - 1)/2) / Math.max(1,(count-1)/2);
      const targetX = clamp(center + offset * spread, r * 1.22, W - r * 1.22);
      const x = clamp(center + offset * spread * (mobile ? 1 : wave % 3 === 0 ? .4 : .85), r * 1.2, W-r*1.2);
      const y = H+r+12, peak = crest + Math.abs(offset) * H * .09, vy = -Math.sqrt(2*g*(y-peak));
      entities.push({id:Math.random(),type,x,y,px:x,py:y,r,vx:(targetX-x)/(-vy/g),vy,a:rand(-.7,.7),spin:rand(-1.15,1.15),bomb:false,dead:false,warned:false});
    }
    const bombsAllowed = selectedMode !== 'zen' && wave > 2 && frenzy <= 0;
    if (bombsAllowed && Math.random() < (selectedMode === 'classic' ? .45 : .4)) {
      const r=radiusFor('bomb'), x=center>W*.5 ? r*1.65 : W-r*1.65, y=H+r+10;
      const peak=rand(H*.35,H*.49), vy=-Math.sqrt(2*g*(y-peak));
      entities.push({id:Math.random(),type:'bomb',x,y,px:x,py:y,r,vx:0,vy,a:rand(-.4,.4),spin:rand(-.5,.5),bomb:true,dead:false});
    }
    spawnIn = frenzy > 0 ? .64 : Math.max(1, rand(1.48,1.82)-level*.18);
    if (wave === 1) tone(260, .12, 'triangle', .035, 520);
  }
  function addText(text, x, y, color = '#ffe8b6', size = 25, life = .85) { texts.push({ text, x, y, color, size, life, maxLife: life }); }
  function segmentDistance(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
    const t = length ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / length, 0, 1) : 0;
    return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
  }
  function juice(e, angle, speed = 900) {
    const color = fruits[e.type].juice;
    const force = clamp(speed / 1400, .65, 1.5), count = lightEffects() ? 15 : 32;
    for (let i = 0; i < count; i++) {
      const a = i % 3 ? angle + (i%2 ? 0 : Math.PI) + rand(-.8,.8) : rand(0,TAU), v=rand(95,360)*force;
      const life=rand(.32,.78);
      particles.push({x:e.x,y:e.y,vx:Math.cos(a)*v+e.vx*.2,vy:Math.sin(a)*v+e.vy*.1,r:rand(1.8,6.8),life,maxLife:life,color,kind:i%5===0?'spark':'juice'});
    }
    impacts.push({x:e.x,y:e.y,r:e.r,angle,life:.26,maxLife:.26,color});
    const spots = []; for (let i = 0; i < 9; i++) spots.push({ x: rand(-e.r * 1.8, e.r * 1.8), y: rand(-e.r * 1.2, e.r * 1.2), r: rand(2, e.r * .32) });
    splats.push({ x: e.x, y: e.y, r: e.r, color, life: 6, spots }); if (splats.length > 35) splats.shift();
    for (const side of [-1, 1]) {
      const x=e.x+Math.cos(angle+Math.PI/2)*side*4, y=e.y+Math.sin(angle+Math.PI/2)*side*4;
      pieces.push({ type:e.type,x,y,px:x,py:y,r:e.r,vx:e.vx+Math.cos(angle+Math.PI/2)*side*165*force,vy:e.vy*.36+Math.sin(angle+Math.PI/2)*side*130*force-60,
        a:e.a,cutAngle:angle-e.a,side,spin:e.spin+side*rand(1.7,3),life:1.65 });
    }
    if (pieces.length > 60) pieces.splice(0, pieces.length - 60);
    if (particles.length > 650) particles.splice(0, particles.length - 650);
  }
  function sliceEntity(e, angle, speed = 900) {
    if (e.dead || phase !== 'playing') return;
    e.dead = true;
    if (e.bomb) {
      flash = .7; shake = motionEnabled() ? 9 : 0; noise(.55, .3, 800, e.x); tone(100, .45, 'sawtooth', .09, 25,0,e.x); haptic([70,30,90]); streak = 0;
      for (let i = 0; i < 45; i++) { const a = rand(0, TAU), speed = rand(60, 460); particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: rand(2, 9), life: .8, maxLife: .8, color: i % 2 ? '#ffcf6b' : '#6d665a' }); }
      finishStroke(); lastSlice = -100;
      if (selectedMode === 'classic') finish('碰到炸弹了。下一刀，记得躲开它。');
      else { score = Math.max(0, score - 10); addText('炸弹 −10', e.x, e.y - 45, '#ff9475', 28, 1.1); syncUI(); }
      return;
    }
    if (elapsed - lastSlice > COMBO_GAP) finishStroke();
    lastSlice = elapsed; sliced++; strokeTotal++; streak++; longestStreak=Math.max(longestStreak,streak);
    const points = frenzy > 0 ? 2 : 1; score += points;
    stroke.push({ x: e.x, y: e.y, multiplier: points }); maxCombo = Math.max(maxCombo, stroke.length);
    const visible=renderPosition(e); e.x=visible.x; e.y=visible.y;
    juice(e, angle, speed);
    if(stroke.length<3) addText(`+${points}`,e.x,e.y-e.r*.5,'#fff2c6',25,.55);
    sliceSound(e,stroke.length); haptic(9);
    if(stroke.length>=3){setText('combo-value',stroke.length);$('combo-readout').hidden=false;comboLife=.65; pulse('combo-readout',[{transform:'translateX(-50%) rotate(-5deg) scale(1.18)'},{transform:'translateX(-50%) rotate(-5deg) scale(1)'}],200);}
    if (selectedMode === 'arcade' && sliced >= frenzyThreshold) {
      frenzyThreshold += 20; frenzy = 6;
      for (const item of entities) if (item.bomb && !item.dead) { item.dead = true; addText('炸弹退场', item.x, item.y, '#cfdfa3', 16, .75); }
      tone(660, .18, 'triangle', .06); tone(880, .28, 'triangle', .045);
    }
    syncUI();
  }
  function finishStroke() {
    if (stroke.length >= 3) {
      const n = stroke.length, bonus = stroke.reduce((total,p)=>total+(p.multiplier||1),0);
      score += bonus;
      const x = clamp(stroke.reduce((sum, p) => sum + p.x, 0) / n, 85, W - 85);
      const y = clamp(stroke.reduce((sum, p) => sum + p.y, 0) / n, 100, H - 100);
      addText(n>=6?'一刀过瘾！':`${n} 连击！`,x,y-34,'#ecf2a1',n>5?39:31,1.05); addText(`奖励 +${bonus}`,x,y+7,'#ffe8b1',20,.95);
      tone(523,.22,'triangle',.07);tone(659,.25,'triangle',.055,659,.035);tone(784,.32,'triangle',.045,784,.07);
      if(motionEnabled()){shake=Math.max(shake,Math.min(4.5,n*.6));slowMotion=.16;} haptic([14,25,20]);
    }
    stroke = []; syncUI();
  }

  function pointerPosition(event) { const r = gestureRect || canvas.getBoundingClientRect(); return {x:(event.clientX-r.left)*W/r.width-cameraX,y:(event.clientY-r.top)*H/r.height-cameraY}; }
  canvas.addEventListener('pointerdown', e => {
    if (phase !== 'playing' || e.button !== 0 || pointer) return;
    e.preventDefault(); initAudio(); gestureRect=canvas.getBoundingClientRect(); const p=pointerPosition(e); pointer={...p,id:e.pointerId,stamp:e.timeStamp||performance.now()}; trails=[];strokeTotal=0;finishStroke();
    trails.push({...p,life:.15,width:2});canvas.setPointerCapture(e.pointerId);
  });
  function moveBlade(event) {
    if(!pointer||phase!=='playing')return;
    const p=pointerPosition(event), previous={x:pointer.x,y:pointer.y};
    const distance=Math.hypot(p.x-previous.x,p.y-previous.y); if(distance<.5)return;
    const stamp=event.timeStamp||performance.now(),speed=clamp(distance/Math.max(.001,(stamp-pointer.stamp)/1000),100,4800);
    const angle=Math.atan2(p.y-previous.y,p.x-previous.x);
    // Hit the same interpolated positions the player sees, following every input sample.
    const hits=entities.filter(e=>!e.dead&&segmentDistance(renderPosition(e),previous,p)<=e.r*(e.bomb ? .83 : 1.02));
    hits.sort((a,b)=>Math.hypot(a.x-previous.x,a.y-previous.y)-Math.hypot(b.x-previous.x,b.y-previous.y));
    for(const e of hits){if(phase!=='playing')break;sliceEntity(e,angle,speed);}
    const steps=Math.min(20,Math.max(1,Math.ceil(distance/13)));
    for(let i=1;i<=steps;i++)trails.push({x:previous.x+(p.x-previous.x)*i/steps,y:previous.y+(p.y-previous.y)*i/steps,life:.15,width:clamp(speed/320,3,10)});
    if(trails.length>76)trails.splice(0,trails.length-76);
    if(distance>14&&elapsed-lastWhoosh>.1){noise(.08,.03,5000,p.x);lastWhoosh=elapsed;}
    if(pointer){pointer.x=p.x;pointer.y=p.y;pointer.stamp=stamp;}
  }
  canvas.addEventListener('pointermove', e => {
    if(!pointer||pointer.id!==e.pointerId||phase!=='playing')return;
    e.preventDefault(); let samples=[];try{samples=e.getCoalescedEvents?.()||[];}catch{}
    for(const sample of samples)moveBlade(sample);
    moveBlade(e);
  });
  function endPointer(e) { if(pointer&&(e.pointerId===undefined||e.pointerId===pointer.id)){if(e.type==='pointerup'&&Number.isFinite(e.clientX))moveBlade(e);pointer=null;gestureRect=null;finishStroke();} }
  canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer); canvas.addEventListener('lostpointercapture', endPointer);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  function stepWorld(dt) {
    const g=gravity();
    if(phase==='playing'){spawnIn-=dt;if(spawnIn<=0)spawnWave();}
    for(const e of entities){
      if(e.dead)continue;
      e.px=e.x;e.py=e.y;e.pa=e.a;
      e.x+=e.vx*dt;e.y+=e.vy*dt+g*dt*dt*.5;e.vy+=g*dt;e.a+=e.spin*dt;
      if(e.x<e.r&&e.vx<0)e.vx*= -.8;if(e.x>W-e.r&&e.vx>0)e.vx*= -.8;
      if(!e.bomb&&selectedMode==='classic'&&phase==='playing'&&e.vy>0){
        const toEdge=(-e.vy+Math.sqrt(e.vy*e.vy+2*g*Math.max(0,H+e.r-e.y)))/g;
        if(!e.warned&&toEdge<.43){e.warned=true;dangerCues++;if(elapsed-lastDanger>.3){tone(880,.065,'sine',.055,800,0,e.x);lastDanger=elapsed;}}
      }
      if(e.y>H+e.r*1.15&&e.vy>0){
        e.dead=true;
        if(!e.bomb&&selectedMode==='classic'&&phase==='playing'){
          misses=Math.min(3,misses+1);streak=0;missFlash=.85;missNoticeLife=1.4;
          setText('miss-notice',misses<3?`漏果了 · 还剩 ${3-misses} 次机会`:'漏果三次，本局结束');$('miss-notice').hidden=false;
          missAlarm(e.x);pulse('lives',[{transform:'scale(1.2)'},{transform:'scale(1)'}],300);
          if(misses>=3)finish('漏掉了 3 个水果。留意底部预警，下一刀接住它。');
        }
      }
    }
    entities=entities.filter(e=>!e.dead);
    for(const p of pieces){p.px=p.x;p.py=p.y;p.pa=p.a;p.x+=p.vx*dt;p.y+=p.vy*dt+g*dt*dt*.5;p.vy+=g*dt;p.a+=p.spin*dt;p.life-=dt;}
    pieces=pieces.filter(p=>p.life>0&&p.y<H+140);
  }

  function update(realDt) {
    if(phase==='countdown'){
      const old=Math.ceil(countdown/.8);countdown-=realDt;const next=Math.ceil(countdown/.8);
      if(countdown<=0){phase='playing';$('countdown').hidden=true;tone(880,.22,'triangle',.06);accumulator=0;}
      else if(old!==next){$('countdown').textContent=next;tone(440+(3-next)*100,.12,'sine',.06);}
      return;
    }
    if(phase!=='playing'&&phase!=='ending')return;
    if(phase==='playing'){
      // The round clock follows real active time, independently of frame rate and visual slow motion.
      elapsed+=realDt;remaining=Math.max(0,modes[selectedMode].seconds-elapsed);frenzy=Math.max(0,frenzy-realDt);
      if(stroke.length&&elapsed-lastSlice>COMBO_GAP)finishStroke();
      if(selectedMode==='arcade'&&remaining>0&&remaining<=5&&Math.ceil(remaining)!==lastTimerBeep){lastTimerBeep=Math.ceil(remaining);tone(550,.09,'sine',.08);pulse('timer',[{transform:'scale(1.13)'},{transform:'scale(1)'}]);}
      if(modes[selectedMode].seconds&&remaining<=0)finish('时间到！把这份手感留给下一局。');
    }else{endDelay-=realDt;if(endDelay<=0){showResults();return;}}
    const speed=slowMotion>0&&motionEnabled() ? .72 : 1;
    accumulator=Math.min(.3,accumulator+Math.min(realDt,.25)*speed);
    // A fixed 120Hz simulation plus interpolation keeps the same trajectories on 30/60/120Hz screens.
    while(accumulator>=FIXED_STEP){stepWorld(FIXED_STEP);accumulator-=FIXED_STEP;}
    renderAlpha=accumulator/FIXED_STEP;
    const dt=Math.min(realDt,.1),g=gravity();
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt+g*.28*dt*dt;p.vy+=g*.56*dt;p.life-=dt;}
    particles=particles.filter(p=>p.life>0);
    for(const p of impacts)p.life-=dt;impacts=impacts.filter(p=>p.life>0);
    for(const s of splats)s.life-=dt;splats=splats.filter(s=>s.life>0);
    for(const t of texts){t.life-=dt;t.y-=dt*36;}texts=texts.filter(t=>t.life>0);
    for(const t of trails)t.life-=dt;trails=trails.filter(t=>t.life>0);
    shake=Math.max(0,shake-dt*26);flash=Math.max(0,flash-dt*2.8);missFlash=Math.max(0,missFlash-dt*2);
    slowMotion=Math.max(0,slowMotion-realDt);comboLife=Math.max(0,comboLife-realDt);missNoticeLife=Math.max(0,missNoticeLife-realDt);
    $('combo-readout').hidden=comboLife<=0;$('miss-notice').hidden=missNoticeLife<=0;
    syncUI();
  }

  function drawPiece(p) {
    const pos=renderPosition(p);ctx.save();ctx.translate(pos.x,pos.y);ctx.rotate((p.pa??p.a)+(p.a-(p.pa??p.a))*renderAlpha);ctx.globalAlpha=Math.min(1,p.life*2);
    ctx.rotate(p.cutAngle); ctx.beginPath(); ctx.rect(-p.r * 1.7, p.side < 0 ? -p.r * 1.7 : 0, p.r * 3.4, p.r * 1.7); ctx.clip(); ctx.rotate(-p.cutAngle);
    drawFruit(ctx, p.type, 0, 0, p.r, 0, true); ctx.restore();
  }
  function drawHero(t) {
    const mobile = W <= 700, bob = reducedMotion ? 0 : Math.sin(t * 1.15) * 7;
    const scale = mobile ? Math.min(W / 510, .86) : Math.min(W / 1200, H / 700);
    const cx = mobile ? W * .86 : W * .73, cy = mobile ? H * .45 : H * .38;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale);
    // Juice suspended in a frozen, oversized hero slice.
    const rng = seeded(222); ctx.globalAlpha = .8;
    for (let i = 0; i < 24; i++) { const x = randHero(rng, -175, 155), y = randHero(rng, -120, 125); ellipse(ctx, x, y + bob * .3, randHero(rng, 1.5, 5), randHero(rng, 2, 9), i % 3 ? '#f78c47' : '#d7de75', -.55); }
    ctx.globalAlpha = 1;
    if (!mobile) {
      ctx.save(); ctx.rotate(-.5); ctx.fillStyle = '#17211035'; ctx.font = 'italic 16px Georgia,serif'; ctx.fillText('freshly sliced', 105, 107); ctx.restore();
      drawFruit(ctx, 'apple', -165, 99 - bob * .7, 58, -.5 + Math.sin(t * .7) * .08);
      drawFruit(ctx, 'plum', 139, -98 + bob, 36, .4);
    }
    ctx.save(); ctx.shadowColor = '#0c070577'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 20;
    drawFruit(ctx, 'watermelon', -13, -39 + bob, mobile ? 73 : 113, -.3 + (reducedMotion ? 0 : Math.sin(t * .5) * .04), true); ctx.restore();
    // A displaced top wedge makes the watermelon visibly sliced.
    const hr = mobile ? 73 : 113;
    ctx.save(); ctx.translate(-21, -58 + bob); ctx.rotate(-.34); ctx.beginPath(); ctx.rect(-hr * 1.3, -hr * 1.3, hr * 2.6, hr * .93); ctx.clip(); drawFruit(ctx, 'watermelon', 0, 0, hr, 0, true); ctx.restore();
    drawFruit(ctx, 'orange', mobile ? -24 : 99, (mobile ? 113 : 106) - bob * .9, mobile ? 49 : 75, .22 + Math.sin(t * .6) * .06, true);
    drawFruit(ctx, 'strawberry', mobile ? -77 : 145, mobile ? -119 : -5 + bob * .8, mobile ? 29 : 48, .4);
    drawFruit(ctx, 'kiwi', mobile ? -68 : -62, mobile ? 198 : 170 + bob * .6, mobile ? 30 : 47, -.55, true);
    // Hand-painted, tapered blade trail.
    ctx.save(); ctx.rotate(-.41); const grad = ctx.createLinearGradient(-210, 0, 220, 0); grad.addColorStop(0, '#fffad000'); grad.addColorStop(.4, '#ffffef'); grad.addColorStop(.78, '#fffced'); grad.addColorStop(1, '#fffad000');
    ctx.fillStyle = grad; ctx.shadowColor = '#ffe4a4'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(-240, 6); ctx.quadraticCurveTo(-10, 1, 220, -30); ctx.quadraticCurveTo(42, -6, -240, 6); ctx.fill(); ctx.restore();
    leaf(ctx, mobile ? 49 : -132, mobile ? 152 : -119, -.55 + Math.sin(t) * .06, mobile ? 31 : 48);
    if (!mobile) { ctx.fillStyle = '#d2b48b'; ctx.font = '11px Microsoft YaHei, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('好手感，从第一刀开始', 3, 241); }
    ctx.restore();
  }
  function randHero(rng, a, b) { return a + rng() * (b - a); }
  function drawBlade() {
    if(trails.length<2)return;
    const left=[],right=[];
    for(let i=0;i<trails.length;i++){
      const p=trails[i],a=trails[Math.max(0,i-1)],b=trails[Math.min(trails.length-1,i+1)];
      const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
      const width=p.width*Math.pow(clamp(p.life/.15,0,1),.7)*Math.min(1,(i+1)/5);
      left.push({x:p.x-dy/len*width,y:p.y+dx/len*width});right.push({x:p.x+dy/len*width,y:p.y-dx/len*width});
    }
    ctx.fillStyle=bladeColors[prefs.blade];ctx.globalAlpha=.32;ctx.beginPath();
    left.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));for(let i=right.length-1;i>=0;i--)ctx.lineTo(right[i].x,right[i].y);ctx.closePath();ctx.fill();
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=bladeColors[prefs.blade];ctx.lineWidth=5;ctx.globalAlpha=.82;
    ctx.beginPath();ctx.moveTo(trails[0].x,trails[0].y);
    for(let i=1;i<trails.length-1;i++){const p=trails[i],next=trails[i+1];ctx.quadraticCurveTo(p.x,p.y,(p.x+next.x)*.5,(p.y+next.y)*.5);}
    const end=trails[trails.length-1];ctx.lineTo(end.x,end.y);ctx.stroke();ctx.strokeStyle='#fffdf1';ctx.lineWidth=2.1;ctx.stroke();ctx.globalAlpha=1;
  }

  function draw(t) {
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
    if(phase==='menu'){drawHero(t);$('flash').style.opacity=0;$('miss-flash').style.opacity=0;return;}
    cameraX=motionEnabled()?Math.sin(t*83)*shake:0;cameraY=motionEnabled()?Math.cos(t*69)*shake*.45:0;
    ctx.save();ctx.translate(cameraX,cameraY);
    for(const s of splats){ctx.globalAlpha=Math.min(.24,s.life*.07);for(const p of s.spots)ellipse(ctx,s.x+p.x,s.y+p.y,p.r*1.25,p.r,s.color);ellipse(ctx,s.x,s.y,s.r*.45,s.r*.28,s.color,-.3);}
    ctx.globalAlpha=1;
    for(const p of pieces)drawPiece(p);
    for(const e of entities){
      if(e.dead)continue;const p=renderPosition(e),a=(e.pa??e.a)+(e.a-(e.pa??e.a))*renderAlpha;
      if(e.bomb)drawBomb(ctx,{...e,...p,a},t);else drawFruit(ctx,e.type,p.x,p.y,e.r,a);
      if(e.warned&&selectedMode==='classic'){
        const pulse=.55+Math.sin(t*19)*.25;
        ctx.globalAlpha=pulse;ctx.strokeStyle='#ffa184';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(p.x,p.y,e.r*1.17,0,TAU);ctx.stroke();
        ctx.fillStyle='#ff8e70';const x=clamp(p.x,22,W-22);ctx.beginPath();ctx.moveTo(x-7,H-28);ctx.lineTo(x,H-36);ctx.lineTo(x+7,H-28);ctx.fill();ctx.globalAlpha=1;
      }
    }
    for(const hit of impacts){
      const progress=1-hit.life/hit.maxLife;ctx.save();ctx.translate(hit.x,hit.y);ctx.rotate(hit.angle);
      ctx.globalAlpha=(1-progress)*.85;ctx.strokeStyle='#fff7d5';ctx.lineWidth=2.2*(1-progress);
      ctx.beginPath();ctx.ellipse(0,0,hit.r*(.55+progress),hit.r*(.2+progress*.5),0,0,TAU);ctx.stroke();
      ctx.globalAlpha=(1-progress)*.9;ctx.fillStyle='#fff6dd';ctx.beginPath();ctx.moveTo(-hit.r*(1+progress),0);ctx.lineTo(0,-4*(1-progress));ctx.lineTo(hit.r*(1+progress),0);ctx.lineTo(0,4*(1-progress));ctx.fill();ctx.restore();
    }
    for(const p of particles){
      ctx.globalAlpha=Math.min(1,p.life/p.maxLife*1.7);
      if(p.kind==='spark'){ctx.strokeStyle='#fff1bf';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.016,p.y-p.vy*.016);ctx.stroke();}
      else ellipse(ctx,p.x,p.y,p.r*(.8+p.life/p.maxLife*.2),p.r*.64,p.color,Math.atan2(p.vy,p.vx));
    }
    ctx.globalAlpha=1;drawBlade();
    if(pointer){ellipse(ctx,pointer.x,pointer.y,8,8,bladeColors[prefs.blade]+'33');ellipse(ctx,pointer.x,pointer.y,3.1,3.1,'#fffdeb');}
    ctx.textAlign='center';ctx.textBaseline='middle';
    for(const item of texts){
      ctx.globalAlpha=clamp(item.life/.2,0,1);const progress=1-item.life/item.maxLife,scale=1+Math.max(0,.14-progress)*1.1;
      ctx.save();ctx.translate(item.x,item.y);ctx.scale(scale,scale);ctx.font=`800 ${item.size}px "Microsoft YaHei",sans-serif`;ctx.lineWidth=3;ctx.strokeStyle='#372b1acc';ctx.strokeText(item.text,0,0);ctx.fillStyle=item.color;ctx.fillText(item.text,0,0);ctx.restore();
    }
    ctx.restore();$('flash').style.opacity=flash*.4;$('miss-flash').style.opacity=missFlash;
    if(missNoticeLife>0)$('miss-notice').style.opacity=Math.min(1,missNoticeLife/.25);
  }
  function frame(now) {
    const dt=Math.max(0,(now-(lastFrame||now))/1000);lastFrame=now;
    if(!document.hidden){
      avgFrame=avgFrame*.97+Math.min(dt,.1)*.03;
      ambientTime+=Math.min(dt,.1);update(dt);
      if(!['paused','paused-countdown','result'].includes(phase))draw(ambientTime);
    }
    requestAnimationFrame(frame);
  }

  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => selectMode(button.dataset.mode)));
  $('volume').value=Math.round(prefs.volume*100);$('quality').value=prefs.quality;$('motion').checked=prefs.motion&&!reducedMotion;$('blade').value=prefs.blade;
  $('settings-button').addEventListener('click',()=>{if(phase==='playing'||phase==='countdown'){pause();$('pause-dialog').close();settingsPaused=true;}$('settings-dialog').showModal();});
  function closeSettings(){$('settings-dialog').close();if(settingsPaused){settingsPaused=false;$('pause-dialog').showModal();}}
  $('close-settings').addEventListener('click',closeSettings);$('settings-done').addEventListener('click',closeSettings);
  $('settings-dialog').addEventListener('cancel',e=>{e.preventDefault();closeSettings();});
  $('volume').addEventListener('input',e=>{prefs.volume=clamp(Number(e.target.value)/100,0,1);if(masterGain)masterGain.gain.setTargetAtTime(soundOn?prefs.volume:0,audioCtx.currentTime,.015);save();});
  $('volume').addEventListener('change',()=>{initAudio();tone(620,.1,'sine',.12);});
  $('quality').addEventListener('change',e=>{prefs.quality=e.target.value;save();});
  $('motion').addEventListener('change',e=>{prefs.motion=e.target.checked;save();});
  $('blade').addEventListener('change',e=>{prefs.blade=e.target.value;save();});
  $('start-button').addEventListener('click', startGame); $('restart-button').addEventListener('click', startGame);
  $('pause-button').addEventListener('click', pause); $('resume-button').addEventListener('click', resume);
  $('pause-home').addEventListener('click', goHome); $('result-home').addEventListener('click', goHome);
  $('brand').addEventListener('click', e => { e.preventDefault(); if (phase === 'menu' || phase === 'result') goHome(); else pause(); });
  $('sound-button').addEventListener('click', toggleSound);
  $('help-button').addEventListener('click', () => {
    if (phase === 'playing' || phase === 'countdown') { pause(); $('pause-dialog').close(); helpPaused = true; }
    $('help-dialog').showModal();
  });
  function closeHelp() { $('help-dialog').close(); if (helpPaused) { helpPaused = false; $('pause-dialog').showModal(); } }
  $('close-help').addEventListener('click', closeHelp);
  $('help-dialog').addEventListener('cancel', e => { e.preventDefault(); closeHelp(); });
  $('pause-dialog').addEventListener('cancel', e => { e.preventDefault(); resume(); });
  $('result-dialog').addEventListener('cancel', e => { e.preventDefault(); goHome(); });
  $('fullscreen-button').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await arena.requestFullscreen(); } catch { $('fullscreen-button').title = '当前浏览器不支持全屏，请使用浏览器全屏功能'; }
  });
  document.addEventListener('fullscreenchange', () => { $('fullscreen-button').setAttribute('aria-label', document.fullscreenElement ? '退出全屏' : '全屏游戏'); });
  document.addEventListener('keydown', e => {
    if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); toggleSound(); return; }
    if (e.code === 'Escape') { if (!document.querySelector('dialog[open]')) { e.preventDefault(); pause(); } return; }
    if (e.code === 'Space' && !document.querySelector('dialog[open]') && (phase === 'playing' || phase === 'countdown')) { e.preventDefault(); pause(); }
    else if (e.code === 'Space' && ['paused', 'paused-countdown'].includes(phase) && $('pause-dialog').open) { e.preventDefault(); resume(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);
  // Some touch browsers suppress the next synthetic click immediately after a swipe.
  // Activate a stationary finger release directly and consume only its duplicate native click.
  document.querySelectorAll('button').forEach(button=>{
    let press=null,lastTouch=-1000;
    button.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')press={id:e.pointerId,x:e.clientX,y:e.clientY};});
    button.addEventListener('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>12)press=null;});
    button.addEventListener('pointercancel',()=>{press=null;});
    button.addEventListener('pointerup',e=>{
      if(!press||press.id!==e.pointerId||button.disabled)return;
      press=null;lastTouch=performance.now();e.preventDefault();button.click();
    });
    button.addEventListener('click',e=>{if(e.isTrusted&&e.pointerType==='touch'&&performance.now()-lastTouch<600){e.preventDefault();e.stopImmediatePropagation();}},true);
  });
  // Read-only diagnostics, enabled explicitly for local browser verification.
  if (new URLSearchParams(location.search).has('test')) {
    window.fruitNinjaSnapshot = () => ({phase,selectedMode,score,misses,sliced,maxCombo,elapsed,remaining,frenzy,wave,W,H,records:{...records},prefs:{...prefs},missAlarms,dangerCues,longestStreak,effects:{particles:particles.length,pieces:pieces.length,impacts:impacts.length},entities:entities.map(e=>({...e,...renderPosition(e)}))});
  }
  setSound(); updateBest(); resize(); requestAnimationFrame(frame);
})();
