// ─── Asset Loader ───
// Handles all image/asset loading for ConjugQuest.

import {
  KNOWN_HERO_DIRS, KNOWN_ENEMY_DIRS, IMAGE_LOAD_TIMEOUT_MS, ASSET_PROBE_TIMEOUT_MS,
  MAGE_FIREBALL_ICON, BIOME_PARALLAX_BACKGROUNDS, BOSS_DRAGON_ATTACK_SW_FRAMES,
  BOSS_FALLBACK_DRAGON_FRAME, GROUND_THICKNESS_TILES,
  MIN_PLAYER_JUMP_HEIGHT_TILES, GAME,
  GROUND_TILE_STYLE_BY_BIOME, GROUND_TILE_PREFIX_BY_STYLE,
  PLATFORM_STYLE_IDS, PLATFORM_TILE_PREFIX_BY_STYLE,
  getHeroShopConfig,
} from "./constants.js";

import { normalizeAssetPath, normalizeUniqueAssetPaths, toAssetPath, formatHeroName, pad2, pad3 } from "./utils.js";
import { state, ui, imageCache, imagePromiseCache } from "./state.js";

// ─── Late-bound dependency ───
// updateHudInfo lives in the rendering/UI layer which may not yet be extracted.
// Register it via setUpdateHudInfo() so loadConfig can call it.
let _updateHudInfo = null;

export function setUpdateHudInfo(fn) {
  _updateHudInfo = fn;
}

// ─── Core image helpers ───

export function isImageRenderable(image) {
  return Boolean(image && image.complete && (image.naturalWidth || image.width) > 0 && (image.naturalHeight || image.height) > 0);
}

export async function loadImage(path, { timeoutMs = IMAGE_LOAD_TIMEOUT_MS } = {}) {
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
  image._assetPath = cleanPath;
  const loadingPromise = new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error(`Image load timeout: ${cleanPath}`));
    }, timeoutMs);

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

export async function tryLoadImage(path) {
  if (!path) {
    return false;
  }
  try {
    await loadImage(path, { timeoutMs: ASSET_PROBE_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

export async function fetchJson(path) {
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

// ─── Frame path collection ───

export async function collectFramePaths(prefix, maxFrames) {
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

export async function collectFramePathsFromPrefixes(prefixes, maxFrames) {
  for (const prefix of prefixes) {
    const frames = await collectFramePaths(prefix, maxFrames);
    if (frames.length) {
      return frames;
    }
  }
  return [];
}

// ─── Hero builders ───

export async function buildHeroFromMetadata(dir, metadata) {
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
      runSE: normalizeUniqueAssetPaths((running["south-east"] || []).map((file) => toAssetPath(`./game_assets/heroes/${dir}`, file))),
      runSW: normalizeUniqueAssetPaths((running["south-west"] || []).map((file) => toAssetPath(`./game_assets/heroes/${dir}`, file))),
      jumpSE: normalizeUniqueAssetPaths(
        (jumping["south-east"] || []).map((file) => toAssetPath(`./game_assets/heroes/${dir}`, file)),
      ),
      jumpSW: normalizeUniqueAssetPaths(
        (jumping["south-west"] || []).map((file) => toAssetPath(`./game_assets/heroes/${dir}`, file)),
      ),
    },
  };

  if (!(await tryLoadImage(hero.sprite.idleSE)) || !(await tryLoadImage(hero.sprite.idleSW))) {
    return null;
  }

  return hero;
}

export async function buildHeroFromConvention(dir) {
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

// ─── Enemy builders ───

export async function buildEnemyFromMetadata(dir, metadata) {
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
      walkE: normalizeUniqueAssetPaths((walkingSet.east || []).map((file) => toAssetPath(`./game_assets/enemies/${dir}`, file))),
      walkW: normalizeUniqueAssetPaths((walkingSet.west || []).map((file) => toAssetPath(`./game_assets/enemies/${dir}`, file))),
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

export async function buildEnemyFromConvention(dir) {
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

// ─── Sprite preloading ───

export async function preloadHeroSprites(hero) {
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

export async function preloadEnemySprites(enemy) {
  const preloadList = [enemy.sprite.idleE, enemy.sprite.idleW, ...enemy.sprite.walkE, ...enemy.sprite.walkW].filter(
    Boolean,
  );
  await Promise.all(preloadList.map((path) => loadImage(path).catch(() => null)));
}

export async function preloadSelectedHeroSprites() {
  const hero = state.heroes[state.selectedHeroIndex] || state.heroes[0];
  if (!hero) {
    return;
  }
  await preloadHeroSprites(hero);
}

export async function preloadEnemiesForLevel(levelIndex) {
  const level = state.levels[levelIndex];
  if (!level) {
    return;
  }
  const biomeId = level.biomeId;
  const targetedEnemies = state.enemies.filter((enemy) => enemy.biomeHint === biomeId);
  await Promise.all(targetedEnemies.map((enemy) => preloadEnemySprites(enemy)));
}

export async function preloadConfigAssetImages(config) {
  const paths = new Set();

  for (const biome of Object.values(config.biomes || {})) {
    for (const tile of biome.tiles || []) {
      if (tile.path) {
        paths.add(tile.path);
      }
    }
  }
  for (const biomeId of Object.keys(config.biomes || {})) {
    for (const tile of buildGroundStyleTiles(biomeId)?.all || []) {
      if (tile.path) {
        paths.add(tile.path);
      }
    }
  }
  for (const styleId of PLATFORM_STYLE_IDS) {
    for (const tile of buildPlatformStyleTiles(styleId)?.platformTiles || []) {
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

export async function preloadLevelAssetImages(level) {
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

export async function preloadParallaxBackgrounds() {
  const paths = [...new Set(Object.values(BIOME_PARALLAX_BACKGROUNDS))];
  await Promise.all(paths.map((path) => loadImage(path).catch(() => null)));
}

export async function preloadBossAssets() {
  const paths = [...BOSS_DRAGON_ATTACK_SW_FRAMES, BOSS_FALLBACK_DRAGON_FRAME];
  await Promise.all(paths.map((path) => loadImage(path).catch(() => null)));
}

// ─── Background warmup ───

export function scheduleBackgroundWarmup(config) {
  window.setTimeout(() => {
    preloadEnemiesForLevel(0).catch(() => null);
    preloadConfigAssetImages(config).catch(() => null);
    preloadParallaxBackgrounds().catch(() => null);
    preloadBossAssets().catch(() => null);
    Promise.all(state.heroes.map((hero) => preloadHeroSprites(hero))).catch(() => null);
    Promise.all(state.enemies.map((enemy) => preloadEnemySprites(enemy))).catch(() => null);
  }, 0);
}

// ─── UI assets ───

export async function setupUiAssets(config) {
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

// ─── Config loading ───

export function makeFallbackBiome(biomeId, hasFourDetailTiles) {
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

export function buildFallbackConfig() {
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

export async function loadConfig() {
  try {
    return await fetchJson("./level_generation_config.json");
  } catch (error) {
    console.warn("Config fetch failed, using fallback config:", error);
    _updateHudInfo?.();
    return buildFallbackConfig();
  }
}

// ─── Hero / Enemy roster loading ───

export async function loadHeroes() {
  const heroes = [];
  const canFetchMetadata = window.location.protocol !== "file:";

  await Promise.all(
    KNOWN_HERO_DIRS.map(async (dir) => {
      const metadataPath = `./game_assets/heroes/${dir}/metadata.json`;
      const metadata = canFetchMetadata ? await fetchJson(metadataPath).catch(() => null) : null;

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

export async function loadEnemies() {
  const enemies = [];
  const canFetchMetadata = window.location.protocol !== "file:";

  await Promise.all(
    KNOWN_ENEMY_DIRS.map(async (dir) => {
      const metadataPath = `./game_assets/enemies/${dir}/metadata.json`;
      const metadata = canFetchMetadata ? await fetchJson(metadataPath).catch(() => null) : null;

      const enemy = metadata ? await buildEnemyFromMetadata(dir, metadata) : await buildEnemyFromConvention(dir);
      if (!enemy) {
        return;
      }
      enemies.push(enemy);
    }),
  );

  state.enemies = enemies;
}

export function ensureEmergencyRoster() {
  if (!state.heroes.length) {
    const fallbackHeroId = KNOWN_HERO_DIRS[0] || "paladin";
    console.warn(`[startup] No heroes found, using emergency fallback hero: ${fallbackHeroId}`);
    state.heroes.push({
      id: fallbackHeroId,
      name: formatHeroName(fallbackHeroId),
      size: { width: 56, height: 56 },
      sprite: {
        idleSE: normalizeAssetPath(`game_assets/heroes/${fallbackHeroId}/rotations/south-east.png`),
        idleSW: normalizeAssetPath(`game_assets/heroes/${fallbackHeroId}/rotations/south-west.png`),
        runSE: [],
        runSW: [],
        jumpSE: [],
        jumpSW: [],
      },
    });
  }

  if (!state.enemies.length) {
    const fallbackEnemyId = KNOWN_ENEMY_DIRS[0] || "desert-mummy";
    console.warn(`[startup] No enemies found, using emergency fallback enemy: ${fallbackEnemyId}`);
    state.enemies.push({
      id: fallbackEnemyId,
      name: fallbackEnemyId,
      biomeHint: fallbackEnemyId.split("-")[0],
      size: { width: 48, height: 48 },
      sprite: {
        idleE: normalizeAssetPath(`game_assets/enemies/${fallbackEnemyId}/rotations/east.png`),
        idleW: normalizeAssetPath(`game_assets/enemies/${fallbackEnemyId}/rotations/west.png`),
        walkE: [],
        walkW: [],
      },
    });
  }
}

export function enforceMinimumJumpHeight() {
  const minHeightPx = (state.tileSize || 32) * MIN_PLAYER_JUMP_HEIGHT_TILES;
  const requiredJumpVelocity = -Math.sqrt(2 * GAME.gravity * minHeightPx);
  // Keep existing tuning unless it is weaker than the requested minimum.
  GAME.jumpVelocity = Math.min(GAME.jumpVelocity, requiredJumpVelocity);
}

// ─── Tile helpers (internal) ───

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

export function getTileCodeFromPath(path) {
  if (!path) {
    return null;
  }
  const match = String(path).match(/_(\d+)\.png$/);
  return match ? Number(match[1]) : null;
}

// ─── Biome index ───

export function buildBiomeIndex(config) {
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
    const groundStyleTiles = buildGroundStyleTiles(biomeId);
    const fallbackSurfaceGround = allTiles.filter((tile) => {
      const code = getTileCodeFromPath(tile?.path);
      return code != null && code >= 1 && code <= 4;
    });
    const fallbackMiddleGround = allTiles.filter((tile) => {
      const code = getTileCodeFromPath(tile?.path);
      return code != null && code >= 5 && code <= 8;
    });
    const fallbackDeepGround = allTiles.filter((tile) => {
      const code = getTileCodeFromPath(tile?.path);
      return code != null && code >= 9 && code <= 12;
    });
    const fallbackMountain = allTiles.filter((tile) => {
      const code = getTileCodeFromPath(tile?.path);
      return code != null && code >= 13 && code <= 16;
    });

    // Use the dedicated *-ground.png tile at the tiles root for ground & mountains.
    const biomeGroundTile = {
      id: `${biomeId}_ground`,
      path: `game_assets/tiles/${biomeId}-ground.png`,
      collision: "solid",
    };

    biomes[biomeId] = {
      id: biomeId,
      tilesetDir: biomeData.tileset_dir,
      defaultSurface: biomeGroundTile,
      defaultFill: biomeGroundTile,
      groundLineTile: biomeGroundTile,
      groundTile: biomeGroundTile,
      surfaceTiles,
      surfaceLeftTiles: leftSurfaceTiles.length ? leftSurfaceTiles : surfaceTiles,
      surfaceMidTiles: midSurfaceTiles.length ? midSurfaceTiles : surfaceTiles,
      surfaceRightTiles: rightSurfaceTiles.length ? rightSurfaceTiles : surfaceTiles,
      slopeTiles: mapIds(biomeData.tile_catalog?.slopes),
      subsurfaceTiles: mapIds(biomeData.tile_catalog?.subsurface),
      detailTiles: mapIds(biomeData.tile_catalog?.detail_overlay),
      terrainTiles: {
        styleId: groundStyleTiles?.styleId || null,
        surface: groundStyleTiles?.surface?.length ? groundStyleTiles.surface : fallbackSurfaceGround,
        middle: groundStyleTiles?.middle?.length ? groundStyleTiles.middle : fallbackMiddleGround,
        deep: groundStyleTiles?.deep?.length ? groundStyleTiles.deep : fallbackDeepGround,
        mountain: groundStyleTiles?.mountain?.length ? groundStyleTiles.mountain : fallbackMountain,
        all: groundStyleTiles?.all?.length
          ? groundStyleTiles.all
          : [...fallbackSurfaceGround, ...fallbackMiddleGround, ...fallbackDeepGround, ...fallbackMountain],
      },
      simplePlatformTiles: simpleByCode,
      groundDecorTiles,
    };
  }
  state.biomes = biomes;
}

function buildGroundStyleTiles(biomeId) {
  const styleId = GROUND_TILE_STYLE_BY_BIOME[biomeId] || null;
  const prefix = styleId ? GROUND_TILE_PREFIX_BY_STYLE[styleId] : null;
  if (!styleId || !prefix) {
    return null;
  }

  const byRow = { 1: [], 2: [], 3: [], 4: [] };
  const all = [];
  let index = 1;
  for (let row = 1; row <= 4; row += 1) {
    for (let col = 1; col <= 4; col += 1) {
      const tile = {
        id: `${biomeId}_ground_r${pad2(row)}_c${pad2(col)}`,
        path: `game_assets/ground/${styleId}/${prefix}_tile_r${pad2(row)}_c${pad2(col)}_${pad2(index)}.png`,
      };
      all.push(tile);
      byRow[row].push(tile);
      index += 1;
    }
  }

  return {
    styleId,
    all,
    surface: byRow[1],
    middle: byRow[2],
    deep: byRow[3],
    mountain: byRow[4],
  };
}

function buildPlatformStyleTiles(styleId) {
  const prefix = PLATFORM_TILE_PREFIX_BY_STYLE[styleId] || null;
  if (!prefix) {
    return null;
  }

  const tiles = [];
  let index = 1;
  for (let row = 1; row <= 4; row += 1) {
    for (let col = 1; col <= 4; col += 1) {
      tiles.push({
        id: `platform_${styleId}_r${pad2(row)}_c${pad2(col)}`,
        path: `game_assets/platforms/${styleId}/${prefix}_tile_r${pad2(row)}_c${pad2(col)}_${pad2(index)}.png`,
      });
      index += 1;
    }
  }

  return { id: styleId, platformTiles: tiles };
}
