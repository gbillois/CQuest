import { TENSE_KEYS, TENSE_LABEL } from "./constants.js";
import { delay, shuffle } from "./utils.js";

/**
 * Validate that a verb source object has the expected structure.
 * Returns true only if every group has a label (string) and a list (object)
 * whose entries contain at least an `inf` string and arrays for tense keys.
 */
function isValidVerbSource(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return false;
  }
  for (const group of Object.values(obj)) {
    if (!group || typeof group !== "object") return false;
    if (typeof group.label !== "string") return false;
    if (!group.list || typeof group.list !== "object") return false;
    for (const verb of Object.values(group.list)) {
      if (!verb || typeof verb !== "object") return false;
      if (typeof verb.inf !== "string") return false;
      for (const tense of TENSE_KEYS) {
        if (verb[tense] !== undefined && !Array.isArray(verb[tense])) return false;
      }
    }
  }
  return true;
}

export function getVerbSource() {
  if (window.VERBS && typeof window.VERBS === "object" && isValidVerbSource(window.VERBS)) {
    return window.VERBS;
  }
  return {
    g1: {
      label: "1er groupe",
      list: {
        aimer: {
          inf: "aimer",
          pr: ["aime", "aimes", "aime", "aimons", "aimez", "aiment"],
          pc: ["ai aimé", "as aimé", "a aimé", "avons aimé", "avez aimé", "ont aimé"],
          im: ["aimais", "aimais", "aimait", "aimions", "aimiez", "aimaient"],
          fu: ["aimerai", "aimeras", "aimera", "aimerons", "aimerez", "aimeront"],
          co: ["aimerais", "aimerais", "aimerait", "aimerions", "aimeriez", "aimeraient"],
          pp: "aimé",
        },
        jouer: {
          inf: "jouer",
          pr: ["joue", "joues", "joue", "jouons", "jouez", "jouent"],
          pc: ["ai joué", "as joué", "a joué", "avons joué", "avez joué", "ont joué"],
          im: ["jouais", "jouais", "jouait", "jouions", "jouiez", "jouaient"],
          fu: ["jouerai", "joueras", "jouera", "jouerons", "jouerez", "joueront"],
          co: ["jouerais", "jouerais", "jouerait", "jouerions", "joueriez", "joueraient"],
          pp: "joué",
        },
      },
    },
    g2: {
      label: "2ème groupe",
      list: {
        finir: {
          inf: "finir",
          pr: ["finis", "finis", "finit", "finissons", "finissez", "finissent"],
          pc: ["ai fini", "as fini", "a fini", "avons fini", "avez fini", "ont fini"],
          im: ["finissais", "finissais", "finissait", "finissions", "finissiez", "finissaient"],
          fu: ["finirai", "finiras", "finira", "finirons", "finirez", "finiront"],
          co: ["finirais", "finirais", "finirait", "finirions", "finiriez", "finiraient"],
          pp: "fini",
        },
      },
    },
    g3: {
      label: "3ème groupe",
      list: {
        prendre: {
          inf: "prendre",
          pr: ["prends", "prends", "prend", "prenons", "prenez", "prennent"],
          pc: ["ai pris", "as pris", "a pris", "avons pris", "avez pris", "ont pris"],
          im: ["prenais", "prenais", "prenait", "prenions", "preniez", "prenaient"],
          fu: ["prendrai", "prendras", "prendra", "prendrons", "prendrez", "prendront"],
          co: ["prendrais", "prendrais", "prendrait", "prendrions", "prendriez", "prendraient"],
          pp: "pris",
        },
      },
    },
    irr1: {
      label: "Verbes irréguliers — Groupe 1",
      list: {
        etre: {
          inf: "être",
          pr: ["suis", "es", "est", "sommes", "êtes", "sont"],
          pc: ["ai été", "as été", "a été", "avons été", "avez été", "ont été"],
          im: ["étais", "étais", "était", "étions", "étiez", "étaient"],
          fu: ["serai", "seras", "sera", "serons", "serez", "seront"],
          co: ["serais", "serais", "serait", "serions", "seriez", "seraient"],
          pp: "été",
        },
        avoir: {
          inf: "avoir",
          pr: ["ai", "as", "a", "avons", "avez", "ont"],
          pc: ["ai eu", "as eu", "a eu", "avons eu", "avez eu", "ont eu"],
          im: ["avais", "avais", "avait", "avions", "aviez", "avaient"],
          fu: ["aurai", "auras", "aura", "aurons", "aurez", "auront"],
          co: ["aurais", "aurais", "aurait", "aurions", "auriez", "auraient"],
          pp: "eu",
        },
        aller: {
          inf: "aller",
          pr: ["vais", "vas", "va", "allons", "allez", "vont"],
          pc: ["suis allé", "es allé", "est allé", "sommes allés", "êtes allés", "sont allés"],
          im: ["allais", "allais", "allait", "allions", "alliez", "allaient"],
          fu: ["irai", "iras", "ira", "irons", "irez", "iront"],
          co: ["irais", "irais", "irait", "irions", "iriez", "iraient"],
          pp: "allé",
        },
        faire: {
          inf: "faire",
          pr: ["fais", "fais", "fait", "faisons", "faites", "font"],
          pc: ["ai fait", "as fait", "a fait", "avons fait", "avez fait", "ont fait"],
          im: ["faisais", "faisais", "faisait", "faisions", "faisiez", "faisaient"],
          fu: ["ferai", "feras", "fera", "ferons", "ferez", "feront"],
          co: ["ferais", "ferais", "ferait", "ferions", "feriez", "feraient"],
          pp: "fait",
        },
      },
    },
    irr2: {
      label: "Verbes irréguliers — Groupe 2",
      list: {
        dire: {
          inf: "dire",
          pr: ["dis", "dis", "dit", "disons", "dites", "disent"],
          pc: ["ai dit", "as dit", "a dit", "avons dit", "avez dit", "ont dit"],
          im: ["disais", "disais", "disait", "disions", "disiez", "disaient"],
          fu: ["dirai", "diras", "dira", "dirons", "direz", "diront"],
          co: ["dirais", "dirais", "dirait", "dirions", "diriez", "diraient"],
          pp: "dit",
        },
        venir: {
          inf: "venir",
          pr: ["viens", "viens", "vient", "venons", "venez", "viennent"],
          pc: ["suis venu", "es venu", "est venu", "sommes venus", "êtes venus", "sont venus"],
          im: ["venais", "venais", "venait", "venions", "veniez", "venaient"],
          fu: ["viendrai", "viendras", "viendra", "viendrons", "viendrez", "viendront"],
          co: ["viendrais", "viendrais", "viendrait", "viendrions", "viendriez", "viendraient"],
          pp: "venu",
        },
        pouvoir: {
          inf: "pouvoir",
          pr: ["peux", "peux", "peut", "pouvons", "pouvez", "peuvent"],
          pc: ["ai pu", "as pu", "a pu", "avons pu", "avez pu", "ont pu"],
          im: ["pouvais", "pouvais", "pouvait", "pouvions", "pouviez", "pouvaient"],
          fu: ["pourrai", "pourras", "pourra", "pourrons", "pourrez", "pourront"],
          co: ["pourrais", "pourrais", "pourrait", "pourrions", "pourriez", "pourraient"],
          pp: "pu",
        },
        vouloir: {
          inf: "vouloir",
          pr: ["veux", "veux", "veut", "voulons", "voulez", "veulent"],
          pc: ["ai voulu", "as voulu", "a voulu", "avons voulu", "avez voulu", "ont voulu"],
          im: ["voulais", "voulais", "voulait", "voulions", "vouliez", "voulaient"],
          fu: ["voudrai", "voudras", "voudra", "voudrons", "voudrez", "voudront"],
          co: ["voudrais", "voudrais", "voudrait", "voudrions", "voudriez", "voudraient"],
          pp: "voulu",
        },
        prendre: {
          inf: "prendre",
          pr: ["prends", "prends", "prend", "prenons", "prenez", "prennent"],
          pc: ["ai pris", "as pris", "a pris", "avons pris", "avez pris", "ont pris"],
          im: ["prenais", "prenais", "prenait", "prenions", "preniez", "prenaient"],
          fu: ["prendrai", "prendras", "prendra", "prendrons", "prendrez", "prendront"],
          co: ["prendrais", "prendrais", "prendrait", "prendrions", "prendriez", "prendraient"],
          pp: "pris",
        },
      },
    },
    irr3: {
      label: "Verbes irréguliers — Groupe 3",
      list: {
        savoir: {
          inf: "savoir",
          pr: ["sais", "sais", "sait", "savons", "savez", "savent"],
          pc: ["ai su", "as su", "a su", "avons su", "avez su", "ont su"],
          im: ["savais", "savais", "savait", "savions", "saviez", "savaient"],
          fu: ["saurai", "sauras", "saura", "saurons", "saurez", "sauront"],
          co: ["saurais", "saurais", "saurait", "saurions", "sauriez", "sauraient"],
          pp: "su",
        },
      },
    },
  };
}

export function getDefaultActiveGroups() {
  return Object.keys(getVerbSource() || {});
}

export function createConjugationDuelSystem({ verbs, pronouns, storageKey, settingsGetter, uiHooks, gameplayHooks }) {
  const QS = { active: false, enemy: null, q: null, mode: "enemy", onCorrect: null, onWrong: null, uiMeta: null, resolving: false };
  const QK = { selectedBtn: null };
  let selectedIndex = -1;
  let errorDB = loadErrorDB(storageKey);

  function frenchSound(word) {
    let s = String(word || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    s = s.replace(/[^a-zA-Z§]/g, "");
    s = s.replace(/(aient|ais|ait)$/i, "§E");
    s = s.replace(/ions$/i, "§ION");
    s = s.replace(/iez$/i, "§IE");
    s = s.replace(/(rons|ront)$/i, "§RON");
    s = s.replace(/(rez|rai)$/i, "§RE");
    s = s.replace(/(ras|ra)$/i, "§RA");
    s = s.replace(/ons$/i, "§ON");
    s = s.replace(/ez$/i, "§EZ");
    if (s.length > 4) {
      s = s.replace(/ent$/i, "");
    }
    s = s.replace(/es$/i, "");
    s = s.replace(/e$/i, "");
    s = s.replace(/[stxd]$/i, "");
    return s;
  }

  function getVerbDef(vd) {
    return verbs?.[vd?.gKey]?.list?.[vd?.vKey] || null;
  }

  function makeQuestion(vd) {
    const verbDef = getVerbDef(vd);
    if (!verbDef || !Array.isArray(verbDef[vd.tense])) {
      return null;
    }
    const correct = String(verbDef[vd.tense][vd.pronIdx] || "").trim();
    const correctSound = frenchSound(correct);
    const seen = new Set([correct.toLowerCase()]);
    const allForms = [];

    for (const t of TENSE_KEYS) {
      const arr = verbDef[t];
      if (!Array.isArray(arr)) {
        continue;
      }
      for (let p = 0; p < 6; p += 1) {
        const value = String(arr[p] || "").trim();
        if (!value) {
          continue;
        }
        const k = value.toLowerCase();
        if (seen.has(k)) {
          continue;
        }
        seen.add(k);
        allForms.push({ value, tense: t, pronIdx: p, sound: frenchSound(value) });
      }
    }

    const homophones = allForms.filter((c) => c.sound === correctSound);
    const diffSounds = allForms.filter((c) => c.sound !== correctSound);
    const distractors = [];
    const addCandidate = (cand) => {
      if (!cand || distractors.length >= 3) {
        return;
      }
      if (!distractors.includes(cand.value) && cand.value !== correct) {
        distractors.push(cand.value);
      }
    };

    addCandidate(homophones[0]);
    const prioritizedDiff = diffSounds
      .slice()
      .sort((a, b) => {
        const aOther = a.tense !== vd.tense ? 0 : 1;
        const bOther = b.tense !== vd.tense ? 0 : 1;
        if (aOther !== bOther) {
          return aOther - bOther;
        }
        return a.sound.localeCompare(b.sound);
      });
    const usedSounds = new Set();
    for (const cand of prioritizedDiff) {
      if (distractors.length >= 3) {
        break;
      }
      if (usedSounds.has(cand.sound)) {
        continue;
      }
      addCandidate(cand);
      usedSounds.add(cand.sound);
    }
    for (const cand of [...prioritizedDiff, ...homophones]) {
      if (distractors.length >= 3) {
        break;
      }
      addCandidate(cand);
    }
    const pp = String(verbDef.pp || "").trim();
    if (distractors.length < 3 && pp && pp.toLowerCase() !== correct.toLowerCase() && !distractors.includes(pp)) {
      distractors.push(pp);
    }
    if (distractors.length < 3) {
      const fallbackPool = [];
      for (const g of Object.values(verbs || {})) {
        for (const v of Object.values(g.list || {})) {
          for (const t of TENSE_KEYS) {
            const arr = v[t];
            if (Array.isArray(arr)) {
              fallbackPool.push(...arr);
            }
          }
          if (v.pp) {
            fallbackPool.push(v.pp);
          }
        }
      }
      for (const candidate of fallbackPool) {
        const value = String(candidate || "").trim();
        if (!value || value === correct || distractors.includes(value)) {
          continue;
        }
        distractors.push(value);
        if (distractors.length >= 3) {
          break;
        }
      }
    }

    const options = shuffle([correct, ...distractors.slice(0, 3)]);
    return {
      gKey: vd.gKey,
      vKey: vd.vKey,
      tense: vd.tense,
      tenseLabel: TENSE_LABEL[vd.tense] || vd.tense,
      pronIdx: vd.pronIdx,
      correct,
      options,
    };
  }

  function loadErrorDB(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      // Validate: each key should be a pipe-delimited verb identifier,
      // each value a non-negative integer count.
      const validated = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof k !== "string" || k.length > 128) continue;
        const count = Number(v);
        if (Number.isFinite(count) && count > 0) {
          validated[k] = Math.floor(count);
        }
      }
      return validated;
    } catch {
      return {};
    }
  }

  function saveErrorDB() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(errorDB));
    } catch {
      // Ignore persistence errors.
    }
  }

  function recordError(q) {
    if (!q) return;
    const key = `${q.gKey}|${q.vKey}|${q.tense}|${q.pronIdx}`;
    errorDB[key] = (errorDB[key] || 0) + 1;
    saveErrorDB();
    uiHooks.onErrorUpdate?.();
  }

  function resetErrors() {
    errorDB = {};
    saveErrorDB();
    uiHooks.onErrorUpdate?.();
  }

  function settings() {
    const s = settingsGetter?.() || {};
    return {
      activeGroups: s.activeGroups?.length ? s.activeGroups : Object.keys(verbs || {}),
      activeTenses: s.activeTenses?.length ? s.activeTenses : TENSE_KEYS.slice(),
    };
  }

  function getTopErrors(n = 10) {
    const { activeGroups, activeTenses } = settings();
    const out = [];
    for (const [key, count] of Object.entries(errorDB)) {
      const [gKey, vKey, tense, pronIdxStr] = key.split("|");
      const pronIdx = Number(pronIdxStr);
      if (!activeGroups.includes(gKey) || !activeTenses.includes(tense)) {
        continue;
      }
      const verbDef = verbs?.[gKey]?.list?.[vKey];
      const expected = verbDef?.[tense]?.[pronIdx];
      if (!verbDef || !expected) {
        continue;
      }
      out.push({
        key,
        count,
        gKey,
        vKey,
        tense,
        pronIdx,
        expected,
        infinitive: verbDef.inf || vKey,
      });
    }
    out.sort((a, b) => b.count - a.count);
    return out.slice(0, n);
  }

  function renderErrorList(container, n = 10) {
    if (!container) {
      return;
    }
    const top = getTopErrors(n);
    container.textContent = "";
    if (!top.length) {
      const row = document.createElement("div");
      row.className = "error-row";
      row.textContent = "Aucune erreur enregistrée.";
      container.appendChild(row);
      return;
    }
    top.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "error-row";
      const strong = document.createElement("strong");
      strong.textContent = `${pronouns[entry.pronIdx]} + ${entry.infinitive}`;
      row.appendChild(strong);
      row.appendChild(document.createElement("br"));
      const tenseLabel = TENSE_LABEL[entry.tense] || entry.tense;
      row.appendChild(document.createTextNode(`${tenseLabel}: `));
      const em = document.createElement("em");
      em.textContent = entry.expected;
      row.appendChild(em);
      row.appendChild(document.createTextNode(` — ${entry.count}x`));
      container.appendChild(row);
    });
  }

  function buildCandidatePool() {
    const { activeGroups, activeTenses } = settings();
    const byVerb = new Map();
    for (const gKey of activeGroups) {
      const list = verbs?.[gKey]?.list || {};
      for (const [vKey, verbDef] of Object.entries(list)) {
        const key = vKey;
        if (!byVerb.has(key)) {
          byVerb.set(key, []);
        }
        for (const tense of activeTenses) {
          const arr = verbDef?.[tense];
          if (!Array.isArray(arr) || arr.length < 6) continue;
          for (let pronIdx = 0; pronIdx < 6; pronIdx += 1) {
            if (!arr[pronIdx]) continue;
            byVerb.get(key).push({ gKey, vKey, tense, pronIdx });
          }
        }
      }
    }
    return [...byVerb.values()].flat();
  }

  function randomVerbData() {
    const pool = buildCandidatePool();
    if (!pool.length) {
      return { gKey: "g1", vKey: "aimer", tense: "pr", pronIdx: 0 };
    }

    const top = getTopErrors(200);
    const weightedReview = top
      .map((e) => ({ ...e, weight: Math.max(1, e.count) }))
      .filter((e) => pool.some((p) => p.gKey === e.gKey && p.vKey === e.vKey && p.tense === e.tense && p.pronIdx === e.pronIdx));
    if (weightedReview.length && Math.random() < 0.5) {
      let total = weightedReview.reduce((s, e) => s + e.weight, 0);
      let roll = Math.random() * total;
      for (const e of weightedReview) {
        roll -= e.weight;
        if (roll <= 0) {
          return { gKey: e.gKey, vKey: e.vKey, tense: e.tense, pronIdx: e.pronIdx };
        }
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function generateLevelVerbDatas(n) {
    const out = [];
    const used = new Set();
    let attempts = 0;
    while (out.length < n && attempts < n * 20) {
      attempts += 1;
      const vd = randomVerbData();
      const key = `${vd.vKey}|${vd.pronIdx}`;
      if (used.has(key)) {
        continue;
      }
      used.add(key);
      out.push(vd);
    }
    while (out.length < n) {
      out.push(randomVerbData());
    }
    return out;
  }

  function syncSelection() {
    const buttons = uiHooks.getAnswerButtons ? uiHooks.getAnswerButtons() : [];
    if (!buttons.length) {
      QK.selectedBtn = null;
      selectedIndex = -1;
      return;
    }
    if (selectedIndex < 0) {
      QK.selectedBtn = null;
      uiHooks.setSelectedButton?.(null);
      return;
    }
    selectedIndex = ((selectedIndex % buttons.length) + buttons.length) % buttons.length;
    QK.selectedBtn = buttons[selectedIndex] || null;
    uiHooks.setSelectedButton?.(QK.selectedBtn);
  }

  function openQuestion(enemy) {
    if (!enemy || QS.active) {
      return false;
    }
    const vd = enemy.verbData || randomVerbData();
    const q = makeQuestion(vd);
    if (!q) {
      return false;
    }
    QS.active = true;
    QS.enemy = enemy;
    QS.q = q;
    QS.mode = "enemy";
    QS.onCorrect = null;
    QS.onWrong = null;
    QS.uiMeta = null;
    QS.resolving = false;
    enemy.battling = true;
    enemy.questionAttempts = (enemy.questionAttempts || 0) + 1;
    selectedIndex = -1;
    uiHooks.onOpenQuestion?.(q, QS.uiMeta);
    syncSelection();
    gameplayHooks.onOpenQuestion?.(q, enemy);
    return true;
  }

  function openStandaloneQuestion({ vd = null, uiMeta = null, onCorrect = null, onWrong = null } = {}) {
    if (QS.active) {
      return false;
    }
    const questionData = vd || randomVerbData();
    const q = makeQuestion(questionData);
    if (!q) {
      return false;
    }
    QS.active = true;
    QS.enemy = null;
    QS.q = q;
    QS.mode = "standalone";
    QS.onCorrect = typeof onCorrect === "function" ? onCorrect : null;
    QS.onWrong = typeof onWrong === "function" ? onWrong : null;
    QS.uiMeta = uiMeta || null;
    QS.resolving = false;
    selectedIndex = -1;
    uiHooks.onOpenQuestion?.(q, QS.uiMeta);
    syncSelection();
    gameplayHooks.onOpenQuestion?.(q, null);
    return true;
  }

  function closeQuestion() {
    const enemy = QS.enemy;
    const mode = QS.mode;
    QS.active = false;
    QS.enemy = null;
    QS.q = null;
    QS.mode = "enemy";
    QS.onCorrect = null;
    QS.onWrong = null;
    QS.uiMeta = null;
    QS.resolving = false;
    QK.selectedBtn = null;
    selectedIndex = -1;
    uiHooks.onCloseQuestion?.();
    gameplayHooks.onCloseQuestion?.(enemy, mode);
  }

  async function answerClick(answer) {
    if (!QS.active || !QS.q || QS.resolving) {
      return false;
    }
    QS.resolving = true;
    const q = QS.q;
    const selected = String(answer || "");
    uiHooks.disableAnswers?.();
    uiHooks.markAnswer?.({ correct: q.correct, selected });
    const correct = selected === q.correct;
    const mode = QS.mode;
    const onCorrect = QS.onCorrect;
    const onWrong = QS.onWrong;
    if (correct) {
      await delay(700);
      const enemy = QS.enemy;
      closeQuestion();
      if (mode === "enemy") {
        gameplayHooks.defeatEnemy?.(enemy);
      } else {
        onCorrect?.(q);
      }
      return true;
    }

    recordError(q);
    uiHooks.vibrate?.(120);
    await delay(mode === "enemy" ? 2500 : 800);
    const enemy = QS.enemy;
    closeQuestion();
    if (mode === "enemy") {
      if (enemy) {
        enemy.battling = false;
      }
      gameplayHooks.hitPlayer?.();
    } else {
      onWrong?.(q);
    }
    return false;
  }

  function handleQuestionKey(event) {
    if (!QS.active || !QS.q) {
      return false;
    }
    const buttons = uiHooks.getAnswerButtons ? uiHooks.getAnswerButtons() : [];
    if (!buttons.length) {
      return false;
    }
    const key = event.key;
    if (key === "ArrowLeft" || key === "ArrowUp") {
      selectedIndex = selectedIndex < 0 ? buttons.length - 1 : selectedIndex - 1;
      syncSelection();
      return true;
    }
    if (key === "ArrowRight" || key === "ArrowDown") {
      selectedIndex = selectedIndex < 0 ? 0 : selectedIndex + 1;
      syncSelection();
      return true;
    }
    if (key === "Enter" || key === " ") {
      if (selectedIndex < 0) {
        return true;
      }
      const btn = buttons[selectedIndex];
      if (btn) {
        answerClick(btn.dataset.answer || "");
      }
      return true;
    }
    if (/^[1-4]$/.test(key)) {
      const idx = Number(key) - 1;
      const btn = buttons[idx];
      if (btn) {
        selectedIndex = idx;
        syncSelection();
        answerClick(btn.dataset.answer || "");
      }
      return true;
    }
    return false;
  }

  return {
    QS,
    QK,
    openQuestion,
    openStandaloneQuestion,
    makeQuestion,
    answerClick,
    closeQuestion,
    recordError,
    resetErrors,
    getTopErrors,
    renderErrorList,
    randomVerbData,
    generateLevelVerbDatas,
    handleQuestionKey,
    frenchSound,
  };
}
