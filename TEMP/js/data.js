'use strict';

const PRONOUN_LABEL = ['je','tu','il/elle','nous','vous','ils/elles'];

const VERBS = {
  groupe1: {
    label:'Groupe 1 (-ER)', color:'#a78bfa',
    list:{
      parler:    {pr:['parle','parles','parle','parlons','parlez','parlent'],           im:['parlais','parlais','parlait','parlions','parliez','parlaient'],           fu:['parlerai','parleras','parlera','parlerons','parlerez','parleront'],           pp:'parlé',   aux:'avoir'},
      manger:    {pr:['mange','manges','mange','mangeons','mangez','mangent'],         im:['mangeais','mangeais','mangeait','mangions','mangiez','mangeaient'],         fu:['mangerai','mangeras','mangera','mangerons','mangerez','mangeront'],           pp:'mangé',   aux:'avoir'},
      chanter:   {pr:['chante','chantes','chante','chantons','chantez','chantent'],   im:['chantais','chantais','chantait','chantions','chantiez','chantaient'],       fu:['chanterai','chanteras','chantera','chanterons','chanterez','chanteront'],     pp:'chanté',  aux:'avoir'},
      aimer:     {pr:['aime','aimes','aime','aimons','aimez','aiment'],               im:['aimais','aimais','aimait','aimions','aimiez','aimaient'],                   fu:['aimerai','aimeras','aimera','aimerons','aimerez','aimeront'],                 pp:'aimé',    aux:'avoir'},
      jouer:     {pr:['joue','joues','joue','jouons','jouez','jouent'],               im:['jouais','jouais','jouait','jouions','jouiez','jouaient'],                   fu:['jouerai','joueras','jouera','jouerons','jouerez','joueront'],                 pp:'joué',    aux:'avoir'},
      regarder:  {pr:['regarde','regardes','regarde','regardons','regardez','regardent'], im:['regardais','regardais','regardait','regardions','regardiez','regardaient'], fu:['regarderai','regarderas','regardera','regarderons','regarderez','regarderont'], pp:'regardé', aux:'avoir'},
      écouter:   {pr:['écoute','écoutes','écoute','écoutons','écoutez','écoutent'],   im:['écoutais','écoutais','écoutait','écoutions','écoutiez','écoutaient'],       fu:['écouterai','écouteras','écoutera','écouterons','écouterez','écouteront'],     pp:'écouté',  aux:'avoir'},
      danser:    {pr:['danse','danses','danse','dansons','dansez','dansent'],         im:['dansais','dansais','dansait','dansions','dansiez','dansaient'],             fu:['danserai','danseras','dansera','danserons','danserez','danseront'],           pp:'dansé',   aux:'avoir'},
      travailler:{pr:['travaille','travailles','travaille','travaillons','travaillez','travaillent'], im:['travaillais','travaillais','travaillait','travaillions','travailliez','travaillaient'], fu:['travaillerai','travailleras','travaillera','travaillerons','travaillerez','travailleront'], pp:'travaillé',aux:'avoir'},
      arriver:   {pr:['arrive','arrives','arrive','arrivons','arrivez','arrivent'],   im:['arrivais','arrivais','arrivait','arrivions','arriviez','arrivaient'],       fu:['arriverai','arriveras','arrivera','arriverons','arriverez','arriveront'],     pp:'arrivé',  aux:'être'},
    }
  },
  groupe2: {
    label:'Groupe 2 (-IR)', color:'#60a5fa',
    list:{
      finir:    {pr:['finis','finis','finit','finissons','finissez','finissent'],           im:['finissais','finissais','finissait','finissions','finissiez','finissaient'],           fu:['finirai','finiras','finira','finirons','finirez','finiront'],         pp:'fini',    aux:'avoir'},
      choisir:  {pr:['choisis','choisis','choisit','choisissons','choisissez','choisissent'], im:['choisissais','choisissais','choisissait','choisissions','choisissiez','choisissaient'], fu:['choisirai','choisiras','choisira','choisirons','choisirez','choisiront'], pp:'choisi',  aux:'avoir'},
      grandir:  {pr:['grandis','grandis','grandit','grandissons','grandissez','grandissent'], im:['grandissais','grandissais','grandissait','grandissions','grandissiez','grandissaient'], fu:['grandirai','grandiras','grandira','grandirons','grandirez','grandiront'], pp:'grandi',  aux:'avoir'},
      réussir:  {pr:['réussis','réussis','réussit','réussissons','réussissez','réussissent'], im:['réussissais','réussissais','réussissait','réussissions','réussissiez','réussissaient'], fu:['réussirai','réussiras','réussira','réussirons','réussirez','réussiront'], pp:'réussi',  aux:'avoir'},
      obéir:    {pr:['obéis','obéis','obéit','obéissons','obéissez','obéissent'],           im:['obéissais','obéissais','obéissait','obéissions','obéissiez','obéissaient'],           fu:['obéirai','obéiras','obéira','obéirons','obéirez','obéiront'],         pp:'obéi',    aux:'avoir'},
      rougir:   {pr:['rougis','rougis','rougit','rougissons','rougissez','rougissent'],     im:['rougissais','rougissais','rougissait','rougissions','rougissiez','rougissaient'],     fu:['rougirai','rougiras','rougira','rougirons','rougirez','rougiront'],   pp:'rougi',   aux:'avoir'},
      applaudir:{pr:['applaudis','applaudis','applaudit','applaudissons','applaudissez','applaudissent'], im:['applaudissais','applaudissais','applaudissait','applaudissions','applaudissiez','applaudissaient'], fu:['applaudirai','applaudiras','applaudira','applaudirons','applaudirez','applaudiront'], pp:'applaudi',aux:'avoir'},
      bâtir:    {pr:['bâtis','bâtis','bâtit','bâtissons','bâtissez','bâtissent'],           im:['bâtissais','bâtissais','bâtissait','bâtissions','bâtissiez','bâtissaient'],           fu:['bâtirai','bâtiras','bâtira','bâtirons','bâtirez','bâtiront'],         pp:'bâti',    aux:'avoir'},
      remplir:  {pr:['remplis','remplis','remplit','remplissons','remplissez','remplissent'], im:['remplissais','remplissais','remplissait','remplissions','remplissiez','remplissaient'], fu:['remplirai','rempliras','remplira','remplirons','remplirez','rempliront'], pp:'rempli',  aux:'avoir'},
      vieillir: {pr:['vieillis','vieillis','vieillit','vieillissons','vieillissez','vieillissent'], im:['vieillissais','vieillissais','vieillissait','vieillissions','vieillissiez','vieillissaient'], fu:['vieillirai','vieilliras','vieillira','vieillirons','vieillirez','vieilliront'], pp:'vieilli', aux:'avoir'},
    }
  },
  groupe3: {
    label:'Groupe 3 (irréguliers)', color:'#f87171',
    list:{
      être:    {pr:['suis','es','est','sommes','êtes','sont'],                   im:['étais','étais','était','étions','étiez','étaient'],               fu:['serai','seras','sera','serons','serez','seront'],               pp:'été',    aux:'avoir'},
      avoir:   {pr:['ai','as','a','avons','avez','ont'],                         im:['avais','avais','avait','avions','aviez','avaient'],               fu:['aurai','auras','aura','aurons','aurez','auront'],               pp:'eu',     aux:'avoir'},
      aller:   {pr:['vais','vas','va','allons','allez','vont'],                   im:['allais','allais','allait','allions','alliez','allaient'],         fu:['irai','iras','ira','irons','irez','iront'],                     pp:'allé',   aux:'être'},
      faire:   {pr:['fais','fais','fait','faisons','faites','font'],             im:['faisais','faisais','faisait','faisions','faisiez','faisaient'],   fu:['ferai','feras','fera','ferons','ferez','feront'],               pp:'fait',   aux:'avoir'},
      prendre: {pr:['prends','prends','prend','prenons','prenez','prennent'],   im:['prenais','prenais','prenait','prenions','preniez','prenaient'],   fu:['prendrai','prendras','prendra','prendrons','prendrez','prendront'], pp:'pris',aux:'avoir'},
      venir:   {pr:['viens','viens','vient','venons','venez','viennent'],       im:['venais','venais','venait','venions','veniez','venaient'],         fu:['viendrai','viendras','viendra','viendrons','viendrez','viendront'], pp:'venu',aux:'être'},
      voir:    {pr:['vois','vois','voit','voyons','voyez','voient'],             im:['voyais','voyais','voyait','voyions','voyiez','voyaient'],         fu:['verrai','verras','verra','verrons','verrez','verront'],         pp:'vu',     aux:'avoir'},
      pouvoir: {pr:['peux','peux','peut','pouvons','pouvez','peuvent'],         im:['pouvais','pouvais','pouvait','pouvions','pouviez','pouvaient'],   fu:['pourrai','pourras','pourra','pourrons','pourrez','pourront'],   pp:'pu',     aux:'avoir'},
      vouloir: {pr:['veux','veux','veut','voulons','voulez','veulent'],         im:['voulais','voulais','voulait','voulions','vouliez','voulaient'],   fu:['voudrai','voudras','voudra','voudrons','voudrez','voudront'],   pp:'voulu',  aux:'avoir'},
      savoir:  {pr:['sais','sais','sait','savons','savez','savent'],             im:['savais','savais','savait','savions','saviez','savaient'],         fu:['saurai','sauras','saura','saurons','saurez','sauront'],         pp:'su',     aux:'avoir'},
      partir:  {pr:['pars','pars','part','partons','partez','partent'],         im:['partais','partais','partait','partions','partiez','partaient'],   fu:['partirai','partiras','partira','partirons','partirez','partiront'], pp:'parti',aux:'être'},
      dormir:  {pr:['dors','dors','dort','dormons','dormez','dorment'],         im:['dormais','dormais','dormait','dormions','dormiez','dormaient'],   fu:['dormirai','dormiras','dormira','dormirons','dormirez','dormiront'], pp:'dormi',aux:'avoir'},
    }
  },
  verbesBase: {
    label:'Verbes essentiels ⭐', color:'#fbbf24',
    list:{
      être:    {pr:['suis','es','est','sommes','êtes','sont'],                   im:['étais','étais','était','étions','étiez','étaient'],               fu:['serai','seras','sera','serons','serez','seront'],               pp:'été',    aux:'avoir'},
      avoir:   {pr:['ai','as','a','avons','avez','ont'],                         im:['avais','avais','avait','avions','aviez','avaient'],               fu:['aurai','auras','aura','aurons','aurez','auront'],               pp:'eu',     aux:'avoir'},
      aller:   {pr:['vais','vas','va','allons','allez','vont'],                   im:['allais','allais','allait','allions','alliez','allaient'],         fu:['irai','iras','ira','irons','irez','iront'],                     pp:'allé',   aux:'être'},
      faire:   {pr:['fais','fais','fait','faisons','faites','font'],             im:['faisais','faisais','faisait','faisions','faisiez','faisaient'],   fu:['ferai','feras','fera','ferons','ferez','feront'],               pp:'fait',   aux:'avoir'},
      dire:    {pr:['dis','dis','dit','disons','dites','disent'],                 im:['disais','disais','disait','disions','disiez','disaient'],         fu:['dirai','diras','dira','dirons','direz','diront'],               pp:'dit',    aux:'avoir'},
      prendre: {pr:['prends','prends','prend','prenons','prenez','prennent'],   im:['prenais','prenais','prenait','prenions','preniez','prenaient'],   fu:['prendrai','prendras','prendra','prendrons','prendrez','prendront'], pp:'pris',aux:'avoir'},
      venir:   {pr:['viens','viens','vient','venons','venez','viennent'],       im:['venais','venais','venait','venions','veniez','venaient'],         fu:['viendrai','viendras','viendra','viendrons','viendrez','viendront'], pp:'venu',aux:'être'},
      pouvoir: {pr:['peux','peux','peut','pouvons','pouvez','peuvent'],         im:['pouvais','pouvais','pouvait','pouvions','pouviez','pouvaient'],   fu:['pourrai','pourras','pourra','pourrons','pourrez','pourront'],   pp:'pu',     aux:'avoir'},
      vouloir: {pr:['veux','veux','veut','voulons','voulez','veulent'],         im:['voulais','voulais','voulait','voulions','vouliez','voulaient'],   fu:['voudrai','voudras','voudra','voudrons','voudrez','voudront'],   pp:'voulu',  aux:'avoir'},
      savoir:  {pr:['sais','sais','sait','savons','savez','savent'],             im:['savais','savais','savait','savions','saviez','savaient'],         fu:['saurai','sauras','saura','saurons','saurez','sauront'],         pp:'su',     aux:'avoir'},
      mettre:  {pr:['mets','mets','met','mettons','mettez','mettent'],           im:['mettais','mettais','mettait','mettions','mettiez','mettaient'],   fu:['mettrai','mettras','mettra','mettrons','mettrez','mettront'],   pp:'mis',    aux:'avoir'},
      devoir:  {pr:['dois','dois','doit','devons','devez','doivent'],           im:['devais','devais','devait','devions','deviez','devaient'],         fu:['devrai','devras','devra','devrons','devrez','devront'],         pp:'dû',     aux:'avoir'},
    }
  }
};

// ════════════════════════════════════════════════════════════════
//  CONFIGURATION DES NIVEAUX
// ════════════════════════════════════════════════════════════════

const LEVELS = [
  {id:1, name:'La Forêt Magique',       biome:'forest',      sky:'#0d1a0d', bgFar:'#14381a', bgNear:'#1a5020', ground:'#2d6b22', plat:'#7c5a20', funnySky:'#87ceeb', funnyBgFar:'#90ee90', funnyBgNear:'#228b22', funnyGround:'#32cd32', funnyPlat:'#d2691e', groups:['groupe1'],         tenses:['pr'],      tenseLabel:'Présent',                  numEnemies:4, enemyType:'forest-sprite',      enemyTypes:['forest-sprite','forest-goblin-green'],     emoji:'🌲'},
  {id:2, name:'Le Désert des Pharaons', biome:'desert',      sky:'#e8a830', bgFar:'#c07820', bgNear:'#a05810', ground:'#c8a040', plat:'#b08828', funnySky:'#ffe4a0', funnyBgFar:'#f5c842', funnyBgNear:'#e8a020', funnyGround:'#ffd060', funnyPlat:'#e09020', groups:['groupe1'],         tenses:['pr','im'], tenseLabel:'Présent & Imparfait',      numEnemies:5, enemyType:'desert-scorpion',    enemyTypes:['desert-scorpion','desert-mummy'],         emoji:'🦂'},
  {id:3, name:'Les Montagnes Gelées',   biome:'snow',        sky:'#0a1020', bgFar:'#102040', bgNear:'#1a3060', ground:'#2a4a7a', plat:'#4a6a9a', funnySky:'#e8f4fc', funnyBgFar:'#b0d0f0', funnyBgNear:'#90b8e8', funnyGround:'#c8e0f8', funnyPlat:'#8ab0d0', groups:['groupe1','groupe2'],tenses:['pr'],      tenseLabel:'Présent (G1 + G2)',         numEnemies:6, enemyType:'snow-yeti',          enemyTypes:['snow-yeti','frost-zombie'],                emoji:'❄️'},
  {id:4, name:'Les Cavernes de Pierre', biome:'mountain',    sky:'#080810', bgFar:'#101020', bgNear:'#181830', ground:'#303050', plat:'#505070', funnySky:'#fff9c4', funnyBgFar:'#ffd700', funnyBgNear:'#ffa500', funnyGround:'#ff8c00', funnyPlat:'#dc143c', groups:['groupe2'],         tenses:['pr','im'], tenseLabel:'Présent & Imparfait (G2)', numEnemies:6, enemyType:'mountain-troll',     enemyTypes:['mountain-troll','mountain-dwarf'],        emoji:'⛏️'},
  {id:5, name:'La Désolation Finale',   biome:'desolation',  sky:'#080808', bgFar:'#101010', bgNear:'#181818', ground:'#202020', plat:'#303030', funnySky:'#fce4ec', funnyBgFar:'#ff8a65', funnyBgNear:'#ff5722', funnyGround:'#f44336', funnyPlat:'#e91e63', groups:['groupe3'],         tenses:['pr','fu'], tenseLabel:'Présent & Futur simple',  numEnemies:7, enemyType:'desolation-wraith', enemyTypes:['desolation-skeleton','desolation-wraith'], emoji:'👻'},
];
