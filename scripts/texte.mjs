/**
 * scripts/texte.mjs – findet Oberflächentexte ohne englische Übersetzung
 *
 * Aufruf: npm run texte
 * Sucht in app/, components/ und lib/ nach t('…'), <T>…</T>, <T text="…">, setFehler('…')
 * sowie titel/frage in lib/quizze und prüft, ob lib/sprache/en.js einen Eintrag hat.
 * Texte, die erst zur Laufzeit zusammengesetzt werden, stehen unten in ZUSAETZLICH.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import EN from '../lib/sprache/en.js';

const ZUSAETZLICH = [];

const MUSTER = [
  /\bt\(\s*'((?:[^'\\]|\\.)+)'/g,
  /\bt\(\s*"((?:[^"\\]|\\.)+)"/g,
  /<T>([^<{]+)<\/T>/g,
  /<T\s+text="([^"]+)"/g,
  /setFehler\(\s*'((?:[^'\\]|\\.)+)'/g,
  /^\s*(?:titel|frage):\s*'([^']+)'/gm,
  /text:\s*'([^']+)'/g,
];

function dateien(ordner) {
  return readdirSync(ordner).flatMap((name) => {
    const pfad = join(ordner, name);
    if (statSync(pfad).isDirectory()) return dateien(pfad);
    return /\.(js|mjs)$/.test(name) && !pfad.includes(join('lib', 'sprache', 'en.js')) ? [pfad] : [];
  });
}

const gefunden = new Map(ZUSAETZLICH.map((text) => [text, 'scripts/texte.mjs']));
for (const datei of ['app', 'components', 'lib'].flatMap(dateien)) {
  const inhalt = readFileSync(datei, 'utf8');
  for (const muster of MUSTER) {
    for (const treffer of inhalt.matchAll(muster)) {
      const text = treffer[1].trim().replace(/\\'/g, "'");
      if (text && /[A-Za-zÄÖÜäöüß]/.test(text) && !gefunden.has(text)) gefunden.set(text, datei);
    }
  }
}

const fehlend = [...gefunden].filter(([text]) => !(text in EN));
if (fehlend.length === 0) {
  console.log(`Alle Texte sind übersetzt (${gefunden.size}).`);
} else {
  console.log(`${fehlend.length} Texte ohne englische Fassung:\n`);
  for (const [text, datei] of fehlend) console.log(`  '${text}': '',   // ${datei}`);
  process.exitCode = 1;
}
