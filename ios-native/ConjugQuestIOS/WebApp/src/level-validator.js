// ─── Level Playability & Design Quality Validator ───
// Checks traversability + scores level design quality on 5 dimensions (0-100).

import { GAME, PLAYER_HITBOX_WIDTH, PLAYER_HITBOX_HEIGHT, HERO_SCALE, getHeroHitboxOverride } from "./constants.js";
import { state } from "./state.js";
import { getManifestHitbox } from "./sprite-manifest.js";

// ─── Tile helpers (local copies to avoid circular deps) ───

function isSolidTile(tile) {
  if (!tile) return false;
  return String(tile.collision || "solid").toLowerCase() !== "none";
}

function getTileCodeFromPath(path) {
  if (!path) return null;
  const match = String(path).match(/_(\d+)\.png$/);
  return match ? Number(match[1]) : null;
}

function isOneWayPlatformTile(tile) {
  if (tile?.groundSolid) return false;
  const code = getTileCodeFromPath(tile?.path);
  return code != null && code >= 10 && code <= 15;
}

// ─── Physics simulation constants ───

function getPlayerDimensions() {
  const hero = state.heroes?.[state.selectedHeroIndex];
  if (hero) {
    const hitboxOverride = getHeroHitboxOverride(hero.id);
    if (hitboxOverride) {
      return hitboxOverride;
    }
    const mbox = getManifestHitbox(hero.sprite?.idleSE, HERO_SCALE);
    if (mbox) return mbox;
  }
  return { w: PLAYER_HITBOX_WIDTH, h: PLAYER_HITBOX_HEIGHT };
}

function getMaxJumpTiles() {
  const tileSize = state.tileSize || 64;
  const airtime = 2 * Math.abs(GAME.jumpVelocity) / GAME.gravity;
  const coyoteBonus = 0.08 * GAME.moveSpeed;
  const maxJumpPx = GAME.moveSpeed * airtime + coyoteBonus;
  return Math.floor(maxJumpPx / tileSize);
}

function getMaxJumpHeightTiles() {
  const tileSize = state.tileSize || 64;
  const maxHeightPx = (GAME.jumpVelocity * GAME.jumpVelocity) / (2 * GAME.gravity);
  return Math.floor(maxHeightPx / tileSize);
}

// ─── Traversability check ───

function hasSolidAt(grid, x, y, heightTiles) {
  if (x < 0 || y < 0 || x >= grid[0].length || y >= heightTiles) return false;
  return isSolidTile(grid[y]?.[x]);
}

export function checkTraversability(level) {
  const issues = [];
  const grid = level.tileGrid;
  const groundY = level.groundY;
  const widthTiles = level.widthTiles;
  const heightTiles = level.heightTiles;
  const maxJump = getMaxJumpTiles();
  const maxHeight = getMaxJumpHeightTiles();

  const startTileX = Math.floor(level.start.x / (state.tileSize || 64));
  const endTileX = Math.floor(level.end.x / (state.tileSize || 64));

  // Build surface map: for each column, find the highest solid tile.
  const surfaceY = new Array(widthTiles).fill(-1);
  for (let x = 0; x < widthTiles; x++) {
    for (let y = 0; y <= groundY + 3; y++) {
      if (hasSolidAt(grid, x, y, heightTiles)) {
        surfaceY[x] = y;
        break;
      }
    }
  }

  let currentX = startTileX;
  let gapStart = -1;

  while (currentX < endTileX) {
    if (surfaceY[currentX] >= 0) {
      if (gapStart >= 0) gapStart = -1;
      currentX++;
      continue;
    }
    if (gapStart < 0) gapStart = currentX;

    let foundLanding = false;
    for (let ahead = 1; ahead <= maxJump + 1; ahead++) {
      const landX = gapStart + ahead;
      if (landX >= widthTiles) break;
      if (surfaceY[landX] >= 0) {
        const jumpFromY = surfaceY[gapStart - 1] >= 0 ? surfaceY[gapStart - 1] : groundY;
        const landOnY = surfaceY[landX];
        if (jumpFromY - landOnY > maxHeight) {
          issues.push(`Gap at x=${gapStart}-${landX}: landing ${jumpFromY - landOnY} tiles above takeoff (max ${maxHeight})`);
        }
        currentX = landX;
        foundLanding = true;
        gapStart = -1;
        break;
      }
    }

    if (!foundLanding) {
      issues.push(`Impassable gap starting at tile x=${gapStart} (>${maxJump} tiles wide)`);
      currentX = gapStart + maxJump + 2;
      gapStart = -1;
    }
  }

  return { traversable: issues.length === 0, issues };
}

// ─── Level Quality Scoring (Phase 5 Composite) ───

export function scoreLevelQuality(level) {
  const breakdown = {};
  const seq = level.blockSequence || [];
  const meta = level.blockMetadata || [];

  // 1. Structural Variety (0-20): distinct block types and vertical direction changes.
  const uniqueBlocks = new Set(seq);
  const blockTypeCount = uniqueBlocks.size;
  let verticalChanges = 0;
  for (let i = 1; i < meta.length; i++) {
    const prev = meta[i - 1];
    const curr = meta[i];
    if (prev && curr) {
      const prevCat = prev.category;
      const currCat = curr.category;
      if (prevCat !== currCat) verticalChanges++;
    }
  }
  const varietyScore = Math.min(20, blockTypeCount * 2.5 + verticalChanges * 1.5);
  breakdown.structuralVariety = Math.round(varietyScore);

  // 2. Rhythm (0-20): tension/rest oscillation.
  const tensionBlocks = new Set(["rising_tension", "crumbling_bridge", "canyon_crossing",
    "sprint_corridor", "verb_race", "conjugation_cascade"]);
  const restBlocks = new Set(["rest_zone", "revelation"]);
  let oscillations = 0;
  let wasTension = false;
  for (const blockId of seq) {
    if (tensionBlocks.has(blockId)) wasTension = true;
    if (restBlocks.has(blockId) && wasTension) { oscillations++; wasTension = false; }
  }
  breakdown.rhythm = Math.min(20, oscillations * 7);

  // 3. Exploration (0-20): off-path content.
  const explorationBlocks = new Set(["hidden_alcove", "reward_shortcut", "underground_passage",
    "skyline_secret", "secret_conjugation"]);
  const explorationCount = seq.filter(id => explorationBlocks.has(id)).length;
  const explorationPercent = (explorationCount / Math.max(1, seq.length)) * 100;
  const secretZoneCount = (level.secretZones || []).length;
  const offPathBonuses = (level.bonuses || []).filter(b => b.isOffPath).length;
  const totalBonuses = (level.bonuses || []).length;
  const offPathPercent = totalBonuses > 0 ? (offPathBonuses / totalBonuses) * 100 : 0;
  breakdown.exploration = Math.min(20, Math.round(
    explorationPercent * 0.4 + secretZoneCount * 4 + Math.min(offPathPercent, 40) * 0.2
  ));

  // 4. Pedagogical Integration (0-20): conjugation blocks integrated in gameplay.
  const conjBlocks = new Set(["guardian_gate", "path_choice", "letter_bridge", "verb_race",
    "secret_conjugation", "conjugation_cascade"]);
  const conjCount = seq.filter(id => conjBlocks.has(id)).length;
  const gateCount = (level.conjugationGates || []).length;
  if (conjCount >= 3 || gateCount >= 3) breakdown.pedagogicalIntegration = 20;
  else if (conjCount >= 2 || gateCount >= 2) breakdown.pedagogicalIntegration = 15;
  else if (conjCount >= 1 || gateCount >= 1) breakdown.pedagogicalIntegration = 10;
  else breakdown.pedagogicalIntegration = 0;

  // 5. Surprise (0-20): unexpected elements.
  const surpriseBlocks = new Set(["inverted_trap", "pit_bounce", "hidden_alcove",
    "skyline_secret", "secret_conjugation"]);
  const surpriseCount = seq.filter(id => surpriseBlocks.has(id)).length;
  if (surpriseCount >= 3) breakdown.surprise = 20;
  else if (surpriseCount >= 2) breakdown.surprise = 15;
  else if (surpriseCount >= 1) breakdown.surprise = 10;
  else breakdown.surprise = 0;

  // 6. Traversability (bonus check).
  const { traversable, issues } = checkTraversability(level);
  breakdown.traversability = traversable ? 100 : Math.max(0, 100 - issues.length * 25);

  // Composite: design score out of 100.
  const designTotal = (breakdown.structuralVariety || 0) + (breakdown.rhythm || 0) +
    (breakdown.exploration || 0) + (breakdown.pedagogicalIntegration || 0) +
    (breakdown.surprise || 0);

  // Overall includes traversability weighting.
  const overall = Math.round(designTotal * 0.7 + (breakdown.traversability / 100) * 30);

  let grade;
  if (overall >= 85) grade = "A";
  else if (overall >= 70) grade = "B";
  else if (overall >= 55) grade = "C";
  else if (overall >= 40) grade = "D";
  else grade = "F";

  return {
    overall,
    designScore: designTotal,
    breakdown,
    grade,
    issues,
    pass: designTotal >= 65,
    levelShape: level.levelShape || "unknown",
    blockCount: seq.length,
    uniqueBlockTypes: uniqueBlocks.size,
  };
}

// ─── Validate All Levels ───

export function validateAllLevels() {
  const results = [];
  let allTraversable = true;

  for (const level of state.levels) {
    const score = scoreLevelQuality(level);
    const result = {
      id: level.id,
      biome: level.biomeId,
      seed: level.seed,
      size: `${level.widthTiles}x${level.heightTiles}`,
      shape: level.levelShape || "flat",
      enemies: level.initialEnemyCount,
      bonuses: level.bonuses?.length || 0,
      secrets: (level.secretZones || []).length,
      conjugationGates: (level.conjugationGates || []).length,
      blocks: (level.blockSequence || []).length,
      uniqueBlocks: score.uniqueBlockTypes,
      traversable: score.breakdown.traversability === 100,
      grade: score.grade,
      overall: score.overall,
      designScore: score.designScore,
      breakdown: score.breakdown,
      issues: score.issues,
    };
    if (!result.traversable) allTraversable = false;
    results.push(result);
  }

  const grades = results.map((r) => `L${r.id}:${r.grade}(${r.overall})`).join(" ");
  const summary = `${results.length} levels validated. ${grades}. ${allTraversable ? "All traversable." : "TRAVERSABILITY ISSUES FOUND."}`;

  return { results, allTraversable, summary };
}
