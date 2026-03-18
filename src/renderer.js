import {
  VIRTUAL_WIDTH, VIRTUAL_HEIGHT, HERO_SCALE, ENEMY_SCALE, WORLD_SCALE, SKY_BIRD_SCALE, GUARD_SCALE,
  BIOME_BACKGROUNDS, BIOME_PARALLAX_BACKGROUNDS, BIOME_EMOJI,
  GROUND_THICKNESS_TILES, GROUND_TILE_OVERLAP_PX, GROUND_TILE_HORIZONTAL_OVERLAP_PX,
  GROUND_DECOR_FALLBACK_BOTTOM_PAD_RATIO,
  ENEMY_DEFEAT_FADE_SECONDS, ENEMY_DEFEAT_RISE_PX,
  PLAYER_RENDER_GROUND_OFFSET_PX, PLAYER_HIT_BLINK_HZ,
  BOSS_DRAGON_ATTACK_SW_FRAMES, BOSS_FALLBACK_DRAGON_FRAME,
  MIN_WORLD_ZOOM, MAX_WORLD_ZOOM,
  CAMERA_DEADZONE_X, CAMERA_LERP_SPEED,
} from "./constants.js";
import { clamp } from "./utils.js";
import { state, ctx, ui, imageCache } from "./state.js";
import { isImageRenderable, loadImage } from "./asset-loader.js";
import { t } from "./i18n.js";
import { getSolidTileCollisionRect, getSpriteOpaqueBounds, getEntitySpriteDrawRect } from "./physics.js";
import { isEndCastleUnlocked, getCastleMetrics, getEndCastleBounds, getEndCastleDoorBounds, getTowerBounds, getTowerInteriorFloorY, getTowerInteriorChestBounds, getBossDragonFrame } from "./entities.js";

const TILE_SIDE_TRANSITION_RATIO = 0.08;
const TILE_SIDE_TRANSITION_MAX_PX = 4;
const TILE_SIDE_TRANSITION_ALPHA = 0.28;
const DESOLATION_GROUND_DARKEN_ALPHA = 0.5;
const DESOLATION_MOUNTAIN_DARKEN_ALPHA = 0.42;

/* ── late-bound hooks (set by main module) ── */
let _syncWorldZoomUi = null;
let _saveWorldZoom = null;
export function setRendererHooks({ syncWorldZoomUi, saveWorldZoom }) {
  _syncWorldZoomUi = syncWorldZoomUi;
  _saveWorldZoom = saveWorldZoom;
}

/* ── Zoom helpers ── */

export function formatZoomLabel(zoom) {
  return `${Number(zoom).toFixed(1)}x`;
}

export function getWorldZoom(value = state.worldZoom) {
  return clamp(Number(value) || WORLD_SCALE, MIN_WORLD_ZOOM, MAX_WORLD_ZOOM);
}

export function syncCameraToCurrentZoom() {
  if (!state.currentLevel || !state.player) {
    return;
  }
  const zoom = getWorldZoom();
  const visibleWorldWidth = VIRTUAL_WIDTH / zoom;
  const desired = state.player.x - visibleWorldWidth * 0.35;
  const maxX = Math.max(0, state.currentLevel.worldWidth - visibleWorldWidth);
  state.cameraX = clamp(desired, 0, maxX);
}

export function setWorldZoom(nextZoom, { syncUi = true } = {}) {
  const clampedZoom = getWorldZoom(nextZoom);
  if (Math.abs(clampedZoom - state.worldZoom) < 0.0001) {
    if (syncUi) {
      _syncWorldZoomUi?.();
    }
    return;
  }
  state.worldZoom = clampedZoom;
  _saveWorldZoom?.(state.worldZoom);
  syncCameraToCurrentZoom();
  if (syncUi) {
    _syncWorldZoomUi?.();
  }
}

/* ── Camera ── */

export function updateCamera(delta = 1 / 60) {
  const zoom = getWorldZoom();
  const visibleWorldWidth = VIRTUAL_WIDTH / zoom;
  const desired = state.player.x - visibleWorldWidth * 0.35;
  const maxX = Math.max(0, state.currentLevel.worldWidth - visibleWorldWidth);
  const target = clamp(desired, 0, maxX);
  const diff = target - state.cameraX;
  // Deadzone: don't move camera for tiny player movements.
  if (Math.abs(diff) < CAMERA_DEADZONE_X) {
    return;
  }
  // FPS-independent exponential lerp: 1 - e^(-speed * dt).
  const t = 1 - Math.exp(-CAMERA_LERP_SPEED * delta);
  state.cameraX += diff * t;
}

export function getWorldRenderOffsetY(level) {
  const groundSurfaceWorldY = level.groundY * state.tileSize;
  const desiredGroundScreenY = VIRTUAL_HEIGHT - Math.round(state.tileSize * 1.35);
  return desiredGroundScreenY - groundSurfaceWorldY;
}

/* ── Main render ── */

export function render(timeSeconds) {
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
    drawCrumblingPlatforms(level, timeSeconds);
    drawMovingPlatforms(level, timeSeconds);
    drawConjugationGates(level, timeSeconds);
    drawGroundDecorations(level, { foreground: false });
    drawDecorations(level);
    drawBonuses(level, timeSeconds);
    drawSkyBirds(level);
    drawAnimals(level);
    drawGuards(level);
    drawEnemies(level);
    drawFireballs(level);
    drawEnemyDrops(level);
    drawGoal(level);
    drawPlayer(state.player);
    drawGroundDecorations(level, { foreground: true });
  } catch (error) {
    console.error("Render error:", error);
    drawPlayerFallback(state.player);
  }

  ctx.restore();

  // Ambient particles (drawn in screen space above world).
  drawParticles();

  // Debug level design overlay.
  drawDebugOverlay();

  if (state.message) {
    drawFloatingMessage(state.message);
  }
  drawFloatingRewards(level);
  drawGuardSpeech(level);

  if (!state.ready) {
    drawFloatingMessage("Loading...");
  }
}

/* ── Scene renderers ── */

export function drawBossScene(timeSeconds) {
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
  const dragonY = 150 + Math.cos(timeSeconds * 1.6) * 3;
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
    ctx.fillText(t("bossIntroLine1"), VIRTUAL_WIDTH * 0.5, 448);
    ctx.fillText(t("bossIntroLine2"), VIRTUAL_WIDTH * 0.5, 476);
    ctx.fillText(t("bossIntroLine3"), VIRTUAL_WIDTH * 0.5, 504);
  }

  const secondsLeft = Math.max(0, Math.ceil((state.boss.trialDeadline - performance.now()) / 1000));
  ctx.fillStyle = "#f7fbff";
  ctx.font = "bold 18px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(t("bossTitle"), VIRTUAL_WIDTH * 0.5, 52);
  ctx.font = "bold 15px Nunito, sans-serif";
  ctx.fillText(t("bossTrials", { current: state.boss.streak, required: state.boss.required }), VIRTUAL_WIDTH * 0.5, 78);
  if (state.boss.phase === "trials") {
    ctx.fillStyle = secondsLeft <= 3 ? "#ff8e42" : "#ffd56a";
    ctx.fillText(t("bossTimeLeft", { seconds: secondsLeft }), VIRTUAL_WIDTH * 0.5, 102);
  } else if (state.boss.phase === "celebration") {
    ctx.fillStyle = "#74f3d8";
    ctx.fillText(t("bossCeremony"), VIRTUAL_WIDTH * 0.5, 102);
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

export function drawTowerInteriorScene(timeSeconds) {
  const interiorImage = imageCache.get("game_assets/tower/tower_inside.png");
  const chestImage = imageCache.get("game_assets/decoration/deco_chest.png");

  if (interiorImage?.complete) {
    const scale = Math.max(VIRTUAL_WIDTH / interiorImage.width, VIRTUAL_HEIGHT / interiorImage.height);
    const drawW = interiorImage.width * scale;
    const drawH = interiorImage.height * scale;
    const drawX = (VIRTUAL_WIDTH - drawW) / 2;
    const drawY = (VIRTUAL_HEIGHT - drawH) / 2 + 100;
    ctx.drawImage(interiorImage, drawX, drawY, drawW, drawH);
  } else {
    ctx.fillStyle = "#12151f";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  }

  const chest = getTowerInteriorChestBounds();
  if (state.towerInterior.chestState !== "destroyed" && chestImage?.complete) {
    ctx.drawImage(chestImage, chest.x, chest.y, chest.w, chest.h);
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

/* ── Level rendering ── */

export function drawParallaxBackground(level) {
  const path = BIOME_PARALLAX_BACKGROUNDS[level.biomeId];
  const image = path ? imageCache.get(path) : null;
  if (!isImageRenderable(image)) {
    return;
  }

  // Single parallax plane (requested).
  drawParallaxLayer(image, 0.3, 1, 1, 0);
}

export function drawParallaxLayer(image, speed, alpha, scale, yOffset) {
  const baseScale = Math.max(
    VIRTUAL_WIDTH / Math.max(1, image.width),
    VIRTUAL_HEIGHT / Math.max(1, image.height),
    scale || 1,
  );
  const drawW = Math.max(1, Math.round(image.width * baseScale));
  const drawH = Math.max(1, Math.round(image.height * baseScale));
  const y = Math.round(VIRTUAL_HEIGHT - drawH + yOffset);
  const scroll = ((state.cameraX * speed) % drawW + drawW) % drawW;
  const firstX = -scroll;
  const loopStartX = firstX - drawW;
  const startIndex = Math.floor(loopStartX / drawW);

  ctx.save();
  ctx.globalAlpha = alpha;
  for (let x = loopStartX, tileIndex = 0; x < VIRTUAL_WIDTH + drawW; x += drawW, tileIndex += 1) {
    const mirrored = Math.abs(startIndex + tileIndex) % 2 === 1;
    if (mirrored) {
      ctx.save();
      ctx.translate(Math.round(x + drawW), y);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(image, Math.round(x), y, drawW, drawH);
    }
  }
  ctx.restore();
}

function getTileSeamFamily(tileLike) {
  const path = String(tileLike?.path || tileLike || "").replace(/\\/g, "/");
  if (!path) {
    return "";
  }
  const grouped = path.match(/^game_assets\/(platforms|ground|tiles)\/([^/]+)/);
  if (grouped) {
    return `${grouped[1]}:${grouped[2]}`;
  }
  const rootTile = path.match(/^game_assets\/tiles\/([a-z0-9_-]+)-ground\.png$/i);
  if (rootTile) {
    return `tiles-ground:${rootTile[1]}`;
  }
  return "";
}

function canBlendTileSides(leftTile, rightTile) {
  if (!leftTile?.path || !rightTile?.path) {
    return false;
  }
  const leftFamily = getTileSeamFamily(leftTile);
  const rightFamily = getTileSeamFamily(rightTile);
  return Boolean(leftFamily && rightFamily && leftFamily === rightFamily);
}

function getTileSideTransitionWidth(tileSize) {
  return clamp(Math.round(tileSize * TILE_SIDE_TRANSITION_RATIO), 1, TILE_SIDE_TRANSITION_MAX_PX);
}

function drawTileSideTransition(leftTile, rightTile, seamX, drawY, tileSize, drawH = tileSize) {
  if (!canBlendTileSides(leftTile, rightTile)) {
    return;
  }
  const leftImage = imageCache.get(leftTile.path);
  const rightImage = imageCache.get(rightTile.path);
  if (!isImageRenderable(leftImage) || !isImageRenderable(rightImage)) {
    return;
  }

  const blendWidth = getTileSideTransitionWidth(tileSize);
  const leftSourceW = leftImage.naturalWidth || leftImage.width || tileSize;
  const rightSourceW = rightImage.naturalWidth || rightImage.width || tileSize;
  const leftSourceH = leftImage.naturalHeight || leftImage.height || tileSize;
  const rightSourceH = rightImage.naturalHeight || rightImage.height || tileSize;
  const leftSampleW = Math.max(1, Math.min(leftSourceW, blendWidth));
  const rightSampleW = Math.max(1, Math.min(rightSourceW, blendWidth));

  ctx.save();
  ctx.globalAlpha = TILE_SIDE_TRANSITION_ALPHA;
  // Cross-fade only around the shared seam; outer tile borders remain untouched.
  ctx.drawImage(
    leftImage,
    Math.max(0, leftSourceW - leftSampleW),
    0,
    leftSampleW,
    leftSourceH,
    seamX,
    drawY,
    blendWidth,
    drawH,
  );
  ctx.drawImage(
    rightImage,
    0,
    0,
    rightSampleW,
    rightSourceH,
    seamX - blendWidth,
    drawY,
    blendWidth,
    drawH,
  );
  ctx.restore();
}

export function drawTiles(level) {
  const tileSize = state.tileSize;
  const zoom = getWorldZoom();
  const startX = Math.max(0, Math.floor(state.cameraX / tileSize) - 1);
  const endX = Math.min(level.widthTiles - 1, Math.floor((state.cameraX + VIRTUAL_WIDTH / zoom) / tileSize) + 2);
  const groundTopY = level.groundY;
  const groundBottomY = Math.min(level.heightTiles - 1, groundTopY + GROUND_THICKNESS_TILES - 1);

  // Vertical culling: compute visible Y range in world coordinates.
  const offsetY = getWorldRenderOffsetY(level);
  const visibleWorldTop = -offsetY;
  const visibleWorldBottom = visibleWorldTop + VIRTUAL_HEIGHT / zoom;
  const startY = Math.max(0, Math.floor(visibleWorldTop / tileSize) - 1);
  const endY = Math.min(level.heightTiles - 1, Math.floor(visibleWorldBottom / tileSize) + 1);

  // Build skip-set for triggered crumbling platform tiles (drawn separately with shake).
  const crumblingSkip = _buildCrumblingSkipSet(level);

  for (let y = startY; y <= endY; y += 1) {
    if (y >= groundTopY && y <= groundBottomY) {
      continue;
    }

    for (let x = startX; x <= endX; x += 1) {
      const tile = level.tileGrid[y][x];
      if (!tile) {
        continue;
      }
      // Skip tiles drawn by drawCrumblingPlatforms with shake offset.
      if (crumblingSkip && crumblingSkip.has(y * level.widthTiles + x)) {
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

    for (let x = startX; x < endX; x += 1) {
      const leftTile = level.tileGrid[y]?.[x];
      const rightTile = level.tileGrid[y]?.[x + 1];
      if (!leftTile || !rightTile) {
        continue;
      }
      if (
        crumblingSkip &&
        (crumblingSkip.has(y * level.widthTiles + x) || crumblingSkip.has(y * level.widthTiles + (x + 1)))
      ) {
        continue;
      }
      drawTileSideTransition(leftTile, rightTile, (x + 1) * tileSize, y * tileSize, tileSize);
    }
  }

  // Ground is rendered in dedicated passes with overlap so layers interlock visually.
  // Draw from bottom to top to keep the highest row in front.
  const verticalOverlap = state.tileStyleMode === "new" ? 0 : GROUND_TILE_OVERLAP_PX;
  const horizontalOverlap = state.tileStyleMode === "new" ? 0 : GROUND_TILE_HORIZONTAL_OVERLAP_PX;
  const isDesolation = level.biomeId === "desolation";
  for (let y = groundBottomY; y >= groundTopY; y -= 1) {
    const overlapOffset = (y - groundTopY) * verticalOverlap;
    for (let x = startX; x <= endX; x += 1) {
      const tile = level.tileGrid[y]?.[x];
      if (!tile) {
        continue;
      }
      const image = imageCache.get(tile.path);
      const leftSolid = Boolean(level.tileGrid[y]?.[x - 1]);
      const rightSolid = Boolean(level.tileGrid[y]?.[x + 1]);
      const halfOverlap = Math.floor(horizontalOverlap / 2);
      const leftExtra = leftSolid ? halfOverlap : 0;
      const rightExtra = rightSolid ? horizontalOverlap - halfOverlap : 0;
      const drawX = x * tileSize - leftExtra;
      const drawY = y * tileSize - overlapOffset;
      const drawW = tileSize + leftExtra + rightExtra;

      if (isImageRenderable(image)) {
        ctx.drawImage(image, drawX, drawY, drawW, tileSize);
        if (isDesolation) {
          ctx.fillStyle = `rgba(0, 0, 0, ${DESOLATION_GROUND_DARKEN_ALPHA})`;
          ctx.fillRect(drawX, drawY, drawW, tileSize);
        }
      } else {
        ctx.fillStyle = "#5a6679";
        ctx.fillRect(drawX, drawY, drawW, tileSize);
      }
    }
  }
}

export function drawStructures(level) {
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

export function drawDecorations(level) {
  for (const deco of level.decorations) {
    const image = imageCache.get(deco.path);
    if (isImageRenderable(image)) {
      ctx.drawImage(image, deco.x, deco.y - deco.h, deco.w, deco.h);
    }
  }
}

export function drawGroundDecorations(level, { foreground = false } = {}) {
  const tileSize = state.tileSize;
  const isDesolation = level.biomeId === "desolation";
  for (const decor of level.groundDecorations || []) {
    const renderBehindPlayer = decor.renderBehindPlayer !== false;
    if (foreground ? renderBehindPlayer : !renderBehindPlayer) {
      continue;
    }
    const image = imageCache.get(decor.path);
    if (!isImageRenderable(image)) {
      if (decor.path) {
        loadImage(decor.path).catch(() => null);
      }
      continue;
    }
    // Skip decoration sprites whose visible content fills less than half the
    // tile height (e.g. mountain detail overlays that are only ~9px tall on a
    // 32px canvas produce tiny, odd-looking decorations).
    const bounds = getSpriteOpaqueBounds(image);
    if (bounds) {
      const sourceH = image.naturalHeight || image.height || tileSize;
      const contentH = bounds.bottom - bounds.top + 1;
      if (!decor.allowShortSprite && contentH < sourceH * 0.5) {
        continue;
      }
    }
    const x = decor.xTile * tileSize;
    const groundTileY = Number.isFinite(decor.yTile) ? decor.yTile + 1 : level.groundY;
    const groundTile = level.tileGrid[groundTileY]?.[decor.xTile] || null;
    const groundRect = groundTile ? getSolidTileCollisionRect(groundTile, decor.xTile, groundTileY) : null;
    const surfaceY = groundRect ? groundRect.y : groundTileY * tileSize;
    if (bounds) {
      const sourceH = image.naturalHeight || image.height || tileSize;
      const scaleY = tileSize / sourceH;
      const bottomPad = Math.max(0, sourceH - 1 - bounds.bottom) * scaleY;
      // Anchor visible pixels to the actual ground surface (including top inset of ground tile).
      const drawY = Math.round(surfaceY - tileSize + bottomPad);
      ctx.drawImage(image, x, drawY, tileSize, tileSize);
      if (isDesolation) {
        ctx.fillStyle = `rgba(0, 0, 0, ${DESOLATION_MOUNTAIN_DARKEN_ALPHA})`;
        ctx.fillRect(x, drawY, tileSize, tileSize);
      }
    } else {
      // file:// fallback: pixel reads may be blocked, so apply a conservative bottom padding.
      const fallbackBottomPad = Math.round(tileSize * GROUND_DECOR_FALLBACK_BOTTOM_PAD_RATIO);
      const drawY = Math.round(surfaceY - tileSize + fallbackBottomPad);
      ctx.drawImage(image, x, drawY, tileSize, tileSize);
      if (isDesolation) {
        ctx.fillStyle = `rgba(0, 0, 0, ${DESOLATION_MOUNTAIN_DARKEN_ALPHA})`;
        ctx.fillRect(x, drawY, tileSize, tileSize);
      }
    }
  }
}

export function drawBonuses(level, timeSeconds) {
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

export function drawEnemies(level) {
  const zoom = getWorldZoom();
  const camLeft = state.cameraX - 64;
  const camRight = state.cameraX + VIRTUAL_WIDTH / zoom + 64;
  for (const enemy of level.enemySpawns) {
    if (!enemy.alive) {
      continue;
    }
    // Off-screen culling with margin.
    if (enemy.x + enemy.w < camLeft || enemy.x > camRight) {
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

export function drawSkyBirds(level) {
  if (!level.skyBirdSpawns?.length) return;
  const zoom = getWorldZoom();
  const camLeft = state.cameraX - 64;
  const camRight = state.cameraX + VIRTUAL_WIDTH / zoom + 64;
  for (const bird of level.skyBirdSpawns) {
    if (bird.x + bird.w < camLeft || bird.x > camRight) continue;
    const image = pickEnemyFrame(bird);
    const drawW = bird.def.size.width * SKY_BIRD_SCALE;
    const drawH = bird.def.size.height * SKY_BIRD_SCALE;
    if (isImageRenderable(image)) {
      const rect = getEntitySpriteDrawRect(image, bird, drawW, drawH);
      ctx.drawImage(image, rect.x, rect.y, drawW, drawH);
    }
  }
}

export function drawAnimals(level) {
  if (!level.animalSpawns?.length) return;
  const zoom = getWorldZoom();
  const camLeft = state.cameraX - 64;
  const camRight = state.cameraX + VIRTUAL_WIDTH / zoom + 64;
  for (const animal of level.animalSpawns) {
    if (animal.x + animal.w < camLeft || animal.x > camRight) continue;
    const image = pickEnemyFrame(animal);
    if (isImageRenderable(image)) {
      const drawW = animal.def.size.width * ENEMY_SCALE;
      const drawH = animal.def.size.height * ENEMY_SCALE;
      const rect = getEntitySpriteDrawRect(image, animal, drawW, drawH);
      ctx.drawImage(image, rect.x, rect.y, drawW, drawH);
    } else {
      ctx.fillStyle = "#6abf69";
      ctx.fillRect(animal.x, animal.y, animal.w, animal.h);
    }
  }
}

export function drawGuards(level) {
  if (!level.guardSpawns?.length) return;
  const zoom = getWorldZoom();
  const camLeft = state.cameraX - 64;
  const camRight = state.cameraX + VIRTUAL_WIDTH / zoom + 64;
  for (const guard of level.guardSpawns) {
    if (guard.x + guard.w < camLeft || guard.x > camRight) continue;
    const image = imageCache.get(guard.def.sprite.idleS || guard.def.sprite.idleW);
    const drawW = guard.def.size.width * GUARD_SCALE;
    const drawH = guard.def.size.height * GUARD_SCALE;
    if (isImageRenderable(image)) {
      const rect = getEntitySpriteDrawRect(image, guard, drawW, drawH);
      ctx.drawImage(image, rect.x, rect.y, drawW, drawH);
    } else {
      ctx.fillStyle = "#8b5e3c";
      ctx.fillRect(guard.x, guard.y, guard.w, guard.h);
    }
  }
}

export function drawGuardSpeech(level) {
  if (!level?.guardSpawns?.length) return;
  const zoom = getWorldZoom();
  const worldOffsetY = getWorldRenderOffsetY(level);
  const padding = 8;
  const lineHeight = 15;
  const maxBoxW = Math.min(240, VIRTUAL_WIDTH - 40);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 12px Trebuchet MS";
  for (const guard of level.guardSpawns) {
    if (!guard.inRange || !guard.speechText) continue;
    const screenX = (guard.x + guard.w / 2 - state.cameraX) * zoom;
    const screenY = (guard.y + worldOffsetY) * zoom;
    if (screenX < -maxBoxW || screenX > VIRTUAL_WIDTH + maxBoxW) continue;
    const lines = wrapText(ctx, guard.speechText, maxBoxW - padding * 2);
    const boxW = Math.min(maxBoxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2);
    const boxH = lines.length * lineHeight + padding;
    const boxX = clamp(screenX - boxW / 2, 10, VIRTUAL_WIDTH - boxW - 10);
    const boxY = screenY - boxH - 8;
    ctx.fillStyle = "rgba(255,255,255,0.93)";
    ctx.strokeStyle = "rgba(40,40,60,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1a1a2e";
    const textX = boxX + boxW / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], textX, boxY + padding / 2 + lineHeight * (i + 0.75));
    }
  }
  ctx.restore();
}

export function drawEnemyDrops(level) {
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

export function drawFireballs(level) {
  if (!state.fireballs.length) {
    return;
  }
  for (const fireball of state.fireballs) {
    if (fireball.kind === "axe") {
      const angle = (fireball.spin || 0) + performance.now() * 0.001 * (fireball.spinSpeed || 10);
      const handle = fireball.radius * 1.5;
      const blade = fireball.radius * 0.9;
      ctx.save();
      ctx.translate(fireball.x, fireball.y);
      ctx.rotate(angle + (fireball.rotation || 0));
      ctx.fillStyle = "#8e5a31";
      ctx.fillRect(-handle * 0.5, -fireball.radius * 0.16, handle, fireball.radius * 0.32);
      ctx.fillStyle = "#d7dee8";
      ctx.beginPath();
      ctx.moveTo(handle * 0.05, 0);
      ctx.lineTo(handle * 0.45, -blade);
      ctx.lineTo(handle * 0.45, blade);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-handle * 0.05, 0);
      ctx.lineTo(-handle * 0.45, -blade * 0.72);
      ctx.lineTo(-handle * 0.45, blade * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      continue;
    }

    if (fireball.kind === "rock") {
      const angle = (fireball.spin || 0) + performance.now() * 0.001 * (fireball.spinSpeed || 4);
      ctx.save();
      ctx.translate(fireball.x, fireball.y);
      ctx.rotate(angle);
      ctx.fillStyle = "#8a847d";
      ctx.beginPath();
      ctx.ellipse(0, 0, fireball.radius, fireball.radius * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b7b0a8";
      ctx.beginPath();
      ctx.ellipse(-fireball.radius * 0.22, -fireball.radius * 0.18, fireball.radius * 0.28, fireball.radius * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

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
    if (fireball.kind === "golden-fireball") {
      gradient.addColorStop(0, "#fff8bf");
      gradient.addColorStop(0.55, "#ffd34d");
      gradient.addColorStop(1, "#d98a00");
    } else {
      gradient.addColorStop(0, "#fff7c2");
      gradient.addColorStop(0.55, "#ffb347");
      gradient.addColorStop(1, "#ff6a2f");
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(fireball.x, fireball.y, fireball.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawGoal(level) {
  const door = getEndCastleDoorBounds(level);
  ctx.fillStyle = isEndCastleUnlocked(level) ? "rgba(120, 255, 120, 0.14)" : "rgba(255, 120, 120, 0.14)";
  ctx.fillRect(door.x, door.y, door.w, door.h);
}

/* ── Player rendering ── */

export function drawPlayer(player) {
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
    const towerInteriorScale = state.towerInterior.active ? 2 : 1;
    const drawW = hero.size.width * HERO_SCALE * towerInteriorScale;
    const drawH = hero.size.height * HERO_SCALE * towerInteriorScale;
    const rect = getEntitySpriteDrawRect(frameImage, player, drawW, drawH);
    if (player.onGround) {
      rect.y += PLAYER_RENDER_GROUND_OFFSET_PX;
    }
    if (state.towerInterior.active) {
      rect.y -= 100;
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

export function drawPlayerFallback(player) {
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

export function pickHeroFrame(hero, player) {
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

export function pickEnemyFrame(enemy) {
  const facingEast = enemy.dir >= 0;
  const walkSet = facingEast ? enemy.def.sprite.walkE : enemy.def.sprite.walkW;
  const idle = facingEast ? enemy.def.sprite.idleE : enemy.def.sprite.idleW;

  if (walkSet && walkSet.length) {
    const index = Math.floor(enemy.animTime * 9) % walkSet.length;
    const walkImage = imageCache.get(walkSet[index]);
    if (walkImage) return walkImage;
  }

  return imageCache.get(idle);
}

/* ── Crumbling/Moving Platform Helpers ── */

function _buildCrumblingSkipSet(level) {
  if (!level.crumblingPlatforms?.length) return null;
  let set = null;
  for (const plat of level.crumblingPlatforms) {
    if (plat.removed || !plat.triggered) continue;
    if (!set) set = new Set();
    for (let dx = 0; dx < plat.width; dx++) {
      set.add(plat.y * level.widthTiles + (plat.x + dx));
    }
  }
  return set;
}

/* ── Crumbling Platforms ── */

function drawCrumblingPlatforms(level, timeSeconds) {
  if (!level.crumblingPlatforms?.length) return;
  const tileSize = state.tileSize;

  for (const plat of level.crumblingPlatforms) {
    if (plat.removed) continue;

    const basePx = plat.x * tileSize;
    const basePy = plat.y * tileSize;
    const pw = plat.width * tileSize;

    // Compute shake offset (only when triggered).
    let shakeX = 0;
    let shakeY = 0;
    let intensity = 0;
    if (plat.triggered) {
      const remaining = plat.timer || 0;
      intensity = clamp(1 - remaining / (plat.disappearDelay || 1), 0, 1);
      shakeX = Math.sin(timeSeconds * 45) * intensity * 3;
      shakeY = Math.cos(timeSeconds * 55) * intensity * 2;
    }

    // Draw actual tile sprites at shaken position.
    const tilePaths = plat.tilePaths || [];
    for (let dx = 0; dx < plat.width; dx++) {
      const tilePath = tilePaths[dx];
      const tileObj = level.tileGrid[plat.y]?.[plat.x + dx];
      const path = tilePath || tileObj?.path;
      if (!path) continue;
      const image = imageCache.get(path);
      const drawX = basePx + dx * tileSize + shakeX;
      const drawY = basePy + shakeY;
      if (isImageRenderable(image)) {
        ctx.drawImage(image, drawX, drawY, tileSize, tileSize);
      } else {
        ctx.fillStyle = "#7a6655";
        ctx.fillRect(drawX, drawY, tileSize, tileSize);
      }
    }
    for (let dx = 0; dx < plat.width - 1; dx += 1) {
      const leftPath = tilePaths[dx] || level.tileGrid[plat.y]?.[plat.x + dx]?.path;
      const rightPath = tilePaths[dx + 1] || level.tileGrid[plat.y]?.[plat.x + dx + 1]?.path;
      if (!leftPath || !rightPath) {
        continue;
      }
      drawTileSideTransition(
        { path: leftPath },
        { path: rightPath },
        basePx + (dx + 1) * tileSize + shakeX,
        basePy + shakeY,
        tileSize,
      );
    }

    if (!plat.triggered) continue;

    // Red flash overlay, increasing opacity.
    const px = basePx + shakeX;
    const py = basePy + shakeY;
    ctx.fillStyle = `rgba(255, 80, 40, ${0.15 + intensity * 0.35})`;
    ctx.fillRect(px, py, pw, tileSize);

    // Cracks.
    ctx.strokeStyle = `rgba(60, 20, 10, ${0.3 + intensity * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + pw * 0.2, py);
    ctx.lineTo(px + pw * 0.35, py + tileSize * 0.6);
    ctx.lineTo(px + pw * 0.5, py + tileSize);
    ctx.moveTo(px + pw * 0.7, py);
    ctx.lineTo(px + pw * 0.6, py + tileSize * 0.4);
    ctx.stroke();

    // Falling dust particles when about to collapse.
    if (intensity > 0.5) {
      ctx.fillStyle = `rgba(180, 140, 100, ${intensity * 0.6})`;
      for (let i = 0; i < 3; i++) {
        const dx = px + ((timeSeconds * 120 + i * pw * 0.3) % pw);
        const dy = py + tileSize + ((timeSeconds * 80 + i * 17) % 12);
        ctx.fillRect(dx, dy, 2, 2);
      }
    }
  }
}

/* ── Moving Platforms ── */

function drawMovingPlatforms(level, timeSeconds) {
  if (!level.movingPlatforms?.length) return;
  const tileSize = state.tileSize;

  for (const plat of level.movingPlatforms) {
    if (plat.worldX == null) continue; // Not yet initialized by runtime.

    const px = plat.worldX;
    const py = plat.worldY;
    const pw = plat.worldW || plat.width * tileSize;

    // Draw actual tile sprites at current moving position.
    const tilePaths = plat.tilePaths || [];
    for (let dx = 0; dx < plat.width; dx++) {
      const path = tilePaths[dx];
      if (!path) {
        // Fallback: solid colored block.
        ctx.fillStyle = "#6a8caf";
        ctx.fillRect(px + dx * tileSize, py, tileSize, tileSize);
        continue;
      }
      const image = imageCache.get(path);
      if (isImageRenderable(image)) {
        ctx.drawImage(image, px + dx * tileSize, py, tileSize, tileSize);
      } else {
        ctx.fillStyle = "#6a8caf";
        ctx.fillRect(px + dx * tileSize, py, tileSize, tileSize);
      }
    }
    for (let dx = 0; dx < plat.width - 1; dx += 1) {
      const leftPath = tilePaths[dx];
      const rightPath = tilePaths[dx + 1];
      if (!leftPath || !rightPath) {
        continue;
      }
      drawTileSideTransition({ path: leftPath }, { path: rightPath }, px + (dx + 1) * tileSize, py, tileSize);
    }

    // Subtle glow on edges to signal movement.
    ctx.fillStyle = "rgba(150, 200, 255, 0.3)";
    ctx.fillRect(px, py, pw, 2);
    ctx.fillRect(px, py + tileSize - 2, pw, 2);
  }
}

/* ── Conjugation Gates ── */

function drawConjugationGates(level, timeSeconds) {
  if (!level.conjugationGates?.length) return;
  const tileSize = state.tileSize;

  for (const gate of level.conjugationGates) {
    const gx = gate.x;
    const gy = gate.y;

    if (gate.opened) {
      // Opened gate: subtle green glow.
      ctx.fillStyle = "rgba(52, 168, 83, 0.15)";
      ctx.fillRect(gx, gy, tileSize, tileSize * 2);
      continue;
    }

    // Pulsing glow effect.
    const pulse = 0.5 + Math.sin(timeSeconds * 3) * 0.3;

    // Gate barrier visual.
    ctx.fillStyle = `rgba(52, 168, 83, ${0.3 * pulse})`;
    ctx.fillRect(gx - 2, gy, tileSize + 4, tileSize * 2);

    // Shield icon (circle with border).
    ctx.strokeStyle = `rgba(52, 168, 83, ${0.7 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gx + tileSize * 0.5, gy + tileSize, tileSize * 0.4, 0, Math.PI * 2);
    ctx.stroke();

    // Center symbol.
    ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * pulse})`;
    ctx.font = `bold ${Math.max(10, Math.round(tileSize * 0.35))}px Nunito, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", gx + tileSize * 0.5, gy + tileSize);

    // Difficulty indicator (small dots).
    const dots = gate.difficulty === "hard" ? 3 : gate.difficulty === "medium" ? 2 : 1;
    const dotColor = gate.difficulty === "hard" ? "#ff6b6b" : gate.difficulty === "medium" ? "#ffd56a" : "#74f3d8";
    for (let d = 0; d < dots; d++) {
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(gx + tileSize * 0.5 + (d - (dots - 1) / 2) * 8, gy + tileSize * 1.7, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.textBaseline = "alphabetic";
}

/* ── Ambient Particles System ── */

let _particles = [];
let _particlesLevelId = -1;

function initParticles(level) {
  const config = level.particles;
  if (!config || _particlesLevelId === level.id) return;
  _particlesLevelId = level.id;
  _particles = [];
  const count = config.count || 8;
  for (let i = 0; i < count; i++) {
    _particles.push({
      x: Math.random() * VIRTUAL_WIDTH,
      y: Math.random() * VIRTUAL_HEIGHT,
      size: config.sizeRange ? config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]) : 3,
      speed: (config.speed || 20) * (0.5 + Math.random() * 0.8),
      opacity: (config.opacity || 0.5) * (0.5 + Math.random() * 0.5),
      phase: Math.random() * Math.PI * 2,
      wobble: 0.5 + Math.random() * 1.5,
    });
  }
}

export function updateParticles(delta) {
  const level = state.currentLevel;
  if (!level?.particles) return;
  initParticles(level);
  const config = level.particles;
  const dir = config.direction || "falling";

  for (const p of _particles) {
    p.phase += delta * p.wobble;
    const wobbleX = Math.sin(p.phase) * 15;

    if (dir === "falling" || dir === "falling_diagonal") {
      p.y += p.speed * delta;
      p.x += (dir === "falling_diagonal" ? p.speed * 0.4 : 0) * delta + wobbleX * delta;
      if (p.y > VIRTUAL_HEIGHT + 10) { p.y = -10; p.x = Math.random() * VIRTUAL_WIDTH; }
    } else if (dir === "rising") {
      p.y -= p.speed * delta;
      p.x += wobbleX * delta;
      if (p.y < -10) { p.y = VIRTUAL_HEIGHT + 10; p.x = Math.random() * VIRTUAL_WIDTH; }
    } else if (dir === "wind_horizontal") {
      p.x += p.speed * delta;
      p.y += Math.sin(p.phase) * 8 * delta;
      if (p.x > VIRTUAL_WIDTH + 10) { p.x = -10; p.y = Math.random() * VIRTUAL_HEIGHT; }
    } else if (dir === "updraft") {
      p.y -= p.speed * 0.5 * delta;
      p.x += wobbleX * delta;
      if (p.y < -10) { p.y = VIRTUAL_HEIGHT + 10; p.x = Math.random() * VIRTUAL_WIDTH; }
    }

    // Wrap X.
    if (p.x < -20) p.x = VIRTUAL_WIDTH + 10;
    if (p.x > VIRTUAL_WIDTH + 20) p.x = -10;
  }
}

function drawParticles() {
  const level = state.currentLevel;
  if (!level?.particles || !_particles.length) return;
  const config = level.particles;
  const color = config.color || "#ffffff";

  ctx.save();
  for (const p of _particles) {
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = color;

    if (config.type === "snowflakes") {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (config.type === "embers") {
      ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size * 1.5);
    } else if (config.type === "leaves") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.phase);
      ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
      ctx.restore();
    } else {
      ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
    }
  }
  ctx.restore();
}

/* ── Debug Level Design Overlay (F11) ── */

let _debugOverlayVisible = false;

export function toggleDebugOverlay() {
  _debugOverlayVisible = !_debugOverlayVisible;
}

export function isDebugOverlayVisible() {
  return _debugOverlayVisible;
}

function drawDebugOverlay() {
  if (!_debugOverlayVisible || !state.currentLevel) return;
  const level = state.currentLevel;
  const meta = level.blockMetadata || [];
  if (!meta.length) return;

  ctx.save();

  // ── Block type overlay (colored regions) ──
  const tileSize = state.tileSize;
  const zoom = getWorldZoom();
  const categoryColors = {
    traversal: "rgba(66, 133, 244, 0.25)",
    conjugation: "rgba(52, 168, 83, 0.3)",
    rhythm: "rgba(251, 188, 4, 0.25)",
    exploration: "rgba(234, 67, 53, 0.25)",
  };

  ctx.save();
  ctx.translate(0, VIRTUAL_HEIGHT);
  ctx.scale(zoom, zoom);
  ctx.translate(0, -VIRTUAL_HEIGHT);
  ctx.translate(-Math.floor(state.cameraX), Math.floor(getWorldRenderOffsetY(level)));

  for (const block of meta) {
    const color = categoryColors[block.category] || "rgba(128, 128, 128, 0.2)";
    const x = block.startX * tileSize;
    const w = (block.endX - block.startX + 1) * tileSize;
    const y = 0;
    const h = level.heightTiles * tileSize;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);

    // Block label at top.
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.max(8, Math.round(10 / zoom))}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(block.blockId.replace(/_/g, " "), x + w / 2, 14 / zoom + y);
  }

  // ── Secret zones (highlighted) ──
  for (const secret of level.secretZones || []) {
    ctx.strokeStyle = "rgba(255, 215, 0, 0.8)";
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.strokeRect(secret.x, secret.y, (secret.width || 3) * tileSize, (secret.height || 2) * tileSize);
    ctx.setLineDash([]);
  }

  // ── Conjugation gates (green markers) ──
  for (const gate of level.conjugationGates || []) {
    ctx.fillStyle = "rgba(52, 168, 83, 0.7)";
    ctx.beginPath();
    ctx.arc(gate.x + tileSize / 2, gate.y + tileSize / 2, tileSize * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(10 / zoom)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(gate.type, gate.x + tileSize / 2, gate.y + tileSize / 2 + 3 / zoom);
  }

  ctx.restore();

  // ── Difficulty curve graph (top-right HUD) ──
  const graphX = VIRTUAL_WIDTH - 160;
  const graphY = 10;
  const graphW = 150;
  const graphH = 60;

  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(graphX, graphY, graphW, graphH);
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;
  ctx.strokeRect(graphX, graphY, graphW, graphH);

  // Title.
  ctx.fillStyle = "#ccc";
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "left";
  ctx.fillText("Difficulty Curve", graphX + 4, graphY + 10);
  ctx.fillText(`Shape: ${level.levelShape || "?"}`, graphX + 4, graphY + 20);
  ctx.fillText(`Score: ${level.designScore?.overall || "?"}/${100}`, graphX + 4, graphY + 30);

  // Draw the curve.
  if (meta.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < meta.length; i++) {
      const px = graphX + 4 + (i / (meta.length - 1)) * (graphW - 8);
      const py = graphY + graphH - 4 - (meta[i].difficulty || 0) * (graphH - 16);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Block type legend.
  const legendY = graphY + graphH + 5;
  const legendItems = [
    { label: "Traversal", color: "#4285f4" },
    { label: "Conjugation", color: "#34a853" },
    { label: "Rhythm", color: "#fbbc04" },
    { label: "Exploration", color: "#ea4335" },
  ];
  ctx.font = "7px monospace";
  for (let i = 0; i < legendItems.length; i++) {
    const lx = graphX + (i % 2) * 75;
    const ly = legendY + Math.floor(i / 2) * 12;
    ctx.fillStyle = legendItems[i].color;
    ctx.fillRect(lx, ly, 8, 8);
    ctx.fillStyle = "#ccc";
    ctx.textAlign = "left";
    ctx.fillText(legendItems[i].label, lx + 11, ly + 7);
  }

  ctx.restore();
}

/* ── UI rendering ── */

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function updateFloatingRewards(delta) {
  if (!state.floatingRewards?.length) {
    return;
  }
  for (const reward of state.floatingRewards) {
    reward.life = Math.max(0, reward.life - delta);
    const maxRise = reward.maxRise ?? 44;
    const riseSpeed = reward.riseSpeed ?? 42;
    reward.rise = Math.min(maxRise, (reward.rise || 0) + delta * riseSpeed);
  }
  state.floatingRewards = state.floatingRewards.filter((reward) => reward.life > 0);
}

export function drawFloatingRewards(level) {
  if (!level || !state.floatingRewards?.length) {
    return;
  }

  const zoom = getWorldZoom();
  const worldOffsetY = getWorldRenderOffsetY(level);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const reward of state.floatingRewards) {
    const alpha = clamp((reward.life || 0) / (reward.ttl || 1), 0, 1);
    const screenX = (reward.worldX - state.cameraX) * zoom;
    const screenY = (reward.worldY + worldOffsetY - (reward.rise || 0)) * zoom;
    if (screenX < -80 || screenX > VIRTUAL_WIDTH + 80 || screenY < -80 || screenY > VIRTUAL_HEIGHT + 80) {
      continue;
    }

    ctx.globalAlpha = alpha;
    if (reward.style === "speech") {
      ctx.font = "bold 12px Trebuchet MS";
      const maxBoxW = Math.min(240, VIRTUAL_WIDTH - 40);
      const padding = 8;
      const lineHeight = 15;
      const lines = wrapText(ctx, reward.text, maxBoxW - padding * 2);
      const boxW = Math.min(maxBoxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2);
      const boxH = lines.length * lineHeight + padding;
      const boxX = clamp(screenX - boxW / 2, 10, VIRTUAL_WIDTH - boxW - 10);
      const boxY = screenY - boxH - 4;
      ctx.fillStyle = "rgba(255,255,255,0.93)";
      ctx.strokeStyle = "rgba(40,40,60,0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1a1a2e";
      const textX = boxX + boxW / 2;
      for (let i = 0; i < lines.length; i++) {
        const textY = boxY + padding / 2 + lineHeight * (i + 0.75);
        ctx.fillText(lines[i], textX, textY);
      }
    } else {
      ctx.font = "700 13px Trebuchet MS";
      ctx.fillStyle = reward.style === "gold" ? "#ffd56a" : "#f2f8ff";
      ctx.strokeStyle = "rgba(6, 8, 14, 0.9)";
      ctx.lineWidth = 3;
      ctx.strokeText(reward.text, screenX, screenY);
      ctx.fillText(reward.text, screenX, screenY);
    }
  }
  ctx.restore();
}

export function drawFloatingMessage(text) {
  const messageHeight = 36;
  let boxTop = 92;

  const hudRect = ui.hud?.getBoundingClientRect?.();
  const canvasRect = ctx.canvas?.getBoundingClientRect?.();
  if (hudRect && canvasRect && canvasRect.height > 0) {
    const hudItems = ui.hud?.querySelectorAll?.(".hud-item, .icon-button") || [];
    let hudBottomPx = hudRect.bottom;
    for (const item of hudItems) {
      const itemRect = item?.getBoundingClientRect?.();
      if (itemRect) {
        hudBottomPx = Math.max(hudBottomPx, itemRect.bottom);
      }
    }

    const hudBottomOnCanvasPx = Math.max(0, hudBottomPx - canvasRect.top);
    const canvasToVirtualY = VIRTUAL_HEIGHT / canvasRect.height;
    boxTop = Math.round((hudBottomOnCanvasPx + 10) * canvasToVirtualY);
  }

  ctx.save();
  ctx.fillStyle = "rgba(7, 10, 16, 0.76)";
  const boxW = Math.min(VIRTUAL_WIDTH - 20, Math.max(190, text.length * 8));
  const x = (VIRTUAL_WIDTH - boxW) / 2;
  ctx.fillRect(x, boxTop, boxW, messageHeight);

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.strokeRect(x, boxTop, boxW, messageHeight);

  ctx.fillStyle = "#f2f8ff";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, VIRTUAL_WIDTH / 2, boxTop + messageHeight / 2);
  ctx.restore();
}
