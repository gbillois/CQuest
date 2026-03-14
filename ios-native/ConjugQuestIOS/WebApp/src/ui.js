import {
  VIRTUAL_WIDTH, VIRTUAL_HEIGHT,
  TENSE_KEYS, TENSE_LABEL, PRONOUN_LABEL,
  BIOME_EMOJI,
  CHEAT_MENU_LONG_PRESS_MS, MAX_HEARTS,
  getHeroShopConfig, getStartingHearts, getHeroHitboxOverride,
  PLAYER_HITBOX_WIDTH, PLAYER_HITBOX_HEIGHT, HERO_SCALE,
  PLAYER_DEATH_DELAY_SECONDS,
  ERROR_DB_STORAGE_KEY,
} from "./constants.js";
import { clamp, capitalize, createRunSeed } from "./utils.js";
import { state, ui } from "./state.js";
import {
  isHeroOwned, ensureSelectedHeroIsOwned, getPaladinIndex,
  saveHeroUnlocks, saveSelectedHeroId, spendPersistentGold,
  grantGold, initializeHeroProgress, syncHeroActionButtonVisibility,
  loadPersistentGold, loadWorldZoom, saveWorldZoom, normalizeWorldZoom,
  getSelectedHeroId, normalizeTileStyleMode, saveTileStyleMode,
} from "./persistence.js";
import { getVerbSource, getDefaultActiveGroups } from "./conjugation.js";
import { getManifestHitbox } from "./sprite-manifest.js";
import { validateAllLevels } from "./level-validator.js";

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

/* ── Hero shop ── */

export function renderHeroShop() {
  if (ui.shopGoldValue) {
    ui.shopGoldValue.textContent = `${Math.floor(state.persistentGold || 0)} pièces`;
  }
  if (!ui.heroShopList) {
    return;
  }

  const selectedHero = state.heroes[state.selectedHeroIndex];
  const selectedHeroId = selectedHero?.id || "";
  ui.heroShopList.innerHTML = state.heroes
    .map((hero) => {
      const cfg = getHeroShopConfig(hero.id);
      const owned = isHeroOwned(hero.id);
      const equipped = owned && hero.id === selectedHeroId;
      const canBuy = !owned && state.persistentGold >= cfg.price;
      const actionLabel = equipped ? "Équipé" : owned ? "Équiper" : "Acheter";
      const actionClass = owned ? "hero-shop-btn" : "hero-shop-btn buy";
      const disabled = !owned && !canBuy ? "disabled" : "";
      const lockStateClass = owned ? "owned" : "locked";
      const priceLabel = owned
        ? "Déjà débloquée"
        : `Prix : <span class="amount">${cfg.price} pièces</span>`;
      return `<div class="hero-shop-item ${lockStateClass}">
        <div class="hero-shop-preview">
          <img src="${hero.sprite.idleSE}" alt="${hero.name}" loading="lazy" />
          ${owned ? "" : '<span class="hero-shop-lock" aria-hidden="true">🔒</span>'}
        </div>
        <div class="hero-shop-meta">
          <div class="hero-shop-name">${hero.name}</div>
          <div class="hero-shop-price">${priceLabel}</div>
        </div>
        <button type="button" class="${actionClass}" data-hero-id="${hero.id}" data-action="${owned ? "equip" : "buy"}" ${disabled}>${actionLabel}</button>
      </div>`;
    })
    .join("");
}

/* ── Zoom UI ── */

export function syncWorldZoomUi() {
  if (ui.worldZoomSlider) {
    ui.worldZoomSlider.value = String(state.worldZoom);
  }
  if (ui.worldZoomValue) {
    ui.worldZoomValue.textContent = formatZoomLabel(state.worldZoom);
  }
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
  syncWorldZoomUi();
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
    option.textContent = `Niveau ${level.id || index + 1} - ${capitalize(level.biomeId)}`;
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
  const buttonsOffset = clamp(Number(state.mobileButtonsOffsetY) || 0, 0, 180);
  const gameOffset = clamp(Number(state.mobileGameOffsetY) || 0, -200, 200);
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
    state.mobileButtonsOffsetY = clamp(Number(ui.debugButtonsOffsetSlider.value) || 0, 0, 180);
    applyMobileVisualDebugOffsets();
  });
  ui.debugGameOffsetSlider?.addEventListener("input", () => {
    state.mobileGameOffsetY = clamp(Number(ui.debugGameOffsetSlider.value) || 0, -200, 200);
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
        showMessage("Pas assez de pièces");
        renderHeroShop();
        return;
      }
      state.heroUnlocks[heroId] = true;
      saveHeroUnlocks(state.heroUnlocks);
      state.selectedHeroIndex = heroIndex;
      saveSelectedHeroId(heroId);
      showMessage(`${state.heroes[heroIndex].name} débloquée`);
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

  ui.closeSettingsBtn.addEventListener("click", closeSettingsPanel);
  ui.closeShopBtn?.addEventListener("click", closeShopPanel);

  ui.worldZoomSlider?.addEventListener("input", () => {
    _setWorldZoom(ui.worldZoomSlider.value);
  });
  ui.cheatWorldZoomSlider?.addEventListener("input", () => {
    _setWorldZoom(ui.cheatWorldZoomSlider.value);
  });

  ui.applySettingsBtn.addEventListener("click", () => {
    closeSettingsPanel();
  });

  ui.startBtn?.addEventListener("click", startGameFromMenu);
  ui.openSettingsFromTitleBtn?.addEventListener("click", openSettingsPanel);
  ui.resumeBtn?.addEventListener("click", closePauseMenu);
  ui.openSettingsFromPauseBtn?.addEventListener("click", () => {
    openSettingsPanel();
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
        if (event.code === "Enter" || event.code === "Space") {
          event.preventDefault();
          restartLevelAfterGameOver();
        }
        if (key === "escape") {
          event.preventDefault();
          returnToTitleScreen();
        }
        return;
      }
      if (!state.started) {
        if (titleVisible && ui.settingsPanel.hidden && ui.shopPanel.hidden && (event.code === "Enter" || event.code === "Space")) {
          event.preventDefault();
          startGameFromMenu();
          return;
        }
        if (key === "escape" && (!ui.settingsPanel.hidden || !ui.shopPanel.hidden || (ui.cheatModal && !ui.cheatModal.classList.contains("hidden")))) {
          event.preventDefault();
          closeOverlayPanels();
        }
        return;
      }
      if (key === "escape") {
        event.preventDefault();
        if (!ui.settingsPanel.hidden || !ui.shopPanel.hidden) {
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

export function openSettingsPanel() {
  if (!state.ready || !ui.settingsPanel) {
    return;
  }
  syncWorldZoomUi();
  ui.shopPanel.hidden = true;
  ui.cheatModal?.classList.add("hidden");
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
}

export function openPauseMenu() {
  if (!state.started || state.gameOver || state.deathSequence.active || !ui.pauseModal) {
    return;
  }
  resetMovementInputs();
  ui.settingsPanel.hidden = true;
  ui.shopPanel.hidden = true;
  ui.cheatModal?.classList.add("hidden");
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
  ui.titleScreen?.classList.remove("hidden");
  updateHudInfo();
}

export function returnToTitleScreen() {
  loadLevel(state.currentLevelIndex, true);
  showTitleScreen();
}

export function showGameOverScreen() {
  state.started = false;
  state.paused = true;
  state.gameOver = true;
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
    ui.gameOverTitle.textContent = "Game Over";
  }
  if (ui.gameOverText) {
    ui.gameOverText.textContent = "You lost all hearts.";
  }
  if (ui.finalScoreText) {
    ui.finalScoreText.textContent = `Final score: ${state.score}`;
  }
  if (ui.finalCoinsText) {
    ui.finalCoinsText.textContent = `Coins: ${state.coins}`;
  }
  ui.gameOverPanel?.classList.remove("hidden");
}

export function restartLevelAfterGameOver() {
  if (!state.gameOver) {
    return;
  }
  state.gameOver = false;
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

  showMessage(`Level ${levelIndex + 1}: ${capitalize(state.currentLevel.biomeId)}`);
}

export function cloneLevel(level) {
  return {
    ...level,
    tileGrid: level.tileGrid.map((row) => row.slice()),
    bonuses: level.bonuses.map((item) => ({ ...item })),
    decorations: level.decorations.map((item) => ({ ...item })),
    groundDecorations: (level.groundDecorations || []).map((item) => ({ ...item })),
    enemySpawns: level.enemySpawns.map((enemy) => ({ ...enemy })),
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
  ui.groupFilters.innerHTML = groupKeys
    .map((g) => {
      const checked = state.pedagogy.activeGroups.includes(g) ? "checked" : "";
      const label = verbs[g]?.label || g;
      return `<label><input type="checkbox" data-group="${g}" ${checked}/> ${label}</label>`;
    })
    .join("");

  ui.tenseFilters.innerHTML = TENSE_KEYS
    .map((t) => {
      const checked = state.pedagogy.activeTenses.includes(t) ? "checked" : "";
      return `<label><input type="checkbox" data-tense="${t}" ${checked}/> ${TENSE_LABEL[t]}</label>`;
    })
    .join("");

  ui.groupFilters.querySelectorAll("input[data-group]").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = [...ui.groupFilters.querySelectorAll("input[data-group]:checked")].map((el) => el.dataset.group);
      state.pedagogy.activeGroups = selected.length ? selected : groupKeys.slice();
      renderErrorList();
    });
  });
  ui.tenseFilters.querySelectorAll("input[data-tense]").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = [...ui.tenseFilters.querySelectorAll("input[data-tense]:checked")].map((el) => el.dataset.tense);
      state.pedagogy.activeTenses = selected.length ? selected : TENSE_KEYS.slice();
      renderErrorList();
    });
  });
  if (ui.resetErrorsBtn) {
    ui.resetErrorsBtn.onclick = () => {
      resetErrors();
      renderErrorList();
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
      ui.questionPrompt.innerHTML = `Conjugue <span class="verb">${inf}</span> ${tenseText}<br/><span class="pronoun">${pronoun}</span> <span class="blank">???</span>`;
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
