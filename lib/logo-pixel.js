/**
 * lib/logo-pixel.js – Pixelbild der Comic-Erde (Logo und app/icon.svg)
 * Reine Daten ohne JSX, damit auch scripts/logo.mjs es lesen kann.
 */
/* K Kontur · B Meer · b Glanz · O Land · W weiß · P Nadel · p Wangen */
export const ERDE = [
  '............KKK.',
  '...........KPPPK',
  '.....KKKKK.KPWPK',
  '...KKbBBBOKKPPPK',
  '..KbOOBBBOOBKPK.',
  '.KBOOOBBBBOBBK..',
  '.KBOOBBBBBBOBK..',
  'KBBOWBBBWBBOOBK.',
  'KBBOKBBBKBBBOBK.',
  'KBpBBBBBBBpBBBK.',
  'KBBKBBBBBKBBOBK.',
  '.KBOKKKKKBBOOK..',
  '.KBOOBBBBBBOBK..',
  '..KBOOBBBOOBK...',
  '...KKBBBBBKK....',
  '.....KKKKK......',
];
export const FARBEN = { K: '#1b1b1b', B: '#7fc3e6', b: '#d4eefa', O: '#f2b98a', W: '#ffffff', P: '#ef7fae', p: '#f5a3c4' };

/** Pixelreihen → Rechtecke (gleiche Farben nebeneinander zusammengefasst) */
export function pixelRechtecke() {
  const liste = [];
  ERDE.forEach((zeile, y) => {
    let x = 0;
    while (x < zeile.length) {
      const c = zeile[x];
      if (c === '.') {
        x += 1;
        continue;
      }
      let laenge = 1;
      while (zeile[x + laenge] === c) laenge += 1;
      liste.push({ x: x + 2, y: y + 2, b: laenge, farbe: FARBEN[c] });
      x += laenge;
    }
  });
  return liste;
}
