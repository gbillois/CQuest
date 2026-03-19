import {
  VIRTUAL_WIDTH, VIRTUAL_HEIGHT,
  TENSE_KEYS, TENSE_LABEL, PRONOUN_LABEL,
  BIOME_EMOJI,
  CHEAT_MENU_LONG_PRESS_MS, MAX_HEARTS,
  getHeroShopConfig, getStartingHearts, getHeroHitboxOverride,
  PLAYER_HITBOX_WIDTH, PLAYER_HITBOX_HEIGHT, HERO_SCALE,
  PLAYER_DEATH_DELAY_SECONDS,
} from "./constants.js";
import { clamp, capitalize, createRunSeed } from "./utils.js";
import { state, ui } from "./state.js";
import { getLocale, t } from "./i18n.js";
import {
  isHeroOwned, ensureSelectedHeroIsOwned, getPaladinIndex,
  saveHeroUnlocks, saveSelectedHeroId, spendPersistentGold,
  grantGold, initializeHeroProgress, syncHeroActionButtonVisibility,
  loadPersistentGold, loadWorldZoom, saveWorldZoom, normalizeWorldZoom,
  getSelectedHeroId, normalizeTileStyleMode, saveTileStyleMode,
  loadParentalCode, saveParentalCode, resetStoredGameProgress,
  addLeaderboardEntry, isLeaderboardNameAllowed,
  saveMobileButtonsOffset, saveMobileGameOffset,
  savePedagogyGroups, savePedagogyTenses,
} from "./persistence.js";
import { getVerbSource, getDefaultActiveGroups } from "./conjugation.js";
import { getManifestHitbox } from "./sprite-manifest.js";
import { validateAllLevels } from "./level-validator.js";

/* ── Dev mode detection ── */
const _isDevMode = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
   window.location.hostname === "127.0.0.1" ||
   window.location.protocol === "file:");

/* ── late-binding for cross-module calls ── */

let _generateLevelsFromConfig = null;
let _loadLevel = null;
let _startBossMode = null;
let _getBossPrepLevelIndex = null;
let _resetBossState = null;
let _castHeroProjectile = null;
let _setWorldZoom = null;
let _syncWorldZoomUi_internal = null;
let _preloadLevelAssetImages = null;

export function setUiHooks({
  generateLevelsFromConfig, loadLevel, startBossMode, getBossPrepLevelIndex,
  resetBossState, castHeroProjectile, setWorldZoom, syncWorldZoomUi,
  preloadLevelAssetImages,
}) {
  _generateLevelsFromConfig = generateLevelsFromConfig;
  _loadLevel = loadLevel;
  _startBossMode = startBossMode;
  _getBossPrepLevelIndex = getBossPrepLevelIndex;
  _resetBossState = resetBossState;
  _castHeroProjectile = castHeroProjectile;
  _setWorldZoom = setWorldZoom;
  _syncWorldZoomUi_internal = syncWorldZoomUi;
  _preloadLevelAssetImages = preloadLevelAssetImages;
}

/* ── local helpers ── */

function formatZoomLabel(zoom) {
  return `${Number(zoom).toFixed(1)}x`;
}

function applyWorldZoom(value) {
  _setWorldZoom(value);
}


function setParentalCodeInputVisibility(visible) {
  if (!ui.parentalCodeInput || !ui.toggleParentalCodeVisibilityBtn) {
    return;
  }
  ui.parentalCodeInput.type = visible ? "text" : "password";
  ui.toggleParentalCodeVisibilityBtn.textContent = visible ? "🙈" : "👁️";
  ui.toggleParentalCodeVisibilityBtn.setAttribute("aria-label", visible ? t("hideCode") : t("showCode"));
}

async function askParentalCode({ isFirstSetup = false, messageKey = null } = {}) {
  const title = isFirstSetup
    ? t("parentalPromptSetup")
    : t(messageKey || "parentalPromptEnter");

  if (!ui.parentalCodeModal || !ui.parentalCodeInput || !ui.parentalCodeConfirmBtn || !ui.parentalCodeCancelBtn) {
    const answer = window.prompt(title, "");
    if (answer === null) {
      return null;
    }
    return String(answer).trim();
  }

  ui.parentalCodeModalTitle.textContent = t("parentalCode");
  ui.parentalCodeModalText.textContent = title;
  ui.parentalCodeInput.value = "";
  setParentalCodeInputVisibility(false);
  ui.parentalCodeModal.classList.remove("hidden");
  ui.parentalCodeInput.focus();

  return new Promise((resolve) => {
    let closed = false;
    const close = (result) => {
      if (closed) return;
      closed = true;
      ui.parentalCodeModal.classList.add("hidden");
      ui.parentalCodeConfirmBtn.removeEventListener("click", onConfirm);
      ui.parentalCodeCancelBtn.removeEventListener("click", onCancel);
      ui.parentalCodeInput.removeEventListener("keydown", onInputKeydown);
      resolve(result);
    };
    const onConfirm = () => close(String(ui.parentalCodeInput.value || "").trim());
    const onCancel = () => close(null);
    const onInputKeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onConfirm();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    ui.parentalCodeConfirmBtn.addEventListener("click", onConfirm);
    ui.parentalCodeCancelBtn.addEventListener("click", onCancel);
    ui.parentalCodeInput.addEventListener("keydown", onInputKeydown);
  });
}

async function ensureParentalCodeConfigured() {
  const existing = loadParentalCode();
  if (existing) {
    return existing;
  }
  const createdCode = await askParentalCode({ isFirstSetup: true });
  if (createdCode === null) {
    return null;
  }
  if (!createdCode) {
    window.alert(t("parentalCodeEmpty"));
    return null;
  }
  if (!saveParentalCode(createdCode)) {
    window.alert(t("parentalCodeSaveError"));
    return null;
  }
  window.alert(t("parentalCodeSaved"));
  return createdCode;
}

async function requireParentalCodeAccess() {
  const currentCode = await ensureParentalCodeConfigured();
  if (!currentCode) {
    return false;
  }
  const entered = await askParentalCode();
  if (entered === null) {
    return false;
  }
  if (entered !== currentCode) {
    window.alert(t("wrongParentalCode"));
    return false;
  }
  return true;
}

async function changeParentalCode() {
  const currentCode = loadParentalCode();
  if (!currentCode) {
    const configured = await ensureParentalCodeConfigured();
    if (!configured) {
      return;
    }
  } else {
    const entered = await askParentalCode({ messageKey: "parentalEnterCurrent" });
    if (entered === null) {
      return;
    }
    if (entered !== currentCode) {
      window.alert(t("wrongParentalCode"));
      return;
    }
  }

  const newCode = await askParentalCode({ messageKey: "parentalPromptNew" });
  if (newCode === null) {
    return;
  }
  if (!String(newCode).trim()) {
    window.alert(t("parentalCodeEmpty"));
    return;
  }
  if (!saveParentalCode(newCode)) {
    window.alert(t("parentalCodeNewSaveError"));
    return;
  }
  window.alert(t("parentalCodeUpdated"));
}


function applyLocaleToStaticUi() {
  document.documentElement.lang = getLocale();
  const setText = (selector, key) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = t(key);
  };
  setText("#shopPanel h1", "shop");
  const hudLabels = document.querySelectorAll(".hud-label");
  if (hudLabels.length >= 3) {
    hudLabels[0].textContent = t("hudScore");
    hudLabels[1].textContent = t("hudHeart");
    hudLabels[2].textContent = t("hudGold");
  }
  const walletLabel = document.querySelector(".shop-wallet");
  if (walletLabel?.firstChild) {
    walletLabel.firstChild.textContent = `${t("yourGold")} `;
  }
  setText('label[for="heroSelect"]', "equippedHero");
  setText("#heroShopPanel h2", "heroicMounts");
  setText("#closeShopBtn", "close");
  setText("#settingsPanel h1", "settings");
  setText("#pedagogyPanel h2", "conjugationTraining");
  setText("#pedagogyPanel .pedagogy-block:nth-of-type(1) h3", "availableTenses");
  setText("#pedagogyPanel .pedagogy-block:nth-of-type(2) h3", "verbGroups");
  setText("#resetErrorsBtn", "resetErrors");
  setText("#resetGameBtn", "resetGame");
  setText("#resetGameConfirmText", "resetGameWarning");
  setText("#resetGameCancelBtn", "confirmNo");
  setText("#resetGameConfirmBtn", "confirmYes");
  setText("#parentalCodeModalTitle", "parentalCode");
  setText("#parentalCodeCancelBtn", "dialogCancel");
  setText("#parentalCodeConfirmBtn", "dialogOk");
  setText("#errorListLabel", "errorsMade");
  setText("#gameModePanelTitle", "gameMode");
  setText("#settingsGameModeLabel", "gameMode");
  setText("#settingsGameModeNormalOption", "gameModeNormal");
  setText("#settingsGameModeEasyOption", "gameModeEasy");
  setText("#mobileLayoutPanel h2", "mobileLayoutSettings");
  setText('label[for="settingsButtonsOffsetSlider"]', "settingsButtonsOffset");
  setText('label[for="settingsGameOffsetSlider"]', "settingsGameOffset");
  setText("#mobileButtonsOffsetHigher", "sliderHigher");
  setText("#mobileButtonsOffsetLower", "sliderLower");
  setText("#mobileGameOffsetHigher", "sliderHigher");
  setText("#mobileGameOffsetLower", "sliderLower");
  setText("#changeParentalCodeBtn", "changeCode");
  setText("#applySettingsBtn", "apply");
  setText("#closeSettingsBtn", "close");
  setText("#forcePwaUpdateBtn", "update");
  setText(".title-kicker", "titleKicker");
  setText(".title-card > p:nth-of-type(2)", "titleSubtitle");
  setText("#startBtn", "startGame");
  setText("#openLeaderboardBtn", "leaderboardButton");
  setText("#openSettingsFromTitleBtn", "settings");
  setText("#leaderboardTitle", "leaderboard");
  setText("#closeLeaderboardBtn", "close");
  setText("#pauseModal h2", "pause");
  setText("#pauseModal p", "gamePaused");
  setText("#resumeBtn", "resume");
  setText("#openSettingsFromPauseBtn", "settings");
  setText("#backToTitleBtn", "titleScreen");
  setText("#cheatModal h2", "tipsTricks");
  setText('label[for="cheatLevelSelect"]', "selectLevel");
  setText('label[for="cheatDifficultySelect"]', "generationProfile");
  setText('label[for="cheatTileStyleSelect"]', "tileStyle");
  setText('label[for="cheatHeroSelect"]', "selectHero");
  setText('label[for="cheatWorldZoomSlider"]', "worldZoom");
  setText("#cheatGivePiecesBtn", "givePieces");
  setText("#cheatApplyBtn", "apply");
  setText("#cheatCloseBtn", "close");
  setText("#visualDebugPanel h2", "visualDebug");
  setText("#visualDebugPanel p", "mobileAdjustments");
  setText('label[for="debugButtonsOffsetSlider"]', "buttonsVerticalOffset");
  setText('label[for="debugGameOffsetSlider"]', "gameVerticalOffset");
  setText('label[for="debugScaleSlider"]', "worldScale");
  setText("#validateLevelsBtn", "validateLevels");
  setText("#closeVisualDebugBtn", "close");
  setText("#restartBtn", "restartLevel");
  setText("#backToTitleFromGameOverBtn", "titleScreen");
  setText("#bossDefeatPanel h2", "dragonWon");
  setText("#bossDefeatText", "trialFailed");
  setText("#bossDefeatRetryText", "returningWave");
  setText("#finalVictoryPanel h2", "champion");
  setText("#finalVictoryPanel p:nth-of-type(1)", "dragonDefeated");
  setText("#finalVictoryPanel p:nth-of-type(2)", "championStatus");
  setText("#backToTitleFromVictoryBtn", "titleScreen");
  if (ui.toggleParentalCodeVisibilityBtn) {
    ui.toggleParentalCodeVisibilityBtn.setAttribute("aria-label", t("showCode"));
  }
}

function renderLeaderboard() {
  if (!ui.leaderboardList) {
    return;
  }
  ui.leaderboardList.textContent = "";
  const entries = Array.isArray(state.leaderboard) ? state.leaderboard : [];
  if (!entries.length) {
    const empty = document.createElement("li");
    empty.className = "leaderboard-empty";
    empty.textContent = t("leaderboardEmpty");
    ui.leaderboardList.appendChild(empty);
    return;
  }

  entries.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "leaderboard-entry";
    const modeLabel = entry.mode === "victory" ? t("leaderboardModeVictory") : t("leaderboardModeGameover");
    item.textContent = `${index + 1}. ${entry.name} — ${entry.score} pts • ${entry.coins} ${t("pieces")} (${modeLabel})`;
    ui.leaderboardList.appendChild(item);
  });
}

export function openLeaderboardModal() {
  if (!ui.leaderboardModal) {
    return;
  }
  renderLeaderboard();
  ui.titleScreen?.classList.add("hidden");
  ui.settingsPanel.hidden = true;
  ui.shopPanel.hidden = true;
  ui.cheatModal?.classList.add("hidden");
  ui.pauseModal?.classList.add("hidden");
  ui.gameOverPanel?.classList.add("hidden");
  ui.leaderboardModal.classList.remove("hidden");
  state.paused = true;
}

export function closeLeaderboardModal() {
  if (!ui.leaderboardModal) {
    return;
  }
  ui.leaderboardModal.classList.add("hidden");
  if (!state.started) {
    ui.titleScreen?.classList.remove("hidden");
    state.paused = false;
    return;
  }
  state.paused = isPauseModalOpen() || !ui.settingsPanel.hidden || !ui.shopPanel.hidden || (ui.cheatModal && !ui.cheatModal.classList.contains("hidden"));
}

export function requestLeaderboardEntry(mode) {
  const promptKey = mode === "victory" ? "askPlayerNameVictory" : "askPlayerNameGameOver";
  const answer = window.prompt(t(promptKey), "");
  if (answer === null) {
    return;
  }
  const trimmed = String(answer).trim();
  if (!trimmed) {
    return;
  }
  if (!isLeaderboardNameAllowed(trimmed)) {
    window.alert(t("invalidPlayerName"));
    return;
  }
  state.leaderboard = addLeaderboardEntry({
    name: trimmed,
    score: state.score,
    coins: state.coins,
    mode: mode === "victory" ? "victory" : "gameover",
  });
  renderLeaderboard();
}

async function forcePwaUpdate() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        await reg.update();
      }
    }
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
    showMessage(t("pwaUpdateDone"));
    const url = new URL(window.location.href);
    url.searchParams.set("update", String(Date.now()));
    window.location.replace(url.toString());
  } catch (_error) {
    showMessage(t("pwaUpdateFailed"));
  }
}

/* ── Hero shop ── */

export function renderHeroShop() {
  if (ui.shopGoldValue) {
    ui.shopGoldValue.textContent = `${Math.floor(state.persistentGold || 0)} ${t("pieces")}`;
  }
  if (!ui.heroShopList) {
    return;
  }

  const selectedHero = state.heroes[state.selectedHeroIndex];
  const selectedHeroId = selectedHero?.id || "";
  ui.heroShopList.textContent = "";
  state.heroes.forEach((hero) => {
    const cfg = getHeroShopConfig(hero.id);
    const owned = isHeroOwned(hero.id);
    const equipped = owned && hero.id === selectedHeroId;
    const canBuy = !owned && state.persistentGold >= cfg.price;
    const actionLabel = equipped ? t("heroEquipped") : owned ? t("equip") : t("buy");

    const item = document.createElement("div");
    item.className = `hero-shop-item ${owned ? "owned" : "locked"}`;

    const preview = document.createElement("div");
    preview.className = "hero-shop-preview";
    const img = document.createElement("img");
    img.src = hero.sprite.idleSE;
    img.alt = hero.name;
    img.loading = "lazy";
    preview.appendChild(img);
    if (!owned) {
      const lock = document.createElement("span");
      lock.className = "hero-shop-lock";
      lock.setAttribute("aria-hidden", "true");
      lock.textContent = "\uD83D\uDD12";
      preview.appendChild(lock);
    }
    item.appendChild(preview);

    const meta = document.createElement("div");
    meta.className = "hero-shop-meta";
    const nameDiv = document.createElement("div");
    nameDiv.className = "hero-shop-name";
    nameDiv.textContent = hero.name;
    meta.appendChild(nameDiv);
    const priceDiv = document.createElement("div");
    priceDiv.className = "hero-shop-price";
    if (owned) {
      priceDiv.textContent = t("alreadyUnlocked");
    } else {
      priceDiv.textContent = `${t("price")} `;
      const amount = document.createElement("span");
      amount.className = "amount";
      amount.textContent = `${cfg.price} ${t("pieces")}`;
      priceDiv.appendChild(amount);
    }
    meta.appendChild(priceDiv);
    item.appendChild(meta);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = owned ? "hero-shop-btn" : "hero-shop-btn buy";
    btn.dataset.heroId = hero.id;
    btn.dataset.action = owned ? "equip" : "buy";
    if (!owned && !canBuy) {
      btn.disabled = true;
    }
    btn.textContent = actionLabel;
    item.appendChild(btn);

    ui.heroShopList.appendChild(item);
  });
}

/* ── Zoom UI ── */

export function syncWorldZoomUi() {
  if (ui.cheatWorldZoomSlider) {
    ui.cheatWorldZoomSlider.value = String(state.worldZoom);
  }
  if (ui.cheatWorldZoomValue) {
    ui.cheatWorldZoomValue.textContent = formatZoomLabel(state.worldZoom);
  }
}

/* ── Settings panel ── */

export function populateSettingsPanel() {
  ui.heroSelect.innerHTML = "";
  state.heroes.forEach((hero, index) => {
    if (!isHeroOwned(hero.id)) {
      return;
    }
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = hero.name;
    ui.heroSelect.appendChild(option);
  });

  ensureSelectedHeroIsOwned();
  ui.heroSelect.value = String(state.selectedHeroIndex);
  if (ui.settingsGameModeSelect) {
    ui.settingsGameModeSelect.value = state.generationProfile === "easy" ? "easy" : "normal";
  }
  syncWorldZoomUi();
  applyMobileVisualDebugOffsets();
  renderHeroShop();
  renderErrorList();
  syncHeroActionButtonVisibility();
}

/* ── Cheat modal ── */

export function populateCheatModalOptions() {
  if (!ui.cheatLevelSelect || !ui.cheatHeroSelect) {
    return;
  }
  ui.cheatLevelSelect.innerHTML = "";
  state.levels.forEach((level, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = t("levelLabel", { level: level.id || index + 1, biome: capitalize(level.biomeId) });
    ui.cheatLevelSelect.appendChild(option);
  });

  ui.cheatHeroSelect.innerHTML = "";
  state.heroes.forEach((hero, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = hero.name;
    ui.cheatHeroSelect.appendChild(option);
  });

  ui.cheatLevelSelect.value = String(state.currentLevelIndex);
  ui.cheatHeroSelect.value = String(state.selectedHeroIndex);
  if (ui.cheatDifficultySelect) {
    ui.cheatDifficultySelect.value = state.generationProfile;
  }
  if (ui.cheatTileStyleSelect) {
    ui.cheatTileStyleSelect.value = normalizeTileStyleMode(state.tileStyleMode);
  }
  applyWorldZoom(state.worldZoom);
}

export function openCheatModal() {
  if (!state.ready || !ui.cheatModal) {
    return;
  }
  populateCheatModalOptions();
  ui.settingsPanel.hidden = true;
  ui.shopPanel.hidden = true;
  ui.pauseModal?.classList.add("hidden");
  ui.cheatModal.classList.remove("hidden");
  state.paused = true;
}

export function closeCheatModal() {
  if (!ui.cheatModal) {
    return;
  }
  ui.cheatModal.classList.add("hidden");
  cancelCheatMenuLongPress();
  if (!state.started) {
    state.paused = false;
    return;
  }
  state.paused = isPauseModalOpen() || !ui.settingsPanel.hidden || !ui.shopPanel.hidden;
}

export function cancelCheatMenuLongPress() {
  if (state.cheatLongPressTimer) {
    clearTimeout(state.cheatLongPressTimer);
    state.cheatLongPressTimer = null;
  }
}

export function beginCheatMenuLongPress() {
  if (!state.ready || !ui.hudLives || state.cheatLongPressTimer) {
    return;
  }
  state.cheatLongPressTimer = setTimeout(() => {
    state.cheatLongPressTimer = null;
    openCheatModal();
  }, CHEAT_MENU_LONG_PRESS_MS);
}

export function endCheatMenuLongPress() {
  cancelCheatMenuLongPress();
}

/* ── Visual debug ── */

export function isMobileViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
}

export function applyMobileVisualDebugOffsets() {
  const buttonsOffset = clamp(Number(state.mobileButtonsOffsetY) || 0, -50, 200);
  const gameOffset = clamp(Number(state.mobileGameOffsetY) || 0, 0, 200);
  const mobileViewport = isMobileViewport();
  state.mobileButtonsOffsetY = buttonsOffset;
  state.mobileGameOffsetY = gameOffset;
  document.body.style.setProperty("--mobile-controls-debug-offset", `${mobileViewport ? buttonsOffset : 0}px`);
  document.body.style.setProperty("--mobile-game-offset", `${mobileViewport ? gameOffset : 0}px`);
  document.body.classList.toggle("mobile-debug-adjust", mobileViewport && gameOffset !== 0);
  if (ui.debugButtonsOffsetSlider) {
    ui.debugButtonsOffsetSlider.value = String(buttonsOffset);
  }
  if (ui.debugButtonsOffsetValue) {
    ui.debugButtonsOffsetValue.textContent = `${buttonsOffset}px`;
  }
  if (ui.debugGameOffsetSlider) {
    ui.debugGameOffsetSlider.value = String(gameOffset);
  }
  if (ui.debugGameOffsetValue) {
    ui.debugGameOffsetValue.textContent = `${gameOffset}px`;
  }
  if (ui.settingsButtonsOffsetSlider) {
    ui.settingsButtonsOffsetSlider.value = String(buttonsOffset);
  }
  if (ui.settingsGameOffsetSlider) {
    ui.settingsGameOffsetSlider.value = String(gameOffset);
  }
}

export function openVisualDebugPanel() {
  if (!ui.visualDebugPanel) {
    return;
  }
  applyMobileVisualDebugOffsets();
  // Sync the scale slider to the current world zoom value.
  if (ui.debugScaleSlider) {
    ui.debugScaleSlider.value = String(state.worldZoom);
  }
  if (ui.debugScaleValue) {
    ui.debugScaleValue.textContent = `${Number(state.worldZoom).toFixed(1)}x`;
  }
  ui.visualDebugPanel.classList.remove("hidden");
  state.visualDebugOpen = true;
}

export function closeVisualDebugPanel() {
  if (!ui.visualDebugPanel) {
    return;
  }
  ui.visualDebugPanel.classList.add("hidden");
  state.visualDebugOpen = false;
}

export function cancelVisualDebugLongPress() {
  if (state.visualDebugLongPressTimer) {
    clearTimeout(state.visualDebugLongPressTimer);
    state.visualDebugLongPressTimer = null;
  }
}

export function beginVisualDebugLongPress() {
  if (!state.ready || !ui.hudScoreValue || state.visualDebugLongPressTimer) {
    return;
  }
  state.visualDebugLongPressTimer = setTimeout(() => {
    state.visualDebugLongPressTimer = null;
    openVisualDebugPanel();
  }, CHEAT_MENU_LONG_PRESS_MS);
}

export function endVisualDebugLongPress() {
  cancelVisualDebugLongPress();
}

function attachLongPressListeners(element, startHandler, endHandler) {
  if (!element) {
    return;
  }

  if (supportsPointerEvents()) {
    // Pointer events cover touch + mouse on most modern browsers.
    element.addEventListener("pointerdown", startHandler);
    element.addEventListener("pointerup", endHandler);
    element.addEventListener("pointerleave", endHandler);
    element.addEventListener("pointercancel", endHandler);
  }

  // Mouse/touch fallbacks keep long-press behavior working on desktop browsers
  // that may not route pointer events consistently for non-button HUD text.
  element.addEventListener("mousedown", startHandler);
  element.addEventListener("mouseup", endHandler);
  element.addEventListener("mouseleave", endHandler);
  element.addEventListener("touchstart", startHandler, { passive: true });
  element.addEventListener("touchend", endHandler);
  element.addEventListener("touchcancel", endHandler);
}

function supportsPointerEvents() {
  return typeof window !== "undefined" && "PointerEvent" in window;
}

/* ── Cheat apply ── */

export function applyCheatSelections() {
  const nextLevel = clamp(Number(ui.cheatLevelSelect?.value || state.currentLevelIndex), 0, state.levels.length - 1);
  const heroIndex = clamp(Number(ui.cheatHeroSelect?.value || state.selectedHeroIndex), 0, state.heroes.length - 1);
  const requestedProfile = ui.cheatDifficultySelect ? ui.cheatDifficultySelect.value : state.generationProfile;
  const requestedTileStyleMode = ui.cheatTileStyleSelect ? normalizeTileStyleMode(ui.cheatTileStyleSelect.value) : normalizeTileStyleMode(state.tileStyleMode);
  const hero = state.heroes[heroIndex];
  if (hero) {
    state.heroUnlocks[hero.id] = true;
    state.selectedHeroIndex = heroIndex;
    saveHeroUnlocks(state.heroUnlocks);
    saveSelectedHeroId(hero.id);
  }

  const profileChanged = requestedProfile !== state.generationProfile;
  const tileStyleChanged = requestedTileStyleMode !== normalizeTileStyleMode(state.tileStyleMode);
  state.generationProfile = requestedProfile;
  state.tileStyleMode = requestedTileStyleMode;
  saveTileStyleMode(state.tileStyleMode);

  if (profileChanged || tileStyleChanged) {
    state.levelSeedBase = createRunSeed();
    _generateLevelsFromConfig(state.config);
  }

  closeCheatModal();
  if (state.started) {
    loadLevel(nextLevel, true);
  } else {
    state.currentLevelIndex = nextLevel;
    populateSettingsPanel();
    updateHudInfo();
  }
}

/* ── Controls binding ── */

export function bindControls() {
  applyLocaleToStaticUi();
  renderLeaderboard();
  const setHeldState = (buttons, key, isDown) => {
    if (state.duel?.QS.active || !state.started || state.paused || state.gameOver || state.deathSequence.active) {
      return;
    }
    state.controls[key] = isDown;
    buttons.forEach((button) => button.classList.toggle("active", isDown));
  };
  const isLeftKey = (event) =>
    event.code === "ArrowLeft" ||
    event.code === "KeyA" ||
    event.code === "KeyQ" ||
    event.key === "ArrowLeft" ||
    event.key.toLowerCase() === "a" ||
    event.key.toLowerCase() === "q";
  const isRightKey = (event) =>
    event.code === "ArrowRight" ||
    event.code === "KeyD" ||
    event.key === "ArrowRight" ||
    event.key.toLowerCase() === "d";
  const isJumpKey = (event) =>
    event.code === "ArrowUp" ||
    event.code === "KeyW" ||
    event.code === "KeyZ" ||
    event.key === "ArrowUp" ||
    event.key.toLowerCase() === "w" ||
    event.key.toLowerCase() === "z";
  const isFireKey = (event) =>
    event.code === "Space" ||
    event.code === "ArrowDown" ||
    event.key === " " ||
    event.key === "ArrowDown";

  const leftButtons = [ui.moveLeftBtn, ui.moveLeftHitBtn].filter(Boolean);
  const rightButtons = [ui.moveRightBtn, ui.moveRightHitBtn].filter(Boolean);
  const jumpButtons = [ui.jumpBtn, ui.jumpHitBtn].filter(Boolean);
  const fireButtons = [ui.castFireBtn, ui.castFireHitBtn].filter(Boolean);

  leftButtons.forEach((button) => attachHoldButton(button, (down) => setHeldState(leftButtons, "left", down)));
  rightButtons.forEach((button) => attachHoldButton(button, (down) => setHeldState(rightButtons, "right", down)));
  jumpButtons.forEach((button) =>
    attachHoldButton(button, (down) => {
      if (down) {
        if (state.duel?.QS.active || !state.started || state.paused || state.gameOver || state.deathSequence.active) {
          return;
        }
        state.controls.jumpBuffered = true;
        state.controls.jumpHeld = true;
        jumpButtons.forEach((jumpButton) => jumpButton.classList.add("active"));
      } else {
        state.controls.jumpHeld = false;
        jumpButtons.forEach((jumpButton) => jumpButton.classList.remove("active"));
      }
    }),
  );

  fireButtons.forEach((button) =>
    attachTapButton(button, () => {
      if (state.duel?.QS.active || !state.started || state.paused || state.gameOver || state.deathSequence.active) {
        return;
      }
      _castHeroProjectile();
      fireButtons.forEach((fireButton) => fireButton.classList.add("active"));
      setTimeout(() => fireButtons.forEach((fireButton) => fireButton.classList.remove("active")), 90);
    }),
  );

  ui.shopBtn?.addEventListener("click", () => {
    if (!state.ready) {
      return;
    }
    if (state.duel?.QS.active) {
      return;
    }
    openShopPanel();
  });

  attachLongPressListeners(ui.hudLives, beginCheatMenuLongPress, endCheatMenuLongPress);
  attachLongPressListeners(ui.hudScoreValue, beginVisualDebugLongPress, endVisualDebugLongPress);

  ui.debugButtonsOffsetSlider?.addEventListener("input", () => {
    state.mobileButtonsOffsetY = clamp(Number(ui.debugButtonsOffsetSlider.value) || 0, -50, 200);
    applyMobileVisualDebugOffsets();
  });
  ui.debugGameOffsetSlider?.addEventListener("input", () => {
    state.mobileGameOffsetY = clamp(Number(ui.debugGameOffsetSlider.value) || 0, 0, 200);
    applyMobileVisualDebugOffsets();
  });
  ui.settingsButtonsOffsetSlider?.addEventListener("input", () => {
    state.mobileButtonsOffsetY = clamp(Number(ui.settingsButtonsOffsetSlider.value) || 0, -50, 200);
    applyMobileVisualDebugOffsets();
  });
  ui.settingsGameOffsetSlider?.addEventListener("input", () => {
    state.mobileGameOffsetY = clamp(Number(ui.settingsGameOffsetSlider.value) || 0, 0, 200);
    applyMobileVisualDebugOffsets();
  });
  ui.debugScaleSlider?.addEventListener("input", () => {
    const value = clamp(Number(ui.debugScaleSlider.value) || 1.0, 0.5, 3.0);
    if (ui.debugScaleValue) {
      ui.debugScaleValue.textContent = `${value.toFixed(1)}x`;
    }
    _setWorldZoom?.(value);
  });
  ui.validateLevelsBtn?.addEventListener("click", () => {
    const { results, summary } = validateAllLevels();
    const lines = [summary, ""];
    for (const r of results) {
      lines.push(`Level ${r.id} (${r.biome}): ${r.grade} [${r.overall}/100] — ${r.enemies} enemies, ${r.bonuses} bonuses`);
      if (r.issues.length) {
        for (const issue of r.issues) {
          lines.push(`  ⚠ ${issue}`);
        }
      }
    }
    const output = lines.join("\n");
    if (ui.validateLevelsOutput) {
      ui.validateLevelsOutput.textContent = output;
      ui.validateLevelsOutput.hidden = false;
    }
    console.log("[LevelValidator]", output);
  });
  ui.closeVisualDebugBtn?.addEventListener("click", closeVisualDebugPanel);

  ui.cheatCloseBtn?.addEventListener("click", closeCheatModal);
  ui.cheatGivePiecesBtn?.addEventListener("click", () => {
    grantGold(999);
    updateHudInfo();
  });
  ui.cheatApplyBtn?.addEventListener("click", applyCheatSelections);

  ui.heroSelect?.addEventListener("change", () => {
    const requestedHeroIndex = clamp(Number(ui.heroSelect.value) || getPaladinIndex(), 0, state.heroes.length - 1);
    const requestedHero = state.heroes[requestedHeroIndex];
    if (!requestedHero || !isHeroOwned(requestedHero.id)) {
      ensureSelectedHeroIsOwned();
      ui.heroSelect.value = String(state.selectedHeroIndex);
      return;
    }
    state.selectedHeroIndex = requestedHeroIndex;
    saveSelectedHeroId(requestedHero.id);
    renderHeroShop();
    syncHeroActionButtonVisibility();
  });

  ui.heroShopList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest("button[data-hero-id][data-action]");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const heroId = button.dataset.heroId || "";
    const action = button.dataset.action || "";
    const heroIndex = state.heroes.findIndex((hero) => hero.id === heroId);
    if (heroIndex < 0) {
      return;
    }
    const cfg = getHeroShopConfig(heroId);

    if (action === "buy") {
      if (isHeroOwned(heroId)) {
        return;
      }
      if (!spendPersistentGold(cfg.price)) {
        showMessage(t("notEnoughPieces"));
        renderHeroShop();
        return;
      }
      state.heroUnlocks[heroId] = true;
      saveHeroUnlocks(state.heroUnlocks);
      state.selectedHeroIndex = heroIndex;
      saveSelectedHeroId(heroId);
      showMessage(t("heroUnlocked", { hero: state.heroes[heroIndex].name }));
      populateSettingsPanel();
      syncHeroActionButtonVisibility();
      return;
    }

    if (action === "equip" && isHeroOwned(heroId)) {
      state.selectedHeroIndex = heroIndex;
      saveSelectedHeroId(heroId);
      populateSettingsPanel();
      syncHeroActionButtonVisibility();
    }
  });

  ui.pauseBtn?.addEventListener("click", () => {
    if (!state.ready || !state.started || state.gameOver || state.duel?.QS.active) {
      return;
    }
    if (!ui.settingsPanel.hidden) {
      closeSettingsPanel();
    }
    if (isPauseModalOpen()) {
      closePauseMenu();
      return;
    }
    openPauseMenu();
  });

  ui.closeSettingsBtn?.addEventListener("click", closeSettingsPanel);
  ui.closeShopBtn?.addEventListener("click", closeShopPanel);

  ui.cheatWorldZoomSlider?.addEventListener("input", () => {
    _setWorldZoom(ui.cheatWorldZoomSlider.value);
  });

  ui.applySettingsBtn.addEventListener("click", () => {
    saveMobileButtonsOffset(state.mobileButtonsOffsetY);
    saveMobileGameOffset(state.mobileGameOffsetY);

    const requestedMode = ui.settingsGameModeSelect?.value === "easy" ? "easy" : "normal";
    const profileChanged = state.generationProfile !== requestedMode;
    state.generationProfile = requestedMode;

    if (profileChanged) {
      state.levelSeedBase = createRunSeed();
      _generateLevelsFromConfig(state.config);
      if (state.started) {
        loadLevel(state.currentLevelIndex, false);
      }
    }

    closeSettingsPanel();
  });

  ui.changeParentalCodeBtn?.addEventListener("click", () => {
    void changeParentalCode();
  });
  ui.toggleParentalCodeVisibilityBtn?.addEventListener("click", () => {
    const isVisible = ui.parentalCodeInput?.type === "text";
    setParentalCodeInputVisibility(!isVisible);
    ui.parentalCodeInput?.focus();
  });
  ui.forcePwaUpdateBtn?.addEventListener("click", forcePwaUpdate);

  ui.startBtn?.addEventListener("click", startGameFromMenu);
  ui.openLeaderboardBtn?.addEventListener("click", openLeaderboardModal);
  ui.closeLeaderboardBtn?.addEventListener("click", closeLeaderboardModal);
  ui.openSettingsFromTitleBtn?.addEventListener("click", () => {
    void openSettingsPanel();
  });
  ui.resumeBtn?.addEventListener("click", closePauseMenu);
  ui.openSettingsFromPauseBtn?.addEventListener("click", () => {
    void openSettingsPanel();
  });
  ui.backToTitleBtn?.addEventListener("click", () => {
    closePauseMenu();
    returnToTitleScreen();
  });
  ui.restartBtn?.addEventListener("click", restartLevelAfterGameOver);
  ui.backToTitleFromGameOverBtn?.addEventListener("click", returnToTitleScreen);
  ui.backToTitleFromVictoryBtn?.addEventListener("click", returnToTitleScreen);

  window.addEventListener(
    "keydown",
    (event) => {
      if (state.duel?.QS.active) {
        if (state.duel.handleQuestionKey(event)) {
          event.preventDefault();
        }
        return;
      }
      const key = event.key.toLowerCase();
      const titleVisible = Boolean(ui.titleScreen && !ui.titleScreen.classList.contains("hidden"));
      if (state.gameOver) {
        const isInputLocked = performance.now() < (state.gameOverInputLockedUntil || 0);
        if (event.code === "Enter" || event.code === "Space") {
          event.preventDefault();
          if (!isInputLocked) {
            restartLevelAfterGameOver();
          }
        }
        if (key === "escape") {
          event.preventDefault();
          if (!isInputLocked) {
            returnToTitleScreen();
          }
        }
        return;
      }
      if (!state.started) {
        if (titleVisible && ui.settingsPanel.hidden && ui.shopPanel.hidden && (event.code === "Enter" || event.code === "Space")) {
          event.preventDefault();
          startGameFromMenu();
          return;
        }
        if (key === "escape" && (!ui.settingsPanel.hidden || !ui.shopPanel.hidden || (ui.cheatModal && !ui.cheatModal.classList.contains("hidden")) || (ui.leaderboardModal && !ui.leaderboardModal.classList.contains("hidden")) || (ui.parentalCodeModal && !ui.parentalCodeModal.classList.contains("hidden")))) {
          event.preventDefault();
          closeOverlayPanels();
        }
        return;
      }
      if (key === "escape") {
        event.preventDefault();
        if (!ui.settingsPanel.hidden || !ui.shopPanel.hidden || (ui.parentalCodeModal && !ui.parentalCodeModal.classList.contains("hidden"))) {
          closeOverlayPanels();
          return;
        }
        if (isPauseModalOpen()) {
          closePauseMenu();
          return;
        }
        openPauseMenu();
        return;
      }
      if (state.paused || state.deathSequence.active) {
        return;
      }
      if (isLeftKey(event)) {
        event.preventDefault();
        state.controls.left = true;
        ui.moveLeftBtn.classList.add("active");
      }
      if (isRightKey(event)) {
        event.preventDefault();
        state.controls.right = true;
        ui.moveRightBtn.classList.add("active");
      }
      if (isJumpKey(event)) {
        event.preventDefault();
        state.controls.jumpBuffered = true;
        state.controls.jumpHeld = true;
        ui.jumpBtn.classList.add("active");
        setTimeout(() => ui.jumpBtn.classList.remove("active"), 90);
      }
      if (isFireKey(event)) {
        event.preventDefault();
        _castHeroProjectile();
        ui.castFireBtn?.classList.add("active");
        setTimeout(() => ui.castFireBtn?.classList.remove("active"), 90);
      }
    },
    { passive: false },
  );

  window.addEventListener("keyup", (event) => {
    if (isJumpKey(event)) {
      state.controls.jumpHeld = false;
    }
    if (state.duel?.QS.active || !state.started || state.paused || state.gameOver) {
      return;
    }
    if (isLeftKey(event)) {
      event.preventDefault();
      state.controls.left = false;
      ui.moveLeftBtn.classList.remove("active");
    }
    if (isRightKey(event)) {
      event.preventDefault();
      state.controls.right = false;
      ui.moveRightBtn.classList.remove("active");
    }
  });
  window.addEventListener("blur", () => {
    state.controls.left = false;
    state.controls.right = false;
    state.controls.jumpHeld = false;
    ui.moveLeftBtn.classList.remove("active");
    ui.moveRightBtn.classList.remove("active");
    ui.jumpBtn.classList.remove("active");
    ui.castFireBtn?.classList.remove("active");
    ui.moveLeftHitBtn?.classList.remove("active");
    ui.moveRightHitBtn?.classList.remove("active");
    ui.jumpHitBtn?.classList.remove("active");
    ui.castFireHitBtn?.classList.remove("active");
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      resetMovementInputs();
    }
  });
  window.addEventListener("pagehide", resetMovementInputs);

  document.body.addEventListener(
    "touchmove",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".panel, .menu-card, .game-over")) {
        event.preventDefault();
      }
    },
    { passive: false },
  );
}

/* ── Movement reset ── */

export function resetMovementInputs() {
  state.controls.left = false;
  state.controls.right = false;
  state.controls.jumpBuffered = false;
  state.controls.jumpHeld = false;
  state.controls.jumpBufferTime = 0;
  ui.moveLeftBtn?.classList.remove("active");
  ui.moveRightBtn?.classList.remove("active");
  ui.jumpBtn?.classList.remove("active");
  ui.castFireBtn?.classList.remove("active");
  ui.moveLeftHitBtn?.classList.remove("active");
  ui.moveRightHitBtn?.classList.remove("active");
  ui.jumpHitBtn?.classList.remove("active");
  ui.castFireHitBtn?.classList.remove("active");
}

/* ── Panel management ── */

export function isPauseModalOpen() {
  return Boolean(ui.pauseModal && !ui.pauseModal.classList.contains("hidden"));
}

export function openShopPanel() {
  if (!state.ready || !ui.shopPanel) {
    return;
  }
  ensureSelectedHeroIsOwned();
  ui.heroSelect.value = String(state.selectedHeroIndex);
  if (ui.heroSelect.selectedIndex < 0) {
    state.selectedHeroIndex = getPaladinIndex();
    ui.heroSelect.value = String(state.selectedHeroIndex);
  }
  renderHeroShop();
  ui.settingsPanel.hidden = true;
  ui.cheatModal?.classList.add("hidden");
  ui.leaderboardModal?.classList.add("hidden");
  ui.parentalCodeModal?.classList.add("hidden");
  ui.shopPanel.hidden = false;
  state.paused = true;
}

export function closeShopPanel() {
  if (!ui.shopPanel) {
    return;
  }
  ui.shopPanel.hidden = true;
  if (!state.started) {
    state.paused = false;
    return;
  }
  state.paused = isPauseModalOpen() || !ui.settingsPanel.hidden || (ui.cheatModal && !ui.cheatModal.classList.contains("hidden"));
}

export async function openSettingsPanel() {
  if (!state.ready || !ui.settingsPanel) {
    return;
  }
  if (!await requireParentalCodeAccess()) {
    return;
  }
  syncWorldZoomUi();
  applyMobileVisualDebugOffsets();
  ui.shopPanel.hidden = true;
  ui.cheatModal?.classList.add("hidden");
  ui.leaderboardModal?.classList.add("hidden");
  ui.parentalCodeModal?.classList.add("hidden");
  ui.settingsPanel.hidden = false;
  state.paused = true;
}

export function closeSettingsPanel() {
  if (!ui.settingsPanel) {
    return;
  }
  ui.settingsPanel.hidden = true;
  if (!state.started) {
    state.paused = false;
    return;
  }
  state.paused = isPauseModalOpen() || !ui.shopPanel.hidden || (ui.cheatModal && !ui.cheatModal.classList.contains("hidden"));
}

export function closeOverlayPanels() {
  closeSettingsPanel();
  closeShopPanel();
  closeCheatModal();
  closeLeaderboardModal();
  ui.parentalCodeModal?.classList.add("hidden");
}

export function openPauseMenu() {
  if (!state.started || state.gameOver || state.deathSequence.active || !ui.pauseModal) {
    return;
  }
  resetMovementInputs();
  ui.settingsPanel.hidden = true;
  ui.shopPanel.hidden = true;
  ui.cheatModal?.classList.add("hidden");
  ui.leaderboardModal?.classList.add("hidden");
  ui.parentalCodeModal?.classList.add("hidden");
  ui.pauseModal.classList.remove("hidden");
  state.paused = true;
}

export function closePauseMenu() {
  if (ui.pauseModal) {
    ui.pauseModal.classList.add("hidden");
  }
  if (!state.started) {
    state.paused = false;
    return;
  }
  state.paused = !ui.settingsPanel.hidden || !ui.shopPanel.hidden || (ui.cheatModal && !ui.cheatModal.classList.contains("hidden"));
}

export function startGameFromMenu() {
  if (!state.ready) {
    return;
  }
  if (state.duel?.QS.active) {
    state.duel.closeQuestion();
  }
  state.started = true;
  state.paused = false;
  state.gameOver = false;
  state.deathSequence.active = false;
  state.towerInterior.active = false;
  _resetBossState();
  ensureSelectedHeroIsOwned();
  state.levelSeedBase = createRunSeed();
  _generateLevelsFromConfig(state.config);
  ui.titleScreen?.classList.add("hidden");
  ui.gameOverPanel?.classList.add("hidden");
  ui.pauseModal?.classList.add("hidden");
  ui.settingsPanel.hidden = true;
  ui.shopPanel.hidden = true;
  ui.cheatModal?.classList.add("hidden");
  ui.leaderboardModal?.classList.add("hidden");
  ui.parentalCodeModal?.classList.add("hidden");
  if (state.pendingBossStart) {
    _startBossMode({ sourceLevelIndex: _getBossPrepLevelIndex() });
    return;
  }
  loadLevel(state.currentLevelIndex, true);
}

export function showTitleScreen() {
  state.started = false;
  state.paused = false;
  state.gameOver = false;
  state.deathSequence.active = false;
  state.screenMode = "game";
  state.towerInterior.active = false;
  _resetBossState();
  if (state.duel?.QS.active) {
    state.duel.closeQuestion();
  }
  resetMovementInputs();
  ui.settingsPanel.hidden = true;
  ui.shopPanel.hidden = true;
  ui.pauseModal?.classList.add("hidden");
  ui.gameOverPanel?.classList.add("hidden");
  ui.leaderboardModal?.classList.add("hidden");
  ui.parentalCodeModal?.classList.add("hidden");
  ui.titleScreen?.classList.remove("hidden");
  updateHudInfo();
  renderLeaderboard();
}

export function returnToTitleScreen() {
  loadLevel(state.currentLevelIndex, true);
  showTitleScreen();
}

function openResetGameConfirmation() {
  if (!ui.resetGameConfirmModal || !ui.resetGameCancelBtn || !ui.resetGameConfirmBtn) {
    return Promise.resolve(window.confirm(t("resetGameConfirm")));
  }

  ui.resetGameConfirmText.textContent = t("resetGameWarning");
  ui.resetGameConfirmModal.classList.remove("hidden");

  return new Promise((resolve) => {
    let closed = false;
    const close = (result) => {
      if (closed) return;
      closed = true;
      ui.resetGameConfirmModal.classList.add("hidden");
      ui.resetGameCancelBtn.removeEventListener("click", onCancel);
      ui.resetGameConfirmBtn.removeEventListener("click", onConfirm);
      resolve(result);
    };
    const onCancel = () => close(false);
    const onConfirm = () => close(true);
    ui.resetGameCancelBtn.addEventListener("click", onCancel);
    ui.resetGameConfirmBtn.addEventListener("click", onConfirm);
  });
}

export async function resetGameProgress() {
  const shouldReset = await openResetGameConfirmation();
  if (!shouldReset) {
    return;
  }

  resetStoredGameProgress();
  resetErrors();

  state.persistentGold = 0;
  state.coins = 0;
  state.score = 0;
  state.currentLevelIndex = 0;
  state.leaderboard = [];

  initializeHeroProgress();
  populateSettingsPanel();
  renderErrorList();
  updateHudInfo();
  renderLeaderboard();

  showTitleScreen();
}

export function showGameOverScreen() {
  state.started = false;
  state.paused = true;
  state.gameOver = true;
  state.gameOverInputLockedUntil = performance.now() + 250;
  state.screenMode = "game";
  state.towerInterior.active = false;
  resetMovementInputs();
  if (state.duel?.QS.active) {
    state.duel.closeQuestion();
  }
  _resetBossState();
  ui.settingsPanel.hidden = true;
  ui.shopPanel.hidden = true;
  ui.pauseModal?.classList.add("hidden");
  ui.titleScreen?.classList.add("hidden");
  if (ui.gameOverTitle) {
    ui.gameOverTitle.textContent = t("gameOver");
  }
  if (ui.gameOverText) {
    ui.gameOverText.textContent = t("lostHearts");
  }
  if (ui.finalScoreText) {
    ui.finalScoreText.textContent = t("finalScore", { value: state.score });
  }
  if (ui.finalCoinsText) {
    ui.finalCoinsText.textContent = t("coins", { value: state.coins });
  }
  requestLeaderboardEntry("gameover");
  ui.gameOverPanel?.classList.remove("hidden");
}

export function restartLevelAfterGameOver() {
  if (!state.gameOver) {
    return;
  }
  if (performance.now() < (state.gameOverInputLockedUntil || 0)) {
    return;
  }
  state.gameOver = false;
  state.gameOverInputLockedUntil = 0;
  state.started = true;
  state.paused = false;
  ui.gameOverPanel?.classList.add("hidden");
  ui.pauseModal?.classList.add("hidden");
  ui.settingsPanel.hidden = true;
  loadLevel(state.currentLevelIndex, true);
}

export function loadLevel(levelIndex, resetScore) {
  if (state.duel?.QS.active) {
    state.duel.closeQuestion();
  }
  state.currentLevelIndex = levelIndex;
  state.pendingBossStart = false;
  state.currentLevel = cloneLevel(state.levels[levelIndex]);
  _preloadLevelAssetImages?.(state.levels[levelIndex]).catch(() => null);
  state.cameraX = 0;
  state.endCastleLockHintUntil = 0;
  state.playerHitInvuln = 0;
  state.playerHitStun = 0;
  state.deathSequence.active = false;
  state.deathSequence.elapsed = 0;
  state.deathSequence.duration = PLAYER_DEATH_DELAY_SECONDS;
  state.gameOver = false;
  state.respawnTrail.elapsedSinceSample = 0;
  state.respawnTrail.history = [];
  state.screenMode = "game";
  state.towerInterior.active = false;
  _resetBossState();
  state.towerInterior.chestState = "locked";
  state.towerInterior.chestStreak = 0;
  state.towerInterior.chestRequired = 3;
  state.towerInterior.chestRewardPieces = 0;
  state.towerInterior.chestExplodeUntil = 0;
  state.towerInterior.chestPromptUntil = 0;
  state.fireballs = [];
  state.floatingRewards = [];
  ui.gameOverPanel?.classList.add("hidden");

  ensureSelectedHeroIsOwned();
  syncHeroActionButtonVisibility();
  const hero = state.heroes[state.selectedHeroIndex];
  // Use hero-specific hitbox overrides when provided; otherwise fall back to manifest bounds.
  const manifestHitbox = hero ? getManifestHitbox(hero.sprite.idleSE, HERO_SCALE) : null;
  const hitboxOverride = hero ? getHeroHitboxOverride(hero.id) : null;
  const playerW = hitboxOverride?.w || manifestHitbox?.w || PLAYER_HITBOX_WIDTH;
  const playerH = hitboxOverride?.h || manifestHitbox?.h || PLAYER_HITBOX_HEIGHT;
  state.player = {
    x: state.currentLevel.start.x,
    y: state.currentLevel.start.y - playerH,
    vx: 0,
    vy: 0,
    w: playerW,
    h: playerH,
    onGround: false,
    facing: "south-east",
    animTime: 0,
    coyoteTime: 0,
    prevY: state.currentLevel.start.y - playerH,
  };

  if (resetScore) {
    state.score = 0;
    state.hearts = getStartingHearts(state.generationProfile);
  }
  updateHudInfo();

  showMessage(t("levelLabel", {
    level: levelIndex + 1,
    biome: t(`biome.${state.currentLevel.biomeId}`),
  }));
}

export function cloneLevel(level) {
  return {
    ...level,
    tileGrid: level.tileGrid.map((row) => row.slice()),
    bonuses: level.bonuses.map((item) => ({ ...item })),
    decorations: level.decorations.map((item) => ({ ...item })),
    groundDecorations: (level.groundDecorations || []).map((item) => ({ ...item })),
    enemySpawns: level.enemySpawns.map((enemy) => ({ ...enemy })),
    animalSpawns: (level.animalSpawns || []).map((animal) => ({ ...animal })),
    skyBirdSpawns: (level.skyBirdSpawns || []).map((bird) => ({ ...bird })),
    guardSpawns: (level.guardSpawns || []).map((guard) => ({ ...guard })),
    enemyDrops: [],
    initialEnemyCount: Number.isFinite(level.initialEnemyCount) ? level.initialEnemyCount : level.enemySpawns.length,
    defeatedEnemyCount: Number.isFinite(level.defeatedEnemyCount) ? level.defeatedEnemyCount : 0,
  };
}

/* ── HUD ── */

export function updateHudInfo() {
  if (ui.hudScoreValue) {
    ui.hudScoreValue.textContent = `${Math.max(0, Math.floor(state.score || 0))}`;
  }
  if (ui.hudLives) {
    ui.hudLives.textContent = formatHeartMeter(Math.max(0, Math.floor(state.hearts || 0)), MAX_HEARTS);
  }
  if (ui.hudGoldValue) {
    ui.hudGoldValue.textContent = `${Math.max(0, Math.floor(state.coins || 0))}`;
  }
}

export function formatHeartMeter(current, max) {
  const safeMax = Math.max(0, Math.floor(max || 0));
  const safeCurrent = clamp(Math.floor(current || 0), 0, safeMax);
  let out = "";
  for (let i = 0; i < safeMax; i += 1) {
    out += i < safeCurrent ? "❤️" : "🩶";
  }
  return out;
}

/* ── Message ── */

export function showMessage(text) {
  state.message = text;
  state.messageUntil = performance.now() + 1700;
}

/* ── UI helpers ── */

export function attachHoldButton(element, callback) {
  const down = (event) => {
    event.preventDefault();
    callback(true);
  };
  const up = (event) => {
    event.preventDefault();
    callback(false);
  };

  element.addEventListener("touchstart", down, { passive: false });
  element.addEventListener("touchend", up, { passive: false });
  element.addEventListener("touchcancel", up, { passive: false });
  element.addEventListener("mousedown", down);
  element.addEventListener("mouseup", up);
  element.addEventListener("mouseleave", up);
}

export function attachTapButton(element, callback) {
  const tap = (event) => {
    event.preventDefault();
    callback();
  };

  element.addEventListener("touchstart", tap, { passive: false });
  element.addEventListener("mousedown", tap);
}

/* ── Pedagogy ── */

export function populatePedagogyPanel() {
  if (!ui.groupFilters || !ui.tenseFilters) {
    return;
  }
  const verbs = getVerbSource();
  const groupKeys = Object.keys(verbs);

  ui.tenseFilters.textContent = "";
  ui.groupFilters.textContent = "";
  groupKeys.forEach((g) => {
    const group = verbs[g] || {};
    const irregularVerbList = (g === "irr1" || g === "irr2" || g === "irr3")
      ? Object.values(group.list || {})
        .map((verb) => String(verb?.inf || "").trim())
        .filter(Boolean)
        .join(", ")
      : "";
    const groupLabel = `${group.label || g}${irregularVerbList ? ` (${irregularVerbList})` : ""}`;
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.group = g;
    input.checked = state.pedagogy.activeGroups.includes(g);
    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${groupLabel}`));
    ui.groupFilters.appendChild(label);
  });

  TENSE_KEYS.forEach((t) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.tense = t;
    input.checked = state.pedagogy.activeTenses.includes(t);
    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${TENSE_LABEL[t]}`));
    ui.tenseFilters.appendChild(label);
  });

  ui.groupFilters.querySelectorAll("input[data-group]").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = [...ui.groupFilters.querySelectorAll("input[data-group]:checked")].map((el) => el.dataset.group);
      state.pedagogy.activeGroups = selected.length ? selected : groupKeys.slice();
      savePedagogyGroups(state.pedagogy.activeGroups);
      renderErrorList();
    });
  });
  ui.tenseFilters.querySelectorAll("input[data-tense]").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = [...ui.tenseFilters.querySelectorAll("input[data-tense]:checked")].map((el) => el.dataset.tense);
      state.pedagogy.activeTenses = selected.length ? selected : TENSE_KEYS.slice();
      savePedagogyTenses(state.pedagogy.activeTenses);
      renderErrorList();
    });
  });
  if (ui.resetErrorsBtn) {
    ui.resetErrorsBtn.onclick = () => {
      resetErrors();
      renderErrorList();
    };
  }
  if (ui.resetGameBtn) {
    ui.resetGameBtn.onclick = () => {
      resetGameProgress();
    };
  }
}

/* ── Question UI hooks ── */

export function buildQuestionUiHooks() {
  const setQuestionActorSprites = (uiMeta = null) => {
    const hero = state.heroes[state.selectedHeroIndex];
    const enemy = state.duel?.QS?.enemy;
    const enemySprite =
      uiMeta?.enemySprite || enemy?.def?.sprite?.idleW || enemy?.def?.sprite?.idleE || null;
    const heroSprite = hero?.sprite?.idleSE || hero?.sprite?.idleSW || null;

    if (ui.questionEnemySprite) {
      if (enemySprite) {
        ui.questionEnemySprite.src = enemySprite;
        ui.questionEnemySprite.hidden = false;
      } else {
        ui.questionEnemySprite.removeAttribute("src");
        ui.questionEnemySprite.hidden = true;
      }
    }

    if (ui.questionHeroSprite) {
      if (heroSprite) {
        ui.questionHeroSprite.src = heroSprite;
        ui.questionHeroSprite.hidden = false;
      } else {
        ui.questionHeroSprite.removeAttribute("src");
        ui.questionHeroSprite.hidden = true;
      }
    }
  };

  const formatQuestionTense = (tenseLabel) => {
    const label = String(tenseLabel || "").trim();
    if (!label) {
      return "au temps inconnu";
    }
    const lower = label.charAt(0).toLowerCase() + label.slice(1);
    const first = lower[0];
    const useElision = ["a", "e", "i", "o", "u", "y", "h"].includes(first);
    return useElision ? `à l'${lower}` : `au ${lower}`;
  };

  return {
    onOpenQuestion(question, uiMeta = null) {
      if (!ui.questionPanel || !ui.questionPrompt || !ui.answerButtons) {
        return;
      }
      const verbs = getVerbSource();
      const verbDef = verbs?.[question.gKey]?.list?.[question.vKey];
      const inf = verbDef?.inf || question.vKey;
      const pronoun = PRONOUN_LABEL[question.pronIdx] || "";
      const tenseText = formatQuestionTense(question.tenseLabel);
      const groupLabel = verbs?.[question.gKey]?.label || question.gKey;
      const biomeId = state.currentLevel?.biomeId || "forest";
      if (ui.questionEnemy) {
        ui.questionEnemy.textContent = uiMeta?.enemyEmoji || (BIOME_EMOJI[biomeId] || "⚔️");
      }
      setQuestionActorSprites(uiMeta);
      if (ui.questionEnemy) {
        ui.questionEnemy.hidden = !!(ui.questionEnemySprite && !ui.questionEnemySprite.hidden);
      }
      if (ui.questionGroup) {
        ui.questionGroup.textContent = uiMeta?.groupLabel || groupLabel;
      }
      if (ui.questionTense) {
        ui.questionTense.textContent = uiMeta?.tenseLabel || question.tenseLabel;
      }
      if (ui.questionCountdown) {
        ui.questionCountdown.hidden = !state.boss.active;
      }
      ui.questionPrompt.textContent = "";
      ui.questionPrompt.appendChild(document.createTextNode("Conjugue "));
      const verbSpan = document.createElement("span");
      verbSpan.className = "verb";
      verbSpan.textContent = inf;
      ui.questionPrompt.appendChild(verbSpan);
      ui.questionPrompt.appendChild(document.createTextNode(` ${tenseText}`));
      ui.questionPrompt.appendChild(document.createElement("br"));
      const pronounSpan = document.createElement("span");
      pronounSpan.className = "pronoun";
      pronounSpan.textContent = pronoun;
      ui.questionPrompt.appendChild(pronounSpan);
      const blankSpan = document.createElement("span");
      blankSpan.className = "blank";
      blankSpan.textContent = "???";
      ui.questionPrompt.appendChild(document.createTextNode(" "));
      ui.questionPrompt.appendChild(blankSpan);
      ui.answerButtons.innerHTML = "";
      question.options.forEach((option) => {
        const btn = document.createElement("button");
        btn.className = "answer-btn";
        btn.type = "button";
        btn.dataset.answer = option;
        btn.textContent = option;
        btn.addEventListener("click", () => {
          answerClick(option);
        });
        ui.answerButtons.appendChild(btn);
      });
      ui.questionPanel.hidden = false;
    },
    onCloseQuestion() {
      if (!ui.questionPanel || !ui.answerButtons) {
        return;
      }
      ui.questionPanel.hidden = true;
      if (ui.questionCountdown) {
        ui.questionCountdown.hidden = true;
      }
      if (ui.questionEnemy) {
        ui.questionEnemy.hidden = false;
      }
      if (ui.questionEnemySprite) {
        ui.questionEnemySprite.removeAttribute("src");
        ui.questionEnemySprite.hidden = true;
      }
      if (ui.questionHeroSprite) {
        ui.questionHeroSprite.removeAttribute("src");
        ui.questionHeroSprite.hidden = true;
      }
      ui.answerButtons.innerHTML = "";
    },
    getAnswerButtons() {
      return ui.answerButtons ? [...ui.answerButtons.querySelectorAll(".answer-btn")] : [];
    },
    setSelectedButton(button) {
      this.getAnswerButtons().forEach((btn) => btn.classList.remove("selected"));
      if (button) {
        button.classList.add("selected");
      }
    },
    disableAnswers() {
      this.getAnswerButtons().forEach((btn) => {
        btn.disabled = true;
      });
    },
    markAnswer({ correct, selected }) {
      this.getAnswerButtons().forEach((btn) => {
        const answer = btn.dataset.answer;
        if (answer === correct) {
          btn.classList.add("correct");
        }
        if (selected && selected !== correct && answer === selected) {
          btn.classList.add("wrong");
        }
      });
    },
    vibrate(ms) {
      if (navigator.vibrate) {
        navigator.vibrate(ms);
      }
    },
    onErrorUpdate() {
      renderErrorList();
    },
  };
}

/* ── Error list ── */

export function renderErrorList() {
  if (!state.duel || !ui.errorList) {
    return;
  }
  state.duel.renderErrorList(ui.errorList, 12);
}

/* ── Conjugation API ── */

export function exposeConjugationApi() {
  if (!_isDevMode) return;
  window.openQuestion = openQuestion;
  window.makeQuestion = makeQuestion;
  window.answerClick = answerClick;
  window.closeQuestion = closeQuestion;
  window.recordError = recordError;
  window.resetErrors = resetErrors;
  window.getTopErrors = getTopErrors;
  window.randomVerbData = randomVerbData;
  window.generateLevelVerbDatas = generateLevelVerbDatas;
}

export function openQuestion(enemy) {
  return state.duel ? state.duel.openQuestion(enemy) : false;
}
export function makeQuestion(vd) {
  return state.duel ? state.duel.makeQuestion(vd) : null;
}
export function answerClick(answer) {
  return state.duel ? state.duel.answerClick(answer) : false;
}
export function closeQuestion() {
  return state.duel ? state.duel.closeQuestion() : undefined;
}
export function recordError(q) {
  return state.duel ? state.duel.recordError(q) : undefined;
}
export function resetErrors() {
  return state.duel ? state.duel.resetErrors() : undefined;
}
export function getTopErrors(n) {
  return state.duel ? state.duel.getTopErrors(n) : [];
}
export function randomVerbData() {
  return state.duel ? state.duel.randomVerbData() : null;
}
export function generateLevelVerbDatas(n) {
  return state.duel ? state.duel.generateLevelVerbDatas(n) : [];
}
