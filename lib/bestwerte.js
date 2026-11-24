'use client';
/**
 * lib/bestwerte.js – eigener Bestwert je Quiz, nur in diesem Browser (localStorage)
 *
 * Gespeichert unter „geo-quiz-bestwerte“ als { 'kontinent-europa': { quote: 92, sekunden: 251 }, … }.
 * Schlüssel = Name in der Bestenliste (satz.bestenliste, z. B. 'DE:kreise').
 * Frühere Einträge des Modus „Länder eines Kontinents“ hießen nur 'europa' – sie werden übernommen.
 * Besser ist: höhere Quote, bei gleicher Quote die kürzere Zeit.
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
