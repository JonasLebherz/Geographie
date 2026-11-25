'use client';
/**
 * lib/bestwerte.js – eigener Bestwert je Quiz, nur in diesem Browser (localStorage)
 *
 * Gespeichert unter „geo-quiz-bestwerte“ als { 'kontinent-europa': { quote: 92, sekunden: 251 }, … }.
 * Schlüssel = Name in der Bestenliste (satz.bestenliste, z. B. 'DE:kreise').
 * Frühere Einträge des Modus „Länder eines Kontinents“ hießen nur 'europa' – sie werden übernommen.
 * Besser ist: höhere Quote, bei gleicher Quote die kürzere Zeit.
 * Mit Konto (lib/konto.js) wird jeder neue Bestwert zusätzlich im Konto gespeichert: dafür
 * meldet bestwertSpeichern ihn als Ereignis BESTWERT_EREIGNIS.
 */
const SPEICHER = 'geo-quiz-bestwerte';

const KONTINENTE = ['europa', 'asien', 'afrika', 'nordamerika', 'suedamerika', 'ozeanien'];

export function bestwerteLesen() {
  try {
    const alle = JSON.parse(localStorage.getItem(SPEICHER) ?? '{}') ?? {};
    for (const slug of KONTINENTE) {
      if (alle[slug] && !alle[`kontinent-${slug}`]) alle[`kontinent-${slug}`] = alle[slug];
    }
    return alle;
  } catch {
    return {};
  }
}

export const BESTWERT_EREIGNIS = 'geo-quiz-bestwert';

/** Ist a besser als b (b darf fehlen)? */
export const besser = (a, b) => !b || a.quote > b.quote || (a.quote === b.quote && a.sekunden < b.sekunden);

export function bestwerteSchreiben(alle) {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(alle));
  } catch {
    /* privates Fenster – dann eben ohne Bestwert */
  }
}

export function bestwertSpeichern(slug, quote, sekunden) {
  const alle = bestwerteLesen();
  if (!besser({ quote, sekunden }, alle[slug])) return;
  alle[slug] = { quote, sekunden };
  bestwerteSchreiben(alle);
  window.dispatchEvent(new CustomEvent(BESTWERT_EREIGNIS, { detail: { quiz: slug, quote, sekunden } }));
}
