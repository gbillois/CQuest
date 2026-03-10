'use strict';

const PPAL = {
  '.':null,
  'O':'#0a080e',                         // contour
  'T':'#f8c898','t':'#d09060','q':'#a06030',  // peau
  'H':'#c87830','h':'#7a4010',           // cheveux
  'Y':'#f0c030','y':'#c08010','z':'#7a4e08',  // or/armure
  'R':'#e03030','r':'#980808',           // rouge cape
  'C':'#40e0c0','c':'#10a888','Z':'#086048',  // épée cyan
  'L':'#d0d8e8','S':'#7888a0','D':'#384058',  // acier
  'N':'#181828','n':'#0c0c18',           // navy
  'B':'#7a5020','b':'#4a2810',           // botte
  'G':'#50c038','g':'#288010','k':'#0e4000',  // goblin vert
  'A':'#c87820','a':'#7c4808',           // cuir
  'K':'#f0eec8','e':'#b0ae88','j':'#78706a',  // os
  'P':'#c82828','p':'#780808','F':'#f87830','f':'#b04010', // dragon
  'X':'#ff4040','I':'#40e8e8','Q':'#ffe840',  // yeux lumineux
  'V':'#304820','v':'#486830',           // feuillage
  'M':'#604830','m':'#3a2810',           // bois
  'J':'#887060','i':'#5a4838',           // pierre
  'U':'#9090c0','u':'#505080',           // mage bleu
  'W':'#f8f8f8',                         // blanc
};

function pxDraw(ctx, rows, x, y, sc, flip){
  const w = rows[0].length;
  if(flip){ ctx.save(); ctx.translate(x+w*sc, y); ctx.scale(-1,1); x=0; y=0; }
  for(let r=0;r<rows.length;r++){
    const row=rows[r];
    for(let c=0;c<row.length;c++){
      const col=PPAL[row[c]];
      if(col){ ctx.fillStyle=col; ctx.fillRect(x+c*sc, y+r*sc, sc, sc); }
    }
  }
  if(flip) ctx.restore();
}

// ─── Sprites chevalier 20×22 scale 2 = 40×44 ──────────────────
// Corps commun (lignes 0-11) — cape intégrée côté gauche
const _KB = [
  "....OOOOOOOOOO......",  //  0 casque dôme
  "..OyYYYLLLLYYyOO....",  //  1 casque brillant
  "..OyYLTTTTTTLYyOO...",  //  2 visage
  "...OyYLTqQqTLYyO....",  //  3 visage ombré  Q=rose
  "....ODDDDDDDDDOO....",  //  4 visière sombre
  "....OTTTTttTTTOO....",  //  5 menton
  "....OOOOOOOOOOOO....",  //  6 cou
  "RRrrYYYLLLLLYYYrrRRR",  //  7 épaules + cape R=rouge
  "RRrryYYLLWLLYYyrrRRR",  //  8 torse W=highlight
  "RRrryYYLLLLYYyrrRRRR",  //  9 torse bas
  "RRrryyyyyyyyyrrrRRRR.",  // 10 ventre/armure
  "..RRONNNNyyNNNNORR..",  // 11 hanches
];
// Jambes A — stance (une jambe légèrement avant)
const _KLA = [
  "..RRONNNyyNNNORR....",  // 12 cuisses
  "..RRONNNyyNNNORR....",  // 13
  "...RONNyyyNNOR......",  // 14 genoux
  "...RONNyyyNNOR......",  // 15
  "...RObbbybbbOR......",  // 16 tibias/bottes
  "...RObbbybbbOR......",  // 17
  "....ObbbbbbbbO......",  // 18 bottes
  "....ObbbbbbbbO......",  // 19
  "....OOOOOOOOOO......",  // 20 semelle
  "....................",  // 21
];
// Jambes B — foulée complète
const _KLB = [
  "..RRONNNyyNNNORR....",  // 12 cuisses
  ".ROONNyyyNNOOR......",  // 13 jambe avant décalée
  ".ROONNyyyNNOOR......",  // 14
  ".ROObbbybbbOOR......",  // 15 bottes avancées
  ".ROObbbybbbOOR......",  // 16
  ".ROObbbOObbbOR......",  // 17 jambes écartées
  ".ROObbbOObbbOR......",  // 18
  ".ROOOObbbbOOOR......",  // 19 pied avant à terre
  ".ROOOOOOOOOOR.......",  // 20 semelles
  "....................",  // 21
];
const SPR_KNIGHT = [[..._KB,..._KLA],[..._KB,..._KLB]];

// ─── Mage 20×22 ───────────────────────────────────────────────
const _MaB = [
  "....OOOOOOOOOO......",  //  0 chapeau pointu base
  "....OUUUUUUUUOO.....",  //  1 robe chapeau
  "..OUUTTTTTTUUuO.....",  //  2 visage
  "...OUUTqQqTUUuO.....",  //  3 visage ombré
  "....OUUUUUUUUOO.....",  //  4 masque magique
  "....OUUTttUUUO......",  //  5 menton
  "....OOOOOOOOOOOO....",  //  6 cou
  "uuuuUUUULLLLUUUuuuu.",  //  7 robe épaules
  "uuuuUUULLWLLUUuuuuu.",  //  8 robe torse W=reflet
  "uuuuUUULLLLUUuuuuuu.",  //  9 robe bas torse
  "uuuuuuuuuuuuuuuuuuu.",  // 10 robe plis
  "..uuONNNuuuNNNOuu...",  // 11 hanches
];
const SPR_MAGE = [[..._MaB,..._KLA],[..._MaB,..._KLB]];

// ─── Ninja 20×22 ──────────────────────────────────────────────
const _NiB = [
  "....OOOOOOOOOO......",
  "....ONNNNNNNNOO.....",
  "..ONNTTTTTTNNnO.....",
  "...ONNTqQqTNNnO.....",
  "....ONNNNNNNNOO.....",
  "....ONNTttNNNO......",
  "....OOOOOOOOOOOO....",
  "NNNNNDNDNNNNNNNNNnn.",
  "NNNNNNNNNNNNNNNNnnn.",
  "NNNNNNNSNNNNNNNNnnn.",
  "NNNNNNNNNNNNNNNNnnn.",
  "..NNONNNnnNNNONN....",
];
const SPR_NINJA = [[..._NiB,..._KLA],[..._NiB,..._KLB]];

// ─── Pirate 20×22 ─────────────────────────────────────────────
const _PiB = [
  "....OOOOOOOOOO......",
  "...ONNNNNNNNnOO.....",
  "..OHHNTTTTTHHnO.....",
  "...ONHTqQqTHNnO.....",
  "...ONNNNNNNNnOO.....",
  "....ONNTttNNNO......",
  "....OOOOOOOOOOOO....",
  "RRRRRRRNNNNRRRRRrRr.",
  "RRRRRRNBNNBNRRRRrr..",
  "RRRRRRNNNNNNRRRRrr..",
  "RRRRRRNNHHNNRRRRrr..",
  "..RRONNNNHHNNNORR...",
];
const SPR_PIRATE = [[..._PiB,..._KLA],[..._PiB,..._KLB]];

// ─── Goblin 20×22 scale 2 ─────────────────────────────────────
const _GB = [
  "....................",  //  0
  ".......OOOOOO.......",  //  1 tête top
  "......OGGGGGGgO.....",  //  2 tête verte
  "......OGXXGGGGgO....",  //  3 X=yeux rouges vifs
  "......OGGGNGGGgO....",  //  4 N=gros nez
  "......OGGggGGGgO....",  //  5 mâchoire
  ".......OOOOOOO......",  //  6 cou
  "......OaAGGGAAaO....",  //  7 épaules cuir
  ".....OaAAAAAAaaO....",  //  8 ventre
  ".....OaAAAAAAaaO....",  //  9
  ".....OaAAAAAAaaO....",  // 10
  "......OaAAAAaOO.....",  // 11 hanches
];
const _GLA = [
  "......OgGOOGGgO.....",  // 12 cuisses
  "......OgGOOGGgO.....",  // 13
  ".......OgOOgO.......",  // 14 genoux
  ".......OgOOgO.......",  // 15
  ".......OgOOgO.......",  // 16
  ".......OaOOaO.......",  // 17 bottes
  ".......OaOOaO.......",  // 18
  ".......OOOOOO.......",  // 19 semelle
  "....................",  // 20
  "....................",  // 21
];
const _GLB = [
  "......OgGOOGGgO.....",  // 12
  ".....OgGOOGgO.......",  // 13 jambe avant
  ".....OgGO..OgO......",  // 14 écart
  ".....OgO...OgO......",  // 15
  ".....OgO...OgO......",  // 16
  ".....OaO...OaO......",  // 17 bottes écartées
  ".....OaO...OaO......",  // 18
  ".....OOOO.OOOO......",  // 19
  "....................",  // 20
  "....................",  // 21
];
const SPR_GOBLIN = [[..._GB,..._GLA],[..._GB,..._GLB]];

// ─── Squelette 20×22 scale 2 ──────────────────────────────────
const _SkB = [
  "....................",  //  0
  ".......OOOOOO.......",  //  1 crâne
  "......OKKKKKKkO.....",  //  2 crâne K=ivoire
  ".......OKIeIKO......",  //  3 I=yeux cyan
  "......OKKKKKKkO.....",  //  4 mâchoire
  "......OKjKjDKkO.....",  //  5 dents j=ombre D=fente
  ".......OOOOOOO......",  //  6 cou osseux
  "......OKKkKkKKO.....",  //  7 clavicules
  "......OKjDeDjKO.....",  //  8 côtes D=espace
  "......OKjDeDjKO.....",  //  9
  "......OKjDeDjKO.....",  // 10
  ".......OKkKkKO......",  // 11 bassin
];
const _SkLA = [
  ".......OkOOkO.......",  // 12 fémurs
  ".......OkOOkO.......",  // 13
  ".......OkOOkO.......",  // 14
  ".......OKOOkO.......",  // 15
  ".......OKOOkO.......",  // 16
  ".......OkOOKO.......",  // 17
  ".......OkOOKO.......",  // 18 tibias
  ".......OOOOOO.......",  // 19 pieds
  "....................",  // 20
  "....................",  // 21
];
const _SkLB = [
  ".......OkOOkO.......",  // 12
  "......OkOOkO........",  // 13 décalé
  "......OkO.OkO.......",  // 14 écart
  "......OkO.OkO.......",  // 15
  "......OKO.OkO.......",  // 16
  "......OKO.OKO.......",  // 17
  "......OkO.OKO.......",  // 18
  "......OOO.OOO.......",  // 19 pieds écartés
  "....................",  // 20
  "....................",  // 21
];
const SPR_SKELETON = [[..._SkB,..._SkLA],[..._SkB,..._SkLB]];

// ─── Dragon 20×22 scale 2 (redessiné, ailes larges) ───────────
const _DrHead = [
  ".......OOOOO........",  //  0 tête
  "......OPPPPPPpOO....",  //  1 tête rouge
  ".....OPFPFPFPpOO....",  //  2 écailles F=orange
  ".....OPQQPPPpOO.....",  //  3 Q=yeux jaunes
  ".....OPPPPPPpOO.....",  //  4 gueule
  "......OPPPppOO......",  //  5 cou
];
const _DrW0 = [  // ailes levées
  "OfffffOPPPPPPOfffffO",  //  6
  "OffffOOPPPPPPOOffffO",  //  7
  "Offf...PPPPPP...fffO",  //  8
];
const _DrW1 = [  // ailes baissées
  ".....OPPPPPPpOO.....",  //  6
  "....OfPfffPPPfpO....",  //  7
  "....OffPPPPPfpOO....",  //  8
];
const _DrBody = [
  ".....OfPFPFfOO......",  //  9 corps écailles
  ".....OPPPPPPpOO.....",  // 10
  ".....OPPPPPPpOO.....",  // 11
  ".....OOPPPPpOOO.....",  // 12 taille
  "......OfPPfOOO......",  // 13 pattes
  "......OfPPfOOO......",  // 14
  "......OffFOOOO......",  // 15 griffes
  "......OfFFOOOO......",  // 16
  "......OOOOOOO.......",  // 17 sol
  "....................",  // 18
  "....................",  // 19
  "....................",  // 20
  "....................",  // 21
];
const SPR_DRAGON_0 = [..._DrHead,..._DrW0,..._DrBody];
const SPR_DRAGON_1 = [..._DrHead,..._DrW1,..._DrBody];
const SPR_DRAGON = [SPR_DRAGON_0, SPR_DRAGON_1];

// ─── Helper sprite par skin ───────────────────────────────────
function getSkinSprite(skin, frame){
  if(skin==='mage')   return SPR_MAGE[frame];
  if(skin==='ninja')  return SPR_NINJA[frame];
  if(skin==='pirate') return SPR_PIRATE[frame];
  return SPR_KNIGHT[frame];
}
