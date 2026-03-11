const VIRTUAL_WIDTH = 432;
const VIRTUAL_HEIGHT = 768;

const GAME = {
  gravity: 1380,
  moveSpeed: 188,
  jumpVelocity: -525,
  maxFallVelocity: 810,
  friction: 0.84,
  levelCount: 5,
};
const HERO_SCALE = 1.5;
const ENEMY_SCALE = 1.5;
const DEFAULT_STARTING_HEARTS = 3;
const MAX_HEARTS = 5;
const PROFILE_STARTING_HEARTS = {
  easy: 5,
  normal: 5,
  chaotic: 3,
};
const SPRITE_FALLBACK_FOOT_OFFSET_RATIO = 0.12;
const PLAYER_RENDER_GROUND_OFFSET_PX = 0;
const PLAYER_HITBOX_WIDTH = 28;
const PLAYER_HITBOX_HEIGHT = 120;
const ENEMY_MOVE_SPEED = 52;
const ENEMY_HITBOX_WIDTH_RATIO = 0.34;
const ENEMY_HITBOX_HEIGHT_RATIO = 0.62;
const ENEMY_MIN_HITBOX_W = 28;
const ENEMY_MAX_HITBOX_W = 56;
const ENEMY_MIN_HITBOX_H = 56;
const ENEMY_MAX_HITBOX_H = 104;
const ENEMY_DEFEAT_FADE_SECONDS = 0.75;
const ENEMY_DEFEAT_RISE_PX = 10;
const BONUS_POPUP_GRAVITY = 1250;
const BONUS_POPUP_MAX_FALL_SPEED = 640;
const ENEMY_DROP_GRAVITY = 1450;
const ENEMY_DROP_MAX_FALL_SPEED = 760;
const ENEMY_DROP_SIZE_RATIO = 0.68;
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
const WORLD_SCALE = 1;
const MIN_WORLD_ZOOM = 0.1;
const MAX_WORLD_ZOOM = 3;
const PERSISTENT_CURRENCY_KEY = "cquest_gold";
const HERO_UNLOCK_STORAGE_KEY = "cquest_hero_unlocks_v1";
const HERO_SELECTED_STORAGE_KEY = "cquest_selected_hero_v1";
const WORLD_ZOOM_STORAGE_KEY = "cquest_world_zoom_v1";
const ERROR_DB_STORAGE_KEY = "cquest_conjugation_errors_v1";
const TENSE_LABEL = { pr: "Présent", im: "Imparfait", fu: "Futur simple" };
const TENSE_KEYS = Object.keys(TENSE_LABEL);
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

const BIOME_EMOJI = {
  castle: "🏰",
  desert: "🏜️",
  desolation: "💀",
  forest: "🌳",
  mountain: "⛰️",
  snow: "❄️",
  wood: "🌲",
};

const GENERATION_PROFILES = {
  easy: {
    allowGroundHoles: false,
    patternLoop: ["intro", "run", "run", "hop", "run", "stairs", "run", "intro", "run"],
    maxHoleWidth: 1,
    holeBase: 2,
    holeMin: 2,
    holeMax: 5,
    enemyBase: 3,
    enemyPerLevel: 1,
    enemyMin: 4,
    enemyMax: 8,
    doubleSpawnLaneLength: 16,
  },
  normal: {
    allowGroundHoles: true,
    patternLoop: ["intro", "run", "hop", "air", "gauntlet", "air", "stairs", "hop", "air", "run", "gauntlet"],
    maxHoleWidth: 2,
    holeBase: 5,
    holeMin: 5,
    holeMax: 10,
    enemyBase: 4,
    enemyPerLevel: 2,
    enemyMin: 5,
    enemyMax: 12,
    doubleSpawnLaneLength: 12,
  },
  chaotic: {
    allowGroundHoles: true,
    patternLoop: ["intro", "air", "gauntlet", "hop", "air", "stairs", "gauntlet", "air", "hop", "finale"],
    maxHoleWidth: 3,
    holeBase: 7,
    holeMin: 7,
    holeMax: 14,
    enemyBase: 6,
    enemyPerLevel: 2,
    enemyMin: 7,
    enemyMax: 15,
    doubleSpawnLaneLength: 10,
  },
};

function getGenerationProfileSettings(profileId) {
  return GENERATION_PROFILES[profileId] || GENERATION_PROFILES.normal;
}

function getStartingHearts(profileId) {
  return PROFILE_STARTING_HEARTS[profileId] || DEFAULT_STARTING_HEARTS;
}

const HERO_SHOP_CONFIG = {
  paladin: { price: 0, order: 0, defaultOwned: true },
  ninja: { price: 360, order: 1, defaultOwned: false },
  pirate: { price: 600, order: 2, defaultOwned: false },
  mage: { price: 1200, order: 3, defaultOwned: false },
};

const BOSS_LEVEL_VALUE = "boss";
const BOSS_TRIALS_REQUIRED = 5;
const BOSS_TRIAL_TIME_LIMIT_SECONDS = 10;
const BOSS_CELEBRATION_SECONDS = 6;
const BOSS_DEFEAT_OVERLAY_SECONDS = 2.2;
const BOSS_INTRO_MESSAGE_DELAY_SECONDS = 2.6;
const BOSS_DRAGON_ATTACK_SW_FRAMES = Array.from(
  { length: 9 },
  (_, i) => `game_assets/enemies/boss-dragon/animations/attack/south-west/frame_${String(i).padStart(3, "0")}.png`,
);
const BOSS_FALLBACK_DRAGON_FRAME = "game_assets/enemies/boss-dragon/rotations/south-west.png";
const MAGE_FIREBALL_ICON = "game_assets/decoration/deco_cauldron_fire.png";
const MAGE_FIREBALL_SPEED = 420;
const MAGE_FIREBALL_RADIUS = 16;
const NINJA_SHURIKEN_SPEED = 520;
const NINJA_SHURIKEN_RADIUS = 12;
const PIRATE_SABER_SPEED_X = 300;
const PIRATE_SABER_SPEED_Y = -260;
const PIRATE_SABER_GRAVITY = 720;
const PIRATE_SABER_RADIUS = 14;
const CHEAT_MENU_LONG_PRESS_MS = 650;


function getHeroShopConfig(heroId) {
  return HERO_SHOP_CONFIG[heroId] || { price: 9999, order: 99, defaultOwned: false };
}

function createRunSeed() {
  const randomBits = Math.floor(Math.random() * 0xffffffff);
  return (Date.now() ^ randomBits) >>> 0;
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

canvas.width = VIRTUAL_WIDTH;
canvas.height = VIRTUAL_HEIGHT;

const ui = {
  hudScoreValue: document.getElementById("hudScoreValue"),
  cheatModal: document.getElementById("cheatModal"),
  cheatLevelSelect: document.getElementById("cheatLevelSelect"),
  cheatHeroSelect: document.getElementById("cheatHeroSelect"),
  cheatGivePiecesBtn: document.getElementById("cheatGivePiecesBtn"),
  cheatApplyBtn: document.getElementById("cheatApplyBtn"),
  cheatCloseBtn: document.getElementById("cheatCloseBtn"),
  cheatWorldZoomSlider: document.getElementById("cheatWorldZoomSlider"),
  cheatWorldZoomValue: document.getElementById("cheatWorldZoomValue"),
  visualDebugPanel: document.getElementById("visualDebugPanel"),
  debugButtonsOffsetSlider: document.getElementById("debugButtonsOffsetSlider"),
  debugButtonsOffsetValue: document.getElementById("debugButtonsOffsetValue"),
  debugGameOffsetSlider: document.getElementById("debugGameOffsetSlider"),
  debugGameOffsetValue: document.getElementById("debugGameOffsetValue"),
  closeVisualDebugBtn: document.getElementById("closeVisualDebugBtn"),
  hudLives: document.getElementById("hudLives"),
  hudGoldValue: document.getElementById("hudGoldValue"),
  shopBtn: document.getElementById("shopBtn"),
  shopIcon: document.getElementById("shopIcon"),
  pauseBtn: document.getElementById("pauseBtn"),
  pauseIcon: document.getElementById("pauseIcon"),
  settingsPanel: document.getElementById("settingsPanel"),
  shopPanel: document.getElementById("shopPanel"),
  heroSelect: document.getElementById("heroSelect"),
  heroShopList: document.getElementById("heroShopList"),
  shopGoldValue: document.getElementById("shopGoldValue"),
  levelSelect: document.getElementById("levelSelect"),
  difficultySelect: document.getElementById("difficultySelect"),
  worldZoomSlider: document.getElementById("worldZoomSlider"),
  worldZoomValue: document.getElementById("worldZoomValue"),
  questionPanel: document.getElementById("questionPanel"),
  questionEnemy: document.getElementById("questionEnemy"),
  questionGroup: document.getElementById("questionGroup"),
  questionTense: document.getElementById("questionTense"),
  questionCountdown: document.getElementById("questionCountdown"),
  questionPrompt: document.getElementById("questionPrompt"),
  answerButtons: document.getElementById("answerButtons"),
  groupFilters: document.getElementById("groupFilters"),
  tenseFilters: document.getElementById("tenseFilters"),
  resetErrorsBtn: document.getElementById("resetErrorsBtn"),
  errorList: document.getElementById("errorList"),
  applySettingsBtn: document.getElementById("applySettingsBtn"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  closeShopBtn: document.getElementById("closeShopBtn"),
  moveLeftBtn: document.getElementById("moveLeftBtn"),
  moveRightBtn: document.getElementById("moveRightBtn"),
  jumpBtn: document.getElementById("jumpBtn"),
  castFireBtn: document.getElementById("castFireBtn"),
  moveLeftHitBtn: document.getElementById("moveLeftHitBtn"),
  moveRightHitBtn: document.getElementById("moveRightHitBtn"),
  jumpHitBtn: document.getElementById("jumpHitBtn"),
  castFireHitBtn: document.getElementById("castFireHitBtn"),
  btnLeft: document.getElementById("btnLeft"),
  btnRight: document.getElementById("btnRight"),
  btnUp: document.getElementById("btnUp"),
  btnFire: document.getElementById("btnFire"),
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
  bossDefeatPanel: document.getElementById("bossDefeatPanel"),
  bossDefeatText: document.getElementById("bossDefeatText"),
  bossDefeatRetryText: document.getElementById("bossDefeatRetryText"),
  finalVictoryPanel: document.getElementById("finalVictoryPanel"),
  backToTitleFromVictoryBtn: document.getElementById("backToTitleFromVictoryBtn"),
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
  tileSize: 64,
  biomes: {},
  heroes: [],
  enemies: [],
  levels: [],
  levelSeedBase: createRunSeed(),
  heroUnlocks: {},
  selectedHeroIndex: 0,
  pendingBossStart: false,
  currentLevelIndex: 0,
  currentLevel: null,
  player: null,
  cameraX: 0,
  controls: {
    left: false,
    right: false,
    jumpBuffered: false,
  },
  fireballs: [],
  runTime: 0,
  score: 0,
  coins: 0,
  persistentGold: 0,
  hearts: getStartingHearts("normal"),
  cheatLongPressTimer: null,
  visualDebugLongPressTimer: null,
  visualDebugOpen: false,
  mobileButtonsOffsetY: 155,
  mobileGameOffsetY: 0,
  generationProfile: "normal",
  worldZoom: WORLD_SCALE,
  screenMode: "game",
  pedagogy: {
    activeGroups: [],
    activeTenses: TENSE_KEYS.slice(),
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
    chestState: "locked",
    chestStreak: 0,
    chestRequired: 3,
    chestRewardPieces: 0,
    chestExplodeUntil: 0,
    chestPromptUntil: 0,
  },
  boss: {
    active: false,
    phase: "idle",
    streak: 0,
    required: BOSS_TRIALS_REQUIRED,
    trialDeadline: 0,
    trialTimeLimit: BOSS_TRIAL_TIME_LIMIT_SECONDS,
    phaseUntil: 0,
    defeatReason: "",
    sourceLevelIndex: 0,
    introUntil: 0,
    introMessageVisible: false,
  },
};

init().catch((error) => {
  console.error(error);
  updateHudInfo();
});

async function init() {
  const config = await loadConfig();
  state.config = config;
  state.tileSize = (config.grid?.tile_size || 32) * WORLD_SCALE;
  enforceMinimumJumpHeight();

  await setupUiAssets(config);
  buildBiomeIndex(config);
  state.persistentGold = loadPersistentGold();
  state.worldZoom = normalizeWorldZoom(ui.worldZoomSlider?.value || loadWorldZoom());
  syncWorldZoomUi();
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
        state.screenMode = state.boss.active ? "boss" : "game";
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
  await loadHeroes();
  initializeHeroProgress();
  await loadEnemies();

  generateLevelsFromConfig(config);
  await preloadLevelAssetImages(state.levels[0]);
  await preloadSelectedHeroSprites();
  populateSettingsPanel();
  populatePedagogyPanel();
  renderErrorList();
  bindControls();
  applyMobileVisualDebugOffsets();

  if (!state.heroes.length) {
    throw new Error("No heroes found in game_assets/heroes");
  }

  loadLevel(0, true);
  state.ready = true;
  showTitleScreen();
  scheduleBackgroundWarmup(config);
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
  ui.btnFire.src = uiAssets.button_upgrade || MAGE_FIREBALL_ICON;

  const uiPaths = [
    uiAssets.button_shop_top,
    uiAssets.button_shop_bottom,
    uiAssets.button_pause_top,
    uiAssets.button_pause_bottom,
    uiAssets.button_left,
    uiAssets.button_right,
    uiAssets.button_up,
    uiAssets.button_upgrade,
    MAGE_FIREBALL_ICON,
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
      tile_size: 64,
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

async function preloadLevelAssetImages(level) {
  if (!level) {
    return;
  }

  const paths = new Set();
  for (const row of level.tileGrid || []) {
    for (const tile of row || []) {
      if (tile?.path) {
        paths.add(tile.path);
      }
    }
  }

  for (const deco of level.decorations || []) {
    if (deco?.path) {
      paths.add(deco.path);
    }
  }

  if (level.structures?.start) {
    paths.add(level.structures.start);
  }
  if (level.structures?.end) {
    paths.add(level.structures.end);
  }
  if (level.structures?.tower) {
    paths.add(level.structures.tower);
  }

  for (const block of level.bonusBlocks || []) {
    if (block?.spritePath) {
      paths.add(block.spritePath);
    }
  }

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

async function preloadBossAssets() {
  const paths = [...BOSS_DRAGON_ATTACK_SW_FRAMES, BOSS_FALLBACK_DRAGON_FRAME];
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

  heroes.sort((a, b) => {
    const aCfg = getHeroShopConfig(a.id);
    const bCfg = getHeroShopConfig(b.id);
    if (aCfg.order !== bCfg.order) {
      return aCfg.order - bCfg.order;
    }
    return a.name.localeCompare(b.name);
  });
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
  const baseSeed = state.levelSeedBase || createRunSeed();
  state.levelSeedBase = baseSeed;
  const baseSize = config.grid?.default_level_size_tiles || { width: 128, height: 36 };
  const weightedBiomes = buildWeightedBiomeList(config.generation?.biome_selection?.weights || {});
  const bonusDensity =
    config.generation?.pipeline?.find((step) => step.step === "bonus_pass")?.params?.target_density_per_100_tiles || 8;
  const decoDensity =
    config.generation?.pipeline?.find((step) => step.step === "decoration_pass")?.params?.target_density_per_100_tiles || 12;

  for (let i = 0; i < GAME.levelCount; i += 1) {
    const seed = baseSeed + i * 101;
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
  const generation = getGenerationProfileSettings(state.generationProfile);

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
  const allowGroundHoles = generation.allowGroundHoles;
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
  const patternLoop = generation.patternLoop;
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
      if (tryCreateHole(holeStart, randInt(rand, 1, generation.maxHoleWidth)) && rand() < 0.62) {
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
      tryCreateHole(first, randInt(rand, 1, generation.maxHoleWidth));
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
        tryCreateHole(
          clamp(segStart + randInt(rand, 3, 5), segStart + 2, segEnd - 3),
          randInt(rand, 1, generation.maxHoleWidth),
        );
      }
    }
  }

  if (allowGroundHoles) {
    const targetHoleCount = clamp(
      generation.holeBase + index + Math.floor((playableEnd - playableStart) / 30),
      generation.holeMin,
      generation.holeMax,
    );
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
      maxHoleWidth: generation.maxHoleWidth,
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
    generation,
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
  const count = clamp(Math.round((tileGrid[0].length * bonusDensity) / 175) + Math.floor((levelIndex || 0) * 0.4), 3, 9);
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
    allDecor.find((d) => d.id === "deco_potion") || { id: "deco_potion", path: "game_assets/decoration/deco_potion.png", spawn_weight: 1.6 };
  const coinDef =
    allBonus.find((b) => b.id === "bonus_coin") ||
    { id: "bonus_coin", path: "game_assets/bonus/bonus_coin.png", spawn_weight: 0.95 };
  const axeDef =
    allDecor.find((d) => d.id === "deco_double_axe") ||
    { id: "deco_double_axe", path: "game_assets/decoration/deco_double_axe.png", spawn_weight: 0.18 };
  const royalShieldDef =
    allDecor.find((d) => d.id === "deco_royal_shield") ||
    { id: "deco_royal_shield", path: "game_assets/decoration/deco_royal_shield.png", spawn_weight: 0.08 };
  rewardDefs.push(potionDef, coinDef, axeDef, royalShieldDef);

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

function buildEnemySpawns({ biomeId, rand, pathNodes, levelIndex, tileGrid, groundY, lanes, generation }) {
  const profile = generation || GENERATION_PROFILES.normal;
  const pool = state.enemies.filter((enemy) => enemy.biomeHint === biomeId);
  const candidates = pool.length ? pool : state.enemies;
  const count = clamp(
    profile.enemyBase + levelIndex * profile.enemyPerLevel,
    profile.enemyMin,
    profile.enemyMax,
  );
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
    const spawnCount = laneLen >= profile.doubleSpawnLaneLength ? 2 : 1;
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
          questionAttempts: 0,
          verbData: null,
        });
        break;
      }
    }
  }

  if (enemies.length < profile.enemyMin && pathNodes?.length) {
    for (const node of pathNodes) {
      if (enemies.length >= profile.enemyMin) {
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
        questionAttempts: 0,
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

function renderHeroShop() {
  if (ui.shopGoldValue) {
    ui.shopGoldValue.textContent = `${Math.floor(state.persistentGold || 0)} pièces`;
  }
  if (!ui.heroShopList) {
    return;
  }

  const selectedHero = state.heroes[state.selectedHeroIndex];
  const selectedHeroId = selectedHero?.id || "";
  ui.heroShopList.innerHTML = state.heroes
    .map((hero) => {
      const cfg = getHeroShopConfig(hero.id);
      const owned = isHeroOwned(hero.id);
      const equipped = owned && hero.id === selectedHeroId;
      const canBuy = !owned && state.persistentGold >= cfg.price;
      const actionLabel = equipped ? "Équipé" : owned ? "Équiper" : "Acheter";
      const actionClass = owned ? "hero-shop-btn" : "hero-shop-btn buy";
      const disabled = !owned && !canBuy ? "disabled" : "";
      const lockStateClass = owned ? "owned" : "locked";
      const priceLabel = owned
        ? "Déjà débloquée"
        : `Prix : <span class="amount">${cfg.price} pièces</span>`;
      return `<div class="hero-shop-item ${lockStateClass}">
        <div class="hero-shop-preview">
          <img src="${hero.sprite.idleSE}" alt="${hero.name}" loading="lazy" />
          ${owned ? "" : '<span class="hero-shop-lock" aria-hidden="true">🔒</span>'}
        </div>
        <div class="hero-shop-meta">
          <div class="hero-shop-name">${hero.name}</div>
          <div class="hero-shop-price">${priceLabel}</div>
        </div>
        <button type="button" class="${actionClass}" data-hero-id="${hero.id}" data-action="${owned ? "equip" : "buy"}" ${disabled}>${actionLabel}</button>
      </div>`;
    })
    .join("");
}

function formatZoomLabel(zoom) {
  return `${Number(zoom).toFixed(1)}x`;
}

function getWorldZoom(value = state.worldZoom) {
  return clamp(Number(value) || WORLD_SCALE, MIN_WORLD_ZOOM, MAX_WORLD_ZOOM);
}

function syncCameraToCurrentZoom() {
  if (!state.currentLevel || !state.player) {
    return;
  }
  const zoom = getWorldZoom();
  const visibleWorldWidth = VIRTUAL_WIDTH / zoom;
  const desired = state.player.x - visibleWorldWidth * 0.35;
  const maxX = Math.max(0, state.currentLevel.worldWidth - visibleWorldWidth);
  state.cameraX = clamp(desired, 0, maxX);
}

function setWorldZoom(nextZoom, { syncUi = true } = {}) {
  const clampedZoom = getWorldZoom(nextZoom);
  if (Math.abs(clampedZoom - state.worldZoom) < 0.0001) {
    if (syncUi) {
      syncWorldZoomUi();
    }
    return;
  }
  state.worldZoom = clampedZoom;
  saveWorldZoom(state.worldZoom);
  syncCameraToCurrentZoom();
  if (syncUi) {
    syncWorldZoomUi();
  }
}

function syncWorldZoomUi() {
  if (ui.worldZoomSlider) {
    ui.worldZoomSlider.value = String(state.worldZoom);
  }
  if (ui.worldZoomValue) {
    ui.worldZoomValue.textContent = formatZoomLabel(state.worldZoom);
  }
  if (ui.cheatWorldZoomSlider) {
    ui.cheatWorldZoomSlider.value = String(state.worldZoom);
  }
  if (ui.cheatWorldZoomValue) {
    ui.cheatWorldZoomValue.textContent = formatZoomLabel(state.worldZoom);
  }
}

function populateSettingsPanel() {
  ui.heroSelect.innerHTML = "";
  state.heroes.forEach((hero, index) => {
    if (!isHeroOwned(hero.id)) {
      return;
    }
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
  const bossOption = document.createElement("option");
  bossOption.value = BOSS_LEVEL_VALUE;
  bossOption.textContent = "Boss - Dragon";
  ui.levelSelect.appendChild(bossOption);

  ensureSelectedHeroIsOwned();
  ui.heroSelect.value = String(state.selectedHeroIndex);
  ui.levelSelect.value = state.pendingBossStart ? BOSS_LEVEL_VALUE : String(state.currentLevelIndex);
  if (ui.difficultySelect) {
    ui.difficultySelect.value = state.generationProfile;
  }
  syncWorldZoomUi();
  renderHeroShop();
  renderErrorList();
  syncHeroActionButtonVisibility();
}


function normalizeWorldZoom(value) {
  return getWorldZoom(value);
}

function loadWorldZoom() {
  try {
    return normalizeWorldZoom(Number(localStorage.getItem(WORLD_ZOOM_STORAGE_KEY) || WORLD_SCALE));
  } catch {
    return WORLD_SCALE;
  }
}

function saveWorldZoom(value) {
  try {
    localStorage.setItem(WORLD_ZOOM_STORAGE_KEY, String(normalizeWorldZoom(value)));
  } catch {
    // Ignore storage issues.
  }
}

function applyWorldZoom(value) {
  setWorldZoom(value);
}

function populateCheatModalOptions() {
  if (!ui.cheatLevelSelect || !ui.cheatHeroSelect) {
    return;
  }
  ui.cheatLevelSelect.innerHTML = "";
  state.levels.forEach((level, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `Niveau ${level.id || index + 1} - ${capitalize(level.biomeId)}`;
    ui.cheatLevelSelect.appendChild(option);
  });

  ui.cheatHeroSelect.innerHTML = "";
  state.heroes.forEach((hero, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = hero.name;
    ui.cheatHeroSelect.appendChild(option);
  });

  ui.cheatLevelSelect.value = String(state.currentLevelIndex);
  ui.cheatHeroSelect.value = String(state.selectedHeroIndex);
  applyWorldZoom(state.worldZoom);
}

function openCheatModal() {
  if (!state.ready || !ui.cheatModal) {
    return;
  }
  populateCheatModalOptions();
  ui.settingsPanel.hidden = true;
  ui.shopPanel.hidden = true;
  ui.pauseModal?.classList.add("hidden");
  ui.cheatModal.classList.remove("hidden");
  state.paused = true;
}

function closeCheatModal() {
  if (!ui.cheatModal) {
    return;
  }
  ui.cheatModal.classList.add("hidden");
  cancelCheatMenuLongPress();
  if (!state.started) {
    state.paused = false;
    return;
  }
  state.paused = isPauseModalOpen() || !ui.settingsPanel.hidden || !ui.shopPanel.hidden;
}

function cancelCheatMenuLongPress() {
  if (state.cheatLongPressTimer) {
    clearTimeout(state.cheatLongPressTimer);
    state.cheatLongPressTimer = null;
  }
}

function beginCheatMenuLongPress() {
  if (!state.ready || !ui.hudLives || state.cheatLongPressTimer) {
    return;
  }
  state.cheatLongPressTimer = setTimeout(() => {
    state.cheatLongPressTimer = null;
    openCheatModal();
  }, CHEAT_MENU_LONG_PRESS_MS);
}

function endCheatMenuLongPress() {
  cancelCheatMenuLongPress();
}

function applyMobileVisualDebugOffsets() {
  const buttonsOffset = clamp(Number(state.mobileButtonsOffsetY) || 0, 0, 180);
  const gameOffset = clamp(Number(state.mobileGameOffsetY) || 0, -200, 200);
  const mobileViewport = isMobileViewport();
  state.mobileButtonsOffsetY = buttonsOffset;
  state.mobileGameOffsetY = gameOffset;
  document.body.style.setProperty("--mobile-controls-offset", `${mobileViewport ? buttonsOffset : 0}px`);
  document.body.style.setProperty("--mobile-game-offset", `${mobileViewport ? gameOffset : 0}px`);
  document.body.classList.toggle("mobile-debug-adjust", mobileViewport && gameOffset !== 0);
  if (ui.debugButtonsOffsetSlider) {
    ui.debugButtonsOffsetSlider.value = String(buttonsOffset);
  }
  if (ui.debugButtonsOffsetValue) {
    ui.debugButtonsOffsetValue.textContent = `${buttonsOffset}px`;
  }
  if (ui.debugGameOffsetSlider) {
    ui.debugGameOffsetSlider.value = String(gameOffset);
  }
  if (ui.debugGameOffsetValue) {
    ui.debugGameOffsetValue.textContent = `${gameOffset}px`;
  }
}

function openVisualDebugPanel() {
  if (!ui.visualDebugPanel) {
    return;
  }
  applyMobileVisualDebugOffsets();
  ui.visualDebugPanel.classList.remove("hidden");
  state.visualDebugOpen = true;
}

function closeVisualDebugPanel() {
  if (!ui.visualDebugPanel) {
    return;
  }
  ui.visualDebugPanel.classList.add("hidden");
  state.visualDebugOpen = false;
}

function cancelVisualDebugLongPress() {
  if (state.visualDebugLongPressTimer) {
    clearTimeout(state.visualDebugLongPressTimer);
    state.visualDebugLongPressTimer = null;
  }
}

function beginVisualDebugLongPress() {
  if (!state.ready || !ui.hudScoreValue || state.visualDebugLongPressTimer) {
    return;
  }
  state.visualDebugLongPressTimer = setTimeout(() => {
    state.visualDebugLongPressTimer = null;
    openVisualDebugPanel();
  }, CHEAT_MENU_LONG_PRESS_MS);
}

function endVisualDebugLongPress() {
  cancelVisualDebugLongPress();
}

function applyCheatSelections() {
  const nextLevel = clamp(Number(ui.cheatLevelSelect?.value || state.currentLevelIndex), 0, state.levels.length - 1);
  const heroIndex = clamp(Number(ui.cheatHeroSelect?.value || state.selectedHeroIndex), 0, state.heroes.length - 1);
  const hero = state.heroes[heroIndex];
  if (hero) {
    state.heroUnlocks[hero.id] = true;
    state.selectedHeroIndex = heroIndex;
    saveHeroUnlocks(state.heroUnlocks);
    saveSelectedHeroId(hero.id);
  }
  closeCheatModal();
  if (state.started) {
    loadLevel(nextLevel, true);
  } else {
    state.currentLevelIndex = nextLevel;
    populateSettingsPanel();
    updateHudInfo();
  }
}

function bindControls() {
  const setHeldState = (buttons, key, isDown) => {
    if (state.duel?.QS.active || !state.started || state.paused || state.gameOver || state.deathSequence.active) {
      return;
    }
    state.controls[key] = isDown;
    buttons.forEach((button) => button.classList.toggle("active", isDown));
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

  const leftButtons = [ui.moveLeftBtn, ui.moveLeftHitBtn].filter(Boolean);
  const rightButtons = [ui.moveRightBtn, ui.moveRightHitBtn].filter(Boolean);
  const jumpButtons = [ui.jumpBtn, ui.jumpHitBtn].filter(Boolean);
  const fireButtons = [ui.castFireBtn, ui.castFireHitBtn].filter(Boolean);

  leftButtons.forEach((button) => attachHoldButton(button, (down) => setHeldState(leftButtons, "left", down)));
  rightButtons.forEach((button) => attachHoldButton(button, (down) => setHeldState(rightButtons, "right", down)));
  jumpButtons.forEach((button) =>
    attachTapButton(button, () => {
      if (state.duel?.QS.active || !state.started || state.paused || state.gameOver || state.deathSequence.active) {
        return;
      }
      state.controls.jumpBuffered = true;
      jumpButtons.forEach((jumpButton) => jumpButton.classList.add("active"));
      setTimeout(() => jumpButtons.forEach((jumpButton) => jumpButton.classList.remove("active")), 90);
    }),
  );

  fireButtons.forEach((button) =>
    attachTapButton(button, () => {
      if (state.duel?.QS.active || !state.started || state.paused || state.gameOver || state.deathSequence.active) {
        return;
      }
      castHeroProjectile();
      fireButtons.forEach((fireButton) => fireButton.classList.add("active"));
      setTimeout(() => fireButtons.forEach((fireButton) => fireButton.classList.remove("active")), 90);
    }),
  );

  ui.shopBtn?.addEventListener("click", () => {
    if (!state.ready) {
      return;
    }
    if (state.duel?.QS.active) {
      return;
    }
    openShopPanel();
  });

  ui.hudLives?.addEventListener("pointerdown", beginCheatMenuLongPress);
  ui.hudLives?.addEventListener("pointerup", endCheatMenuLongPress);
  ui.hudLives?.addEventListener("pointerleave", endCheatMenuLongPress);
  ui.hudLives?.addEventListener("pointercancel", endCheatMenuLongPress);

  ui.hudScoreValue?.addEventListener("pointerdown", beginVisualDebugLongPress);
  ui.hudScoreValue?.addEventListener("pointerup", endVisualDebugLongPress);
  ui.hudScoreValue?.addEventListener("pointerleave", endVisualDebugLongPress);
  ui.hudScoreValue?.addEventListener("pointercancel", endVisualDebugLongPress);

  ui.debugButtonsOffsetSlider?.addEventListener("input", () => {
    state.mobileButtonsOffsetY = clamp(Number(ui.debugButtonsOffsetSlider.value) || 0, 0, 180);
    applyMobileVisualDebugOffsets();
  });
  ui.debugGameOffsetSlider?.addEventListener("input", () => {
    state.mobileGameOffsetY = clamp(Number(ui.debugGameOffsetSlider.value) || 0, -200, 200);
    applyMobileVisualDebugOffsets();
  });
  ui.closeVisualDebugBtn?.addEventListener("click", closeVisualDebugPanel);

  ui.cheatCloseBtn?.addEventListener("click", closeCheatModal);
  ui.cheatGivePiecesBtn?.addEventListener("click", () => {
    grantGold(999);
    updateHudInfo();
  });
  ui.cheatApplyBtn?.addEventListener("click", applyCheatSelections);

  ui.heroSelect?.addEventListener("change", () => {
    const requestedHeroIndex = clamp(Number(ui.heroSelect.value) || getPaladinIndex(), 0, state.heroes.length - 1);
    const requestedHero = state.heroes[requestedHeroIndex];
    if (!requestedHero || !isHeroOwned(requestedHero.id)) {
      ensureSelectedHeroIsOwned();
      ui.heroSelect.value = String(state.selectedHeroIndex);
      return;
    }
    state.selectedHeroIndex = requestedHeroIndex;
    saveSelectedHeroId(requestedHero.id);
    renderHeroShop();
    syncHeroActionButtonVisibility();
  });

  ui.heroShopList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest("button[data-hero-id][data-action]");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const heroId = button.dataset.heroId || "";
    const action = button.dataset.action || "";
    const heroIndex = state.heroes.findIndex((hero) => hero.id === heroId);
    if (heroIndex < 0) {
      return;
    }
    const cfg = getHeroShopConfig(heroId);

    if (action === "buy") {
      if (isHeroOwned(heroId)) {
        return;
      }
      if (!spendPersistentGold(cfg.price)) {
        showMessage("Pas assez de pièces");
        renderHeroShop();
        return;
      }
      state.heroUnlocks[heroId] = true;
      saveHeroUnlocks(state.heroUnlocks);
      state.selectedHeroIndex = heroIndex;
      saveSelectedHeroId(heroId);
      showMessage(`${state.heroes[heroIndex].name} débloquée`);
      populateSettingsPanel();
      syncHeroActionButtonVisibility();
      return;
    }

    if (action === "equip" && isHeroOwned(heroId)) {
      state.selectedHeroIndex = heroIndex;
      saveSelectedHeroId(heroId);
      populateSettingsPanel();
      syncHeroActionButtonVisibility();
    }
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
  ui.closeShopBtn?.addEventListener("click", closeShopPanel);

  ui.worldZoomSlider?.addEventListener("input", () => {
    setWorldZoom(ui.worldZoomSlider.value);
  });
  ui.cheatWorldZoomSlider?.addEventListener("input", () => {
    setWorldZoom(ui.cheatWorldZoomSlider.value);
  });

  ui.applySettingsBtn.addEventListener("click", () => {
    const wasStarted = state.started;
    const requestedProfile = ui.difficultySelect ? ui.difficultySelect.value : state.generationProfile;
    const requestedLevelValue = String(ui.levelSelect.value || "0");
    const wantsBoss = requestedLevelValue === BOSS_LEVEL_VALUE;
    const levelIndex = clamp(Number(requestedLevelValue) || 0, 0, state.levels.length - 1);
    state.generationProfile = requestedProfile;
    generateLevelsFromConfig(state.config);
    populateSettingsPanel();
    syncHeroActionButtonVisibility();
    state.pendingBossStart = wantsBoss;
    closeSettingsPanel();
    if (wantsBoss) {
      if (wasStarted) {
        closePauseMenu();
        state.paused = false;
        startBossMode({ sourceLevelIndex: getBossPrepLevelIndex() });
        return;
      }
      showTitleScreen();
      return;
    }
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
  ui.backToTitleFromVictoryBtn?.addEventListener("click", returnToTitleScreen);

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
        if (titleVisible && ui.settingsPanel.hidden && ui.shopPanel.hidden && (event.code === "Enter" || event.code === "Space")) {
          event.preventDefault();
          startGameFromMenu();
          return;
        }
        if (key === "escape" && (!ui.settingsPanel.hidden || !ui.shopPanel.hidden || (ui.cheatModal && !ui.cheatModal.classList.contains("hidden")))) {
          event.preventDefault();
          closeOverlayPanels();
        }
        return;
      }
      if (key === "escape") {
        event.preventDefault();
        if (!ui.settingsPanel.hidden || !ui.shopPanel.hidden) {
          closeOverlayPanels();
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
      if (event.code === "ArrowDown") {
        event.preventDefault();
        castHeroProjectile();
        ui.castFireBtn?.classList.add("active");
        setTimeout(() => ui.castFireBtn?.classList.remove("active"), 90);
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
    ui.castFireBtn?.classList.remove("active");
    ui.moveLeftHitBtn?.classList.remove("active");
    ui.moveRightHitBtn?.classList.remove("active");
    ui.jumpHitBtn?.classList.remove("active");
    ui.castFireHitBtn?.classList.remove("active");
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
  ui.castFireBtn?.classList.remove("active");
  ui.moveLeftHitBtn?.classList.remove("active");
  ui.moveRightHitBtn?.classList.remove("active");
  ui.jumpHitBtn?.classList.remove("active");
  ui.castFireHitBtn?.classList.remove("active");
}

function isPauseModalOpen() {
  return Boolean(ui.pauseModal && !ui.pauseModal.classList.contains("hidden"));
}

function openShopPanel() {
  if (!state.ready || !ui.shopPanel) {
    return;
  }
  ensureSelectedHeroIsOwned();
  ui.heroSelect.value = String(state.selectedHeroIndex);
  if (ui.heroSelect.selectedIndex < 0) {
    state.selectedHeroIndex = getPaladinIndex();
    ui.heroSelect.value = String(state.selectedHeroIndex);
  }
  renderHeroShop();
  ui.settingsPanel.hidden = true;
  ui.cheatModal?.classList.add("hidden");
  ui.shopPanel.hidden = false;
  state.paused = true;
}

function closeShopPanel() {
  if (!ui.shopPanel) {
    return;
  }
  ui.shopPanel.hidden = true;
  if (!state.started) {
    state.paused = false;
    return;
  }
  state.paused = isPauseModalOpen() || !ui.settingsPanel.hidden || (ui.cheatModal && !ui.cheatModal.classList.contains("hidden"));
}

function openSettingsPanel() {
  if (!state.ready || !ui.settingsPanel) {
    return;
  }
  ui.levelSelect.value = state.pendingBossStart ? BOSS_LEVEL_VALUE : String(state.currentLevelIndex);
  if (ui.difficultySelect) {
    ui.difficultySelect.value = state.generationProfile;
  }
  syncWorldZoomUi();
  ui.shopPanel.hidden = true;
  ui.cheatModal?.classList.add("hidden");
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
  state.paused = isPauseModalOpen() || !ui.shopPanel.hidden || (ui.cheatModal && !ui.cheatModal.classList.contains("hidden"));
}

function closeOverlayPanels() {
  closeSettingsPanel();
  closeShopPanel();
  closeCheatModal();
}

function openPauseMenu() {
  if (!state.started || state.gameOver || state.deathSequence.active || !ui.pauseModal) {
    return;
  }
  resetMovementInputs();
  ui.settingsPanel.hidden = true;
  ui.shopPanel.hidden = true;
  ui.cheatModal?.classList.add("hidden");
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
  state.paused = !ui.settingsPanel.hidden || !ui.shopPanel.hidden || (ui.cheatModal && !ui.cheatModal.classList.contains("hidden"));
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
  resetBossState();
  ensureSelectedHeroIsOwned();
  state.levelSeedBase = createRunSeed();
  generateLevelsFromConfig(state.config);
  ui.titleScreen?.classList.add("hidden");
  ui.gameOverPanel?.classList.add("hidden");
  ui.pauseModal?.classList.add("hidden");
  ui.settingsPanel.hidden = true;
  ui.shopPanel.hidden = true;
  ui.cheatModal?.classList.add("hidden");
  if (state.pendingBossStart) {
    startBossMode({ sourceLevelIndex: getBossPrepLevelIndex() });
    return;
  }
  loadLevel(state.currentLevelIndex, true);
}

function showTitleScreen() {
  state.started = false;
  state.paused = false;
  state.gameOver = false;
  state.deathSequence.active = false;
  state.screenMode = "game";
  state.towerInterior.active = false;
  resetBossState();
  if (state.duel?.QS.active) {
    state.duel.closeQuestion();
  }
  resetMovementInputs();
  ui.settingsPanel.hidden = true;
  ui.shopPanel.hidden = true;
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
  resetBossState();
  ui.settingsPanel.hidden = true;
  ui.shopPanel.hidden = true;
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

function resetBossState() {
  state.boss.active = false;
  state.boss.phase = "idle";
  state.boss.streak = 0;
  state.boss.trialDeadline = 0;
  state.boss.phaseUntil = 0;
  state.boss.defeatReason = "";
  state.boss.introUntil = 0;
  state.boss.introMessageVisible = false;
  ui.bossDefeatPanel?.classList.add("hidden");
  ui.finalVictoryPanel?.classList.add("hidden");
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
  state.pendingBossStart = false;
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
  resetBossState();
  state.towerInterior.chestState = "locked";
  state.towerInterior.chestStreak = 0;
  state.towerInterior.chestRequired = 3;
  state.towerInterior.chestRewardPieces = 0;
  state.towerInterior.chestExplodeUntil = 0;
  state.towerInterior.chestPromptUntil = 0;
  state.fireballs = [];
  ui.gameOverPanel?.classList.add("hidden");

  ensureSelectedHeroIsOwned();
  syncHeroActionButtonVisibility();
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
    state.hearts = getStartingHearts(state.generationProfile);
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
    enemyDrops: [],
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

  if (state.boss.active) {
    updateBossMode();
    updateBossQuestionCountdown();
    if (state.message && performance.now() > state.messageUntil) {
      state.message = "";
    }
    return;
  }

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
  updateFireballs(delta);
  updateBonusBlocks(delta);
  updateEnemyDrops(delta);
  updateCamera();

  if (state.message && performance.now() > state.messageUntil) {
    state.message = "";
  }
}


function updateBossQuestionCountdown() {
  if (!ui.questionCountdown) {
    return;
  }
  if (!state.boss.active || !state.duel?.QS.active || state.boss.phase !== "trials") {
    ui.questionCountdown.hidden = true;
    return;
  }
  const secondsLeft = Math.max(0, Math.ceil((state.boss.trialDeadline - performance.now()) / 1000));
  ui.questionCountdown.hidden = false;
  ui.questionCountdown.textContent = `⏳ ${secondsLeft}s`;
  ui.questionCountdown.style.color = secondsLeft <= 3 ? "#ff8e42" : "#ffd56a";
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

function getSelectedHeroId() {
  const hero = state.heroes[state.selectedHeroIndex];
  return hero?.id || "";
}

function castHeroProjectile() {
  if (!state.currentLevel || !state.player || state.towerInterior.active || state.boss.active) {
    return false;
  }
  const heroId = getSelectedHeroId();
  if (heroId !== "mage" && heroId !== "ninja" && heroId !== "pirate") {
    return false;
  }

  const player = state.player;
  const forwardSign = player.facing === "south-west" ? -1 : 1;
  const originX = player.x + player.w * 0.5;
  const centerOriginY = player.y + player.h * 0.5;
  const castOriginY = player.y + player.h * 0.43;

  if (heroId === "ninja") {
    state.fireballs.push({
      x: originX,
      y: centerOriginY,
      vx: forwardSign * NINJA_SHURIKEN_SPEED,
      vy: 0,
      gravity: 0,
      life: 0.9,
      radius: NINJA_SHURIKEN_RADIUS,
      kind: "shuriken",
      spin: Math.random() * Math.PI * 2,
      spinSpeed: 16,
    });
    return true;
  }

  if (heroId === "pirate") {
    state.fireballs.push({
      x: originX,
      y: castOriginY,
      vx: forwardSign * PIRATE_SABER_SPEED_X,
      vy: PIRATE_SABER_SPEED_Y,
      gravity: PIRATE_SABER_GRAVITY,
      life: 1.35,
      radius: PIRATE_SABER_RADIUS,
      kind: "saber",
      rotation: forwardSign > 0 ? 0.35 : -0.35,
    });
    return true;
  }

  const target = findClosestEnemyAhead(originX, forwardSign);
  if (!target) {
    return false;
  }
  const targetX = target.x + target.w * 0.5;
  const targetY = target.y + target.h * 0.5;
  const dx = targetX - originX;
  const dy = targetY - castOriginY;
  const distance = Math.hypot(dx, dy) || 1;
  state.fireballs.push({
    x: originX,
    y: castOriginY,
    vx: (dx / distance) * MAGE_FIREBALL_SPEED,
    vy: (dy / distance) * MAGE_FIREBALL_SPEED,
    gravity: 0,
    life: Math.max(0.45, distance / MAGE_FIREBALL_SPEED + 0.15),
    radius: MAGE_FIREBALL_RADIUS,
    kind: "fireball",
  });
  return true;
}

function findClosestEnemyAhead(originX, forwardSign) {
  const level = state.currentLevel;
  if (!level) {
    return null;
  }
  let best = null;
  let bestDistance = Infinity;
  for (const enemy of level.enemySpawns) {
    if (!enemy?.alive || enemy.battling || enemy.defeatFadeActive) {
      continue;
    }
    const centerX = enemy.x + enemy.w * 0.5;
    const distanceForward = (centerX - originX) * forwardSign;
    if (distanceForward <= 0) {
      continue;
    }
    if (distanceForward < bestDistance) {
      best = enemy;
      bestDistance = distanceForward;
    }
  }
  return best;
}

function updateFireballs(delta) {
  if (!state.fireballs.length || !state.currentLevel || state.duel?.QS.active || state.paused || state.gameOver || state.deathSequence.active) {
    return;
  }
  const level = state.currentLevel;
  for (let i = state.fireballs.length - 1; i >= 0; i -= 1) {
    const fireball = state.fireballs[i];
    fireball.life -= delta;
    fireball.vy += (fireball.gravity || 0) * delta;
    fireball.x += fireball.vx * delta;
    fireball.y += fireball.vy * delta;
    if (
      fireball.life <= 0 ||
      fireball.x < -32 ||
      fireball.x > level.worldWidth + 32 ||
      fireball.y < -32 ||
      fireball.y > level.worldHeight + 32
    ) {
      state.fireballs.splice(i, 1);
      continue;
    }

    let hitEnemy = null;
    for (const enemy of level.enemySpawns) {
      if (!enemy?.alive || enemy.battling || enemy.defeatFadeActive) {
        continue;
      }
      if (circleIntersectsRect(fireball.x, fireball.y, fireball.radius, enemy)) {
        hitEnemy = enemy;
        break;
      }
    }
    if (hitEnemy) {
      state.fireballs.splice(i, 1);
      openQuestion(hitEnemy);
    }
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
  player.y = getTowerInteriorFloorY() - player.h;
  player.vy = 0;
  player.onGround = true;
  player.animTime += delta;

  if (
    state.towerInterior.chestState === "locked" &&
    !state.duel?.QS.active &&
    performance.now() >= state.towerInterior.chestPromptUntil
  ) {
    const chest = getTowerInteriorChestBounds();
    if (aabb(player, chest)) {
      player.vx = 0;
      openTowerChestAttempt();
    }
  }

  if (player.x <= -player.w * 0.35) {
    leaveTowerInterior("left");
  } else if (player.x >= VIRTUAL_WIDTH - player.w * 0.65) {
    leaveTowerInterior("right");
  }
}

function getBossDragonFrame(timeSeconds) {
  const frames = BOSS_DRAGON_ATTACK_SW_FRAMES.map((path) => imageCache.get(path)).filter(isImageRenderable);
  if (frames.length) {
    const index = Math.floor(timeSeconds * 10) % frames.length;
    return frames[index];
  }
  const fallback = imageCache.get(BOSS_FALLBACK_DRAGON_FRAME);
  return isImageRenderable(fallback) ? fallback : null;
}

function getBossPrepLevelIndex() {
  return Math.max(0, state.levels.length - 1);
}

function updateBossRetryText(levelIndex) {
  if (!ui.bossDefeatRetryText) {
    return;
  }
  const wave = clamp(levelIndex + 1, 1, 999);
  ui.bossDefeatRetryText.textContent = `Returning to wave ${wave}...`;
}

function startBossTrial() {
  if (!state.boss.active || (state.boss.phase !== "trials" && state.boss.phase !== "intro") || state.duel?.QS.active) {
    return;
  }
  state.boss.trialDeadline = performance.now() + state.boss.trialTimeLimit * 1000;
  const opened = state.duel?.openStandaloneQuestion({
    vd: state.duel.randomVerbData(),
    uiMeta: {
      enemyEmoji: "🐉",
      groupLabel: `Dragon Trial ${state.boss.streak}/${state.boss.required}`,
      tenseLabel: "10 seconds",
    },
    onCorrect: () => {
      if (!state.boss.active || state.boss.phase !== "trials") {
        return;
      }
      state.boss.streak += 1;
      if (state.boss.streak >= state.boss.required) {
        state.boss.phase = "celebration";
        state.boss.phaseUntil = performance.now() + BOSS_CELEBRATION_SECONDS * 1000;
        showMessage("Dragon defeated!");
        return;
      }
      startBossTrial();
    },
    onWrong: () => {
      if (!state.boss.active || state.boss.phase !== "trials") {
        return;
      }
      failBossTrial("Wrong answer");
    },
  });
  if (!opened) {
    state.boss.phase = "defeat";
    state.boss.defeatReason = "Trial setup failed";
    state.boss.phaseUntil = performance.now() + BOSS_DEFEAT_OVERLAY_SECONDS * 1000;
  }
}

function startBossMode({ sourceLevelIndex = getBossPrepLevelIndex() } = {}) {
  if (!state.ready) {
    return;
  }
  if (state.duel?.QS.active) {
    state.duel.closeQuestion();
  }
  state.towerInterior.active = false;
  state.deathSequence.active = false;
  state.started = true;
  state.paused = false;
  state.gameOver = false;
  state.screenMode = "boss";
  state.pendingBossStart = true;
  state.boss.active = true;
  state.boss.phase = "intro";
  state.boss.streak = 0;
  state.boss.trialDeadline = 0;
  state.boss.phaseUntil = 0;
  state.boss.defeatReason = "";
  state.boss.introUntil = performance.now() + BOSS_INTRO_MESSAGE_DELAY_SECONDS * 1000;
  state.boss.introMessageVisible = false;
  state.boss.sourceLevelIndex = clamp(sourceLevelIndex, 0, Math.max(0, state.levels.length - 1));
  updateBossRetryText(state.boss.sourceLevelIndex);
  ui.titleScreen?.classList.add("hidden");
  ui.pauseModal?.classList.add("hidden");
  ui.gameOverPanel?.classList.add("hidden");
  ui.bossDefeatPanel?.classList.add("hidden");
  ui.finalVictoryPanel?.classList.add("hidden");
  state.message = "";
}

function failBossTrial(reason) {
  if (!state.boss.active || state.boss.phase !== "trials") {
    return;
  }
  if (state.duel?.QS.active) {
    state.duel.closeQuestion();
  }
  state.boss.phase = "defeat";
  state.boss.defeatReason = reason || "Trial failed";
  state.boss.streak = 0;
  state.boss.phaseUntil = performance.now() + BOSS_DEFEAT_OVERLAY_SECONDS * 1000;
  if (ui.bossDefeatText) {
    ui.bossDefeatText.textContent = state.boss.defeatReason;
  }
  ui.bossDefeatPanel?.classList.remove("hidden");
}

function showFinalVictoryScreen() {
  state.boss.active = false;
  state.boss.phase = "victory";
  state.pendingBossStart = false;
  state.started = false;
  state.paused = true;
  state.screenMode = "game";
  ui.finalVictoryPanel?.classList.remove("hidden");
  ui.bossDefeatPanel?.classList.add("hidden");
  ui.pauseModal?.classList.add("hidden");
  ui.gameOverPanel?.classList.add("hidden");
}

function updateBossMode() {
  if (!state.boss.active) {
    return;
  }
  const now = performance.now();
  if (state.boss.phase === "intro") {
    if (!state.boss.introMessageVisible && now >= state.boss.introUntil) {
      state.boss.introMessageVisible = true;
      state.boss.phaseUntil = now + 2600;
      return;
    }
    if (state.boss.introMessageVisible && now >= state.boss.phaseUntil) {
      state.boss.phase = "trials";
      state.boss.introMessageVisible = false;
      startBossTrial();
    }
    return;
  }

  if (state.boss.phase === "trials") {
    if (state.duel?.QS.active && !state.duel?.QS.resolving && now >= state.boss.trialDeadline) {
      failBossTrial("Time up");
      return;
    }
    if (!state.duel?.QS.active && state.boss.streak < state.boss.required) {
      startBossTrial();
    }
    return;
  }

  if (state.boss.phase === "defeat" && now >= state.boss.phaseUntil) {
    ui.bossDefeatPanel?.classList.add("hidden");
    const retryIndex = clamp(state.boss.sourceLevelIndex, 0, Math.max(0, state.levels.length - 1));
    loadLevel(retryIndex, false);
    showMessage(`Back to wave ${retryIndex + 1}`);
    return;
  }

  if (state.boss.phase === "celebration" && now >= state.boss.phaseUntil) {
    showFinalVictoryScreen();
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
    rects.push(getBonusBlockCollisionRect(block));
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
  const insets = getTileCollisionInsets(tile);

  if (!insets) {
    return { x, y, w: tileSize, h: tileSize };
  }

  const leftInset = clamp((insets.left || 0) * tileSize, 0, tileSize / 2 - 1);
  const rightInset = clamp((insets.right || 0) * tileSize, 0, tileSize / 2 - 1);
  const topInset = clamp(insets.top * tileSize, 0, tileSize - 2);
  const bottomInset = clamp((insets.bottom || 0) * tileSize, 0, tileSize - 2);
  const usableHeight = Math.max(2, tileSize - topInset - bottomInset);
  const usableWidth = Math.max(2, tileSize - leftInset - rightInset);

  return {
    x: x + leftInset,
    y: y + topInset,
    w: usableWidth,
    h: usableHeight,
  };
}

function getBonusBlockCollisionRect(block) {
  const insets = getBonusCollisionInsets(block);
  const leftInset = clamp((insets.left || 0) * block.w, 0, block.w / 2 - 1);
  const rightInset = clamp((insets.right || 0) * block.w, 0, block.w / 2 - 1);
  const topInset = clamp((insets.top || 0) * block.h, 0, block.h - 2);
  const bottomInset = clamp((insets.bottom || 0) * block.h, 0, block.h - 2);

  return {
    x: block.x + leftInset,
    y: block.y + block.bumpOffset + topInset,
    w: Math.max(2, block.w - leftInset - rightInset),
    h: Math.max(2, block.h - topInset - bottomInset),
    bonusBlock: block,
  };
}

function getBonusCollisionInsets(block) {
  const path = block?.used ? block.usedPath : block?.path;
  if (!path) {
    return { left: 0, right: 0, top: 0, bottom: 0 };
  }
  if (tileVerticalCollisionInsetCache.has(path)) {
    return tileVerticalCollisionInsetCache.get(path) || { left: 0, right: 0, top: 0, bottom: 0 };
  }
  const image = imageCache.get(path);
  if (!isImageRenderable(image)) {
    return { left: 0, right: 0, top: 0, bottom: 0 };
  }
  const bounds = getSpriteOpaqueBounds(image);
  const sourceW = image.naturalWidth || image.width;
  const sourceH = image.naturalHeight || image.height;
  if (!bounds || !sourceW || !sourceH) {
    return { left: 0, right: 0, top: 0, bottom: 0 };
  }

  return {
    left: bounds.left / sourceW,
    right: Math.max(0, sourceW - 1 - bounds.right) / sourceW,
    top: bounds.top / sourceH,
    bottom: Math.max(0, sourceH - 1 - bounds.bottom) / sourceH,
  };
}

function getTileCollisionInsets(tile) {
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
  const sourceW = image.naturalWidth || image.width;
  const sourceH = image.naturalHeight || image.height;
  if (!bounds || !sourceW || !sourceH) {
    const fallbackInset = getTileFallbackCollisionInsets(tile);
    tileVerticalCollisionInsetCache.set(tile.path, fallbackInset);
    return fallbackInset;
  }

  const inset = {
    left: bounds.left / sourceW,
    right: Math.max(0, sourceW - 1 - bounds.right) / sourceW,
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
    return { left: 0, right: 0, top: 0.16, bottom: 0 };
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

function getBonusRewardValue(rewardType) {
  if (rewardType.includes("deco_royal_shield")) {
    return 100;
  }
  if (rewardType.includes("deco_double_axe")) {
    return 50;
  }
  if (rewardType.includes("deco_helmet")) {
    return 30;
  }
  if (rewardType.includes("deco_flail")) {
    return 40;
  }
  if (rewardType.includes("jewel")) {
    return 12;
  }
  if (rewardType.includes("coin")) {
    return 4;
  }
  return 0;
}

function getBonusPopupStyleByValue(value) {
  const scaled = (size, frameWidth) => ({
    size: Math.round(size * WORLD_SCALE),
    frameWidth: frameWidth * WORLD_SCALE,
  });
  if (value >= 100) {
    return { ...scaled(30, 3), frameColor: "#ffd56a" };
  }
  if (value >= 50) {
    return { ...scaled(27, 2.5), frameColor: "#ffb15c" };
  }
  if (value >= 30) {
    return { ...scaled(25, 2.25), frameColor: "#8ec8ff" };
  }
  if (value >= 15) {
    return { ...scaled(23, 2), frameColor: "#9af0d6" };
  }
  return { ...scaled(22, 2), frameColor: "#d7e3ff" };
}

function triggerBonusBlock(block) {
  if (block.used) {
    return;
  }

  block.used = true;
  block.bumpTime = 0.12;
  block.bumpOffset = -4;
  const rewardValue = getBonusRewardValue(block.rewardType);
  const popupStyle = getBonusPopupStyleByValue(rewardValue);
  block.popup = {
    x: block.x + (block.w - popupStyle.size) / 2,
    y: block.y,
    w: popupStyle.size,
    h: popupStyle.size,
    rise: 0,
    vy: 0,
    settled: false,
    collectible: false,
    collected: false,
    path: block.rewardPath,
    value: rewardValue,
    frameColor: popupStyle.frameColor,
    frameWidth: popupStyle.frameWidth,
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
  if (rewardType.includes("deco_double_axe")) {
    grantGold(50);
    state.score += 200;
    return;
  }

  if (rewardType.includes("deco_helmet")) {
    grantGold(30);
    state.score += 120;
    return;
  }

  if (rewardType.includes("deco_flail")) {
    grantGold(40);
    state.score += 160;
    return;
  }

  if (rewardType.includes("deco_royal_shield")) {
    grantGold(100);
    state.score += 400;
    return;
  }

  if (rewardType.includes("jewel")) {
    grantGold(12);
    state.score += 60;
    return;
  }

  if (rewardType.includes("potion")) {
    state.hearts = Math.min(MAX_HEARTS, state.hearts + 1);
    state.score += 20;
    return;
  }

  if (rewardType.includes("coin")) {
    grantGold(4);
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
  spawnEnemyDrop(enemy, { rewardType: "enemy_coin_drop", value: 6, score: 0 });

  let rewardMessage = "+100 / +6 gold";
  if ((enemy.questionAttempts || 0) === 1) {
    const firstStrikeRewards = ["deco_helmet", "deco_jewel", "deco_flail"];
    const rewardType = firstStrikeRewards[Math.floor(Math.random() * firstStrikeRewards.length)];
    spawnEnemyDrop(enemy, { rewardType, value: 1, score: 0 });
    const rewardLabel = rewardType === "deco_flail" ? "flail" : rewardType.replace("deco_", "");
    rewardMessage = `${rewardMessage} + first hit ${rewardLabel} (au sol)`;
  }

  showMessage(rewardMessage);
}

function getRewardSpritePath(rewardType) {
  const pools = [state.config?.object_pools?.bonus || [], state.config?.object_pools?.decoration || []];
  for (const pool of pools) {
    const match = pool.find((entry) => entry.id === rewardType && entry.path);
    if (match?.path) {
      return match.path;
    }
  }

  const fallbackByReward = {
    enemy_coin_drop: "game_assets/bonus/bonus_coin.png",
    bonus_coin: "game_assets/bonus/bonus_coin.png",
    deco_helmet: "game_assets/decoration/deco_helmet.png",
    deco_jewel: "game_assets/decoration/deco_jewel.png",
    deco_flail: "game_assets/decoration/deco_flail.png",
  };
  return fallbackByReward[rewardType] || "game_assets/bonus/bonus_coin.png";
}

function spawnEnemyDrop(enemy, { rewardType, value = 0, score = 0 }) {
  const level = state.currentLevel;
  if (!level || !enemy) {
    return;
  }
  if (!Array.isArray(level.enemyDrops)) {
    level.enemyDrops = [];
  }

  const size = Math.max(16, Math.round(state.tileSize * ENEMY_DROP_SIZE_RATIO));
  const centerX = enemy.x + enemy.w * 0.5;
  const dropX = centerX - size * 0.5;
  const dropY = enemy.y + enemy.h - size;
  const jitter = (Math.random() * 2 - 1) * 58;
  level.enemyDrops.push({
    x: dropX,
    y: dropY,
    w: size,
    h: size,
    vy: -220,
    vx: jitter,
    rewardType,
    rewardPath: getRewardSpritePath(rewardType),
    value,
    score,
    settled: false,
    collected: false,
    pickupDelay: 0.45,
    ttl: 12,
  });
}

function updateEnemyDrops(delta) {
  const level = state.currentLevel;
  if (!level?.enemyDrops?.length) {
    return;
  }

  for (const drop of level.enemyDrops) {
    if (drop.collected) {
      continue;
    }

    drop.ttl -= delta;
    drop.pickupDelay = Math.max(0, (drop.pickupDelay || 0) - delta);
    if (drop.ttl <= 0) {
      drop.collected = true;
      continue;
    }

    if (!drop.settled) {
      drop.vy = Math.min(ENEMY_DROP_MAX_FALL_SPEED, drop.vy + ENEMY_DROP_GRAVITY * delta);
      drop.x += drop.vx * delta;
      drop.y += drop.vy * delta;
      drop.vx *= 0.93;
      if (resolveBonusPopupVerticalCollision(drop, level)) {
        drop.settled = true;
      }
    }

    if (drop.settled && drop.pickupDelay <= 0 && aabb(state.player, drop)) {
      if (drop.rewardType && drop.rewardType !== "enemy_coin_drop") {
        applyBonusReward(drop.rewardType);
      }
      if (drop.value > 0 && drop.rewardType === "enemy_coin_drop") {
        grantGold(drop.value);
      }
      if (drop.score > 0) {
        state.score += drop.score;
      }
      drop.collected = true;
    }
  }

  level.enemyDrops = level.enemyDrops.filter((drop) => !drop.collected);
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

function getTowerInteriorFloorY() {
  return VIRTUAL_HEIGHT - 34;
}

function getTowerInteriorChestBounds() {
  const chestW = 84;
  const chestH = 84;
  const floorY = getTowerInteriorFloorY();
  const chestX = Math.round(VIRTUAL_WIDTH * 0.68 - chestW * 0.5);
  const chestY = Math.round(floorY - chestH);
  return { x: chestX, y: chestY, w: chestW, h: chestH };
}

function openTowerChestAttempt() {
  if (!state.duel || state.duel.QS.active || state.towerInterior.chestState !== "locked") {
    return;
  }

  const streak = state.towerInterior.chestStreak;
  const required = state.towerInterior.chestRequired;
  const opened = state.duel.openStandaloneQuestion({
    vd: state.duel.randomVerbData(),
    uiMeta: {
      enemyEmoji: "📦",
      groupLabel: `Coffre de la tour ${streak}/${required}`,
    },
    onCorrect() {
      state.towerInterior.chestStreak += 1;
      const current = state.towerInterior.chestStreak;
      if (current >= required) {
        const pieces = 15 + Math.floor(Math.pow(Math.random(), 3) * 136);
        state.towerInterior.chestState = "open";
        state.towerInterior.chestRewardPieces = pieces;
        grantGold(pieces);
        state.score += pieces * 2;
        showMessage(`Coffre ouvert: +${pieces} pieces`);
        return;
      }
      showMessage(`Serie du coffre: ${current}/${required}`);
    },
    onWrong() {
      state.towerInterior.chestStreak = 0;
      state.towerInterior.chestState = "destroyed";
      state.towerInterior.chestExplodeUntil = performance.now() + 1000;
      showMessage("Echec: le coffre explose");
    },
  });

  if (opened) {
    state.towerInterior.chestPromptUntil = performance.now() + 450;
  }
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

  player.x = VIRTUAL_WIDTH * 0.32 - player.w * 0.5;
  player.y = getTowerInteriorFloorY() - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  if (state.towerInterior.chestState === "locked") {
    showMessage("Touchez le coffre: 3 reponses d'affilee");
  } else if (state.towerInterior.chestState === "open") {
    showMessage(`Coffre deja ouvert: +${state.towerInterior.chestRewardPieces} pieces`);
  } else {
    showMessage("Le coffre a disparu");
  }
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
  grantGold(18);

  if (state.currentLevelIndex < state.levels.length - 1) {
    loadLevel(state.currentLevelIndex + 1, false);
  } else {
    startBossMode({ sourceLevelIndex: state.currentLevelIndex });
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
  const zoom = getWorldZoom();
  const visibleWorldWidth = VIRTUAL_WIDTH / zoom;
  const desired = state.player.x - visibleWorldWidth * 0.35;
  const maxX = Math.max(0, state.currentLevel.worldWidth - visibleWorldWidth);
  state.cameraX += (clamp(desired, 0, maxX) - state.cameraX) * 0.08;
}

function getWorldRenderOffsetY(level) {
  const groundSurfaceWorldY = level.groundY * state.tileSize;
  const desiredGroundScreenY = VIRTUAL_HEIGHT - Math.round(state.tileSize * 1.35);
  return desiredGroundScreenY - groundSurfaceWorldY;
}

function render(timeSeconds) {
  if (state.boss.active) {
    drawBossScene(timeSeconds);
    if (state.message) {
      drawFloatingMessage(state.message);
    }
    return;
  }

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
  const zoom = getWorldZoom();
  // Anchor zoom on bottom-left so the ground stays in view when zoom changes.
  ctx.translate(0, VIRTUAL_HEIGHT);
  ctx.scale(zoom, zoom);
  ctx.translate(0, -VIRTUAL_HEIGHT);
  ctx.translate(-Math.floor(state.cameraX), Math.floor(getWorldRenderOffsetY(level)));

  try {
    drawStructures(level);
    drawTiles(level);
    drawGroundDecorations(level);
    drawDecorations(level);
    drawBonuses(level, timeSeconds);
    drawEnemies(level);
    drawFireballs(level);
    drawEnemyDrops(level);
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

function drawBossScene(timeSeconds) {
  const bossBackground = imageCache.get(BIOME_PARALLAX_BACKGROUNDS.desolation);
  if (isImageRenderable(bossBackground)) {
    const scale = Math.max(VIRTUAL_WIDTH / bossBackground.width, VIRTUAL_HEIGHT / bossBackground.height);
    const drawW = bossBackground.width * scale;
    const drawH = bossBackground.height * scale;
    const drawX = (VIRTUAL_WIDTH - drawW) * 0.5;
    const drawY = (VIRTUAL_HEIGHT - drawH) * 0.5;
    ctx.drawImage(bossBackground, drawX, drawY, drawW, drawH);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
    grad.addColorStop(0, "#2b0f17");
    grad.addColorStop(1, "#090d1c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  }

  ctx.save();
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 22; i += 1) {
    const x = (i * 41 + Math.sin(timeSeconds * 1.3 + i) * 20 + VIRTUAL_WIDTH) % VIRTUAL_WIDTH;
    const y = (i * 67 + Math.cos(timeSeconds * 1.1 + i * 0.7) * 16 + VIRTUAL_HEIGHT) % VIRTUAL_HEIGHT;
    ctx.fillStyle = "#ff8e42";
    ctx.fillRect(x, y, 3, 3);
  }
  ctx.restore();

  const dragon = getBossDragonFrame(timeSeconds);
  const dragonW = 280;
  const dragonH = 280;
  const dragonX = VIRTUAL_WIDTH * 0.5 - dragonW * 0.5 + Math.sin(timeSeconds * 1.2) * 4;
  const dragonY = 110 + Math.cos(timeSeconds * 1.6) * 3;
  if (dragon) {
    ctx.drawImage(dragon, dragonX, dragonY, dragonW, dragonH);
  } else {
    ctx.fillStyle = "#b43d34";
    ctx.fillRect(dragonX + 50, dragonY + 70, dragonW - 100, dragonH - 120);
  }

  if (state.boss.phase === "intro" && state.boss.introMessageVisible) {
    ctx.fillStyle = "rgba(5, 8, 18, 0.72)";
    ctx.fillRect(28, 412, VIRTUAL_WIDTH - 56, 148);
    ctx.strokeStyle = "rgba(255, 213, 106, 0.62)";
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 412, VIRTUAL_WIDTH - 56, 148);
    ctx.fillStyle = "#f7fbff";
    ctx.font = "700 16px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("You reached it, the fierce red dragon!", VIRTUAL_WIDTH * 0.5, 448);
    ctx.fillText("Ready to fight? 5 questions, 10 seconds each,", VIRTUAL_WIDTH * 0.5, 476);
    ctx.fillText("and you will win!", VIRTUAL_WIDTH * 0.5, 504);
  }

  const secondsLeft = Math.max(0, Math.ceil((state.boss.trialDeadline - performance.now()) / 1000));
  ctx.fillStyle = "#f7fbff";
  ctx.font = "bold 18px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Dragon Boss`, VIRTUAL_WIDTH * 0.5, 52);
  ctx.font = "bold 15px Nunito, sans-serif";
  ctx.fillText(`Trials: ${state.boss.streak}/${state.boss.required}`, VIRTUAL_WIDTH * 0.5, 78);
  if (state.boss.phase === "trials") {
    ctx.fillStyle = secondsLeft <= 3 ? "#ff8e42" : "#ffd56a";
    ctx.fillText(`Time: ${secondsLeft}s`, VIRTUAL_WIDTH * 0.5, 102);
  } else if (state.boss.phase === "celebration") {
    ctx.fillStyle = "#74f3d8";
    ctx.fillText("Champion ceremony...", VIRTUAL_WIDTH * 0.5, 102);
    ctx.save();
    for (let i = 0; i < 18; i += 1) {
      const angle = timeSeconds * 2 + i * (Math.PI / 9);
      const px = VIRTUAL_WIDTH * 0.5 + Math.cos(angle) * (65 + i);
      const py = 230 + Math.sin(angle) * (25 + i * 0.6);
      ctx.fillStyle = i % 2 ? "#ffd56a" : "#74f3d8";
      ctx.fillRect(px, py, 4, 4);
    }
    ctx.restore();
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

  const chest = getTowerInteriorChestBounds();
  if (state.towerInterior.chestState !== "destroyed" && chestImage?.complete) {
    const bobY = Math.sin(timeSeconds * 2.2) * 2;
    ctx.drawImage(chestImage, chest.x, chest.y + bobY, chest.w, chest.h);
    if (state.towerInterior.chestState === "open") {
      ctx.fillStyle = "rgba(255, 215, 106, 0.9)";
      ctx.font = "bold 18px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`+${state.towerInterior.chestRewardPieces}`, chest.x + chest.w * 0.5, chest.y - 12);
    }
  } else if (state.towerInterior.chestState === "destroyed" && performance.now() < state.towerInterior.chestExplodeUntil) {
    const t = (state.towerInterior.chestExplodeUntil - performance.now()) / 1000;
    const progress = 1 - clamp(t, 0, 1);
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10;
      const radius = 12 + progress * 32;
      const px = chest.x + chest.w * 0.5 + Math.cos(angle) * radius;
      const py = chest.y + chest.h * 0.5 + Math.sin(angle) * radius;
      ctx.fillStyle = i % 2 ? "#ffb15c" : "#ffd56a";
      ctx.fillRect(px - 3, py - 3, 6, 6);
    }
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

function drawFireballs(level) {
  if (!state.fireballs.length) {
    return;
  }
  for (const fireball of state.fireballs) {
    if (fireball.kind === "shuriken") {
      const angle = (fireball.spin || 0) + performance.now() * 0.001 * (fireball.spinSpeed || 14);
      ctx.save();
      ctx.translate(fireball.x, fireball.y);
      ctx.rotate(angle);
      ctx.fillStyle = "#d8dee9";
      ctx.strokeStyle = "#7f8ca2";
      ctx.lineWidth = 1.5;
      const arm = fireball.radius;
      for (let i = 0; i < 4; i += 1) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(arm * 0.22, -arm * 0.22);
        ctx.lineTo(arm, 0);
        ctx.lineTo(arm * 0.22, arm * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = "#5a6578";
      ctx.beginPath();
      ctx.arc(0, 0, arm * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    if (fireball.kind === "saber") {
      const angle = Math.atan2(fireball.vy, fireball.vx) + (fireball.rotation || 0);
      const length = fireball.radius * 2.2;
      const width = fireball.radius * 0.42;
      ctx.save();
      ctx.translate(fireball.x, fireball.y);
      ctx.rotate(angle);
      ctx.fillStyle = "#f2f5ff";
      ctx.fillRect(-length * 0.45, -width * 0.5, length, width);
      ctx.fillStyle = "#ffc86a";
      ctx.fillRect(-length * 0.58, -width * 0.7, length * 0.12, width * 1.4);
      ctx.fillStyle = "#9e5a2f";
      ctx.fillRect(-length * 0.67, -width * 0.28, length * 0.1, width * 0.56);
      ctx.restore();
      continue;
    }

    const gradient = ctx.createRadialGradient(
      fireball.x - fireball.radius * 0.3,
      fireball.y - fireball.radius * 0.3,
      fireball.radius * 0.2,
      fireball.x,
      fireball.y,
      fireball.radius,
    );
    gradient.addColorStop(0, "#fff7c2");
    gradient.addColorStop(0.55, "#ffb347");
    gradient.addColorStop(1, "#ff6a2f");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(fireball.x, fireball.y, fireball.radius, 0, Math.PI * 2);
    ctx.fill();
  }
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

function drawEnemyDrops(level) {
  for (const drop of level.enemyDrops || []) {
    const image = imageCache.get(drop.rewardPath);
    if (isImageRenderable(image)) {
      ctx.drawImage(image, drop.x, drop.y, drop.w, drop.h);
    } else {
      ctx.fillStyle = "#ffde5e";
      ctx.fillRect(drop.x, drop.y, drop.w, drop.h);
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

function circleIntersectsRect(cx, cy, radius, rect) {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
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

  return enemy;
}

async function preloadEnemySprites(enemy) {
  const preloadList = [enemy.sprite.idleE, enemy.sprite.idleW, ...enemy.sprite.walkE, ...enemy.sprite.walkW].filter(
    Boolean,
  );
  await Promise.all(preloadList.map((path) => loadImage(path).catch(() => null)));
}

async function preloadSelectedHeroSprites() {
  const hero = state.heroes[state.selectedHeroIndex] || state.heroes[0];
  if (!hero) {
    return;
  }
  await preloadHeroSprites(hero);
}

async function preloadEnemiesForLevel(levelIndex) {
  const level = state.levels[levelIndex];
  if (!level) {
    return;
  }
  const biomeId = level.biomeId;
  const targetedEnemies = state.enemies.filter((enemy) => enemy.biomeHint === biomeId);
  await Promise.all(targetedEnemies.map((enemy) => preloadEnemySprites(enemy)));
}

function scheduleBackgroundWarmup(config) {
  window.setTimeout(() => {
    preloadEnemiesForLevel(0).catch(() => null);
    preloadConfigAssetImages(config).catch(() => null);
    preloadParallaxBackgrounds().catch(() => null);
    preloadBossAssets().catch(() => null);
    Promise.all(state.heroes.map((hero) => preloadHeroSprites(hero))).catch(() => null);
    Promise.all(state.enemies.map((enemy) => preloadEnemySprites(enemy))).catch(() => null);
  }, 0);
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
    irr: {
      label: "Verbes irréguliers usuels",
      list: {
        etre: {
          inf: "être",
          pr: ["suis", "es", "est", "sommes", "êtes", "sont"],
          im: ["étais", "étais", "était", "étions", "étiez", "étaient"],
          fu: ["serai", "seras", "sera", "serons", "serez", "seront"],
          pp: "été",
        },
        avoir: {
          inf: "avoir",
          pr: ["ai", "as", "a", "avons", "avez", "ont"],
          im: ["avais", "avais", "avait", "avions", "aviez", "avaient"],
          fu: ["aurai", "auras", "aura", "aurons", "aurez", "auront"],
          pp: "eu",
        },
        aller: {
          inf: "aller",
          pr: ["vais", "vas", "va", "allons", "allez", "vont"],
          im: ["allais", "allais", "allait", "allions", "alliez", "allaient"],
          fu: ["irai", "iras", "ira", "irons", "irez", "iront"],
          pp: "allé",
        },
        faire: {
          inf: "faire",
          pr: ["fais", "fais", "fait", "faisons", "faites", "font"],
          im: ["faisais", "faisais", "faisait", "faisions", "faisiez", "faisaient"],
          fu: ["ferai", "feras", "fera", "ferons", "ferez", "feront"],
          pp: "fait",
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

function loadHeroUnlocks() {
  try {
    const raw = localStorage.getItem(HERO_UNLOCK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveHeroUnlocks(unlocks) {
  try {
    localStorage.setItem(HERO_UNLOCK_STORAGE_KEY, JSON.stringify(unlocks || {}));
  } catch {
    // Ignore storage issues.
  }
}

function loadSelectedHeroId() {
  try {
    return String(localStorage.getItem(HERO_SELECTED_STORAGE_KEY) || "paladin");
  } catch {
    return "paladin";
  }
}

function saveSelectedHeroId(heroId) {
  try {
    localStorage.setItem(HERO_SELECTED_STORAGE_KEY, String(heroId || "paladin"));
  } catch {
    // Ignore storage issues.
  }
}

function getPaladinIndex() {
  return Math.max(0, state.heroes.findIndex((hero) => hero.id === "paladin"));
}

function isHeroOwned(heroId) {
  return Boolean(state.heroUnlocks[heroId]);
}

function syncHeroActionButtonVisibility() {
  if (!ui.castFireBtn) {
    return;
  }
  const shouldHide = !["mage", "ninja", "pirate"].includes(getSelectedHeroId());
  ui.castFireBtn.hidden = shouldHide;
  if (ui.castFireHitBtn) {
    ui.castFireHitBtn.hidden = shouldHide;
  }
}

function ensureSelectedHeroIsOwned() {
  const selected = state.heroes[state.selectedHeroIndex];
  if (selected && isHeroOwned(selected.id)) {
    return;
  }
  state.selectedHeroIndex = getPaladinIndex();
}

function initializeHeroProgress() {
  const storedUnlocks = loadHeroUnlocks();
  const heroUnlocks = {};
  for (const hero of state.heroes) {
    const cfg = getHeroShopConfig(hero.id);
    heroUnlocks[hero.id] = Boolean(cfg.defaultOwned || storedUnlocks[hero.id]);
  }
  heroUnlocks.paladin = true;
  state.heroUnlocks = heroUnlocks;

  const selectedHeroId = loadSelectedHeroId();
  const selectedIndex = state.heroes.findIndex((hero) => hero.id === selectedHeroId);
  state.selectedHeroIndex = selectedIndex >= 0 ? selectedIndex : getPaladinIndex();
  ensureSelectedHeroIsOwned();
  syncHeroActionButtonVisibility();
  const selected = state.heroes[state.selectedHeroIndex];
  saveHeroUnlocks(state.heroUnlocks);
  if (selected) {
    saveSelectedHeroId(selected.id);
  }
}

function spendPersistentGold(cost) {
  const amount = Math.max(0, Math.floor(Number(cost) || 0));
  if (amount <= 0 || state.persistentGold < amount) {
    return false;
  }
  state.persistentGold -= amount;
  savePersistentGold(state.persistentGold);
  if ((ui.settingsPanel && !ui.settingsPanel.hidden) || (ui.shopPanel && !ui.shopPanel.hidden)) {
    renderHeroShop();
  }
  return true;
}

function grantGold(amount) {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  if (!value) {
    return;
  }
  state.coins += value;
  state.persistentGold += value;
  savePersistentGold(state.persistentGold);
  if ((ui.settingsPanel && !ui.settingsPanel.hidden) || (ui.shopPanel && !ui.shopPanel.hidden)) {
    renderHeroShop();
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

  ui.tenseFilters.innerHTML = TENSE_KEYS
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
      state.pedagogy.activeTenses = selected.length ? selected : TENSE_KEYS.slice();
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
    onOpenQuestion(question, uiMeta = null) {
      if (!ui.questionPanel || !ui.questionPrompt || !ui.answerButtons) {
        return;
      }
      const verbs = getVerbSource();
      const verbDef = verbs?.[question.gKey]?.list?.[question.vKey];
      const inf = verbDef?.inf || question.vKey;
      const pronoun = PRONOUN_LABEL[question.pronIdx] || "";
      const tenseText = formatQuestionTense(question.tenseLabel);
      const groupLabel = verbs?.[question.gKey]?.label || question.gKey;
      const biomeId = state.currentLevel?.biomeId || "forest";
      if (ui.questionEnemy) {
        ui.questionEnemy.textContent = uiMeta?.enemyEmoji || (BIOME_EMOJI[biomeId] || "⚔️");
      }
      if (ui.questionGroup) {
        ui.questionGroup.textContent = uiMeta?.groupLabel || groupLabel;
      }
      if (ui.questionTense) {
        ui.questionTense.textContent = uiMeta?.tenseLabel || question.tenseLabel;
      }
      if (ui.questionCountdown) {
        ui.questionCountdown.hidden = !state.boss.active;
      }
      ui.questionPrompt.innerHTML = `Conjugue <span class="verb">${inf}</span> ${tenseText}<br/><span class="pronoun">${pronoun}</span> <span class="blank">???</span>`;
      ui.answerButtons.innerHTML = "";
      question.options.forEach((option) => {
        const btn = document.createElement("button");
        btn.className = "answer-btn";
        btn.type = "button";
        btn.dataset.answer = option;
        btn.textContent = option;
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
      if (ui.questionCountdown) {
        ui.questionCountdown.hidden = true;
      }
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
  const QS = { active: false, enemy: null, q: null, mode: "enemy", onCorrect: null, onWrong: null, uiMeta: null, resolving: false };
  const QK = { selectedBtn: null };
  let selectedIndex = -1;
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
          for (const t of TENSE_KEYS) {
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
      activeTenses: s.activeTenses?.length ? s.activeTenses : TENSE_KEYS.slice(),
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
      selectedIndex = -1;
      return;
    }
    if (selectedIndex < 0) {
      QK.selectedBtn = null;
      uiHooks.setSelectedButton?.(null);
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
    QS.mode = "enemy";
    QS.onCorrect = null;
    QS.onWrong = null;
    QS.uiMeta = null;
    QS.resolving = false;
    enemy.battling = true;
    enemy.questionAttempts = (enemy.questionAttempts || 0) + 1;
    selectedIndex = -1;
    uiHooks.onOpenQuestion?.(q, QS.uiMeta);
    syncSelection();
    gameplayHooks.onOpenQuestion?.(q, enemy);
    return true;
  }

  function openStandaloneQuestion({ vd = null, uiMeta = null, onCorrect = null, onWrong = null } = {}) {
    if (QS.active) {
      return false;
    }
    const questionData = vd || randomVerbData();
    const q = makeQuestion(questionData);
    if (!q) {
      return false;
    }
    QS.active = true;
    QS.enemy = null;
    QS.q = q;
    QS.mode = "standalone";
    QS.onCorrect = typeof onCorrect === "function" ? onCorrect : null;
    QS.onWrong = typeof onWrong === "function" ? onWrong : null;
    QS.uiMeta = uiMeta || null;
    QS.resolving = false;
    selectedIndex = -1;
    uiHooks.onOpenQuestion?.(q, QS.uiMeta);
    syncSelection();
    gameplayHooks.onOpenQuestion?.(q, null);
    return true;
  }

  function closeQuestion() {
    const enemy = QS.enemy;
    const mode = QS.mode;
    QS.active = false;
    QS.enemy = null;
    QS.q = null;
    QS.mode = "enemy";
    QS.onCorrect = null;
    QS.onWrong = null;
    QS.uiMeta = null;
    QS.resolving = false;
    QK.selectedBtn = null;
    selectedIndex = -1;
    uiHooks.onCloseQuestion?.();
    gameplayHooks.onCloseQuestion?.(enemy, mode);
  }

  async function answerClick(answer) {
    if (!QS.active || !QS.q || QS.resolving) {
      return false;
    }
    QS.resolving = true;
    const q = QS.q;
    const selected = String(answer || "");
    uiHooks.disableAnswers?.();
    uiHooks.markAnswer?.({ correct: q.correct, selected });
    const correct = selected === q.correct;
    const mode = QS.mode;
    const onCorrect = QS.onCorrect;
    const onWrong = QS.onWrong;
    if (correct) {
      await delay(700);
      const enemy = QS.enemy;
      closeQuestion();
      if (mode === "enemy") {
        gameplayHooks.defeatEnemy?.(enemy);
      } else {
        onCorrect?.(q);
      }
      return true;
    }

    recordError(q);
    uiHooks.vibrate?.(120);
    await delay(mode === "enemy" ? 2500 : 800);
    const enemy = QS.enemy;
    closeQuestion();
    if (mode === "enemy") {
      if (enemy) {
        enemy.battling = false;
      }
      gameplayHooks.hitPlayer?.();
    } else {
      onWrong?.(q);
    }
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
      selectedIndex = selectedIndex < 0 ? buttons.length - 1 : selectedIndex - 1;
      syncSelection();
      return true;
    }
    if (key === "ArrowRight" || key === "ArrowDown") {
      selectedIndex = selectedIndex < 0 ? 0 : selectedIndex + 1;
      syncSelection();
      return true;
    }
    if (key === "Enter" || key === " ") {
      if (selectedIndex < 0) {
        return true;
      }
      const btn = buttons[selectedIndex];
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
    openStandaloneQuestion,
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
