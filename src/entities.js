import {
  GAME, VIRTUAL_WIDTH, VIRTUAL_HEIGHT,
  ENEMY_MOVE_SPEED, ENEMY_DEFEAT_FADE_SECONDS, ENEMY_DROP_GRAVITY, ENEMY_DROP_MAX_FALL_SPEED, ENEMY_DROP_SIZE_RATIO,
  BONUS_POPUP_GRAVITY, BONUS_POPUP_MAX_FALL_SPEED, WORLD_SCALE,
  PLAYER_HIT_INVULN_SECONDS, PLAYER_HIT_STUN_SECONDS,
  PLAYER_HIT_KNOCKBACK_X, PLAYER_HIT_KNOCKBACK_Y, PLAYER_DEATH_DELAY_SECONDS, PLAYER_DEATH_LAUNCH_Y,
  MAX_HEARTS, TOWER_HEIGHT_SCALE, CASTLE_SCALE,
  BOSS_LEVEL_VALUE, BOSS_TRIALS_REQUIRED, BOSS_TRIAL_TIME_LIMIT_SECONDS,
  BOSS_CELEBRATION_SECONDS, BOSS_DEFEAT_OVERLAY_SECONDS, BOSS_INTRO_MESSAGE_DELAY_SECONDS,
  BOSS_DRAGON_ATTACK_SW_FRAMES, BOSS_FALLBACK_DRAGON_FRAME,
  MAGE_FIREBALL_SPEED, MAGE_FIREBALL_RADIUS,
  NINJA_SHURIKEN_SPEED, NINJA_SHURIKEN_RADIUS,
  PIRATE_SABER_SPEED_X, PIRATE_SABER_SPEED_Y, PIRATE_SABER_GRAVITY, PIRATE_SABER_RADIUS,
  BARBARIAN_AXE_SPEED, BARBARIAN_AXE_RADIUS,
  GOLEM_ROCK_SPEED_X, GOLEM_ROCK_SPEED_Y, GOLEM_ROCK_GRAVITY, GOLEM_ROCK_RADIUS,
  KNIGHT_FIREBALL_SPEED, KNIGHT_FIREBALL_RADIUS,
  BIOME_PARALLAX_BACKGROUNDS,
  PLAYER_HITBOX_WIDTH, PLAYER_HITBOX_HEIGHT, PLAYER_HIT_BLINK_HZ,
  ANIMAL_BOUNCE_VELOCITY,
  getStartingHearts,
} from "./constants.js";
import { clamp, aabb, circleIntersectsRect } from "./utils.js";
import { state, ui, imageCache } from "./state.js";
import { t } from "./i18n.js";
import { resolveHorizontalCollisions, resolveVerticalCollisions, isSolidAtPoint, getNearbySolidRects, resolveBonusPopupVerticalCollision } from "./physics.js";
import { isImageRenderable } from "./asset-loader.js";
import { grantGold } from "./persistence.js";
import { getSelectedHeroId } from "./persistence.js";

/* ── late-bound hooks (set via setEntityHooks) ── */
let _openQuestion = null;
let _showMessage = null;
let _loadLevel = null;
let _showGameOverScreen = null;
let _requestLeaderboardEntry = null;

export function setEntityHooks({ openQuestion, showMessage, loadLevel, showGameOverScreen, requestLeaderboardEntry }) {
  _openQuestion = openQuestion;
  _showMessage = showMessage;
  _loadLevel = loadLevel;
  _showGameOverScreen = showGameOverScreen;
  _requestLeaderboardEntry = requestLeaderboardEntry;
}

export function getLevelDisplayName(level = state.currentLevel) {
  const biomeId = level?.biomeId || "forest";
  return t("levelLabel", {
    level: (state.currentLevelIndex || 0) + 1,
    biome: t(`biome.${biomeId}`),
  });
}

export function showLevelFloatingMessage(messageKey, vars = {}) {
  const levelName = getLevelDisplayName();
  const detail = t(messageKey, vars);
  _showMessage?.(`${levelName} · ${detail}`);
}

export function pushFloatingReward(text, worldX, worldY, style = "gold") {
  if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
    return;
  }
  state.floatingRewards.push({
    text,
    worldX,
    worldY,
    rise: 0,
    life: 1.05,
    ttl: 1.05,
    style,
  });
}

/* ═══════════════════════════════════════════════════════════
   Enemy AI
   ═══════════════════════════════════════════════════════════ */

export function updateEnemies(delta) {
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

export function updateAnimals(delta) {
  const level = state.currentLevel;
  if (!level?.animalSpawns) return;

  for (const animal of level.animalSpawns) {
    animal.prevY = animal.y;
    animal.animTime += delta;

    let dir = animal.dir >= 0 ? 1 : -1;
    if (animal.onGround) {
      const wallAhead = enemyHasObstacleAhead(animal, level, dir);
      const supportAhead = enemyHasSupportAhead(animal, level, dir, 5);
      if (wallAhead || !supportAhead) {
        dir *= -1;
      }
    }

    animal.dir = dir;
    animal.vx = dir * ENEMY_MOVE_SPEED;
    const prevX = animal.x;
    animal.x += animal.vx * delta;
    resolveHorizontalCollisions(animal, level);

    if (Math.abs(animal.x - prevX) < 0.05) {
      animal.dir *= -1;
    }

    if (animal.onGround && !enemyHasGroundUnder(animal, level)) {
      animal.x = prevX;
      animal.dir *= -1;
    }

    if (animal.x <= 0) {
      animal.dir = 1;
    } else if (animal.x >= level.worldWidth - animal.w) {
      animal.dir = -1;
    }

    animal.vy = Math.min(animal.vy + GAME.gravity * delta, GAME.maxFallVelocity);
    animal.y += animal.vy * delta;
    resolveVerticalCollisions(animal, level);
  }
}

export function checkAnimalBounce() {
  const level = state.currentLevel;
  const player = state.player;
  if (!level?.animalSpawns || !player) return;

  if (player.vy <= 0) return;

  for (const animal of level.animalSpawns) {
    // Check horizontal overlap
    if (player.x + player.w <= animal.x || player.x >= animal.x + animal.w) continue;
    // Player was above animal top in previous frame
    const prevBottom = (player.prevY ?? player.y) + player.h;
    if (prevBottom > animal.y + animal.h * 0.4) continue;
    // Player bottom is now overlapping animal top
    if (player.y + player.h < animal.y) continue;

    player.vy = ANIMAL_BOUNCE_VELOCITY;
    player.onGround = false;
    const bounceReward = 5;
    grantGold(bounceReward);
    state.score += 10;
    pushFloatingReward(`+${bounceReward} ${t("pieces")}`, animal.x + animal.w * 0.5, animal.y, "gold");
    break;
  }
}

export function enemyHasSupportAhead(enemy, level, dir, lookAheadPx) {
  const probeX = dir > 0 ? enemy.x + enemy.w + lookAheadPx : enemy.x - lookAheadPx;
  const probeY = enemy.y + enemy.h + 2;
  return isSolidAtPoint(level, probeX, probeY);
}

export function enemyHasGroundUnder(enemy, level) {
  const footY = enemy.y + enemy.h + 2;
  const leftX = enemy.x + enemy.w * 0.24;
  const rightX = enemy.x + enemy.w * 0.76;
  return isSolidAtPoint(level, leftX, footY) || isSolidAtPoint(level, rightX, footY);
}

export function enemyHasObstacleAhead(enemy, level, dir) {
  const probeX = dir > 0 ? enemy.x + enemy.w + 3 : enemy.x - 3;
  const probeYTop = enemy.y + enemy.h * 0.4;
  const probeYBottom = enemy.y + enemy.h * 0.78;
  return isSolidAtPoint(level, probeX, probeYTop) || isSolidAtPoint(level, probeX, probeYBottom);
}

/* ═══════════════════════════════════════════════════════════
   Projectiles
   ═══════════════════════════════════════════════════════════ */

export function castHeroProjectile() {
  if (!state.currentLevel || !state.player || state.towerInterior.active || state.boss.active) {
    return false;
  }
  const heroId = getSelectedHeroId();
  if (!["mage", "ninja", "pirate", "barbarian", "golem", "knight"].includes(heroId)) {
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

  if (heroId === "barbarian") {
    state.fireballs.push({
      x: originX,
      y: centerOriginY,
      vx: forwardSign * BARBARIAN_AXE_SPEED,
      vy: -20,
      gravity: 0,
      life: 1.05,
      radius: BARBARIAN_AXE_RADIUS,
      kind: "axe",
      spin: Math.random() * Math.PI * 2,
      spinSpeed: 11,
      rotation: forwardSign > 0 ? 0 : Math.PI,
    });
    return true;
  }

  if (heroId === "golem") {
    state.fireballs.push({
      x: originX,
      y: castOriginY,
      vx: forwardSign * GOLEM_ROCK_SPEED_X,
      vy: GOLEM_ROCK_SPEED_Y,
      gravity: GOLEM_ROCK_GRAVITY,
      life: 1.45,
      radius: GOLEM_ROCK_RADIUS,
      kind: "rock",
      spin: Math.random() * Math.PI * 2,
      spinSpeed: 4.5,
    });
    return true;
  }

  const target = findClosestEnemyAhead(originX, forwardSign);
  if (heroId === "knight") {
    const targetX = target ? target.x + target.w * 0.5 : originX + forwardSign * 180;
    const targetY = target ? target.y + target.h * 0.5 : castOriginY;
    const dx = targetX - originX;
    const dy = targetY - castOriginY;
    const distance = Math.hypot(dx, dy) || 1;
    state.fireballs.push({
      x: originX,
      y: castOriginY,
      vx: (dx / distance) * KNIGHT_FIREBALL_SPEED,
      vy: (dy / distance) * KNIGHT_FIREBALL_SPEED,
      gravity: 0,
      life: Math.max(0.55, distance / KNIGHT_FIREBALL_SPEED + 0.2),
      radius: KNIGHT_FIREBALL_RADIUS,
      kind: "golden-fireball",
    });
    return true;
  }

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

export function findClosestEnemyAhead(originX, forwardSign) {
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

export function updateFireballs(delta) {
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
      _openQuestion?.(hitEnemy);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   Death sequence
   ═══════════════════════════════════════════════════════════ */

export function updateDeathSequence(delta) {
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
  _showGameOverScreen?.();
}

/* ═══════════════════════════════════════════════════════════
   Bonus blocks
   ═══════════════════════════════════════════════════════════ */

export function updateBonusBlocks(delta) {
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
      applyBonusReward(block.rewardType, block.popup);
      block.popup.collected = true;
    }
  }
}

export function triggerBonusBlock(block) {
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

export function applyBonusReward(rewardType, sourceEntity = null) {
  const popupX = sourceEntity ? sourceEntity.x + sourceEntity.w * 0.5 : null;
  const popupY = sourceEntity ? sourceEntity.y : null;
  const showGoldGain = (value) => {
    if (value > 0 && popupX != null && popupY != null) {
      pushFloatingReward(`+${value} ${t("pieces")}`, popupX, popupY, "gold");
    }
  };

  if (rewardType.includes("deco_double_axe")) {
    grantGold(50);
    state.score += 200;
    showGoldGain(50);
    return;
  }

  if (rewardType.includes("deco_helmet")) {
    grantGold(30);
    state.score += 120;
    showGoldGain(30);
    return;
  }

  if (rewardType.includes("deco_flail")) {
    grantGold(40);
    state.score += 160;
    showGoldGain(40);
    return;
  }

  if (rewardType.includes("deco_royal_shield")) {
    grantGold(100);
    state.score += 400;
    showGoldGain(100);
    return;
  }

  if (rewardType.includes("jewel")) {
    grantGold(12);
    state.score += 60;
    showGoldGain(12);
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
    showGoldGain(4);
    return;
  }

  state.score += 5;
}

export function getBonusRewardValue(rewardType) {
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

export function getBonusPopupStyleByValue(value) {
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

export function collectBonuses() {
  // Legacy entry point kept for compatibility.
  const level = state.currentLevel;
  if (!level) {
    return;
  }
}

/* ═══════════════════════════════════════════════════════════
   Crumbling Platforms
   ═══════════════════════════════════════════════════════════ */

export function updateCrumblingPlatforms(delta) {
  const level = state.currentLevel;
  if (!level?.crumblingPlatforms?.length) return;
  const player = state.player;
  const tileSize = state.tileSize;

  for (const plat of level.crumblingPlatforms) {
    if (plat.removed) continue;

    // Check player standing on this platform.
    if (!plat.triggered) {
      const platWorldX = plat.x * tileSize;
      const platWorldY = plat.y * tileSize;
      const platWorldW = plat.width * tileSize;
      const playerFeetY = player.y + player.h;
      const playerCenterX = player.x + player.w * 0.5;

      // Tolerance accounts for tile collision insets (~16% top inset on platform tiles).
      const tolerance = tileSize * 0.25;
      if (
        player.onGround &&
        Math.abs(playerFeetY - platWorldY) < tolerance &&
        playerCenterX >= platWorldX &&
        playerCenterX <= platWorldX + platWorldW
      ) {
        plat.triggered = true;
        plat.timer = plat.disappearDelay;
        plat.shakeTime = plat.disappearDelay; // Shake for entire delay.
      }
      continue;
    }

    // Count down to removal.
    plat.timer -= delta;
    plat.shakeTime -= delta;

    if (plat.timer <= 0) {
      // Remove tiles from the grid.
      for (let dx = 0; dx < plat.width; dx++) {
        const tx = plat.x + dx;
        if (tx >= 0 && tx < level.widthTiles && plat.y >= 0 && plat.y < level.heightTiles) {
          level.tileGrid[plat.y][tx] = null;
        }
      }
      plat.removed = true;
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   Moving Platforms
   ═══════════════════════════════════════════════════════════ */

export function updateMovingPlatforms(delta) {
  const level = state.currentLevel;
  if (!level?.movingPlatforms?.length) return;
  const player = state.player;
  const tileSize = state.tileSize;

  for (const plat of level.movingPlatforms) {
    // Initialize runtime state.
    if (plat.originX == null) {
      plat.originX = plat.x * tileSize;
      plat.originY = plat.y * tileSize;
      plat.elapsed = plat.phase || 0;
      plat.prevWorldX = plat.originX;
      plat.prevWorldY = plat.originY;
      plat.worldX = plat.originX;
      plat.worldY = plat.originY;
      plat.worldW = plat.width * tileSize;

      // Remove static tiles so the platform can move freely.
      for (let dx = 0; dx < plat.width; dx++) {
        const tx = plat.x + dx;
        if (tx >= 0 && tx < level.widthTiles && plat.y >= 0 && plat.y < level.heightTiles) {
          level.tileGrid[plat.y][tx] = null;
        }
      }
    }

    plat.elapsed += delta;

    const prevX = plat.prevWorldX;
    const prevY = plat.prevWorldY;
    let newX = plat.originX;
    let newY = plat.originY;

    if (plat.axis === "horizontal") {
      const range = plat.rangeX || (3 * tileSize);
      newX = plat.originX + Math.sin(plat.elapsed * (plat.speed / 30)) * range;
    } else {
      const range = plat.rangeY || (2 * tileSize);
      newY = plat.originY + Math.sin(plat.elapsed * (plat.speed / 30)) * range;
    }

    const dx = newX - prevX;
    const dy = newY - prevY;
    plat.prevWorldX = newX;
    plat.prevWorldY = newY;

    // Move tiles in grid: clear old, set new positions.
    // Instead of moving grid tiles (complex), use collision rects approach:
    // Store world position and check player riding.
    plat.worldX = newX;
    plat.worldY = newY;

    // Check if player is riding this platform.
    // Tolerance accounts for tile collision insets (~16% top) + per-frame movement.
    const playerFeetY = player.y + player.h;
    const playerCenterX = player.x + player.w * 0.5;
    const rideTolerance = tileSize * 0.25;
    const onPlatform =
      player.onGround &&
      Math.abs(playerFeetY - newY) < rideTolerance &&
      playerCenterX >= newX &&
      playerCenterX <= newX + plat.worldW;

    if (onPlatform) {
      player.x += dx;
      player.y += dy;
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   Conjugation Gates
   ═══════════════════════════════════════════════════════════ */

export function updateConjugationGates() {
  const level = state.currentLevel;
  if (!level?.conjugationGates?.length) return;
  if (!state.duel || state.duel.QS.active || state.screenMode === "question") return;
  if (state.paused || state.gameOver || state.deathSequence.active) return;
  if (state.playerHitInvuln > 0) return;

  const player = state.player;
  const tileSize = state.tileSize;

  for (const gate of level.conjugationGates) {
    if (gate.opened) continue;

    // Proximity check: player within 1.5 tiles of gate.
    const gateCenterX = gate.x + tileSize * 0.5;
    const gateCenterY = gate.y + tileSize * 0.5;
    const playerCenterX = player.x + player.w * 0.5;
    const playerCenterY = player.y + player.h * 0.5;
    const dist = Math.hypot(gateCenterX - playerCenterX, gateCenterY - playerCenterY);

    if (dist > tileSize * 1.8) continue;

    // Cooldown to prevent immediate re-trigger.
    if (gate._cooldownUntil && performance.now() < gate._cooldownUntil) continue;

    // Open a standalone conjugation question for this gate.
    const diffLabel = gate.difficulty === "hard" ? "Difficile" : gate.difficulty === "medium" ? "Moyen" : "Facile";
    const typeLabel = gate.type.replace(/_/g, " ");
    const opened = state.duel.openStandaloneQuestion({
      vd: state.duel.randomVerbData(),
      uiMeta: {
        enemyEmoji: "\uD83D\uDEE1\uFE0F",
        groupLabel: `Porte: ${typeLabel} (${diffLabel})`,
      },
      onCorrect: () => {
        gate.opened = true;
        // Remove blocking tiles if gate is a guardian type.
        if (gate.type === "guardian" || gate.type === "cascade") {
          const tx = gate.tileX;
          const ty = gate.tileY;
          if (ty >= 0 && ty < level.heightTiles && tx >= 0 && tx < level.widthTiles) {
            level.tileGrid[ty][tx] = null;
            if (ty - 1 >= 0) level.tileGrid[ty - 1][tx] = null;
          }
        }
        showLevelFloatingMessage("gateOpened");
        state.score += 50;
      },
      onWrong: () => {
        gate._cooldownUntil = performance.now() + 2000;
        showLevelFloatingMessage("gateRetry");
      },
    });

    if (opened) {
      // Stop player movement during gate challenge.
      player.vx = 0;
      break; // Only one gate at a time.
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   Enemy drops
   ═══════════════════════════════════════════════════════════ */

export function getRewardSpritePath(rewardType) {
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

export function spawnEnemyDrop(enemy, { rewardType, value = 0, score = 0 }) {
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

export function updateEnemyDrops(delta) {
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
        applyBonusReward(drop.rewardType, drop);
      }
      if (drop.value > 0 && drop.rewardType === "enemy_coin_drop") {
        grantGold(drop.value);
        pushFloatingReward(`+${drop.value} ${t("pieces")}`, drop.x + drop.w * 0.5, drop.y, "gold");
      }
      if (drop.score > 0) {
        state.score += drop.score;
      }
      drop.collected = true;
    }
  }

  level.enemyDrops = level.enemyDrops.filter((drop) => !drop.collected);
}

/* ═══════════════════════════════════════════════════════════
   Damage & defeat
   ═══════════════════════════════════════════════════════════ */

export function collideWithEnemies() {
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
    _openQuestion?.(enemy);
    return;
  }
}

export function damagePlayer(reason, sourceX = null) {
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
  _showMessage?.(reason);

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
    showLevelFloatingMessage("youDied");
  }
}

export function hitPlayer() {
  if (state.playerHitInvuln > 0 || state.deathSequence.active) {
    return;
  }
  damagePlayer(t("wrongConjugation"));
}

export function defeatEnemy(enemy) {
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
  const coinReward = 6;
  spawnEnemyDrop(enemy, { rewardType: "enemy_coin_drop", value: coinReward, score: 0 });
  pushFloatingReward(`+${coinReward} ${t("pieces")}`, enemy.x + enemy.w * 0.5, enemy.y, "gold");

  let rewardMessage = t("enemyDefeatedReward", { score: 100, coins: coinReward });
  if ((enemy.questionAttempts || 0) === 1) {
    const firstStrikeRewards = ["deco_helmet", "deco_jewel", "deco_flail"];
    const rewardType = firstStrikeRewards[Math.floor(Math.random() * firstStrikeRewards.length)];
    spawnEnemyDrop(enemy, { rewardType, value: 1, score: 0 });
    const rewardLabel = rewardType === "deco_flail" ? "flail" : rewardType.replace("deco_", "");
    rewardMessage = `${rewardMessage} · ${t("enemyFirstHitBonus", { reward: rewardLabel })}`;
  }

  showLevelFloatingMessage("enemyDefeated", { reward: rewardMessage });
}

export function respawnPlayer({ fromStart = false } = {}) {
  const player = state.player;
  const level = state.currentLevel;
  const start = level.start;
  const history = state.respawnTrail?.history || [];
  const snapshot = fromStart ? null : (history.length ? history[history.length - 1] : null);
  const respawnX = snapshot ? snapshot.x : start.x;
  const respawnY = snapshot ? snapshot.y : (start.y - player.h);

  player.x = clamp(respawnX, 0, Math.max(0, level.worldWidth - player.w));
  player.y = clamp(respawnY, -player.h * 2, level.worldHeight - player.h);
  player.prevY = player.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.coyoteTime = 0;
}

/* ═══════════════════════════════════════════════════════════
   Tower interior
   ═══════════════════════════════════════════════════════════ */

export function getTowerBounds(level) {
  const towerW = 116;
  const towerH = Math.round(200 * TOWER_HEIGHT_SCALE);
  const x = clamp(level.towerX - towerW / 2, 0, level.worldWidth - towerW);
  const y = level.groundY * state.tileSize - (towerH - state.tileSize);
  return { x, y, w: towerW, h: towerH };
}

export function getTowerInteriorFloorY() {
  return VIRTUAL_HEIGHT - 34;
}

export function getTowerInteriorChestBounds() {
  const chestW = 84;
  const chestH = 84;
  const floorY = getTowerInteriorFloorY();
  const chestX = Math.round(VIRTUAL_WIDTH * 0.68 - chestW * 0.5);
  const chestY = Math.round(floorY - chestH - 100);
  return { x: chestX, y: chestY, w: chestW, h: chestH };
}

export function getTowerInteriorChestTriggerBounds() {
  const chest = getTowerInteriorChestBounds();
  return {
    x: chest.x - 10,
    y: chest.y,
    w: chest.w + 20,
    h: chest.h + 120,
  };
}

export function openTowerChestAttempt() {
  if (!state.duel || state.duel.QS.active || state.towerInterior.chestState !== "locked") {
    return;
  }

  const streak = state.towerInterior.chestStreak;
  const required = state.towerInterior.chestRequired;
  const opened = state.duel.openStandaloneQuestion({
    vd: state.duel.randomVerbData(),
    uiMeta: {
      enemyEmoji: "\uD83D\uDCE6",
      enemySprite: "game_assets/decoration/deco_chest.png",
      groupLabel: `Coffre de la tour ${streak}/${required}`,
    },
    onCorrect() {
      state.towerInterior.chestStreak += 1;
      const current = state.towerInterior.chestStreak;
      if (current >= required) {
        const pieces = 50 + Math.floor(Math.random() * 101);
        state.towerInterior.chestState = "open";
        state.towerInterior.chestRewardPieces = pieces;
        grantGold(pieces);
        state.score += pieces * 2;
        showLevelFloatingMessage("towerChestOpened", { pieces });
        return;
      }
      showLevelFloatingMessage("towerChestStreak", { current, required });
    },
    onWrong() {
      state.towerInterior.chestStreak = 0;
      state.towerInterior.chestState = "destroyed";
      state.towerInterior.chestExplodeUntil = performance.now() + 1000;
      showLevelFloatingMessage("towerChestFailed");
    },
  });

  if (opened) {
    state.towerInterior.chestPromptUntil = performance.now() + 450;
  }
}

export function tryEnterTower() {
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
    showLevelFloatingMessage("towerChestTouchPrompt", { required: state.towerInterior.chestRequired });
  } else if (state.towerInterior.chestState === "open") {
    showLevelFloatingMessage("towerChestAlreadyOpened", { pieces: state.towerInterior.chestRewardPieces });
  } else {
    showLevelFloatingMessage("towerChestMissing");
  }
  return true;
}

export function leaveTowerInterior(side) {
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
  showLevelFloatingMessage("towerExit");
}

export function updateTowerInterior(delta) {
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
    const chestTrigger = getTowerInteriorChestTriggerBounds();
    if (aabb(player, chestTrigger)) {
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

/* ═══════════════════════════════════════════════════════════
   Goal & castle
   ═══════════════════════════════════════════════════════════ */

export function checkGoal() {
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
      showLevelFloatingMessage("castleLocked", { pct });
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
  const castleReward = 18;
  grantGold(castleReward);
  pushFloatingReward(`+${castleReward} ${t("pieces")}`, goal.x + goal.w * 0.5, goal.y, "gold");

  if (state.currentLevelIndex < state.levels.length - 1) {
    _loadLevel?.(state.currentLevelIndex + 1, false);
  } else {
    startBossMode({ sourceLevelIndex: state.currentLevelIndex });
  }
}

export function getEnemyCounts(level) {
  const defeated = Math.max(0, Math.floor(level.defeatedEnemyCount || 0));
  const fallbackTotal = defeated + (level.enemySpawns?.length || 0);
  const total = Math.max(0, Math.floor(Number.isFinite(level.initialEnemyCount) ? level.initialEnemyCount : fallbackTotal));
  return { total, defeated: Math.min(defeated, total) };
}

export function getEnemyDefeatRatio(level) {
  const { total, defeated } = getEnemyCounts(level);
  if (total <= 0) {
    return 1;
  }
  return defeated / total;
}

export function isEndCastleUnlocked(level) {
  const { total, defeated } = getEnemyCounts(level);
  if (total <= 0) {
    return true;
  }
  return defeated > total * 0.5;
}

export function getCastleMetrics(level) {
  const castleW = Math.round(220 * CASTLE_SCALE);
  const castleH = Math.round(212 * CASTLE_SCALE);
  const castleY = level.groundY * state.tileSize - (castleH - state.tileSize);
  return { castleW, castleH, castleY };
}

export function getEndCastleBounds(level) {
  const { castleW, castleH, castleY } = getCastleMetrics(level);
  const x = clamp(level.castleX - castleW / 2, 0, level.worldWidth - castleW);
  return { x, y: castleY, w: castleW, h: castleH };
}

export function getEndCastleDoorBounds(level) {
  const castle = getEndCastleBounds(level);
  const doorW = Math.round(castle.w * 0.22);
  const doorH = Math.round(castle.h * 0.34);
  const doorX = Math.round(castle.x + castle.w * 0.39);
  const doorY = Math.round(castle.y + castle.h - doorH - Math.max(2, state.tileSize * 0.08));
  return { x: doorX, y: doorY, w: doorW, h: doorH };
}

/* ═══════════════════════════════════════════════════════════
   Boss mode
   ═══════════════════════════════════════════════════════════ */

export function resetBossState() {
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

export function updateBossQuestionCountdown() {
  if (!ui.questionCountdown) {
    return;
  }
  if (!state.boss.active || !state.duel?.QS.active || state.boss.phase !== "trials") {
    ui.questionCountdown.hidden = true;
    return;
  }
  const secondsLeft = Math.max(0, Math.ceil((state.boss.trialDeadline - performance.now()) / 1000));
  ui.questionCountdown.hidden = false;
  ui.questionCountdown.textContent = `\u23F3 ${secondsLeft}s`;
  ui.questionCountdown.style.color = secondsLeft <= 3 ? "#ff8e42" : "#ffd56a";
}

export function getBossDragonFrame(timeSeconds) {
  const frames = BOSS_DRAGON_ATTACK_SW_FRAMES.map((path) => imageCache.get(path)).filter(isImageRenderable);
  if (frames.length) {
    const index = Math.floor(timeSeconds * 10) % frames.length;
    return frames[index];
  }
  const fallback = imageCache.get(BOSS_FALLBACK_DRAGON_FRAME);
  return isImageRenderable(fallback) ? fallback : null;
}

export function getBossPrepLevelIndex() {
  return Math.max(0, state.levels.length - 1);
}

export function updateBossRetryText(levelIndex) {
  if (!ui.bossDefeatRetryText) {
    return;
  }
  const wave = clamp(levelIndex + 1, 1, 999);
  ui.bossDefeatRetryText.textContent = t("returningWaveWithNumber", { wave });
}

export function startBossTrial() {
  if (!state.boss.active || (state.boss.phase !== "trials" && state.boss.phase !== "intro") || state.duel?.QS.active) {
    return;
  }
  state.boss.trialDeadline = performance.now() + state.boss.trialTimeLimit * 1000;
  const opened = state.duel?.openStandaloneQuestion({
    vd: state.duel.randomVerbData(),
    uiMeta: {
      enemyEmoji: "\uD83D\uDC09",
      groupLabel: t("dragonTrialLabel", { current: state.boss.streak, required: state.boss.required }),
      tenseLabel: t("dragonTrialTenseLabel"),
    },
    onCorrect: () => {
      if (!state.boss.active || state.boss.phase !== "trials") {
        return;
      }
      state.boss.streak += 1;
      if (state.boss.streak >= state.boss.required) {
        state.boss.phase = "celebration";
        state.boss.phaseUntil = performance.now() + BOSS_CELEBRATION_SECONDS * 1000;
        _showMessage?.(t("dragonDefeatedMessage"));
        return;
      }
      startBossTrial();
    },
    onWrong: () => {
      if (!state.boss.active || state.boss.phase !== "trials") {
        return;
      }
      failBossTrial(t("wrongAnswer"));
    },
  });
  if (!opened) {
    state.boss.phase = "defeat";
    state.boss.defeatReason = t("trialSetupFailed");
    state.boss.phaseUntil = performance.now() + BOSS_DEFEAT_OVERLAY_SECONDS * 1000;
  }
}

export function startBossMode({ sourceLevelIndex = getBossPrepLevelIndex() } = {}) {
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

export function failBossTrial(reason) {
  if (!state.boss.active || state.boss.phase !== "trials") {
    return;
  }
  if (state.duel?.QS.active) {
    state.duel.closeQuestion();
  }
  state.boss.phase = "defeat";
  state.boss.defeatReason = reason || t("trialFailed");
  state.boss.streak = 0;
  state.boss.phaseUntil = performance.now() + BOSS_DEFEAT_OVERLAY_SECONDS * 1000;
  if (ui.bossDefeatText) {
    ui.bossDefeatText.textContent = state.boss.defeatReason;
  }
  ui.bossDefeatPanel?.classList.remove("hidden");
}

export function showFinalVictoryScreen() {
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
  _requestLeaderboardEntry?.("victory");
}

export function updateBossMode() {
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
      failBossTrial(t("timeUp"));
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
    _loadLevel?.(retryIndex, false);
    _showMessage?.(t("returningWaveWithNumber", { wave: retryIndex + 1 }));
    return;
  }

  if (state.boss.phase === "celebration" && now >= state.boss.phaseUntil) {
    showFinalVictoryScreen();
  }
}
