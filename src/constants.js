// ─── Virtual canvas ───
export const VIRTUAL_WIDTH = 432;
export const VIRTUAL_HEIGHT = 768;

// ─── Core physics ───
export const GAME = {
  gravity: 1380,
  moveSpeed: 188,
  jumpVelocity: -525,
  maxFallVelocity: 810,
  friction: 0.84,
  levelCount: 5,
};

// ─── Scaling ───
export const HERO_SCALE = 1.5;
export const ENEMY_SCALE = 1.5;
export const WORLD_SCALE = 1;
export const MIN_WORLD_ZOOM = 0.1;
export const MAX_WORLD_ZOOM = 3;
export const TOWER_HEIGHT_SCALE = 1.5;
export const CASTLE_SCALE = 1.5;

// ─── Player ───
export const DEFAULT_STARTING_HEARTS = 3;
export const MAX_HEARTS = 5;
export const PROFILE_STARTING_HEARTS = { easy: 5, normal: 5, chaotic: 3 };
export const SPRITE_FALLBACK_FOOT_OFFSET_RATIO = 0.12;
export const PLAYER_RENDER_GROUND_OFFSET_PX = 0;
export const PLAYER_HITBOX_WIDTH = 28;
export const PLAYER_HITBOX_HEIGHT = 120;
export const MIN_PLAYER_JUMP_HEIGHT_TILES = 5.0;
export const PLAYER_HIT_INVULN_SECONDS = 1.6;
export const PLAYER_HIT_STUN_SECONDS = 0.18;
export const PLAYER_HIT_KNOCKBACK_X = 190;
export const PLAYER_HIT_KNOCKBACK_Y = -320;
export const PLAYER_HIT_BLINK_HZ = 14;
export const PLAYER_DEATH_DELAY_SECONDS = 1;
export const PLAYER_DEATH_LAUNCH_Y = -420;

// ─── Enemy ───
export const ENEMY_MOVE_SPEED = 52;
export const ENEMY_HITBOX_WIDTH_RATIO = 0.34;
export const ENEMY_HITBOX_HEIGHT_RATIO = 0.62;
export const ENEMY_MIN_HITBOX_W = 28;
export const ENEMY_MAX_HITBOX_W = 56;
export const ENEMY_MIN_HITBOX_H = 56;
export const ENEMY_MAX_HITBOX_H = 104;
export const ENEMY_DEFEAT_FADE_SECONDS = 0.75;
export const ENEMY_DEFEAT_RISE_PX = 10;
export const ENEMY_DROP_GRAVITY = 1450;
export const ENEMY_DROP_MAX_FALL_SPEED = 760;
export const ENEMY_DROP_SIZE_RATIO = 0.68;

// ─── Bonus / Popup ───
export const BONUS_POPUP_GRAVITY = 1250;
export const BONUS_POPUP_MAX_FALL_SPEED = 640;
export const BONUS_MIN_SUPPORT_GAP_TILES = 2;
export const BONUS_MAX_SUPPORT_GAP_TILES = 5;

// ─── Ground / Tiles ───
export const GROUND_THICKNESS_TILES = 4;
export const GROUND_TILE_OVERLAP_PX = 20;
export const GROUND_TILE_HORIZONTAL_OVERLAP_PX = 2;
export const GROUND_DECOR_FALLBACK_BOTTOM_PAD_RATIO = 0.22;
export const GROUND_SURFACE_VARIATION_MAX_UP = 0;
export const GROUND_SURFACE_VARIATION_MAX_DOWN = 0;

// ─── Conjugation labels ───
export const TENSE_LABEL = { pr: "Présent", im: "Imparfait", fu: "Futur simple" };
export const TENSE_KEYS = Object.keys(TENSE_LABEL);
export const PRONOUN_LABEL = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"];

// ─── Asset directories ───
export const KNOWN_HERO_DIRS = ["mage", "ninja", "paladin", "pirate"];
export const KNOWN_ENEMY_DIRS = [
  "desert-mummy", "desert-scorpion", "desolation-skeleton", "desolation-wraith",
  "forest-goblin-green", "forest-sprite", "mountain-dwarf", "mountain-troll",
  "snow-yeti", "snow-zombie",
];
export const FIXED_LEVEL_BIOME_ORDER = ["forest", "desert", "mountain", "snow", "desolation"];

// ─── Biome visuals ───
export const BIOME_BACKGROUNDS = {
  castle: ["#1d2235", "#2f3b57"],
  desert: ["#533922", "#a46e30"],
  desolation: ["#1f1d27", "#4a4458"],
  forest: ["#1e3f2b", "#437b4f"],
  mountain: ["#2b3a4f", "#5b7793"],
  snow: ["#3e5873", "#a1bfd8"],
  wood: ["#3b2a1d", "#7b5a39"],
};
export const BIOME_PARALLAX_BACKGROUNDS = {
  desert: "game_assets/backgrounds/desert-background.png",
  desolation: "game_assets/backgrounds/desolation-background.png",
  forest: "game_assets/backgrounds/forest-background.png",
  mountain: "game_assets/backgrounds/moutain-background.png",
  snow: "game_assets/backgrounds/snow-background.png",
  castle: "game_assets/backgrounds/desolation-background.png",
  wood: "game_assets/backgrounds/forest-background.png",
};
export const BIOME_EMOJI = {
  castle: "🏰", desert: "🏜️", desolation: "💀",
  forest: "🌳", mountain: "⛰️", snow: "❄️", wood: "🌲",
};

// ─── Generation profiles ───
export const GENERATION_PROFILES = {
  easy: {
    allowGroundHoles: false,
    patternLoop: ["intro", "run", "run", "hop", "run", "stairs", "run", "intro", "run"],
    maxHoleWidth: 1, holeBase: 2, holeMin: 2, holeMax: 5,
    enemyBase: 3, enemyPerLevel: 1, enemyMin: 4, enemyMax: 8, doubleSpawnLaneLength: 16,
  },
  normal: {
    allowGroundHoles: true,
    patternLoop: ["intro", "run", "hop", "air", "gauntlet", "air", "stairs", "hop", "air", "run", "gauntlet"],
    maxHoleWidth: 2, holeBase: 5, holeMin: 5, holeMax: 10,
    enemyBase: 4, enemyPerLevel: 2, enemyMin: 5, enemyMax: 12, doubleSpawnLaneLength: 12,
  },
  chaotic: {
    allowGroundHoles: true,
    patternLoop: ["intro", "air", "gauntlet", "hop", "air", "stairs", "gauntlet", "air", "hop", "finale"],
    maxHoleWidth: 3, holeBase: 7, holeMin: 7, holeMax: 14,
    enemyBase: 6, enemyPerLevel: 2, enemyMin: 7, enemyMax: 15, doubleSpawnLaneLength: 10,
  },
};

export function getGenerationProfileSettings(profileId) {
  return GENERATION_PROFILES[profileId] || GENERATION_PROFILES.normal;
}

export function getStartingHearts(profileId) {
  return PROFILE_STARTING_HEARTS[profileId] || DEFAULT_STARTING_HEARTS;
}

// ─── Hero shop ───
export const HERO_SHOP_CONFIG = {
  paladin: { price: 0, order: 0, defaultOwned: true },
  ninja: { price: 360, order: 1, defaultOwned: false },
  pirate: { price: 600, order: 2, defaultOwned: false },
  mage: { price: 1200, order: 3, defaultOwned: false },
};

export function getHeroShopConfig(heroId) {
  return HERO_SHOP_CONFIG[heroId] || { price: 9999, order: 99, defaultOwned: false };
}

// ─── Boss ───
export const BOSS_LEVEL_VALUE = "boss";
export const BOSS_TRIALS_REQUIRED = 5;
export const BOSS_TRIAL_TIME_LIMIT_SECONDS = 10;
export const BOSS_CELEBRATION_SECONDS = 6;
export const BOSS_DEFEAT_OVERLAY_SECONDS = 2.2;
export const BOSS_INTRO_MESSAGE_DELAY_SECONDS = 2.6;
export const BOSS_DRAGON_ATTACK_SW_FRAMES = Array.from(
  { length: 9 },
  (_, i) => `game_assets/enemies/boss-dragon/animations/attack/south-west/frame_${String(i).padStart(3, "0")}.png`,
);
export const BOSS_FALLBACK_DRAGON_FRAME = "game_assets/enemies/boss-dragon/rotations/south-west.png";

// ─── Projectiles ───
export const MAGE_FIREBALL_ICON = "game_assets/decoration/deco_cauldron_fire.png";
export const MAGE_FIREBALL_SPEED = 420;
export const MAGE_FIREBALL_RADIUS = 16;
export const NINJA_SHURIKEN_SPEED = 520;
export const NINJA_SHURIKEN_RADIUS = 12;
export const PIRATE_SABER_SPEED_X = 300;
export const PIRATE_SABER_SPEED_Y = -260;
export const PIRATE_SABER_GRAVITY = 720;
export const PIRATE_SABER_RADIUS = 14;

// ─── UI / Misc ───
export const CHEAT_MENU_LONG_PRESS_MS = 650;
export const IMAGE_LOAD_TIMEOUT_MS = 12000;
export const ASSET_PROBE_TIMEOUT_MS = 1800;

// ─── Storage keys ───
export const PERSISTENT_CURRENCY_KEY = "cquest_gold";
export const HERO_UNLOCK_STORAGE_KEY = "cquest_hero_unlocks_v1";
export const HERO_SELECTED_STORAGE_KEY = "cquest_selected_hero_v1";
export const WORLD_ZOOM_STORAGE_KEY = "cquest_world_zoom_v1";
export const ERROR_DB_STORAGE_KEY = "cquest_conjugation_errors_v1";
