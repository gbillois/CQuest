// ─── Level Generator (Redesigned) ───
// Block-based procedural generation with level shapes, anti-monotony,
// mandatory points of interest, and integrated conjugation mechanics.

import {
  GAME, GROUND_THICKNESS_TILES, GROUND_SURFACE_VARIATION_MAX_UP, GROUND_SURFACE_VARIATION_MAX_DOWN,
  ENEMY_MOVE_SPEED, ENEMY_SCALE, ENEMY_HITBOX_WIDTH_RATIO, ENEMY_HITBOX_HEIGHT_RATIO,
  ENEMY_MIN_HITBOX_W, ENEMY_MAX_HITBOX_W, ENEMY_MIN_HITBOX_H, ENEMY_MAX_HITBOX_H,
  ANIMAL_MIN_HITBOX_W, ANIMAL_MAX_HITBOX_W, ANIMAL_MIN_HITBOX_H, ANIMAL_MAX_HITBOX_H,
  PLAYER_HITBOX_HEIGHT, BONUS_MIN_SUPPORT_GAP_TILES, BONUS_MAX_SUPPORT_GAP_TILES,
  PLATFORM_STYLE_IDS, PLATFORM_TILE_PREFIX_BY_STYLE,
  PLATFORM_TILE_ROWS_BY_STYLE, PLATFORM_TILE_COLS_BY_STYLE, PLATFORM_TILE_INCLUDE_INDEX_BY_STYLE,
  FIXED_LEVEL_BIOME_ORDER, GENERATION_PROFILES,
  BIOME_ANIMAL_IDS_BY_BIOME, BIOME_ENEMY_IDS_BY_BIOME, BIOME_SKY_BIRD_IDS,
  SKY_BIRD_SCALE, SKY_BIRD_COUNT_MIN, SKY_BIRD_COUNT_MAX,
  CROW_SPEED, CROW_SWOOP_AMPLITUDE, CROW_SWOOP_FREQUENCY,
  SPARROW_SPEED, SPARROW_SWOOP_AMPLITUDE, SPARROW_SWOOP_FREQUENCY,
  SKY_BIRD_UTURN_MIN_INTERVAL,
  getGenerationProfileSettings,
} from "./constants.js";
import { mulberry32, randInt, createRunSeed, clamp, setTile, buildWeightedBiomeList, weightedPick, weightedPickByKey } from "./utils.js";
import { state } from "./state.js";
import { getManifestHitbox } from "./sprite-manifest.js";
import {
  getLevelShape, sampleCurve, generateBlockSequence, getBlockWidth,
  scoreLevelDesign, BLOCK_EMOTIONS, THEME_PARTICLES,
} from "./level-design.js";

// ─── Tile helpers (local copies to avoid circular deps) ───

function isSolidTile(tile) {
  if (!tile) return false;
  return String(tile.collision || "solid").toLowerCase() !== "none";
}

function isOneWayPlatformTile(tile) {
  if (tile?.groundSolid) return false;
  if (tile?.oneWayPlatform || tile?.walkable_top) return true;
  const code = getTileCodeFromPath(tile?.path);
  return code != null && code >= 10 && code <= 15;
}

function getTileCodeFromPath(path) {
  if (!path) return null;
  const match = String(path).match(/_(\d+)\.png$/);
  return match ? Number(match[1]) : null;
}

// ─── Public API ───

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

    // Wider height range to support vertical shapes.
    const widthTiles = clamp(Math.round(baseSize.width * 1.05) + i * 14, 120, 230);
    const heightTiles = clamp(Math.round(baseSize.height * 0.85), 28, 42);

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
  const useNewTileStyle = state.tileStyleMode !== "basic";
  const tileGrid = Array.from({ length: heightTiles }, () => Array(widthTiles).fill(null));
  const pathNodes = [];
  const platformRails = [];
  const baseGroundY = heightTiles - 4;
  const groundTile = useNewTileStyle
    ? createGroundTileSource({ biome, rand, groundY: baseGroundY })
    : biome.groundLineTile || biome.defaultSurface || biome.groundTile || biome.defaultFill;
  const startCastleTileX = 4;
  const towerTileX = Math.floor(widthTiles * 0.5);
  const castleTileX = widthTiles - 7;
  const playableStart = 14;
  const playableEnd = castleTileX - 12;

  // Fill base ground.
  for (let x = 0; x < widthTiles; x += 1) {
    setGroundColumn(tileGrid, x, baseGroundY, heightTiles, groundTile);
  }

  const reservedRanges = [
    { min: 0, max: 15 },
    { min: towerTileX - 9, max: towerTileX + 9 },
    { min: castleTileX - 13, max: widthTiles - 1 },
  ];
  const platformStyles = useNewTileStyle ? buildPlatformStylePool() : [];
  const platformStyleById = new Map(platformStyles.map((style) => [style.id, style]));
  const forcedPlatformStyleQueue = platformStyles.map((style) => style.id);
  for (let i = forcedPlatformStyleQueue.length - 1; i > 0; i -= 1) {
    const j = randInt(rand, 0, i);
    [forcedPlatformStyleQueue[i], forcedPlatformStyleQueue[j]] = [forcedPlatformStyleQueue[j], forcedPlatformStyleQueue[i]];
  }
  const usedPlatformStyleIds = new Set();
  const platformThemeIds = platformStyles.length ? platformStyles.map((style) => style.id) : getPlatformThemeIds(biomeId);
  const allowGroundHoles = generation.allowGroundHoles;
  let holes = [];

  // ─── Level Shape: compute ground height variation ───
  const shape = getLevelShape(index);
  const maxHeightVariation = Math.min(3, Math.floor((heightTiles - 10) / 2));

  // Apply terrain shape: vary ground height based on level shape curve.
  for (let x = playableStart; x <= playableEnd; x += 1) {
    if (intersectsRanges(x, x, reservedRanges)) continue;
    const progress = (x - playableStart) / Math.max(1, playableEnd - playableStart);
    const heightOffset = Math.round(sampleCurve(shape.heightCurve, progress) * maxHeightVariation);
    const localGroundY = clamp(baseGroundY - heightOffset, 6, heightTiles - 4);

    // Clear old ground, set new.
    for (let dy = 0; dy < GROUND_THICKNESS_TILES + maxHeightVariation + 2; dy++) {
      const y = baseGroundY - maxHeightVariation - 1 + dy;
      if (y >= 0 && y < heightTiles && tileGrid[y]) {
        tileGrid[y][x] = null;
      }
    }
    setGroundColumn(tileGrid, x, localGroundY, heightTiles, groundTile);
  }

  // ─── Block-Based Generation ───
  const playableWidth = playableEnd - playableStart;
  const avgBlockWidth = 14;
  const segmentCount = clamp(Math.floor(playableWidth / avgBlockWidth), 5, 16);
  const blockSequence = generateBlockSequence({
    levelIndex: index,
    segmentCount,
    rand,
    generationProfile: state.generationProfile,
  });

  // Allocate space for each block.
  const segments = [];
  let cursor = playableStart;
  for (let i = 0; i < blockSequence.length; i++) {
    const remaining = playableEnd - cursor;
    const remainingBlocks = blockSequence.length - i;
    const avgRemaining = Math.floor(remaining / remainingBlocks);
    const blockWidth = getBlockWidth(blockSequence[i], Math.min(avgRemaining + 4, remaining), rand);
    const segStart = cursor;
    const segEnd = Math.min(cursor + blockWidth - 1, playableEnd);
    const progress = (segStart - playableStart) / Math.max(1, playableWidth);

    segments.push({
      blockId: blockSequence[i],
      startX: segStart,
      endX: segEnd,
      progress,
      difficulty: sampleCurve(shape.difficultyCurve, progress),
      heightValue: sampleCurve(shape.heightCurve, progress),
    });
    cursor = segEnd + 1;
    if (cursor >= playableEnd) break;
  }

  // Get local ground Y at a given x.
  const getLocalGroundY = (x) => {
    for (let y = 0; y < heightTiles; y++) {
      if (isSolidTile(tileGrid[y]?.[x]) && tileGrid[y][x]?.groundSolid) {
        return y;
      }
    }
    return baseGroundY;
  };

  // ─── Build Each Block ───
  const blockMetadata = []; // For debug overlay.

  // Max jump height in tiles (used to ensure platforms are reachable).
  const _maxJumpHeightPx = (GAME.jumpVelocity * GAME.jumpVelocity) / (2 * GAME.gravity);
  const _maxJumpHeightTiles = Math.max(1, Math.floor(_maxJumpHeightPx / Math.max(1, state.tileSize)));
  const PLATFORM_MIN_GROUND_CLEARANCE_TILES = 2;
  const PLATFORM_STACK_MIN_VERTICAL_SEPARATION_TILES = 2;
  const PLATFORM_STACK_MIN_OVERLAP_TILES = 2;

  const pickPlatformTheme = (forceStyleId = null) => {
    if (!platformStyles.length) {
      return null;
    }
    if (forceStyleId && platformStyleById.has(forceStyleId)) {
      return platformStyleById.get(forceStyleId);
    }
    while (forcedPlatformStyleQueue.length) {
      const nextId = forcedPlatformStyleQueue.shift();
      if (nextId && platformStyleById.has(nextId)) {
        return platformStyleById.get(nextId);
      }
    }
    return platformStyles[randInt(rand, 0, platformStyles.length - 1)];
  };

  const railOverlapLength = (aStart, aEnd, bStart, bEnd) => {
    const from = Math.max(aStart, bStart);
    const to = Math.min(aEnd, bEnd);
    return Math.max(0, to - from + 1);
  };

  const hasEnoughGroundClearance = (startX, endX, railY) => {
    for (let x = startX; x <= endX; x += 1) {
      const localGroundY = getLocalGroundY(x);
      if (localGroundY - railY < PLATFORM_MIN_GROUND_CLEARANCE_TILES) {
        return false;
      }
    }
    return true;
  };

  const hasStackedRailConflict = (startX, endX, railY) => {
    for (const rail of platformRails) {
      const overlap = railOverlapLength(startX, endX, rail.start, rail.end);
      if (overlap < PLATFORM_STACK_MIN_OVERLAP_TILES) {
        continue;
      }
      if (Math.abs(rail.y - railY) <= PLATFORM_STACK_MIN_VERTICAL_SEPARATION_TILES) {
        return true;
      }
    }
    return false;
  };

  const resolveRailYWithoutStacking = (preferredY, startX, endX, minY, maxY) => {
    const offsets = [0, -1, 1, -2, 2, -3, 3];
    const tested = new Set();
    for (const offset of offsets) {
      const candidateY = clamp(preferredY + offset, minY, maxY);
      if (tested.has(candidateY)) {
        continue;
      }
      tested.add(candidateY);
      if (!hasEnoughGroundClearance(startX, endX, candidateY)) {
        continue;
      }
      if (hasStackedRailConflict(startX, endX, candidateY)) {
        continue;
      }
      return candidateY;
    }
    return null;
  };

  const addPlatformRail = ({ startX, y, length, segmentType, isSecret, forceStyleId = null }) => {
    if (length < 2) return null;
    const maxRailY = Math.max(2, baseGroundY - 2);
    let railY = clamp(y, 2, maxRailY);
    const endX = startX + length - 1;
    if (startX < 1 || endX >= widthTiles - 1) return null;
    if (intersectsRanges(startX, endX, reservedRanges)) return null;

    // Ensure the platform is reachable: find the nearest solid surface below
    // (another platform or the ground) and clamp height to max jump distance.
    const midX = startX + Math.floor(length / 2);
    let nearestSolidBelow = getLocalGroundY(midX);
    for (let scanY = railY + 1; scanY < nearestSolidBelow; scanY++) {
      if (isSolidTile(tileGrid[scanY]?.[midX])) {
        nearestSolidBelow = scanY;
        break;
      }
    }
    const minAllowedY = nearestSolidBelow - _maxJumpHeightTiles;
    if (railY < minAllowedY) {
      railY = minAllowedY;
    }
    const minRailY = clamp(minAllowedY, 2, maxRailY);
    railY = clamp(railY, minRailY, maxRailY);

    const resolvedY = resolveRailYWithoutStacking(railY, startX, endX, minRailY, maxRailY);
    if (resolvedY == null) {
      return null;
    }
    railY = resolvedY;

    const theme = pickPlatformTheme(forceStyleId) || pickMarioPlatformTheme({ biomeId, fallbackBiome: biome, xTile: startX, castleTileX, segmentType, rand });
    placePlatform(tileGrid, theme, startX, railY, length, rand);
    const rail = { start: startX, end: endX, y: railY, themeId: theme.id || biomeId, isSecret: !!isSecret };
    platformRails.push(rail);
    if (theme?.id && platformStyleById.has(theme.id)) {
      usedPlatformStyleIds.add(theme.id);
    }
    return rail;
  };

  const tryCreateHole = (holeStart, holeWidth) => {
    if (!allowGroundHoles) return false;
    const holeEnd = holeStart + holeWidth - 1;
    if (holeStart < playableStart || holeEnd > playableEnd) return false;
    if (intersectsRanges(holeStart, holeEnd, reservedRanges)) return false;
    const localGY = getLocalGroundY(holeStart);
    if (!tileGrid[localGY]?.[holeStart - 1] || !tileGrid[localGY]?.[holeEnd + 1]) return false;
    if (holes.some((hole) => holeStart <= hole.end + 3 && holeEnd >= hole.start - 3)) return false;
    for (let x = holeStart; x <= holeEnd; x += 1) {
      const gy = getLocalGroundY(x);
      clearGroundColumn(tileGrid, x, gy, heightTiles);
    }
    holes.push({ start: holeStart, end: holeEnd });
    return true;
  };

  // Special elements tracked for level output.
  const conjugationGates = [];
  const secretZones = [];
  const movingPlatforms = [];
  const crumblingPlatforms = [];
  const particles = THEME_PARTICLES[biomeId] || THEME_PARTICLES.forest;
  let lastPlatformHeight = null;
  let sameHeightCount = 0;

  for (const seg of segments) {
    const { blockId, startX, endX, progress, difficulty, heightValue } = seg;
    const segWidth = endX - startX + 1;
    const segMidX = Math.floor((startX + endX) / 2);
    const localGY = getLocalGroundY(segMidX);

    blockMetadata.push({
      blockId,
      startX,
      endX,
      emotion: BLOCK_EMOTIONS[blockId] || "neutral",
      difficulty,
      category: getBlockCategory(blockId),
    });

    // ─── Build block by type ───
    switch (blockId) {

      case "rest_zone": {
        // Wide flat area with easy collectibles. No holes, no enemies.
        // Just ensure ground is solid and add a wide platform.
        if (segWidth >= 6) {
          addPlatformRail({ startX: startX + 2, y: localGY - 3, length: Math.min(4, segWidth - 4), segmentType: "rest" });
        }
        break;
      }

      case "broken_stairs": {
        // Ascending platforms with increasing gaps.
        const steps = clamp(Math.floor(difficulty * 1.5) + 2, 3, 5);
        let stepX = startX + 1;
        let stepY = localGY - 2;
        for (let s = 0; s < steps && stepX < endX - 2; s++) {
          const len = randInt(rand, 2, 3);
          addPlatformRail({ startX: stepX, y: stepY, length: len, segmentType: "stairs" });
          stepX += len + clamp(s + 1, 1, 3); // Gap increases.
          stepY = clamp(stepY - 1, localGY - 3, localGY - 2);
        }
        break;
      }

      case "crumbling_bridge": {
        // Platforms over a hole. Mark them as crumbling.
        const bridgeStart = startX + 2;
        const bridgeEnd = Math.min(endX - 2, bridgeStart + 12);
        const bridgeY = localGY - 2;
        // Create hole underneath.
        for (let x = bridgeStart; x <= bridgeEnd; x++) {
          tryCreateHole(x, 1);
        }
        // Place crumbling platforms.
        const platCount = clamp(Math.floor(difficulty * 1.5) + 3, 3, 6);
        const spacing = Math.max(2, Math.floor((bridgeEnd - bridgeStart) / platCount));
        for (let p = 0; p < platCount; p++) {
          const px = bridgeStart + p * spacing;
          if (px > bridgeEnd - 1) break;
          const rail = addPlatformRail({ startX: px, y: bridgeY, length: 2, segmentType: "crumbling" });
          if (!rail) {
            continue;
          }
          const tilePaths = [];
          for (let ti = 0; ti < 2; ti++) {
            tilePaths.push(tileGrid[rail.y]?.[rail.start + ti]?.path || null);
          }
          crumblingPlatforms.push({
            x: rail.start, y: rail.y, width: 2,
            disappearDelay: clamp(1.2 - difficulty * 0.15, 0.4, 1.2),
            tilePaths,
          });
        }
        break;
      }

      case "controlled_descent": {
        // Series of small platforms going down.
        const steps = clamp(Math.floor(difficulty) + 2, 3, 5);
        let stepX = startX + 1;
        let stepY = localGY - 3;
        for (let s = 0; s < steps && stepX < endX - 2; s++) {
          const len = randInt(rand, 2, 3);
          addPlatformRail({ startX: stepX, y: stepY, length: len, segmentType: "descent" });
          stepX += len + randInt(rand, 1, 2);
          stepY = clamp(stepY + randInt(rand, 1, 2), stepY, localGY - 1);
        }
        break;
      }

      case "canyon_crossing": {
        // Big hole with a moving platform.
        const gapWidth = clamp(Math.floor(difficulty * 2) + 4, 5, 10);
        const gapStart = clamp(segMidX - Math.floor(gapWidth / 2), startX + 2, endX - gapWidth - 1);
        for (let x = gapStart; x < gapStart + gapWidth; x++) {
          tryCreateHole(x, 1);
        }
        // Moving platform in the middle.
        const platY = localGY - 2;
        const platX = gapStart + Math.floor(gapWidth / 2) - 1;
        const rail = addPlatformRail({ startX: platX, y: platY, length: 3, segmentType: "canyon" });
        if (!rail) {
          break;
        }
        const canyonTilePaths = [];
        for (let ti = 0; ti < 3; ti++) {
          canyonTilePaths.push(tileGrid[rail.y]?.[rail.start + ti]?.path || null);
        }
        movingPlatforms.push({
          x: rail.start, y: rail.y, width: 3,
          rangeX: gapWidth * state.tileSize * 0.3,
          speed: clamp(40 - difficulty * 5, 20, 45),
          axis: "horizontal",
          tilePaths: canyonTilePaths,
        });
        break;
      }

      case "air_highway": {
        // Long chain of platforms at elevated height.
        const platCount = clamp(Math.floor(difficulty * 2) + 4, 5, 10);
        let chainX = startX + 1;
        let chainY = localGY - clamp(Math.floor(heightValue * 2) + 2, 2, 3);
        for (let p = 0; p < platCount && chainX < endX - 2; p++) {
          const len = randInt(rand, 2, 4);
          addPlatformRail({ startX: chainX, y: chainY, length: len, segmentType: "air" });
          chainX += len + randInt(rand, 1, 2);
          // Anti-monotony: vary height.
          const heightDelta = randInt(rand, -1, 1);
          if (lastPlatformHeight === chainY && sameHeightCount >= 2) {
            chainY = clamp(chainY + (rand() < 0.5 ? -1 : 1), localGY - 3, localGY - 2);
            sameHeightCount = 0;
          } else {
            chainY = clamp(chainY + heightDelta, localGY - 3, localGY - 2);
          }
          if (chainY === lastPlatformHeight) sameHeightCount++;
          else sameHeightCount = 0;
          lastPlatformHeight = chainY;
        }
        break;
      }

      case "pendulum_pass": {
        // Moving platforms in alternating pattern.
        const platCount = clamp(Math.floor(difficulty) + 2, 2, 3);
        const platY = localGY - 3;
        const spacing = Math.floor(segWidth / (platCount + 1));
        for (let p = 0; p < platCount; p++) {
          const px = startX + (p + 1) * spacing;
          const rail = addPlatformRail({ startX: px, y: platY, length: 2, segmentType: "pendulum" });
          if (!rail) {
            continue;
          }
          const pendTilePaths = [];
          for (let ti = 0; ti < 2; ti++) {
            pendTilePaths.push(tileGrid[rail.y]?.[rail.start + ti]?.path || null);
          }
          movingPlatforms.push({
            x: rail.start, y: rail.y, width: 2,
            rangeY: 2 * state.tileSize,
            speed: clamp(35 + difficulty * 5, 30, 55),
            axis: "vertical",
            phase: p * Math.PI / platCount,
            tilePaths: pendTilePaths,
          });
        }
        // Create hole between them for tension.
        if (allowGroundHoles && platCount >= 2) {
          tryCreateHole(startX + spacing + 1, 2);
        }
        break;
      }

      case "cliff_climb": {
        // Zigzag vertical ascent. Each step is 1 tile higher (reachable via jump).
        const levels = clamp(Math.floor(difficulty) + 2, 2, 3);
        let climbY = localGY - 2;
        let leftSide = true;
        for (let l = 0; l < levels; l++) {
          const px = leftSide ? startX + 1 : endX - 3;
          addPlatformRail({ startX: px, y: climbY, length: 3, segmentType: "climb" });
          climbY = clamp(climbY - 1, localGY - 3, localGY - 2);
          leftSide = !leftSide;
        }
        break;
      }

      case "pit_bounce": {
        // Deep pit with a surprise platform.
        const pitCenter = segMidX;
        const pitWidth = clamp(segWidth - 4, 3, 6);
        const pitStart = pitCenter - Math.floor(pitWidth / 2);
        for (let x = pitStart; x < pitStart + pitWidth; x++) {
          tryCreateHole(x, 1);
        }
        // Bounce platform deep in the pit.
        const bounceY = clamp(localGY + 2, localGY, heightTiles - 2);
        addPlatformRail({ startX: pitCenter - 1, y: bounceY, length: 2, segmentType: "bounce" });
        // High platform to land on after bounce.
        addPlatformRail({ startX: pitCenter - 1, y: localGY - 3, length: 3, segmentType: "bounce_landing" });
        break;
      }

      case "guardian_gate": {
        // Keep the traversal shape but without gate mechanics.
        const gateX = segMidX;
        addPlatformRail({ startX: gateX - 3, y: localGY - 3, length: 2, segmentType: "gate_approach" });
        addPlatformRail({ startX: gateX + 2, y: localGY - 3, length: 2, segmentType: "gate_exit" });
        break;
      }

      case "path_choice": {
        // Two paths: upper (harder, shorter) and lower (easier, longer).
        const forkX = startX + 3;
        const mergeX = endX - 3;
        const upperY = localGY - 3;
        const lowerY = localGY - 2;
        // Upper path: fewer, smaller platforms.
        addPlatformRail({ startX: forkX, y: upperY, length: 3, segmentType: "choice_upper" });
        addPlatformRail({ startX: forkX + 5, y: upperY, length: 2, segmentType: "choice_upper" });
        addPlatformRail({ startX: mergeX - 3, y: upperY, length: 3, segmentType: "choice_upper" });
        // Lower path: wider, easier platforms.
        addPlatformRail({ startX: forkX, y: lowerY, length: 4, segmentType: "choice_lower" });
        addPlatformRail({ startX: forkX + 6, y: lowerY, length: 4, segmentType: "choice_lower" });
        addPlatformRail({ startX: mergeX - 4, y: lowerY, length: 4, segmentType: "choice_lower" });
        break;
      }

      case "letter_bridge": {
        // Platforms labeled with letters; wrong ones crumble.
        const bridgeY = localGY - 2;
        const letterCount = clamp(Math.floor(difficulty * 1.5) + 3, 4, 6);
        const totalSlots = letterCount + randInt(rand, 1, 3); // Extra wrong platforms.
        let lx = startX + 2;
        for (let l = 0; l < totalSlots && lx < endX - 1; l++) {
          const rail = addPlatformRail({ startX: lx, y: bridgeY, length: 2, segmentType: "letter" });
          if (!rail) {
            lx += 3;
            continue;
          }
          const isCorrect = l < letterCount;
          if (!isCorrect) {
            const tilePaths = [];
            for (let ti = 0; ti < 2; ti++) {
              tilePaths.push(tileGrid[rail.y]?.[rail.start + ti]?.path || null);
            }
            crumblingPlatforms.push({
              x: rail.start, y: rail.y, width: 2,
              disappearDelay: clamp(0.8 - difficulty * 0.1, 0.3, 1.0),
              isLetterPlatform: true,
              tilePaths,
            });
          }
          lx += 3;
        }
        // Create hole below the bridge.
        for (let x = startX + 2; x <= Math.min(endX - 2, lx); x++) {
          tryCreateHole(x, 1);
        }
        break;
      }

      case "verb_race": {
        // Fast-paced section with collectible letters on platforms.
        const platCount = clamp(Math.floor(difficulty * 2) + 4, 5, 8);
        let rx = startX + 1;
        let ry = localGY - 3;
        for (let p = 0; p < platCount && rx < endX - 2; p++) {
          const len = randInt(rand, 2, 3);
          addPlatformRail({ startX: rx, y: ry, length: len, segmentType: "race" });
          rx += len + 1; // Tight spacing for speed.
          ry = clamp(ry + randInt(rand, -1, 1), localGY - 3, localGY - 2);
        }
        break;
      }

      case "secret_conjugation": {
        // Hidden area accessible by conjugation.
        const secretY = localGY - 3;
        addPlatformRail({ startX: segMidX - 2, y: secretY, length: 4, segmentType: "secret", isSecret: true });
        secretZones.push({
          x: segMidX * state.tileSize,
          y: secretY * state.tileSize,
          tileX: segMidX,
          tileY: secretY,
          type: "conjugation_secret",
          width: 4,
          height: 2,
        });
        break;
      }

      case "conjugation_cascade": {
        // Three mini-platforms in sequence.
        const gateSpacing = Math.floor(segWidth / 4);
        for (let g = 0; g < 3; g++) {
          const gx = startX + (g + 1) * gateSpacing;
          if (gx >= endX - 1) break;
          addPlatformRail({ startX: gx - 1, y: localGY - 3, length: 3, segmentType: "cascade" });
        }
        break;
      }

      case "sprint_corridor": {
        // Low ceiling, ground-level sprint with small holes.
        const ceilingY = localGY - 3;
        // Place ceiling tiles.
        for (let x = startX + 1; x <= endX - 1; x++) {
          if (intersectsRanges(x, x, reservedRanges)) continue;
          setGroundTileAt(tileGrid, x, ceilingY, groundTile);
        }
        // Add 1-2 small holes for tension.
        if (allowGroundHoles && segWidth > 10) {
          tryCreateHole(segMidX - 1, 1);
          if (segWidth > 14) tryCreateHole(segMidX + 3, 1);
        }
        break;
      }

      case "revelation": {
        // Open area with no platforms blocking the view. Wide ground.
        // Just ensure the area is clear and add a bonus platform high up.
        if (segWidth >= 8) {
          addPlatformRail({ startX: segMidX - 2, y: localGY - 3, length: 4, segmentType: "vista" });
        }
        break;
      }

      case "inverted_trap": {
        // Looks dangerous but is safe, or looks safe but has a surprise.
        if (rand() < 0.5) {
          // Fake danger: visual tiles that look like holes but have invisible platforms.
          const fakeHoleX = segMidX - 1;
          // Place platforms right below where a hole appears to be.
          addPlatformRail({ startX: fakeHoleX, y: localGY - 1, length: 3, segmentType: "fake_safe" });
        } else {
          // Hidden challenge: easy-looking flat area with a crumbling section.
          const rail = addPlatformRail({ startX: startX + 2, y: localGY - 2, length: 4, segmentType: "trap" });
          if (!rail || rail.end - rail.start + 1 < 4) {
            break;
          }
          const trapTilePaths = [];
          for (let ti = 0; ti < 2; ti++) {
            trapTilePaths.push(tileGrid[rail.y]?.[rail.start + 1 + ti]?.path || null);
          }
          crumblingPlatforms.push({
            x: rail.start + 1, y: rail.y, width: 2,
            disappearDelay: 0.8,
            isTrap: true,
            tilePaths: trapTilePaths,
          });
        }
        break;
      }

      case "rising_tension": {
        // Progressive challenge: platforms with increasing gaps.
        const platCount = clamp(Math.floor(difficulty * 2) + 3, 4, 7);
        let tx = startX + 1;
        let ty = localGY - 2;
        for (let p = 0; p < platCount && tx < endX - 2; p++) {
          const len = clamp(4 - p, 2, 4); // Platforms shrink.
          addPlatformRail({ startX: tx, y: ty, length: len, segmentType: "tension" });
          const gap = clamp(p + 1, 1, 3); // Gaps grow.
          tx += len + gap;
          ty = clamp(ty - randInt(rand, 0, 1), localGY - 3, localGY - 2);
        }
        // Add holes for escalating danger.
        if (allowGroundHoles) {
          for (let h = 0; h < Math.min(3, platCount - 1); h++) {
            tryCreateHole(startX + 4 + h * 4, clamp(h + 1, 1, 2));
          }
        }
        break;
      }

      case "victory_climb": {
        // Triumphant ascent with bonuses.
        const levels = clamp(Math.floor(difficulty) + 2, 2, 3);
        let vy = localGY - 2;
        let vx = startX + 2;
        const zigzag = segWidth > 10;
        for (let l = 0; l < levels && vx < endX - 2; l++) {
          const px = zigzag ? (l % 2 === 0 ? vx : vx + 4) : vx + l * 2;
          if (px >= endX - 2) break;
          addPlatformRail({ startX: px, y: vy, length: 3, segmentType: "victory" });
          vy = clamp(vy - 1, localGY - 3, localGY - 2);
        }
        break;
      }

      case "hidden_alcove": {
        // Secret area behind the main path.
        const secretY = localGY - 3;
        const alcoveX = segMidX;
        addPlatformRail({ startX: alcoveX - 1, y: secretY, length: 3, segmentType: "secret", isSecret: true });
        secretZones.push({
          x: alcoveX * state.tileSize,
          y: secretY * state.tileSize,
          tileX: alcoveX,
          tileY: secretY,
          type: "alcove",
          width: 3,
          height: 2,
        });
        // Place something on the main path too.
        addPlatformRail({ startX: startX + 1, y: localGY - 2, length: 3, segmentType: "main" });
        break;
      }

      case "reward_shortcut": {
        // Difficult upper path that skips ahead.
        const upperY = localGY - 3;
        // Upper shortcut: small platforms, harder.
        addPlatformRail({ startX: startX + 1, y: upperY, length: 2, segmentType: "shortcut" });
        addPlatformRail({ startX: startX + 5, y: upperY, length: 2, segmentType: "shortcut" });
        addPlatformRail({ startX: endX - 3, y: upperY, length: 2, segmentType: "shortcut" });
        // Lower main path: normal.
        addPlatformRail({ startX: startX + 2, y: localGY - 2, length: 4, segmentType: "main" });
        addPlatformRail({ startX: segMidX, y: localGY - 2, length: 4, segmentType: "main" });
        break;
      }

      case "underground_passage": {
        // Path below ground level.
        const underY = localGY + 1;
        // Clear underground space.
        for (let x = startX + 2; x <= endX - 2; x++) {
          if (intersectsRanges(x, x, reservedRanges)) continue;
          if (underY >= 0 && underY < heightTiles && tileGrid[underY]) {
            tileGrid[underY][x] = null;
          }
          if (underY + 1 >= 0 && underY + 1 < heightTiles && tileGrid[underY + 1]) {
            tileGrid[underY + 1][x] = null;
          }
        }
        // Entrance hole.
        tryCreateHole(startX + 2, 2);
        // Exit hole.
        tryCreateHole(endX - 3, 2);
        secretZones.push({
          x: segMidX * state.tileSize,
          y: underY * state.tileSize,
          tileX: segMidX,
          tileY: underY,
          type: "underground",
          width: endX - startX - 4,
          height: 2,
        });
        break;
      }

      case "skyline_secret": {
        // Very high secret area.
        const skyY = localGY - 3;
        // Hard-to-reach platform.
        addPlatformRail({ startX: segMidX - 1, y: skyY, length: 3, segmentType: "sky_secret", isSecret: true });
        // Stepping stone (barely visible).
        addPlatformRail({ startX: segMidX + 1, y: localGY - 2, length: 2, segmentType: "sky_step" });
        // Main path platform.
        addPlatformRail({ startX: startX + 1, y: localGY - 2, length: 3, segmentType: "main" });
        secretZones.push({
          x: segMidX * state.tileSize,
          y: skyY * state.tileSize,
          tileX: segMidX,
          tileY: skyY,
          type: "skyline",
          width: 3,
          height: 1,
        });
        break;
      }

      default: {
        // Fallback: simple run segment (backward compat).
        if (rand() < 0.85) {
          addPlatformRail({
            startX: clamp(startX + randInt(rand, 2, 4), 1, endX - 3),
            y: localGY - randInt(rand, 2, 3),
            length: randInt(rand, 3, 4),
            segmentType: "run",
          });
        }
        break;
      }
    }
  }

  if (platformStyles.length) {
    const missingStyleIds = platformStyles.map((style) => style.id).filter((id) => !usedPlatformStyleIds.has(id));
    let fallbackOffset = 0;
    for (const missingStyleId of missingStyleIds) {
      let placed = false;
      for (let attempt = 0; attempt < 10 && !placed; attempt += 1) {
        const baseX = playableStart + 8 + fallbackOffset * 10 + attempt * 4;
        const startX = clamp(baseX, 1, playableEnd - 3);
        const y = clamp(baseGroundY - 2 - (attempt % 2), 2, Math.max(2, baseGroundY - 4));
        const before = platformRails.length;
        addPlatformRail({
          startX,
          y,
          length: 3,
          segmentType: "style_balance",
          forceStyleId: missingStyleId,
        });
        placed = platformRails.length > before;
      }
      if (!placed && platformRails.length) {
        const rail = platformRails[randInt(rand, 0, platformRails.length - 1)];
        const style = platformStyleById.get(missingStyleId);
        if (rail && style) {
          placePlatform(tileGrid, style, rail.start, rail.y, rail.end - rail.start + 1, rand);
          rail.themeId = style.id;
          usedPlatformStyleIds.add(style.id);
        }
      }
      fallbackOffset += 1;
    }
  }

  // ─── Late-level density boost (after tower) ───
  const postTowerStart = towerTileX + 10;
  const postTowerWidth = Math.max(0, playableEnd - postTowerStart + 1);
  const extraRailsTarget = clamp(Math.floor(postTowerWidth / 18), 2, 6);
  let extraRailsPlaced = 0;
  let extraRailAttempts = 0;
  while (extraRailsPlaced < extraRailsTarget && extraRailAttempts < extraRailsTarget * 8) {
    extraRailAttempts += 1;
    const railLength = randInt(rand, 3, 6);
    const startX = randInt(rand, postTowerStart, Math.max(postTowerStart, playableEnd - railLength));
    const localGroundY = getLocalGroundY(startX + Math.floor(railLength * 0.5));
    const preferredY = clamp(localGroundY - randInt(rand, 2, 4), 2, Math.max(2, baseGroundY - 2));
    const beforeCount = platformRails.length;
    addPlatformRail({ startX, y: preferredY, length: railLength, segmentType: "post_tower_dense" });
    if (platformRails.length > beforeCount) {
      extraRailsPlaced += 1;
    }
  }

  // ─── Post-Generation: Ground Holes & Validation ───
  if (allowGroundHoles) {
    const targetHoleCount = clamp(
      generation.holeBase + index + Math.floor((playableEnd - playableStart) / 30),
      generation.holeMin,
      generation.holeMax,
    );
    holes = augmentGroundHoles({
      tileGrid, groundY: baseGroundY, startX: playableStart, endX: playableEnd,
      reservedRanges, holes, targetCount: targetHoleCount, rand, heightTiles,
      getLocalGroundY,
    });
    holes = ensurePlayableGroundRoute({
      tileGrid, groundY: baseGroundY, startX: 8, endX: castleTileX - 11,
      groundTile, minGapBetweenHoles: 3, maxHoleWidth: generation.maxHoleWidth,
      heightTiles,
    });
  }
  validateJumpableHoles(tileGrid, holes, baseGroundY, groundTile, heightTiles);

  // ─── Path Nodes ───
  const groundNodes = collectGroundPathNodes(tileGrid, baseGroundY, Math.max(4, playableStart - 6), playableEnd + 1, holes, heightTiles);
  pathNodes.push(...groundNodes);
  for (const rail of platformRails) {
    const railLen = rail.end - rail.start + 1;
    const step = railLen >= 6 ? 2 : 1;
    for (let x = rail.start + 1; x <= rail.end - 1; x += step) {
      pathNodes.push({ x, y: rail.y, kind: rail.isSecret ? "secret" : "air" });
    }
    pathNodes.push({ x: Math.floor((rail.start + rail.end) * 0.5), y: rail.y, kind: rail.isSecret ? "secret" : "air" });
  }
  const finalPathNodes = dedupePathNodes(pathNodes);

  // ─── Enemy Lanes & Spawns ───
  const enemyLanes = [
    ...collectGroundLanes(tileGrid, baseGroundY, Math.max(4, playableStart - 6), playableEnd, reservedRanges, heightTiles),
    ...platformRails
      .filter((rail) => rail.end - rail.start + 1 >= 4 && !rail.isSecret)
      .map((rail) => ({ start: rail.start, end: rail.end, y: rail.y, kind: "platform" })),
  ];

  const start = {
    x: state.tileSize * 8,
    y: baseGroundY * state.tileSize,
  };
  const end = {
    x: (castleTileX - 2) * state.tileSize,
    y: (baseGroundY - 2) * state.tileSize,
    w: state.tileSize * 3,
    h: state.tileSize * 3,
  };

  // ─── Bonus Placement (30%+ off main path) ───
  const bonuses = buildBonusScatter({
    biome, rand, tileGrid, bonusDensity, pathNodes: finalPathNodes,
    groundY: baseGroundY, holes, reservedRanges, platformRails,
    levelIndex: index, secretZones, towerTileX, heightTiles,
  });

  const decorations = [];
  const groundDecorations = buildGroundDecorScatter({
    biome, rand, widthTiles, groundY: baseGroundY, getLocalGroundY, holes, reservedRanges,
  });

  const enemySpawns = buildEnemySpawns({
    biomeId, rand, pathNodes: finalPathNodes, levelIndex: index,
    tileGrid, groundY: baseGroundY, lanes: enemyLanes, generation, towerTileX, heightTiles,
  });
  const towerAnimalLanes = Number.isFinite(towerTileX)
    ? collectGroundLanes(tileGrid, baseGroundY, towerTileX - 8, towerTileX + 6, [], heightTiles)
    : [];
  const castleAnimalLanes = Number.isFinite(castleTileX)
    ? collectGroundLanes(tileGrid, baseGroundY, castleTileX - 12, castleTileX - 3, [], heightTiles)
    : [];
  const animalLanes = [...towerAnimalLanes, ...castleAnimalLanes];
  const animalSpawns = buildAnimalSpawns({ biomeId, rand, lanes: animalLanes, tileGrid, towerTileX, castleTileX });
  const skyBirdSpawns = buildSkyBirdSpawns({ biomeId, rand, groundY: baseGroundY, worldWidth: widthTiles * state.tileSize });
  const guardSpawns = buildGuardSpawns({ groundY: baseGroundY, towerTileX, castleTileX, worldWidth: widthTiles * state.tileSize });
  const levelVerbDatas = state.duel ? state.duel.generateLevelVerbDatas(enemySpawns.length) : [];
  for (let i = 0; i < enemySpawns.length; i += 1) {
    enemySpawns[i].verbData = levelVerbDatas[i] || (state.duel ? state.duel.randomVerbData() : null);
    enemySpawns[i].alive = enemySpawns[i].alive !== false;
    enemySpawns[i].battling = false;
  }

  // ─── Structures ───
  const castleLockedPath =
    state.config.object_pools?.structures?.find((s) => s.id === "castle_locked")?.path ||
    state.config.object_pools?.structures?.find((s) => s.id === "castle_unlocked")?.path || null;
  const castleUnlockedPath =
    state.config.object_pools?.structures?.find((s) => s.id === "castle_unlocked")?.path ||
    state.config.object_pools?.structures?.find((s) => s.id === "castle_locked")?.path || null;
  const structures = {
    start: castleLockedPath,
    end: castleUnlockedPath,
    endLocked: castleLockedPath,
    endUnlocked: castleUnlockedPath,
    tower: state.config.object_pools?.structures?.find((s) => s.id === "tower_main")?.path || null,
  };

  // ─── Quality Score ───
  const designScore = scoreLevelDesign({ widthTiles, heightTiles }, blockSequence);

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
    animalSpawns,
    skyBirdSpawns,
    guardSpawns,
    structures,
    start,
    end,
    groundY: baseGroundY,
    startCastleX: startCastleTileX * state.tileSize,
    towerX: towerTileX * state.tileSize,
    castleX: castleTileX * state.tileSize,
    // New level design data:
    levelShape: shape.id,
    blockSequence,
    blockMetadata,
    conjugationGates,
    secretZones,
    movingPlatforms,
    crumblingPlatforms,
    particles,
    designScore,
  };
}

// ─── Block Category Helper ───

function getBlockCategory(blockId) {
  const categories = {
    broken_stairs: "traversal", crumbling_bridge: "traversal", controlled_descent: "traversal",
    canyon_crossing: "traversal", air_highway: "traversal", pendulum_pass: "traversal",
    cliff_climb: "traversal", pit_bounce: "traversal",
    guardian_gate: "conjugation", path_choice: "conjugation", letter_bridge: "conjugation",
    verb_race: "conjugation", secret_conjugation: "conjugation", conjugation_cascade: "conjugation",
    rest_zone: "rhythm", sprint_corridor: "rhythm", revelation: "rhythm",
    inverted_trap: "rhythm", rising_tension: "rhythm", victory_climb: "rhythm",
    hidden_alcove: "exploration", reward_shortcut: "exploration",
    underground_passage: "exploration", skyline_secret: "exploration",
  };
  return categories[blockId] || "traversal";
}

// ─── Platform Tile Placement (unchanged) ───

function placePlatform(grid, biomeTheme, startX, y, length, rand) {
  for (let i = 0; i < length; i += 1) {
    const x = startX + i;
    if (!grid[y] || x < 0 || x >= grid[0].length) continue;
    const tile = pickPlatformSurfaceTile(biomeTheme, i, length, rand);
    if (!tile) continue;
    setTile(grid, x, y, {
      ...tile,
      oneWayPlatform: true,
      walkable_top: true,
      role: tile.role || "platform_surface",
    });
  }
}

function pickPlatformSurfaceTile(biome, index, length, rand) {
  if (biome?.platformTiles?.length) {
    return biome.platformTiles[randInt(rand, 0, biome.platformTiles.length - 1)] || null;
  }

  const simple = biome?.simplePlatformTiles || {};
  const left = simple[10] || simple[11] || biome.defaultSurface || biome.defaultFill;
  const right = simple[15] || simple[14] || biome.defaultSurface || biome.defaultFill;
  const mids = [simple[11], simple[12], simple[13], simple[14]].filter(Boolean);
  const mid = mids.length ? mids[randInt(rand, 0, mids.length - 1)] : left || right;
  if (length <= 1) return mid;
  if (index === 0) return left;
  if (index === length - 1) return right;
  return mid;
}

function buildPlatformStyleTiles(styleId) {
  const prefix = PLATFORM_TILE_PREFIX_BY_STYLE[styleId] || null;
  if (!prefix) {
    return null;
  }
  const rows = PLATFORM_TILE_ROWS_BY_STYLE[styleId] || 4;
  const cols = PLATFORM_TILE_COLS_BY_STYLE[styleId] || 4;
  const includeIndex = PLATFORM_TILE_INCLUDE_INDEX_BY_STYLE[styleId] !== false;

  const platformTiles = [];
  let index = 1;
  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      const rowId = String(row).padStart(2, "0");
      const colId = String(col).padStart(2, "0");
      const basePath = `game_assets/platforms/${styleId}/${prefix}_tile_r${rowId}_c${colId}`;
      const indexId = String(index).padStart(2, "0");
      platformTiles.push({
        id: `platform_${styleId}_r${rowId}_c${colId}`,
        path: includeIndex ? `${basePath}_${indexId}.png` : `${basePath}.png`,
      });
      index += 1;
    }
  }
  return {
    id: styleId,
    platformTiles,
  };
}

function buildPlatformStylePool() {
  const styles = [];
  for (const styleId of PLATFORM_STYLE_IDS) {
    const style = buildPlatformStyleTiles(styleId);
    if (style?.platformTiles?.length) {
      styles.push(style);
    }
  }
  return styles;
}

function getPlatformThemeIds(localBiomeId) {
  const ordered = [localBiomeId, "castle", "wood"];
  const unique = [];
  for (const id of ordered) {
    if (!id || unique.includes(id)) continue;
    const biome = state.biomes[id];
    if (!biome) continue;
    const simple = biome.simplePlatformTiles || {};
    const hasSimpleSet = Boolean(simple[10] && (simple[11] || simple[12] || simple[13] || simple[14]) && simple[15]);
    if (hasSimpleSet) unique.push(id);
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

  if (progress < 0.7) {
    if (segmentType === "gap_helper" && progress > 0.24 && progress < 0.68 && hasSimplePlatformSet(woodTheme) && rand() < 0.45) {
      return woodTheme;
    }
    return localTheme;
  }
  if (hasSimplePlatformSet(castleTheme)) {
    if (progress >= 0.82) return castleTheme;
    if ((segmentType === "stairs" || segmentType === "platforms") && rand() < 0.65) return castleTheme;
    if (rand() < 0.35) return castleTheme;
  }
  return localTheme;
}

// ─── Ground Management ───

function asGroundSolidTile(tile) {
  return tile ? { ...tile, groundSolid: true } : tile;
}

function createGroundTileSource({ biome, rand, groundY }) {
  const terrain = biome?.terrainTiles || {};
  const allPool = terrain.all?.length
    ? terrain.all
    : [biome?.groundLineTile, biome?.defaultSurface, biome?.groundTile, biome?.defaultFill].filter(Boolean);
  const surfacePool =
    terrain.surface?.length
      ? terrain.surface
      : [biome?.groundLineTile, biome?.defaultSurface, biome?.groundTile, biome?.defaultFill].filter(Boolean);
  const middlePool = terrain.middle?.length ? terrain.middle : surfacePool;
  const deepPool = terrain.deep?.length ? terrain.deep : middlePool;
  const mountainPool = terrain.mountain?.length ? terrain.mountain : surfacePool;
  const fallback = surfacePool[0] || middlePool[0] || deepPool[0] || mountainPool[0] || null;
  const pick = (pool) => {
    if (!pool?.length) {
      return fallback;
    }
    return pool[randInt(rand, 0, pool.length - 1)] || fallback;
  };

  const createVarietyPicker = (pool, { spilloverPool = null, spilloverChance = 0.2 } = {}) => {
    let lastTile = null;
    return () => {
      if (!pool?.length) {
        return fallback;
      }

      let sourcePool = pool;
      if (spilloverPool?.length && rand() < spilloverChance) {
        sourcePool = spilloverPool;
      }

      let nextTile = sourcePool[randInt(rand, 0, sourcePool.length - 1)] || fallback;
      if (sourcePool.length > 1 && lastTile && nextTile === lastTile) {
        for (let attempt = 0; attempt < 3 && nextTile === lastTile; attempt += 1) {
          nextTile = sourcePool[randInt(rand, 0, sourcePool.length - 1)] || fallback;
        }
      }
      lastTile = nextTile;
      return nextTile;
    };
  };

  const pickMountain = createVarietyPicker(mountainPool, { spilloverPool: allPool, spilloverChance: 0.28 });
  const pickSurface = createVarietyPicker(surfacePool, { spilloverPool: allPool, spilloverChance: 0.22 });
  const pickMiddle = createVarietyPicker(middlePool, { spilloverPool: deepPool, spilloverChance: 0.18 });
  const pickDeep = createVarietyPicker(deepPool, { spilloverPool: middlePool, spilloverChance: 0.12 });

  if (biome?.id === "forest") {
    const forestGrassPool = allPool.filter((tile) => String(tile?.path || "").includes("/ground/forest/newgrass"));
    const forestGroundPool = allPool.filter((tile) => String(tile?.path || "").includes("/ground/forest/newground"));
    const forestGrassFallback = forestGrassPool[0] || surfacePool[0] || allPool[0] || fallback;
    const forestGroundFallback = forestGroundPool[0] || deepPool[0] || allPool[0] || fallback;
    const pickForestGrass = () =>
      forestGrassPool.length ? (forestGrassPool[randInt(rand, 0, forestGrassPool.length - 1)] || forestGrassFallback) : forestGrassFallback;
    const pickForestGround = () =>
      forestGroundPool.length ? (forestGroundPool[randInt(rand, 0, forestGroundPool.length - 1)] || forestGroundFallback) : forestGroundFallback;

    return {
      pick(_x, y, columnGroundY = groundY) {
        // Forest special rule:
        // - Mountains (above surface): grass only.
        // - Ground surface: grass only.
        // - Ground below surface: newground tiles (bottom two rows guaranteed).
        if (y < columnGroundY) {
          return pickForestGrass();
        }
        const depth = y - columnGroundY;
        if (depth <= 0) {
          return pickForestGrass();
        }
        return pickForestGround();
      },
    };
  }

  return {
    pick(_x, y, columnGroundY = groundY) {
      if (y < columnGroundY) {
        return pickMountain();
      }
      const depth = y - columnGroundY;
      if (depth <= 0) {
        return pickSurface();
      }
      if (depth === 1) {
        return pickMiddle();
      }
      return pickDeep();
    },
  };
}

function setGroundTileAt(tileGrid, x, y, groundTile, columnGroundY = y) {
  if (!tileGrid[y] || x < 0 || x >= tileGrid[0].length) return;
  const sourceTile = typeof groundTile?.pick === "function" ? groundTile.pick(x, y, columnGroundY) : groundTile;
  setTile(tileGrid, x, y, asGroundSolidTile(sourceTile));
}

function setGroundColumn(tileGrid, x, groundY, heightTiles, groundTile) {
  for (let dy = 0; dy < GROUND_THICKNESS_TILES; dy += 1) {
    const y = groundY + dy;
    if (y >= 0 && y < heightTiles) {
      setGroundTileAt(tileGrid, x, y, groundTile, groundY);
    }
  }
}

function clearGroundColumn(tileGrid, x, groundY, heightTiles) {
  for (let dy = 0; dy < GROUND_THICKNESS_TILES; dy += 1) {
    const y = groundY + dy;
    if (y >= 0 && y < (heightTiles || tileGrid.length) && tileGrid[y]) {
      tileGrid[y][x] = null;
    }
  }
}

function fillGroundSpan(tileGrid, startX, endX, groundY, heightTiles, groundTile) {
  const fromX = clamp(startX, 0, tileGrid[0].length - 1);
  const toX = clamp(endX, fromX, tileGrid[0].length - 1);
  for (let x = fromX; x <= toX; x += 1) {
    setGroundColumn(tileGrid, x, groundY, heightTiles, groundTile);
  }
}

function intersectsRanges(start, end, ranges) {
  return ranges.some((range) => start <= range.max && end >= range.min);
}

function isInHole(holes, x) {
  return holes.some((hole) => x >= hole.start && x <= hole.end);
}

// ─── Path Nodes & Lane Collection ───

function dedupePathNodes(nodes) {
  const seen = new Set();
  const out = [];
  for (const node of nodes || []) {
    if (!node) continue;
    const key = `${node.kind}:${node.x}:${node.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(node);
  }
  return out;
}

function collectGroundPathNodes(tileGrid, groundY, fromX, toX, holes, heightTiles) {
  const nodes = [];
  const minX = clamp(fromX, 1, tileGrid[0].length - 2);
  const maxX = clamp(toX, minX, tileGrid[0].length - 2);
  for (let x = minX; x <= maxX; x += 3) {
    if (isInHole(holes || [], x)) continue;
    // Find actual ground Y at this x.
    let gy = groundY;
    for (let y = Math.max(0, groundY - 8); y <= Math.min(heightTiles - 1, groundY + 4); y++) {
      if (isSolidTile(tileGrid[y]?.[x]) && tileGrid[y][x]?.groundSolid) {
        gy = y;
        break;
      }
    }
    if (!tileGrid[gy]?.[x]) continue;
    nodes.push({ x, y: gy, kind: "ground" });
  }
  return nodes;
}

function collectGroundLanes(tileGrid, groundY, fromX, toX, reservedRanges, heightTiles) {
  const lanes = [];
  const minX = clamp(fromX, 1, tileGrid[0].length - 2);
  const maxX = clamp(toX, minX, tileGrid[0].length - 2);
  let runStart = null;
  let runY = groundY;

  for (let x = minX; x <= maxX; x += 1) {
    const blocked = intersectsRanges(x, x, reservedRanges || []);
    // Find ground at this x.
    let solid = false;
    let localY = groundY;
    if (!blocked) {
      for (let y = Math.max(0, groundY - 8); y <= Math.min(heightTiles - 1, groundY + 4); y++) {
        if (isSolidTile(tileGrid[y]?.[x]) && tileGrid[y][x]?.groundSolid) {
          solid = true;
          localY = y;
          break;
        }
      }
    }
    if (solid) {
      if (runStart == null) {
        runStart = x;
        runY = localY;
      }
      continue;
    }
    if (runStart != null) {
      if (x - runStart >= 6) {
        lanes.push({ start: runStart, end: x - 1, y: runY, kind: "ground" });
      }
      runStart = null;
    }
  }
  if (runStart != null && maxX - runStart >= 5) {
    lanes.push({ start: runStart, end: maxX, y: runY, kind: "ground" });
  }
  return lanes;
}

// ─── Hole Management ───

function ensurePlayableGroundRoute({ tileGrid, groundY, startX, endX, groundTile, minGapBetweenHoles, maxHoleWidth, heightTiles }) {
  const width = tileGrid[0]?.length || 0;
  const fromX = clamp(startX, 0, Math.max(0, width - 1));
  const toX = clamp(endX, fromX, Math.max(0, width - 1));
  const minGap = Math.max(3, minGapBetweenHoles || 5);
  const maxWidth = Math.max(1, maxHoleWidth || 2);

  const collectHoles = () => {
    const spans = [];
    let x = fromX;
    while (x <= toX) {
      // Check if any ground tile exists at this x.
      let hasGround = false;
      for (let y = Math.max(0, groundY - 8); y <= Math.min(heightTiles - 1, groundY + 4); y++) {
        if (isSolidTile(tileGrid[y]?.[x]) && tileGrid[y][x]?.groundSolid) {
          hasGround = true;
          break;
        }
      }
      if (hasGround) { x += 1; continue; }
      const start = x;
      while (x <= toX) {
        let found = false;
        for (let y = Math.max(0, groundY - 8); y <= Math.min(heightTiles - 1, groundY + 4); y++) {
          if (isSolidTile(tileGrid[y]?.[x]) && tileGrid[y][x]?.groundSolid) { found = true; break; }
        }
        if (found) break;
        x += 1;
      }
      spans.push({ start, end: x - 1 });
    }
    return spans;
  };

  // Clamp each hole to max width.
  for (const hole of collectHoles()) {
    const widthTilesH = hole.end - hole.start + 1;
    if (widthTilesH <= maxWidth) continue;
    for (let x = hole.start + maxWidth; x <= hole.end; x += 1) {
      setGroundColumn(tileGrid, x, groundY, heightTiles, groundTile);
    }
  }

  // Enforce minimum flat distance between holes.
  let holes = collectHoles();
  for (let i = 1; i < holes.length; i += 1) {
    const prev = holes[i - 1];
    const curr = holes[i];
    const gap = curr.start - prev.end - 1;
    if (gap >= minGap) continue;
    for (let x = curr.start; x <= curr.end; x += 1) {
      setGroundColumn(tileGrid, x, groundY, heightTiles, groundTile);
    }
  }

  holes = collectHoles();

  // Keep clear run-up/landing around holes.
  for (const hole of holes) {
    const runupStart = Math.max(fromX, hole.start - 4);
    const landingEnd = Math.min(toX, hole.end + 4);
    for (let x = runupStart; x <= landingEnd; x += 1) {
      if (x >= hole.start && x <= hole.end) continue;
      let hasGround = false;
      for (let y = Math.max(0, groundY - 8); y <= Math.min(heightTiles - 1, groundY + 4); y++) {
        if (isSolidTile(tileGrid[y]?.[x]) && tileGrid[y][x]?.groundSolid) { hasGround = true; break; }
      }
      if (!hasGround) {
        setGroundColumn(tileGrid, x, groundY, heightTiles, groundTile);
      }
    }
  }

  return holes;
}

function validateJumpableHoles(tileGrid, holes, groundY, groundTile, heightTiles) {
  const airtime = 2 * Math.abs(GAME.jumpVelocity) / GAME.gravity;
  const coyoteBonus = 0.08 * GAME.moveSpeed;
  const maxJumpPixels = GAME.moveSpeed * airtime + coyoteBonus;
  const tileSize = Math.max(1, state.tileSize || 64);
  const maxJumpTiles = Math.max(1, Math.floor(maxJumpPixels / tileSize) - 1);

  for (let i = holes.length - 1; i >= 0; i -= 1) {
    const hole = holes[i];
    const width = hole.end - hole.start + 1;
    if (width <= maxJumpTiles) continue;
    for (let x = hole.start + maxJumpTiles; x <= hole.end; x += 1) {
      setGroundColumn(tileGrid, x, groundY, heightTiles, groundTile);
    }
    hole.end = hole.start + maxJumpTiles - 1;
  }
  for (let i = holes.length - 1; i >= 0; i -= 1) {
    if (holes[i].end < holes[i].start) holes.splice(i, 1);
  }
}

function augmentGroundHoles({ tileGrid, groundY, startX, endX, reservedRanges, holes, targetCount, rand, heightTiles, getLocalGroundY }) {
  const width = tileGrid[0]?.length || 0;
  if (!width) return holes || [];

  const minX = clamp(startX, 1, width - 3);
  const maxX = clamp(endX, minX + 2, width - 2);
  const out = Array.isArray(holes) ? holes.slice() : [];
  let attempts = 0;

  while (out.length < targetCount && attempts < 700) {
    attempts += 1;
    const holeWidth = randInt(rand, 1, 2);
    const holeStart = randInt(rand, minX, Math.max(minX, maxX - holeWidth));
    const holeEnd = holeStart + holeWidth - 1;
    if (intersectsRanges(holeStart, holeEnd, reservedRanges || [])) continue;

    let tooClose = false;
    for (const hole of out) {
      if (holeStart <= hole.end + 4 && holeEnd >= hole.start - 4) { tooClose = true; break; }
    }
    if (tooClose) continue;

    // Check ground exists before and after.
    const localGY = getLocalGroundY ? getLocalGroundY(holeStart) : groundY;
    if (!tileGrid[localGY]?.[holeStart - 1] || !tileGrid[localGY]?.[holeStart - 2]) continue;
    if (!tileGrid[localGY]?.[holeEnd + 1] || !tileGrid[localGY]?.[holeEnd + 2]) continue;

    for (let x = holeStart; x <= holeEnd; x += 1) {
      const gy = getLocalGroundY ? getLocalGroundY(x) : groundY;
      clearGroundColumn(tileGrid, x, gy, heightTiles);
    }
    out.push({ start: holeStart, end: holeEnd });
  }

  out.sort((a, b) => a.start - b.start);
  return out;
}

// ─── Bonus Scatter (30%+ off main path) ───

function buildBonusScatter({ biome, rand, tileGrid, bonusDensity, pathNodes, groundY, holes, reservedRanges, platformRails, levelIndex, secretZones, towerTileX, heightTiles }) {
  const allBonus = state.config.object_pools?.bonus || [];
  const allDecor = state.config.object_pools?.decoration || [];
  const baseCount = Math.round((tileGrid[0].length * bonusDensity) / 150) + Math.floor((levelIndex || 0) * 0.5);
  const postTowerBonus = Number.isFinite(towerTileX)
    ? clamp(Math.floor((tileGrid[0].length - towerTileX) / 20), 1, 4)
    : 0;
  const count = clamp(baseCount + postTowerBonus, 5, 18);
  const items = [];
  if (pathNodes.length < 3 || groundY == null) return items;

  const mysteryBlock =
    allBonus.find((b) => b.id === "bonus_mystery") ||
    allBonus.find((b) => String(b.path || "").includes("bonus_mystery")) ||
    { id: "bonus_mystery", path: "game_assets/bonus/bonus_mystery.png", spawn_weight: 1 };
  const usedBlock =
    allBonus.find((b) => b.id === "bonus_wall_01") ||
    allBonus.find((b) => String(b.path || "").includes("bonus_wall_01")) ||
    { id: "bonus_wall_01", path: "game_assets/bonus/bonus_wall_01.png", spawn_weight: 1 };
  const potionDef =
    allDecor.find((d) => d.id === "deco_potion") || { id: "deco_potion", path: "game_assets/decoration/deco_potion.png", spawn_weight: 1.6 };
  const coinDef =
    allBonus.find((b) => b.id === "bonus_coin") || { id: "bonus_coin", path: "game_assets/bonus/bonus_coin.png", spawn_weight: 0.95 };
  const axeDef =
    allDecor.find((d) => d.id === "deco_double_axe") || { id: "deco_double_axe", path: "game_assets/decoration/deco_double_axe.png", spawn_weight: 0.18 };
  const royalShieldDef =
    allDecor.find((d) => d.id === "deco_royal_shield") || { id: "deco_royal_shield", path: "game_assets/decoration/deco_royal_shield.png", spawn_weight: 0.08 };
  const rewardDefs = [potionDef, coinDef, axeDef, royalShieldDef];

  if (!mysteryBlock?.path || !usedBlock?.path || !rewardDefs.length) return items;

  const tileSize = state.tileSize;
  const minPassUnderGapTiles = getBonusMinPassUnderGapTiles();

  const tryPlaceBlock = (tileX, tileY, isOffPath) => {
    if (items.length >= count) return false;
    if (tileX < 1 || tileX > tileGrid[0].length - 2 || tileY < 2 || tileY > (heightTiles || tileGrid.length) - 3) return false;
    if (tileGrid[tileY]?.[tileX]) return false;
    if (isSolidTile(tileGrid[tileY + 1]?.[tileX])) return false;
    if (intersectsRanges(tileX, tileX, reservedRanges || [])) return false;
    if (isInHole(holes || [], tileX)) return false;
    if (items.some((item) => item.tileX === tileX)) return false;
    if (!hasReachableBonusSupport(tileGrid, tileX, tileY, groundY)) return false;
    const worldX = tileX * tileSize;
    const worldY = tileY * tileSize;
    if (items.some((item) => Math.abs(item.x - worldX) < tileSize && Math.abs(item.y - worldY) < tileSize)) return false;

    const rewardDef = weightedPickByKey(rewardDefs, "spawn_weight", rand);
    if (!rewardDef) return false;

    items.push({
      type: mysteryBlock.id,
      path: mysteryBlock.path,
      usedPath: usedBlock.path,
      x: worldX, y: worldY,
      tileX, tileY,
      w: tileSize, h: tileSize,
      used: false, bumpTime: 0, bumpOffset: 0,
      rewardPath: rewardDef.path,
      rewardType: rewardDef.id,
      popup: null,
      isOffPath: !!isOffPath,
    });
    return true;
  };

  // ─── Main path bonuses (70%) ───
  const mainPathCount = Math.floor(count * 0.65);
  const groundNodes = pathNodes.filter((n) => n.kind === "ground").sort((a, b) => a.x - b.x);
  const stride = clamp(Math.floor(groundNodes.length / Math.max(1, mainPathCount)), 3, 6);
  const rowPattern = [2, 3, 2, 4, 3];
  let groupIndex = 0;
  for (let i = stride; i < groundNodes.length && items.length < mainPathCount; i += stride) {
    const node = groundNodes[i];
    if (!node || intersectsRanges(node.x - 2, node.x + 2, reservedRanges || [])) continue;
    const rowLen = rowPattern[groupIndex % rowPattern.length];
    const rowY = clamp(node.y - minPassUnderGapTiles, 2, (heightTiles || tileGrid.length) - 3);
    const startX = node.x - Math.floor((rowLen - 1) / 2);
    for (let j = 0; j < rowLen; j += 1) {
      tryPlaceBlock(startX + j, rowY, false);
    }
    groupIndex += 1;
  }

  // ─── Off-path / exploration bonuses (30%+) ───
  // Place on secret zones and elevated platforms.
  for (const secret of secretZones || []) {
    if (items.length >= count) break;
    tryPlaceBlock(secret.tileX, secret.tileY - 1, true);
    tryPlaceBlock(secret.tileX + 1, secret.tileY - 1, true);
  }

  // Place on elevated platforms.
  const secretRails = platformRails.filter(r => r.isSecret);
  for (const rail of secretRails) {
    if (items.length >= count) break;
    const center = Math.floor((rail.start + rail.end) / 2);
    tryPlaceBlock(center, clamp(rail.y - 2, 2, groundY - 2), true);
  }

  // Fill remaining with slightly off-path positions.
  let fillAttempts = 0;
  while (items.length < count && fillAttempts < count * 8) {
    fillAttempts += 1;
    const node = groundNodes[randInt(rand, 0, Math.max(0, groundNodes.length - 1))];
    if (!node) break;
    const offX = randInt(rand, -3, 3);
    const offY = rand() < 0.5 ? -minPassUnderGapTiles - 1 : -minPassUnderGapTiles;
    tryPlaceBlock(node.x + offX, clamp(node.y + offY, 2, (heightTiles || tileGrid.length) - 3), Math.abs(offX) > 1);
  }

  // Ensure denser rewards in the second half (after the tower landmark).
  if (Number.isFinite(towerTileX)) {
    const lateGroundNodes = groundNodes.filter((node) => node.x >= towerTileX + 8);
    const lateTarget = clamp(Math.floor(count * 0.45), 2, 8);
    let latePlaced = items.filter((item) => item.tileX >= towerTileX + 8).length;
    let lateAttempts = 0;
    while (latePlaced < lateTarget && lateGroundNodes.length && lateAttempts < lateTarget * 10) {
      lateAttempts += 1;
      const node = lateGroundNodes[randInt(rand, 0, lateGroundNodes.length - 1)];
      if (!node) continue;
      const offX = randInt(rand, -2, 2);
      const offY = rand() < 0.45 ? -minPassUnderGapTiles - 1 : -minPassUnderGapTiles;
      if (tryPlaceBlock(node.x + offX, clamp(node.y + offY, 2, (heightTiles || tileGrid.length) - 3), Math.abs(offX) > 0)) {
        latePlaced += 1;
      }
    }
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
      if (!isSolidTile(tileGrid[supportY]?.[supportX])) continue;
      const gapTiles = supportY - blockY;
      if (gapTiles < minGapTiles || gapTiles > BONUS_MAX_SUPPORT_GAP_TILES) break;
      if (isSolidTile(tileGrid[supportY - 1]?.[supportX])) break;
      if (isSolidTile(tileGrid[supportY - 2]?.[supportX])) break;
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

function buildGroundDecorScatter({ biome, rand, widthTiles, groundY, getLocalGroundY, holes, reservedRanges }) {
  const decorTiles = biome.groundDecorTiles || [];
  if (!decorTiles.length) return [];
  const items = [];
  let xTile = 8 + randInt(rand, 0, 1);
  const maxX = Math.max(xTile, widthTiles - 8);
  let shuffledDecorTiles = [];

  const takeNextDecorTile = () => {
    if (!shuffledDecorTiles.length) {
      shuffledDecorTiles = decorTiles.slice();
      for (let i = shuffledDecorTiles.length - 1; i > 0; i -= 1) {
        const j = randInt(rand, 0, i);
        [shuffledDecorTiles[i], shuffledDecorTiles[j]] = [shuffledDecorTiles[j], shuffledDecorTiles[i]];
      }
    }
    return shuffledDecorTiles.pop() || decorTiles[0];
  };

  while (xTile <= maxX) {
    const columnGroundY = typeof getLocalGroundY === "function" ? getLocalGroundY(xTile) : groundY;
    const hasGround = Number.isFinite(columnGroundY) && columnGroundY >= 1;
    const blocked =
      !hasGround ||
      isInHole(holes, xTile) ||
      intersectsRanges(xTile - 1, xTile + 1, reservedRanges) ||
      items.some((item) => Math.abs(item.xTile - xTile) < 1);

    if (!blocked) {
      const tile = takeNextDecorTile();
      items.push({
        path: tile.path,
        xTile,
        yTile: columnGroundY - 1,
        renderBehindPlayer: rand() < 0.5,
        allowShortSprite: tile.allowShortSprite === true,
      });
    }

    xTile += 1;
  }
  return items;
}

// ─── Enemy Spawns ───

function buildEnemySpawns({ biomeId, rand, pathNodes, levelIndex, tileGrid, groundY, lanes, generation, towerTileX, heightTiles }) {
  const profile = generation || GENERATION_PROFILES.normal;
  const pool = state.enemies.filter((enemy) => enemy.biomeHint === biomeId);
  const candidates = pool.length ? pool : state.enemies;
  const preferredEnemyId = BIOME_ENEMY_IDS_BY_BIOME[biomeId];
  const preferredEnemy = preferredEnemyId
    ? candidates.find((enemy) => enemy.id === preferredEnemyId) || null
    : null;
  const postTowerEnemyBonus = Number.isFinite(towerTileX)
    ? clamp(Math.floor((tileGrid[0].length - towerTileX) / 22), 1, 4)
    : 0;
  const rawCount = clamp(
    profile.enemyBase + levelIndex * profile.enemyPerLevel,
    profile.enemyMin,
    profile.enemyMax + postTowerEnemyBonus,
  );
  const count = Math.max(1, Math.round(rawCount * 0.9));
  const enemies = [];
  if (!candidates.length) return enemies;

  const lanePool = (lanes || []).filter((lane) => lane.end - lane.start + 1 >= 4);
  if (!lanePool.length) return enemies;

  const postTowerLanes = Number.isFinite(towerTileX) ? lanePool.filter((lane) => lane.start >= towerTileX + 6) : [];
  const preTowerLanes = Number.isFinite(towerTileX) ? lanePool.filter((lane) => lane.start < towerTileX + 6) : lanePool;
  const shuffledPostTower = postTowerLanes.slice().sort(() => rand() - 0.5).sort((a, b) => a.start - b.start);
  const shuffledPreTower = preTowerLanes.slice().sort(() => rand() - 0.5).sort((a, b) => a.start - b.start);
  const shuffledLanes = [...shuffledPreTower, ...shuffledPostTower];
  const laneSpawnCounts = new Map();
  const requiredTypeCount = Math.min(3, candidates.length, count);
  const requiredTypes = candidates.slice().sort(() => rand() - 0.5).slice(0, requiredTypeCount);
  const spawnedTypeIds = new Set();
  const preTowerThreshold = Number.isFinite(towerTileX) ? towerTileX + 6 : Infinity;
  const postTowerThreshold = Number.isFinite(towerTileX) ? towerTileX + 6 : -Infinity;
  const minPreTowerEnemies = Number.isFinite(towerTileX)
    ? clamp(Math.floor(count * 0.45), 2, Math.max(2, count - 1))
    : 0;
  const minPostTowerEnemies = Number.isFinite(towerTileX)
    ? clamp(Math.ceil(count * 0.35), 2, Math.max(2, count - 1))
    : 0;
  let preTowerSpawned = 0;
  let postTowerSpawned = 0;

  const pickEnemyDef = () => {
    const missingRequired = requiredTypes.filter((def) => !spawnedTypeIds.has(def.id));
    const remainingSlots = Math.max(0, count - enemies.length);
    if (missingRequired.length && remainingSlots <= missingRequired.length) {
      return missingRequired[randInt(rand, 0, missingRequired.length - 1)];
    }
    if (missingRequired.length && rand() < 0.8) {
      return missingRequired[randInt(rand, 0, missingRequired.length - 1)];
    }
    if (preferredEnemy && rand() < 0.35) {
      return preferredEnemy;
    }
    return candidates[randInt(rand, 0, candidates.length - 1)];
  };

  const trySpawnOnLane = (lane) => {
    const laneLen = lane.end - lane.start + 1;
    const maxSpawnsForLane = laneLen >= profile.doubleSpawnLaneLength ? 2 : 1;
    const laneCount = laneSpawnCounts.get(lane) || 0;
    if (laneCount >= maxSpawnsForLane) {
      return false;
    }

    let attempts = 0;
    while (attempts < 18 && enemies.length < count) {
      attempts += 1;
      const tileX = randInt(rand, lane.start + 1, lane.end - 1);
      if (!tileGrid[lane.y]?.[tileX]) continue;
      const tooClose = enemies.some(
        (enemy) =>
          Math.abs(tileX * state.tileSize - enemy.x) < state.tileSize * 4 &&
          Math.abs(lane.y * state.tileSize - (enemy.y + enemy.h)) < state.tileSize * 2,
      );
      if (tooClose) continue;

      const enemyDef = pickEnemyDef();
      const hitbox = getEnemyHitboxSize(enemyDef);
      const enemyW = hitbox.w;
      const enemyH = hitbox.h;
      const spawnX = tileX * state.tileSize + (state.tileSize - enemyW) * 0.5;
      const patrolMin = lane.start * state.tileSize + 1;
      const patrolMax = (lane.end + 1) * state.tileSize - enemyW - 1;
      if (patrolMax - patrolMin < enemyW + 8) continue;

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
      laneSpawnCounts.set(lane, laneCount + 1);
      spawnedTypeIds.add(enemyDef.id);
      if (tileX < preTowerThreshold) {
        preTowerSpawned += 1;
      } else if (tileX >= postTowerThreshold) {
        postTowerSpawned += 1;
      }
      return true;
    }
    return false;
  };

  const trySpawnOnPathNode = (node) => {
    if (!node || node.kind !== "ground") return false;
    if (!tileGrid[node.y]?.[node.x]) return false;
    const enemyDef = pickEnemyDef();
    const hitbox = getEnemyHitboxSize(enemyDef);
    const enemyW = hitbox.w;
    const enemyH = hitbox.h;
    const spawnX = node.x * state.tileSize + (state.tileSize - enemyW) * 0.5;
    const tooClose = enemies.some(
      (enemy) =>
        Math.abs(spawnX - enemy.x) < state.tileSize * 4 &&
        Math.abs(node.y * state.tileSize - (enemy.y + enemy.h)) < state.tileSize * 2,
    );
    if (tooClose) return false;
    const patrolMin = Math.max(0, spawnX - state.tileSize * 3);
    const patrolMax = Math.min(tileGrid[0].length * state.tileSize - enemyW, spawnX + state.tileSize * 3);
    enemies.push({
      def: enemyDef,
      x: spawnX,
      y: node.y * state.tileSize - enemyH,
      vx: rand() > 0.5 ? ENEMY_MOVE_SPEED : -ENEMY_MOVE_SPEED,
      vy: 0,
      dir: rand() > 0.5 ? 1 : -1,
      w: enemyW,
      h: enemyH,
      prevY: node.y * state.tileSize - enemyH,
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
    spawnedTypeIds.add(enemyDef.id);
    if (node.x < preTowerThreshold) {
      preTowerSpawned += 1;
    } else if (node.x >= postTowerThreshold) {
      postTowerSpawned += 1;
    }
    return true;
  };

  // First pass: force a healthy amount of enemies before the tower.
  for (const lane of shuffledPreTower) {
    if (enemies.length >= count || preTowerSpawned >= minPreTowerEnemies) break;
    const laneLen = lane.end - lane.start + 1;
    const laneSlots = laneLen >= profile.doubleSpawnLaneLength ? 2 : 1;
    for (let n = 0; n < laneSlots; n += 1) {
      if (enemies.length >= count || preTowerSpawned >= minPreTowerEnemies) break;
      trySpawnOnLane(lane);
    }
  }

  // Second pass: force a healthy amount of enemies after the tower.
  for (const lane of shuffledPostTower) {
    if (enemies.length >= count || postTowerSpawned >= minPostTowerEnemies) break;
    const laneLen = lane.end - lane.start + 1;
    const laneSlots = laneLen >= profile.doubleSpawnLaneLength ? 2 : 1;
    for (let n = 0; n < laneSlots; n += 1) {
      if (enemies.length >= count || postTowerSpawned >= minPostTowerEnemies) break;
      trySpawnOnLane(lane);
    }
  }

  for (const lane of shuffledLanes) {
    if (enemies.length >= count) break;
    const laneLen = lane.end - lane.start + 1;
    const spawnCount = laneLen >= profile.doubleSpawnLaneLength ? 2 : 1;
    for (let n = 0; n < spawnCount && enemies.length < count; n += 1) {
      trySpawnOnLane(lane);
    }
  }

  // If pre-tower placement was constrained by lane geometry, fill from path nodes.
  if (preTowerSpawned < minPreTowerEnemies && pathNodes?.length) {
    const preTowerNodes = pathNodes.filter((node) => node.kind === "ground" && node.x < preTowerThreshold);
    for (const node of preTowerNodes) {
      if (enemies.length >= count || preTowerSpawned >= minPreTowerEnemies) break;
      trySpawnOnPathNode(node);
    }
  }

  // Ensure the second half of the level remains populated after the tower.
  if (postTowerSpawned < minPostTowerEnemies && pathNodes?.length) {
    const postTowerNodes = pathNodes.filter((node) => node.kind === "ground" && node.x >= postTowerThreshold);
    for (const node of postTowerNodes) {
      if (enemies.length >= count || postTowerSpawned >= minPostTowerEnemies) break;
      trySpawnOnPathNode(node);
    }
  }

  // Fallback: fill from path nodes.
  if (enemies.length < count && pathNodes?.length) {
    for (const node of pathNodes) {
      if (enemies.length >= count) break;
      trySpawnOnPathNode(node);
    }
  }

  return enemies;
}

function buildGuardSpawns({ groundY, towerTileX, castleTileX, worldWidth }) {
  const def = state.guard;
  if (!def) return [];

  const ts = state.tileSize;
  const guardW = 40;
  const guardH = 100;
  const groundPx = groundY * ts;
  const towerW = 116;
  const castleW = Math.round(220 * 1.5); // CASTLE_SCALE = 1.5
  const guards = [];

  // Tower guard — 2 tiles left of the tower's left edge, facing west toward approaching player
  const towerLeft = Math.max(0, towerTileX * ts - towerW / 2);
  const towerGuardX = towerLeft - 2 * ts - guardW;
  if (towerGuardX > 2 * ts) {
    guards.push({
      def,
      x: towerGuardX,
      y: groundPx - guardH,
      w: guardW,
      h: guardH,
      dir: -1,
      type: "tower",
      inRange: false,
      animTime: Math.random() * 3,
    });
  }

  // Castle guard — 2 tiles left of the castle's left edge, facing west
  const castleLeft = Math.max(0, castleTileX * ts - castleW / 2);
  const castleGuardX = castleLeft - 2 * ts - guardW;
  if (castleGuardX > 2 * ts && castleGuardX < worldWidth - guardW) {
    guards.push({
      def,
      x: castleGuardX,
      y: groundPx - guardH,
      w: guardW,
      h: guardH,
      dir: -1,
      type: "castle",
      inRange: false,
      animTime: Math.random() * 3,
    });
  }

  return guards;
}

function buildSkyBirdSpawns({ biomeId, rand, groundY, worldWidth }) {
  const allowedIds = BIOME_SKY_BIRD_IDS[biomeId];
  if (!allowedIds?.length) return [];
  const pool = (state.skyBirds || []).filter((b) => allowedIds.includes(b.id));
  if (!pool.length) return [];

  const count = randInt(rand, SKY_BIRD_COUNT_MIN, SKY_BIRD_COUNT_MAX);
  const skyTop = 2 * state.tileSize;
  const skyBottom = (groundY - 6) * state.tileSize;
  if (skyBottom <= skyTop) return [];

  const birds = [];
  for (let i = 0; i < count; i++) {
    const def = pool[Math.floor(rand() * pool.length)];
    const isCrow = def.id === "forest-crow";
    const speed = isCrow ? CROW_SPEED : SPARROW_SPEED;
    const swoopAmp = isCrow ? CROW_SWOOP_AMPLITUDE : SPARROW_SWOOP_AMPLITUDE;
    const swoopFreq = isCrow ? CROW_SWOOP_FREQUENCY : SPARROW_SWOOP_FREQUENCY;
    const baseY = skyTop + rand() * (skyBottom - skyTop);
    const dir = rand() < 0.5 ? 1 : -1;
    birds.push({
      def,
      x: rand() * worldWidth,
      y: baseY,
      dir,
      baseY,
      swoopPhase: rand() * Math.PI * 2,
      swoopAmp,
      swoopFreq,
      speed,
      uTurnCooldown: SKY_BIRD_UTURN_MIN_INTERVAL * rand(),
      animTime: rand() * 3,
      w: def.size.width * SKY_BIRD_SCALE,
      h: def.size.height * SKY_BIRD_SCALE,
    });
  }
  return birds;
}

function buildAnimalSpawns({ biomeId, rand, lanes, tileGrid, towerTileX, castleTileX }) {
  const pool = state.animals.filter((a) => a.biomeHint === biomeId);
  const baseCandidates = pool.length ? pool : state.animals;
  if (!baseCandidates.length) return [];
  const preferredAnimalIds = BIOME_ANIMAL_IDS_BY_BIOME[biomeId] || [];
  const preferredCandidates = preferredAnimalIds
    .map((id) => baseCandidates.find((animal) => animal.id === id))
    .filter(Boolean);

  // Animals must stay on terrain (ground/mountain), never on elevated platform rails.
  const lanePool = (lanes || []).filter((lane) => lane.kind === "ground" && lane.end - lane.start + 1 >= 4);
  if (!lanePool.length) return [];

  const animals = [];
  const candidateSource = preferredCandidates.length ? preferredCandidates : baseCandidates;
  const candidates = candidateSource.length <= 3
    ? candidateSource.slice()
    : candidateSource.slice().sort(() => rand() - 0.5).slice(0, 3);
  const requiredAnimalIds = new Set(candidates.map((animal) => animal.id));
  const spawnedAnimalIds = new Set();

  const pickAnimalDef = () => {
    const missingRequired = candidates.filter((animal) => requiredAnimalIds.has(animal.id) && !spawnedAnimalIds.has(animal.id));
    if (missingRequired.length && rand() < 0.7) {
      return missingRequired[randInt(rand, 0, missingRequired.length - 1)];
    }
    return candidates[randInt(rand, 0, candidates.length - 1)];
  };

  const buildZoneLanes = (zoneStart, zoneEnd) => lanePool
    .filter((lane) => lane.start <= zoneEnd && lane.end >= zoneStart)
    .map((lane) => ({
      ...lane,
      zoneStart: Math.max(lane.start + 1, zoneStart),
      zoneEnd: Math.min(lane.end - 1, zoneEnd),
    }))
    .filter((lane) => lane.zoneEnd - lane.zoneStart >= 1)
    .sort((a, b) => a.start - b.start);

  const towerZoneLanes = Number.isFinite(towerTileX)
    ? buildZoneLanes(towerTileX - 8, towerTileX + 6)
    : [];
  const castleZoneLanes = Number.isFinite(castleTileX)
    ? buildZoneLanes(castleTileX - 12, castleTileX - 3)
    : [];
  const laneSpawnCounts = new Map();

  const trySpawnAnimalOnLane = (lane, minSpacingTiles = 3) => {
    const laneKey = `${lane.y}:${lane.start}:${lane.end}`;
    const currentLaneCount = laneSpawnCounts.get(laneKey) || 0;
    const laneLen = lane.zoneEnd - lane.zoneStart + 1;
    const laneCap = laneLen >= 10 ? 2 : 1;
    if (currentLaneCount >= laneCap) {
      return false;
    }

    let attempts = 0;
    while (attempts < 18) {
      attempts += 1;
      const tileX = randInt(rand, lane.zoneStart, lane.zoneEnd);
      if (!tileGrid[lane.y]?.[tileX]) continue;

      const animalDef = pickAnimalDef();
      const hitbox = getAnimalHitboxSize(animalDef);
      const spawnX = tileX * state.tileSize + (state.tileSize - hitbox.w) * 0.5;
      const tooClose = animals.some(
        (animal) =>
          Math.abs(spawnX - animal.x) < state.tileSize * minSpacingTiles &&
          Math.abs(lane.y * state.tileSize - (animal.y + animal.h)) < state.tileSize * 2,
      );
      if (tooClose) continue;

      const patrolMin = lane.zoneStart * state.tileSize + 1;
      const patrolMax = (lane.zoneEnd + 1) * state.tileSize - hitbox.w - 1;
      if (patrolMax - patrolMin < hitbox.w + 8) continue;

      animals.push({
        def: animalDef,
        x: spawnX,
        y: lane.y * state.tileSize - hitbox.h,
        vx: rand() > 0.5 ? ENEMY_MOVE_SPEED : -ENEMY_MOVE_SPEED,
        vy: 0,
        dir: rand() > 0.5 ? 1 : -1,
        w: hitbox.w,
        h: hitbox.h,
        prevY: lane.y * state.tileSize - hitbox.h,
        patrolMin,
        patrolMax,
        animTime: rand() * 3,
        onGround: false,
        bounceRewardClaimed: false,
      });
      spawnedAnimalIds.add(animalDef.id);
      laneSpawnCounts.set(laneKey, currentLaneCount + 1);
      return true;
    }
    return false;
  };

  const placeAnimalsInZone = (zoneLanes, minCount, maxCount) => {
    if (!zoneLanes.length) return;
    const targetCount = randInt(rand, minCount, maxCount);
    const shuffledZoneLanes = zoneLanes.slice().sort(() => rand() - 0.5);
    let placed = 0;

    for (const lane of shuffledZoneLanes) {
      if (placed >= targetCount) break;
      if (trySpawnAnimalOnLane(lane, 3)) {
        placed += 1;
      }
    }

    if (placed < targetCount) {
      for (const lane of shuffledZoneLanes) {
        if (placed >= targetCount) break;
        while (placed < targetCount && trySpawnAnimalOnLane(lane, 2)) {
          placed += 1;
        }
      }
    }
  };

  placeAnimalsInZone(towerZoneLanes, 2, 3);
  placeAnimalsInZone(castleZoneLanes, 1, 3);

  return animals;
}

export function getEnemyHitboxSize(enemyDef) {
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
  const spriteW = (enemyDef?.size?.width || 48) * ENEMY_SCALE;
  const spriteH = (enemyDef?.size?.height || 48) * ENEMY_SCALE;
  return {
    w: clamp(Math.round(spriteW * ENEMY_HITBOX_WIDTH_RATIO), ENEMY_MIN_HITBOX_W, ENEMY_MAX_HITBOX_W),
    h: clamp(Math.round(spriteH * ENEMY_HITBOX_HEIGHT_RATIO), ENEMY_MIN_HITBOX_H, ENEMY_MAX_HITBOX_H),
  };
}

export function getAnimalHitboxSize(animalDef) {
  const idlePath = animalDef?.sprite?.idleE || animalDef?.sprite?.idleW;
  if (idlePath) {
    const mbox = getManifestHitbox(idlePath, ENEMY_SCALE);
    if (mbox) {
      return {
        w: clamp(mbox.w, ANIMAL_MIN_HITBOX_W, ANIMAL_MAX_HITBOX_W),
        h: clamp(mbox.h, ANIMAL_MIN_HITBOX_H, ANIMAL_MAX_HITBOX_H),
      };
    }
  }
  const spriteW = (animalDef?.size?.width || 48) * ENEMY_SCALE;
  const spriteH = (animalDef?.size?.height || 48) * ENEMY_SCALE;
  return {
    w: clamp(Math.round(spriteW * ENEMY_HITBOX_WIDTH_RATIO), ANIMAL_MIN_HITBOX_W, ANIMAL_MAX_HITBOX_W),
    h: clamp(Math.round(spriteH * ENEMY_HITBOX_HEIGHT_RATIO), ANIMAL_MIN_HITBOX_H, ANIMAL_MAX_HITBOX_H),
  };
}
