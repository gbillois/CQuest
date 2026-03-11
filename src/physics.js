import { SPRITE_FALLBACK_FOOT_OFFSET_RATIO, GROUND_DECOR_FALLBACK_BOTTOM_PAD_RATIO } from "./constants.js";
import { clamp, aabb } from "./utils.js";
import { state, imageCache, spriteBoundsCache, spriteBoundsCanvas, spriteBoundsCtx, tileVerticalCollisionInsetCache } from "./state.js";
import { isImageRenderable } from "./asset-loader.js";

let _triggerBonusBlock = null;
export function setTriggerBonusBlock(fn) { _triggerBonusBlock = fn; }

function tileHasTag(tile, tag) {
  return Array.isArray(tile?.tags) && tile.tags.includes(tag);
}

export function resolveHorizontalCollisions(entity, level) {
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

export function resolveVerticalCollisions(entity, level) {
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
        _triggerBonusBlock?.(tile.bonusBlock);
      }
    }
  }
}

export function getNearbySolidRects(entity, level) {
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

export function isSolidTile(tile) {
  if (!tile) {
    return false;
  }
  // Tiles marked collision:none in config must not block movement.
  return String(tile.collision || "solid").toLowerCase() !== "none";
}

export function isOneWayPlatformTile(tile) {
  if (tile?.groundSolid) {
    return false;
  }
  const code = getTileCodeFromPath(tile?.path);
  return code != null && code >= 10 && code <= 15;
}

export function getTileCodeFromPath(path) {
  if (!path) {
    return null;
  }
  const match = String(path).match(/_(\d+)\.png$/);
  return match ? Number(match[1]) : null;
}

export function getSolidTileCollisionRect(tile, tileX, tileY) {
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

export function getBonusBlockCollisionRect(block) {
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

export function getBonusCollisionInsets(block) {
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

export function getTileCollisionInsets(tile) {
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

export function getTileFallbackCollisionInsets(tile) {
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

export function isSolidAtPoint(level, worldX, worldY) {
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

export function getSpriteOpaqueBounds(image) {
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

export function getEntitySpriteDrawRect(image, entity, drawW, drawH) {
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

export function resolveBonusPopupVerticalCollision(popup, level) {
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
