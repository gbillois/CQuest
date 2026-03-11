// ─── Level Playability Validator ───
// Checks that a generated level is traversable from start to goal,
// and scores overall quality.

import { GAME, PLAYER_HITBOX_WIDTH, PLAYER_HITBOX_HEIGHT, HERO_SCALE } from "./constants.js";
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
  // v^2 = 2*g*h => h = v^2/(2*g)
  const maxHeightPx = (GAME.jumpVelocity * GAME.jumpVelocity) / (2 * GAME.gravity);
  return Math.floor(maxHeightPx / tileSize);
}

// ─── Traversability check ───
// Walks from start to goal along the ground and platforms,
// verifying every gap is jumpable and every platform is reachable.

function hasSolidAt(grid, x, y, heightTiles) {
  if (x < 0 || y < 0 || x >= grid[0].length || y >= heightTiles) return false;
  return isSolidTile(grid[y]?.[x]);
}

function hasLandingSurface(grid, x, startY, endY, heightTiles) {
  for (let y = startY; y <= endY; y++) {
    if (hasSolidAt(grid, x, y, heightTiles)) return true;
  }
  return false;
}

/**
 * Check if the level is traversable from start to goal.
 * Uses a simplified reachability flood: for each ground column,
 * check if the next ground column is reachable via jump.
 *
 * @param {object} level - A generated level object.
 * @returns {{ traversable: boolean, issues: string[] }}
 */
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

  // Build surface map: for each column, find the highest solid tile at or below groundY.
  const surfaceY = new Array(widthTiles).fill(-1);
  for (let x = 0; x < widthTiles; x++) {
    for (let y = 0; y <= groundY + 3; y++) {
      if (hasSolidAt(grid, x, y, heightTiles)) {
        surfaceY[x] = y;
        break;
      }
    }
  }

  // Simple reachability: walk left to right. When we hit a gap (no surface),
  // check if we can jump across to the next solid column within maxJump tiles.
  let currentX = startTileX;
  let gapStart = -1;

  while (currentX < endTileX) {
    if (surfaceY[currentX] >= 0) {
      // On solid ground — advance.
      if (gapStart >= 0) {
        gapStart = -1;
      }
      currentX++;
      continue;
    }

    // We're over a gap.
    if (gapStart < 0) {
      gapStart = currentX;
    }

    // Look ahead for landing.
    let foundLanding = false;
    for (let ahead = 1; ahead <= maxJump + 1; ahead++) {
      const landX = gapStart + ahead;
      if (landX >= widthTiles) break;
      if (surfaceY[landX] >= 0) {
        // Check height difference is jumpable.
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
      issues.push(`Impassable gap starting at tile x=${gapStart} (>${maxJump} tiles wide, no landing found)`);
      // Skip past this gap to continue checking the rest.
      currentX = gapStart + maxJump + 2;
      gapStart = -1;
    }
  }

  return {
    traversable: issues.length === 0,
    issues,
  };
}

// ─── Level quality scoring ───

/**
 * Score a level's quality on several dimensions.
 * Returns a score object with 0-100 ratings and an overall grade.
 *
 * @param {object} level - A generated level object.
 * @returns {{ overall: number, breakdown: object, grade: string }}
 */
export function scoreLevelQuality(level) {
  const breakdown = {};

  // 1. Enemy density: 1 enemy per 15-25 tiles is ideal.
  const tilesPerEnemy = level.widthTiles / Math.max(1, level.initialEnemyCount);
  if (tilesPerEnemy < 8) {
    breakdown.enemyDensity = 40; // too crowded
  } else if (tilesPerEnemy > 40) {
    breakdown.enemyDensity = 50; // too sparse
  } else if (tilesPerEnemy >= 15 && tilesPerEnemy <= 25) {
    breakdown.enemyDensity = 100; // ideal
  } else {
    breakdown.enemyDensity = 75; // acceptable
  }

  // 2. Bonus accessibility: bonuses should exist.
  const bonusCount = level.bonuses?.length || 0;
  if (bonusCount === 0) {
    breakdown.bonuses = 30;
  } else if (bonusCount >= 3 && bonusCount <= 12) {
    breakdown.bonuses = 100;
  } else {
    breakdown.bonuses = 70;
  }

  // 3. Traversability.
  const { traversable, issues } = checkTraversability(level);
  breakdown.traversability = traversable ? 100 : Math.max(0, 100 - issues.length * 25);

  // 4. Path variety: count distinct platform heights used.
  const platformHeights = new Set();
  for (let y = 0; y < level.groundY - 1; y++) {
    for (let x = 0; x < level.widthTiles; x++) {
      const tile = level.tileGrid[y]?.[x];
      if (tile && isOneWayPlatformTile(tile)) {
        platformHeights.add(y);
        break;
      }
    }
  }
  if (platformHeights.size >= 3) {
    breakdown.variety = 100;
  } else if (platformHeights.size >= 2) {
    breakdown.variety = 75;
  } else if (platformHeights.size >= 1) {
    breakdown.variety = 50;
  } else {
    breakdown.variety = 25;
  }

  // 5. Enemy spread: enemies shouldn't cluster.
  const enemyXs = (level.enemySpawns || []).map((e) => e.x).sort((a, b) => a - b);
  let minGap = Infinity;
  for (let i = 1; i < enemyXs.length; i++) {
    minGap = Math.min(minGap, enemyXs[i] - enemyXs[i - 1]);
  }
  const tileSize = state.tileSize || 64;
  if (enemyXs.length <= 1) {
    breakdown.enemySpread = 80;
  } else if (minGap < tileSize * 2) {
    breakdown.enemySpread = 40; // too close
  } else if (minGap >= tileSize * 4) {
    breakdown.enemySpread = 100;
  } else {
    breakdown.enemySpread = 70;
  }

  // Overall weighted average.
  const weights = {
    traversability: 3,
    enemyDensity: 1,
    bonuses: 1,
    variety: 1,
    enemySpread: 1,
  };
  let totalWeight = 0;
  let totalScore = 0;
  for (const [key, weight] of Object.entries(weights)) {
    totalWeight += weight;
    totalScore += (breakdown[key] || 0) * weight;
  }
  const overall = Math.round(totalScore / totalWeight);

  let grade;
  if (overall >= 90) grade = "A";
  else if (overall >= 75) grade = "B";
  else if (overall >= 60) grade = "C";
  else if (overall >= 40) grade = "D";
  else grade = "F";

  return { overall, breakdown, grade, issues: checkTraversability(level).issues };
}

/**
 * Validate all levels in state.levels and return a summary.
 * @returns {{ results: object[], allTraversable: boolean, summary: string }}
 */
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
      enemies: level.initialEnemyCount,
      bonuses: level.bonuses?.length || 0,
      traversable: score.breakdown.traversability === 100,
      grade: score.grade,
      overall: score.overall,
      issues: score.issues,
    };
    if (!result.traversable) allTraversable = false;
    results.push(result);
  }

  const grades = results.map((r) => r.grade).join(", ");
  const summary = `${results.length} levels validated. Grades: ${grades}. ${allTraversable ? "All traversable." : "TRAVERSABILITY ISSUES FOUND."}`;

  return { results, allTraversable, summary };
}
