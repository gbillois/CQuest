// ─── Imports ───
import { GAME, WORLD_SCALE, PRONOUN_LABEL, ERROR_DB_STORAGE_KEY } from "./constants.js";
import { createRunSeed } from "./utils.js";
import { state, ui } from "./state.js";
import {
  loadConfig, setupUiAssets, buildBiomeIndex, loadHeroes, loadEnemies,
  ensureEmergencyRoster, enforceMinimumJumpHeight, preloadLevelAssetImages,
  preloadSelectedHeroSprites, scheduleBackgroundWarmup, setUpdateHudInfo,
} from "./asset-loader.js";
import { generateLevelsFromConfig } from "./level-generator.js";
import { loadSpriteManifest } from "./sprite-manifest.js";
import { setTriggerBonusBlock, resolveHorizontalCollisions, resolveVerticalCollisions } from "./physics.js";
import {
  updateEnemies, updateFireballs, updateBonusBlocks, updateEnemyDrops,
  updateDeathSequence, updateTowerInterior, updateBossMode,
  updateBossQuestionCountdown, triggerBonusBlock, hitPlayer, defeatEnemy,
  startBossMode, getBossPrepLevelIndex, resetBossState, setEntityHooks,
  tryEnterTower, collideWithEnemies, checkGoal, damagePlayer, respawnPlayer,
  castHeroProjectile,
} from "./entities.js";
import { render, updateCamera, setRendererHooks, setWorldZoom, syncCameraToCurrentZoom, getWorldZoom } from "./renderer.js";
import {
  populateSettingsPanel, populatePedagogyPanel, renderErrorList,
  bindControls, applyMobileVisualDebugOffsets, loadLevel, showTitleScreen,
  showMessage, showGameOverScreen, updateHudInfo, syncWorldZoomUi,
  startGameFromMenu, buildQuestionUiHooks, exposeConjugationApi,
  setUiHooks, renderHeroShop,
} from "./ui.js";
import { loadPersistentGold, normalizeWorldZoom, loadWorldZoom, saveWorldZoom, initializeHeroProgress, setRenderHeroShop } from "./persistence.js";
import { getVerbSource, getDefaultActiveGroups, createConjugationDuelSystem } from "./conjugation.js";

// ─── Wire late-binding hooks ───
setUpdateHudInfo(updateHudInfo);
setTriggerBonusBlock(triggerBonusBlock);
setEntityHooks({
  openQuestion: (enemy) => state.duel ? state.duel.openQuestion(enemy) : false,
  showMessage,
  loadLevel,
  showGameOverScreen,
});
setRendererHooks({
  syncWorldZoomUi,
  saveWorldZoom,
});
setUiHooks({
  generateLevelsFromConfig,
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

// ─── Init ───
async function init() {
  const config = await loadConfig();
  state.config = config;
  state.tileSize = (config.grid?.tile_size || 32) * WORLD_SCALE;
  enforceMinimumJumpHeight();

  // Load sprite manifest for fast bounding-box lookups (replaces runtime pixel scanning).
  await loadSpriteManifest();

  await setupUiAssets(config);
  buildBiomeIndex(config);
  state.persistentGold = loadPersistentGold();
  state.worldZoom = normalizeWorldZoom(ui.worldZoomSlider?.value || loadWorldZoom());
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
  exposeConjugationApi();
  await loadHeroes();
  initializeHeroProgress();
  await loadEnemies();
  ensureEmergencyRoster();

  generateLevelsFromConfig(config);
  await preloadLevelAssetImages(state.levels[0]);
  await preloadSelectedHeroSprites();
  populateSettingsPanel();
  populatePedagogyPanel();
  renderErrorList();
  bindControls();
  applyMobileVisualDebugOffsets();

  loadLevel(0, true);
  state.ready = true;
  showTitleScreen();
  scheduleBackgroundWarmup(config);
  requestAnimationFrame(gameLoop);
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

  updatePlayer(delta);
  updateEnemies(delta);
  updateFireballs(delta);
  updateBonusBlocks(delta);
  updateEnemyDrops(delta);
  updateCamera();

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

  if (inHitStun) {
    player.vx *= 0.92;
  } else if (movingLeft === movingRight) {
    player.vx *= GAME.friction;
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

  if (player.onGround) {
    player.coyoteTime = 0.08;
  } else {
    player.coyoteTime = Math.max(0, player.coyoteTime - delta);
  }

  if (state.controls.jumpBuffered && tryEnterTower()) {
    state.controls.jumpBuffered = false;
    return;
  }

  if (!inHitStun && state.controls.jumpBuffered && (player.onGround || player.coyoteTime > 0)) {
    player.vy = GAME.jumpVelocity;
    player.onGround = false;
    player.coyoteTime = 0;
  }
  state.controls.jumpBuffered = false;

  player.vy = Math.min(player.vy + GAME.gravity * delta, GAME.maxFallVelocity);

  player.x += player.vx * delta;
  resolveHorizontalCollisions(player, level);

  player.y += player.vy * delta;
  resolveVerticalCollisions(player, level);

  player.animTime += delta;

  collideWithEnemies();
  checkGoal();

  if (player.y > level.worldHeight + 80) {
    damagePlayer("Fell");
    if (!state.deathSequence.active) {
      respawnPlayer();
    }
    return;
  }
}

// ─── Bootstrap ───
init().catch((error) => {
  console.error(error);
  updateHudInfo();
});
