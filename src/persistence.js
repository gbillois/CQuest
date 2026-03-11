import {
  PERSISTENT_CURRENCY_KEY,
  HERO_UNLOCK_STORAGE_KEY,
  HERO_SELECTED_STORAGE_KEY,
  WORLD_ZOOM_STORAGE_KEY,
  TILE_STYLE_MODE_STORAGE_KEY,
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
    return Number(localStorage.getItem(PERSISTENT_CURRENCY_KEY) || 0) || 0;
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
    return parsed && typeof parsed === "object" ? parsed : {};
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
  const shouldHide = !["mage", "ninja", "pirate"].includes(getSelectedHeroId());
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
  state.coins += value;
  state.persistentGold += value;
  savePersistentGold(state.persistentGold);
  if ((ui.settingsPanel && !ui.settingsPanel.hidden) || (ui.shopPanel && !ui.shopPanel.hidden)) {
    if (_renderHeroShop) _renderHeroShop();
  }
}
