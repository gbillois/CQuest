import {
  PERSISTENT_CURRENCY_KEY,
  HERO_UNLOCK_STORAGE_KEY,
  HERO_SELECTED_STORAGE_KEY,
  WORLD_ZOOM_STORAGE_KEY,
  TILE_STYLE_MODE_STORAGE_KEY,
  PARENTAL_CODE_STORAGE_KEY,
  ERROR_DB_STORAGE_KEY,
  LEADERBOARD_STORAGE_KEY,
  MOBILE_BUTTONS_OFFSET_STORAGE_KEY,
  MOBILE_GAME_OFFSET_STORAGE_KEY,
  PEDAGOGY_GROUPS_STORAGE_KEY,
  PEDAGOGY_TENSES_STORAGE_KEY,
  TENSE_KEYS,
  WORLD_SCALE,
  MIN_WORLD_ZOOM,
  MAX_WORLD_ZOOM,
  getHeroShopConfig,
} from "./constants.js";
import { state, ui } from "./state.js";
import { clamp } from "./utils.js";

// Late-binding reference to renderHeroShop (set by main.js to avoid circular deps).
let _renderHeroShop = null;

export function setRenderHeroShop(fn) {
  _renderHeroShop = fn;
}

export function loadPersistentGold() {
  try {
    const raw = Number(localStorage.getItem(PERSISTENT_CURRENCY_KEY) || 0) || 0;
    // Validate: must be a finite non-negative integer.
    if (!Number.isFinite(raw) || raw < 0) return 0;
    return Math.floor(raw);
  } catch {
    return 0;
  }
}

export function savePersistentGold(value) {
  try {
    localStorage.setItem(PERSISTENT_CURRENCY_KEY, String(Math.max(0, Math.floor(value || 0))));
  } catch {
    // Ignore storage issues in restricted contexts.
  }
}

export function loadHeroUnlocks() {
  try {
    const raw = localStorage.getItem(HERO_UNLOCK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    // Validate: each key must map to a boolean-coercible value. Strip unexpected keys.
    const validated = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === "string" && key.length > 0 && key.length < 64) {
        validated[key] = Boolean(value);
      }
    }
    return validated;
  } catch {
    return {};
  }
}

export function saveHeroUnlocks(unlocks) {
  try {
    localStorage.setItem(HERO_UNLOCK_STORAGE_KEY, JSON.stringify(unlocks || {}));
  } catch {
    // Ignore storage issues.
  }
}

export function loadSelectedHeroId() {
  try {
    return String(localStorage.getItem(HERO_SELECTED_STORAGE_KEY) || "paladin");
  } catch {
    return "paladin";
  }
}

export function saveSelectedHeroId(heroId) {
  try {
    localStorage.setItem(HERO_SELECTED_STORAGE_KEY, String(heroId || "paladin"));
  } catch {
    // Ignore storage issues.
  }
}

export function getWorldZoom(value = state.worldZoom) {
  return clamp(Number(value) || WORLD_SCALE, MIN_WORLD_ZOOM, MAX_WORLD_ZOOM);
}

export function normalizeWorldZoom(value) {
  return getWorldZoom(value);
}

export function loadWorldZoom() {
  try {
    return normalizeWorldZoom(Number(localStorage.getItem(WORLD_ZOOM_STORAGE_KEY) || WORLD_SCALE));
  } catch {
    return WORLD_SCALE;
  }
}

export function saveWorldZoom(value) {
  try {
    localStorage.setItem(WORLD_ZOOM_STORAGE_KEY, String(normalizeWorldZoom(value)));
  } catch {
    // Ignore storage issues.
  }
}

export function normalizeTileStyleMode(value) {
  return String(value || "").toLowerCase() === "basic" ? "basic" : "new";
}

export function loadTileStyleMode() {
  try {
    return normalizeTileStyleMode(localStorage.getItem(TILE_STYLE_MODE_STORAGE_KEY));
  } catch {
    return "new";
  }
}

export function saveTileStyleMode(value) {
  try {
    localStorage.setItem(TILE_STYLE_MODE_STORAGE_KEY, normalizeTileStyleMode(value));
  } catch {
    // Ignore storage issues.
  }
}


export function loadParentalCode() {
  try {
    const raw = String(localStorage.getItem(PARENTAL_CODE_STORAGE_KEY) || "").trim();
    if (!raw || raw.length > 64) {
      return "";
    }
    return raw;
  } catch {
    return "";
  }
}

export function saveParentalCode(value) {
  try {
    const code = String(value || "").trim();
    if (!code || code.length > 64) {
      return false;
    }
    localStorage.setItem(PARENTAL_CODE_STORAGE_KEY, code);
    return true;
  } catch {
    return false;
  }
}

export function loadMobileButtonsOffset() {
  try {
    const raw = Number(localStorage.getItem(MOBILE_BUTTONS_OFFSET_STORAGE_KEY));
    if (!Number.isFinite(raw)) return 130;
    return clamp(Math.round(raw), 0, 150);
  } catch {
    return 130;
  }
}

export function saveMobileButtonsOffset(value) {
  try {
    localStorage.setItem(MOBILE_BUTTONS_OFFSET_STORAGE_KEY, String(clamp(Math.round(Number(value) || 0), 0, 150)));
  } catch {
    // Ignore storage issues.
  }
}

export function loadMobileGameOffset() {
  try {
    const raw = Number(localStorage.getItem(MOBILE_GAME_OFFSET_STORAGE_KEY));
    if (!Number.isFinite(raw)) return -110;
    return clamp(Math.round(raw), -200, 0);
  } catch {
    return -110;
  }
}

export function saveMobileGameOffset(value) {
  try {
    localStorage.setItem(MOBILE_GAME_OFFSET_STORAGE_KEY, String(clamp(Math.round(Number(value) || 0), -200, 0)));
  } catch {
    // Ignore storage issues.
  }
}

export function loadPedagogyGroups(allGroupKeys) {
  try {
    const raw = localStorage.getItem(PEDAGOGY_GROUPS_STORAGE_KEY);
    if (!raw) return allGroupKeys.slice();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return allGroupKeys.slice();
    const valid = parsed.filter((g) => typeof g === "string" && g.length > 0 && g.length < 64 && allGroupKeys.includes(g));
    return valid.length > 0 ? valid : allGroupKeys.slice();
  } catch {
    return allGroupKeys.slice();
  }
}

export function savePedagogyGroups(groups) {
  try {
    localStorage.setItem(PEDAGOGY_GROUPS_STORAGE_KEY, JSON.stringify(Array.isArray(groups) ? groups : []));
  } catch {
    // Ignore storage issues.
  }
}

export function loadPedagogyTenses() {
  try {
    const raw = localStorage.getItem(PEDAGOGY_TENSES_STORAGE_KEY);
    if (!raw) return TENSE_KEYS.slice();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return TENSE_KEYS.slice();
    const valid = parsed.filter((t) => typeof t === "string" && TENSE_KEYS.includes(t));
    return valid.length > 0 ? valid : TENSE_KEYS.slice();
  } catch {
    return TENSE_KEYS.slice();
  }
}

export function savePedagogyTenses(tenses) {
  try {
    localStorage.setItem(PEDAGOGY_TENSES_STORAGE_KEY, JSON.stringify(Array.isArray(tenses) ? tenses : []));
  } catch {
    // Ignore storage issues.
  }
}

export function resetStoredGameProgress() {
  try {
    localStorage.removeItem(PERSISTENT_CURRENCY_KEY);
    localStorage.removeItem(HERO_UNLOCK_STORAGE_KEY);
    localStorage.removeItem(HERO_SELECTED_STORAGE_KEY);
    localStorage.removeItem(PARENTAL_CODE_STORAGE_KEY);
    localStorage.removeItem(WORLD_ZOOM_STORAGE_KEY);
    localStorage.removeItem(ERROR_DB_STORAGE_KEY);
    localStorage.removeItem(LEADERBOARD_STORAGE_KEY);
    localStorage.removeItem(MOBILE_BUTTONS_OFFSET_STORAGE_KEY);
    localStorage.removeItem(MOBILE_GAME_OFFSET_STORAGE_KEY);
    localStorage.removeItem(PEDAGOGY_GROUPS_STORAGE_KEY);
    localStorage.removeItem(PEDAGOGY_TENSES_STORAGE_KEY);
  } catch {
    // Ignore storage issues.
  }
}


function sanitizeLeaderboardName(value) {
  const normalized = String(value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return "";
  }
  const stripped = normalized.replace(/[^A-Za-z0-9À-ÖØ-öø-ÿ _.'-]/g, "");
  return stripped.slice(0, 24).trim();
}

export function isLeaderboardNameAllowed(value) {
  const normalized = String(value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return false;
  }
  return sanitizeLeaderboardName(normalized) === normalized.slice(0, 24).trim();
}

function sanitizeLeaderboardEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const name = sanitizeLeaderboardName(entry.name);
  const score = Math.max(0, Math.floor(Number(entry.score) || 0));
  const coins = Math.max(0, Math.floor(Number(entry.coins) || 0));
  const mode = entry.mode === "victory" ? "victory" : "gameover";
  const timestamp = Number(entry.timestamp) || Date.now();
  if (!name) {
    return null;
  }
  return { name, score, coins, mode, timestamp };
}

export function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => sanitizeLeaderboardEntry(entry))
      .filter(Boolean)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.coins !== a.coins) return b.coins - a.coins;
        return a.timestamp - b.timestamp;
      })
      .slice(0, 10);
  } catch {
    return [];
  }
}

export function saveLeaderboard(entries) {
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(Array.isArray(entries) ? entries : []));
  } catch {
    // Ignore storage issues.
  }
}

export function addLeaderboardEntry({ name, score, coins, mode }) {
  const cleanName = sanitizeLeaderboardName(name);
  if (!cleanName) {
    return loadLeaderboard();
  }
  const nextEntry = sanitizeLeaderboardEntry({
    name: cleanName,
    score,
    coins,
    mode,
    timestamp: Date.now(),
  });
  if (!nextEntry) {
    return loadLeaderboard();
  }
  const entries = loadLeaderboard();
  entries.push(nextEntry);
  const sorted = entries
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.coins !== a.coins) return b.coins - a.coins;
      return a.timestamp - b.timestamp;
    })
    .slice(0, 10);
  saveLeaderboard(sorted);
  return sorted;
}

export function clearLeaderboard() {
  saveLeaderboard([]);
}

export function getSelectedHeroId() {
  const hero = state.heroes[state.selectedHeroIndex];
  return hero?.id || "";
}

export function getPaladinIndex() {
  return Math.max(0, state.heroes.findIndex((hero) => hero.id === "paladin"));
}

export function isHeroOwned(heroId) {
  return Boolean(state.heroUnlocks[heroId]);
}

export function syncHeroActionButtonVisibility() {
  if (!ui.castFireBtn) {
    return;
  }
  const shouldHide = !["mage", "ninja", "pirate", "barbarian", "golem", "knight"].includes(getSelectedHeroId());
  ui.castFireBtn.hidden = shouldHide;
  if (ui.castFireHitBtn) {
    ui.castFireHitBtn.hidden = shouldHide;
  }
}

export function ensureSelectedHeroIsOwned() {
  const selected = state.heroes[state.selectedHeroIndex];
  if (selected && isHeroOwned(selected.id)) {
    return;
  }
  state.selectedHeroIndex = getPaladinIndex();
}

export function initializeHeroProgress() {
  const storedUnlocks = loadHeroUnlocks();
  const heroUnlocks = {};
  for (const hero of state.heroes) {
    const cfg = getHeroShopConfig(hero.id);
    heroUnlocks[hero.id] = Boolean(cfg.defaultOwned || storedUnlocks[hero.id]);
  }
  heroUnlocks.paladin = true;
  state.heroUnlocks = heroUnlocks;

  const selectedHeroId = loadSelectedHeroId();
  const selectedIndex = state.heroes.findIndex((hero) => hero.id === selectedHeroId);
  state.selectedHeroIndex = selectedIndex >= 0 ? selectedIndex : getPaladinIndex();
  ensureSelectedHeroIsOwned();
  syncHeroActionButtonVisibility();
  const selected = state.heroes[state.selectedHeroIndex];
  saveHeroUnlocks(state.heroUnlocks);
  if (selected) {
    saveSelectedHeroId(selected.id);
  }
}

export function spendPersistentGold(cost) {
  const amount = Math.max(0, Math.floor(Number(cost) || 0));
  if (amount <= 0 || state.persistentGold < amount) {
    return false;
  }
  state.persistentGold -= amount;
  state.coins = state.persistentGold;
  savePersistentGold(state.persistentGold);
  if ((ui.settingsPanel && !ui.settingsPanel.hidden) || (ui.shopPanel && !ui.shopPanel.hidden)) {
    if (_renderHeroShop) _renderHeroShop();
  }
  return true;
}

export function grantGold(amount) {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  if (!value) {
    return;
  }
  state.persistentGold += value;
  state.coins = state.persistentGold;
  savePersistentGold(state.persistentGold);
  if ((ui.settingsPanel && !ui.settingsPanel.hidden) || (ui.shopPanel && !ui.shopPanel.hidden)) {
    if (_renderHeroShop) _renderHeroShop();
  }
}
