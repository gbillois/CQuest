'use strict';

// ── Base d'erreurs ────────────────────────────────────────────
var errorDB = JSON.parse(localStorage.getItem('cqErrors') || '{}');

function recordError(q){
  const key = `${q.gKey}|${q.vKey}|${q.tense}|${q.pronIdx}`;
  errorDB[key] = (errorDB[key] || 0) + 1;
  localStorage.setItem('cqErrors', JSON.stringify(errorDB));
}

function resetErrors(){
  errorDB = {};
  localStorage.removeItem('cqErrors');
  renderErrorList();
}

function getTopErrors(n=5){
  const activeGroups = SETTINGS.groups.length ? SETTINGS.groups : ['groupe1'];
  const activeTenses = SETTINGS.tenses.length ? SETTINGS.tenses : ['pr'];
  return Object.entries(errorDB)
    .filter(([k])=>{ const [g,,t]=k.split('|'); return activeGroups.includes(g)&&activeTenses.includes(t); })
    .sort(([,a],[,b])=>b-a)
    .slice(0,n);
}

function renderErrorList(){
  const el = document.getElementById('errorList');
  if(!el) return;
  const tenseMap = { pr:'Présent', im:'Imparfait', fu:'Futur simple' };
  const top = getTopErrors();
  if(top.length === 0){
    el.innerHTML = '<div style="color:#94a3b8;font-size:12px;padding:6px 0">Aucune erreur enregistrée 🎉</div>';
    return;
  }
  el.innerHTML = top.map(([key,cnt])=>{
    const [gKey,vKey,tense,pi] = key.split('|');
    const correct = VERBS[gKey]?.list[vKey]?.[tense]?.[+pi] ?? '?';
    return `<div class="errorItem">
      <span class="errorVerb">${PRONOUN_LABEL[+pi]} <b>${vKey}</b></span>
      <span class="errorTense">${tenseMap[tense]||tense}</span>
      <span class="errorAnswer">${correct}</span>
      <span class="errorCount">${cnt}×</span>
    </div>`;
  }).join('');
}

// Pool deduplique : chaque verbe n'apparait qu'une fois meme s'il est dans
// plusieurs groupes (ex. verbesBase + groupe3 partagent etre, avoir, etc.)
function buildVerbPool(activeGroups){
  const seen = new Set();
  const pool = [];
  for(const gKey of activeGroups){
    for(const vKey of Object.keys(VERBS[gKey].list)){
      if(!seen.has(vKey)){ seen.add(vKey); pool.push({gKey, vKey}); }
    }
  }
  return pool;
}

function randomVerbData(exclude){
  const activeGroups = SETTINGS.groups.length ? SETTINGS.groups : ['groupe1'];
  const activeTenses = SETTINGS.tenses.length ? SETTINGS.tenses : ['pr'];

  // 50 % de chance de piocher dans les erreurs frequentes (pondere par count)
  if(Math.random() < 0.5){
    const relevant = Object.entries(errorDB).filter(([k])=>{
      const [g,,t]=k.split('|');
      return activeGroups.includes(g) && activeTenses.includes(t);
    });
    if(relevant.length > 0){
      const total = relevant.reduce((s,[,c])=>s+c, 0);
      let r = Math.random() * total;
      for(const [key,cnt] of relevant){
        r -= cnt;
        if(r <= 0){
          const [gKey,vKey,tense,pi] = key.split('|');
          if(VERBS[gKey]?.list[vKey]) return {gKey, vKey, tense, pronIdx:+pi};
        }
      }
    }
  }

  // Selection aleatoire sur pool deduplique (pas de double-comptage inter-groupes)
  const pool    = buildVerbPool(activeGroups);
  const {gKey, vKey} = pick(pool);
  const tense   = pick(activeTenses);
  const pronIdx = rand(0,5);
  return { gKey, vKey, tense, pronIdx };
}

// Genere n verbDatas distincts (pas de meme verbe+pronom dans le meme niveau)
function generateLevelVerbDatas(n){
  const used   = new Set();
  const result = [];
  let tries = 0;
  while(result.length < n && tries < n * 20){
    tries++;
    const vd  = randomVerbData();
    const key = `${vd.vKey}|${vd.pronIdx}`;
    if(!used.has(key)){ used.add(key); result.push(vd); }
  }
  // Fallback si pas assez de combinaisons distinctes disponibles
  while(result.length < n) result.push(randomVerbData());
  return result;
}

// ════════════════════════════════════════════════════════════════
//  SYSTEME DE QUESTION
// ════════════════════════════════════════════════════════════════

var QS = {
  active: false,
  enemy:  null,
  q:      null,
};

var QK = { selectedBtn: null };

function clearMoveKeys(){
  keys.left = false;
  keys.right = false;
  jumpRequest = false;
}

function getQuestionButtons(){
  return Array.from(document.querySelectorAll('#qAnswers .qBtn'));
}

function getEnabledQuestionButtons(){
  return getQuestionButtons().filter(b => !b.disabled);
}

function syncQuestionKeyboardSelection(){
  const enabled = getEnabledQuestionButtons();
  // Never auto-select — only highlight a button the player explicitly navigated to
  if(!enabled.length || !enabled.includes(QK.selectedBtn)){
    QK.selectedBtn = null;
  }
  getQuestionButtons().forEach(b => b.classList.toggle('kbSel', b === QK.selectedBtn));
}

function moveQuestionSelection(delta){
  const enabled = getEnabledQuestionButtons();
  if(!enabled.length) return;
  if(!QK.selectedBtn || !enabled.includes(QK.selectedBtn)){
    QK.selectedBtn = enabled[0];
    syncQuestionKeyboardSelection();
    return;
  }
  let idx = enabled.indexOf(QK.selectedBtn);
  idx = (idx + delta + enabled.length) % enabled.length;
  QK.selectedBtn = enabled[idx];
  syncQuestionKeyboardSelection();
}

function selectQuestionByIndex(index){
  const enabled = getEnabledQuestionButtons();
  if(index < 0 || index >= enabled.length) return;
  QK.selectedBtn = enabled[index];
  syncQuestionKeyboardSelection();
  QK.selectedBtn.click();
}

function validateQuestionSelection(){
  const enabled = getEnabledQuestionButtons();
  if(!enabled.length) return;
  if(!QK.selectedBtn || !enabled.includes(QK.selectedBtn)) QK.selectedBtn = enabled[0];
  QK.selectedBtn.click();
}

function handleQuestionKeyboard(e){
  if(!QS.active) return false;
  const c = e.code;
  if(c==='ArrowLeft' || c==='ArrowUp' || c==='KeyA' || c==='KeyW'){
    e.preventDefault();
    moveQuestionSelection(-1);
    return true;
  }
  if(c==='ArrowRight' || c==='ArrowDown' || c==='KeyD' || c==='KeyS'){
    e.preventDefault();
    moveQuestionSelection(1);
    return true;
  }
  if(c==='Enter' || c==='Space'){
    e.preventDefault();
    validateQuestionSelection();
    return true;
  }
  if(c==='Digit1' || c==='Digit2' || c==='Digit3' || c==='Digit4'){
    e.preventDefault();
    selectQuestionByIndex(Number(c.slice(-1)) - 1);
    return true;
  }
  return true;
}

function openQuestion(enemy){
  if(QS.active) return;
  clearMoveKeys();
  QS.active    = true;
  QS.enemy     = enemy;
  enemy.battling = true;

  buildQuestion(enemy);
  document.getElementById('qModal').classList.add('show');
  GS.screen = 'question';
}

function buildQuestion(enemy){
  const q = makeQuestion(enemy.verbData);
  QS.q = q;

  document.getElementById('qEnemy').textContent = enemyEmoji(enemy.type);
  document.getElementById('qGroup').textContent = VERBS[q.gKey].label;
  document.getElementById('qTense').textContent = q.tenseLabel;
  document.getElementById('qText').innerHTML =
    `Conjugue le verbe <span class="vb">${q.vKey}</span> au <span class="vb">${q.tenseLabel}</span> :<br>
     <span class="pro">${PRONOUN_LABEL[q.pronIdx]}</span> <span class="blank">???</span>`;

  const container = document.getElementById('qAnswers');
  container.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className   = 'qBtn';
    btn.textContent = opt;
    const handler = () => answerClick(opt);
    btn.addEventListener('click',    handler);
    btn.addEventListener('touchend', e => { e.preventDefault(); handler(); }, {passive:false});
    container.appendChild(btn);
  });
  QK.selectedBtn = null;
  syncQuestionKeyboardSelection();

  renderBattleHP();
}

// ── Phonetique simplifiee du francais ──────────────────────────
// Renvoie une cle phonetique approximative pour detecter les homophones
// entre formes conjuguees (ex: mange/manges/mangent → meme son)
function frenchSound(w){
  let s = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  // Terminaisons connues (plus longues d'abord)
  const rules = [
    [/aient$/, '§E'],   // parlaient = parlais = parlait
    [/ais$/,   '§E'],
    [/ait$/,   '§E'],
    [/ions$/,  '§ION'], // parlions
    [/iez$/,   '§IE'],  // parliez
    [/rons$/,  '§RON'], // parlerons = parleront
    [/ront$/,  '§RON'],
    [/rez$/,   '§RE'],  // parlerez ≈ parlerai
    [/rai$/,   '§RE'],
    [/ras$/,   '§RA'],  // parleras = parlera
    [/ra$/,    '§RA'],
    [/ons$/,   '§ON'],  // parlons
    [/ez$/,    '§EZ'],  // parlez
  ];
  for(const [re, rep] of rules){
    if(re.test(s)) return s.replace(re, rep);
  }
  // -ent final muet (3e pers. pluriel) : parlent → parl
  if(s.length > 4 && s.endsWith('ent')) s = s.slice(0,-3);
  // Finales muettes : -es, -e, -s, -t, -x, -d
  if(s.length > 3) s = s.replace(/es$/, '');
  if(s.length > 2) s = s.replace(/e$/, '');
  s = s.replace(/[stxd]$/, '');
  return s;
}

function makeQuestion(vd){
  const { gKey, vKey, tense, pronIdx } = vd;
  const verb = VERBS[gKey].list[vKey];

  const tenseMap = { pr:'Présent', im:'Imparfait', fu:'Futur simple' };
  const correct = verb[tense][pronIdx];
  const correctSound = frenchSound(correct);

  // ── Collecter toutes les formes distinctes (orthographe ≠ correct) ──
  const seen = new Set([correct]);
  const homophones = [];   // meme son, orthographe differente
  const diffSounds = [];   // son clairement different

  for(const t of ['pr','im','fu']){
    if(!verb[t]) continue;
    for(let i=0; i<6; i++){
      const form = verb[t][i];
      if(!form || seen.has(form)) continue;
      seen.add(form);
      if(frenchSound(form) === correctSound){
        homophones.push({ form, t, i });
      } else {
        diffSounds.push({ form, t, i });
      }
    }
  }

  shuffle(homophones);
  // Preferer les formes d'AUTRES temps (plus educatif)
  const diffOther = shuffle(diffSounds.filter(f => f.t !== tense));
  const diffSame  = shuffle(diffSounds.filter(f => f.t === tense));

  const distractors = [];

  // ── 1. Piege homophone (meme son, orthographe differente) ───────────
  // Ex : "mange" (je) → piege "mangent" (ils) — meme prononciation
  if(homophones.length > 0) distractors.push(homophones[0].form);

  // ── 2. Deux formes qui sonnent differemment (autres temps prioritaires)
  const usedSounds = new Set();
  for(const f of [...diffOther, ...diffSame]){
    if(distractors.length >= 3) break;
    const snd = frenchSound(f.form);
    if(!usedSounds.has(snd)){
      usedSounds.add(snd);
      distractors.push(f.form);
    }
  }
  // Completer si pas assez de sons distincts
  for(const f of [...diffOther, ...diffSame]){
    if(distractors.length >= 3) break;
    if(!distractors.includes(f.form)) distractors.push(f.form);
  }

  // ── 3. Completer avec homophones restants / participe passe ─────────
  for(const f of homophones.slice(1)){
    if(distractors.length >= 3) break;
    if(!distractors.includes(f.form)) distractors.push(f.form);
  }
  if(distractors.length < 3 && verb.pp && verb.pp !== correct && !distractors.includes(verb.pp)){
    distractors.push(verb.pp);
  }

  const options = shuffle([correct, ...distractors.slice(0, 3)]);
  return { gKey, vKey, tense, tenseLabel: tenseMap[tense], pronIdx, correct, options };
}

function renderBattleHP(){ document.getElementById('qHP').innerHTML = ''; }

function answerClick(answer){
  if(!QS.active) return;
  const btns = document.querySelectorAll('.qBtn');
  btns.forEach(b => b.disabled = true);
  QK.selectedBtn = null;
  syncQuestionKeyboardSelection();
  btns.forEach(b => {
    if(b.textContent === QS.q.correct) b.classList.add('ok');
    if(b.textContent === answer && answer!==QS.q.correct) b.classList.add('bad');
  });

  if(answer === QS.q.correct){
    // Bonne reponse → victoire rapide
    setTimeout(() => {
      closeQuestion();
      defeatEnemy(QS.enemy);
    }, 700);
  } else {
    // Mauvaise reponse : enregistrer l'erreur, vibration + perd 1 vie
    recordError(QS.q);
    if(navigator.vibrate) navigator.vibrate(200);
    // La bonne reponse reste affichee 2,5 s pour memorisation
    setTimeout(() => {
      closeQuestion();
      hitPlayer();
      // L'ennemi reste vivant avec le MEME verbe (pour reessayer)
      if(QS.enemy) QS.enemy.battling = false;
    }, 2500);
  }
}

function closeQuestion(){
  QS.active = false;
  QK.selectedBtn = null;
  syncQuestionKeyboardSelection();
  document.getElementById('qModal').classList.remove('show');
  if(CQ.active){ CQ.active=false; GS.screen='castle'; }
  else GS.screen='game';
}

function defeatEnemy(e){
  if(!e) return;
  e.alive    = false;
  e.battling = false;
  GS.score  += 100;
  SAVE.totalStars += 10;
  saveSave();
  spawnBurst(e.x+e.w/2, e.y+e.h/2, '#a78bfa', 14);
  showStarGain(e.x+e.w/2, e.y, '+10🪙');
}

function hitPlayer(){
  if(player.invTimer>0) return;
  GS.lives--;
  player.invTimer = 110;
  spawnBurst(player.x+player.w/2, player.y+player.h/2, '#ef4444', 10);
  if(GS.lives<=0) triggerGameOver();
}
