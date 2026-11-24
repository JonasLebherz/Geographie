/**
 * lib/party/codes.js – Lobby-Namen aus zwei Wörtern, z. B. „flinker-pinguin“
 *
 * Statt kryptischer Codes: Eigenschaft + Tier/Ding, leicht vorzulesen und zu tippen.
 * 48 × 48 = 2.304 Kombinationen, dazu eine Zahl, falls doch zwei gleich heißen würden
 * (in der Praxis sind Lobbys nur Minuten offen). Nur Kleinbuchstaben ohne Umlaute (für Links).
 */
const EIGENSCHAFTEN = [
  'flinker', 'schlauer', 'mutiger', 'frecher', 'fröhlicher', 'wilder', 'ruhiger', 'schneller',
  'listiger', 'tapferer', 'neugieriger', 'munterer', 'kluger', 'lustiger', 'stolzer', 'sanfter',
  'kecker', 'emsiger', 'pfiffiger', 'flotter', 'heiterer', 'kühner', 'wacher', 'zackiger',
  'goldener', 'blauer', 'roter', 'grüner', 'silberner', 'bunter', 'kleiner', 'großer',
  'fliegender', 'tanzender', 'singender', 'reisender', 'träumender', 'lachender', 'wandernder', 'segelnder',
  'polarer', 'tropischer', 'alpiner', 'arktischer', 'nordischer', 'südlicher', 'östlicher', 'westlicher',
];
const DINGE = [
  'pinguin', 'fuchs', 'dachs', 'otter', 'luchs', 'kranich', 'adler', 'falke',
  'wal', 'delfin', 'koala', 'panda', 'tiger', 'yak', 'lama', 'kolibri',
  'kompass', 'globus', 'atlas', 'leuchtturm', 'vulkan', 'gletscher', 'fjord', 'kaktus',
  'baobab', 'monsun', 'passat', 'meridian', 'aequator', 'kontinent', 'archipel', 'atoll',
  'biber', 'elch', 'gepard', 'jaguar', 'kakadu', 'pelikan', 'seehund', 'tukan',
  'zebra', 'kamel', 'dromedar', 'nashorn', 'flamingo', 'papagei', 'wombat', 'kiwi',
];

const ohneUmlaute = (text) => text.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

export function neuerCode() {
  const zufall = (liste) => liste[Math.floor(Math.random() * liste.length)];
  return ohneUmlaute(`${zufall(EIGENSCHAFTEN)}-${zufall(DINGE)}`);
}

/**
 * Code aus einer Eingabe lesen: ganzer Link (…/party/flinker-pinguin), Code mit Leerzeichen
 * („Flinker Pinguin“) oder schon der Code selbst.
 */
export function codeAus(eingabe) {
  const text = ohneUmlaute(String(eingabe ?? '').trim().toLowerCase());
  const ausLink = text.match(/party\/([a-z0-9-]+)/);
  const roh = ausLink ? ausLink[1] : text;
  const code = roh.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return /^[a-z0-9]+(-[a-z0-9]+)+$/.test(code) && code.length <= 60 ? code : null;
}
