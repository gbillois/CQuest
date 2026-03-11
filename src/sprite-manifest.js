// ─── Sprite Manifest Loader ───
// Loads sprite-manifest.json at startup and provides fast path→bounds lookups,
// replacing the slow runtime pixel scanning in getSpriteOpaqueBounds.

import { fetchJson } from "./asset-loader.js";

const MANIFEST_URL = "./sprite-manifest.json";

// Flat lookup: normalized asset path → { canvasW, canvasH, x, y, w, h }
const _bboxByPath = new Map();

let _loaded = false;

/**
 * Walk the manifest tree and collect every entry that has both `path` and `content_bbox`.
 */
function indexManifest(node) {
  if (!node || typeof node !== "object") {
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      indexManifest(item);
    }
    return;
  }
  if (node.path && node.content_bbox) {
    const path = normalizePath(node.path);
    const canvasSize = node.canvas_size || {};
    _bboxByPath.set(path, {
      canvasW: canvasSize.w || 0,
      canvasH: canvasSize.h || 0,
      x: node.content_bbox.x,
      y: node.content_bbox.y,
      w: node.content_bbox.w,
      h: node.content_bbox.h,
    });
  }
  for (const value of Object.values(node)) {
    if (typeof value === "object") {
      indexManifest(value);
    }
  }
}

function normalizePath(p) {
  return String(p || "")
    .replace(/^\.\//, "")
    .replace(/\\/g, "/");
}

/**
 * Load and index sprite-manifest.json.  Safe to call multiple times;
 * only the first call does work.
 */
export async function loadSpriteManifest() {
  if (_loaded) {
    return;
  }
  try {
    const data = await fetchJson(MANIFEST_URL);
    if (data && typeof data === "object") {
      indexManifest(data);
    }
  } catch {
    // Manifest is optional — game works without it (falls back to pixel scan).
    console.warn("[sprite-manifest] Could not load sprite-manifest.json, using runtime pixel scanning.");
  }
  _loaded = true;
}

/**
 * Look up manifest bounds for an asset path.
 * Returns { left, top, right, bottom } matching the format used by getSpriteOpaqueBounds,
 * or null if the path has no manifest entry.
 */
export function getManifestBounds(assetPath) {
  const path = normalizePath(assetPath);
  const entry = _bboxByPath.get(path);
  if (!entry) {
    return null;
  }
  // Convert content_bbox { x, y, w, h } to the { left, top, right, bottom } format
  // used by getSpriteOpaqueBounds.
  return {
    left: entry.x,
    top: entry.y,
    right: entry.x + entry.w - 1,
    bottom: entry.y + entry.h - 1,
  };
}

/**
 * Get manifest content bbox in its original { x, y, w, h } form.
 * Useful for deriving hitbox dimensions.
 */
export function getManifestContentBox(assetPath) {
  const path = normalizePath(assetPath);
  return _bboxByPath.get(path) || null;
}

/**
 * Returns the number of indexed entries (for diagnostics).
 */
export function getManifestEntryCount() {
  return _bboxByPath.size;
}

/**
 * Check whether the manifest has been loaded.
 */
export function isManifestLoaded() {
  return _loaded;
}

/**
 * Compute a hitbox { w, h } from a sprite's manifest content bbox, scaled.
 * Returns null if the path has no manifest entry.
 *
 * @param {string} assetPath - The sprite asset path.
 * @param {number} scale - Scale factor (e.g. HERO_SCALE = 1.5).
 * @returns {{ w: number, h: number } | null}
 */
export function getManifestHitbox(assetPath, scale = 1) {
  const box = getManifestContentBox(assetPath);
  if (!box) {
    return null;
  }
  return {
    w: Math.round(box.w * scale),
    h: Math.round(box.h * scale),
  };
}
