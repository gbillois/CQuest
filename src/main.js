// ─── Imports ───
import { GAME, WORLD_SCALE, PRONOUN_LABEL, ERROR_DB_STORAGE_KEY, JUMP_CUT_MULTIPLIER, JUMP_BUFFER_WINDOW_SECONDS, BIOME_PARALLAX_BACKGROUNDS } from "./constants.js";
import { createRunSeed } from "./utils.js";
import { state, ui } from "./state.js";
import {
  loadConfig, setupUiAssets, buildBiomeIndex, loadHeroes, loadEnemies, loadAnimals, loadSkyBirds, loadGuards,
  ensureEmergencyRoster, enforceMinimumJumpHeight, loadImage, preloadLevelAssetImages,
  preloadSelectedHeroSprites, scheduleBackgroundWarmup, setUpdateHudInfo,
} from "./asset-loader.js";
import { generateLevelsFromConfig, generateFirstLevel, generateRemainingLevels } from "./level-generator.js";
import { loadSpriteManifest } from "./sprite-manifest.js";
import { validateAllLevels, scoreLevelQuality } from "./level-validator.js";
import { logInfo, logError, dumpLogs, setLogLevel, getLogs, clearLogs } from "./logger.js";
import { setTriggerBonusBlock, resolveHorizontalCollisions, resolveVerticalCollisions } from "./physics.js";
import {
  updateEnemies, updateAnimals, updateSkyBirds, updateGuards, updateFireballs, updateBonusBlocks, updateEnemyDrops,
  updateDeathSequence, updateTowerInterior, updateBossMode,
  updateBossQuestionCountdown, triggerBonusBlock, hitPlayer, defeatEnemy,
  startBossMode, getBossPrepLevelIndex, resetBossState, setEntityHooks,
  tryEnterTower, collideWithEnemies, checkAnimalBounce, checkGoal, damagePlayer, respawnPlayer,
  castHeroProjectile, updateCrumblingPlatforms, updateMovingPlatforms, updateConjugationGates,
} from "./entities.js";
import { render, updateCamera, setRendererHooks, setWorldZoom, syncCameraToCurrentZoom, getWorldZoom, updateParticles, updateFloatingRewards, toggleDebugOverlay } from "./renderer.js";
import {
  populateSettingsPanel, populatePedagogyPanel, renderErrorList,
  bindControls, applyMobileVisualDebugOffsets, loadLevel, showTitleScreen,
  showMessage, showGameOverScreen, updateHudInfo, syncWorldZoomUi,
  startGameFromMenu, buildQuestionUiHooks, exposeConjugationApi,
  setUiHooks, renderHeroShop, requestLeaderboardEntry,
} from "./ui.js";
import {
  loadPersistentGold, normalizeWorldZoom, loadWorldZoom, saveWorldZoom,
  initializeHeroProgress, setRenderHeroShop, loadTileStyleMode, loadLeaderboard,
  loadMobileButtonsOffset, loadMobileGameOffset,
} from "./persistence.js";
import { getVerbSource, getDefaultActiveGroups, createConjugationDuelSystem } from "./conjugation.js";

// ─── Wire late-binding hooks ───
setUpdateHudInfo(updateHudInfo);
setTriggerBonusBlock(triggerBonusBlock);
setEntityHooks({
  openQuestion: (enemy) => state.duel ? state.duel.openQuestion(enemy) : false,
  showMessage,
  loadLevel,
  showGameOverScreen,
  requestLeaderboardEntry,
});
setRendererHooks({
  syncWorldZoomUi,
  saveWorldZoom,
});
setUiHooks({
  generateLevelsFromConfig,
  generateRemainingLevels,
  loadLevel,
  startBossMode,
  getBossPrepLevelIndex,
  resetBossState,
  castHeroProjectile,
  setWorldZoom,
  syncWorldZoomUi,
  preloadLevelAssetImages,
});
setRenderHeroShop(renderHeroShop);

const RESPAWN_SAMPLE_INTERVAL_SECONDS = 0.2;
const RESPAWN_HISTORY_WINDOW_SECONDS = 3;

function resetRespawnTrail() {
  state.respawnTrail.elapsedSinceSample = 0;
  state.respawnTrail.history = [];
}

function updateRespawnTrail(delta) {
  const player = state.player;
  const level = state.currentLevel;
  if (!player || !level || state.deathSequence.active || state.towerInterior.active || state.duel?.QS.active) {
    return;
  }

  const trail = state.respawnTrail;
  trail.elapsedSinceSample += delta;
  if (trail.elapsedSinceSample < RESPAWN_SAMPLE_INTERVAL_SECONDS) {
    return;
  }

  trail.elapsedSinceSample = 0;
  const maxSafeY = level.worldHeight - state.tileSize * 1.25;
  if (player.y > maxSafeY) {
    return;
  }

  trail.history.push({ x: player.x, y: player.y });
  const maxEntries = Math.ceil(RESPAWN_HISTORY_WINDOW_SECONDS / RESPAWN_SAMPLE_INTERVAL_SECONDS);
  if (trail.history.length > maxEntries) {
    trail.history.splice(0, trail.history.length - maxEntries);
  }
}

// ─── Init ───
async function init() {
  // Phase 1: Load config (required) and start sprite manifest in background (non-blocking).
  const spriteManifestPromise = loadSpriteManifest();
  const config = await loadConfig();
  state.config = config;
  state.tileSize = (config.grid?.tile_size || 32) * WORLD_SCALE;
  enforceMinimumJumpHeight();

  buildBiomeIndex(config);
  state.persistentGold = loadPersistentGold();
  state.coins = state.persistentGold;
  state.tileStyleMode = loadTileStyleMode();
  state.worldZoom = normalizeWorldZoom(loadWorldZoom());
  state.leaderboard = loadLeaderboard();
  state.mobileButtonsOffsetY = loadMobileButtonsOffset();
  state.mobileGameOffsetY = loadMobileGameOffset();
  syncWorldZoomUi();
  state.pedagogy.activeGroups = getDefaultActiveGroups();
  state.duel = createConjugationDuelSystem({
    verbs: getVerbSource(),
    pronouns: PRONOUN_LABEL,
    storageKey: ERROR_DB_STORAGE_KEY,
    settingsGetter: () => ({
      activeGroups: state.pedagogy.activeGroups.slice(),
      activeTenses: state.pedagogy.activeTenses.slice(),
    }),
    uiHooks: buildQuestionUiHooks(),
    gameplayHooks: {
      onOpenQuestion: (_q, enemy) => {
        state.screenMode = "question";
        state.controls.left = false;
        state.controls.right = false;
        state.controls.jumpBuffered = false;
        state.controls.jumpHeld = false;
        state.controls.jumpBufferTime = 0;
        const player = state.player;
        if (player && enemy) {
          const playerCenter = player.x + player.w * 0.5;
          const enemyCenter = enemy.x + enemy.w * 0.5;
          if (playerCenter <= enemyCenter) {
            player.facing = "south-east";
            enemy.dir = -1;
          } else {
            player.facing = "south-west";
            enemy.dir = 1;
          }
        }
      },
      onCloseQuestion: () => {
        state.screenMode = state.boss.active ? "boss" : "game";
      },
      hitPlayer: () => {
        hitPlayer();
      },
      defeatEnemy: (enemy) => {
        defeatEnemy(enemy);
      },
    },
  });
  // Only expose debug/conjugation APIs in development (localhost or file://).
  const _isDevMode = typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
     window.location.hostname === "127.0.0.1" ||
     window.location.protocol === "file:");

  if (_isDevMode) {
    exposeConjugationApi();
    // Expose debug APIs on window for console access.
    window.validateLevels = validateAllLevels;
    window.scoreLevelQuality = scoreLevelQuality;
    window.gameLogs = { dump: dumpLogs, get: getLogs, clear: clearLogs, setLevel: setLogLevel };
  }

  // F11: toggle level design debug overlay (dev mode only).
  document.addEventListener("keydown", (e) => {
    if (e.key === "F11" && _isDevMode) {
      e.preventDefault();
      toggleDebugOverlay();
    }
  });

  // A/B testing: generate 5 levels with same difficulty, log comparison (dev only).
  if (_isDevMode) window.compareGenerations = (difficultyProfile) => {
    const profile = difficultyProfile || state.generationProfile;
    const savedProfile = state.generationProfile;
    state.generationProfile = profile;
    const results = [];
    for (let trial = 0; trial < 5; trial++) {
      const trialSeed = createRunSeed();
      state.levelSeedBase = trialSeed;
      generateLevelsFromConfig(config);
      const validation = validateAllLevels();
      results.push({
        trial: trial + 1,
        seed: trialSeed,
        summary: validation.summary,
        levels: validation.results.map(r => ({
          id: r.id, biome: r.biome, shape: r.shape,
          blocks: r.blocks, uniqueBlocks: r.uniqueBlocks,
          grade: r.grade, score: r.overall, designScore: r.designScore,
          secrets: r.secrets, gates: r.conjugationGates,
        })),
      });
    }
    // Restore original state.
    state.generationProfile = savedProfile;
    state.levelSeedBase = createRunSeed();
    generateLevelsFromConfig(config);
    console.table(results.map(r => ({
      Trial: r.trial, Seed: r.seed,
      ...Object.fromEntries(r.levels.map(l => [`L${l.id}`, `${l.grade}(${l.score}) ${l.shape} [${l.uniqueBlocks}blk]`])),
    })));
    return results;
  };

  logInfo("init", "Config loaded", { tileSize: state.tileSize, biomes: Object.keys(state.biomes).length });

  // Phase 2: Load heroes + UI assets (critical for title screen).
  // Enemies, animals, birds, guards load in the background — not needed for title.
  const heroesPromise = loadHeroes().then(() => initializeHeroProgress());
  await Promise.all([heroesPromise, setupUiAssets(config)]);
  ensureEmergencyRoster();

  logInfo("init", `Loaded ${state.heroes.length} heroes`);

  // Phase 3: Generate only level 0, show title screen ASAP.
  generateFirstLevel(config);

  populateSettingsPanel();
  populatePedagogyPanel();
  renderErrorList();
  bindControls();
  applyMobileVisualDebugOffsets();

  loadLevel(0, true);
  resetRespawnTrail();
  state.ready = true;
  showTitleScreen();
  logInfo("init", "Title screen shown — starting loop");
  requestAnimationFrame(gameLoop);

  // Phase 4 (background): Load remaining entities, generate remaining levels,
  // and preload level-0 assets — all deferred so the title screen is interactive.
  const bgInit = async () => {
    await Promise.all([loadEnemies(), loadAnimals(), loadSkyBirds(), loadGuards(), spriteManifestPromise]);
    logInfo("init", `Background-loaded ${state.enemies.length} enemies, ${state.animals.length} animals`);
    generateRemainingLevels(config);
    logInfo("init", `Generated remaining levels (${state.levels.length} total)`);
    const firstBgPath = BIOME_PARALLAX_BACKGROUNDS[state.levels[0]?.biome];
    await Promise.all([
      preloadLevelAssetImages(state.levels[0]),
      preloadSelectedHeroSprites(),
      firstBgPath ? loadImage(firstBgPath).catch(() => null) : Promise.resolve(),
    ]);
    scheduleBackgroundWarmup(config);
  };
  bgInit().catch((err) => logError("init", "Background init error", { message: err?.message }));
}

// ─── Game Loop ───
function gameLoop(timestamp) {
  if (!state.lastTimestamp) {
    state.lastTimestamp = timestamp;
  }
  const delta = Math.min(0.033, (timestamp - state.lastTimestamp) / 1000);
  state.lastTimestamp = timestamp;

  if (state.ready && state.started && !state.paused && !state.gameOver) {
    update(delta);
  }
  render(timestamp / 1000);

  requestAnimationFrame(gameLoop);
}

// ─── Update ───
function update(delta) {
  state.runTime += delta;
  state.playerHitInvuln = Math.max(0, state.playerHitInvuln - delta);
  state.playerHitStun = Math.max(0, state.playerHitStun - delta);
  updateFloatingRewards(delta);
  updateHudInfo();

  if (state.boss.active) {
    updateBossMode();
    updateBossQuestionCountdown();
    if (state.message && performance.now() > state.messageUntil) {
      state.message = "";
    }
    return;
  }

  if (state.deathSequence.active) {
    updateDeathSequence(delta);
    if (state.message && performance.now() > state.messageUntil) {
      state.message = "";
    }
    return;
  }

  if (state.towerInterior.active) {
    updateTowerInterior(delta);
    if (state.message && performance.now() > state.messageUntil) {
      state.message = "";
    }
    return;
  }

  if (state.duel?.QS.active) {
    if (state.message && performance.now() > state.messageUntil) {
      state.message = "";
    }
    return;
  }

  updateRespawnTrail(delta);
  updatePlayer(delta);
  updateEnemies(delta);
  updateAnimals(delta);
  updateSkyBirds(delta);
  updateGuards(delta);
  updateFireballs(delta);
  updateBonusBlocks(delta);
  updateEnemyDrops(delta);
  updateCrumblingPlatforms(delta);
  updateMovingPlatforms(delta);
  updateConjugationGates();
  updateCamera(delta);
  updateParticles(delta);

  if (state.message && performance.now() > state.messageUntil) {
    state.message = "";
  }
}

// ─── updatePlayer ───
function updatePlayer(delta) {
  const player = state.player;
  const level = state.currentLevel;
  player.prevY = player.y;

  const movingLeft = state.controls.left;
  const movingRight = state.controls.right;
  const inHitStun = state.playerHitStun > 0;

  // ── Horizontal movement (frame-rate-independent friction) ──
  // Convert per-frame friction to time-based: friction^(1/dt) where dt≈1/60.
  // frictionPerSecond = friction^60 ≈ 0.84^60.  We use: vx *= friction^(delta*60).
  if (inHitStun) {
    player.vx *= Math.pow(0.92, delta * 60);
  } else if (movingLeft === movingRight) {
    player.vx *= Math.pow(GAME.friction, delta * 60);
  } else if (movingLeft) {
    player.vx = -GAME.moveSpeed;
    player.facing = "south-west";
  } else if (movingRight) {
    player.vx = GAME.moveSpeed;
    player.facing = "south-east";
  }

  if (Math.abs(player.vx) < 2) {
    player.vx = 0;
  }

  // ── Coyote time ──
  if (player.onGround) {
    player.coyoteTime = 0.08;
  } else {
    player.coyoteTime = Math.max(0, player.coyoteTime - delta);
  }

  // ── Persistent jump buffer ──
  // If a jump was requested, start the buffer window.
  if (state.controls.jumpBuffered) {
    state.controls.jumpBufferTime = JUMP_BUFFER_WINDOW_SECONDS;
    state.controls.jumpBuffered = false;
  }
  // Count down the buffer.
  state.controls.jumpBufferTime = Math.max(0, state.controls.jumpBufferTime - delta);

  const wantsJump = state.controls.jumpBufferTime > 0;

  // ── Tower entry ──
  if (wantsJump && tryEnterTower()) {
    state.controls.jumpBufferTime = 0;
    return;
  }

  // ── Jump execution ──
  if (!inHitStun && wantsJump && (player.onGround || player.coyoteTime > 0)) {
    player.vy = GAME.jumpVelocity;
    player.onGround = false;
    player.coyoteTime = 0;
    state.controls.jumpBufferTime = 0;
    state.controls.jumpHeld = true;
  }

  // ── Variable jump height ──
  // When the player releases jump while still ascending, cut upward velocity
  // to allow short hops. Full jump requires holding the button.
  if (!state.controls.jumpHeld && player.vy < GAME.jumpVelocity * JUMP_CUT_MULTIPLIER) {
    player.vy = GAME.jumpVelocity * JUMP_CUT_MULTIPLIER;
  }

  player.vy = Math.min(player.vy + GAME.gravity * delta, GAME.maxFallVelocity);

  player.x += player.vx * delta;
  resolveHorizontalCollisions(player, level);

  player.y += player.vy * delta;
  resolveVerticalCollisions(player, level);

  player.animTime += delta;

  collideWithEnemies();
  checkAnimalBounce();
  checkGoal();

  if (player.y > level.worldHeight + 80) {
    damagePlayer("Fell");
    if (!state.deathSequence.active) {
      respawnPlayer({ fromStart: true });
      state.respawnTrail.history = [];
      state.respawnTrail.elapsedSinceSample = 0;
    }
    return;
  }
}

function computeViewportHeight() {
  if (typeof window === "undefined") {
    return 0;
  }
  const heights = [window.visualViewport?.height, window.innerHeight]
    .map((value) => Number(value) || 0)
    .filter((value) => value > 0);
  if (!heights.length) {
    return 0;
  }
  return Math.min(...heights);
}

function computeViewportWidth() {
  if (typeof window === "undefined") {
    return 0;
  }
  const widths = [window.visualViewport?.width, window.innerWidth]
    .map((value) => Number(value) || 0)
    .filter((value) => value > 0);
  if (!widths.length) {
    return 0;
  }
  return Math.min(...widths);
}

function applyViewportCssVars() {
  if (typeof document === "undefined") {
    return;
  }
  const height = Math.round(computeViewportHeight());
  const width = Math.round(computeViewportWidth());
  if (!height) {
    return;
  }
  document.documentElement.style.setProperty("--app-height", `${height}px`);
  if (width) {
    document.documentElement.style.setProperty("--app-width", `${width}px`);
  }
  const buttonsOffset = Math.min(Math.max(Number(state.mobileButtonsOffsetY) || 0, 0), 120);
  const gameOffset = Math.min(Math.max(Number(state.mobileGameOffsetY) || 0, 0), 200);
  document.body.style.setProperty("--mobile-buttons-bottom", `${buttonsOffset}px`);
  document.body.style.setProperty("--mobile-game-area-bottom", `${gameOffset}px`);
}

function registerViewportCssVarSync() {
  applyViewportCssVars();
  window.addEventListener("resize", applyViewportCssVars, { passive: true });
  window.addEventListener("orientationchange", applyViewportCssVars, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", applyViewportCssVars, { passive: true });
    window.visualViewport.addEventListener("scroll", applyViewportCssVars, { passive: true });
  }
}

// ─── Bootstrap ───
registerViewportCssVarSync();
init().catch((error) => {
  logError("init", "Fatal init error", { message: error?.message, stack: error?.stack });
  updateHudInfo();
});
