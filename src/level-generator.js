import {
  GAME, GROUND_THICKNESS_TILES, GROUND_SURFACE_VARIATION_MAX_UP, GROUND_SURFACE_VARIATION_MAX_DOWN,
  ENEMY_MOVE_SPEED, ENEMY_SCALE, ENEMY_HITBOX_WIDTH_RATIO, ENEMY_HITBOX_HEIGHT_RATIO,
  ENEMY_MIN_HITBOX_W, ENEMY_MAX_HITBOX_W, ENEMY_MIN_HITBOX_H, ENEMY_MAX_HITBOX_H,
  PLAYER_HITBOX_HEIGHT, BONUS_MIN_SUPPORT_GAP_TILES, BONUS_MAX_SUPPORT_GAP_TILES,
  FIXED_LEVEL_BIOME_ORDER, GENERATION_PROFILES,
  getGenerationProfileSettings,
} from "./constants.js";
import { mulberry32, randInt, createRunSeed, clamp, setTile, buildWeightedBiomeList, weightedPick, weightedPickByKey } from "./utils.js";
import { state } from "./state.js";
import { getManifestHitbox } from "./sprite-manifest.js";

// Local helpers to avoid circular dependency on physics.js
function isSolidTile(tile) {
  if (!tile) return false;
  return String(tile.collision || "solid").toLowerCase() !== "none";
}

function isOneWayPlatformTile(tile) {
  if (tile?.groundSolid) return false;
  const code = getTileCodeFromPath(tile?.path);
  return code != null && code >= 10 && code <= 15;
}

function getTileCodeFromPath(path) {
  if (!path) return null;
  const match = String(path).match(/_(\d+)\.png$/);
  return match ? Number(match[1]) : null;
}

export function generateLevelsFromConfig(config) {
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

export function generateSingleLevel({ index, seed, biomeId, widthTiles, heightTiles, bonusDensity, decoDensity }) {
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
  // Validate hole widths: ensure every gap is jumpable.
  validateJumpableHoles(tileGrid, holes, groundY, groundTile);

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

/**
 * Validate that every hole is jumpable given the player physics.
 * If a hole is too wide, fill tiles from the right side until it's clearable.
 * Modifies tileGrid and holes array in place.
 */
function validateJumpableHoles(tileGrid, holes, groundY, groundTile) {
  // Max jumpable distance in tiles, derived from physics:
  // airtime = 2 * |jumpVelocity| / gravity (symmetric parabola)
  // horizontalRange = moveSpeed * airtime + coyoteTime bonus
  const airtime = 2 * Math.abs(GAME.jumpVelocity) / GAME.gravity;
  const coyoteBonus = 0.08 * GAME.moveSpeed;
  const maxJumpPixels = GAME.moveSpeed * airtime + coyoteBonus;
  const tileSize = Math.max(1, state.tileSize || 64);
  // Subtract 1 tile for safety margin (player needs to land fully, not at the edge).
  const maxJumpTiles = Math.max(1, Math.floor(maxJumpPixels / tileSize) - 1);

  for (let i = holes.length - 1; i >= 0; i -= 1) {
    const hole = holes[i];
    const width = hole.end - hole.start + 1;
    if (width <= maxJumpTiles) {
      continue;
    }
    // Fill from the right to shrink the hole.
    for (let x = hole.start + maxJumpTiles; x <= hole.end; x += 1) {
      setGroundColumn(tileGrid, x, groundY, groundTile);
    }
    hole.end = hole.start + maxJumpTiles - 1;
  }
  // Remove degenerate holes (width <= 0).
  for (let i = holes.length - 1; i >= 0; i -= 1) {
    if (holes[i].end < holes[i].start) {
      holes.splice(i, 1);
    }
  }
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
  const minPassUnderGapTiles = getBonusMinPassUnderGapTiles();
  const lanePassUnder = clamp(groundY - minPassUnderGapTiles, 2, tileGrid.length - 3);
  const laneHigher = clamp(lanePassUnder - 1, 2, tileGrid.length - 3);

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
  const minGapTiles = getBonusMinPassUnderGapTiles();
  const maxY = clamp(groundY, blockY + 1, tileGrid.length - 1);
  const minX = Math.max(1, blockX - 1);
  const maxX = Math.min(tileGrid[0].length - 2, blockX + 1);

  for (let supportX = minX; supportX <= maxX; supportX += 1) {
    for (let supportY = blockY + 1; supportY <= maxY; supportY += 1) {
      if (!isSolidTile(tileGrid[supportY]?.[supportX])) {
        continue;
      }

      const gapTiles = supportY - blockY;
      if (gapTiles < minGapTiles || gapTiles > BONUS_MAX_SUPPORT_GAP_TILES) {
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

function getBonusMinPassUnderGapTiles() {
  const tileSize = Math.max(1, state.tileSize || 32);
  const playerHeightTiles = Math.ceil(PLAYER_HITBOX_HEIGHT / tileSize);
  return Math.max(BONUS_MIN_SUPPORT_GAP_TILES, playerHeightTiles + 1);
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

export function getEnemyHitboxSize(enemyDef) {
  // Use manifest content bounds for accurate hitbox when available.
  const idlePath = enemyDef?.sprite?.idleE || enemyDef?.sprite?.idleW;
  if (idlePath) {
    const mbox = getManifestHitbox(idlePath, ENEMY_SCALE);
    if (mbox) {
      return {
        w: clamp(mbox.w, ENEMY_MIN_HITBOX_W, ENEMY_MAX_HITBOX_W),
        h: clamp(mbox.h, ENEMY_MIN_HITBOX_H, ENEMY_MAX_HITBOX_H),
      };
    }
  }
  // Fallback: ratio-based estimation from sprite canvas size.
  const spriteW = (enemyDef?.size?.width || 48) * ENEMY_SCALE;
  const spriteH = (enemyDef?.size?.height || 48) * ENEMY_SCALE;
  return {
    w: clamp(Math.round(spriteW * ENEMY_HITBOX_WIDTH_RATIO), ENEMY_MIN_HITBOX_W, ENEMY_MAX_HITBOX_W),
    h: clamp(Math.round(spriteH * ENEMY_HITBOX_HEIGHT_RATIO), ENEMY_MIN_HITBOX_H, ENEMY_MAX_HITBOX_H),
  };
}
