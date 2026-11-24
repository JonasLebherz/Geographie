/**
 * lib/quizze/index.js – Liste aller Quizze
 *
 * Ein neues Quiz (z. B. Bundesländer oder Landkreise) braucht nur:
 *   1. eine Datei in lib/geodaten/ mit einer Funktion laden(), die
 *      eine Liste { id, name, pfad } liefert (siehe welt-laender.js),
 *   2. einen Eintrag hier unten.
 * Die Seite /quiz/<slug> entsteht dann automatisch.
 *
 * Die Geodaten werden erst beim Bauen der jeweiligen Quiz-Seite geladen
 * (import() unten) und landen nie auf der Startseite. So bleiben auch
 * Quizze mit vielen detaillierten Umrissen (400 Landkreise) schnell.
 */
export const QUIZZE = [
  {
    slug: 'laender',
    titel: 'Länder der Welt',
    beschreibung: 'Erkenne Länder an ihrem Umriss.',
    frage: 'Welches Land ist das?',
    runden: 10,
    geodaten: () => import('@/lib/geodaten/welt-laender'),
  },
  // Beispiel für später:
  // {
  //   slug: 'bundeslaender',
  //   titel: 'Deutsche Bundesländer',
  //   beschreibung: 'Erkenne die 16 Bundesländer an ihrem Umriss.',
  //   frage: 'Welches Bundesland ist das?',
  //   runden: 10,
  //   geodaten: () => import('@/lib/geodaten/bundeslaender'),
  // },
];

export function quizFinden(slug) {
  return QUIZZE.find((quiz) => quiz.slug === slug);
}
