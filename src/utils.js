// ─── PRNG ───
export function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), 1 | t);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rand, min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

export function createRunSeed() {
  const randomBits = Math.floor(Math.random() * 0xffffffff);
  return (Date.now() ^ randomBits) >>> 0;
}

// ─── Math ───
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function circleIntersectsRect(cx, cy, radius, rect) {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

// ─── Grid helpers ───
export function setTile(grid, x, y, tile) {
  if (!tile || !grid[y] || x < 0 || x >= grid[y].length) {
    return;
  }
  grid[y][x] = tile;
}

export function pickTile(pool, fallback, rand) {
  if (pool && pool.length) {
    return pool[randInt(rand, 0, pool.length - 1)];
  }
  return fallback || null;
}

// ─── Weighted selection ───
export function buildWeightedBiomeList(weights) {
  const list = [];
  for (const [biomeId, weight] of Object.entries(weights || {})) {
    if (weight > 0) {
      list.push({ biomeId, weight });
    }
  }
  return list;
}

export function weightedPick(entries, rand) {
  if (!entries.length) {
    return null;
  }
  let total = 0;
  for (const entry of entries) {
    total += entry.weight;
  }
  let roll = rand() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.biomeId;
    }
  }
  return entries[entries.length - 1].biomeId;
}

export function weightedPickByKey(items, key, rand) {
  if (!items.length) {
    return null;
  }
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, Number(item[key]) || 0), 0);
  if (totalWeight <= 0) {
    return items[randInt(rand, 0, items.length - 1)];
  }
  let roll = rand() * totalWeight;
  for (const item of items) {
    roll -= Math.max(0, Number(item[key]) || 0);
    if (roll <= 0) {
      return item;
    }
  }
  return items[items.length - 1];
}

// ─── String formatting ───
export function formatHeroName(value) {
  const cleaned = String(value).replace(/^hero[-_]/i, "").replace(/[-_]+/g, " ").trim();
  return capitalize(cleaned || "Hero");
}

export function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function pad3(value) {
  return String(value).padStart(3, "0");
}

// ─── Asset path ───
export function normalizeAssetPath(path) {
  return String(path).replace(/^\.\//, "").replace(/\/{2,}/g, "/");
}

export function normalizeUniqueAssetPaths(paths) {
  return [...new Set((paths || []).filter(Boolean).map((path) => normalizeAssetPath(path)))];
}

export function toAssetPath(baseDir, relativePath) {
  if (!relativePath) {
    return null;
  }
  if (relativePath.startsWith("./") || relativePath.startsWith("game_assets/")) {
    return normalizeAssetPath(relativePath);
  }
  return normalizeAssetPath(`${baseDir}/${relativePath}`);
}

// ─── Async ───
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shuffle(items) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}
