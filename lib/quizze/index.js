/**
 * lib/quizze/index.js – Liste aller Quizze
 *
 * Hier stehen die Umriss-Quizze (ein Umriss, vier Antworten). Der Modus
 * „Länder eines Kontinents“ hat eigene Seiten unter app/kontinente/.
 *
 * Ein neues Umriss-Quiz (z. B. Bundesländer oder Landkreise) braucht nur:
 *   1. eine Datei in lib/geodaten/ mit einer Funktion laden(), die
 *      eine Liste { id, name, pfad } liefert (siehe welt-laender.js),
 *   2. einen Eintrag hier unten.
 * Die Seite /quiz/<slug> und die Kachel im Hauptmenü entstehen dann automatisch.
 *
 * Die Geodaten werden erst beim Bauen geladen (import() unten). Auf der Startseite
 * landen davon nur die Anzahl und der Umriss `vorschau` (id eines Gebiets), alle
 * Umrisse erst auf der Quiz-Seite. So bleiben auch Quizze mit vielen detaillierten
 * Umrissen (400 Landkreise) schnell.
 */
export const QUIZZE = [
  {
    slug: 'laender',
    titel: 'Länder am Umriss',
    vorschau: '380', // Italien als Vorschaubild im Hauptmenü
    frage: 'Welches Land ist das?',
    runden: 10,
    geodaten: () => import('@/lib/geodaten/welt-laender'),
  },
  // Beispiel für später:
  // {
  //   slug: 'bundeslaender',
  //   titel: 'Bundesländer am Umriss',
  //   frage: 'Welches Bundesland ist das?',
  //   runden: 10,
  //   geodaten: () => import('@/lib/geodaten/bundeslaender'),
  // },
];

export function quizFinden(slug) {
  return QUIZZE.find((quiz) => quiz.slug === slug);
}
