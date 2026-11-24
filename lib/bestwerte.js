'use client';
/**
 * lib/bestwerte.js – eigener Bestwert je Kontinent, nur in diesem Browser (localStorage)
 *
 * Gespeichert unter „geo-quiz-bestwerte“ als { europa: { quote: 92, sekunden: 251 }, … }.
 * Besser ist: höhere Quote, bei gleicher Quote die kürzere Zeit.
 */
const SPEICHER = 'geo-quiz-bestwerte';

export function bestwerteLesen() {
  try {
    return JSON.parse(localStorage.getItem(SPEICHER) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

export function bestwertSpeichern(slug, quote, sekunden) {
  const alle = bestwerteLesen();
  const alt = alle[slug];
  if (alt && (alt.quote > quote || (alt.quote === quote && alt.sekunden <= sekunden))) return;
  alle[slug] = { quote, sekunden };
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(alle));
  } catch {
    /* privates Fenster – dann eben ohne Bestwert */
  }
}
