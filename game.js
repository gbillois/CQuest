const VIRTUAL_WIDTH = 432;
const VIRTUAL_HEIGHT = 768;

const GAME = {
  gravity: 1500,
  moveSpeed: 210,
  jumpVelocity: -560,
  maxFallVelocity: 880,
  friction: 0.84,
  levelCount: 5,
};
const HERO_SCALE = 1.5;
const ENEMY_SCALE = 1.5;
const STARTING_HEARTS = 3;
const MAX_HEARTS = 3;
const SPRITE_FALLBACK_FOOT_OFFSET_RATIO = 0.12;
const PLAYER_RENDER_GROUND_OFFSET_PX = 0;
const PLAYER_HITBOX_WIDTH = 27;
const PLAYER_HITBOX_HEIGHT = 60;
const ENEMY_MOVE_SPEED = 62;
const ENEMY_HITBOX_WIDTH_RATIO = 0.46;
const ENEMY_HITBOX_HEIGHT_RATIO = 0.62;
const ENEMY_MIN_HITBOX_W = 20;
const ENEMY_MAX_HITBOX_W = 34;
const ENEMY_MIN_HITBOX_H = 28;
const ENEMY_MAX_HITBOX_H = 52;
const ENEMY_DEFEAT_FADE_SECONDS = 0.75;
const ENEMY_DEFEAT_RISE_PX = 10;
const BONUS_POPUP_GRAVITY = 1250;
const BONUS_POPUP_MAX_FALL_SPEED = 640;
const BONUS_MIN_SUPPORT_GAP_TILES = 2;
const BONUS_MAX_SUPPORT_GAP_TILES = 5;
const PLAYER_HIT_INVULN_SECONDS = 1.6;
const PLAYER_HIT_STUN_SECONDS = 0.18;
const PLAYER_HIT_KNOCKBACK_X = 190;
const PLAYER_HIT_KNOCKBACK_Y = -320;
const PLAYER_HIT_BLINK_HZ = 14;
const PLAYER_DEATH_DELAY_SECONDS = 1;
const PLAYER_DEATH_LAUNCH_Y = -420;
const MIN_PLAYER_JUMP_HEIGHT_TILES = 5.0;
const GROUND_THICKNESS_TILES = 4;
const GROUND_TILE_OVERLAP_PX = 20;
const GROUND_TILE_HORIZONTAL_OVERLAP_PX = 2;
const GROUND_DECOR_FALLBACK_BOTTOM_PAD_RATIO = 0.22;
const GROUND_SURFACE_VARIATION_MAX_UP = 0;
const GROUND_SURFACE_VARIATION_MAX_DOWN = 0;
const TOWER_HEIGHT_SCALE = 1.5;
const CASTLE_SCALE = 1.5;
const PERSISTENT_CURRENCY_KEY = "cquest_gold";
const ERROR_DB_STORAGE_KEY = "cquest_conjugation_errors_v1";
const TENSE_LABEL = { pr: "Présent", im: "Imparfait", fu: "Futur simple" };
const PRONOUN_LABEL = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"];

const KNOWN_HERO_DIRS = ["mage", "ninja", "paladin", "pirate"];
const KNOWN_ENEMY_DIRS = [
  "desert-mummy",
  "desert-scorpion",
  "desolation-skeleton",
  "desolation-wraith",
  "forest-goblin-green",
  "forest-sprite",
  "mountain-dwarf",
  "mountain-troll",
  "snow-yeti",
  "snow-zombie",
];
const FIXED_LEVEL_BIOME_ORDER = ["forest", "desert", "mountain", "snow", "desolation"];

const BIOME_BACKGROUNDS = {
  castle: ["#1d2235", "#2f3b57"],
  desert: ["#533922", "#a46e30"],
  desolation: ["#1f1d27", "#4a4458"],
  forest: ["#1e3f2b", "#437b4f"],
  mountain: ["#2b3a4f", "#5b7793"],
  snow: ["#3e5873", "#a1bfd8"],
  wood: ["#3b2a1d", "#7b5a39"],
};
const BIOME_PARALLAX_BACKGROUNDS = {
  desert: "game_assets/backgrounds/desert-background.png",
  desolation: "game_assets/backgrounds/desolation-background.png",
  forest: "game_assets/backgrounds/forest-background.png",
  mountain: "game_assets/backgrounds/moutain-background.png",
  snow: "game_assets/backgrounds/snow-background.png",
  castle: "game_assets/backgrounds/desolation-background.png",
  wood: "game_assets/backgrounds/forest-background.png",
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

canvas.width = VIRTUAL_WIDTH;
canvas.height = VIRTUAL_HEIGHT;

const ui = {
  hudScoreValue: document.getElementById("hudScoreValue"),
  hudLives: document.getElementById("hudLives"),
  hudGoldValue: document.getElementById("hudGoldValue"),
  shopBtn: document.getElementById("shopBtn"),
  shopIcon: document.getElementById("shopIcon"),
  pauseBtn: document.getElementById("pauseBtn"),
  pauseIcon: document.getElementById("pauseIcon"),
  settingsPanel: document.getElementById("settingsPanel"),
  heroSelect: document.getElementById("heroSelect"),
  levelSelect: document.getElementById("levelSelect"),
  difficultySelect: document.getElementById("difficultySelect"),
  questionPanel: document.getElementById("questionPanel"),
  questionPrompt: document.getElementById("questionPrompt"),
  answerButtons: document.getElementById("answerButtons"),
  groupFilters: document.getElementById("groupFilters"),
  tenseFilters: document.getElementById("tenseFilters"),
  resetErrorsBtn: document.getElementById("resetErrorsBtn"),
  errorList: document.getElementById("errorList"),
  applySettingsBtn: document.getElementById("applySettingsBtn"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  moveLeftBtn: document.getElementById("moveLeftBtn"),
  moveRightBtn: document.getElementById("moveRightBtn"),
  jumpBtn: document.getElementById("jumpBtn"),
  btnLeft: document.getElementById("btnLeft"),
  btnRight: document.getElementById("btnRight"),
  btnUp: document.getElementById("btnUp"),
  titleScreen: document.getElementById("titleScreen"),
  startBtn: document.getElementById("startBtn"),
  openSettingsFromTitleBtn: document.getElementById("openSettingsFromTitleBtn"),
  pauseModal: document.getElementById("pauseModal"),
  resumeBtn: document.getElementById("resumeBtn"),
  openSettingsFromPauseBtn: document.getElementById("openSettingsFromPauseBtn"),
  backToTitleBtn: document.getElementById("backToTitleBtn"),
  gameOverPanel: document.getElementById("gameOverPanel"),
  gameOverTitle: document.getElementById("gameOverTitle"),
  gameOverText: document.getElementById("gameOverText"),
  finalScoreText: document.getElementById("finalScoreText"),
  finalCoinsText: document.getElementById("finalCoinsText"),
  restartBtn: document.getElementById("restartBtn"),
  backToTitleFromGameOverBtn: document.getElementById("backToTitleFromGameOverBtn"),
};

const imageCache = new Map();
const imagePromiseCache = new Map();
const spriteBoundsCache = new WeakMap();
const tileVerticalCollisionInsetCache = new Map();
const spriteBoundsCanvas = document.createElement("canvas");
const spriteBoundsCtx = spriteBoundsCanvas.getContext("2d", { willReadFrequently: true });

const state = {
  ready: false,
  started: false,
  paused: false,
  gameOver: false,
  config: null,
  tileSize: 32,
  biomes: {},
  heroes: [],
  enemies: [],
  levels: [],
  selectedHeroIndex: 0,
  currentLevelIndex: 0,
  currentLevel: null,
  player: null,
  cameraX: 0,
  controls: {
    left: false,
    right: false,
    jumpBuffered: false,
  },
  runTime: 0,
  score: 0,
  coins: 0,
  persistentGold: 0,
  hearts: STARTING_HEARTS,
  easyMode: false,
  screenMode: "game",
  pedagogy: {
    activeGroups: [],
    activeTenses: ["pr", "im", "fu"],
  },
  duel: null,
  message: "",
  messageUntil: 0,
  endCastleLockHintUntil: 0,
  playerHitInvuln: 0,
  playerHitStun: 0,
  deathSequence: {
    active: false,
    elapsed: 0,
    duration: PLAYER_DEATH_DELAY_SECONDS,
  },
  lastTimestamp: 0,
  towerInterior: {
    active: false,
    outsideX: 0,
    outsideY: 0,
  },
};

init().catch((error) => {
  console.error(error);
  updateHudInfo();
});

async function init() {
  const config = await loadConfig();
  state.config = config;
  state.tileSize = config.grid?.tile_size || 32;
  enforceMinimumJumpHeight();

  await setupUiAssets(config);
  buildBiomeIndex(config);
  state.persistentGold = loadPersistentGold();
  state.pedagogy.activeGroups = getDefaultActiveGroups();
  state.duel = createConjugationDuelSystem({
    verbs: getVerbSource(),
    pronouns: PRONOUN_LABEL,
    storageKey: ERROR_DB_STORAGE_KEY,
    settingsGetter: () => ({
      activeGroups: state.pedagogy.activeGroups.slice(),
      activeTenses: state.pedagogy.activeTenses.slice(),
    }),
    uiHooks: buildQuestionUiHooks(),
    gameplayHooks: {
      onOpenQuestion: (_q, enemy) => {
        state.screenMode = "question";
        state.controls.left = false;
        state.controls.right = false;
        state.controls.jumpBuffered = false;
        const player = state.player;
        if (player && enemy) {
          const playerCenter = player.x + player.w * 0.5;
          const enemyCenter = enemy.x + enemy.w * 0.5;
          if (playerCenter <= enemyCenter) {
            player.facing = "south-east";
            enemy.dir = -1;
          } else {
            player.facing = "south-west";
            enemy.dir = 1;
          }
        }
      },
      onCloseQuestion: () => {
        state.screenMode = "game";
      },
      hitPlayer: () => {
        hitPlayer();
      },
      defeatEnemy: (enemy) => {
        defeatEnemy(enemy);
      },
    },
  });
  exposeConjugationApi();
  await preloadConfigAssetImages(config);
  await preloadParallaxBackgrounds();
  await loadHeroes();
  await loadEnemies();

  generateLevelsFromConfig(config);
  populateSettingsPanel();
  populatePedagogyPanel();
  renderErrorList();
  bindControls();

  if (!state.heroes.length) {
    throw new Error("No heroes found in game_assets/heroes");
  }

  loadLevel(0, true);
  state.ready = true;
  showTitleScreen();
  requestAnimationFrame(gameLoop);
}

function enforceMinimumJumpHeight() {
  const minHeightPx = (state.tileSize || 32) * MIN_PLAYER_JUMP_HEIGHT_TILES;
  const requiredJumpVelocity = -Math.sqrt(2 * GAME.gravity * minHeightPx);
  // Keep existing tuning unless it is weaker than the requested minimum.
  GAME.jumpVelocity = Math.min(GAME.jumpVelocity, requiredJumpVelocity);
}

async function loadConfig() {
  try {
    return await fetchJson("./level_generation_config.json");
  } catch (error) {
    console.warn("Config fetch failed, using fallback config:", error);
    updateHudInfo();
    return buildFallbackConfig();
  }
}

async function setupUiAssets(config) {
  const uiAssets = Object.fromEntries((config.ui_assets || []).map((item) => [item.id, item.path]));
  ui.shopIcon.src = uiAssets.button_shop_top || uiAssets.button_shop_bottom || "";
  ui.pauseIcon.src = uiAssets.button_pause_top || uiAssets.button_pause_bottom || "";
  ui.btnLeft.src = uiAssets.button_left || "";
  ui.btnRight.src = uiAssets.button_right || "";
  ui.btnUp.src = uiAssets.button_up || "";

  const uiPaths = [
    uiAssets.button_shop_top,
    uiAssets.button_shop_bottom,
    uiAssets.button_pause_top,
    uiAssets.button_pause_bottom,
    uiAssets.button_left,
    uiAssets.button_right,
    uiAssets.button_up,
  ].filter(Boolean);

  await Promise.all(uiPaths.map((path) => loadImage(path).catch(() => null)));
}

function buildFallbackConfig() {
  const biomeIds = ["castle", "desert", "desolation", "forest", "mountain", "snow", "wood"];
  const biomes = {};
  for (const biomeId of biomeIds) {
    biomes[biomeId] = makeFallbackBiome(biomeId, biomeId !== "castle" && biomeId !== "wood");
  }

  return {
    schema: "fallback.dynamic-level-config.v1",
    asset_root: "game_assets",
    grid: {
      tile_size: 32,
      default_level_size_tiles: { width: 128, height: 36 },
    },
    generation: {
      biome_selection: {
        type: "weighted_random",
        weights: {
          castle: 1,
          desert: 1,
          desolation: 1,
          forest: 1,
          mountain: 1,
          snow: 1,
          wood: 1,
        },
      },
      pipeline: [
        {
          step: "bonus_pass",
          params: { target_density_per_100_tiles: 8 },
        },
        {
          step: "decoration_pass",
          params: { target_density_per_100_tiles: 12 },
        },
      ],
    },
    biomes,
    object_pools: {
      bonus: [
        { id: "bonus_alert", path: "game_assets/bonus/bonus_alert.png", spawn_weight: 1 },
        { id: "bonus_coin", path: "game_assets/bonus/bonus_coin.png", spawn_weight: 6 },
        { id: "bonus_heart", path: "game_assets/bonus/bonus_heart.png", spawn_weight: 2 },
        { id: "bonus_mystery", path: "game_assets/bonus/bonus_mystery.png", spawn_weight: 2 },
        { id: "bonus_wall_01", path: "game_assets/bonus/bonus_wall_01.png", spawn_weight: 3 },
        { id: "bonus_wall_02", path: "game_assets/bonus/bonus_wall_02.png", spawn_weight: 3 },
        { id: "bonus_wall_03", path: "game_assets/bonus/bonus_wall_03.png", spawn_weight: 3 },
        { id: "bonus_wall_04", path: "game_assets/bonus/bonus_wall_04.png", spawn_weight: 3 },
      ],
      decoration: [
        { id: "deco_banner", path: "game_assets/decoration/deco_banner.png", spawn_weight: 2 },
        { id: "deco_brazier_fire", path: "game_assets/decoration/deco_brazier_fire.png", spawn_weight: 3 },
        { id: "deco_cannon", path: "game_assets/decoration/deco_cannon.png", spawn_weight: 1 },
        { id: "deco_cauldron_fire", path: "game_assets/decoration/deco_cauldron_fire.png", spawn_weight: 3 },
        { id: "deco_chest", path: "game_assets/decoration/deco_chest.png", spawn_weight: 2 },
        { id: "deco_crown", path: "game_assets/decoration/deco_crown.png", spawn_weight: 2 },
        { id: "deco_double_axe", path: "game_assets/decoration/deco_double_axe.png", spawn_weight: 2 },
        { id: "deco_flail", path: "game_assets/decoration/deco_flail.png", spawn_weight: 2 },
        { id: "deco_helmet", path: "game_assets/decoration/deco_helmet.png", spawn_weight: 2 },
        { id: "deco_jewel", path: "game_assets/decoration/deco_jewel.png", spawn_weight: 2 },
        { id: "deco_potion", path: "game_assets/decoration/deco_potion.png", spawn_weight: 1 },
        { id: "deco_royal_shield", path: "game_assets/decoration/deco_royal_shield.png", spawn_weight: 2 },
        { id: "deco_sword_shield", path: "game_assets/decoration/deco_sword_shield.png", spawn_weight: 2 },
        { id: "deco_sword_stones", path: "game_assets/decoration/deco_sword_stones.png", spawn_weight: 2 },
        { id: "deco_tower_gate", path: "game_assets/decoration/deco_tower_gate.png", spawn_weight: 1 },
        { id: "deco_tower_small", path: "game_assets/decoration/deco_tower_small.png", spawn_weight: 1 },
        { id: "deco_tower_window", path: "game_assets/decoration/deco_tower_window.png", spawn_weight: 1 },
      ],
      structures: [
        { id: "castle_locked", path: "game_assets/castle/castle_locked.png" },
        { id: "castle_unlocked", path: "game_assets/castle/castle_unlocked.png" },
        { id: "tower_main", path: "game_assets/tower/tower_main.png" },
      ],
    },
    ui_assets: [
      { id: "button_down", path: "game_assets/UI/button_down.png" },
      { id: "button_left", path: "game_assets/UI/button_left.png" },
      { id: "button_pause_bottom", path: "game_assets/UI/button_pause_bottom.png" },
      { id: "button_pause_top", path: "game_assets/UI/button_pause_top.png" },
      { id: "button_right", path: "game_assets/UI/button_right.png" },
      { id: "button_settings", path: "game_assets/UI/button_settings.png" },
      { id: "button_shop_bottom", path: "game_assets/UI/button_shop_bottom.png" },
      { id: "button_shop_top", path: "game_assets/UI/button_shop_top.png" },
      { id: "button_up", path: "game_assets/UI/button_up.png" },
      { id: "button_upgrade", path: "game_assets/UI/button_upgrade.png" },
      { id: "score_bar", path: "game_assets/UI/score_bar.png" },
    ],
  };
}

function makeFallbackBiome(biomeId, hasFourDetailTiles) {
  const tiles = [];
  const tileCatalog = {
    surface: [],
    slopes: [],
    subsurface: [],
    detail_overlay: [],
  };

  let index = 1;
  for (let row = 1; row <= 4; row += 1) {
    for (let col = 1; col <= 4; col += 1) {
      const id = `${biomeId}_r${pad2(row)}_c${pad2(col)}`;
      const path = `game_assets/tiles/${biomeId}/${biomeId}_tile_r${pad2(row)}_c${pad2(col)}_${pad2(index)}`;
      tiles.push({ id, path: `${path}.png` });

      if (row === 1) {
        tileCatalog.surface.push(id);
      } else if (row === 2) {
        tileCatalog.slopes.push(id);
      } else {
        tileCatalog.subsurface.push(id);
      }

      index += 1;
    }
  }

  const detailCols = hasFourDetailTiles ? [1, 2, 3, 4] : [2, 3];
  for (const col of detailCols) {
    const id = `${biomeId}_r05_c${pad2(col)}`;
    const path = `game_assets/tiles/${biomeId}/${biomeId}_tile_r05_c${pad2(col)}_${pad2(index)}`;
    tiles.push({ id, path: `${path}.png` });
    tileCatalog.detail_overlay.push(id);
    index += 1;
  }

  return {
    id: biomeId,
    tileset_dir: `game_assets/tiles/${biomeId}`,
    tile_count: tiles.length,
    tile_catalog: tileCatalog,
    default_surface_tile: `${biomeId}_r01_c01`,
    default_fill_tile: `${biomeId}_r03_c01`,
    tiles,
  };
}

function buildBiomeIndex(config) {
  const biomes = {};
  for (const [biomeId, biomeData] of Object.entries(config.biomes || {})) {
    const tileById = {};
    for (const tile of biomeData.tiles || []) {
      tileById[tile.id] = tile;
    }

    const mapIds = (ids) => (ids || []).map((id) => tileById[id]).filter(Boolean);
    const surfaceTiles = mapIds(biomeData.tile_catalog?.surface);
    const leftSurfaceTiles = surfaceTiles.filter((tile) => matchesSurfaceCol(tile, 1) || tileHasTag(tile, "left_variant"));
    const rightSurfaceTiles = surfaceTiles.filter((tile) => matchesSurfaceCol(tile, 4) || tileHasTag(tile, "right_variant"));
    const midSurfaceTiles = surfaceTiles.filter(
      (tile) =>
        matchesSurfaceCol(tile, 2) ||
        matchesSurfaceCol(tile, 3) ||
        tileHasTag(tile, "mid_left_variant") ||
        tileHasTag(tile, "mid_right_variant"),
    );
    const allTiles = Object.values(tileById);
    const simpleByCode = {
      10: allTiles.find((tile) => getTileCodeFromPath(tile?.path) === 10) || null,
      11: allTiles.find((tile) => getTileCodeFromPath(tile?.path) === 11) || null,
      12: allTiles.find((tile) => getTileCodeFromPath(tile?.path) === 12) || null,
      13: allTiles.find((tile) => getTileCodeFromPath(tile?.path) === 13) || null,
      14: allTiles.find((tile) => getTileCodeFromPath(tile?.path) === 14) || null,
      15: allTiles.find((tile) => getTileCodeFromPath(tile?.path) === 15) || null,
    };
    const groundDecorTiles = [17, 18, 19, 20]
      .map((code) => allTiles.find((tile) => getTileCodeFromPath(tile?.path) === code) || null)
      .filter(Boolean);

    biomes[biomeId] = {
      id: biomeId,
      tilesetDir: biomeData.tileset_dir,
      defaultSurface: tileById[biomeData.default_surface_tile] || null,
      defaultFill: tileById[biomeData.default_fill_tile] || null,
      groundLineTile:
        tileById[`${biomeId}_r03_c02`] ||
        Object.values(tileById).find((tile) => tile.path?.includes(`/${biomeId}_tile_r03_c02_10.png`)) ||
        tileById[`${biomeId}_r01_c01`] ||
        Object.values(tileById).find((tile) => tile.path?.includes(`/${biomeId}_tile_r01_c01_01.png`)) ||
        null,
      groundTile:
        tileById[`${biomeId}_r03_c01`] ||
        Object.values(tileById).find((tile) => tile.path?.includes(`/${biomeId}_tile_r03_c01_09.png`)) ||
        null,
      surfaceTiles,
      surfaceLeftTiles: leftSurfaceTiles.length ? leftSurfaceTiles : surfaceTiles,
      surfaceMidTiles: midSurfaceTiles.length ? midSurfaceTiles : surfaceTiles,
      surfaceRightTiles: rightSurfaceTiles.length ? rightSurfaceTiles : surfaceTiles,
      slopeTiles: mapIds(biomeData.tile_catalog?.slopes),
      subsurfaceTiles: mapIds(biomeData.tile_catalog?.subsurface),
      detailTiles: mapIds(biomeData.tile_catalog?.detail_overlay),
      simplePlatformTiles: simpleByCode,
      groundDecorTiles,
    };
  }
  state.biomes = biomes;
}

function tileHasTag(tile, tag) {
  return Array.isArray(tile?.tags) && tile.tags.includes(tag);
}

function matchesSurfaceCol(tile, col) {
  if (!tile) {
    return false;
  }
  const colToken = `c${pad2(col)}`;
  return String(tile.id || "").includes(colToken) || String(tile.path || "").includes(`_${colToken}_`);
}

function getTileCodeFromPath(path) {
  if (!path) {
    return null;
  }
  const match = String(path).match(/_(\d+)\.png$/);
  return match ? Number(match[1]) : null;
}

async function preloadConfigAssetImages(config) {
  const paths = new Set();

  for (const biome of Object.values(config.biomes || {})) {
    for (const tile of biome.tiles || []) {
      if (tile.path) {
        paths.add(tile.path);
      }
    }
  }

  for (const poolKey of ["bonus", "decoration", "structures"]) {
    for (const item of config.object_pools?.[poolKey] || []) {
      if (item.path) {
        paths.add(item.path);
      }
    }
  }
  // Ensure key reward sprites are available even if omitted from config.
  paths.add("game_assets/decoration/deco_jewel.png");
  paths.add("game_assets/decoration/deco_potion.png");
  paths.add("game_assets/bonus/bonus_mystery.png");
  paths.add("game_assets/bonus/bonus_wall_01.png");
  paths.add("game_assets/tower/tower_inside.png");
  paths.add("game_assets/decoration/deco_chest.png");

  await Promise.all([...paths].map((path) => loadImage(path).catch(() => null)));
}

async function preloadParallaxBackgrounds() {
  const paths = [...new Set(Object.values(BIOME_PARALLAX_BACKGROUNDS))];
  await Promise.all(paths.map((path) => loadImage(path).catch(() => null)));
}

async function loadHeroes() {
  const heroes = [];

  await Promise.all(
    KNOWN_HERO_DIRS.map(async (dir) => {
      const metadataPath = `./game_assets/heroes/${dir}/metadata.json`;
      const metadata = await fetchJson(metadataPath).catch(() => null);

      const hero = metadata ? await buildHeroFromMetadata(dir, metadata) : await buildHeroFromConvention(dir);
      if (!hero) {
        return;
      }
      heroes.push(hero);
    }),
  );

  heroes.sort((a, b) => a.name.localeCompare(b.name));
  state.heroes = heroes;
}

async function loadEnemies() {
  const enemies = [];

  await Promise.all(
    KNOWN_ENEMY_DIRS.map(async (dir) => {
      const metadataPath = `./game_assets/enemies/${dir}/metadata.json`;
      const metadata = await fetchJson(metadataPath).catch(() => null);

      const enemy = metadata ? await buildEnemyFromMetadata(dir, metadata) : await buildEnemyFromConvention(dir);
      if (!enemy) {
        return;
      }
      enemies.push(enemy);
    }),
  );

  state.enemies = enemies;
}

function generateLevelsFromConfig(config) {
  const levels = [];
  const baseSize = config.grid?.default_level_size_tiles || { width: 128, height: 36 };
  const weightedBiomes = buildWeightedBiomeList(config.generation?.biome_selection?.weights || {});
  const bonusDensity =
    config.generation?.pipeline?.find((step) => step.step === "bonus_pass")?.params?.target_density_per_100_tiles || 8;
  const decoDensity =
    config.generation?.pipeline?.find((step) => step.step === "decoration_pass")?.params?.target_density_per_100_tiles || 12;

  for (let i = 0; i < GAME.levelCount; i += 1) {
    const seed = 1337 + i * 101;
    const rand = mulberry32(seed);
    const fixedBiome = FIXED_LEVEL_BIOME_ORDER[i];
    const biomeId = state.biomes[fixedBiome]
      ? fixedBiome
      : weightedPick(weightedBiomes, rand) || "forest";

    // Horizontal platformer layout: wide map + moderate height.
    const widthTiles = clamp(Math.round(baseSize.width * 1.05) + i * 14, 120, 230);
    const heightTiles = clamp(Math.round(baseSize.height * 0.72), 24, 34);

    levels.push(
      generateSingleLevel({
        index: i,
        seed,
        biomeId,
        widthTiles,
        heightTiles,
        bonusDensity,
        decoDensity,
      }),
    );
  }

  state.levels = levels;
}

function generateSingleLevel({ index, seed, biomeId, widthTiles, heightTiles, bonusDensity, decoDensity }) {
  const biome = state.biomes[biomeId] || state.biomes.forest || Object.values(state.biomes)[0];
  const rand = mulberry32(seed);

  const tileGrid = Array.from({ length: heightTiles }, () => Array(widthTiles).fill(null));
  const pathNodes = [];
  const platformRails = [];
  const groundY = heightTiles - 4;
  const groundTile = biome.groundLineTile || biome.defaultSurface || biome.groundTile || biome.defaultFill;
  const startCastleTileX = 4;
  const towerTileX = Math.floor(widthTiles * 0.5);
  const castleTileX = widthTiles - 7;
  const playableStart = 14;
  const playableEnd = castleTileX - 12;

  for (let x = 0; x < widthTiles; x += 1) {
    setGroundColumn(tileGrid, x, groundY, groundTile);
  }

  const reservedRanges = [
    { min: 0, max: 15 }, // Start safety.
    { min: towerTileX - 9, max: towerTileX + 9 }, // Keep clear around tower.
    { min: castleTileX - 13, max: widthTiles - 1 }, // Keep clear around castle/goal.
  ];
  const platformThemeIds = getPlatformThemeIds(biomeId);
  const allowGroundHoles = !state.easyMode;
  let holes = [];

  const addPlatformRail = ({ startX, y, length, segmentType }) => {
    if (length < 2) {
      return;
    }
    const railY = clamp(y, 2, Math.max(2, groundY - 4));
    const endX = startX + length - 1;
    if (startX < 1 || endX >= widthTiles - 1) {
      return;
    }
    if (intersectsRanges(startX, endX, reservedRanges)) {
      return;
    }
    const theme = pickMarioPlatformTheme({
      biomeId,
      fallbackBiome: biome,
      xTile: startX,
      castleTileX,
      segmentType,
      rand,
    });
    placePlatform(tileGrid, theme, startX, railY, length, rand);
    platformRails.push({ start: startX, end: endX, y: railY, themeId: theme.id || biomeId });
  };

  const tryCreateHole = (holeStart, holeWidth) => {
    if (!allowGroundHoles) {
      return false;
    }
    const holeEnd = holeStart + holeWidth - 1;
    if (holeStart < playableStart || holeEnd > playableEnd) {
      return false;
    }
    if (intersectsRanges(holeStart, holeEnd, reservedRanges)) {
      return false;
    }
    if (!tileGrid[groundY][holeStart - 1] || !tileGrid[groundY][holeEnd + 1]) {
      return false;
    }
    if (holes.some((hole) => holeStart <= hole.end + 3 && holeEnd >= hole.start - 3)) {
      return false;
    }
    for (let x = holeStart; x <= holeEnd; x += 1) {
      clearGroundColumn(tileGrid, x, groundY);
    }
    holes.push({ start: holeStart, end: holeEnd });
    return true;
  };

  // Segment-driven generation inspired by top side-scrollers:
  // rhythm alternates between run, hop, air chain, and pressure sections.
  const segmentWidth = 12;
  const patternLoop = ["intro", "run", "hop", "air", "gauntlet", "air", "stairs", "hop", "air", "run", "gauntlet"];
  let segmentIndex = 0;
  for (let segStart = playableStart; segStart <= playableEnd - 4; segStart += segmentWidth) {
    const segEnd = Math.min(playableEnd, segStart + segmentWidth - 1);
    const progress = clamp((segStart - playableStart) / Math.max(1, playableEnd - playableStart), 0, 1);
    let pattern = patternLoop[segmentIndex % patternLoop.length];
    segmentIndex += 1;
    if (progress > 0.86) {
      pattern = "finale";
    } else if (progress < 0.14) {
      pattern = "intro";
    }

    if (pattern === "intro") {
      if (rand() < 0.75) {
        addPlatformRail({
          startX: clamp(segStart + 3, 1, segEnd - 3),
          y: groundY - 2,
          length: 3,
          segmentType: "intro",
        });
      }
      continue;
    }

    if (pattern === "run") {
      if (rand() < 0.85) {
        addPlatformRail({
          startX: clamp(segStart + randInt(rand, 2, 5), 1, segEnd - 3),
          y: groundY - randInt(rand, 2, 3),
          length: randInt(rand, 3, 4),
          segmentType: "run",
        });
      }
      continue;
    }

    if (pattern === "hop") {
      const holeStart = clamp(segStart + randInt(rand, 3, 5), segStart + 2, segEnd - 3);
      if (tryCreateHole(holeStart, randInt(rand, 1, 2)) && rand() < 0.62) {
        addPlatformRail({
          startX: holeStart + randInt(rand, 1, 2),
          y: groundY - 3,
          length: 2,
          segmentType: "hop",
        });
      }
      continue;
    }

    if (pattern === "air") {
      let chainX = segStart + 1;
      let chainY = groundY - randInt(rand, 2, 3);
      const chainCount = randInt(rand, 2, 3);
      for (let i = 0; i < chainCount; i += 1) {
        const length = randInt(rand, 3, 4);
        if (chainX + length > segEnd - 1) {
          break;
        }
        addPlatformRail({
          startX: chainX,
          y: chainY,
          length,
          segmentType: "air",
        });
        chainX += length + randInt(rand, 1, 2);
        chainY = clamp(chainY + randInt(rand, -1, 1), groundY - 4, groundY - 2);
      }
      continue;
    }

    if (pattern === "gauntlet") {
      const first = clamp(segStart + randInt(rand, 2, 3), segStart + 1, segEnd - 6);
      const second = clamp(first + randInt(rand, 4, 5), first + 3, segEnd - 2);
      tryCreateHole(first, randInt(rand, 1, 2));
      tryCreateHole(second, 1);
      addPlatformRail({
        startX: clamp(first + 2, segStart + 1, segEnd - 2),
        y: groundY - 3,
        length: 2,
        segmentType: "gauntlet",
      });
      continue;
    }

    if (pattern === "stairs") {
      const steps = randInt(rand, 2, 3);
      const stairsStart = clamp(segStart + 2, 1, segEnd - (steps * 2 + 1));
      for (let i = 0; i < steps; i += 1) {
        setGroundTileAt(tileGrid, stairsStart + i, groundY - 1 - i, groundTile);
      }
      for (let i = 1; i <= steps; i += 1) {
        setGroundTileAt(tileGrid, stairsStart + steps - 1 + i, groundY - steps + i - 1, groundTile);
      }
      addPlatformRail({
        startX: stairsStart + steps - 1,
        y: groundY - steps - 1,
        length: 2,
        segmentType: "stairs",
      });
      continue;
    }

    if (pattern === "finale") {
      addPlatformRail({
        startX: clamp(segStart + 2, 1, segEnd - 4),
        y: groundY - 3,
        length: 4,
        segmentType: "finale",
      });
      if (rand() < 0.45) {
        tryCreateHole(clamp(segStart + randInt(rand, 3, 5), segStart + 2, segEnd - 3), 1);
      }
    }
  }

  if (allowGroundHoles) {
    const targetHoleCount = clamp(5 + index + Math.floor((playableEnd - playableStart) / 30), 5, 10);
    holes = augmentGroundHoles({
      tileGrid,
      groundY,
      startX: playableStart,
      endX: playableEnd,
      reservedRanges,
      holes,
      targetCount: targetHoleCount,
      rand,
    });
    holes = ensurePlayableGroundRoute({
      tileGrid,
      groundY,
      startX: 8,
      endX: castleTileX - 11,
      groundTile,
      minGapBetweenHoles: 3,
      maxHoleWidth: 2,
    });
  } else {
    fillGroundSpan(tileGrid, playableStart, playableEnd, groundY, groundTile);
    holes = [];
  }
  convertLowFloatingPlatformsToGround({
    tileGrid,
    groundY,
    groundTile,
    holes,
  });

  const groundNodes = collectGroundPathNodes(tileGrid, groundY, Math.max(4, playableStart - 6), playableEnd + 1, holes);
  pathNodes.push(...groundNodes);
  for (const rail of platformRails) {
    const railLen = rail.end - rail.start + 1;
    const step = railLen >= 6 ? 2 : 1;
    for (let x = rail.start + 1; x <= rail.end - 1; x += step) {
      pathNodes.push({ x, y: rail.y, kind: "air" });
    }
    pathNodes.push({ x: Math.floor((rail.start + rail.end) * 0.5), y: rail.y, kind: "air" });
  }
  const finalPathNodes = dedupePathNodes(pathNodes);

  const enemyLanes = [
    ...collectGroundLanes(tileGrid, groundY, Math.max(4, playableStart - 6), playableEnd, reservedRanges),
    ...platformRails
      .filter((rail) => rail.end - rail.start + 1 >= 4)
      .map((rail) => ({ start: rail.start, end: rail.end, y: rail.y, kind: "platform" })),
  ];

  const start = {
    x: state.tileSize * 8,
    y: groundY * state.tileSize,
  };

  const end = {
    x: (castleTileX - 2) * state.tileSize,
    y: (groundY - 2) * state.tileSize,
    w: state.tileSize * 3,
    h: state.tileSize * 3,
  };

  const bonuses = buildBonusScatter({
    biome,
    rand,
    tileGrid,
    bonusDensity,
    pathNodes: finalPathNodes,
    groundY,
    holes,
    reservedRanges,
    platformRails,
    levelIndex: index,
  });
  const decorations = buildDecorationScatter({ biome, rand, tileGrid, decoDensity, pathNodes: finalPathNodes });
  const groundDecorations = buildGroundDecorScatter({ biome, rand, widthTiles, groundY, holes, reservedRanges });
  const enemySpawns = buildEnemySpawns({
    biomeId,
    rand,
    pathNodes: finalPathNodes,
    levelIndex: index,
    tileGrid,
    groundY,
    lanes: enemyLanes,
  });
  const levelVerbDatas = state.duel ? state.duel.generateLevelVerbDatas(enemySpawns.length) : [];
  for (let i = 0; i < enemySpawns.length; i += 1) {
    enemySpawns[i].verbData = levelVerbDatas[i] || (state.duel ? state.duel.randomVerbData() : null);
    enemySpawns[i].alive = enemySpawns[i].alive !== false;
    enemySpawns[i].battling = false;
  }

  const castleLockedPath =
    state.config.object_pools?.structures?.find((s) => s.id === "castle_locked")?.path ||
    state.config.object_pools?.structures?.find((s) => s.id === "castle_unlocked")?.path ||
    null;
  const castleUnlockedPath =
    state.config.object_pools?.structures?.find((s) => s.id === "castle_unlocked")?.path ||
    state.config.object_pools?.structures?.find((s) => s.id === "castle_locked")?.path ||
    null;

  const structures = {
    start: castleLockedPath,
    end: castleUnlockedPath,
    endLocked: castleLockedPath,
    endUnlocked: castleUnlockedPath,
    tower: state.config.object_pools?.structures?.find((s) => s.id === "tower_main")?.path || null,
  };

  return {
    id: index + 1,
    seed,
    biomeId,
    biome,
    platformThemeIds,
    widthTiles,
    heightTiles,
    worldWidth: widthTiles * state.tileSize,
    worldHeight: heightTiles * state.tileSize,
    tileGrid,
    pathNodes: finalPathNodes,
    bonuses,
    decorations,
    groundDecorations,
    enemySpawns,
    initialEnemyCount: enemySpawns.length,
    defeatedEnemyCount: 0,
    structures,
    start,
    end,
    groundY,
    startCastleX: startCastleTileX * state.tileSize,
    towerX: towerTileX * state.tileSize,
    castleX: castleTileX * state.tileSize,
  };
}

function placePlatform(grid, biomeTheme, startX, y, length, rand) {
  for (let i = 0; i < length; i += 1) {
    const x = startX + i;
    if (!grid[y] || x < 0 || x >= grid[0].length) {
      continue;
    }

    setTile(grid, x, y, pickPlatformSurfaceTile(biomeTheme, i, length, rand));
  }
}

function pickPlatformSurfaceTile(biome, index, length, rand) {
  const simple = biome?.simplePlatformTiles || {};
  const left = simple[10] || simple[11] || biome.defaultSurface || biome.defaultFill;
  const right = simple[15] || simple[14] || biome.defaultSurface || biome.defaultFill;
  const mids = [simple[11], simple[12], simple[13], simple[14]].filter(Boolean);
  const mid = mids.length ? mids[randInt(rand, 0, mids.length - 1)] : left || right;

  if (length <= 1) {
    return mid;
  }
  if (index === 0) {
    return left;
  }
  if (index === length - 1) {
    return right;
  }
  return mid;
}

function getPlatformThemeIds(localBiomeId) {
  const ordered = [localBiomeId, "castle", "wood"];
  const unique = [];
  for (const id of ordered) {
    if (!id || unique.includes(id)) {
      continue;
    }
    const biome = state.biomes[id];
    if (!biome) {
      continue;
    }
    const simple = biome.simplePlatformTiles || {};
    const hasSimpleSet = Boolean(simple[10] && (simple[11] || simple[12] || simple[13] || simple[14]) && simple[15]);
    if (hasSimpleSet) {
      unique.push(id);
    }
  }
  return unique.length ? unique : [localBiomeId].filter(Boolean);
}

function hasSimplePlatformSet(biome) {
  const simple = biome?.simplePlatformTiles || {};
  return Boolean(simple[10] && simple[15] && (simple[11] || simple[12] || simple[13] || simple[14]));
}

function pickMarioPlatformTheme({ biomeId, fallbackBiome, xTile, castleTileX, segmentType, rand }) {
  const localTheme = state.biomes[biomeId] || fallbackBiome;
  const castleTheme = state.biomes.castle;
  const woodTheme = state.biomes.wood;
  const progress = clamp(xTile / Math.max(1, castleTileX), 0, 1);

  // Main rule: "standard" (current biome) for most of the level.
  if (progress < 0.7) {
    if (segmentType === "gap_helper" && progress > 0.24 && progress < 0.68 && hasSimplePlatformSet(woodTheme) && rand() < 0.45) {
      return woodTheme;
    }
    return localTheme;
  }

  // Late level: increasingly castle-like before final castle.
  if (hasSimplePlatformSet(castleTheme)) {
    if (progress >= 0.82) {
      return castleTheme;
    }
    if ((segmentType === "stairs" || segmentType === "platforms") && rand() < 0.65) {
      return castleTheme;
    }
    if (rand() < 0.35) {
      return castleTheme;
    }
  }

  return localTheme;
}

function getSimplePlatformMidTile(biome) {
  const simple = biome?.simplePlatformTiles || {};
  return simple[12] || simple[13] || simple[11] || simple[14] || simple[10] || simple[15] || biome?.defaultSurface || biome?.defaultFill || null;
}

function asGroundSolidTile(tile) {
  return tile ? { ...tile, groundSolid: true } : tile;
}

function setGroundTileAt(tileGrid, x, y, groundTile) {
  if (!tileGrid[y] || x < 0 || x >= tileGrid[0].length) {
    return;
  }
  setTile(tileGrid, x, y, asGroundSolidTile(groundTile));
}

function fillGroundSpan(tileGrid, startX, endX, groundY, groundTile) {
  const fromX = clamp(startX, 0, tileGrid[0].length - 1);
  const toX = clamp(endX, fromX, tileGrid[0].length - 1);
  for (let x = fromX; x <= toX; x += 1) {
    setGroundColumn(tileGrid, x, groundY, groundTile);
  }
}

function setGroundColumn(tileGrid, x, groundY, groundTile) {
  for (let dy = 0; dy < GROUND_THICKNESS_TILES; dy += 1) {
    const y = groundY + dy;
    if (y >= 0 && y < tileGrid.length) {
      setGroundTileAt(tileGrid, x, y, groundTile);
    }
  }
}

function clearGroundColumn(tileGrid, x, groundY) {
  for (let dy = 0; dy < GROUND_THICKNESS_TILES; dy += 1) {
    const y = groundY + dy;
    if (y >= 0 && y < tileGrid.length && tileGrid[y]) {
      tileGrid[y][x] = null;
    }
  }
}

function getGroundSurfaceYAtX(tileGrid, x, groundY) {
  const minY = Math.max(1, groundY - GROUND_SURFACE_VARIATION_MAX_UP - 1);
  const maxY = Math.min(tileGrid.length - 1, groundY + GROUND_SURFACE_VARIATION_MAX_DOWN + GROUND_THICKNESS_TILES - 1);
  for (let y = minY; y <= maxY; y += 1) {
    if (!isSolidTile(tileGrid[y]?.[x])) {
      continue;
    }
    if (!isSolidTile(tileGrid[y - 1]?.[x])) {
      return y;
    }
  }
  return null;
}

function setGroundSurfaceAtX(tileGrid, x, surfaceY, groundY, groundTile) {
  const minY = Math.max(0, groundY - GROUND_SURFACE_VARIATION_MAX_UP - 2);
  const bottomY = Math.min(tileGrid.length - 1, groundY + GROUND_THICKNESS_TILES - 1);
  for (let y = minY; y <= bottomY; y += 1) {
    if (!tileGrid[y]) {
      continue;
    }
    tileGrid[y][x] = null;
  }
  for (let y = surfaceY; y <= bottomY; y += 1) {
    setGroundTileAt(tileGrid, x, y, groundTile);
  }
}

function applyGroundUndulation({ tileGrid, groundY, groundTile, startX, endX, holes, reservedRanges, rand }) {
  let targetSurfaceY = groundY;
  let remainingRun = 0;
  const minX = clamp(startX, 1, tileGrid[0].length - 2);
  const maxX = clamp(endX, minX, tileGrid[0].length - 2);

  for (let x = minX; x <= maxX; x += 1) {
    if (isInHole(holes || [], x) || intersectsRanges(x, x, reservedRanges || [])) {
      targetSurfaceY = groundY;
      remainingRun = 0;
      continue;
    }

    const blockedByLowPlatform =
      isSolidTile(tileGrid[groundY - 1]?.[x]) ||
      isSolidTile(tileGrid[groundY - 2]?.[x]);
    if (blockedByLowPlatform) {
      targetSurfaceY = groundY;
      remainingRun = 0;
      continue;
    }

    if (remainingRun <= 0) {
      const roll = rand();
      const step = roll < 0.22 ? -1 : roll < 0.78 ? 0 : 1;
      targetSurfaceY = clamp(
        targetSurfaceY + step,
        groundY - GROUND_SURFACE_VARIATION_MAX_UP,
        groundY + GROUND_SURFACE_VARIATION_MAX_DOWN,
      );
      remainingRun = randInt(rand, 3, 7);
    } else {
      remainingRun -= 1;
    }

    setGroundSurfaceAtX(tileGrid, x, targetSurfaceY, groundY, groundTile);
  }
}

function convertLowFloatingPlatformsToGround({ tileGrid, groundY, groundTile, holes }) {
  const minX = 1;
  const maxX = tileGrid[0].length - 2;
  const minY = Math.max(1, groundY - 3);
  const maxY = Math.max(minY, groundY - 1);

  for (let x = minX; x <= maxX; x += 1) {
    if (isInHole(holes || [], x)) {
      continue;
    }

    const surfaceY = getGroundSurfaceYAtX(tileGrid, x, groundY);
    if (surfaceY == null) {
      continue;
    }

    for (let y = minY; y <= maxY; y += 1) {
      const tile = tileGrid[y]?.[x];
      if (!tile || tile.groundSolid || !isOneWayPlatformTile(tile)) {
        continue;
      }

      const gap = y - surfaceY;
      if (gap >= 1 && gap <= 2) {
        // This was a near-ground floating tile: merge it into terrain relief.
        setGroundSurfaceAtX(tileGrid, x, y, groundY, groundTile);
      }
      break;
    }
  }
}

function carveGroundHoles({ tileGrid, groundY, widthTiles, rand, reservedRanges, holeCount }) {
  const holes = [];
  let attempts = 0;
  while (holes.length < holeCount && attempts < 260) {
    attempts += 1;
    const holeWidth = randInt(rand, 1, 2);
    const holeStart = randInt(rand, 14, widthTiles - 16);
    const holeEnd = holeStart + holeWidth - 1;
    if (intersectsRanges(holeStart, holeEnd, reservedRanges)) {
      continue;
    }
    if (holes.some((hole) => Math.abs(hole.start - holeStart) < 6 || Math.abs(hole.end - holeEnd) < 6)) {
      continue;
    }

    holes.push({ start: holeStart, end: holeEnd });
    for (let x = holeStart; x <= holeEnd; x += 1) {
      clearGroundColumn(tileGrid, x, groundY);
    }
  }
  return holes;
}

function intersectsRanges(start, end, ranges) {
  return ranges.some((range) => start <= range.max && end >= range.min);
}

function isInHole(holes, x) {
  return holes.some((hole) => x >= hole.start && x <= hole.end);
}

function dedupePathNodes(nodes) {
  const seen = new Set();
  const out = [];
  for (const node of nodes || []) {
    if (!node) {
      continue;
    }
    const key = `${node.kind}:${node.x}:${node.y}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(node);
  }
  return out;
}

function collectGroundPathNodes(tileGrid, groundY, fromX, toX, holes) {
  const nodes = [];
  const minX = clamp(fromX, 1, tileGrid[0].length - 2);
  const maxX = clamp(toX, minX, tileGrid[0].length - 2);
  for (let x = minX; x <= maxX; x += 3) {
    if (isInHole(holes || [], x)) {
      continue;
    }
    if (!tileGrid[groundY]?.[x]) {
      continue;
    }
    nodes.push({ x, y: groundY, kind: "ground" });
  }
  return nodes;
}

function collectGroundLanes(tileGrid, groundY, fromX, toX, reservedRanges) {
  const lanes = [];
  const minX = clamp(fromX, 1, tileGrid[0].length - 2);
  const maxX = clamp(toX, minX, tileGrid[0].length - 2);
  let runStart = null;

  for (let x = minX; x <= maxX; x += 1) {
    const blocked = intersectsRanges(x, x, reservedRanges || []);
    const solid = !blocked && Boolean(tileGrid[groundY]?.[x]);
    if (solid) {
      if (runStart == null) {
        runStart = x;
      }
      continue;
    }
    if (runStart != null) {
      if (x - runStart >= 6) {
        lanes.push({ start: runStart, end: x - 1, y: groundY, kind: "ground" });
      }
      runStart = null;
    }
  }

  if (runStart != null && maxX - runStart >= 5) {
    lanes.push({ start: runStart, end: maxX, y: groundY, kind: "ground" });
  }

  return lanes;
}

function ensurePlayableGroundRoute({ tileGrid, groundY, startX, endX, groundTile, minGapBetweenHoles, maxHoleWidth }) {
  const width = tileGrid[0]?.length || 0;
  const fromX = clamp(startX, 0, Math.max(0, width - 1));
  const toX = clamp(endX, fromX, Math.max(0, width - 1));
  const minGap = Math.max(3, minGapBetweenHoles || 5);
  const maxWidth = Math.max(1, maxHoleWidth || 2);

  const collectHoles = () => {
    const spans = [];
    let x = fromX;
    while (x <= toX) {
      if (tileGrid[groundY][x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x <= toX && !tileGrid[groundY][x]) {
        x += 1;
      }
      spans.push({ start, end: x - 1 });
    }
    return spans;
  };

  // Clamp each hole to max width.
  for (const hole of collectHoles()) {
    const widthTiles = hole.end - hole.start + 1;
    if (widthTiles <= maxWidth) {
      continue;
    }
    for (let x = hole.start + maxWidth; x <= hole.end; x += 1) {
      setGroundColumn(tileGrid, x, groundY, groundTile);
    }
  }

  // Enforce minimum flat distance between holes.
  let holes = collectHoles();
  for (let i = 1; i < holes.length; i += 1) {
    const prev = holes[i - 1];
    const curr = holes[i];
    const gap = curr.start - prev.end - 1;
    if (gap >= minGap) {
      continue;
    }
    for (let x = curr.start; x <= curr.end; x += 1) {
      setGroundColumn(tileGrid, x, groundY, groundTile);
    }
  }

  holes = collectHoles();

  // Keep clear run-up/landing around holes by removing low blockers.
  for (const hole of holes) {
    const runupStart = Math.max(fromX, hole.start - 4);
    const landingEnd = Math.min(toX, hole.end + 4);
    for (let x = runupStart; x <= landingEnd; x += 1) {
      if (x >= hole.start && x <= hole.end) {
        continue;
      }
      if (!tileGrid[groundY][x]) {
        setGroundColumn(tileGrid, x, groundY, groundTile);
      }
      if (tileGrid[groundY - 1]) {
        tileGrid[groundY - 1][x] = null;
      }
    }
  }

  return holes;
}

function augmentGroundHoles({ tileGrid, groundY, startX, endX, reservedRanges, holes, targetCount, rand }) {
  const width = tileGrid[0]?.length || 0;
  if (!width) {
    return holes || [];
  }

  const minX = clamp(startX, 1, width - 3);
  const maxX = clamp(endX, minX + 2, width - 2);
  const out = Array.isArray(holes) ? holes.slice() : [];
  let attempts = 0;

  while (out.length < targetCount && attempts < 700) {
    attempts += 1;
    const holeWidth = randInt(rand, 1, 2);
    const holeStart = randInt(rand, minX, Math.max(minX, maxX - holeWidth));
    const holeEnd = holeStart + holeWidth - 1;
    if (intersectsRanges(holeStart, holeEnd, reservedRanges || [])) {
      continue;
    }

    let tooClose = false;
    for (const hole of out) {
      if (holeStart <= hole.end + 4 && holeEnd >= hole.start - 4) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) {
      continue;
    }

    // Require short run-up and landing on solid ground.
    if (!tileGrid[groundY][holeStart - 1] || !tileGrid[groundY][holeStart - 2]) {
      continue;
    }
    if (!tileGrid[groundY][holeEnd + 1] || !tileGrid[groundY][holeEnd + 2]) {
      continue;
    }

    for (let x = holeStart; x <= holeEnd; x += 1) {
      clearGroundColumn(tileGrid, x, groundY);
    }
    out.push({ start: holeStart, end: holeEnd });
  }

  out.sort((a, b) => a.start - b.start);
  return out;
}

function buildBonusScatter({ biome, rand, tileGrid, bonusDensity, pathNodes, groundY, holes, reservedRanges, platformRails, levelIndex }) {
  const allBonus = state.config.object_pools?.bonus || [];
  const allDecor = state.config.object_pools?.decoration || [];
  const count = clamp(Math.round((tileGrid[0].length * bonusDensity) / 95) + (levelIndex || 0) * 2, 8, 22);
  const items = [];
  if (pathNodes.length < 3 || groundY == null) {
    return items;
  }
  const mysteryBlock =
    allBonus.find((b) => b.id === "bonus_mystery") ||
    allBonus.find((b) => String(b.path || "").includes("bonus_mystery")) ||
    { id: "bonus_mystery", path: "game_assets/bonus/bonus_mystery.png", spawn_weight: 1 };
  const usedBlock =
    allBonus.find((b) => b.id === "bonus_wall_01") ||
    allBonus.find((b) => String(b.path || "").includes("bonus_wall_01")) ||
    { id: "bonus_wall_01", path: "game_assets/bonus/bonus_wall_01.png", spawn_weight: 1 };
  const rewardDefs = [];
  const potionDef =
    allDecor.find((d) => d.id === "deco_potion") || { id: "deco_potion", path: "game_assets/decoration/deco_potion.png", spawn_weight: 2 };
  const jewelDef =
    allDecor.find((d) => d.id === "deco_jewel") || { id: "deco_jewel", path: "game_assets/decoration/deco_jewel.png", spawn_weight: 1 };
  rewardDefs.push(potionDef, jewelDef);

  if (!mysteryBlock?.path || !usedBlock?.path || !rewardDefs.length) {
    return items;
  }
  void biome;

  const tileSize = state.tileSize;
  const lanePassUnder = clamp(groundY - 3, 2, tileGrid.length - 3);
  const laneHigher = clamp(groundY - 4, 2, tileGrid.length - 3);

  const tryPlaceBlock = (tileX, tileY) => {
    if (items.length >= count) {
      return false;
    }
    if (tileX < 1 || tileX > tileGrid[0].length - 2 || tileY < 2 || tileY > tileGrid.length - 3) {
      return false;
    }
    if (tileGrid[tileY][tileX]) {
      return false;
    }
    if (intersectsRanges(tileX, tileX, reservedRanges || [])) {
      return false;
    }
    if (isInHole(holes || [], tileX)) {
      return false;
    }
    if (!hasReachableBonusSupport(tileGrid, tileX, tileY, groundY)) {
      return false;
    }
    if (items.some((item) => item.tileX === tileX)) {
      return false;
    }

    const worldX = tileX * tileSize;
    const worldY = tileY * tileSize;
    if (items.some((item) => Math.abs(item.x - worldX) < tileSize && Math.abs(item.y - worldY) < tileSize)) {
      return false;
    }

    const rewardDef = weightedPickByKey(rewardDefs, "spawn_weight", rand);
    if (!rewardDef) {
      return false;
    }

    items.push({
      type: mysteryBlock.id,
      path: mysteryBlock.path,
      usedPath: usedBlock.path,
      x: worldX,
      y: worldY,
      tileX,
      tileY,
      w: tileSize,
      h: tileSize,
      used: false,
      bumpTime: 0,
      bumpOffset: 0,
      rewardPath: rewardDef.path,
      rewardType: rewardDef.id,
      popup: null,
    });
    return true;
  };

  // Ordered rows over ground to keep readable rhythm.
  const rowPattern = [2, 3, 2, 4, 3];
  const groundNodes = pathNodes.filter((node) => node.kind === "ground").sort((a, b) => a.x - b.x);
  const stride = clamp(Math.floor(groundNodes.length / Math.max(1, Math.floor(count * 0.55))), 3, 6);
  let groupIndex = 0;
  for (let i = stride; i < groundNodes.length && items.length < count; i += stride) {
    const node = groundNodes[i];
    if (!node) {
      continue;
    }
    if (intersectsRanges(node.x - 2, node.x + 2, reservedRanges || [])) {
      continue;
    }
    const rowLen = rowPattern[groupIndex % rowPattern.length];
    const rowY = groupIndex % 2 === 0 ? lanePassUnder : laneHigher;
    const startX = node.x - Math.floor((rowLen - 1) / 2);
    for (let j = 0; j < rowLen; j += 1) {
      tryPlaceBlock(startX + j, rowY);
    }
    groupIndex += 1;
  }

  // Platform rewards: compact clusters on selected rails.
  for (let i = 1; i < (platformRails || []).length && items.length < count; i += 2) {
    const rail = platformRails[i];
    const railLen = rail.end - rail.start + 1;
    if (railLen < 3) {
      continue;
    }
    const center = Math.floor((rail.start + rail.end) * 0.5);
    if (railLen >= 6 && items.length + 2 <= count) {
      tryPlaceBlock(center - 1, clamp(rail.y - 2, 2, lanePassUnder));
      tryPlaceBlock(center + 1, clamp(rail.y - 2, 2, lanePassUnder));
    } else {
      tryPlaceBlock(center, clamp(rail.y - 2, 2, lanePassUnder));
    }
  }

  // Hole lures: limited and centered.
  let holeBonusCount = 0;
  const holeBonusCap = clamp(Math.floor(count / 4), 2, 4);
  for (const hole of holes || []) {
    if (items.length >= count) {
      break;
    }
    if (holeBonusCount >= holeBonusCap) {
      break;
    }
    const center = Math.floor((hole.start + hole.end) * 0.5);
    if (tryPlaceBlock(center, laneHigher)) {
      holeBonusCount += 1;
    }
  }

  // Controlled fill only on safe ground anchors.
  let fillAttempts = 0;
  while (items.length < count && fillAttempts < count * 6) {
    fillAttempts += 1;
    const node = groundNodes[randInt(rand, 0, Math.max(0, groundNodes.length - 1))];
    if (!node) {
      break;
    }
    const targetY = rand() < 0.7 ? lanePassUnder : laneHigher;
    const tileX = node.x + randInt(rand, -1, 1);
    tryPlaceBlock(tileX, targetY);
  }

  return items;
}

function hasReachableBonusSupport(tileGrid, blockX, blockY, groundY) {
  const maxY = clamp(groundY, blockY + 1, tileGrid.length - 1);
  const minX = Math.max(1, blockX - 1);
  const maxX = Math.min(tileGrid[0].length - 2, blockX + 1);

  for (let supportX = minX; supportX <= maxX; supportX += 1) {
    for (let supportY = blockY + 1; supportY <= maxY; supportY += 1) {
      if (!isSolidTile(tileGrid[supportY]?.[supportX])) {
        continue;
      }

      const gapTiles = supportY - blockY;
      if (gapTiles < BONUS_MIN_SUPPORT_GAP_TILES || gapTiles > BONUS_MAX_SUPPORT_GAP_TILES) {
        break;
      }

      // Keep enough empty space for the player to stand and jump under the block.
      if (isSolidTile(tileGrid[supportY - 1]?.[supportX])) {
        break;
      }
      if (isSolidTile(tileGrid[supportY - 2]?.[supportX])) {
        break;
      }

      return true;
    }
  }

  return false;
}

function buildDecorationScatter({ biome, rand, tileGrid, decoDensity, pathNodes }) {
  // Explicitly disabled: no random decorations cluttering the level.
  return [];
}

function buildGroundDecorScatter({ biome, rand, widthTiles, groundY, holes, reservedRanges }) {
  const decorTiles = biome.groundDecorTiles || [];
  if (!decorTiles.length) {
    return [];
  }

  const items = [];
  const targetCount = clamp(Math.floor(widthTiles / 12), 8, 20);
  let attempts = 0;
  while (items.length < targetCount && attempts < 420) {
    attempts += 1;
    const xTile = randInt(rand, 8, widthTiles - 8);
    if (isInHole(holes, xTile) || intersectsRanges(xTile - 1, xTile + 1, reservedRanges)) {
      continue;
    }
    if (items.some((item) => Math.abs(item.xTile - xTile) < 2)) {
      continue;
    }

    const tile = decorTiles[randInt(rand, 0, decorTiles.length - 1)];
    items.push({
      path: tile.path,
      xTile,
      yTile: groundY - 1,
    });
  }

  return items;
}

function buildEnemySpawns({ biomeId, rand, pathNodes, levelIndex, tileGrid, groundY, lanes }) {
  const pool = state.enemies.filter((enemy) => enemy.biomeHint === biomeId);
  const candidates = pool.length ? pool : state.enemies;
  const count = clamp(5 + levelIndex * 2, 6, 15);
  const enemies = [];

  if (!candidates.length) {
    return enemies;
  }

  const lanePool = (lanes || []).filter((lane) => lane.end - lane.start + 1 >= 4);
  if (!lanePool.length) {
    return enemies;
  }

  const shuffledLanes = lanePool
    .slice()
    .sort(() => rand() - 0.5)
    .sort((a, b) => a.start - b.start);

  for (const lane of shuffledLanes) {
    if (enemies.length >= count) {
      break;
    }
    const laneLen = lane.end - lane.start + 1;
    const spawnCount = laneLen >= 12 ? 2 : 1;
    for (let n = 0; n < spawnCount && enemies.length < count; n += 1) {
      let attempts = 0;
      while (attempts < 16 && enemies.length < count) {
        attempts += 1;
        const tileX = randInt(rand, lane.start + 1, lane.end - 1);
        if (!tileGrid[lane.y]?.[tileX]) {
          continue;
        }
        const tooClose = enemies.some(
          (enemy) =>
            Math.abs(tileX * state.tileSize - enemy.x) < state.tileSize * 4 &&
            Math.abs(lane.y * state.tileSize - (enemy.y + enemy.h)) < state.tileSize * 2,
        );
        if (tooClose) {
          continue;
        }

        const enemyDef = candidates[randInt(rand, 0, candidates.length - 1)];
        const hitbox = getEnemyHitboxSize(enemyDef);
        const enemyW = hitbox.w;
        const enemyH = hitbox.h;
        const spawnX = tileX * state.tileSize + (state.tileSize - enemyW) * 0.5;
        const patrolMin = lane.start * state.tileSize + 1;
        const patrolMax = (lane.end + 1) * state.tileSize - enemyW - 1;
        if (patrolMax - patrolMin < enemyW + 8) {
          continue;
        }

        enemies.push({
          def: enemyDef,
          x: spawnX,
          y: lane.y * state.tileSize - enemyH,
          vx: rand() > 0.5 ? ENEMY_MOVE_SPEED : -ENEMY_MOVE_SPEED,
          vy: 0,
          dir: rand() > 0.5 ? 1 : -1,
          w: enemyW,
          h: enemyH,
          prevY: lane.y * state.tileSize - enemyH,
          patrolMin,
          patrolMax,
          animTime: rand() * 3,
          onGround: false,
          alive: true,
          battling: false,
          defeatFadeActive: false,
          defeatFadeElapsed: 0,
          verbData: null,
        });
        break;
      }
    }
  }

  if (enemies.length < 4 && pathNodes?.length) {
    for (const node of pathNodes) {
      if (enemies.length >= 4) {
        break;
      }
      if (node.kind !== "ground" || !tileGrid[groundY]?.[node.x]) {
        continue;
      }
      const enemyDef = candidates[randInt(rand, 0, candidates.length - 1)];
      const hitbox = getEnemyHitboxSize(enemyDef);
      const enemyW = hitbox.w;
      const enemyH = hitbox.h;
      const spawnX = node.x * state.tileSize + (state.tileSize - enemyW) * 0.5;
      const patrolMin = Math.max(0, spawnX - state.tileSize * 3);
      const patrolMax = Math.min(tileGrid[0].length * state.tileSize - enemyW, spawnX + state.tileSize * 3);
      enemies.push({
        def: enemyDef,
        x: spawnX,
        y: groundY * state.tileSize - enemyH,
        vx: rand() > 0.5 ? ENEMY_MOVE_SPEED : -ENEMY_MOVE_SPEED,
        vy: 0,
        dir: rand() > 0.5 ? 1 : -1,
        w: enemyW,
        h: enemyH,
        prevY: groundY * state.tileSize - enemyH,
        patrolMin,
        patrolMax,
        animTime: rand() * 3,
        onGround: false,
        alive: true,
        battling: false,
        defeatFadeActive: false,
        defeatFadeElapsed: 0,
        verbData: null,
      });
    }
  }

  return enemies;
}

function getEnemyHitboxSize(enemyDef) {
  const spriteW = (enemyDef?.size?.width || 48) * ENEMY_SCALE;
  const spriteH = (enemyDef?.size?.height || 48) * ENEMY_SCALE;
  return {
    w: clamp(Math.round(spriteW * ENEMY_HITBOX_WIDTH_RATIO), ENEMY_MIN_HITBOX_W, ENEMY_MAX_HITBOX_W),
    h: clamp(Math.round(spriteH * ENEMY_HITBOX_HEIGHT_RATIO), ENEMY_MIN_HITBOX_H, ENEMY_MAX_HITBOX_H),
  };
}

function populateSettingsPanel() {
  ui.heroSelect.innerHTML = "";
  state.heroes.forEach((hero, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = hero.name;
    ui.heroSelect.appendChild(option);
  });

  ui.levelSelect.innerHTML = "";
  state.levels.forEach((level, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `Niveau ${level.id || index + 1} - ${capitalize(level.biomeId)}`;
    ui.levelSelect.appendChild(option);
  });

  ui.heroSelect.value = String(state.selectedHeroIndex);
  ui.levelSelect.value = String(state.currentLevelIndex);
  if (ui.difficultySelect) {
    ui.difficultySelect.value = state.easyMode ? "easy" : "normal";
  }
  renderErrorList();
}

function bindControls() {
  const setHeldState = (button, key, isDown) => {
    if (state.duel?.QS.active || !state.started || state.paused || state.gameOver || state.deathSequence.active) {
      return;
    }
    state.controls[key] = isDown;
    button.classList.toggle("active", isDown);
  };
  const isLeftKey = (event) =>
    event.code === "ArrowLeft" ||
    event.code === "KeyA" ||
    event.code === "KeyQ" ||
    event.key === "ArrowLeft" ||
    event.key.toLowerCase() === "a" ||
    event.key.toLowerCase() === "q";
  const isRightKey = (event) =>
    event.code === "ArrowRight" ||
    event.code === "KeyD" ||
    event.key === "ArrowRight" ||
    event.key.toLowerCase() === "d";
  const isJumpKey = (event) =>
    event.code === "ArrowUp" ||
    event.code === "Space" ||
    event.code === "KeyW" ||
    event.code === "KeyZ" ||
    event.key === "ArrowUp" ||
    event.key === " " ||
    event.key.toLowerCase() === "w" ||
    event.key.toLowerCase() === "z";

  attachHoldButton(ui.moveLeftBtn, (down) => setHeldState(ui.moveLeftBtn, "left", down));
  attachHoldButton(ui.moveRightBtn, (down) => setHeldState(ui.moveRightBtn, "right", down));
  attachTapButton(ui.jumpBtn, () => {
    if (state.duel?.QS.active || !state.started || state.paused || state.gameOver || state.deathSequence.active) {
      return;
    }
    state.controls.jumpBuffered = true;
    ui.jumpBtn.classList.add("active");
    setTimeout(() => ui.jumpBtn.classList.remove("active"), 90);
  });

  ui.shopBtn?.addEventListener("click", () => {
    if (!state.ready) {
      return;
    }
    if (state.duel?.QS.active) {
      return;
    }
    openSettingsPanel();
  });

  ui.pauseBtn?.addEventListener("click", () => {
    if (!state.ready || !state.started || state.gameOver || state.duel?.QS.active) {
      return;
    }
    if (!ui.settingsPanel.hidden) {
      closeSettingsPanel();
    }
    if (isPauseModalOpen()) {
      closePauseMenu();
      return;
    }
    openPauseMenu();
  });

  ui.closeSettingsBtn.addEventListener("click", closeSettingsPanel);

  ui.applySettingsBtn.addEventListener("click", () => {
    const wasStarted = state.started;
    state.selectedHeroIndex = clamp(Number(ui.heroSelect.value) || 0, 0, state.heroes.length - 1);
    const requestedEasyMode = ui.difficultySelect ? ui.difficultySelect.value === "easy" : state.easyMode;
    const levelIndex = clamp(Number(ui.levelSelect.value) || 0, 0, state.levels.length - 1);
    const modeChanged = requestedEasyMode !== state.easyMode;
    state.easyMode = requestedEasyMode;
    if (modeChanged) {
      generateLevelsFromConfig(state.config);
      populateSettingsPanel();
    }
    closeSettingsPanel();
    if (wasStarted) {
      closePauseMenu();
      state.paused = false;
      loadLevel(levelIndex, true);
      return;
    }
    loadLevel(levelIndex, true);
    showTitleScreen();
  });

  ui.startBtn?.addEventListener("click", startGameFromMenu);
  ui.openSettingsFromTitleBtn?.addEventListener("click", openSettingsPanel);
  ui.resumeBtn?.addEventListener("click", closePauseMenu);
  ui.openSettingsFromPauseBtn?.addEventListener("click", () => {
    openSettingsPanel();
  });
  ui.backToTitleBtn?.addEventListener("click", () => {
    closePauseMenu();
    returnToTitleScreen();
  });
  ui.restartBtn?.addEventListener("click", restartLevelAfterGameOver);
  ui.backToTitleFromGameOverBtn?.addEventListener("click", returnToTitleScreen);

  window.addEventListener(
    "keydown",
    (event) => {
      if (state.duel?.QS.active) {
        if (state.duel.handleQuestionKey(event)) {
          event.preventDefault();
        }
        return;
      }
      const key = event.key.toLowerCase();
      const titleVisible = Boolean(ui.titleScreen && !ui.titleScreen.classList.contains("hidden"));
      if (state.gameOver) {
        if (event.code === "Enter" || event.code === "Space") {
          event.preventDefault();
          restartLevelAfterGameOver();
        }
        if (key === "escape") {
          event.preventDefault();
          returnToTitleScreen();
        }
        return;
      }
      if (!state.started) {
        if (titleVisible && ui.settingsPanel.hidden && (event.code === "Enter" || event.code === "Space")) {
          event.preventDefault();
          startGameFromMenu();
          return;
        }
        if (key === "escape" && !ui.settingsPanel.hidden) {
          event.preventDefault();
          closeSettingsPanel();
        }
        return;
      }
      if (key === "escape") {
        event.preventDefault();
        if (!ui.settingsPanel.hidden) {
          closeSettingsPanel();
          return;
        }
        if (isPauseModalOpen()) {
          closePauseMenu();
          return;
        }
        openPauseMenu();
        return;
      }
      if (state.paused || state.deathSequence.active) {
        return;
      }
      if (isLeftKey(event)) {
        event.preventDefault();
        state.controls.left = true;
        ui.moveLeftBtn.classList.add("active");
      }
      if (isRightKey(event)) {
        event.preventDefault();
        state.controls.right = true;
        ui.moveRightBtn.classList.add("active");
      }
      if (isJumpKey(event)) {
        event.preventDefault();
        state.controls.jumpBuffered = true;
        ui.jumpBtn.classList.add("active");
        setTimeout(() => ui.jumpBtn.classList.remove("active"), 90);
      }
    },
    { passive: false },
  );

  window.addEventListener("keyup", (event) => {
    if (state.duel?.QS.active || !state.started || state.paused || state.gameOver) {
      return;
    }
    if (isLeftKey(event)) {
      event.preventDefault();
      state.controls.left = false;
      ui.moveLeftBtn.classList.remove("active");
    }
    if (isRightKey(event)) {
      event.preventDefault();
      state.controls.right = false;
      ui.moveRightBtn.classList.remove("active");
    }
  });
  window.addEventListener("blur", () => {
    state.controls.left = false;
    state.controls.right = false;
    ui.moveLeftBtn.classList.remove("active");
    ui.moveRightBtn.classList.remove("active");
    ui.jumpBtn.classList.remove("active");
  });

  document.body.addEventListener(
    "touchmove",
    (event) => {
      if (!event.target.closest(".panel, .menu-card, .game-over")) {
        event.preventDefault();
      }
    },
    { passive: false },
  );
}

function resetMovementInputs() {
  state.controls.left = false;
  state.controls.right = false;
  state.controls.jumpBuffered = false;
  ui.moveLeftBtn?.classList.remove("active");
  ui.moveRightBtn?.classList.remove("active");
  ui.jumpBtn?.classList.remove("active");
}

function isPauseModalOpen() {
  return Boolean(ui.pauseModal && !ui.pauseModal.classList.contains("hidden"));
}

function openSettingsPanel() {
  if (!state.ready || !ui.settingsPanel) {
    return;
  }
  ui.heroSelect.value = String(state.selectedHeroIndex);
  ui.levelSelect.value = String(state.currentLevelIndex);
  if (ui.difficultySelect) {
    ui.difficultySelect.value = state.easyMode ? "easy" : "normal";
  }
  ui.settingsPanel.hidden = false;
  state.paused = true;
}

function closeSettingsPanel() {
  if (!ui.settingsPanel) {
    return;
  }
  ui.settingsPanel.hidden = true;
  if (!state.started) {
    state.paused = false;
    return;
  }
  state.paused = isPauseModalOpen();
}

function openPauseMenu() {
  if (!state.started || state.gameOver || state.deathSequence.active || !ui.pauseModal) {
    return;
  }
  resetMovementInputs();
  ui.settingsPanel.hidden = true;
  ui.pauseModal.classList.remove("hidden");
  state.paused = true;
}

function closePauseMenu() {
  if (ui.pauseModal) {
    ui.pauseModal.classList.add("hidden");
  }
  if (!state.started) {
    state.paused = false;
    return;
  }
  state.paused = !ui.settingsPanel.hidden;
}

function startGameFromMenu() {
  if (!state.ready) {
    return;
  }
  if (state.duel?.QS.active) {
    state.duel.closeQuestion();
  }
  state.started = true;
  state.paused = false;
  state.gameOver = false;
  state.deathSequence.active = false;
  state.towerInterior.active = false;
  ui.titleScreen?.classList.add("hidden");
  ui.gameOverPanel?.classList.add("hidden");
  ui.pauseModal?.classList.add("hidden");
  ui.settingsPanel.hidden = true;
  loadLevel(state.currentLevelIndex, true);
}

function showTitleScreen() {
  state.started = false;
  state.paused = false;
  state.gameOver = false;
  state.deathSequence.active = false;
  state.screenMode = "game";
  state.towerInterior.active = false;
  if (state.duel?.QS.active) {
    state.duel.closeQuestion();
  }
  resetMovementInputs();
  ui.settingsPanel.hidden = true;
  ui.pauseModal?.classList.add("hidden");
  ui.gameOverPanel?.classList.add("hidden");
  ui.titleScreen?.classList.remove("hidden");
  updateHudInfo();
}

function returnToTitleScreen() {
  loadLevel(state.currentLevelIndex, true);
  showTitleScreen();
}

function showGameOverScreen() {
  state.started = false;
  state.paused = true;
  state.gameOver = true;
  state.screenMode = "game";
  state.towerInterior.active = false;
  resetMovementInputs();
  if (state.duel?.QS.active) {
    state.duel.closeQuestion();
  }
  ui.settingsPanel.hidden = true;
  ui.pauseModal?.classList.add("hidden");
  ui.titleScreen?.classList.add("hidden");
  if (ui.gameOverTitle) {
    ui.gameOverTitle.textContent = "Game Over";
  }
  if (ui.gameOverText) {
    ui.gameOverText.textContent = "You lost all hearts.";
  }
  if (ui.finalScoreText) {
    ui.finalScoreText.textContent = `Final score: ${state.score}`;
  }
  if (ui.finalCoinsText) {
    ui.finalCoinsText.textContent = `Coins: ${state.coins}`;
  }
  ui.gameOverPanel?.classList.remove("hidden");
}

function restartLevelAfterGameOver() {
  if (!state.gameOver) {
    return;
  }
  state.gameOver = false;
  state.started = true;
  state.paused = false;
  ui.gameOverPanel?.classList.add("hidden");
  ui.pauseModal?.classList.add("hidden");
  ui.settingsPanel.hidden = true;
  loadLevel(state.currentLevelIndex, true);
}

function loadLevel(levelIndex, resetScore) {
  if (state.duel?.QS.active) {
    state.duel.closeQuestion();
  }
  state.currentLevelIndex = levelIndex;
  state.currentLevel = cloneLevel(state.levels[levelIndex]);
  state.cameraX = 0;
  state.endCastleLockHintUntil = 0;
  state.playerHitInvuln = 0;
  state.playerHitStun = 0;
  state.deathSequence.active = false;
  state.deathSequence.elapsed = 0;
  state.deathSequence.duration = PLAYER_DEATH_DELAY_SECONDS;
  state.gameOver = false;
  state.screenMode = "game";
  state.towerInterior.active = false;
  ui.gameOverPanel?.classList.add("hidden");

  const hero = state.heroes[state.selectedHeroIndex];
  const playerW = PLAYER_HITBOX_WIDTH;
  const playerH = PLAYER_HITBOX_HEIGHT;
  state.player = {
    x: state.currentLevel.start.x,
    y: state.currentLevel.start.y - playerH,
    vx: 0,
    vy: 0,
    w: playerW,
    h: playerH,
    onGround: false,
    facing: "south-east",
    animTime: 0,
    coyoteTime: 0,
    prevY: state.currentLevel.start.y - playerH,
  };

  if (resetScore) {
    state.score = 0;
    state.coins = 0;
    state.hearts = STARTING_HEARTS;
  }
  updateHudInfo();

  showMessage(`Level ${levelIndex + 1}: ${capitalize(state.currentLevel.biomeId)}`);
}

function updateHudInfo() {
  if (ui.hudScoreValue) {
    ui.hudScoreValue.textContent = `${Math.max(0, Math.floor(state.score || 0))}`;
  }
  if (ui.hudLives) {
    ui.hudLives.textContent = formatHeartMeter(Math.max(0, Math.floor(state.hearts || 0)), MAX_HEARTS);
  }
  if (ui.hudGoldValue) {
    ui.hudGoldValue.textContent = `${Math.max(0, Math.floor(state.coins || 0))}`;
  }
}

function formatHeartMeter(current, max) {
  const safeMax = Math.max(0, Math.floor(max || 0));
  const safeCurrent = clamp(Math.floor(current || 0), 0, safeMax);
  let out = "";
  for (let i = 0; i < safeMax; i += 1) {
    out += i < safeCurrent ? "❤️" : "🩶";
  }
  return out;
}

function cloneLevel(level) {
  return {
    ...level,
    tileGrid: level.tileGrid.map((row) => row.slice()),
    bonuses: level.bonuses.map((item) => ({ ...item })),
    decorations: level.decorations.map((item) => ({ ...item })),
    groundDecorations: (level.groundDecorations || []).map((item) => ({ ...item })),
    enemySpawns: level.enemySpawns.map((enemy) => ({ ...enemy })),
    initialEnemyCount: Number.isFinite(level.initialEnemyCount) ? level.initialEnemyCount : level.enemySpawns.length,
    defeatedEnemyCount: Number.isFinite(level.defeatedEnemyCount) ? level.defeatedEnemyCount : 0,
  };
}

function gameLoop(timestamp) {
  if (!state.lastTimestamp) {
    state.lastTimestamp = timestamp;
  }
  const delta = Math.min(0.033, (timestamp - state.lastTimestamp) / 1000);
  state.lastTimestamp = timestamp;

  if (state.ready && state.started && !state.paused && !state.gameOver) {
    update(delta);
  }
  render(timestamp / 1000);

  requestAnimationFrame(gameLoop);
}

function update(delta) {
  state.runTime += delta;
  state.playerHitInvuln = Math.max(0, state.playerHitInvuln - delta);
  state.playerHitStun = Math.max(0, state.playerHitStun - delta);
  updateHudInfo();

  if (state.deathSequence.active) {
    updateDeathSequence(delta);
    if (state.message && performance.now() > state.messageUntil) {
      state.message = "";
    }
    return;
  }

  if (state.towerInterior.active) {
    updateTowerInterior(delta);
    if (state.message && performance.now() > state.messageUntil) {
      state.message = "";
    }
    return;
  }

  if (state.duel?.QS.active) {
    if (state.message && performance.now() > state.messageUntil) {
      state.message = "";
    }
    return;
  }

  updatePlayer(delta);
  updateEnemies(delta);
  updateBonusBlocks(delta);
  updateCamera();

  if (state.message && performance.now() > state.messageUntil) {
    state.message = "";
  }
}

function updatePlayer(delta) {
  const player = state.player;
  const level = state.currentLevel;
  player.prevY = player.y;

  const movingLeft = state.controls.left;
  const movingRight = state.controls.right;
  const inHitStun = state.playerHitStun > 0;

  if (inHitStun) {
    player.vx *= 0.92;
  } else if (movingLeft === movingRight) {
    player.vx *= GAME.friction;
  } else if (movingLeft) {
    player.vx = -GAME.moveSpeed;
    player.facing = "south-west";
  } else if (movingRight) {
    player.vx = GAME.moveSpeed;
    player.facing = "south-east";
  }

  if (Math.abs(player.vx) < 2) {
    player.vx = 0;
  }

  if (player.onGround) {
    player.coyoteTime = 0.08;
  } else {
    player.coyoteTime = Math.max(0, player.coyoteTime - delta);
  }

  if (state.controls.jumpBuffered && tryEnterTower()) {
    state.controls.jumpBuffered = false;
    return;
  }

  if (!inHitStun && state.controls.jumpBuffered && (player.onGround || player.coyoteTime > 0)) {
    player.vy = GAME.jumpVelocity;
    player.onGround = false;
    player.coyoteTime = 0;
  }
  state.controls.jumpBuffered = false;

  player.vy = Math.min(player.vy + GAME.gravity * delta, GAME.maxFallVelocity);

  player.x += player.vx * delta;
  resolveHorizontalCollisions(player, level);

  player.y += player.vy * delta;
  resolveVerticalCollisions(player, level);

  player.animTime += delta;

  collideWithEnemies();
  checkGoal();

  if (player.y > level.worldHeight + 80) {
    damagePlayer("Fell");
    if (!state.deathSequence.active) {
      respawnPlayer();
    }
    return;
  }
}

function updateDeathSequence(delta) {
  const player = state.player;
  if (!player) {
    return;
  }

  const gravity = GAME.gravity * 0.55;
  player.vy = Math.min(player.vy + gravity * delta, GAME.maxFallVelocity);
  player.y += player.vy * delta;
  player.x += player.vx * delta * 0.2;
  player.animTime += delta;

  state.deathSequence.elapsed += delta;
  if (state.deathSequence.elapsed < state.deathSequence.duration) {
    return;
  }

  state.deathSequence.active = false;
  showGameOverScreen();
}

function updateTowerInterior(delta) {
  const player = state.player;
  const speed = GAME.moveSpeed * 0.85;
  state.controls.jumpBuffered = false;

  if (state.controls.left && !state.controls.right) {
    player.vx = -speed;
    player.facing = "south-west";
  } else if (state.controls.right && !state.controls.left) {
    player.vx = speed;
    player.facing = "south-east";
  } else {
    player.vx *= GAME.friction;
  }

  if (Math.abs(player.vx) < 2) {
    player.vx = 0;
  }

  player.x += player.vx * delta;
  player.y = VIRTUAL_HEIGHT - player.h - 34;
  player.vy = 0;
  player.onGround = true;
  player.animTime += delta;

  if (player.x <= -player.w * 0.35) {
    leaveTowerInterior("left");
  } else if (player.x >= VIRTUAL_WIDTH - player.w * 0.65) {
    leaveTowerInterior("right");
  }
}

function updateEnemies(delta) {
  const level = state.currentLevel;

  for (const enemy of level.enemySpawns) {
    if (!enemy.alive) {
      continue;
    }
    if (enemy.defeatFadeActive) {
      enemy.defeatFadeElapsed = (enemy.defeatFadeElapsed || 0) + delta;
      if (enemy.defeatFadeElapsed >= ENEMY_DEFEAT_FADE_SECONDS) {
        enemy.defeatFadeActive = false;
        enemy.alive = false;
        enemy.battling = false;
      }
      continue;
    }
    if (enemy.battling) {
      continue;
    }
    enemy.prevY = enemy.y;
    enemy.animTime += delta;

    let dir = enemy.dir >= 0 ? 1 : -1;
    if (enemy.onGround) {
      const wallAhead = enemyHasObstacleAhead(enemy, level, dir);
      const supportAhead = enemyHasSupportAhead(enemy, level, dir, 5);
      if (wallAhead || !supportAhead) {
        dir *= -1;
      }
    }

    enemy.dir = dir;
    enemy.vx = dir * ENEMY_MOVE_SPEED;
    const prevX = enemy.x;
    enemy.x += enemy.vx * delta;
    resolveHorizontalCollisions(enemy, level);

    // Hit side wall: turn around.
    if (Math.abs(enemy.x - prevX) < 0.05) {
      enemy.dir *= -1;
      enemy.vx = enemy.dir * ENEMY_MOVE_SPEED;
    }

    // Never leave the platform: if stepping off, snap back and turn.
    if (enemy.onGround && !enemyHasGroundUnder(enemy, level)) {
      enemy.x = prevX;
      enemy.dir *= -1;
      enemy.vx = enemy.dir * ENEMY_MOVE_SPEED;
    }

    if (enemy.x <= 0) {
      enemy.dir = 1;
    } else if (enemy.x >= level.worldWidth - enemy.w) {
      enemy.dir = -1;
    }

    enemy.vy = Math.min(enemy.vy + GAME.gravity * delta, GAME.maxFallVelocity);
    enemy.y += enemy.vy * delta;
    resolveVerticalCollisions(enemy, level);
  }
}

function enemyHasSupportAhead(enemy, level, dir, lookAheadPx) {
  const probeX = dir > 0 ? enemy.x + enemy.w + lookAheadPx : enemy.x - lookAheadPx;
  const probeY = enemy.y + enemy.h + 2;
  return isSolidAtPoint(level, probeX, probeY);
}

function enemyHasGroundUnder(enemy, level) {
  const footY = enemy.y + enemy.h + 2;
  const leftX = enemy.x + enemy.w * 0.24;
  const rightX = enemy.x + enemy.w * 0.76;
  return isSolidAtPoint(level, leftX, footY) || isSolidAtPoint(level, rightX, footY);
}

function enemyHasObstacleAhead(enemy, level, dir) {
  const probeX = dir > 0 ? enemy.x + enemy.w + 3 : enemy.x - 3;
  const probeYTop = enemy.y + enemy.h * 0.4;
  const probeYBottom = enemy.y + enemy.h * 0.78;
  return isSolidAtPoint(level, probeX, probeYTop) || isSolidAtPoint(level, probeX, probeYBottom);
}

function isSolidAtPoint(level, worldX, worldY) {
  if (worldX < 0 || worldY < 0 || worldX >= level.worldWidth || worldY >= level.worldHeight) {
    return false;
  }

  const tileX = Math.floor(worldX / state.tileSize);
  const tileY = Math.floor(worldY / state.tileSize);
  const minX = Math.max(0, tileX - 1);
  const maxX = Math.min(level.widthTiles - 1, tileX + 1);
  const minY = Math.max(0, tileY - 1);
  const maxY = Math.min(level.heightTiles - 1, tileY + 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const tile = level.tileGrid[y][x];
      if (!isSolidTile(tile)) {
        continue;
      }
      const rect = getSolidTileCollisionRect(tile, x, y);
      if (
        worldX >= rect.x &&
        worldX <= rect.x + rect.w &&
        worldY >= rect.y &&
        worldY <= rect.y + rect.h
      ) {
        return true;
      }
    }
  }

  return false;
}

function resolveHorizontalCollisions(entity, level) {
  const rects = getNearbySolidRects(entity, level);
  for (const tile of rects) {
    if (tile.oneWay) {
      continue;
    }
    if (!aabb(entity, tile)) {
      continue;
    }

    if (entity.vx > 0) {
      entity.x = tile.x - entity.w;
    } else if (entity.vx < 0) {
      entity.x = tile.x + tile.w;
    }
    entity.vx = 0;
  }

  entity.x = clamp(entity.x, 0, level.worldWidth - entity.w);
}

function resolveVerticalCollisions(entity, level) {
  const rects = getNearbySolidRects(entity, level);
  entity.onGround = false;
  const prevBottom = (entity.prevY ?? entity.y) + entity.h;

  for (const tile of rects) {
    if (!aabb(entity, tile)) {
      continue;
    }

    if (entity.vy > 0) {
      if (tile.oneWay && prevBottom > tile.y + 1) {
        continue;
      }
      entity.y = tile.y - entity.h;
      entity.vy = 0;
      entity.onGround = true;
    } else if (entity.vy < 0) {
      if (tile.oneWay) {
        continue;
      }
      entity.y = tile.y + tile.h;
      entity.vy = 0;
      if (entity === state.player && tile.bonusBlock) {
        triggerBonusBlock(tile.bonusBlock);
      }
    }
  }
}

function getNearbySolidRects(entity, level) {
  const minX = Math.max(0, Math.floor(entity.x / state.tileSize) - 1);
  const maxX = Math.min(level.widthTiles - 1, Math.floor((entity.x + entity.w) / state.tileSize) + 1);
  const minY = Math.max(0, Math.floor(entity.y / state.tileSize) - 1);
  const maxY = Math.min(level.heightTiles - 1, Math.floor((entity.y + entity.h) / state.tileSize) + 1);

  const rects = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const tile = level.tileGrid[y][x];
      if (isSolidTile(tile)) {
        const rect = getSolidTileCollisionRect(tile, x, y);
        rect.oneWay = isOneWayPlatformTile(tile);
        rects.push(rect);
      }
    }
  }

  for (const block of level.bonuses) {
    const blockTileX = Math.floor(block.x / state.tileSize);
    const blockTileY = Math.floor(block.y / state.tileSize);
    if (blockTileX < minX - 1 || blockTileX > maxX + 1 || blockTileY < minY - 1 || blockTileY > maxY + 1) {
      continue;
    }
    rects.push({ x: block.x, y: block.y + block.bumpOffset, w: block.w, h: block.h, bonusBlock: block });
  }

  return rects;
}

function isOneWayPlatformTile(tile) {
  if (tile?.groundSolid) {
    return false;
  }
  const code = getTileCodeFromPath(tile?.path);
  return code != null && code >= 10 && code <= 15;
}

function getSolidTileCollisionRect(tile, tileX, tileY) {
  const tileSize = state.tileSize;
  const x = tileX * tileSize;
  const y = tileY * tileSize;
  const insets = getTileVerticalCollisionInsets(tile);

  if (!insets) {
    return { x, y, w: tileSize, h: tileSize };
  }

  const topInset = clamp(insets.top * tileSize, 0, tileSize - 2);
  // Keep full bottom depth so platforms remain solid from underneath.
  const usableHeight = Math.max(2, tileSize - topInset);

  return {
    x,
    y: y + topInset,
    w: tileSize,
    h: usableHeight,
  };
}

function getTileVerticalCollisionInsets(tile) {
  if (!tile?.path) {
    return null;
  }
  if (tileVerticalCollisionInsetCache.has(tile.path)) {
    return tileVerticalCollisionInsetCache.get(tile.path);
  }

  const image = imageCache.get(tile.path);
  if (!isImageRenderable(image)) {
    const fallbackInset = getTileFallbackCollisionInsets(tile);
    tileVerticalCollisionInsetCache.set(tile.path, fallbackInset);
    return fallbackInset;
  }

  const bounds = getSpriteOpaqueBounds(image);
  const sourceH = image.naturalHeight || image.height;
  if (!bounds || !sourceH) {
    const fallbackInset = getTileFallbackCollisionInsets(tile);
    tileVerticalCollisionInsetCache.set(tile.path, fallbackInset);
    return fallbackInset;
  }

  const inset = {
    top: bounds.top / sourceH,
    bottom: Math.max(0, sourceH - 1 - bounds.bottom) / sourceH,
  };
  tileVerticalCollisionInsetCache.set(tile.path, inset);
  return inset;
}

function getTileFallbackCollisionInsets(tile) {
  const code = getTileCodeFromPath(tile?.path);
  const isSimpleSurface = code != null && code >= 9 && code <= 15;
  const isWalkableSurface =
    Boolean(tile?.walkable_top) ||
    tileHasTag(tile, "walkable_top") ||
    String(tile?.role || "").includes("surface");

  if (isSimpleSurface || isWalkableSurface) {
    // Fallback when alpha bounds can't be read (often on file://):
    // keep the feet closer to the visible top of surface sprites.
    return { top: 0.16, bottom: 0 };
  }

  return null;
}

function isSolidTile(tile) {
  if (!tile) {
    return false;
  }
  // Tiles marked collision:none in config must not block movement.
  return String(tile.collision || "solid").toLowerCase() !== "none";
}

function updateBonusBlocks(delta) {
  const level = state.currentLevel;
  if (!level) {
    return;
  }

  for (const block of level.bonuses) {
    if (block.bumpTime > 0) {
      block.bumpTime = Math.max(0, block.bumpTime - delta);
      const t = block.bumpTime / 0.12;
      block.bumpOffset = -Math.sin((1 - t) * Math.PI) * 6;
      if (block.bumpTime === 0) {
        block.bumpOffset = 0;
      }
    }

    if (!block.popup || block.popup.collected) {
      continue;
    }

    if (!block.popup.collectible) {
      block.popup.rise = Math.min(26, block.popup.rise + 140 * delta);
      block.popup.y = block.y - block.popup.rise;
      if (block.popup.rise >= 26) {
        block.popup.collectible = true;
        block.popup.settled = false;
        block.popup.vy = 0;
      }
    } else if (!block.popup.settled) {
      block.popup.vy = Math.min(BONUS_POPUP_MAX_FALL_SPEED, block.popup.vy + BONUS_POPUP_GRAVITY * delta);
      block.popup.y += block.popup.vy * delta;
      if (resolveBonusPopupVerticalCollision(block.popup, level)) {
        block.popup.settled = true;
      } else if (block.popup.y > level.worldHeight - block.popup.h - state.tileSize) {
        // Safety fallback: keep the bonus reachable if no collision was detected.
        block.popup.y = level.groundY * state.tileSize - block.popup.h;
        block.popup.vy = 0;
        block.popup.settled = true;
      }
    }

    if (block.popup.collectible && aabb(state.player, block.popup)) {
      applyBonusReward(block.rewardType);
      block.popup.collected = true;
    }
  }
}

function triggerBonusBlock(block) {
  if (block.used) {
    return;
  }

  block.used = true;
  block.bumpTime = 0.12;
  block.bumpOffset = -4;
  block.popup = {
    x: block.x + (block.w - 22) / 2,
    y: block.y,
    w: 22,
    h: 22,
    rise: 0,
    vy: 0,
    settled: false,
    collectible: false,
    collected: false,
    path: block.rewardPath,
  };
}

function resolveBonusPopupVerticalCollision(popup, level) {
  const rects = getNearbySolidRects(popup, level);
  let grounded = false;
  for (const tile of rects) {
    if (!aabb(popup, tile)) {
      continue;
    }
    if (popup.vy >= 0) {
      popup.y = tile.y - popup.h;
      popup.vy = 0;
      grounded = true;
      break;
    }
    popup.y = tile.y + tile.h;
    popup.vy = 0;
  }
  return grounded;
}

function applyBonusReward(rewardType) {
  if (rewardType.includes("jewel")) {
    state.coins += 15;
    state.score += 60;
    return;
  }

  if (rewardType.includes("potion")) {
    state.hearts = Math.min(MAX_HEARTS, state.hearts + 1);
    state.score += 20;
    return;
  }

  if (rewardType.includes("coin")) {
    state.coins += 1;
    state.score += 10;
    return;
  }

  state.score += 5;
}

function collectBonuses() {
  // Legacy entry point kept for compatibility.
  const level = state.currentLevel;
  if (!level) {
    return;
  }
}

function collideWithEnemies() {
  const player = state.player;
  const level = state.currentLevel;
  if (!state.duel || !state.started || state.paused || state.gameOver || state.deathSequence.active || state.screenMode === "question") {
    return;
  }

  for (let i = 0; i < level.enemySpawns.length; i += 1) {
    const enemy = level.enemySpawns[i];
    if (!enemy.alive || enemy.battling) {
      continue;
    }
    if (!aabb(player, enemy)) {
      continue;
    }

    if (state.playerHitInvuln > 0) {
      return;
    }
    openQuestion(enemy);
    return;
  }
}

function damagePlayer(reason, sourceX = null) {
  if (state.deathSequence.active) {
    return;
  }

  state.hearts -= 1;
  state.playerHitInvuln = PLAYER_HIT_INVULN_SECONDS;
  state.playerHitStun = PLAYER_HIT_STUN_SECONDS;
  const player = state.player;
  const playerCenter = player.x + player.w * 0.5;
  const hitFromLeft = sourceX != null ? sourceX < playerCenter : player.facing === "south-east";
  player.vx = hitFromLeft ? PLAYER_HIT_KNOCKBACK_X : -PLAYER_HIT_KNOCKBACK_X;
  player.vy = Math.min(player.vy, PLAYER_HIT_KNOCKBACK_Y);
  player.onGround = false;
  showMessage(reason);

  if (state.hearts <= 0) {
    state.hearts = 0;
    state.playerHitInvuln = 0;
    state.playerHitStun = 0;
    state.deathSequence.active = true;
    state.deathSequence.elapsed = 0;
    state.deathSequence.duration = PLAYER_DEATH_DELAY_SECONDS;
    player.vx = 0;
    player.vy = PLAYER_DEATH_LAUNCH_Y;
    player.onGround = false;
    showMessage("You died");
  }
}

function hitPlayer() {
  if (state.playerHitInvuln > 0 || state.deathSequence.active) {
    return;
  }
  damagePlayer("Wrong conjugation");
}

function defeatEnemy(enemy) {
  if (!enemy || !enemy.alive || enemy.defeatFadeActive) {
    return;
  }
  enemy.defeatFadeActive = true;
  enemy.defeatFadeElapsed = 0;
  enemy.battling = true;
  enemy.vx = 0;
  enemy.vy = 0;
  state.currentLevel.defeatedEnemyCount = (state.currentLevel.defeatedEnemyCount || 0) + 1;
  state.score += 100;
  state.coins += 10;
  state.persistentGold += 10;
  savePersistentGold(state.persistentGold);
  showMessage("+100 / +10 gold");
}

function respawnPlayer() {
  const player = state.player;
  const start = state.currentLevel.start;
  player.x = start.x;
  player.y = start.y - player.h;
  player.prevY = player.y;
  player.vx = 0;
  player.vy = 0;
}

function getTowerBounds(level) {
  const towerW = 116;
  const towerH = Math.round(200 * TOWER_HEIGHT_SCALE);
  const x = clamp(level.towerX - towerW / 2, 0, level.worldWidth - towerW);
  const y = level.groundY * state.tileSize - (towerH - state.tileSize);
  return { x, y, w: towerW, h: towerH };
}

function tryEnterTower() {
  if (!state.player.onGround || state.towerInterior.active) {
    return false;
  }

  const level = state.currentLevel;
  const player = state.player;
  const tower = getTowerBounds(level);
  const entryZone = {
    x: tower.x + tower.w * 0.3,
    y: level.groundY * state.tileSize - state.tileSize * 1.2,
    w: tower.w * 0.4,
    h: state.tileSize * 1.6,
  };

  if (!aabb(player, entryZone)) {
    return false;
  }

  state.towerInterior.active = true;
  state.towerInterior.outsideX = player.x;
  state.towerInterior.outsideY = player.y;

  player.x = VIRTUAL_WIDTH * 0.5 - player.w * 0.5;
  player.y = VIRTUAL_HEIGHT - player.h - 34;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  showMessage("Entrée dans la tour");
  return true;
}

function leaveTowerInterior(side) {
  const level = state.currentLevel;
  const player = state.player;
  const tower = getTowerBounds(level);
  const margin = 8;

  state.towerInterior.active = false;
  if (side === "left") {
    player.x = tower.x - player.w - margin;
  } else {
    player.x = tower.x + tower.w + margin;
  }
  player.y = level.groundY * state.tileSize - player.h;
  player.prevY = player.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  showMessage("Sortie de la tour");
}

function checkGoal() {
  if (state.towerInterior.active) {
    return;
  }
  const level = state.currentLevel;
  const player = state.player;
  const goal = getEndCastleDoorBounds(level);

  if (!aabb(player, goal)) {
    return;
  }

  if (!isEndCastleUnlocked(level)) {
    const now = performance.now();
    if (now >= state.endCastleLockHintUntil) {
      const pct = Math.floor(getEnemyDefeatRatio(level) * 100);
      showMessage(`Porte fermee: ${pct}% ennemis battus`);
      state.endCastleLockHintUntil = now + 900;
    }
    player.vx = 0;
    const doorCenter = goal.x + goal.w * 0.5;
    const playerCenter = player.x + player.w * 0.5;
    if (playerCenter < doorCenter) {
      player.x = Math.min(player.x, goal.x - player.w - 1);
    } else {
      player.x = Math.max(player.x, goal.x + goal.w + 1);
    }
    return;
  }

  state.score += 100;

  if (state.currentLevelIndex < state.levels.length - 1) {
    loadLevel(state.currentLevelIndex + 1, false);
  } else {
    showMessage("All 5 levels cleared");
    loadLevel(0, true);
  }
}

function getEnemyCounts(level) {
  const defeated = Math.max(0, Math.floor(level.defeatedEnemyCount || 0));
  const fallbackTotal = defeated + (level.enemySpawns?.length || 0);
  const total = Math.max(0, Math.floor(Number.isFinite(level.initialEnemyCount) ? level.initialEnemyCount : fallbackTotal));
  return { total, defeated: Math.min(defeated, total) };
}

function getEnemyDefeatRatio(level) {
  const { total, defeated } = getEnemyCounts(level);
  if (total <= 0) {
    return 1;
  }
  return defeated / total;
}

function isEndCastleUnlocked(level) {
  const { total, defeated } = getEnemyCounts(level);
  if (total <= 0) {
    return true;
  }
  return defeated > total * 0.5;
}

function getCastleMetrics(level) {
  const castleW = Math.round(220 * CASTLE_SCALE);
  const castleH = Math.round(212 * CASTLE_SCALE);
  const castleY = level.groundY * state.tileSize - (castleH - state.tileSize);
  return { castleW, castleH, castleY };
}

function getEndCastleBounds(level) {
  const { castleW, castleH, castleY } = getCastleMetrics(level);
  const x = clamp(level.castleX - castleW / 2, 0, level.worldWidth - castleW);
  return { x, y: castleY, w: castleW, h: castleH };
}

function getEndCastleDoorBounds(level) {
  const castle = getEndCastleBounds(level);
  const doorW = Math.round(castle.w * 0.22);
  const doorH = Math.round(castle.h * 0.34);
  const doorX = Math.round(castle.x + castle.w * 0.39);
  const doorY = Math.round(castle.y + castle.h - doorH - Math.max(2, state.tileSize * 0.08));
  return { x: doorX, y: doorY, w: doorW, h: doorH };
}

function updateCamera() {
  const desired = state.player.x - VIRTUAL_WIDTH * 0.35;
  const maxX = Math.max(0, state.currentLevel.worldWidth - VIRTUAL_WIDTH);
  state.cameraX += (clamp(desired, 0, maxX) - state.cameraX) * 0.12;
}

function render(timeSeconds) {
  if (!state.currentLevel) {
    return;
  }

  if (state.towerInterior.active) {
    drawTowerInteriorScene(timeSeconds);
    if (state.message) {
      drawFloatingMessage(state.message);
    }
    return;
  }

  const level = state.currentLevel;
  const [bgTop, bgBottom] = BIOME_BACKGROUNDS[level.biomeId] || ["#1f2431", "#324764"];

  const grad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
  grad.addColorStop(0, bgTop);
  grad.addColorStop(1, bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  drawParallaxBackground(level);

  ctx.save();
  ctx.translate(-Math.floor(state.cameraX), 0);

  try {
    drawStructures(level);
    drawTiles(level);
    drawGroundDecorations(level);
    drawDecorations(level);
    drawBonuses(level, timeSeconds);
    drawEnemies(level);
    drawGoal(level);
    drawPlayer(state.player);
  } catch (error) {
    console.error("Render error:", error);
    drawPlayerFallback(state.player);
  }

  ctx.restore();

  if (state.message) {
    drawFloatingMessage(state.message);
  }

  if (!state.ready) {
    drawFloatingMessage("Loading...");
  }
}

function drawTowerInteriorScene(timeSeconds) {
  const interiorImage = imageCache.get("game_assets/tower/tower_inside.png");
  const chestImage = imageCache.get("game_assets/decoration/deco_chest.png");

  if (interiorImage?.complete) {
    const scale = Math.max(VIRTUAL_WIDTH / interiorImage.width, VIRTUAL_HEIGHT / interiorImage.height);
    const drawW = interiorImage.width * scale;
    const drawH = interiorImage.height * scale;
    const drawX = (VIRTUAL_WIDTH - drawW) / 2;
    const drawY = (VIRTUAL_HEIGHT - drawH) / 2;
    ctx.drawImage(interiorImage, drawX, drawY, drawW, drawH);
  } else {
    ctx.fillStyle = "#12151f";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  }

  if (chestImage?.complete) {
    const chestW = 84;
    const chestH = 84;
    const chestX = VIRTUAL_WIDTH * 0.5 - chestW * 0.5;
    const chestY = VIRTUAL_HEIGHT * 0.5 - chestH * 0.5 + Math.sin(timeSeconds * 2.5) * 2;
    ctx.drawImage(chestImage, chestX, chestY, chestW, chestH);
  }

  drawPlayer(state.player);
}

function drawParallaxBackground(level) {
  const path = BIOME_PARALLAX_BACKGROUNDS[level.biomeId];
  const image = path ? imageCache.get(path) : null;
  if (!isImageRenderable(image)) {
    return;
  }

  // Single parallax plane (requested).
  drawParallaxLayer(image, 0.3, 1, 1, 0);
}

function drawParallaxLayer(image, speed, alpha, scale, yOffset) {
  const baseScale = Math.max(
    VIRTUAL_WIDTH / Math.max(1, image.width),
    VIRTUAL_HEIGHT / Math.max(1, image.height),
    scale || 1,
  );
  const drawW = Math.max(1, Math.round(image.width * baseScale));
  const drawH = Math.max(1, Math.round(image.height * baseScale));
  const y = Math.round(VIRTUAL_HEIGHT - drawH + yOffset);
  const scroll = ((state.cameraX * speed) % drawW + drawW) % drawW;
  const firstX = -Math.round(scroll);
  const baseIndex = Math.floor((firstX - drawW) / drawW);

  ctx.save();
  ctx.globalAlpha = alpha;
  let tileIndex = 0;
  for (let x = firstX - drawW; x < VIRTUAL_WIDTH + drawW; x += drawW) {
    const absoluteIndex = baseIndex + tileIndex;
    const mirrored = Math.abs(absoluteIndex) % 2 === 1;
    if (mirrored) {
      ctx.save();
      ctx.translate(x + drawW, y);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(image, x, y, drawW, drawH);
    }
    tileIndex += 1;
  }
  ctx.restore();
}

function drawTiles(level) {
  const tileSize = state.tileSize;
  const startX = Math.max(0, Math.floor(state.cameraX / tileSize) - 1);
  const endX = Math.min(level.widthTiles - 1, Math.floor((state.cameraX + VIRTUAL_WIDTH) / tileSize) + 2);
  const groundTopY = level.groundY;
  const groundBottomY = Math.min(level.heightTiles - 1, groundTopY + GROUND_THICKNESS_TILES - 1);

  for (let y = 0; y < level.heightTiles; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const tile = level.tileGrid[y][x];
      if (!tile) {
        continue;
      }
      if (y >= groundTopY && y <= groundBottomY) {
        continue;
      }

      const image = imageCache.get(tile.path);
      const drawX = x * tileSize;
      const drawY = y * tileSize;

      if (isImageRenderable(image)) {
        ctx.drawImage(image, drawX, drawY, tileSize, tileSize);
      } else {
        ctx.fillStyle = "#5a6679";
        ctx.fillRect(drawX, drawY, tileSize, tileSize);
      }
    }
  }

  // Ground is rendered in dedicated passes with overlap so layers interlock visually.
  // Draw from bottom to top to keep the highest row in front.
  for (let y = groundBottomY; y >= groundTopY; y -= 1) {
    const overlapOffset = (y - groundTopY) * GROUND_TILE_OVERLAP_PX;
    for (let x = startX; x <= endX; x += 1) {
      const tile = level.tileGrid[y]?.[x];
      if (!tile) {
        continue;
      }
      const image = imageCache.get(tile.path);
      const leftSolid = Boolean(level.tileGrid[y]?.[x - 1]);
      const rightSolid = Boolean(level.tileGrid[y]?.[x + 1]);
      const halfOverlap = Math.floor(GROUND_TILE_HORIZONTAL_OVERLAP_PX / 2);
      const leftExtra = leftSolid ? halfOverlap : 0;
      const rightExtra = rightSolid ? GROUND_TILE_HORIZONTAL_OVERLAP_PX - halfOverlap : 0;
      const drawX = x * tileSize - leftExtra;
      const drawY = y * tileSize - overlapOffset;
      const drawW = tileSize + leftExtra + rightExtra;

      if (isImageRenderable(image)) {
        ctx.drawImage(image, drawX, drawY, drawW, tileSize);
      } else {
        ctx.fillStyle = "#5a6679";
        ctx.fillRect(drawX, drawY, drawW, tileSize);
      }
    }
  }
}

function drawStructures(level) {
  const startImage = level.structures.start ? imageCache.get(level.structures.start) : null;
  const endPath = isEndCastleUnlocked(level)
    ? level.structures.endUnlocked || level.structures.end
    : level.structures.endLocked || level.structures.end;
  const endImage = endPath ? imageCache.get(endPath) : null;
  const towerImage = level.structures.tower ? imageCache.get(level.structures.tower) : null;
  const { castleW, castleH, castleY } = getCastleMetrics(level);

  if (isImageRenderable(startImage)) {
    const startCenterX = level.startCastleX ?? state.tileSize * 4;
    const sx = clamp(startCenterX - castleW / 2, 0, Math.max(0, level.worldWidth - castleW));
    ctx.drawImage(startImage, sx, castleY, castleW, castleH);
  }

  if (isImageRenderable(towerImage)) {
    const tower = getTowerBounds(level);
    ctx.drawImage(towerImage, tower.x, tower.y, tower.w, tower.h);
  }

  if (isImageRenderable(endImage)) {
    const cx = clamp(level.castleX - castleW / 2, 0, level.worldWidth - castleW);
    ctx.drawImage(endImage, cx, castleY, castleW, castleH);
  }
}

function drawDecorations(level) {
  for (const deco of level.decorations) {
    const image = imageCache.get(deco.path);
    if (isImageRenderable(image)) {
      ctx.drawImage(image, deco.x, deco.y - deco.h, deco.w, deco.h);
    }
  }
}

function drawGroundDecorations(level) {
  const tileSize = state.tileSize;
  for (const decor of level.groundDecorations || []) {
    const image = imageCache.get(decor.path);
    if (!isImageRenderable(image)) {
      continue;
    }
    const x = decor.xTile * tileSize;
    const groundTileY = level.groundY;
    const groundTile = level.tileGrid[groundTileY]?.[decor.xTile] || null;
    const groundRect = groundTile ? getSolidTileCollisionRect(groundTile, decor.xTile, groundTileY) : null;
    const surfaceY = groundRect ? groundRect.y : groundTileY * tileSize;
    const bounds = getSpriteOpaqueBounds(image);
    if (bounds) {
      const sourceH = image.naturalHeight || image.height || tileSize;
      const scaleY = tileSize / sourceH;
      const bottomPad = Math.max(0, sourceH - 1 - bounds.bottom) * scaleY;
      // Anchor visible pixels to the actual ground surface (including top inset of ground tile).
      const drawY = Math.round(surfaceY - tileSize + bottomPad);
      ctx.drawImage(image, x, drawY, tileSize, tileSize);
    } else {
      // file:// fallback: pixel reads may be blocked, so apply a conservative bottom padding.
      const fallbackBottomPad = Math.round(tileSize * GROUND_DECOR_FALLBACK_BOTTOM_PAD_RATIO);
      const drawY = Math.round(surfaceY - tileSize + fallbackBottomPad);
      ctx.drawImage(image, x, drawY, tileSize, tileSize);
    }
  }
}

function drawBonuses(level, timeSeconds) {
  for (const block of level.bonuses) {
    const blockSpritePath = block.used && block.usedPath ? block.usedPath : block.path;
    const blockImage = imageCache.get(blockSpritePath);
    const blockY = block.y + block.bumpOffset;

    if (isImageRenderable(blockImage)) {
      ctx.drawImage(blockImage, block.x, blockY, block.w, block.h);
    } else {
      ctx.fillStyle = block.used ? "#8d8d8d" : "#d8b363";
      ctx.fillRect(block.x, blockY, block.w, block.h);
    }

    if (!block.popup || block.popup.collected) {
      continue;
    }

    const rewardImage = imageCache.get(block.popup.path);
    if (isImageRenderable(rewardImage)) {
      ctx.drawImage(rewardImage, block.popup.x, block.popup.y, block.popup.w, block.popup.h);
    } else {
      ctx.fillStyle = "#ffde5e";
      ctx.fillRect(block.popup.x, block.popup.y, block.popup.w, block.popup.h);
    }
  }
}

function getSpriteOpaqueBounds(image) {
  if (!image) {
    return null;
  }
  if (spriteBoundsCache.has(image)) {
    return spriteBoundsCache.get(image);
  }

  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  if (!w || !h || !spriteBoundsCtx) {
    spriteBoundsCache.set(image, null);
    return null;
  }

  let data;
  try {
    spriteBoundsCanvas.width = w;
    spriteBoundsCanvas.height = h;
    spriteBoundsCtx.clearRect(0, 0, w, h);
    spriteBoundsCtx.drawImage(image, 0, 0, w, h);
    data = spriteBoundsCtx.getImageData(0, 0, w, h).data;
  } catch {
    // On local file origins, reading pixels may be blocked; fallback to classic anchoring.
    spriteBoundsCache.set(image, null);
    return null;
  }

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 10) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const bounds = maxX >= 0 ? { left: minX, top: minY, right: maxX, bottom: maxY } : null;
  spriteBoundsCache.set(image, bounds);
  return bounds;
}

function getEntitySpriteDrawRect(image, entity, drawW, drawH) {
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  const fallbackYOffset = Math.round(drawH * SPRITE_FALLBACK_FOOT_OFFSET_RATIO);
  if (!w || !h) {
    return {
      x: entity.x - (drawW - entity.w) / 2,
      y: entity.y - (drawH - entity.h) + fallbackYOffset,
    };
  }

  const bounds = getSpriteOpaqueBounds(image);
  if (!bounds) {
    return {
      x: entity.x - (drawW - entity.w) / 2,
      y: entity.y - (drawH - entity.h) + fallbackYOffset,
    };
  }

  const scaleX = drawW / w;
  const scaleY = drawH / h;

  const leftPad = bounds.left * scaleX;
  const rightPad = (w - 1 - bounds.right) * scaleX;
  const topPad = bounds.top * scaleY;
  const bottomPad = (h - 1 - bounds.bottom) * scaleY;

  const visibleW = Math.max(1, drawW - leftPad - rightPad);
  const visibleH = Math.max(1, drawH - topPad - bottomPad);

  const drawX = entity.x + (entity.w - visibleW) / 2 - leftPad;
  const drawY = entity.y + entity.h - visibleH - topPad;
  return { x: drawX, y: drawY };
}

function drawEnemies(level) {
  for (const enemy of level.enemySpawns) {
    if (!enemy.alive) {
      continue;
    }
    const image = pickEnemyFrame(enemy);
    const fadeProgress = enemy.defeatFadeActive
      ? clamp((enemy.defeatFadeElapsed || 0) / ENEMY_DEFEAT_FADE_SECONDS, 0, 1)
      : 0;
    const alpha = enemy.defeatFadeActive ? 1 - fadeProgress : 1;
    const riseOffset = enemy.defeatFadeActive ? -ENEMY_DEFEAT_RISE_PX * fadeProgress : 0;
    if (isImageRenderable(image)) {
      const drawW = enemy.def.size.width * ENEMY_SCALE;
      const drawH = enemy.def.size.height * ENEMY_SCALE;
      const rect = getEntitySpriteDrawRect(image, enemy, drawW, drawH);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(image, rect.x, rect.y + riseOffset, drawW, drawH);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#cf4b4b";
      ctx.fillRect(enemy.x, enemy.y + riseOffset, enemy.w, enemy.h);
      ctx.restore();
    }
  }
}

function pickEnemyFrame(enemy) {
  const facingEast = enemy.dir >= 0;
  const walkSet = facingEast ? enemy.def.sprite.walkE : enemy.def.sprite.walkW;
  const idle = facingEast ? enemy.def.sprite.idleE : enemy.def.sprite.idleW;

  if (walkSet && walkSet.length) {
    const index = Math.floor(enemy.animTime * 9) % walkSet.length;
    return imageCache.get(walkSet[index]);
  }

  return imageCache.get(idle);
}

function drawGoal(level) {
  const door = getEndCastleDoorBounds(level);
  ctx.fillStyle = isEndCastleUnlocked(level) ? "rgba(120, 255, 120, 0.14)" : "rgba(255, 120, 120, 0.14)";
  ctx.fillRect(door.x, door.y, door.w, door.h);
}

function drawPlayer(player) {
  const hero = state.heroes[state.selectedHeroIndex];
  if (!hero || !player) {
    return;
  }
  const blinking = state.playerHitInvuln > 0;
  const blinkOn = !blinking || Math.floor(state.runTime * PLAYER_HIT_BLINK_HZ) % 2 === 0;
  if (!blinkOn) {
    return;
  }
  const frameImage = pickHeroFrame(hero, player);
  const hitPulse = state.playerHitStun > 0;
  const dying = state.deathSequence.active;
  const deathT = dying ? clamp(state.deathSequence.elapsed / Math.max(0.001, state.deathSequence.duration), 0, 1) : 0;
  const deathAlpha = dying ? Math.max(0.2, 1 - deathT * 0.85) : 1;
  const deathRotation = dying ? deathT * Math.PI * 1.35 : 0;

  if (isImageRenderable(frameImage)) {
    const drawW = hero.size.width * HERO_SCALE;
    const drawH = hero.size.height * HERO_SCALE;
    const rect = getEntitySpriteDrawRect(frameImage, player, drawW, drawH);
    if (player.onGround) {
      rect.y += PLAYER_RENDER_GROUND_OFFSET_PX;
    }
    ctx.save();
    if (dying) {
      ctx.translate(rect.x + drawW * 0.5, rect.y + drawH * 0.5);
      ctx.rotate(deathRotation);
      ctx.translate(-(rect.x + drawW * 0.5), -(rect.y + drawH * 0.5));
      ctx.globalAlpha = deathAlpha;
    }
    if (blinking) {
      ctx.globalAlpha = hitPulse ? 0.46 : 0.62;
    }
    ctx.drawImage(frameImage, rect.x, rect.y, drawW, drawH);
    ctx.restore();
  } else {
    drawPlayerFallback(player);
  }
}

function drawPlayerFallback(player) {
  if (!player) {
    return;
  }
  const blinking = state.playerHitInvuln > 0;
  const blinkOn = !blinking || Math.floor(state.runTime * PLAYER_HIT_BLINK_HZ) % 2 === 0;
  if (!blinkOn) {
    return;
  }
  ctx.save();
  if (blinking) {
    ctx.globalAlpha = state.playerHitStun > 0 ? 0.46 : 0.62;
  }
  ctx.fillStyle = "#4dc7ff";
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.restore();
}

function isImageRenderable(image) {
  return Boolean(image && image.complete && (image.naturalWidth || image.width) > 0 && (image.naturalHeight || image.height) > 0);
}

function pickHeroFrame(hero, player) {
  const facingSE = player.facing !== "south-west";

  // Per user request, use south-east and south-west hero sprites only.
  if (!player.onGround) {
    const jumpSet = facingSE ? hero.sprite.jumpSE : hero.sprite.jumpSW;
    if (jumpSet?.length) {
      const index = Math.floor(player.animTime * 12) % jumpSet.length;
      return imageCache.get(jumpSet[index]);
    }
  }

  if (Math.abs(player.vx) > 8) {
    const runSet = facingSE ? hero.sprite.runSE : hero.sprite.runSW;
    if (runSet?.length) {
      const index = Math.floor(player.animTime * 11) % runSet.length;
      return imageCache.get(runSet[index]);
    }
  }

  return imageCache.get(facingSE ? hero.sprite.idleSE : hero.sprite.idleSW);
}

function drawFloatingMessage(text) {
  ctx.save();
  ctx.fillStyle = "rgba(7, 10, 16, 0.76)";
  const boxW = Math.min(VIRTUAL_WIDTH - 20, Math.max(190, text.length * 8));
  const x = (VIRTUAL_WIDTH - boxW) / 2;
  ctx.fillRect(x, 92, boxW, 36);

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.strokeRect(x, 92, boxW, 36);

  ctx.fillStyle = "#f2f8ff";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, VIRTUAL_WIDTH / 2, 110);
  ctx.restore();
}

function showMessage(text) {
  state.message = text;
  state.messageUntil = performance.now() + 1700;
}

function attachHoldButton(element, callback) {
  const down = (event) => {
    event.preventDefault();
    callback(true);
  };
  const up = (event) => {
    event.preventDefault();
    callback(false);
  };

  element.addEventListener("touchstart", down, { passive: false });
  element.addEventListener("touchend", up, { passive: false });
  element.addEventListener("touchcancel", up, { passive: false });
  element.addEventListener("mousedown", down);
  element.addEventListener("mouseup", up);
  element.addEventListener("mouseleave", up);
}

function attachTapButton(element, callback) {
  const tap = (event) => {
    event.preventDefault();
    callback();
  };

  element.addEventListener("touchstart", tap, { passive: false });
  element.addEventListener("mousedown", tap);
}

function setTile(grid, x, y, tile) {
  if (!tile || !grid[y] || x < 0 || x >= grid[y].length) {
    return;
  }
  grid[y][x] = tile;
}

function pickTile(pool, fallback, rand) {
  if (pool && pool.length) {
    return pool[randInt(rand, 0, pool.length - 1)];
  }
  return fallback || null;
}

function buildWeightedBiomeList(weights) {
  const list = [];
  for (const [biomeId, weight] of Object.entries(weights || {})) {
    if (weight > 0) {
      list.push({ biomeId, weight });
    }
  }
  return list;
}

function weightedPick(entries, rand) {
  if (!entries.length) {
    return null;
  }

  let total = 0;
  for (const entry of entries) {
    total += entry.weight;
  }

  let roll = rand() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.biomeId;
    }
  }

  return entries[entries.length - 1].biomeId;
}

function weightedPickByKey(items, key, rand) {
  if (!items.length) {
    return null;
  }

  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, Number(item[key]) || 0), 0);
  if (totalWeight <= 0) {
    return items[randInt(rand, 0, items.length - 1)];
  }

  let roll = rand() * totalWeight;
  for (const item of items) {
    roll -= Math.max(0, Number(item[key]) || 0);
    if (roll <= 0) {
      return item;
    }
  }
  return items[items.length - 1];
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), 1 | t);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rand, min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function formatHeroName(value) {
  const cleaned = String(value).replace(/^hero[-_]/i, "").replace(/[-_]+/g, " ").trim();
  return capitalize(cleaned || "Hero");
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function toAssetPath(baseDir, relativePath) {
  if (!relativePath) {
    return null;
  }
  if (relativePath.startsWith("./") || relativePath.startsWith("game_assets/")) {
    return normalizeAssetPath(relativePath);
  }
  return normalizeAssetPath(`${baseDir}/${relativePath}`);
}

async function loadImage(path) {
  if (!path) {
    return null;
  }

  const cleanPath = normalizeAssetPath(path);
  if (imageCache.has(cleanPath)) {
    return imageCache.get(cleanPath);
  }
  if (imagePromiseCache.has(cleanPath)) {
    return imagePromiseCache.get(cleanPath);
  }

  const image = new Image();
  const loadingPromise = new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error(`Image load timeout: ${cleanPath}`));
    }, 12000);

    image.onload = () => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      imageCache.set(cleanPath, image);
      resolve(image);
    };

    image.onerror = () => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      reject(new Error(`Image load error: ${cleanPath}`));
    };

    image.src = cleanPath;
    if (image.complete && image.naturalWidth > 0) {
      image.onload();
    }
  });

  imagePromiseCache.set(cleanPath, loadingPromise);

  try {
    return await loadingPromise;
  } finally {
    imagePromiseCache.delete(cleanPath);
  }
}

async function fetchJson(path) {
  if (window.location.protocol === "file:") {
    throw new Error(`Fetch unavailable on file protocol for ${path}`);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 6000);
  const response = await fetch(path, { signal: controller.signal, cache: "no-store" }).finally(() =>
    window.clearTimeout(timeoutId),
  );
  if (!response.ok) {
    throw new Error(`Unable to fetch ${path}`);
  }
  return response.json();
}

async function buildHeroFromMetadata(dir, metadata) {
  const rotations = metadata.frames?.rotations || {};
  const running = metadata.frames?.animations?.["running-6-frames"] || {};
  const jumping = metadata.frames?.animations?.["jumping-2"] || {};

  const hero = {
    id: dir,
    name: formatHeroName(metadata.character?.name || dir),
    size: {
      width: metadata.character?.size?.width || 56,
      height: metadata.character?.size?.height || 56,
    },
    sprite: {
      idleSE: toAssetPath(`./game_assets/heroes/${dir}`, rotations["south-east"]),
      idleSW: toAssetPath(`./game_assets/heroes/${dir}`, rotations["south-west"]),
      runSE: await keepLoadablePaths(
        (running["south-east"] || []).map((file) => toAssetPath(`./game_assets/heroes/${dir}`, file)),
      ),
      runSW: await keepLoadablePaths(
        (running["south-west"] || []).map((file) => toAssetPath(`./game_assets/heroes/${dir}`, file)),
      ),
      jumpSE: await keepLoadablePaths(
        (jumping["south-east"] || []).map((file) => toAssetPath(`./game_assets/heroes/${dir}`, file)),
      ),
      jumpSW: await keepLoadablePaths(
        (jumping["south-west"] || []).map((file) => toAssetPath(`./game_assets/heroes/${dir}`, file)),
      ),
    },
  };

  if (!(await tryLoadImage(hero.sprite.idleSE)) || !(await tryLoadImage(hero.sprite.idleSW))) {
    return null;
  }

  await preloadHeroSprites(hero);
  return hero;
}

async function buildHeroFromConvention(dir) {
  const idleSE = `game_assets/heroes/${dir}/rotations/south-east.png`;
  const idleSW = `game_assets/heroes/${dir}/rotations/south-west.png`;
  if (!(await tryLoadImage(idleSE)) || !(await tryLoadImage(idleSW))) {
    return null;
  }

  const runSE = await collectFramePaths(`game_assets/heroes/${dir}/animations/running-6-frames/south-east/frame_`, 6);
  const runSW = await collectFramePaths(`game_assets/heroes/${dir}/animations/running-6-frames/south-west/frame_`, 6);
  const jumpSE = await collectFramePaths(`game_assets/heroes/${dir}/animations/jumping-2/south-east/frame_`, 8);
  const jumpSW = await collectFramePaths(`game_assets/heroes/${dir}/animations/jumping-2/south-west/frame_`, 8);

  const hero = {
    id: dir,
    name: formatHeroName(dir),
    size: { width: 56, height: 56 },
    sprite: {
      idleSE: normalizeAssetPath(idleSE),
      idleSW: normalizeAssetPath(idleSW),
      runSE,
      runSW,
      jumpSE,
      jumpSW,
    },
  };

  await preloadHeroSprites(hero);
  return hero;
}

async function preloadHeroSprites(hero) {
  const preloadList = [
    hero.sprite.idleSE,
    hero.sprite.idleSW,
    ...hero.sprite.runSE,
    ...hero.sprite.runSW,
    ...hero.sprite.jumpSE,
    ...hero.sprite.jumpSW,
  ].filter(Boolean);
  await Promise.all(preloadList.map((path) => loadImage(path).catch(() => null)));
}

async function buildEnemyFromMetadata(dir, metadata) {
  const walkingSet = metadata.frames?.animations?.["walking-6-frames"] || {};
  const rotations = metadata.frames?.rotations || {};

  const enemy = {
    id: dir,
    name: metadata.character?.name || dir,
    biomeHint: dir.split("-")[0],
    size: {
      width: metadata.character?.size?.width || 48,
      height: metadata.character?.size?.height || 48,
    },
    sprite: {
      idleE: toAssetPath(`./game_assets/enemies/${dir}`, rotations.east || rotations.south),
      idleW: toAssetPath(`./game_assets/enemies/${dir}`, rotations.west || rotations.south),
      walkE: await keepLoadablePaths(
        (walkingSet.east || []).map((file) => toAssetPath(`./game_assets/enemies/${dir}`, file)),
      ),
      walkW: await keepLoadablePaths(
        (walkingSet.west || []).map((file) => toAssetPath(`./game_assets/enemies/${dir}`, file)),
      ),
    },
  };

  const eastOk = await tryLoadImage(enemy.sprite.idleE);
  const westOk = await tryLoadImage(enemy.sprite.idleW);
  if (!eastOk && !westOk) {
    return null;
  }
  if (!eastOk) {
    enemy.sprite.idleE = enemy.sprite.idleW;
  }
  if (!westOk) {
    enemy.sprite.idleW = enemy.sprite.idleE;
  }

  await preloadEnemySprites(enemy);
  return enemy;
}

async function buildEnemyFromConvention(dir) {
  const idleE = `game_assets/enemies/${dir}/rotations/east.png`;
  const idleW = `game_assets/enemies/${dir}/rotations/west.png`;
  const idleS = `game_assets/enemies/${dir}/rotations/south.png`;

  let chosenIdleE = idleE;
  let chosenIdleW = idleW;

  if (!(await tryLoadImage(chosenIdleE))) {
    chosenIdleE = (await tryLoadImage(idleS)) ? idleS : idleW;
  }
  if (!(await tryLoadImage(chosenIdleW))) {
    chosenIdleW = (await tryLoadImage(idleS)) ? idleS : chosenIdleE;
  }
  if (!(await tryLoadImage(chosenIdleE)) && !(await tryLoadImage(chosenIdleW))) {
    return null;
  }

  const walkE = await collectFramePathsFromPrefixes(
    [
      `game_assets/enemies/${dir}/animations/walking-6-frames/east/frame_`,
      `game_assets/enemies/${dir}/walk/east/frame_`,
    ],
    6,
  );
  const walkW = await collectFramePathsFromPrefixes(
    [
      `game_assets/enemies/${dir}/animations/walking-6-frames/west/frame_`,
      `game_assets/enemies/${dir}/walk/west/frame_`,
    ],
    6,
  );

  const enemy = {
    id: dir,
    name: dir,
    biomeHint: dir.split("-")[0],
    size: { width: 48, height: 48 },
    sprite: {
      idleE: normalizeAssetPath(chosenIdleE),
      idleW: normalizeAssetPath(chosenIdleW),
      walkE,
      walkW,
    },
  };

  await preloadEnemySprites(enemy);
  return enemy;
}

async function preloadEnemySprites(enemy) {
  const preloadList = [enemy.sprite.idleE, enemy.sprite.idleW, ...enemy.sprite.walkE, ...enemy.sprite.walkW].filter(
    Boolean,
  );
  await Promise.all(preloadList.map((path) => loadImage(path).catch(() => null)));
}

async function keepLoadablePaths(paths) {
  const unique = [...new Set((paths || []).filter(Boolean).map((path) => normalizeAssetPath(path)))];
  const out = [];
  for (const path of unique) {
    if (await tryLoadImage(path)) {
      out.push(path);
    }
  }
  return out;
}

async function collectFramePaths(prefix, maxFrames) {
  const frames = [];
  for (let i = 0; i < maxFrames; i += 1) {
    const path = normalizeAssetPath(`${prefix}${pad3(i)}.png`);
    if (!(await tryLoadImage(path))) {
      if (i === 0) {
        return [];
      }
      break;
    }
    frames.push(path);
  }
  return frames;
}

async function collectFramePathsFromPrefixes(prefixes, maxFrames) {
  for (const prefix of prefixes) {
    const frames = await collectFramePaths(prefix, maxFrames);
    if (frames.length) {
      return frames;
    }
  }
  return [];
}

async function tryLoadImage(path) {
  if (!path) {
    return false;
  }
  try {
    await loadImage(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeAssetPath(path) {
  return String(path).replace(/^\.\//, "").replace(/\/{2,}/g, "/");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function pad3(value) {
  return String(value).padStart(3, "0");
}

function getVerbSource() {
  if (window.VERBS && typeof window.VERBS === "object") {
    return window.VERBS;
  }
  return {
    g1: {
      label: "1er groupe",
      list: {
        aimer: {
          inf: "aimer",
          pr: ["aime", "aimes", "aime", "aimons", "aimez", "aiment"],
          im: ["aimais", "aimais", "aimait", "aimions", "aimiez", "aimaient"],
          fu: ["aimerai", "aimeras", "aimera", "aimerons", "aimerez", "aimeront"],
          pp: "aimé",
        },
        jouer: {
          inf: "jouer",
          pr: ["joue", "joues", "joue", "jouons", "jouez", "jouent"],
          im: ["jouais", "jouais", "jouait", "jouions", "jouiez", "jouaient"],
          fu: ["jouerai", "joueras", "jouera", "jouerons", "jouerez", "joueront"],
          pp: "joué",
        },
      },
    },
    g2: {
      label: "2e groupe",
      list: {
        finir: {
          inf: "finir",
          pr: ["finis", "finis", "finit", "finissons", "finissez", "finissent"],
          im: ["finissais", "finissais", "finissait", "finissions", "finissiez", "finissaient"],
          fu: ["finirai", "finiras", "finira", "finirons", "finirez", "finiront"],
          pp: "fini",
        },
      },
    },
    g3: {
      label: "3e groupe",
      list: {
        prendre: {
          inf: "prendre",
          pr: ["prends", "prends", "prend", "prenons", "prenez", "prennent"],
          im: ["prenais", "prenais", "prenait", "prenions", "preniez", "prenaient"],
          fu: ["prendrai", "prendras", "prendra", "prendrons", "prendrez", "prendront"],
          pp: "pris",
        },
      },
    },
  };
}

function getDefaultActiveGroups() {
  return Object.keys(getVerbSource() || {});
}

function loadPersistentGold() {
  try {
    return Number(localStorage.getItem(PERSISTENT_CURRENCY_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

function savePersistentGold(value) {
  try {
    localStorage.setItem(PERSISTENT_CURRENCY_KEY, String(Math.max(0, Math.floor(value || 0))));
  } catch {
    // Ignore storage issues in restricted contexts.
  }
}

function populatePedagogyPanel() {
  if (!ui.groupFilters || !ui.tenseFilters) {
    return;
  }
  const verbs = getVerbSource();
  const groupKeys = Object.keys(verbs);
  ui.groupFilters.innerHTML = groupKeys
    .map((g) => {
      const checked = state.pedagogy.activeGroups.includes(g) ? "checked" : "";
      const label = verbs[g]?.label || g;
      return `<label><input type="checkbox" data-group="${g}" ${checked}/> ${label}</label>`;
    })
    .join("");

  ui.tenseFilters.innerHTML = ["pr", "im", "fu"]
    .map((t) => {
      const checked = state.pedagogy.activeTenses.includes(t) ? "checked" : "";
      return `<label><input type="checkbox" data-tense="${t}" ${checked}/> ${TENSE_LABEL[t]}</label>`;
    })
    .join("");

  ui.groupFilters.querySelectorAll("input[data-group]").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = [...ui.groupFilters.querySelectorAll("input[data-group]:checked")].map((el) => el.dataset.group);
      state.pedagogy.activeGroups = selected.length ? selected : groupKeys.slice();
      renderErrorList();
    });
  });
  ui.tenseFilters.querySelectorAll("input[data-tense]").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = [...ui.tenseFilters.querySelectorAll("input[data-tense]:checked")].map((el) => el.dataset.tense);
      state.pedagogy.activeTenses = selected.length ? selected : ["pr", "im", "fu"];
      renderErrorList();
    });
  });
  if (ui.resetErrorsBtn) {
    ui.resetErrorsBtn.onclick = () => {
      resetErrors();
      renderErrorList();
    };
  }
}

function buildQuestionUiHooks() {
  const formatQuestionTense = (tenseLabel) => {
    const label = String(tenseLabel || "").trim();
    if (!label) {
      return "au temps inconnu";
    }
    const lower = label.charAt(0).toLowerCase() + label.slice(1);
    const first = lower[0];
    const useElision = ["a", "e", "i", "o", "u", "y", "h"].includes(first);
    return useElision ? `à l'${lower}` : `au ${lower}`;
  };

  return {
    onOpenQuestion(question) {
      if (!ui.questionPanel || !ui.questionPrompt || !ui.answerButtons) {
        return;
      }
      const verbs = getVerbSource();
      const verbDef = verbs?.[question.gKey]?.list?.[question.vKey];
      const inf = verbDef?.inf || question.vKey;
      const pronoun = PRONOUN_LABEL[question.pronIdx] || "";
      const tenseText = formatQuestionTense(question.tenseLabel);
      ui.questionPrompt.textContent = `Avec le verbe ${inf} ${tenseText}, ${pronoun} ?`;
      ui.answerButtons.innerHTML = "";
      question.options.forEach((option, index) => {
        const btn = document.createElement("button");
        btn.className = "answer-btn";
        btn.type = "button";
        btn.dataset.answer = option;
        btn.textContent = `${index + 1}. ${option}`;
        btn.addEventListener("click", () => {
          answerClick(option);
        });
        ui.answerButtons.appendChild(btn);
      });
      ui.questionPanel.hidden = false;
    },
    onCloseQuestion() {
      if (!ui.questionPanel || !ui.answerButtons) {
        return;
      }
      ui.questionPanel.hidden = true;
      ui.answerButtons.innerHTML = "";
    },
    getAnswerButtons() {
      return ui.answerButtons ? [...ui.answerButtons.querySelectorAll(".answer-btn")] : [];
    },
    setSelectedButton(button) {
      this.getAnswerButtons().forEach((btn) => btn.classList.remove("selected"));
      if (button) {
        button.classList.add("selected");
      }
    },
    disableAnswers() {
      this.getAnswerButtons().forEach((btn) => {
        btn.disabled = true;
      });
    },
    markAnswer({ correct, selected }) {
      this.getAnswerButtons().forEach((btn) => {
        const answer = btn.dataset.answer;
        if (answer === correct) {
          btn.classList.add("correct");
        }
        if (selected && selected !== correct && answer === selected) {
          btn.classList.add("wrong");
        }
      });
    },
    vibrate(ms) {
      if (navigator.vibrate) {
        navigator.vibrate(ms);
      }
    },
    onErrorUpdate() {
      renderErrorList();
    },
  };
}

function renderErrorList() {
  if (!state.duel || !ui.errorList) {
    return;
  }
  state.duel.renderErrorList(ui.errorList, 12);
}

function exposeConjugationApi() {
  window.openQuestion = openQuestion;
  window.makeQuestion = makeQuestion;
  window.answerClick = answerClick;
  window.closeQuestion = closeQuestion;
  window.recordError = recordError;
  window.resetErrors = resetErrors;
  window.getTopErrors = getTopErrors;
  window.randomVerbData = randomVerbData;
  window.generateLevelVerbDatas = generateLevelVerbDatas;
}

function openQuestion(enemy) {
  return state.duel ? state.duel.openQuestion(enemy) : false;
}
function makeQuestion(vd) {
  return state.duel ? state.duel.makeQuestion(vd) : null;
}
function answerClick(answer) {
  return state.duel ? state.duel.answerClick(answer) : false;
}
function closeQuestion() {
  return state.duel ? state.duel.closeQuestion() : undefined;
}
function recordError(q) {
  return state.duel ? state.duel.recordError(q) : undefined;
}
function resetErrors() {
  return state.duel ? state.duel.resetErrors() : undefined;
}
function getTopErrors(n) {
  return state.duel ? state.duel.getTopErrors(n) : [];
}
function randomVerbData() {
  return state.duel ? state.duel.randomVerbData() : null;
}
function generateLevelVerbDatas(n) {
  return state.duel ? state.duel.generateLevelVerbDatas(n) : [];
}

function createConjugationDuelSystem({ verbs, pronouns, storageKey, settingsGetter, uiHooks, gameplayHooks }) {
  const QS = { active: false, enemy: null, q: null };
  const QK = { selectedBtn: null };
  let selectedIndex = 0;
  let errorDB = loadErrorDB(storageKey);

  function frenchSound(word) {
    let s = String(word || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    s = s.replace(/[^a-zA-Z§]/g, "");
    s = s.replace(/(aient|ais|ait)$/i, "§E");
    s = s.replace(/ions$/i, "§ION");
    s = s.replace(/iez$/i, "§IE");
    s = s.replace(/(rons|ront)$/i, "§RON");
    s = s.replace(/(rez|rai)$/i, "§RE");
    s = s.replace(/(ras|ra)$/i, "§RA");
    s = s.replace(/ons$/i, "§ON");
    s = s.replace(/ez$/i, "§EZ");
    if (s.length > 4) {
      s = s.replace(/ent$/i, "");
    }
    s = s.replace(/es$/i, "");
    s = s.replace(/e$/i, "");
    s = s.replace(/[stxd]$/i, "");
    return s;
  }

  function getVerbDef(vd) {
    return verbs?.[vd?.gKey]?.list?.[vd?.vKey] || null;
  }

  function makeQuestion(vd) {
    const verbDef = getVerbDef(vd);
    if (!verbDef || !Array.isArray(verbDef[vd.tense])) {
      return null;
    }
    const correct = String(verbDef[vd.tense][vd.pronIdx] || "").trim();
    const correctSound = frenchSound(correct);
    const seen = new Set([correct.toLowerCase()]);
    const allForms = [];

    for (const t of ["pr", "im", "fu"]) {
      const arr = verbDef[t];
      if (!Array.isArray(arr)) {
        continue;
      }
      for (let p = 0; p < 6; p += 1) {
        const value = String(arr[p] || "").trim();
        if (!value) {
          continue;
        }
        const k = value.toLowerCase();
        if (seen.has(k)) {
          continue;
        }
        seen.add(k);
        allForms.push({ value, tense: t, pronIdx: p, sound: frenchSound(value) });
      }
    }

    const homophones = allForms.filter((c) => c.sound === correctSound);
    const diffSounds = allForms.filter((c) => c.sound !== correctSound);
    const distractors = [];
    const addCandidate = (cand) => {
      if (!cand || distractors.length >= 3) {
        return;
      }
      if (!distractors.includes(cand.value) && cand.value !== correct) {
        distractors.push(cand.value);
      }
    };

    addCandidate(homophones[0]);
    const prioritizedDiff = diffSounds
      .slice()
      .sort((a, b) => {
        const aOther = a.tense !== vd.tense ? 0 : 1;
        const bOther = b.tense !== vd.tense ? 0 : 1;
        if (aOther !== bOther) {
          return aOther - bOther;
        }
        return a.sound.localeCompare(b.sound);
      });
    const usedSounds = new Set();
    for (const cand of prioritizedDiff) {
      if (distractors.length >= 3) {
        break;
      }
      if (usedSounds.has(cand.sound)) {
        continue;
      }
      addCandidate(cand);
      usedSounds.add(cand.sound);
    }
    for (const cand of [...prioritizedDiff, ...homophones]) {
      if (distractors.length >= 3) {
        break;
      }
      addCandidate(cand);
    }
    const pp = String(verbDef.pp || "").trim();
    if (distractors.length < 3 && pp && pp.toLowerCase() !== correct.toLowerCase() && !distractors.includes(pp)) {
      distractors.push(pp);
    }
    if (distractors.length < 3) {
      const fallbackPool = [];
      for (const g of Object.values(verbs || {})) {
        for (const v of Object.values(g.list || {})) {
          for (const t of ["pr", "im", "fu"]) {
            const arr = v[t];
            if (Array.isArray(arr)) {
              fallbackPool.push(...arr);
            }
          }
          if (v.pp) {
            fallbackPool.push(v.pp);
          }
        }
      }
      for (const candidate of fallbackPool) {
        const value = String(candidate || "").trim();
        if (!value || value === correct || distractors.includes(value)) {
          continue;
        }
        distractors.push(value);
        if (distractors.length >= 3) {
          break;
        }
      }
    }

    const options = shuffle([correct, ...distractors.slice(0, 3)]);
    return {
      gKey: vd.gKey,
      vKey: vd.vKey,
      tense: vd.tense,
      tenseLabel: TENSE_LABEL[vd.tense] || vd.tense,
      pronIdx: vd.pronIdx,
      correct,
      options,
    };
  }

  function loadErrorDB(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveErrorDB() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(errorDB));
    } catch {
      // Ignore persistence errors.
    }
  }

  function recordError(q) {
    if (!q) return;
    const key = `${q.gKey}|${q.vKey}|${q.tense}|${q.pronIdx}`;
    errorDB[key] = (errorDB[key] || 0) + 1;
    saveErrorDB();
    uiHooks.onErrorUpdate?.();
  }

  function resetErrors() {
    errorDB = {};
    saveErrorDB();
    uiHooks.onErrorUpdate?.();
  }

  function settings() {
    const s = settingsGetter?.() || {};
    return {
      activeGroups: s.activeGroups?.length ? s.activeGroups : Object.keys(verbs || {}),
      activeTenses: s.activeTenses?.length ? s.activeTenses : ["pr", "im", "fu"],
    };
  }

  function getTopErrors(n = 10) {
    const { activeGroups, activeTenses } = settings();
    const out = [];
    for (const [key, count] of Object.entries(errorDB)) {
      const [gKey, vKey, tense, pronIdxStr] = key.split("|");
      const pronIdx = Number(pronIdxStr);
      if (!activeGroups.includes(gKey) || !activeTenses.includes(tense)) {
        continue;
      }
      const verbDef = verbs?.[gKey]?.list?.[vKey];
      const expected = verbDef?.[tense]?.[pronIdx];
      if (!verbDef || !expected) {
        continue;
      }
      out.push({
        key,
        count,
        gKey,
        vKey,
        tense,
        pronIdx,
        expected,
        infinitive: verbDef.inf || vKey,
      });
    }
    out.sort((a, b) => b.count - a.count);
    return out.slice(0, n);
  }

  function renderErrorList(container, n = 10) {
    if (!container) {
      return;
    }
    const top = getTopErrors(n);
    if (!top.length) {
      container.innerHTML = "<div class=\"error-row\">Aucune erreur enregistrée.</div>";
      return;
    }
    container.innerHTML = top
      .map(
        (entry) =>
          `<div class="error-row"><strong>${pronouns[entry.pronIdx]} + ${entry.infinitive}</strong><br/>${TENSE_LABEL[entry.tense] || entry.tense}: <em>${entry.expected}</em> — ${entry.count}x</div>`,
      )
      .join("");
  }

  function buildCandidatePool() {
    const { activeGroups, activeTenses } = settings();
    const byVerb = new Map();
    for (const gKey of activeGroups) {
      const list = verbs?.[gKey]?.list || {};
      for (const [vKey, verbDef] of Object.entries(list)) {
        const key = vKey;
        if (!byVerb.has(key)) {
          byVerb.set(key, []);
        }
        for (const tense of activeTenses) {
          const arr = verbDef?.[tense];
          if (!Array.isArray(arr) || arr.length < 6) continue;
          for (let pronIdx = 0; pronIdx < 6; pronIdx += 1) {
            if (!arr[pronIdx]) continue;
            byVerb.get(key).push({ gKey, vKey, tense, pronIdx });
          }
        }
      }
    }
    return [...byVerb.values()].flat();
  }

  function randomVerbData() {
    const pool = buildCandidatePool();
    if (!pool.length) {
      return { gKey: "g1", vKey: "aimer", tense: "pr", pronIdx: 0 };
    }

    const top = getTopErrors(200);
    const weightedReview = top
      .map((e) => ({ ...e, weight: Math.max(1, e.count) }))
      .filter((e) => pool.some((p) => p.gKey === e.gKey && p.vKey === e.vKey && p.tense === e.tense && p.pronIdx === e.pronIdx));
    if (weightedReview.length && Math.random() < 0.5) {
      let total = weightedReview.reduce((s, e) => s + e.weight, 0);
      let roll = Math.random() * total;
      for (const e of weightedReview) {
        roll -= e.weight;
        if (roll <= 0) {
          return { gKey: e.gKey, vKey: e.vKey, tense: e.tense, pronIdx: e.pronIdx };
        }
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function generateLevelVerbDatas(n) {
    const out = [];
    const used = new Set();
    let attempts = 0;
    while (out.length < n && attempts < n * 20) {
      attempts += 1;
      const vd = randomVerbData();
      const key = `${vd.vKey}|${vd.pronIdx}`;
      if (used.has(key)) {
        continue;
      }
      used.add(key);
      out.push(vd);
    }
    while (out.length < n) {
      out.push(randomVerbData());
    }
    return out;
  }

  function syncSelection() {
    const buttons = uiHooks.getAnswerButtons ? uiHooks.getAnswerButtons() : [];
    if (!buttons.length) {
      QK.selectedBtn = null;
      selectedIndex = 0;
      return;
    }
    selectedIndex = ((selectedIndex % buttons.length) + buttons.length) % buttons.length;
    QK.selectedBtn = buttons[selectedIndex] || null;
    uiHooks.setSelectedButton?.(QK.selectedBtn);
  }

  function openQuestion(enemy) {
    if (!enemy || QS.active) {
      return false;
    }
    const vd = enemy.verbData || randomVerbData();
    const q = makeQuestion(vd);
    if (!q) {
      return false;
    }
    QS.active = true;
    QS.enemy = enemy;
    QS.q = q;
    enemy.battling = true;
    selectedIndex = 0;
    uiHooks.onOpenQuestion?.(q);
    syncSelection();
    gameplayHooks.onOpenQuestion?.(q, enemy);
    return true;
  }

  function closeQuestion() {
    const enemy = QS.enemy;
    QS.active = false;
    QS.enemy = null;
    QS.q = null;
    QK.selectedBtn = null;
    selectedIndex = 0;
    uiHooks.onCloseQuestion?.();
    gameplayHooks.onCloseQuestion?.(enemy);
  }

  async function answerClick(answer) {
    if (!QS.active || !QS.q) {
      return false;
    }
    const q = QS.q;
    const selected = String(answer || "");
    uiHooks.disableAnswers?.();
    uiHooks.markAnswer?.({ correct: q.correct, selected });
    const correct = selected === q.correct;
    if (correct) {
      await delay(700);
      const enemy = QS.enemy;
      closeQuestion();
      gameplayHooks.defeatEnemy?.(enemy);
      return true;
    }

    recordError(q);
    uiHooks.vibrate?.(120);
    await delay(2500);
    const enemy = QS.enemy;
    closeQuestion();
    if (enemy) {
      enemy.battling = false;
    }
    gameplayHooks.hitPlayer?.();
    return false;
  }

  function handleQuestionKey(event) {
    if (!QS.active || !QS.q) {
      return false;
    }
    const buttons = uiHooks.getAnswerButtons ? uiHooks.getAnswerButtons() : [];
    if (!buttons.length) {
      return false;
    }
    const key = event.key;
    if (key === "ArrowLeft" || key === "ArrowUp") {
      selectedIndex -= 1;
      syncSelection();
      return true;
    }
    if (key === "ArrowRight" || key === "ArrowDown") {
      selectedIndex += 1;
      syncSelection();
      return true;
    }
    if (key === "Enter" || key === " ") {
      const btn = buttons[selectedIndex] || buttons[0];
      if (btn) {
        answerClick(btn.dataset.answer || "");
      }
      return true;
    }
    if (/^[1-4]$/.test(key)) {
      const idx = Number(key) - 1;
      const btn = buttons[idx];
      if (btn) {
        selectedIndex = idx;
        syncSelection();
        answerClick(btn.dataset.answer || "");
      }
      return true;
    }
    return false;
  }

  return {
    QS,
    QK,
    openQuestion,
    makeQuestion,
    answerClick,
    closeQuestion,
    recordError,
    resetErrors,
    getTopErrors,
    renderErrorList,
    randomVerbData,
    generateLevelVerbDatas,
    handleQuestionKey,
    frenchSound,
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle(items) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}
