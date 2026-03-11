// ─── Level Design System ───
// Block vocabulary, level shapes, anti-monotony rules, and quality scoring.
// This module provides the "brain" behind level generation decisions.

import { clamp, randInt } from "./utils.js";

// ─── Level Shape Definitions ───
// Each shape defines a height curve (0=ground, 1=max height) and difficulty curve.
// 10 sample points, interpolated across the level length.

const LEVEL_SHAPES = {
  mountain_shape: {
    id: "mountain_shape",
    name: "La Montagne",
    heightCurve:     [0, 0.15, 0.35, 0.6, 0.85, 1.0, 0.8, 0.5, 0.2, 0],
    difficultyCurve: [0.2, 0.3, 0.4, 0.6, 0.8, 1.0, 0.7, 0.5, 0.3, 0.15],
  },
  valley_shape: {
    id: "valley_shape",
    name: "La Vallée",
    heightCurve:     [0, -0.15, -0.35, -0.6, -0.85, -0.7, -0.4, -0.15, 0, 0],
    difficultyCurve: [0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 0.7, 0.4, 0.2],
  },
  zigzag_shape: {
    id: "zigzag_shape",
    name: "Le Zigzag",
    heightCurve:     [0, 0.45, 0.1, 0.65, 0.15, 0.8, 0.2, 0.5, 0.1, 0],
    difficultyCurve: [0.2, 0.5, 0.3, 0.7, 0.35, 0.9, 0.4, 0.6, 0.3, 0.2],
  },
  loop_shape: {
    id: "loop_shape",
    name: "La Boucle",
    heightCurve:     [0, 0.25, 0.5, 0.35, 0.1, 0.2, 0.5, 0.75, 0.45, 0.15],
    difficultyCurve: [0.2, 0.4, 0.6, 0.45, 0.3, 0.5, 0.7, 1.0, 0.6, 0.3],
  },
  fork_shape: {
    id: "fork_shape",
    name: "L'Embranchement",
    heightCurve:     [0, 0.15, 0.35, 0.4, 0.4, 0.35, 0.25, 0.1, 0, 0],
    difficultyCurve: [0.2, 0.4, 0.6, 0.8, 0.7, 0.6, 0.4, 0.3, 0.2, 0.15],
    forkPoint: 0.3,
    mergePoint: 0.7,
  },
  tower_shape: {
    id: "tower_shape",
    name: "La Tour",
    heightCurve:     [0, 0.2, 0.45, 0.65, 0.85, 1.0, 0.95, 0.7, 0.35, 0],
    difficultyCurve: [0.2, 0.4, 0.6, 0.75, 0.9, 1.0, 0.85, 0.6, 0.35, 0.15],
  },
};

// Shape assignment per level index.
const LEVEL_SHAPE_ASSIGNMENT = [
  "mountain_shape",   // Level 1: intro arc
  "zigzag_shape",     // Level 2: varied rhythm
  "valley_shape",     // Level 3: descent/ascent
  "fork_shape",       // Level 4: player choice
  "tower_shape",      // Level 5: climax
];

export function getLevelShape(levelIndex) {
  const shapeId = LEVEL_SHAPE_ASSIGNMENT[levelIndex % LEVEL_SHAPE_ASSIGNMENT.length];
  return LEVEL_SHAPES[shapeId] || LEVEL_SHAPES.mountain_shape;
}

// Interpolate a curve at a given progress (0-1).
export function sampleCurve(curve, progress) {
  const t = clamp(progress, 0, 1) * (curve.length - 1);
  const i = Math.floor(t);
  const f = t - i;
  const a = curve[Math.min(i, curve.length - 1)];
  const b = curve[Math.min(i + 1, curve.length - 1)];
  return a + (b - a) * f;
}

// ─── Block Vocabulary ───
// Each block has a build function that modifies the tile grid.

export const BLOCK_CATEGORIES = {
  traversal: ["broken_stairs", "crumbling_bridge", "controlled_descent", "canyon_crossing",
              "air_highway", "pendulum_pass", "cliff_climb", "pit_bounce"],
  conjugation: ["guardian_gate", "path_choice", "letter_bridge", "verb_race",
                "secret_conjugation", "conjugation_cascade"],
  rhythm: ["rest_zone", "sprint_corridor", "revelation", "inverted_trap",
           "rising_tension", "victory_climb"],
  exploration: ["hidden_alcove", "reward_shortcut", "underground_passage", "skyline_secret"],
};

// Difficulty ranges for blocks.
const BLOCK_DIFFICULTY = {
  rest_zone:            [0, 1],
  revelation:           [0, 1],
  inverted_trap:        [1, 3],
  sprint_corridor:      [2, 3],
  broken_stairs:        [1, 3],
  controlled_descent:   [1, 3],
  pit_bounce:           [1, 3],
  hidden_alcove:        [1, 2],
  underground_passage:  [1, 3],
  guardian_gate:        [1, 3],
  path_choice:          [1, 4],
  air_highway:          [2, 4],
  cliff_climb:          [2, 4],
  pendulum_pass:        [2, 4],
  crumbling_bridge:     [2, 4],
  skyline_secret:       [2, 4],
  reward_shortcut:      [3, 5],
  canyon_crossing:      [3, 5],
  verb_race:            [3, 5],
  letter_bridge:        [2, 5],
  secret_conjugation:   [2, 5],
  rising_tension:       [3, 5],
  victory_climb:        [2, 4],
  conjugation_cascade:  [3, 5],
};

// Block width requirements (in tiles).
const BLOCK_WIDTHS = {
  rest_zone:            [8, 14],
  revelation:           [10, 16],
  inverted_trap:        [8, 14],
  sprint_corridor:      [10, 16],
  broken_stairs:        [10, 18],
  controlled_descent:   [8, 16],
  pit_bounce:           [6, 10],
  hidden_alcove:        [4, 8],
  underground_passage:  [10, 18],
  guardian_gate:        [8, 12],
  path_choice:          [14, 22],
  air_highway:          [16, 28],
  cliff_climb:          [8, 14],
  pendulum_pass:        [12, 18],
  crumbling_bridge:     [12, 20],
  skyline_secret:       [6, 10],
  reward_shortcut:      [8, 14],
  canyon_crossing:      [14, 22],
  verb_race:            [16, 24],
  letter_bridge:        [12, 20],
  secret_conjugation:   [6, 10],
  rising_tension:       [14, 22],
  victory_climb:        [10, 16],
  conjugation_cascade:  [18, 26],
};

// Emotion tags for blocks.
export const BLOCK_EMOTIONS = {
  rest_zone: "serenity",
  revelation: "awe",
  sprint_corridor: "adrenaline",
  broken_stairs: "engagement",
  controlled_descent: "precision",
  crumbling_bridge: "tension",
  canyon_crossing: "tension_max",
  air_highway: "speed",
  pendulum_pass: "rhythm",
  cliff_climb: "verticality",
  pit_bounce: "surprise",
  guardian_gate: "intellectual_challenge",
  path_choice: "decision",
  letter_bridge: "tension_and_thought",
  verb_race: "adrenaline",
  secret_conjugation: "exploration",
  conjugation_cascade: "flow",
  inverted_trap: "surprise",
  rising_tension: "anxiety",
  victory_climb: "pride",
  hidden_alcove: "curiosity",
  reward_shortcut: "risk_reward",
  underground_passage: "mystery",
  skyline_secret: "discovery",
};

// ─── Block Sequence Generation ───
// Picks a sequence of blocks for a level based on shape, difficulty, and anti-monotony.

export function generateBlockSequence({ levelIndex, segmentCount, rand, generationProfile }) {
  const shape = getLevelShape(levelIndex);
  const blocks = [];
  const profileDiffMult = generationProfile === "easy" ? 0.6 : generationProfile === "chaotic" ? 1.3 : 1.0;

  // Mandatory points of interest to inject.
  const mandatoryPOIs = {
    surprise: false,    // 1 inverted_trap or pit_bounce
    secret: false,      // 1 hidden_alcove or skyline_secret
    choice: false,      // 1 path_choice or reward_shortcut
    tension: false,     // 1 rising_tension or crumbling_bridge or canyon_crossing
    rest: false,        // 1 rest_zone (placed after tension)
    conjugation: false, // 1 guardian_gate, letter_bridge, or path_choice
  };

  // Precompute segment difficulty targets.
  const segDifficulties = [];
  for (let i = 0; i < segmentCount; i++) {
    const progress = i / Math.max(1, segmentCount - 1);
    const raw = sampleCurve(shape.difficultyCurve, progress) * profileDiffMult;
    segDifficulties.push(clamp(raw * 5, 0, 5)); // 0-5 scale
  }

  // First and last segments are always intro/outro.
  blocks.push("rest_zone");  // Segment 0: gentle start.

  let consecutiveSameCategory = 0;
  let lastCategory = "rhythm";
  let lastBlockId = "rest_zone";
  let tensionCount = 0;

  for (let i = 1; i < segmentCount - 1; i++) {
    const progress = i / Math.max(1, segmentCount - 1);
    const difficulty = segDifficulties[i];
    const heightValue = sampleCurve(shape.heightCurve, progress);

    // Determine candidate blocks.
    let candidates = getAllBlockIds().filter(id => {
      const [minD, maxD] = BLOCK_DIFFICULTY[id] || [0, 5];
      return difficulty >= minD - 0.5 && difficulty <= maxD + 0.5;
    });

    // Anti-monotony: no more than 2 consecutive same category.
    if (consecutiveSameCategory >= 2) {
      candidates = candidates.filter(id => getCategoryForBlock(id) !== lastCategory);
    }

    // No immediate repeat of same block.
    candidates = candidates.filter(id => id !== lastBlockId);

    // Inject mandatory POIs at good positions.
    const injected = tryInjectMandatoryPOI(mandatoryPOIs, progress, difficulty, candidates, heightValue, tensionCount);
    if (injected) {
      candidates = [injected];
    }

    // Height-based preferences.
    if (heightValue > 0.5) {
      // High sections favor ascending/elevated blocks.
      candidates = boostCandidates(candidates, ["cliff_climb", "air_highway", "victory_climb", "broken_stairs", "skyline_secret"]);
    } else if (heightValue < -0.3) {
      // Low sections favor descending/underground.
      candidates = boostCandidates(candidates, ["controlled_descent", "underground_passage", "pit_bounce"]);
    }

    // Require rest after tension.
    if (tensionCount >= 2) {
      candidates = ["rest_zone"];
      tensionCount = 0;
    }

    // Ensure we have at least one option.
    if (!candidates.length) {
      candidates = ["rest_zone"];
    }

    const picked = candidates[randInt(rand, 0, candidates.length - 1)];
    blocks.push(picked);

    // Track anti-monotony state.
    const pickedCategory = getCategoryForBlock(picked);
    if (pickedCategory === lastCategory) {
      consecutiveSameCategory++;
    } else {
      consecutiveSameCategory = 1;
    }
    lastCategory = pickedCategory;
    lastBlockId = picked;

    // Track tension for rest enforcement.
    if (isTensionBlock(picked)) {
      tensionCount++;
    } else if (picked === "rest_zone" || picked === "revelation") {
      tensionCount = 0;
    }

    // Mark fulfilled POIs.
    markPOI(mandatoryPOIs, picked);
  }

  // Final segment: victory climb or rest zone.
  blocks.push(segDifficulties[segmentCount - 1] > 2 ? "victory_climb" : "rest_zone");

  // Ensure all mandatory POIs are met by force-inserting if needed.
  ensureAllPOIs(blocks, mandatoryPOIs, rand);

  return blocks;
}

function getAllBlockIds() {
  const all = [];
  for (const cat of Object.values(BLOCK_CATEGORIES)) {
    all.push(...cat);
  }
  return all;
}

function getCategoryForBlock(blockId) {
  for (const [cat, ids] of Object.entries(BLOCK_CATEGORIES)) {
    if (ids.includes(blockId)) return cat;
  }
  return "traversal";
}

function isTensionBlock(blockId) {
  return ["rising_tension", "crumbling_bridge", "canyon_crossing", "sprint_corridor",
          "verb_race", "conjugation_cascade"].includes(blockId);
}

function boostCandidates(candidates, preferred) {
  const boosted = candidates.filter(id => preferred.includes(id));
  // Return boosted if available, otherwise original.
  return boosted.length >= 2 ? boosted : candidates;
}

function tryInjectMandatoryPOI(pois, progress, difficulty, candidates, heightValue, tensionCount) {
  // Surprise: inject around 30-50% of level.
  if (!pois.surprise && progress > 0.25 && progress < 0.55) {
    const surpriseBlocks = ["inverted_trap", "pit_bounce"].filter(id => candidates.includes(id));
    if (surpriseBlocks.length) {
      return surpriseBlocks[0];
    }
  }
  // Secret: inject around 40-70%.
  if (!pois.secret && progress > 0.35 && progress < 0.75) {
    const secretBlocks = ["hidden_alcove", "skyline_secret", "underground_passage"].filter(id => candidates.includes(id));
    if (secretBlocks.length) {
      return secretBlocks[0];
    }
  }
  // Choice: inject around 20-60%.
  if (!pois.choice && progress > 0.15 && progress < 0.65) {
    const choiceBlocks = ["path_choice", "reward_shortcut"].filter(id => candidates.includes(id));
    if (choiceBlocks.length) {
      return choiceBlocks[0];
    }
  }
  // Tension: inject around 50-80%.
  if (!pois.tension && progress > 0.45 && progress < 0.85) {
    const tensionBlocks = ["rising_tension", "crumbling_bridge", "canyon_crossing"].filter(id => candidates.includes(id));
    if (tensionBlocks.length) {
      return tensionBlocks[0];
    }
  }
  // Conjugation: inject around 25-75%.
  if (!pois.conjugation && progress > 0.2 && progress < 0.8) {
    const conjBlocks = ["guardian_gate", "letter_bridge", "path_choice"].filter(id => candidates.includes(id));
    if (conjBlocks.length) {
      return conjBlocks[0];
    }
  }
  return null;
}

function markPOI(pois, blockId) {
  if (["inverted_trap", "pit_bounce"].includes(blockId)) pois.surprise = true;
  if (["hidden_alcove", "skyline_secret", "underground_passage"].includes(blockId)) pois.secret = true;
  if (["path_choice", "reward_shortcut"].includes(blockId)) pois.choice = true;
  if (["rising_tension", "crumbling_bridge", "canyon_crossing"].includes(blockId)) pois.tension = true;
  if (["rest_zone", "revelation"].includes(blockId)) pois.rest = true;
  if (["guardian_gate", "letter_bridge", "path_choice", "verb_race",
       "secret_conjugation", "conjugation_cascade"].includes(blockId)) pois.conjugation = true;
}

function ensureAllPOIs(blocks, pois, rand) {
  // If a POI was missed, force-replace a rest_zone or generic block.
  const replaceable = [];
  for (let i = 2; i < blocks.length - 2; i++) {
    if (blocks[i] === "rest_zone" || blocks[i] === "revelation") {
      replaceable.push(i);
    }
  }
  if (!replaceable.length) {
    // Use any non-boundary index.
    for (let i = 2; i < blocks.length - 2; i++) {
      replaceable.push(i);
    }
  }

  const inject = (blockId) => {
    if (!replaceable.length) return;
    const idx = replaceable.splice(randInt(rand, 0, replaceable.length - 1), 1)[0];
    blocks[idx] = blockId;
    markPOI(pois, blockId);
  };

  if (!pois.conjugation) inject("guardian_gate");
  if (!pois.surprise) inject("inverted_trap");
  if (!pois.secret) inject("hidden_alcove");
  if (!pois.tension) inject("rising_tension");
}

// ─── Block Width Allocation ───

export function getBlockWidth(blockId, availableWidth, rand) {
  const [minW, maxW] = BLOCK_WIDTHS[blockId] || [8, 14];
  return clamp(randInt(rand, minW, Math.min(maxW, availableWidth)), minW, availableWidth);
}

// ─── Quality Scoring (Phase 5) ───

export function scoreLevelDesign(level, blockSequence) {
  const breakdown = {};

  // 1. Structural variety (0-20): how many distinct block types?
  const uniqueBlocks = new Set(blockSequence || []);
  const varietyRatio = uniqueBlocks.size / Math.max(1, (blockSequence || []).length);
  const blockTypeCount = uniqueBlocks.size;
  if (blockTypeCount >= 7) breakdown.structuralVariety = 20;
  else if (blockTypeCount >= 5) breakdown.structuralVariety = 16;
  else if (blockTypeCount >= 4) breakdown.structuralVariety = 12;
  else breakdown.structuralVariety = Math.max(4, blockTypeCount * 3);

  // 2. Rhythm (0-20): tension/rest alternation.
  let oscillations = 0;
  let wasTension = false;
  for (const block of blockSequence || []) {
    const isTension = isTensionBlock(block);
    const isRest = block === "rest_zone" || block === "revelation";
    if (wasTension && isRest) oscillations++;
    if (isTension) wasTension = true;
    if (isRest) wasTension = false;
  }
  breakdown.rhythm = clamp(oscillations * 7, 0, 20);

  // 3. Exploration (0-20): off-path content.
  const explorationBlocks = (blockSequence || []).filter(id =>
    BLOCK_CATEGORIES.exploration.includes(id) ||
    ["reward_shortcut", "underground_passage", "skyline_secret", "hidden_alcove", "secret_conjugation"].includes(id)
  );
  const explorationPercent = (explorationBlocks.length / Math.max(1, (blockSequence || []).length)) * 100;
  if (explorationPercent >= 25) breakdown.exploration = 20;
  else if (explorationPercent >= 15) breakdown.exploration = 15;
  else if (explorationPercent >= 8) breakdown.exploration = 10;
  else breakdown.exploration = 5;

  // 4. Pedagogical integration (0-20): conjugation blocks.
  const conjBlocks = (blockSequence || []).filter(id => BLOCK_CATEGORIES.conjugation.includes(id));
  if (conjBlocks.length >= 3) breakdown.pedagogicalIntegration = 20;
  else if (conjBlocks.length >= 2) breakdown.pedagogicalIntegration = 15;
  else if (conjBlocks.length >= 1) breakdown.pedagogicalIntegration = 10;
  else breakdown.pedagogicalIntegration = 0;

  // 5. Surprise (0-20): unexpected elements.
  const surpriseBlocks = (blockSequence || []).filter(id =>
    ["inverted_trap", "pit_bounce", "hidden_alcove", "skyline_secret", "secret_conjugation"].includes(id)
  );
  if (surpriseBlocks.length >= 3) breakdown.surprise = 20;
  else if (surpriseBlocks.length >= 2) breakdown.surprise = 15;
  else if (surpriseBlocks.length >= 1) breakdown.surprise = 10;
  else breakdown.surprise = 0;

  const overall = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { overall, breakdown, pass: overall >= 65 };
}

// ─── Particle Definitions by Theme ───

export const THEME_PARTICLES = {
  forest: {
    type: "leaves", color: "#4caf50", count: 8, speed: 20,
    direction: "falling", sizeRange: [3, 6], opacity: 0.6,
  },
  desert: {
    type: "sand", color: "#d4a853", count: 12, speed: 35,
    direction: "wind_horizontal", sizeRange: [2, 4], opacity: 0.4,
  },
  mountain: {
    type: "dust", color: "#9e9e9e", count: 5, speed: 15,
    direction: "updraft", sizeRange: [2, 5], opacity: 0.3,
  },
  snow: {
    type: "snowflakes", color: "#ffffff", count: 15, speed: 25,
    direction: "falling_diagonal", sizeRange: [2, 5], opacity: 0.7,
  },
  desolation: {
    type: "embers", color: "#ff5722", count: 10, speed: 30,
    direction: "rising", sizeRange: [2, 4], opacity: 0.5,
  },
  castle: {
    type: "dust", color: "#888888", count: 4, speed: 10,
    direction: "falling", sizeRange: [1, 3], opacity: 0.3,
  },
  wood: {
    type: "leaves", color: "#8d6e3f", count: 6, speed: 18,
    direction: "falling", sizeRange: [3, 5], opacity: 0.5,
  },
};

// ─── Exports for block builders ───
export { BLOCK_DIFFICULTY, BLOCK_WIDTHS, LEVEL_SHAPES };
