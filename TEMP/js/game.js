'use strict';

const VERSION = 'v1.8';

// ── Level visual assets ────────────────────────────────────────
const BIOMES = ['forest', 'desert', 'snow', 'mountain', 'desolation'];
const LEVELS_BASE = 'assets/levels';
const PLATFORMS_BASE = 'assets/platforms';

function loadImage(src){
  const img = new Image();
  img.src = src;
  return img;
}

// New per-biome platform tileset sheets (white background is keyed out at runtime).
const BIOME_PLATFORM_SHEET_SRCS = {
  forest:     `${PLATFORMS_BASE}/forest-sheet.png`,
  desert:     `${PLATFORMS_BASE}/desert-sheet.png`,
  snow:       `${PLATFORMS_BASE}/snow-sheet.png`,
  mountain:   `${PLATFORMS_BASE}/mountain-sheet.png`,
  desolation: `${PLATFORMS_BASE}/desolation-sheet.png`,
};

const PLATFORM_TILE_COORDS = {
  floating:       { row: 0, col: 1 },
  groundPlatform: { row: 0, col: 0 },
  ground:         { row: 2, col: 1 },
  pillar:         { row: 3, col: 1 },
};

function makeCanvas(w, h){
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function extractTilesFromSheet(sheetImg){
  const w = sheetImg.naturalWidth || sheetImg.width;
  const h = sheetImg.naturalHeight || sheetImg.height;
  if(!w || !h) return null;

  const srcCanvas = makeCanvas(w, h);
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  srcCtx.drawImage(sheetImg, 0, 0);

  const imgData = srcCtx.getImageData(0, 0, w, h);
  const px = imgData.data;

  // Convert sheet backdrop (white/light gray) to transparency.
  // We infer backdrop color from the four corners to support variants.
  const corners = [
    0,
    (w - 1) << 2,
    ((h - 1) * w) << 2,
    (((h - 1) * w + (w - 1)) << 2),
  ];
  let bgR = 0, bgG = 0, bgB = 0;
  for(const ci of corners){
    bgR += px[ci];
    bgG += px[ci + 1];
    bgB += px[ci + 2];
  }
  bgR = Math.round(bgR / corners.length);
  bgG = Math.round(bgG / corners.length);
  bgB = Math.round(bgB / corners.length);

  function isBackdrop(r, g, b){
    // Near the sampled background color, and near-neutral (R≈G≈B).
    const d = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
    const neutral = Math.max(r, g, b) - Math.min(r, g, b) <= 18;
    return neutral && d <= 70;
  }

  for(let i = 0; i < px.length; i += 4){
    if(isBackdrop(px[i], px[i + 1], px[i + 2])){
      px[i + 3] = 0;
    }
  }
  srcCtx.putImageData(imgData, 0, 0);

  const visited = new Uint8Array(w * h);
  const boxes = [];
  const stack = [];

  function alphaAt(pos){
    return px[(pos << 2) + 3];
  }

  for(let y = 0; y < h; y++){
    for(let x = 0; x < w; x++){
      const start = y * w + x;
      if(visited[start] || !alphaAt(start)) continue;

      let minX = x, maxX = x, minY = y, maxY = y, area = 0;
      stack.push(start);

      while(stack.length){
        const pos = stack.pop();
        if(visited[pos]) continue;
        visited[pos] = 1;
        if(!alphaAt(pos)) continue;

        const py = Math.floor(pos / w);
        const px2 = pos - py * w;
        area++;
        if(px2 < minX) minX = px2;
        if(px2 > maxX) maxX = px2;
        if(py < minY) minY = py;
        if(py > maxY) maxY = py;

        if(px2 > 0) stack.push(pos - 1);
        if(px2 < w - 1) stack.push(pos + 1);
        if(py > 0) stack.push(pos - w);
        if(py < h - 1) stack.push(pos + w);
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      if(area > 700 && bw > 40 && bh > 30){
        boxes.push({
          x: minX,
          y: minY,
          w: bw,
          h: bh,
          cx: minX + bw / 2,
          cy: minY + bh / 2,
        });
      }
    }
  }

  if(!boxes.length) return null;

  boxes.sort((a, b) => (a.cy - b.cy) || (a.cx - b.cx));
  const rows = [];
  for(const box of boxes){
    const row = rows.find(r => Math.abs(r.cy - box.cy) <= 70);
    if(row){
      row.items.push(box);
      row.cy = (row.cy * (row.items.length - 1) + box.cy) / row.items.length;
    } else {
      rows.push({ cy: box.cy, items: [box] });
    }
  }
  rows.sort((a, b) => a.cy - b.cy);
  for(const row of rows) row.items.sort((a, b) => a.cx - b.cx);

  const out = {};
  Object.entries(PLATFORM_TILE_COORDS).forEach(([key, pos]) => {
    const row = rows[pos.row];
    const box = row && row.items[pos.col];
    if(!box) return;
    const tile = makeCanvas(box.w, box.h);
    const tctx = tile.getContext('2d');
    tctx.drawImage(srcCanvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    out[key] = tile;
  });

  return out;
}

const biomeImages = {};
BIOMES.forEach((biome) => {
  biomeImages[biome] = {
    background:     loadImage(`${LEVELS_BASE}/${biome}/background.png`),
    // Terrain visuals come from platform sheets only.
    floating:       null,
    groundPlatform: null,
    ground:         null,
    pillar:         null,
  };

  const sheetSrc = BIOME_PLATFORM_SHEET_SRCS[biome];
  if(sheetSrc){
    const sheetImg = new Image();
    sheetImg.onload = () => {
      const tiles = extractTilesFromSheet(sheetImg);
      if(!tiles) return;
      if(tiles.floating)       biomeImages[biome].floating = tiles.floating;
      if(tiles.groundPlatform) biomeImages[biome].groundPlatform = tiles.groundPlatform;
      if(tiles.ground)         biomeImages[biome].ground = tiles.ground;
      if(tiles.pillar)         biomeImages[biome].pillar = tiles.pillar;
    };
    sheetImg.src = sheetSrc;
  }
});

const commonLevelImages = {
  tower:          loadImage(`${LEVELS_BASE}/common/tower.png`),
  towerInside:    loadImage(`${LEVELS_BASE}/common/tower-inside.png`),
  castleLocked:   loadImage(`${LEVELS_BASE}/common/castle-locked.png`),
  castleUnlocked: loadImage(`${LEVELS_BASE}/common/castle-unlocked.png`),
};

function readyImage(img){
  if(!img) return null;
  if(typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement){
    return img.width > 0 && img.height > 0 ? img : null;
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

function getBiomeImg(biome, key){
  const imgs = biomeImages[biome] || biomeImages.forest;
  return readyImage(imgs[key]);
}

function getLevelBiome(lvlIdx){
  const idx = typeof lvlIdx === 'number' ? lvlIdx : (typeof GS !== 'undefined' ? GS.level : 0);
  const lvl = LEVELS[idx] || LEVELS[0];
  return (lvl && lvl.biome) || 'forest';
}

function getLevelBgImage(lvlIdx){
  return getBiomeImg(getLevelBiome(lvlIdx), 'background');
}

function getGateImg(isLocked){
  return readyImage(isLocked ? commonLevelImages.castleLocked : commonLevelImages.castleUnlocked);
}

// ════════════════════════════════════════════════════════════════
//  HERO SPRITE LOADER (knight / mage / ninja / pirate)
// ════════════════════════════════════════════════════════════════

const HERO_BASES = {
  knight: 'assets/heroes/paladin/',
  mage:   'assets/heroes/mage/',
  ninja:  'assets/heroes/ninja/',
  pirate: 'assets/heroes/pirate/',
};
const HERO_SPRITES = {
  knight: { idle:{}, run:{}, jump:{}, ready: false },
  mage:   { idle:{}, run:{}, jump:{}, ready: false },
  ninja:  { idle:{}, run:{}, jump:{}, ready: false },
  pirate: { idle:{}, run:{}, jump:{}, ready: false },
};

function loadHeroSprites(id, runFrames, jumpFrames){
  const base = HERO_BASES[id];
  const spr  = HERO_SPRITES[id];

  function img(src){
    const i = new Image();
    i.src = base + src;
    return i;
  }
  function imgPromise(src){
    const i = new Image();
    const p = new Promise(r => { i.onload = r; i.onerror = r; });
    i.src = base + src;
    return {i, p};
  }

  // Idle sprites — mark ready as soon as these load
  const {i: idleR, p: pIdleR} = imgPromise('rotations/east.png');
  const {i: idleL, p: pIdleL} = imgPromise('rotations/west.png');
  spr.idle.right = idleR;
  spr.idle.left  = idleL;
  Promise.all([pIdleR, pIdleL]).then(()=>{
    spr.ready = true;
  });

  // Run + jump frames loaded separately (may 404 — graceful fallback in drawPlayerAdv)
  spr.run.right = []; spr.run.left = [];
  for(let i=0;i<runFrames;i++){
    const pad = String(i).padStart(3,'0');
    spr.run.right.push(img('animations/running-6-frames/south-east/frame_'+pad+'.png'));
    spr.run.left.push(img('animations/running-6-frames/south-west/frame_'+pad+'.png'));
  }
  spr.jump.right = []; spr.jump.left = [];
  for(let i=0;i<jumpFrames;i++){
    const pad = String(i).padStart(3,'0');
    spr.jump.right.push(img('animations/jumping-2/south-east/frame_'+pad+'.png'));
    spr.jump.left.push(img('animations/jumping-2/south-west/frame_'+pad+'.png'));
  }
}

loadHeroSprites('knight', 6, 8);
loadHeroSprites('mage',   6, 8);
loadHeroSprites('ninja',  6, 8);
loadHeroSprites('pirate', 6, 8);

// ════════════════════════════════════════════════════════════════
//  BIOME ENEMY SPRITE LOADERS
// ════════════════════════════════════════════════════════════════

function makeSpriteLoader(base, frames, walkDir='animations/walking-6-frames'){
  const sprites = { east: [], west: [] };
  let ready = false;
  (function(){
    const toLoad = [];
    function img(src){
      const i = new Image();
      const p = new Promise(r => { i.onload = r; i.onerror = r; });
      i.src = base + src;
      toLoad.push(p);
      return i;
    }
    for(let i=0;i<frames;i++){
      const pad = String(i).padStart(3,'0');
      sprites.east.push(img(walkDir + '/east/frame_'+pad+'.png'));
      sprites.west.push(img(walkDir + '/west/frame_'+pad+'.png'));
    }
    Promise.all(toLoad).then(()=>{ ready = true; });
  })();
  return { sprites, isReady(){ return ready; } };
}

const FOREST_SPRITE_LOADER       = makeSpriteLoader('assets/enemies/forest-sprite/', 6);
const FOREST_GOBLIN_GREEN_LOADER = makeSpriteLoader('assets/enemies/forest-goblin-green/', 6);
const DESERT_SCORPION_LOADER     = makeSpriteLoader('assets/enemies/desert-scorpion/', 6);
const DESERT_MUMMY_LOADER        = makeSpriteLoader('assets/enemies/desert-mummy/', 6);
const MOUNTAIN_TROLL_LOADER      = makeSpriteLoader('assets/enemies/mountain-troll/', 6);
const MOUNTAIN_DWARF_LOADER      = makeSpriteLoader('assets/enemies/mountain-dwarf/', 6);
const FROST_ZOMBIE_LOADER        = makeSpriteLoader('assets/enemies/frost-zombie/', 6);
const SNOW_YETI_LOADER           = makeSpriteLoader('assets/enemies/snow-yeti/', 6);
const DESOLATION_SKELETON_LOADER = makeSpriteLoader('assets/enemies/desolation-skeleton/', 6);
const DESOLATION_WRAITH_LOADER   = makeSpriteLoader('assets/enemies/desolation-wraith/', 6, 'animations/walking');

const BIOME_DIRECTIONAL_ENEMIES = new Set([
  'forest-sprite',
  'forest-goblin-green',
  'desert-scorpion',
  'desert-mummy',
  'mountain-troll',
  'mountain-dwarf',
  'snow-yeti',
  'frost-zombie',
  'desolation-skeleton',
  'desolation-wraith',
]);

// ════════════════════════════════════════════════════════════════
//  CANVAS
// ════════════════════════════════════════════════════════════════

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const W = 480, H = 640;
canvas.width  = W;
canvas.height = H;

// ════════════════════════════════════════════════════════════════
//  ÉTAT DU JEU
// ════════════════════════════════════════════════════════════════

const GS = {
  screen : 'start', // 'game' | 'question' | 'levelComplete' | 'gameOver' | 'win'
  paused : false,
  level  : 0,
  lives  : 3,
  score  : 0,
  total  : 0,
  stars  : 0,
  maxStars: 0,
};

// ════════════════════════════════════════════════════════════════
//  PHYSIQUE — CONSTANTES
// ════════════════════════════════════════════════════════════════

const GRAV        = 1500;  // px/s²
const PSPEED      = 195;   // px/s déplacement horizontal
const JUMP_V      = -560;  // px/s vitesse initiale saut
const MAX_FALL    = 900;   // vitesse chute max

// ════════════════════════════════════════════════════════════════
//  OBJETS DE JEU
// ════════════════════════════════════════════════════════════════

let platforms = [], enemies = [], stars_list = [], particles = [];
let bricks = [], bonuses = [], pillars = [];
let flag = null;
let castle = null, castleChestState = 'closed', castleRewardCoins = 0;
let castlePlayerSavedX = 80;
let chestExplodeT = 0;
let camX = 0, worldW = 0;

const player = {
  x:80, y:400, w:28, h:44,
  vx:0, vy:0,
  onGround:false,
  facing:1,
  alive:true,
  invTimer:0,  // frames d'invincibilité
  walkT:0,
};

// ════════════════════════════════════════════════════════════════
//  INPUT
// ════════════════════════════════════════════════════════════════

const keys = {left:false, right:false};
let jumpRequest = false;

// Clavier
document.addEventListener('keydown', e => {
  if(QS.active){
    if(handleQuestionKeyboard(e)) return;
  }
  if(e.code==='ArrowLeft'  || e.code==='KeyA') keys.left  = true;
  if(e.code==='ArrowRight' || e.code==='KeyD') keys.right = true;
  if((e.code==='ArrowUp' || e.code==='Space' || e.code==='KeyW') && !e.repeat) jumpRequest = true;
});
document.addEventListener('keyup', e => {
  if(QS.active) return;
  if(e.code==='ArrowLeft'  || e.code==='KeyA') keys.left  = false;
  if(e.code==='ArrowRight' || e.code==='KeyD') keys.right = false;
});

function setupTouchBtn(id, leftKey, rightKey, isJump) {
  const el = document.getElementById(id);
  const on  = () => { if(leftKey) keys[leftKey]=true;  if(rightKey) keys[rightKey]=true;  if(isJump) jumpRequest=true; el.classList.add('pressed'); };
  const off = () => { if(leftKey) keys[leftKey]=false; if(rightKey) keys[rightKey]=false; el.classList.remove('pressed'); };
  el.addEventListener('touchstart', e=>{ e.preventDefault(); on(); },  {passive:false});
  el.addEventListener('touchend',   e=>{ e.preventDefault(); off(); }, {passive:false});
  el.addEventListener('touchcancel',e=>{ e.preventDefault(); off(); }, {passive:false});
  el.addEventListener('mousedown',  ()=>on());
  el.addEventListener('mouseup',    ()=>off());
  el.addEventListener('mouseleave', ()=>off());
}
setupTouchBtn('leftBtn',  'left',  null,  false);
setupTouchBtn('rightBtn', null,    'right',false);
setupTouchBtn('jumpBtn',  null,    null,  true);

// ════════════════════════════════════════════════════════════════
//  GÉNÉRATION DU NIVEAU
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
//  RÉGLAGES PÉDAGOGIQUES
// ════════════════════════════════════════════════════════════════

const SETTINGS = {
  groups: ['groupe1','groupe2','groupe3','verbesBase'],
  tenses: ['pr','im','fu'],
};

function rand(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=rand(0,i); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function generateLevel(lvl) {
  platforms=[]; enemies=[]; stars_list=[]; particles=[];
  bricks=[]; bonuses=[]; pillars=[];
  camX=0;

  const gY = H - 55;
  const GROUND_TILE_W = 200;
  const GROUND_OVERLAP = 10;
  const FLOAT_W = 112;
  const FLOAT_H = 18;
  // Physics-derived jump limits (JUMP_V=-560, GRAV=1500, PSPEED=195)
  const MAX_JUMP_H = 90;   // safe max height reachable from ground
  const MAX_JUMP_W = 125;  // safe max gap width the player can cross

  // ── Phase 1 : Ground chunks separated by jumpable gaps ────────
  const chunks = [];   // { x, w }
  let curX = 0;

  // Safe start zone — no enemies, no gaps
  chunks.push({ x: 0, w: 250 });
  curX = 250;

  const totalChunks = lvl.numEnemies + 5;
  for (let i = 0; i < totalChunks; i++) {
    curX += rand(85, MAX_JUMP_W);           // gap
    chunks.push({ x: curX, w: rand(190, 350) });
    curX += chunks[chunks.length - 1].w;
  }

  // Safe end zone — clear ground before the flag
  curX += rand(80, 115);
  chunks.push({ x: curX, w: 310 });
  curX += 310;
  worldW = curX + 100;

  // ── Phase 2 : Castle (mid-world, centred on a chunk) ──────────
  const caH = 300;
  const towerImgReady = readyImage(commonLevelImages.tower);
  const towerRatio    = towerImgReady ? (towerImgReady.width / towerImgReady.height) : 0.51;
  const caW = Math.round(caH * towerRatio);
  const midTarget = worldW * (0.42 + Math.random() * 0.18);
  const castleChunk = chunks.slice(1, -1).reduce((best, c) =>
    Math.abs(c.x + c.w / 2 - midTarget) < Math.abs(best.x + best.w / 2 - midTarget) ? c : best
  );
  const caX = Math.round(castleChunk.x + (castleChunk.w - caW) / 2);
  castle = { x: caX, y: gY - caH, w: caW, h: caH };
  castleChestState = 'closed';
  const caMargin = 40;
  function inCastle(x, w) { return x + w > caX - caMargin && x < caX + caW + caMargin; }

  // ── Phase 3 : Ground platforms ────────────────────────────────
  for (const c of chunks) {
    for (let x = c.x; x < c.x + c.w; x += (GROUND_TILE_W - GROUND_OVERLAP)) {
      const w = Math.min(GROUND_TILE_W, c.x + c.w - x + GROUND_OVERLAP);
      platforms.push({ x, y: gY, w, h: 60, type: 'ground' });
    }
  }

  // Keep the area around the tower/castle completely sealed.
  const castleGroundX = Math.max(0, caX - 80);
  const castleGroundW = Math.min(worldW - castleGroundX, caW + 160);
  platforms.push({ x: castleGroundX, y: gY, w: castleGroundW, h: 60, type: 'ground' });

  // ── Phase 4 : Floating platforms (gaps + above-ground variety) ─
  const floatPlats = [];

  // Mid-gap bridge platforms (60 % of gaps — keep gaps challenging but passable)
  for (let i = 0; i < chunks.length - 1; i++) {
    const left = chunks[i], right = chunks[i + 1];
    const gapX = left.x + left.w;
    const gapW = right.x - gapX;
    if (Math.random() < 0.6) {
      const pw = Math.min(gapW - 12, FLOAT_W);
      const px = gapX + (gapW - pw) / 2;
      const py = gY - rand(30, 65);
      floatPlats.push({ x: px, y: py, w: pw, h: FLOAT_H, type: 'platform' });
    }
  }

  // Above-ground platforms with Mario-style layout patterns
  for (const c of chunks) {
    if (c === chunks[0] || c === chunks[chunks.length - 1]) continue;
    if (inCastle(c.x, c.w) || c.w < 160) continue;

    const pattern = pick(['single', 'single', 'pair', 'stair']);

    if (pattern === 'single') {
      const pw = FLOAT_W;
      const px = c.x + rand(20, Math.max(21, c.w - pw - 20));
      if (!inCastle(px, pw))
        floatPlats.push({ x: px, y: gY - rand(60, MAX_JUMP_H), w: pw, h: FLOAT_H, type: 'platform' });

    } else if (pattern === 'pair') {
      const h1 = rand(60, MAX_JUMP_H);
      const pw1 = FLOAT_W, pw2 = FLOAT_W;
      const px1 = c.x + rand(10, Math.max(11, c.w / 2 - pw1));
      const px2 = c.x + c.w / 2 + rand(0, Math.max(1, c.w / 2 - pw2 - 10));
      const h2  = Math.max(55, h1 + rand(-18, 18));
      if (!inCastle(px1, pw1)) floatPlats.push({ x: px1, y: gY - h1, w: pw1, h: FLOAT_H, type: 'platform' });
      if (!inCastle(px2, pw2)) floatPlats.push({ x: px2, y: gY - h2, w: pw2, h: FLOAT_H, type: 'platform' });

    } else { // stair — ascending steps (classic Mario staircase)
      const steps  = rand(3, 4);
      const stepW  = FLOAT_W;
      const stepH  = rand(22, 32);
      const startX = c.x + rand(10, 40);
      const startH = rand(30, 50);
      for (let s = 0; s < steps; s++) {
        const sx = startX + s * (stepW + 4);
        const sy = gY - (startH + s * stepH);
        if (sx + stepW <= c.x + c.w && !inCastle(sx, stepW))
          floatPlats.push({ x: sx, y: sy, w: stepW, h: FLOAT_H, type: 'platform' });
      }
    }
  }

  platforms.push(...floatPlats);

  // ── Phase 5 : Pillars / pipes on ground (Mario pipe style) ────
  const pipeCandidates = chunks.slice(1, -1).filter(c => c.w >= 160 && !inCastle(c.x, c.w));
  for (let i = 0; i < pipeCandidates.length; i += 2) {
    const c  = pipeCandidates[i];
    const ph = rand(55, 120);
    const pw = 32;
    const px = c.x + rand(50, Math.max(51, c.w - pw - 50));
    if (inCastle(px, pw)) continue;
    const pillar = { x: px, y: gY - ph, w: pw, h: ph + 60, type: 'pillar' };
    pillars.push(pillar);
    platforms.push(pillar);
  }

  // ── Phase 6 : ? Blocks in Mario-style groups ──────────────────
  const brickTypes = ['life', 'life', 'coin', 'coin', 'coin'];
  for (const c of chunks.slice(1, -1)) {
    if (inCastle(c.x, c.w) || Math.random() < 0.3) continue;
    const groupSize = rand(1, 3);
    const blockY    = gY - rand(170, 195);
    const startBX   = c.x + rand(20, Math.max(21, c.w - groupSize * 34 - 20));
    for (let g = 0; g < groupSize; g++) {
      const bx = startBX + g * 34;
      if (bx + 34 > c.x + c.w || inCastle(bx, 34)) break;
      bricks.push({ x: bx, y: blockY, w: 34, h: 34,
                    type: pick(brickTypes), hit: false, jiggT: 0, offsetY: 0 });
    }
  }

  // ── Phase 7 : Enemies (mix of ground walkers + platform guards) ─
  const levelEnemyTypes =
    (Array.isArray(lvl.enemyTypes) && lvl.enemyTypes.length)
      ? lvl.enemyTypes : [lvl.enemyType || 'goblin'];
  const levelVerbDatas = generateLevelVerbDatas(lvl.numEnemies);

  const validChunks = chunks.slice(1, -1).filter(c => c.w >= 100 && !inCastle(c.x, c.w));
  const validPlats  = floatPlats.filter(p => !p.nosprite && p.w >= 70);

  let enemyIdx = 0;
  const groundTarget = Math.ceil(lvl.numEnemies * 0.55);
  const platTarget   = lvl.numEnemies - groundTarget;

  // Ground enemies — one per chunk, shuffled
  const shuffledChunks = [...validChunks].sort(() => Math.random() - 0.5);
  for (let i = 0; i < groundTarget && i < shuffledChunks.length && enemyIdx < lvl.numEnemies; i++) {
    const c  = shuffledChunks[i];
    const ex = c.x + rand(20, Math.max(21, c.w - 52));
    enemies.push({
      x: ex, y: gY - 44, w: 32, h: 44,
      vx: pick([-45, 45]),
      platX: c.x, platW: c.w,
      alive: true,
      type: levelEnemyTypes[enemyIdx % levelEnemyTypes.length],
      facing: 1, walkT: 0, alert: false,
      verbData: levelVerbDatas[enemyIdx],
    });
    enemyIdx++;
  }

  // Platform enemies
  const shuffledPlats = [...validPlats].sort(() => Math.random() - 0.5);
  for (let i = 0; i < platTarget && i < shuffledPlats.length && enemyIdx < lvl.numEnemies; i++) {
    const p = shuffledPlats[i];
    enemies.push({
      x: p.x + p.w / 2 - 16, y: p.y - 44, w: 32, h: 44,
      vx: pick([-45, 45]),
      platX: p.x, platW: p.w,
      alive: true,
      type: levelEnemyTypes[enemyIdx % levelEnemyTypes.length],
      facing: 1, walkT: 0, alert: false,
      verbData: levelVerbDatas[enemyIdx],
    });
    enemyIdx++;
  }

  // ── Phase 8 : Stars ───────────────────────────────────────────
  // On enemy-free platforms
  for (const p of floatPlats) {
    if (p.nosprite) continue;
    const hasEnemy = enemies.some(e => e.platX === p.x && e.platW === p.w);
    if (hasEnemy || Math.random() < 0.4) continue;
    const n = rand(1, 3);
    for (let j = 0; j < n; j++)
      stars_list.push({ x: p.x + 10 + j * 28, y: p.y - 22, w: 18, h: 18,
                        collected: false, phase: Math.random() * Math.PI * 2 });
  }
  // Floating star rows above ground (Mario coin-row style)
  for (const c of chunks.slice(1, -2)) {
    if (inCastle(c.x, c.w) || Math.random() < 0.55) continue;
    const rowLen = rand(2, 5);
    const rowY   = gY - rand(65, 105);
    const startX = c.x + rand(10, Math.max(11, c.w - rowLen * 28 - 10));
    for (let s = 0; s < rowLen; s++) {
      const sx = startX + s * 28;
      if (sx + 18 > c.x + c.w) break;
      stars_list.push({ x: sx, y: rowY, w: 18, h: 18,
                        collected: false, phase: Math.random() * Math.PI * 2 });
    }
  }
  GS.maxStars = stars_list.length;
  GS.stars    = 0;

  // ── End flag ──────────────────────────────────────────────────
  const lockedGate = readyImage(commonLevelImages.castleLocked);
  const gateRatio  = lockedGate ? (lockedGate.width / lockedGate.height) : 1.6;
  const endH = 244;
  const endW = Math.round(endH * gateRatio);
  flag = { x: worldW - 240, y: gY - endH + 4, w: endW, h: endH };
  castleRewardCoins = 0;

  // ── Player spawn ──────────────────────────────────────────────
  player.x = 80;
  player.y = gY - player.h - 2;
  player.vx = 0; player.vy = 0;
  player.onGround = true;
  player.alive    = true;
  player.invTimer = 0;
}

// ════════════════════════════════════════════════════════════════
//  PARTICULES
// ════════════════════════════════════════════════════════════════

function spawnBurst(x,y,color,n){
  for(let i=0;i<n;i++){
    const a = (Math.PI*2/n)*i + Math.random()*.4;
    const s = 80+Math.random()*130;
    particles.push({ x,y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-50,
                     life:1, color, sz:3+Math.random()*4 });
  }
}

// ════════════════════════════════════════════════════════════════
//  PHYSIQUE
// ════════════════════════════════════════════════════════════════

function updatePhysics(dt){
  // Entrée château : ⬆ près de la porte
  if(castle && !QS.active && jumpRequest && player.onGround){
    const dist = Math.abs((player.x+player.w/2)-(castle.x+castle.w/2));
    if(dist < 95){
      jumpRequest = false;
      castlePlayerSavedX = player.x;
      castlePlayer.x = 50; castlePlayer.y = H-55-castlePlayer.h;
      castlePlayer.vx=0; castlePlayer.vy=0;
      castlePlayer.onGround=true; castlePlayer.facing=1; castlePlayer.walkT=0;
      CQ.active=false; CQ.streak=0;
      GS.screen='castle';
      return;
    }
  }

  // Mouvement joueur
  player.vx = 0;
  if(keys.left)  { player.vx=-PSPEED; player.facing=-1; }
  if(keys.right) { player.vx= PSPEED; player.facing= 1; }

  if(jumpRequest && player.onGround){
    player.vy = JUMP_V;
    player.onGround = false;
  }
  jumpRequest = false;

  // Gravité
  player.vy = Math.min(player.vy + GRAV*dt, MAX_FALL);

  // Déplacement
  player.x += player.vx*dt;
  player.y += player.vy*dt;
  player.x  = Math.max(0, Math.min(worldW-player.w, player.x));

  // Collisions plateformes
  player.onGround = false;
  for(const p of platforms) resolveAABB(player, p);

  // Chute hors écran → respawn
  if(player.y > H+80){
    hitPlayer();
    player.x = Math.max(60, camX+60);
    player.y = H-200;
    player.vy=0;
  }

  // Animation marche
  if(player.vx!==0 && player.onGround) player.walkT=(player.walkT+dt*8)%1000;
  else if(player.onGround) player.walkT=0;

  // Invincibilité
  if(player.invTimer>0) player.invTimer--;

  // Caméra
  const targetCamX = player.x - W*0.35;
  camX = Math.max(0, Math.min(worldW-W, targetCamX));

  // Ennemis
  for(const e of enemies){
    if(!e.alive || e.battling) continue;
    e.x += e.vx*dt;
    if(e.x<e.platX || e.x+e.w>e.platX+e.platW){
      e.vx*=-1;
      e.x = Math.max(e.platX, Math.min(e.platX+e.platW-e.w, e.x));
    }
    e.facing = e.vx>0?1:-1;
    e.walkT  = ((e.walkT||0)+dt*6)%1000;

    // Proximité
    const dx = (player.x+player.w/2)-(e.x+e.w/2);
    const dy = (player.y+player.h/2)-(e.y+e.h/2);
    e.alert  = Math.abs(dx)<90 && Math.abs(dy)<70;

    // Collision
    if(!QS.active && player.invTimer===0 && rectsTouch(player,e)){
      openQuestion(e);
    }
  }

  // Étoiles
  for(const s of stars_list){
    if(s.collected) continue;
    s.phase += dt*2.5;
    if(rectsTouch(player, {x:s.x,y:s.y+Math.sin(s.phase)*4,w:s.w,h:s.h})){
      s.collected=true;
      GS.stars++;
      SAVE.totalStars++;
      saveSave();
      GS.score+=10;
      spawnBurst(s.x+s.w/2, s.y+s.h/2, '#ffd700', 7);
    }
  }

  // Blocs à frapper ❓
  for(const br of bricks){
    // Jiggle animation
    if(br.jiggT>0){
      br.jiggT-=dt;
      br.offsetY = br.jiggT>0 ? -Math.abs(Math.sin(br.jiggT*28))*8 : 0;
    }
    // ⚠️ Détection AVANT resolveAABB (sinon resolveAABB remet vy=0)
    // Frappe par dessous : joueur monte (vy<0) et sa tête touche le bas du bloc
    if(!br.hit && player.vy<0 &&
       player.x+player.w > br.x+2 && player.x < br.x+br.w-2 &&
       player.y <= br.y+br.h+2 && player.y >= br.y-player.h){
      br.hit   = true;
      br.jiggT = 0.35;
      player.vy = 80; // rebond léger vers le bas
      bonuses.push({
        x: br.x + br.w/2 - 11, y: br.y - 26,
        w: 22, h: 22,
        vy: -240,
        type: br.type,
        timer: 5,
        collected: false,
      });
      spawnBurst(br.x+br.w/2, br.y, br.type==='life'?'#ef4444':'#ffd700', 6);
    }
    // Collision normale (le joueur peut se tenir dessus)
    resolveAABB(player, {x:br.x, y:br.y+br.offsetY, w:br.w, h:br.h});
  }

  // Bonus (items qui tombent des blocs)
  for(let i=bonuses.length-1; i>=0; i--){
    const b=bonuses[i];
    if(b.collected){ bonuses.splice(i,1); continue; }
    b.vy  += GRAV*0.6*dt;
    b.y   += b.vy*dt;
    b.timer -= dt;
    if(b.timer<=0){ bonuses.splice(i,1); continue; }
    // Arrêter sur le sol ou une plateforme
    for(const p of platforms) resolveAABB(b, p);
    // Collecte
    if(rectsTouch(player,b)){
      b.collected = true;
      if(b.type==='life'){
        GS.lives = Math.min(5, GS.lives+1);
        spawnBurst(b.x+b.w/2, b.y+b.h/2, '#ef4444', 10);
      } else {
        // Pièce de bloc : va dans les étoiles persistantes (pas compteur de niveau)
        SAVE.totalStars++;
        saveSave();
        GS.score+=25;
        spawnBurst(b.x+b.w/2, b.y+b.h/2, '#f59e0b', 10);
      }
    }
  }

  // Particules
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    p.vy+=GRAV*0.35*dt;
    p.life-=dt*1.8;
    if(p.life<=0) particles.splice(i,1);
  }

  updateStarGains(dt);

  // Portail de fin de niveau (nécessite 75% ennemis éliminés)
  // Activé quand le centre du joueur atteint le centre horizontal de la porte
  if(flag && Math.abs((player.x+player.w/2)-(flag.x+flag.w/2)) < 30 && player.y+player.h > flag.y && player.y < flag.y+flag.h){
    const _total = enemies.length;
    const _killed = enemies.filter(e=>!e.alive).length;
    if(_total === 0 || _killed / _total >= 0.75){
      triggerLevelComplete();
    }
  }
}

function resolveAABB(a, b){
  if(!rectsTouch(a,b)) return;
  // Plateformes flottantes : one-way (traversables par dessous)
  if(b.type === 'platform'){
    // Floating platform sprite has a visible rim; give a slightly deeper top snap window.
    if(a.vy >= 0 && a.y + a.h - a.vy * 0.05 <= b.y + 10){
      a.y = b.y - a.h; a.vy = 0; a.onGround = true;
    }
    return;
  }
  const ox = Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
  const oy = Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
  if(oy<ox){
    if(a.y<b.y){ a.y=b.y-a.h; a.vy=0; a.onGround=true; }
    else        { a.y=b.y+b.h; a.vy=Math.max(0,a.vy); }
  } else {
    if(a.x<b.x) a.x=b.x-a.w;
    else         a.x=b.x+b.w;
  }
}
function rectsTouch(a,b){ return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y; }

// ════════════════════════════════════════════════════════════════
//  STYLE AVANCÉ — PIXEL ART PAR TABLEAU DE PIXELS
// ════════════════════════════════════════════════════════════════

let advStyle = localStorage.getItem('cqSprStyle') || 'advanced';
function setSprStyle(s){
  advStyle = s;
  localStorage.setItem('cqSprStyle', s);
  document.querySelectorAll('.sprTog').forEach(b => b.classList.toggle('on', b.dataset.spr === s));
}

// ─── Palette ────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════
//  RENDU
// ════════════════════════════════════════════════════════════════

function render(){
  ctx.imageSmoothingEnabled = false;
  const lvl = LEVELS[GS.level];
  const c = getLvlColors(lvl);

  // Ciel
  ctx.fillStyle = c.sky;
  ctx.fillRect(0,0,W,H);

  // Décor arrière-plan (parallaxe)
  drawBgAdv(c);

  ctx.save();
  ctx.translate(-camX, 0);

  // Colonnes décoratives
  for(const pl of pillars) drawPillar(pl, c);

  // Sol — dessiné uniquement sur les chunks (les trous restent vides)
  const groundTiles = platforms.filter(p => p.type === 'ground');
  drawGroundStripAdv(H - 55, groundTiles);

  // Plateformes flottantes
  for(const p of platforms){
    if(p.type === 'ground') continue;
    drawPlatformAdv(p, c);
  }

  // Blocs ❓
  for(const br of bricks) drawBrick(br);

  // Bonus tombants
  for(const b of bonuses) if(!b.collected) drawBonus(b);

  // Étoiles
  for(const s of stars_list) if(!s.collected) drawStar(s);

  // Drapeau
  if(flag) drawFlag(flag, lvl);

  // Ennemis
  for(const e of enemies) if(e.alive) drawEnemy(e);

  // Particules
  for(const p of particles){
    ctx.globalAlpha = Math.max(0,p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x-p.sz/2, p.y-p.sz/2, p.sz, p.sz);
  }
  ctx.globalAlpha=1;

  // Château (même plan que les plateformes, dessiné AVANT le joueur)
  if(castle) drawCastleSprite(castle, c);

  // Joueur
  drawPlayer(player);

  ctx.restore();

  // Gains d'étoiles flottants
  drawStarGains();

  // HUD
  drawHUD(lvl);
}

// ── Arrière-plan ──────────────────────────────────────────────
function drawBg(lvl){
  const px1 = camX*0.25;
  const px2 = camX*0.55;

  // Montagnes lointaines
  ctx.fillStyle = lvl.bgFar;
  for(let i=-1;i<7;i++){
    const mx = (i*130 - px1%130);
    const mh = 60+(i%3)*50;
    ctx.beginPath();
    ctx.moveTo(mx,H-55); ctx.lineTo(mx+65,H-55-mh); ctx.lineTo(mx+130,H-55); ctx.fill();
  }

  // Arbres / colonnes de pierre proches
  ctx.fillStyle = lvl.bgNear;
  for(let i=-1;i<10;i++){
    const tx = (i*88 - px2%88);
    ctx.fillRect(tx+18,H-85,6,30);     // tronc
    ctx.beginPath();
    ctx.moveTo(tx,H-85); ctx.lineTo(tx+21,H-140); ctx.lineTo(tx+42,H-85); ctx.fill();
  }
}

// ── Plateformes ───────────────────────────────────────────────
function drawPlatform(p, lvl){
  if(p.type==='ground'){
    // Herbe / pierre selon niveau
    ctx.fillStyle = lvl.ground;
    ctx.fillRect(p.x,p.y,p.w,10);
    ctx.fillStyle = darken(lvl.ground);
    ctx.fillRect(p.x,p.y+10,p.w,p.h-10);
    // petits brins d'herbe
    ctx.fillStyle = lighten(lvl.ground);
    for(let gx=p.x+4;gx<p.x+p.w-4;gx+=9) ctx.fillRect(gx,p.y-3,3,5);
  } else {
    if(p.nosprite) return;
    ctx.fillStyle = lvl.plat;
    ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle = lighten(lvl.plat);
    ctx.fillRect(p.x,p.y,p.w,5);
    ctx.fillStyle = darken(lvl.plat);
    ctx.fillRect(p.x,p.y+p.h-5,p.w,5);
    // veines bois
    ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=1;
    for(let gx=p.x+12;gx<p.x+p.w-8;gx+=18){
      ctx.beginPath(); ctx.moveTo(gx,p.y+2); ctx.lineTo(gx+4,p.y+p.h-2); ctx.stroke();
    }
  }
}
// ── Thème ─────────────────────────────────────────────────────
let currentTheme = localStorage.getItem('cqTheme') || 'sombre';
function applyTheme(t){
  currentTheme = t;
  localStorage.setItem('cqTheme', t);
  document.body.classList.toggle('theme-funny', t === 'funny');
  document.querySelectorAll('.themeTog').forEach(b => {
    b.classList.toggle('on', b.dataset.theme === t);
  });
}
function getLvlColors(lvl){
  if(currentTheme !== 'funny') return lvl;
  return {...lvl, sky:lvl.funnySky, bgFar:lvl.funnyBgFar, bgNear:lvl.funnyBgNear, ground:lvl.funnyGround, plat:lvl.funnyPlat};
}

function darken(hex){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.max(0,r-30)},${Math.max(0,g-30)},${Math.max(0,b-30)})`;
}
function lighten(hex){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,r+35)},${Math.min(255,g+35)},${Math.min(255,b+35)})`;
}

// ── Colonnes / piliers de décor ────────────────────────────────
function drawPillar(pl, lvl){
  const pillarImg = getBiomeImg(getLevelBiome(), 'pillar');
  if(pillarImg){
    // Keep native pillar sprite proportions and avoid adding a fake top platform.
    const drawW = pl.w;
    const drawH = pl.h;
    const drawX = pl.x;
    const drawY = pl.y;
    ctx.drawImage(pillarImg, drawX, drawY, drawW, drawH);
    return;
  }
  // Fallback procédural
  ctx.fillStyle = darken(lvl.ground);
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  for(let gy=pl.y+12; gy<pl.y+pl.h-8; gy+=20) ctx.fillRect(pl.x+3, gy, pl.w-6, 8);
  ctx.fillStyle = darken(darken(lvl.ground));
  ctx.fillRect(pl.x-6, pl.y,        pl.w+12, 10);
  ctx.fillRect(pl.x-4, pl.y+pl.h-8, pl.w+8,  8);
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  ctx.fillRect(pl.x+2, pl.y+10, 4, pl.h-20);
}

// ── Blocs ❓ ──────────────────────────────────────────────────
function drawBrick(br){
  const oy = br.offsetY || 0;
  if(br.hit){
    // Bloc utilisé — gris foncé
    ctx.fillStyle = '#4a3a1a';
    ctx.fillRect(br.x, br.y+oy, br.w, br.h);
    ctx.fillStyle = '#2e2210';
    ctx.fillRect(br.x+3, br.y+oy+3, br.w-6, br.h-6);
  } else {
    const isLife = br.type==='life';
    // Fond
    ctx.fillStyle = isLife ? '#b91c1c' : '#b45309';
    ctx.fillRect(br.x, br.y+oy, br.w, br.h);
    // Bordure claire
    ctx.fillStyle = isLife ? '#ef4444' : '#f59e0b';
    ctx.fillRect(br.x, br.y+oy, br.w, 4);
    ctx.fillRect(br.x, br.y+oy, 4, br.h);
    // Bordure sombre
    ctx.fillStyle = isLife ? '#7f1d1d' : '#78350f';
    ctx.fillRect(br.x, br.y+oy+br.h-4, br.w, 4);
    ctx.fillRect(br.x+br.w-4, br.y+oy, 4, br.h);
    // Symbole
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(isLife?'❤':'⭐', br.x+br.w/2, br.y+oy+br.h/2);
    ctx.textBaseline = 'alphabetic';
  }
}

// ── Bonus tombants ────────────────────────────────────────────
function drawBonus(b){
  const pulse = 1 + Math.sin(Date.now()*.008)*0.15;
  ctx.save();
  ctx.translate(b.x+b.w/2, b.y+b.h/2);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = b.type==='life' ? '#ef4444' : '#ffd700';
  ctx.shadowBlur  = 14;
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.type==='life'?'❤️':'🪙', 0, 0);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ── Étoile ────────────────────────────────────────────────────
function drawStar(s){
  const cy = s.y+Math.sin(s.phase)*4;
  ctx.save();
  ctx.shadowColor='#ffd700'; ctx.shadowBlur=12;
  ctx.fillStyle='#ffd700';
  starPath(s.x+s.w/2, cy+s.h/2, s.w*0.38, s.w*0.5, 5);
  ctx.fill();
  ctx.shadowBlur=0;
  ctx.restore();
}
function starPath(cx,cy,r1,r2,pts){
  ctx.beginPath();
  for(let i=0;i<pts*2;i++){
    const a=(i*Math.PI/pts)-Math.PI/2;
    const r=i%2===0?r2:r1;
    i===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
  }
  ctx.closePath();
}

// ── Portail de fin de niveau ──────────────────────────────────
function drawFlag(f){
  const totalEn = enemies.length;
  const killed  = enemies.filter(e=>!e.alive).length;
  const unlocked = totalEn === 0 || killed / totalEn >= 0.75;

  const gateImg = advStyle === 'advanced' ? getGateImg(!unlocked) : null;
  if(gateImg){
    ctx.drawImage(gateImg, f.x, f.y, f.w, f.h);
  } else {
    // Fallback canvas gate
    ctx.fillStyle = unlocked ? '#2a6e2a' : '#8b2020';
    ctx.fillRect(f.x+8, f.y, f.w-16, f.h);
    ctx.fillStyle = '#555';
    ctx.fillRect(f.x+2, f.y, 6, f.h);
    ctx.fillRect(f.x+f.w-8, f.y, 6, f.h);
    if(!unlocked){
      ctx.fillStyle='#ffd700';
      ctx.fillRect(f.x+f.w/2-6, f.y+f.h/2-6, 12, 12);
    }
  }

  // Compteur d'ennemis si portail verrouillé
  if(!unlocked){
    const needed = Math.ceil(totalEn * 0.75);
    ctx.save();
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    const label = `${killed}/${needed}`;
    ctx.strokeText(label, f.x + f.w/2, f.y - 6);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, f.x + f.w/2, f.y - 6);
    ctx.restore();
  }
}

// ════════════════════════════════════════════════════════════════
//  DESSIN AVANCÉ
// ════════════════════════════════════════════════════════════════

// ── Joueur avancé (sprites Pixellab) ──────────────────────────
function drawPlayerAdv(p){
  if(p.invTimer>0 && Math.floor(p.invTimer/6)%2===0) return;

  const skin = SAVE.skin || 'knight';
  const spr  = HERO_SPRITES[skin] || HERO_SPRITES.knight;

  // Fallback to pixel-art if sprites not ready
  if(!spr.ready){
    drawPlayerAdvFallback(p);
    return;
  }

  ctx.save();
  ctx.translate(p.x+p.w/2, p.y+p.h);

  const dir = p.facing>=0 ? 'right' : 'left';
  let sprite;

  let flipX = false;

  if(!p.onGround){
    // Prefer directional jump frame; fall back to left frames mirrored
    const jFrames = spr.jump[dir];
    const jFramesL = spr.jump.left;
    const t = Math.min(1, Math.max(0, (p.vy - JUMP_V) / (-JUMP_V * 2)));
    const fi = Math.min(jFrames.length-1, Math.floor(t * jFrames.length));
    if(jFrames[fi] && jFrames[fi].naturalWidth){
      sprite = jFrames[fi];
    } else if(dir === 'right' && jFramesL[fi] && jFramesL[fi].naturalWidth){
      sprite = jFramesL[fi]; flipX = true;
    } else {
      sprite = spr.idle[dir];
    }
  } else if(Math.abs(p.vx) > 0.5){
    // Prefer directional run frame; fall back to left frames mirrored
    const rFrames = spr.run[dir];
    const rFramesL = spr.run.left;
    const fi = Math.floor(p.walkT * 1.5) % Math.max(rFrames.length, 1);
    if(rFrames[fi] && rFrames[fi].naturalWidth){
      sprite = rFrames[fi];
    } else if(dir === 'right' && rFramesL[fi] && rFramesL[fi].naturalWidth){
      sprite = rFramesL[fi]; flipX = true;
    } else {
      sprite = spr.idle[dir];
    }
  } else {
    sprite = spr.idle[dir];
  }

  // Draw sprite at 2× size (112×112), mirroring if needed
  const drawH = 112;
  const drawW = 112;
  if(flipX) ctx.scale(-1, 1);
  ctx.drawImage(sprite, -drawW/2, -drawH, drawW, drawH);

  ctx.restore();
}

// Fallback pixel-art version (used while sprites load)
function drawPlayerAdvFallback(p){
  const frame = Math.floor(p.walkT*3)%2;
  const sc = 2;
  ctx.save();
  ctx.translate(p.x+p.w/2, p.y+p.h);
  ctx.scale(p.facing, 1);
  ctx.fillStyle='rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(0,0,14,4,0,0,Math.PI*2); ctx.fill();
  const skin = SAVE.skin||'knight';
  pxDraw(ctx, getSkinSprite(skin, frame), -20, -44, sc, false);
  ctx.restore();
}

// ── Ennemi avancé ─────────────────────────────────────────────
function drawGoblinAdv(bob, facing=1){
  drawBiomeEnemyAdv(FOREST_GOBLIN_GREEN_LOADER, '#3f8c2f', bob, facing);
}

function drawSkeletonAdv(bob){
  const frame = Math.floor(Date.now()/350)%2;
  const sc=2;
  // épée os
  ctx.fillStyle=PPAL.e; ctx.fillRect(14,-42+bob, 3,22);
  ctx.fillStyle=PPAL.K; ctx.fillRect(11,-38+bob, 9,4);
  pxDraw(ctx, SPR_SKELETON[frame], -20, -44+bob, sc, false);
}

function drawDragonAdv(bob){
  const frame = Math.floor(Date.now()/400)%2;
  const sc=2;
  // flamme
  const ft = Date.now()*.005;
  ctx.fillStyle=PPAL.F; ctx.fillRect(18,-28+bob+Math.sin(ft)*2, 18,6);
  ctx.fillStyle=PPAL.Y; ctx.fillRect(20,-27+bob+Math.sin(ft+1)*2, 12,3);
  ctx.fillStyle=PPAL.R; ctx.fillRect(24,-26+bob+Math.sin(ft+2)*2, 8,2);
  pxDraw(ctx, SPR_DRAGON[frame], -20, -44+bob, sc, false);
}

// ── Mummy (advanced — PixelLab sprites) ──────────────────────
function drawMummyAdv(bob, facing=1){
  drawBiomeEnemyAdv(DESERT_MUMMY_LOADER, '#d6c49a', bob, facing);
}

// ── Biome enemies (PixelLab sprites) ──────────────────────────
function drawBiomeEnemyAdv(loader, fallbackColor, bob, facing=1){
  if(!loader.isReady()){
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(-24, -48+bob, 48, 48);
    return;
  }
  const frame = Math.floor(Date.now()/150) % 6;
  const dir = facing >= 0 ? 'west' : 'east';
  const frames = loader.sprites[dir];
  const sideSprite = frames[frame];
  const sprite =
    (sideSprite && sideSprite.naturalWidth)
      ? sideSprite
      : loader.sprites.west[frame];  // fallback to west (default idle direction)
  if(!sprite || !sprite.naturalWidth){
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(-24, -48+bob, 48, 48);
    return;
  }
  // Sprite is 48×48px, drawn at 2× = 96×96, centred on bottom-centre of hitbox
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, -48, -96+bob, 96, 96);
}
function drawForestSpriteAdv(bob, facing)        { drawBiomeEnemyAdv(FOREST_SPRITE_LOADER,       '#2d7a2d', bob, facing); }
function drawForestGoblinGreenAdv(bob, facing)   { drawBiomeEnemyAdv(FOREST_GOBLIN_GREEN_LOADER, '#3f8c2f', bob, facing); }
function drawDesertScorpionAdv(bob, facing)      { drawBiomeEnemyAdv(DESERT_SCORPION_LOADER,     '#c8a040', bob, facing); }
function drawDesertMummyAdv(bob, facing)         { drawBiomeEnemyAdv(DESERT_MUMMY_LOADER,        '#d6c49a', bob, facing); }
function drawMountainTrollAdv(bob, facing)       { drawBiomeEnemyAdv(MOUNTAIN_TROLL_LOADER,      '#5a5a5a', bob, facing); }
function drawMountainDwarfAdv(bob, facing)       { drawBiomeEnemyAdv(MOUNTAIN_DWARF_LOADER,      '#7a6040', bob, facing); }
function drawFrostZombieAdv(bob, facing)         { drawBiomeEnemyAdv(FROST_ZOMBIE_LOADER,        '#a0c8e0', bob, facing); }
function drawSnowYetiAdv(bob, facing)            { drawBiomeEnemyAdv(SNOW_YETI_LOADER,           '#d0e8ff', bob, facing); }
function drawDesolationSkeletonAdv(bob, facing)  { drawBiomeEnemyAdv(DESOLATION_SKELETON_LOADER, '#c0b080', bob, facing); }
function drawDesolationWraithAdv(bob, facing)    { drawBiomeEnemyAdv(DESOLATION_WRAITH_LOADER,   '#4a2060', bob, facing); }

// ── Mummy (simple — pixel art fallback) ───────────────────────
function drawMummy(bob){
  // Ombre
  ctx.fillStyle='rgba(0,0,0,.2)';
  ctx.beginPath(); ctx.ellipse(0,0,11,3,0,0,Math.PI*2); ctx.fill();

  // Jambes — bandages
  ctx.fillStyle='#e8e0c8';
  ctx.fillRect(-8,-14,6,14); ctx.fillRect(2,-14,6,14);
  ctx.fillStyle='#b8a888';
  ctx.fillRect(-7,-12,4,2); ctx.fillRect(3,-12,4,2);
  ctx.fillRect(-7,-7,4,2);  ctx.fillRect(3,-7,4,2);

  // Corps — bandages
  ctx.fillStyle='#e8e0c8';
  ctx.fillRect(-11,-34+bob,22,22);
  ctx.fillStyle='#c8b898';
  ctx.fillRect(-10,-32+bob,20,2); ctx.fillRect(-10,-26+bob,20,2); ctx.fillRect(-10,-20+bob,20,2);

  // Bras tendus en avant
  ctx.fillStyle='#e8e0c8';
  ctx.fillRect(-18,-30+bob,7,10); ctx.fillRect(11,-30+bob,7,10);

  // Tête
  ctx.fillStyle='#e0d8b8';
  ctx.fillRect(-10,-52+bob,20,20);
  ctx.fillStyle='#c0b890';
  ctx.fillRect(-9,-50+bob,18,2); ctx.fillRect(-9,-44+bob,18,2);

  // Yeux luisants verts
  ctx.fillStyle='#00ff80';
  ctx.fillRect(-6,-46+bob,4,4); ctx.fillRect(2,-46+bob,4,4);
  ctx.fillStyle='#00cc60';
  ctx.fillRect(-5,-45+bob,2,2); ctx.fillRect(3,-45+bob,2,2);
}

// ── Arrière-plan avancé — image parallaxe ─────────────────────
function drawBgAdv(c){
  if(advStyle !== 'advanced'){ drawBg(c); return; }
  const bg = getLevelBgImage(GS.level);
  if(!bg){ drawBg(c); return; }

  const imgAspect = bg.width / bg.height;
  const drawH = H;
  const drawW = drawH * imgAspect;
  const px = camX * 0.15;
  const startX = -(px % drawW + drawW) % drawW;
  for(let x = startX - drawW; x < W + drawW; x += drawW){
    ctx.drawImage(bg, x, 0, drawW, drawH);
  }
}

// ── Sol continu (sprite-based) ────────────────────────────────
// Tiles an image at its natural size (pixel-perfect) over a rectangle.
function drawTiled32(img, x, y, width, height){
  if(!img || width <= 0 || height <= 0) return;
  const tw = img.width  || 32;
  const th = img.height || 32;
  for(let row = y; row < y + height; row += th){
    const drawH = Math.min(th, y + height - row);
    for(let col = x; col < x + width; col += tw){
      const drawW = Math.min(tw, x + width - col);
      ctx.drawImage(img, 0, 0, drawW, drawH, col, row, drawW, drawH);
    }
  }
}

function drawRepeatedSprite(img, x, y, width, targetH){
  if(!img || targetH <= 0 || width <= 0) return;
  const tileW = Math.max(1, Math.round(targetH * (img.width / img.height)));
  for(let tx = x; tx < x + width; tx += Math.max(1, tileW - 2)){
    const drawW = Math.min(tileW, x + width - tx);
    const srcW = Math.max(1, Math.round(img.width * (drawW / tileW)));
    ctx.drawImage(img, 0, 0, srcW, img.height, tx, y, drawW, targetH);
  }
}

function drawGroundStripAdv(gY, groundPlatforms){
  const lvl2  = LEVELS[GS.level] || LEVELS[0];
  const c2    = getLvlColors(lvl2);
  const biome = getLevelBiome();
  const topImg  = getBiomeImg(biome, 'groundPlatform');
  const bodyImg = getBiomeImg(biome, 'ground');

  // Merge adjacent ground tiles into contiguous draw-chunks
  const sorted = [...groundPlatforms].sort((a, b) => a.x - b.x);
  const chunks = [];
  for(const p of sorted){
    const last = chunks[chunks.length - 1];
    if(last && p.x <= last.x + last.w + 2){
      last.w = Math.max(last.w, p.x + p.w - last.x);
    } else {
      chunks.push({ x: p.x, w: p.w });
    }
  }

  for(const ch of chunks){
    if(topImg && bodyImg){
      drawRepeatedSprite(topImg, ch.x, gY - 24, ch.w, 42);
      for(let ty = gY + 14; ty < H + 28; ty += 25)
        drawRepeatedSprite(bodyImg, ch.x, ty, ch.w, 28);
    } else {
      ctx.fillStyle = c2.ground;
      ctx.fillRect(ch.x, gY - 15, ch.w, H - (gY - 15));
    }
  }
}

// ── Plateformes flottantes (sprite-based) ─────────────────────
function drawPlatformAdv(p, lvl){
  if(p.type !== 'ground' && p.type !== 'pillar'){
    if(p.nosprite) return;
    const floatingImg = getBiomeImg(getLevelBiome(), 'floating');
    if(floatingImg){
      // Draw floating platforms at full sprite width and align collision to top walkable band.
      const drawW = p.w;
      const drawH = Math.max(24, Math.round(drawW * (floatingImg.height / floatingImg.width)));
      const drawX = p.x;
      const drawY = p.y - Math.round(drawH * 0.14);
      ctx.drawImage(floatingImg, drawX, drawY, drawW, drawH);
      return;
    }
  }

  // Fallback procédural
  if(p.type === 'ground'){
    ctx.fillStyle = lvl.ground;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = lighten(lvl.ground);
    ctx.fillRect(p.x, p.y, p.w, 3);
  } else {
    ctx.fillStyle = '#a07850';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.fillRect(p.x, p.y, p.w, 2);
  }
}

// ── Joueur ────────────────────────────────────────────────────
function drawPlayer(p){
  if(advStyle==='advanced'){ drawPlayerAdv(p); return; }
  if(p.invTimer>0 && Math.floor(p.invTimer/6)%2===0){ return; }
  ctx.save();
  ctx.translate(p.x+p.w/2, p.y+p.h);
  ctx.scale(p.facing,1);
  const leg = Math.sin(p.walkT)*6;
  const arm = Math.sin(p.walkT+Math.PI)*5;

  // Ombre
  ctx.fillStyle='rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(0,0,13,4,0,0,Math.PI*2); ctx.fill();

  const skin = SAVE.skin || 'knight';
  if(skin==='knight')      drawSkinKnight(leg, arm);
  else if(skin==='mage')   drawSkinMage(leg, arm);
  else if(skin==='ninja')  drawSkinNinja(leg, arm);
  else if(skin==='pirate') drawSkinPirate(leg, arm);

  ctx.restore();
}

function drawEyes(eyeColor='#1e3a8a'){
  ctx.fillStyle='#fff';
  ctx.fillRect(-6,-50,4,3);
  ctx.fillRect( 2,-50,4,3);
  ctx.fillStyle=eyeColor;
  ctx.fillRect(-5,-50,2,2);
  ctx.fillRect( 3,-50,2,2);
}

function drawSkinKnight(leg, arm){
  // Jambes
  ctx.fillStyle='#1e40af';
  ctx.fillRect(-10,-16+leg, 8,16);
  ctx.fillRect( 2, -16-leg, 8,16);
  // Corps
  ctx.fillStyle='#3b82f6';
  ctx.fillRect(-12,-38,24,24);
  ctx.fillStyle='#60a5fa';
  ctx.fillRect(-10,-37,8,8);
  ctx.fillRect(  2,-37,8,8);
  // Bras
  ctx.fillStyle='#3b82f6';
  ctx.fillRect(-18,-36+arm, 7,14);
  ctx.fillRect( 11,-36-arm, 7,14);
  // Épée
  ctx.fillStyle='#e2e8f0';
  ctx.fillRect(16,-44-arm, 3,22);
  ctx.fillStyle='#fbbf24';
  ctx.fillRect(13,-43-arm, 9, 4);
  // Tête
  ctx.fillStyle='#fde68a';
  ctx.fillRect(-9,-56,18,20);
  // Casque
  ctx.fillStyle='#9ca3af';
  ctx.fillRect(-11,-62,22,14);
  ctx.fillStyle='#6b7280';
  ctx.fillRect(-11,-62,22,4);
  ctx.fillRect(-11,-62,4,14);
  ctx.fillRect( 7,-62,4,14);
  // Visière
  ctx.fillStyle='rgba(100,180,255,.4)';
  ctx.fillRect(-7,-58,14,8);
  drawEyes('#1e3a8a');
}

function drawSkinMage(leg, arm){
  // Jambes (robe)
  ctx.fillStyle='#6d28d9';
  ctx.fillRect(-11,-16+leg, 9,16);
  ctx.fillRect( 2, -16-leg, 9,16);
  // Robe corps
  ctx.fillStyle='#7c3aed';
  ctx.fillRect(-13,-40,26,26);
  // Reflet robe
  ctx.fillStyle='#a78bfa';
  ctx.fillRect(-10,-39,6,10);
  // Bras
  ctx.fillStyle='#7c3aed';
  ctx.fillRect(-19,-38+arm, 7,15);
  ctx.fillRect( 12,-38-arm, 7,15);
  // Bâton magique
  ctx.fillStyle='#92400e';
  ctx.fillRect(17,-52-arm, 4,26);
  ctx.fillStyle='#a78bfa';
  ctx.shadowColor='#a78bfa'; ctx.shadowBlur=8;
  ctx.beginPath(); ctx.arc(19,-53-arm, 5, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  // Étoile sur bâton
  ctx.fillStyle='#fbbf24';
  ctx.font='8px Arial'; ctx.textAlign='center';
  ctx.fillText('✦',19,-53-arm);
  // Tête
  ctx.fillStyle='#fde68a';
  ctx.fillRect(-9,-56,18,20);
  // Chapeau pointu
  ctx.fillStyle='#4c1d95';
  ctx.beginPath();
  ctx.moveTo(0,-75); ctx.lineTo(-13,-60); ctx.lineTo(13,-60);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle='#6d28d9';
  ctx.fillRect(-13,-63,26,5);
  drawEyes('#4c1d95');
}

function drawSkinNinja(leg, arm){
  // Jambes noires
  ctx.fillStyle='#111827';
  ctx.fillRect(-10,-16+leg, 8,16);
  ctx.fillRect( 2, -16-leg, 8,16);
  // Corps
  ctx.fillStyle='#1f2937';
  ctx.fillRect(-12,-38,24,24);
  ctx.fillStyle='#374151';
  ctx.fillRect(-10,-37,7,9);
  // Bras
  ctx.fillStyle='#1f2937';
  ctx.fillRect(-18,-36+arm, 7,14);
  ctx.fillRect( 11,-36-arm, 7,14);
  // Kunai
  ctx.fillStyle='#9ca3af';
  ctx.fillRect(16,-46-arm, 2,20);
  ctx.fillStyle='#6b7280';
  ctx.beginPath();
  ctx.moveTo(17,-48-arm); ctx.lineTo(13,-44-arm); ctx.lineTo(21,-44-arm);
  ctx.closePath(); ctx.fill();
  // Tête
  ctx.fillStyle='#fde68a';
  ctx.fillRect(-9,-56,18,20);
  // Masque ninja
  ctx.fillStyle='#111827';
  ctx.fillRect(-11,-62,22,14); // bandeau haut
  ctx.fillRect(-11,-52,22,8);  // masque bas (bouche)
  // Bandeau rouge
  ctx.fillStyle='#dc2626';
  ctx.fillRect(-11,-59,22,4);
  drawEyes('#fff');
}

function drawSkinPirate(leg, arm){
  // Jambes
  ctx.fillStyle='#7c2d12';
  ctx.fillRect(-10,-16+leg, 8,16);
  ctx.fillRect( 2, -16-leg, 8,16);
  // Corps
  ctx.fillStyle='#9a3412';
  ctx.fillRect(-12,-38,24,24);
  ctx.fillStyle='#c2410c';
  ctx.fillRect(-10,-37,8,8);
  // Écharpe
  ctx.fillStyle='#facc15';
  ctx.fillRect(-12,-30,24,5);
  // Bras
  ctx.fillStyle='#9a3412';
  ctx.fillRect(-18,-36+arm, 7,14);
  ctx.fillRect( 11,-36-arm, 7,14);
  // Sabre courbe (simplifié)
  ctx.fillStyle='#e2e8f0';
  ctx.fillRect(15,-46-arm, 3,24);
  ctx.fillStyle='#fbbf24';
  ctx.fillRect(12,-44-arm,10,4);
  ctx.fillStyle='#e2e8f0';
  ctx.fillRect(17,-23-arm, 6,3); // pointe incurvée
  // Tête
  ctx.fillStyle='#fcd34d';
  ctx.fillRect(-9,-56,18,20);
  // Tricorne
  ctx.fillStyle='#1c1917';
  ctx.fillRect(-13,-63,26,6);
  ctx.fillStyle='#292524';
  ctx.beginPath();
  ctx.moveTo(-5,-63); ctx.lineTo(0,-74); ctx.lineTo(5,-63);
  ctx.closePath(); ctx.fill();
  // Cache-œil
  ctx.fillStyle='#000';
  ctx.fillRect(-7,-51,5,4);
  ctx.fillStyle='#fff';
  ctx.fillRect(2,-50,4,3);
  ctx.fillStyle='#7c2d12';
  ctx.fillRect(3,-50,2,2);
  // Moustache
  ctx.fillStyle='#92400e';
  ctx.fillRect(-5,-43,10,2);
}

// ── Ennemis ───────────────────────────────────────────────────
function drawEnemy(e){
  ctx.save();
  ctx.translate(e.x+e.w/2, e.y+e.h);
  if(!BIOME_DIRECTIONAL_ENEMIES.has(e.type)){
    ctx.scale(e.facing,1);
  }
  const bob = Math.sin(Date.now()*.004+e.x*.01)*2;

  if(e.type === 'goblin') {
    advStyle === 'advanced' ? drawGoblinAdv(bob, e.facing) : drawGoblin(bob);
  } else if(e.type === 'skeleton') {
    advStyle === 'advanced' ? drawSkeletonAdv(bob) : drawSkeleton(bob);
  } else if(e.type === 'dragon') {
    advStyle === 'advanced' ? drawDragonAdv(bob) : drawDragon(bob);
  } else if(e.type === 'mummy') {
    advStyle === 'advanced' ? drawMummyAdv(bob, e.facing) : drawMummy(bob);
  } else if(e.type === 'forest-sprite') {
    drawForestSpriteAdv(bob, e.facing);
  } else if(e.type === 'forest-goblin-green') {
    drawForestGoblinGreenAdv(bob, e.facing);
  } else if(e.type === 'desert-scorpion') {
    drawDesertScorpionAdv(bob, e.facing);
  } else if(e.type === 'desert-mummy') {
    drawDesertMummyAdv(bob, e.facing);
  } else if(e.type === 'mountain-troll') {
    drawMountainTrollAdv(bob, e.facing);
  } else if(e.type === 'mountain-dwarf') {
    drawMountainDwarfAdv(bob, e.facing);
  } else if(e.type === 'frost-zombie') {
    drawFrostZombieAdv(bob, e.facing);
  } else if(e.type === 'snow-yeti') {
    drawSnowYetiAdv(bob, e.facing);
  } else if(e.type === 'desolation-skeleton') {
    drawDesolationSkeletonAdv(bob, e.facing);
  } else if(e.type === 'desolation-wraith') {
    drawDesolationWraithAdv(bob, e.facing);
  }

  ctx.restore();

  // Indicateur d'alerte
  if(e.alert && !QS.active){
    ctx.font='bold 15px Arial'; ctx.textAlign='center';
    ctx.fillStyle='#ffd700';
    ctx.fillText('❗', e.x+e.w/2, e.y-6);
  }

  // Pastille couleur groupe
  ctx.fillStyle = VERBS[e.verbData.gKey].color;
  ctx.fillRect(e.x, e.y-5, e.w, 4);
  ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=.5;
  ctx.strokeRect(e.x, e.y-5, e.w, 4);
}

function drawGoblin(bob){
  // Ombre
  ctx.fillStyle='rgba(0,0,0,.2)';
  ctx.beginPath(); ctx.ellipse(0,0,11,3,0,0,Math.PI*2); ctx.fill();

  // Jambes
  ctx.fillStyle='#7c3aed';
  ctx.fillRect(-8,-14,6,14); ctx.fillRect(2,-14,6,14);

  // Corps
  ctx.fillStyle='#16a34a';
  ctx.fillRect(-11,-34+bob,22,22);
  ctx.fillStyle='#15803d';
  ctx.beginPath(); ctx.ellipse(0,-23+bob,7,8,0,0,Math.PI*2); ctx.fill();

  // Bras
  ctx.fillStyle='#16a34a';
  ctx.fillRect(-18,-32+bob,7,12); ctx.fillRect(11,-32+bob,7,12);

  // Massue
  ctx.fillStyle='#7c5a20';
  ctx.fillRect(16,-37+bob,4,16);
  ctx.fillStyle='#5a3a10';
  ctx.fillRect(13,-40+bob,10,7);

  // Tête
  ctx.fillStyle='#22c55e';
  ctx.fillRect(-12,-52+bob,24,20);

  // Oreilles pointues
  ctx.fillStyle='#16a34a';
  ctx.beginPath(); ctx.moveTo(-12,-48+bob); ctx.lineTo(-21,-58+bob); ctx.lineTo(-12,-40+bob); ctx.fill();
  ctx.beginPath(); ctx.moveTo( 12,-48+bob); ctx.lineTo( 21,-58+bob); ctx.lineTo( 12,-40+bob); ctx.fill();

  // Yeux
  ctx.fillStyle='#ff0000';
  ctx.fillRect(-7,-46+bob,5,4); ctx.fillRect(2,-46+bob,5,4);
  ctx.fillStyle='#fff';
  ctx.fillRect(-6,-45+bob,2,2); ctx.fillRect(3,-45+bob,2,2);

  // Dents
  ctx.fillStyle='#fff';
  ctx.fillRect(-5,-36+bob,3,4); ctx.fillRect(2,-36+bob,3,4);
}

function drawSkeleton(bob){
  ctx.fillStyle='rgba(0,0,0,.2)';
  ctx.beginPath(); ctx.ellipse(0,0,10,3,0,0,Math.PI*2); ctx.fill();

  // Jambes os
  ctx.fillStyle='#e2e8f0';
  ctx.fillRect(-7,-14,4,14); ctx.fillRect(3,-14,4,14);
  ctx.beginPath(); ctx.arc(-5,-14,4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( 5,-14,4,0,Math.PI*2); ctx.fill();

  // Côtes
  ctx.strokeStyle='#cbd5e1'; ctx.lineWidth=2;
  for(let r=0;r<3;r++){
    ctx.beginPath();
    ctx.moveTo(-8,-18-r*5+bob); ctx.lineTo(8,-18-r*5+bob); ctx.stroke();
  }

  // Colonne
  ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(0,-14+bob); ctx.lineTo(0,-34+bob); ctx.stroke();

  // Épaules
  ctx.fillStyle='#e2e8f0';
  ctx.beginPath(); ctx.arc(-10,-32+bob,4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( 10,-32+bob,4,0,Math.PI*2); ctx.fill();

  // Bras
  ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(-10,-32+bob); ctx.lineTo(-16,-20+bob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( 10,-32+bob); ctx.lineTo( 16,-20+bob); ctx.stroke();

  // Épée squelette
  ctx.beginPath(); ctx.moveTo(16,-20+bob); ctx.lineTo(20,-36+bob); ctx.stroke();
  ctx.strokeStyle='#94a3b8'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(20,-36+bob); ctx.lineTo(23,-54+bob); ctx.stroke();

  // Crâne
  ctx.fillStyle='#f1f5f9';
  ctx.beginPath(); ctx.ellipse(0,-44+bob,11,12,0,0,Math.PI*2); ctx.fill();

  // Mâchoire
  ctx.fillStyle='#e2e8f0';
  ctx.fillRect(-8,-36+bob,16,6);

  // Orbites
  ctx.fillStyle='#1e293b';
  ctx.beginPath(); ctx.ellipse(-4,-46+bob,4,5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 4,-46+bob,4,5,0,0,Math.PI*2); ctx.fill();

  // Lueur yeux
  ctx.fillStyle='#22d3ee';
  ctx.beginPath(); ctx.ellipse(-4,-46+bob,2,2.5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 4,-46+bob,2,2.5,0,0,Math.PI*2); ctx.fill();

  // Dents
  ctx.fillStyle='#f1f5f9';
  for(let t=-6;t<=4;t+=4) ctx.fillRect(t,-36+bob,3,5);
}

function drawDragon(bob){
  ctx.save(); ctx.scale(1.25,1.25);

  // Queue
  ctx.strokeStyle='#7f1d1d'; ctx.lineWidth=9;
  ctx.beginPath();
  ctx.moveTo(12,-8+bob);
  ctx.quadraticCurveTo(26,-2+bob, 22,-24+bob);
  ctx.stroke();

  // Corps
  ctx.fillStyle='#991b1b';
  ctx.fillRect(-15,-36+bob,30,28);
  ctx.fillStyle='#7f1d1d';
  ctx.fillRect(-11,-34+bob,22,5);

  // Ailes
  ctx.fillStyle='#b91c1c';
  ctx.beginPath(); ctx.moveTo(-15,-28+bob); ctx.lineTo(-32,-52+bob); ctx.lineTo(-15,-18+bob); ctx.fill();
  ctx.beginPath(); ctx.moveTo( 15,-28+bob); ctx.lineTo( 32,-52+bob); ctx.lineTo( 15,-18+bob); ctx.fill();
  // Nervures ailes
  ctx.strokeStyle='#7f1d1d'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-15,-28+bob); ctx.lineTo(-26,-46+bob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( 15,-28+bob); ctx.lineTo( 26,-46+bob); ctx.stroke();

  // Ventre
  ctx.fillStyle='#fca5a5';
  ctx.fillRect(-8,-30+bob,16,22);

  // Tête
  ctx.fillStyle='#991b1b';
  ctx.fillRect(-14,-57+bob,28,23);

  // Museau
  ctx.fillStyle='#7f1d1d';
  ctx.fillRect(14,-54+bob,13,10);

  // Cornes
  ctx.fillStyle='#fbbf24';
  ctx.beginPath(); ctx.moveTo(-8,-57+bob); ctx.lineTo(-13,-72+bob); ctx.lineTo(-4,-57+bob); ctx.fill();
  ctx.beginPath(); ctx.moveTo( 8,-57+bob); ctx.lineTo( 13,-72+bob); ctx.lineTo(  4,-57+bob); ctx.fill();

  // Yeux
  ctx.fillStyle='#fbbf24';
  ctx.beginPath(); ctx.ellipse(-5,-48+bob,4,5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#1e0a00';
  ctx.beginPath(); ctx.ellipse(-5,-48+bob,2,3,0,0,Math.PI*2); ctx.fill();

  // Flamme
  if(Math.sin(Date.now()*.006)>0.3){
    ctx.fillStyle='rgba(255,140,0,.85)';
    ctx.beginPath(); ctx.moveTo(27,-50+bob); ctx.lineTo(50,-46+bob); ctx.lineTo(27,-43+bob); ctx.fill();
    ctx.fillStyle='rgba(255,220,0,.5)';
    ctx.beginPath(); ctx.moveTo(27,-49+bob); ctx.lineTo(44,-46+bob); ctx.lineTo(27,-44+bob); ctx.fill();
  }

  ctx.restore();
}

function enemyEmoji(type){ return {goblin:'👺',skeleton:'💀',dragon:'🐉',mummy:'🏺','forest-sprite':'🧚','forest-goblin-green':'👺','desert-scorpion':'🦂','desert-mummy':'🏺','mountain-troll':'🗿','mountain-dwarf':'⛏️','frost-zombie':'🧟','snow-yeti':'❄️','desolation-skeleton':'💀','desolation-wraith':'👻'}[type]||'👾'; }

// ── HUD ───────────────────────────────────────────────────────
function drawHUD(){
  const lvl = LEVELS[GS.level];

  ctx.fillStyle='rgba(0,0,0,.62)';
  ctx.fillRect(0,0,W,46);

  // Vies
  ctx.font='21px Arial'; ctx.textAlign='left';
  for(let i=0;i<3;i++) ctx.fillText(i<GS.lives?'❤️':'🖤', 8+i*30, 33);

  // Score
  ctx.fillStyle='#e2e8f0'; ctx.font='bold 15px Courier New'; ctx.textAlign='right';
  ctx.fillText(`${GS.score} pts`, W-8, 31);

  // Étoiles niveau (progression)
  ctx.fillStyle='#ffd700'; ctx.textAlign='center'; ctx.font='13px Courier New';
  ctx.fillText(`⭐ ${GS.stars}/${GS.maxStars}`, W/2, 31);

  // Version
  ctx.fillStyle='rgba(255,255,255,.35)'; ctx.textAlign='left'; ctx.font='9px Courier New';
  ctx.fillText(VERSION, 6, 12);

  // Étoiles persistantes (monnaie boutique)
  ctx.fillStyle='#fbbf24'; ctx.textAlign='left'; ctx.font='bold 11px Courier New';
  ctx.fillText(`🪙${SAVE.totalStars}`, 100, 12);

  // Nom du niveau
  ctx.fillStyle='#a78bfa'; ctx.font='10px Courier New';
  ctx.fillText(`Niv.${GS.level+1} · ${lvl.name}`, W/2, 12);

  // Ennemis restants
  const alive = enemies.filter(e=>e.alive).length;
  ctx.fillStyle = alive>0?'#fca5a5':'#86efac';
  ctx.textAlign='right'; ctx.font='10px Courier New';
  ctx.fillText(`👾 ${alive} restant${alive>1?'s':''}`, W-8, 12);
}

// ════════════════════════════════════════════════════════════════
//  GESTION DES SCREENS
// ════════════════════════════════════════════════════════════════

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  const el=document.getElementById(id);
  if(el) el.classList.remove('hidden');
  document.getElementById('gameHUDBtns').style.display='none';
  document.body.classList.add('screen-mode');
}
function hideScreens(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  document.getElementById('gameHUDBtns').style.display='flex';
  document.body.classList.remove('screen-mode');
}

function startLevel(idx){
  GS.level  = idx;
  GS.score  = 0;
  GS.lives  = 3;
  GS.stars  = 0;
  if(idx === 0) GS.total = 0;
  generateLevel(LEVELS[idx]);
  GS.screen = 'game';
  hideScreens();
  document.getElementById('ctrl').style.display='flex';
}

function triggerLevelComplete(){
  if(GS.screen==='levelComplete') return;
  GS.screen = 'levelComplete';

  const totalEn = enemies.length;
  const killed  = enemies.filter(e=>!e.alive).length;
  const starCount = Math.min(3, 1+Math.floor(GS.stars/Math.max(1,GS.maxStars)*2)+(killed===totalEn?1:0));
  GS.total += GS.score;

  const starsHtml = '⭐'.repeat(starCount)+'☆'.repeat(3-starCount);
  document.getElementById('lcEmoji').textContent = LEVELS[GS.level].emoji;
  document.getElementById('lcTitle').textContent = `NIVEAU ${GS.level+1} TERMINÉ !`;
  document.getElementById('lcMsg').innerHTML =
    `<div style="font-size:34px;margin-bottom:10px">${starsHtml}</div>
     Score : <b style="color:#ffd700">${GS.score}</b><br>
     Étoiles : ${GS.stars}/${GS.maxStars}<br>
     <span style="color:#a78bfa">Ennemis : ${killed}/${totalEn}</span>`;

  document.getElementById('nextLevelBtn').textContent =
    GS.level>=LEVELS.length-1 ? '🏆 RÉSULTAT FINAL' : '▶ NIVEAU SUIVANT';

  showScreen('levelCompleteScreen');
}

function triggerGameOver(){
  GS.screen='gameOver';
  document.getElementById('gameOverMsg').innerHTML =
    `Niveau ${GS.level+1} &middot; Score : <b style="color:#ffd700">${GS.score}</b>`;
  showScreen('gameOverScreen');
}

// ════════════════════════════════════════════════════════════════
//  BOUTONS UI
// ════════════════════════════════════════════════════════════════

function populateLevelSelector(){
  const sel = document.getElementById('settingsLevelSelect');
  if(!sel) return;
  sel.innerHTML = '';
  LEVELS.forEach((lvl, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `Niv.${idx+1} · ${lvl.name}`;
    sel.appendChild(opt);
  });
  sel.value = String(Math.max(0, Math.min(GS.level, LEVELS.length - 1)));
}

function openSettingsScreen(){
  showScreen('settingsScreen');
  renderErrorList();
  populateLevelSelector();
  const updateMsg = document.getElementById('settingsUpdateMsg');
  if(updateMsg) updateMsg.textContent = '';
}

document.getElementById('playBtn').addEventListener('click',     ()=>startLevel(0));
document.getElementById('settingsBtn').addEventListener('click', openSettingsScreen);
document.getElementById('shopBtn').addEventListener('click',     ()=>{ showScreen('shopScreen'); renderShop(); });
document.getElementById('shopBackBtn').addEventListener('click', ()=>{
  if(GS._shopFromGame){
    GS._shopFromGame = false;
    GS.paused = false;
    document.getElementById('inGamePauseBtn').classList.remove('active');
    hideScreens();
    GS.screen = 'game';
    document.getElementById('ctrl').style.display='flex';
  } else {
    showScreen('startScreen');
  }
  renderShop();
});

// ── Boutons HUD in-game ──────────────────────────────────────
document.getElementById('inGamePauseBtn').addEventListener('click', ()=>{
  GS.paused = !GS.paused;
  document.getElementById('inGamePauseBtn').classList.toggle('active', GS.paused);
});

document.getElementById('inGameShopBtn').addEventListener('click', ()=>{
  GS.paused = true;
  GS._shopFromGame = true;
  document.getElementById('ctrl').style.display='none';
  showScreen('shopScreen');
  renderShop();
});

document.getElementById('inGameMenuBtn').addEventListener('click', ()=>{
  GS.paused = false;
  GS.screen = 'start';
  document.getElementById('ctrl').style.display='none';
  showScreen('startScreen');
  renderShop();
});
document.getElementById('resetErrorsBtn').addEventListener('click', resetErrors);
document.getElementById('settingsBackBtn').addEventListener('click',()=>showScreen('startScreen'));
document.getElementById('howtoBtn').addEventListener('click',    ()=>showScreen('howtoScreen'));
document.getElementById('howtoBackBtn').addEventListener('click',()=>showScreen('startScreen'));
document.getElementById('startSelectedLevelBtn').addEventListener('click', ()=>{
  const sel = document.getElementById('settingsLevelSelect');
  const idx = Number.parseInt(sel && sel.value, 10);
  const safeIdx = Number.isFinite(idx) ? Math.max(0, Math.min(LEVELS.length - 1, idx)) : 0;
  startLevel(safeIdx);
});
document.getElementById('settingsUpdateBtn').addEventListener('click', async ()=>{
  const updateMsg = document.getElementById('settingsUpdateMsg');
  if(updateMsg) updateMsg.textContent = 'Vérification en cours...';

  if(!window.__cqSW){
    if(updateMsg) updateMsg.textContent = 'Mises à jour indisponibles sur ce navigateur.';
    return;
  }

  if(window.__cqSW.applyWaitingUpdate()){
    if(updateMsg) updateMsg.textContent = 'Application de la mise à jour...';
    return;
  }

  const res = await window.__cqSW.checkForUpdate();
  if(res && res.waiting){
    window.__cqSW.applyWaitingUpdate();
  } else if(updateMsg){
    updateMsg.textContent = (res && res.message) ? res.message : 'Vérification terminée.';
  }
});

// ── Toggles de thème ─────────────────────────────────────────
document.querySelectorAll('.themeTog').forEach(btn => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
});

// ── Toggle style sprites ──────────────────────────────────────
document.querySelectorAll('.sprTog').forEach(btn => {
  btn.addEventListener('click', () => setSprStyle(btn.dataset.spr));
});

// ── Logique des toggles de réglages ──────────────────────────
document.querySelectorAll('.tog:not(.themeTog):not(.sprTog)').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type; // 'group' | 'tense'
    const val  = btn.dataset.val;
    const arr  = type==='group' ? SETTINGS.groups : SETTINGS.tenses;
    const idx  = arr.indexOf(val);

    if(idx>=0){
      // Désactiver seulement si pas le dernier actif
      if(arr.length > 1){
        arr.splice(idx,1);
        btn.classList.remove('on');
        document.getElementById('setWarn').textContent='';
      } else {
        document.getElementById('setWarn').textContent =
          `⚠️ Garde au moins un ${type==='group'?'groupe':'temps'} actif.`;
      }
    } else {
      arr.push(val);
      btn.classList.add('on');
      document.getElementById('setWarn').textContent='';
    }
  });
});
document.getElementById('retryBtn').addEventListener('click',    ()=>startLevel(GS.level));
document.getElementById('menuBtn').addEventListener('click',     ()=>showScreen('startScreen'));
document.getElementById('menuBtn2').addEventListener('click',    ()=>showScreen('startScreen'));
document.getElementById('menuBtn3').addEventListener('click',    ()=>showScreen('startScreen'));
document.getElementById('playAgainBtn').addEventListener('click',()=>startLevel(0));

document.getElementById('nextLevelBtn').addEventListener('click',()=>{
  if(GS.level>=LEVELS.length-1){
    document.getElementById('finalScore').innerHTML =
      `Score total : <b style="color:#ffd700">${GS.total}</b><br><br>
       Tu maîtrises maintenant :<br>
       🟣 Groupe 1 · Présent & Imparfait<br>
       🔵 Groupe 2 · Présent & Imparfait<br>
       🔴 Groupe 3 · Présent & Futur simple`;
    showScreen('winScreen');
  } else {
    startLevel(GS.level+1);
  }
});

// ════════════════════════════════════════════════════════════════
//  CHÂTEAU — INTÉRIEUR
// ════════════════════════════════════════════════════════════════

const castlePlayer = { x:50, y:400, vx:0, vy:0, onGround:false, facing:1, walkT:0, w:28, h:44 };
const CHEST_OBJ   = { x:195, y:H-113, w:64, h:58 };
const castlePlats = [{ x:0, y:H-55, w:W, h:60, type:'ground' }];
const CQ = { active:false, streak:0, needed:3 };

function updateCastlePhysics(dt){
  const cp = castlePlayer;
  cp.vx = 0;
  if(keys.left)  { cp.vx=-PSPEED; cp.facing=-1; }
  if(keys.right) { cp.vx= PSPEED; cp.facing= 1; }
  if(jumpRequest && cp.onGround){ cp.vy=JUMP_V; cp.onGround=false; }
  jumpRequest=false;

  cp.vy = Math.min(cp.vy+GRAV*dt, MAX_FALL);
  cp.x += cp.vx*dt; cp.y += cp.vy*dt;
  cp.x = Math.max(0, Math.min(W-cp.w, cp.x));
  if(cp.y < 46){ cp.y=46; cp.vy=Math.max(0,cp.vy); }

  cp.onGround=false;
  for(const p of castlePlats) resolveAABB(cp,p);

  if(cp.vx!==0&&cp.onGround) cp.walkT=(cp.walkT+dt*8)%1000; else if(cp.onGround) cp.walkT=0;
  if(chestExplodeT>0) chestExplodeT=Math.max(0,chestExplodeT-dt);

  // Sortie par la porte gauche
  if(cp.x<=2){
    player.x=castlePlayerSavedX; player.vy=0;
    GS.screen='game'; return;
  }
  // Contact avec le coffre
  if(castleChestState==='closed' && !QS.active && rectsTouch(cp,CHEST_OBJ)){
    openChestQuestion();
  }
}

// ── Quiz coffre ──────────────────────────────────────────────

function buildChestQuestion(){
  const q = makeQuestion(randomVerbData());
  QS.q = q;
  const hearts = '🔑'.repeat(CQ.streak)+'⬜'.repeat(CQ.needed-CQ.streak);
  document.getElementById('qEnemy').textContent = '📦';
  document.getElementById('qGroup').textContent = `Coffre magique — ${CQ.streak}/${CQ.needed}`;
  document.getElementById('qTense').textContent = q.tenseLabel;
  document.getElementById('qText').innerHTML =
    `Conjugue le verbe <span class="vb">${q.vKey}</span> au <span class="vb">${q.tenseLabel}</span> :<br>
     <span class="pro">${PRONOUN_LABEL[q.pronIdx]}</span> <span class="blank">???</span>`;
  const container = document.getElementById('qAnswers');
  container.innerHTML='';
  q.options.forEach(opt=>{
    const btn=document.createElement('button');
    btn.className='qBtn'; btn.textContent=opt;
    const h=()=>chestAnswerClick(opt);
    btn.addEventListener('click',h);
    btn.addEventListener('touchend',e=>{e.preventDefault();h();},{passive:false});
    container.appendChild(btn);
  });
  QK.selectedBtn = null;
  syncQuestionKeyboardSelection();
  document.getElementById('qHP').innerHTML=
    `<span style="font-size:13px;color:#ffd700">${hearts} — 3 bonnes réponses d'affilée !</span>`;
}

function openChestQuestion(){
  if(QS.active) return;
  clearMoveKeys();
  QS.active=true; QS.enemy=null;
  CQ.active=true; CQ.streak=0;
  buildChestQuestion();
  document.getElementById('qModal').classList.add('show');
  GS.screen='question';
}

function chestAnswerClick(answer){
  if(!QS.active) return;
  const btns=document.querySelectorAll('.qBtn');
  btns.forEach(b=>b.disabled=true);
  QK.selectedBtn = null;
  syncQuestionKeyboardSelection();
  btns.forEach(b=>{
    if(b.textContent===QS.q.correct) b.classList.add('ok');
    if(b.textContent===answer&&answer!==QS.q.correct) b.classList.add('bad');
  });

  if(answer===QS.q.correct){
    CQ.streak++;
    if(CQ.streak>=CQ.needed){
      // Succès : 3 bonnes réponses d'affilée !
      setTimeout(()=>{
        const coins = 10+Math.floor(Math.random()*41); // 10-50
        castleRewardCoins = coins;
        castleChestState  = 'open';
        SAVE.totalStars  += coins;
        saveSave();
        closeQuestion();
      },700);
    } else {
      // Question suivante
      setTimeout(()=>buildChestQuestion(),700);
    }
  } else {
    // Mauvaise réponse : coffre explose, modal se ferme
    recordError(QS.q);
    if(navigator.vibrate) navigator.vibrate([100,60,250]);
    setTimeout(()=>{
      castleChestState = 'destroyed';
      chestExplodeT = 2.2;
      closeQuestion();
    },800);
  }
}

// ── Dessin coffre ────────────────────────────────────────────

function drawChest(){
  const c=CHEST_OBJ;
  if(castleChestState==='destroyed'){
    const t=Date.now()*.003;
    // Morceaux de bois éparpillés
    const pieces=[
      [c.x-22,c.y+c.h-18,32,9,-0.35],
      [c.x+c.w-8, c.y+c.h-14,28,8, 0.42],
      [c.x+8,     c.y+c.h-44,22,9,-0.55],
      [c.x+c.w/2, c.y+4,     24,7, 0.22],
      [c.x-12,    c.y+c.h/2, 20,7,-0.72],
    ];
    for(const [px,py,pw,ph,ang] of pieces){
      ctx.save();
      ctx.translate(px+pw/2, py+ph/2);
      ctx.rotate(ang+Math.sin(t+px*.1)*.06);
      ctx.fillStyle='#5a3810'; ctx.fillRect(-pw/2,-ph/2,pw,ph);
      ctx.fillStyle='#3a2208'; ctx.fillRect(-pw/2,-ph/2,pw,2);
      ctx.fillStyle='#a08040'; ctx.fillRect(-pw/2+pw*.3,-ph/2,4,ph); // metal strip
      ctx.restore();
    }
    // Fumée
    for(let i=0;i<3;i++){
      const sr=16+i*10+Math.sin(t+i)*5;
      const sa=Math.max(0,.5-i*.15-Date.now()*.0001%0.3);
      ctx.save(); ctx.globalAlpha=sa;
      ctx.fillStyle='#666';
      ctx.beginPath(); ctx.arc(c.x+c.w/2+Math.sin(t+i*2)*6, c.y-10-i*16, sr, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha=1; ctx.restore();
    }
    ctx.fillStyle='#ef4444'; ctx.font='bold 13px Courier New'; ctx.textAlign='center';
    ctx.fillText('💥 COFFRE DÉTRUIT !', c.x+c.w/2, c.y-50);
    return;
  }
  if(castleChestState==='open'){
    // Base
    ctx.fillStyle='#7a4a10'; ctx.fillRect(c.x,c.y+22,c.w,c.h-22);
    ctx.fillStyle='#5a3008'; ctx.fillRect(c.x+3,c.y+25,c.w-6,c.h-25);
    ctx.fillStyle='#6a4010'; ctx.fillRect(c.x,c.y+22,c.w,4); ctx.fillRect(c.x,c.y+c.h-8,c.w,3);
    // Couvercle ouvert (rotation)
    ctx.save();
    ctx.translate(c.x+c.w/2,c.y+22);
    ctx.rotate(-Math.PI*.58);
    ctx.fillStyle='#8a5018'; ctx.fillRect(-c.w/2,0,c.w,c.h*.36);
    ctx.fillStyle='#a06020'; ctx.fillRect(-c.w/2,0,c.w,5);
    ctx.restore();
    // Pièces à l'intérieur
    ctx.fillStyle='#ffd700';
    for(let i=0;i<6;i++){
      ctx.beginPath(); ctx.ellipse(c.x+10+i*8,c.y+34+Math.sin(i)*2,5,3,0,0,Math.PI*2); ctx.fill();
    }
    // Étincelles
    const t=Date.now()*.005;
    ctx.font='16px Arial'; ctx.textAlign='center';
    ['✨','💰','✨'].forEach((em,i)=>{
      ctx.fillText(em, c.x+c.w/2+(i-1)*22+Math.sin(t+i)*5, c.y-4+Math.sin(t+i*1.5)*8);
    });
  } else {
    // Coffre fermé (pulsation légère)
    const pulse=1+Math.sin(Date.now()*.004)*.025;
    ctx.save();
    ctx.translate(c.x+c.w/2,c.y+c.h/2);
    ctx.scale(pulse,pulse);
    const hw=c.w/2, hh=c.h/2;
    // Ombre
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(-hw+5,hh+3,c.w,8);
    // Corps
    ctx.fillStyle='#7a4a10'; ctx.fillRect(-hw,hh*.25,c.w,hh*.75+hh);
    ctx.fillStyle='#5a3008'; ctx.fillRect(-hw+3,hh*.28,c.w-6,hh*.72+hh-2);
    // Bandes bois
    ctx.fillStyle='#6a4010';
    for(let i=0;i<2;i++) ctx.fillRect(-hw,hh*.25+i*(c.h*.75/3),c.w,4);
    // Renforts métalliques
    ctx.fillStyle='#a08040';
    for(const [mx,my] of [[-hw,hh*.25],[-hw,hh*.9],[hw-5,hh*.25],[hw-5,hh*.9]]){
      ctx.fillRect(mx,my,5,14);
    }
    // Couvercle
    ctx.fillStyle='#8a5018'; ctx.fillRect(-hw,-hh,c.w,hh*1.3);
    ctx.fillStyle='#a06020'; ctx.fillRect(-hw,-hh,c.w,5);
    ctx.fillStyle='#6a3a10'; ctx.fillRect(-hw,hh*.22,c.w,4);
    // Dôme du couvercle
    ctx.fillStyle='#9a5c20';
    ctx.beginPath(); ctx.ellipse(0,-hh,hw,hh*.2,0,Math.PI,0); ctx.fill();
    // Serrure
    ctx.fillStyle='#ffd700'; ctx.fillRect(-8,hh*.05,16,14);
    ctx.fillStyle='#c8a800';
    ctx.beginPath(); ctx.arc(0,hh*.02,7,Math.PI,0); ctx.fill();
    ctx.fillStyle='#1a1000'; ctx.fillRect(-3,hh*.1,6,7);
    // Bandes verticales
    ctx.fillStyle='rgba(160,120,50,.45)';
    for(const bx of [-hw,-hw*.3,hw*.3,hw-3]) ctx.fillRect(bx,-hh,3,c.h+10);
    ctx.restore();
    // Indication de proximité
    const cp=castlePlayer;
    if(Math.abs((cp.x+cp.w/2)-(c.x+c.w/2))<72&&cp.onGround){
      ctx.fillStyle='#ffd700'; ctx.font='bold 12px Courier New'; ctx.textAlign='center';
      ctx.fillText('⚡ Touchez le coffre !', c.x+c.w/2, c.y-16);
    }
  }
}

// ── Dessin intérieur château ─────────────────────────────────

function drawCastleRoom(){
  const towerInside = advStyle === 'advanced' ? readyImage(commonLevelImages.towerInside) : null;
  if(towerInside){
    // Respect tower-inside aspect ratio and center letterbox/pillarbox as needed.
    const imgRatio = towerInside.width / towerInside.height;
    const canvasRatio = W / H;
    let drawW = W, drawH = H, drawX = 0, drawY = 0;
    if(imgRatio > canvasRatio){
      drawH = W / imgRatio;
      drawY = (H - drawH) / 2;
    } else {
      drawW = H * imgRatio;
      drawX = (W - drawW) / 2;
    }
    ctx.fillStyle = '#050509';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(towerInside, drawX, drawY, drawW, drawH);
    // Slight bottom darkening for better gameplay readability.
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(0, H - 180, W, 180);
  } else {
    // Fallback procedural room
    ctx.fillStyle='#0f0f1e'; ctx.fillRect(0,0,W,H);
    const bW=56,bH=28;
    for(let row=-1;row<=Math.ceil(H/bH);row++){
      for(let col=-1;col<=Math.ceil(W/bW);col++){
        const sx=col*bW+(row%2===0?0:bW/2), sy=row*bH;
        const shade=(row+col)%3===0?'#2e2e42':(row+col)%3===1?'#282838':'#252535';
        ctx.fillStyle=shade; ctx.fillRect(sx+1,sy+1,bW-2,bH-2);
        ctx.fillStyle='rgba(255,255,255,.032)'; ctx.fillRect(sx+1,sy+1,bW-2,2);
        ctx.fillStyle='rgba(0,0,0,.24)'; ctx.fillRect(sx+1,sy+bH-3,bW-2,2);
      }
    }
  }
  const flY = H - 55;
  if(!towerInside){
    // Sol parqueté
    ctx.fillStyle='#3a2810'; ctx.fillRect(0,flY,W,55);
    ctx.fillStyle='#2a1c08'; ctx.fillRect(0,flY,W,5);
    for(let tx=0;tx<W;tx+=48){
      ctx.fillStyle=tx%96===0?'#4a3418':'#3e2c12';
      ctx.fillRect(tx+1,flY+5,47,50);
      ctx.fillStyle='rgba(255,255,255,.04)'; ctx.fillRect(tx+1,flY+5,47,2);
    }
    // Torches
    for(const tx of [70,W-70]){
      const ty=flY-92;
      ctx.fillStyle='#6a6a6a'; ctx.fillRect(tx-3,ty,6,32); ctx.fillRect(tx-9,ty-4,18,8);
      const ft=Date.now()*.006;
      ctx.fillStyle='rgba(255,100,0,.9)';
      ctx.beginPath(); ctx.moveTo(tx,ty-30+Math.sin(ft)*4);
      ctx.lineTo(tx-12,ty+Math.sin(ft+1)*3); ctx.lineTo(tx+12,ty+Math.sin(ft+2)*3); ctx.closePath(); ctx.fill();
      ctx.fillStyle='rgba(255,220,50,.85)';
      ctx.beginPath(); ctx.moveTo(tx,ty-18+Math.sin(ft+.5)*3);
      ctx.lineTo(tx-6,ty+Math.sin(ft+1.5)*2); ctx.lineTo(tx+6,ty+Math.sin(ft+2.5)*2); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha=0.12+Math.sin(ft)*.04;
      const rg=ctx.createRadialGradient(tx,ty-5,0,tx,ty-5,55);
      rg.addColorStop(0,'#ff9900'); rg.addColorStop(1,'transparent');
      ctx.fillStyle=rg; ctx.fillRect(tx-55,ty-60,110,90);
      ctx.globalAlpha=1; ctx.restore();
    }
    // Porte de sortie (gauche)
    const dW=48,dH=130;
    ctx.fillStyle='#050510'; ctx.fillRect(0,flY-dH,dW,dH);
    ctx.fillStyle='#7a5028';
    ctx.fillRect(0,flY-dH,4,dH); ctx.fillRect(dW-4,flY-dH,4,dH); ctx.fillRect(0,flY-dH-4,dW,8);
    ctx.fillStyle='#050510'; ctx.beginPath(); ctx.arc(dW/2,flY-dH,dW/2,Math.PI,0); ctx.fill();
    ctx.strokeStyle='#7a5028'; ctx.lineWidth=6;
    ctx.beginPath(); ctx.arc(dW/2,flY-dH,dW/2+3,Math.PI,0); ctx.stroke();
    ctx.fillStyle='#ffd700'; ctx.font='bold 11px Courier New'; ctx.textAlign='center';
    ctx.fillText('◀ SORTIR', dW/2, flY-dH-12);
  } else {
    // Exit prompt when using tower-inside background art.
    ctx.fillStyle='rgba(0,0,0,.55)';
    ctx.fillRect(6, flY-40, 76, 24);
    ctx.fillStyle='#ffd700';
    ctx.font='bold 12px Courier New';
    ctx.textAlign='left';
    ctx.fillText('◀ SORTIR', 12, flY-24);
  }

  // Coffre
  drawChest();

  // Joueur dans le château
  drawPlayer(castlePlayer);

  // Anneau d'explosion du coffre
  if(chestExplodeT>0){
    const prog=1-chestExplodeT/2.2;
    const cx2=CHEST_OBJ.x+CHEST_OBJ.w/2, cy2=CHEST_OBJ.y+CHEST_OBJ.h/2;
    for(const [col,rMul,lw] of [['#ff6600',1,10],['#ffd700',.65,6],['#fff',.35,3]]){
      ctx.save();
      ctx.globalAlpha=Math.max(0,1-prog*1.4);
      ctx.strokeStyle=col; ctx.lineWidth=lw;
      ctx.beginPath(); ctx.arc(cx2,cy2,prog*130*rMul,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=1; ctx.restore();
    }
    // Flash blanc
    if(prog<0.12){
      ctx.save(); ctx.globalAlpha=(0.12-prog)/0.12*.9;
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
      ctx.globalAlpha=1; ctx.restore();
    }
  }

  // HUD intérieur
  ctx.fillStyle='rgba(0,0,0,.78)'; ctx.fillRect(0,0,W,44);
  ctx.fillStyle='#d4b896'; ctx.font='bold 15px Courier New'; ctx.textAlign='center';
  ctx.fillText('🏰 CHÂTEAU — INTÉRIEUR', W/2, 15);
  ctx.fillStyle='#fbbf24'; ctx.font='11px Courier New';
  ctx.fillText(`🪙 ${SAVE.totalStars} pièces`, W/2, 33);

  // Message récompense coffre
  if(castleChestState==='open'&&castleRewardCoins>0){
    const t=Date.now()*.002;
    ctx.font='bold 22px Courier New'; ctx.textAlign='center';
    ctx.fillStyle=`rgba(255,215,0,${0.85+Math.sin(t)*.1})`;
    ctx.fillText(`+${castleRewardCoins} 🪙 gagnés !`, W/2, CHEST_OBJ.y-28);
  }
}

// ── Sprite château dans le monde (1er plan, grande porte transparente) ──────

// Styles de château selon le niveau (couleurs thématiques)
const CASTLE_STYLES = [
  { body:'#4a6640', dark:'#355230', accent:'#7a9a60', flag:'#22aa44', winCol:'#90ff80' }, // Forêt
  { body:'#2e4a7a', dark:'#1e3060', accent:'#5080b0', flag:'#3399ff', winCol:'#80d0ff' }, // Rivière
  { body:'#4a2870', dark:'#321850', accent:'#7040a0', flag:'#aa00ff', winCol:'#cc88ff' }, // Château Sombre
  { body:'#5a4020', dark:'#3e2a10', accent:'#8a6030', flag:'#cc8800', winCol:'#ffdd88' }, // Cavernes
  { body:'#7a1a10', dark:'#550d08', accent:'#aa3020', flag:'#ff3300', winCol:'#ff9966' }, // Dragon
];

function drawCastleSprite(ca, c){
  const sxScreen = ca.x - camX;
  if(sxScreen > W + 240 || sxScreen + ca.w < -240) return;

  const towerImg = advStyle === 'advanced' ? readyImage(commonLevelImages.tower) : null;
  if(towerImg){
    ctx.drawImage(towerImg, ca.x, ca.y, ca.w, ca.h);
  } else {
    const st = CASTLE_STYLES[Math.min(GS.level, CASTLE_STYLES.length - 1)];
    ctx.fillStyle = st.body;
    ctx.fillRect(ca.x, ca.y, ca.w, ca.h);
    ctx.fillStyle = st.dark;
    ctx.fillRect(ca.x + ca.w * 0.35, ca.y + ca.h * 0.65, ca.w * 0.3, ca.h * 0.35);
  }
  drawCastlePrompt(ca.x + ca.w / 2, ca);
}

function drawCastlePrompt(cx2, ca){
  if(!QS.active && GS.screen==='game'){
    const px = player.x + player.w/2;
    if(Math.abs(px - cx2) < 95 && player.onGround){
      ctx.save();
      ctx.font='bold 13px Courier New'; ctx.textAlign='center';
      ctx.fillStyle='rgba(0,0,0,.75)'; ctx.fillRect(cx2-108, ca.y-36, 216, 22);
      ctx.fillStyle='#ffd700'; ctx.fillText('⬆ Entrer dans le château', cx2, ca.y-20);
      ctx.restore();
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  BOUCLE PRINCIPALE
// ════════════════════════════════════════════════════════════════

let lastT=0;
function drawPauseOverlay(){
  ctx.fillStyle='rgba(0,0,0,.55)';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff';
  ctx.font='bold 36px Courier New';
  ctx.textAlign='center';
  ctx.fillText('⏸ PAUSE', W/2, H/2);
  ctx.font='14px Courier New';
  ctx.fillStyle='#94a3b8';
  ctx.fillText('Appuie sur ⏸ pour reprendre', W/2, H/2+36);
}

function loop(t){
  const dt=Math.min((t-lastT)/1000, .05);
  lastT=t;
  if(GS.screen==='game' && !GS.paused) updatePhysics(dt);
  if(GS.screen==='castle' && !QS.active) updateCastlePhysics(dt);
  if(GS.screen==='game' || (GS.screen==='question' && !CQ.active)){
    render();
    if(GS.paused) drawPauseOverlay();
  }
  if(GS.screen==='castle' || (GS.screen==='question' && CQ.active)){
    drawCastleRoom();
  }
  requestAnimationFrame(loop);
}

// ════════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════════

document.getElementById('ctrl').style.display='none';
applyTheme(currentTheme);
setSprStyle(advStyle);
showScreen('startScreen');
document.getElementById('menuStars').textContent = `🪙${SAVE.totalStars}`;
requestAnimationFrame(loop);
