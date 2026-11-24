/**
 * lib/sprache/en.js – englische Fassung aller Oberflächentexte
 *
 * Schlüssel = deutscher Text (genau wie im Code), Wert = englischer Text.
 * Platzhalter wie {n} bleiben gleich. Nach neuen Texten `npm run texte` ausführen.
 */
const EN = {
  // Rahmen, Menü
  Geodaten: 'Map data',
  gemeinfrei: 'public domain',
  'Seite nicht gefunden': 'Page not found',
  'Zur Startseite': 'Back to the start page',
  Geografie: 'Geography',
  Quizze: 'Quizzes',
  Welt: 'World',
  '{n} Länder · {k} Kontinente': '{n} countries · {k} continents',
  '{k} Kontinente · {von} bis {bis} Länder': '{k} continents · {von} to {bis} countries',
  '{n} Länder · {r} Fragen': '{n} countries · {r} questions',

  // Profil und Einstellungen
  'Profil und Einstellungen': 'Profile and settings',
  Gast: 'Guest',
  'Nicht angemeldet': 'Not signed in',
  Anmelden: 'Sign in',
  'Anmelden ist noch nicht verfügbar.': 'Signing in is not available yet.',
  Darstellung: 'Appearance',
  Hell: 'Light',
  Dunkel: 'Dark',
  Automatisch: 'Automatic',
  Töne: 'Sounds',
  Lautstärke: 'Volume',
  Sprache: 'Language',
  Deutsch: 'Deutsch',
  English: 'English',
  'Ton ausschalten': 'Mute sounds',
  'Ton einschalten': 'Unmute sounds',

  // Länder eines Kontinents
  'Länder eines Kontinents': 'Countries of a continent',
  '{n} Länder auf {k} Kontinenten': '{n} countries on {k} continents',
  '{n} Länder': '{n} countries',
  'Bestwert {q} %': 'Best {q} %',
  Kontinente: 'Continents',
  Aufgedeckt: 'Revealed',
  aufgedeckt: 'revealed',
  '{n} von {m} Versuchen übrig': '{n} of {m} attempts left',
  Ergebnis: 'Result',
  'beim ersten Versuch': 'on the first attempt',
  'beim zweiten oder dritten Versuch': 'on the second or third attempt',
  'Noch einmal': 'Play again',
  'Anderer Kontinent': 'Other continent',
  'Karte {name}': 'Map of {name}',
  Hineinzoomen: 'Zoom in',
  Herauszoomen: 'Zoom out',
  'Ganze Karte': 'Whole map',

  // Umriss-Quiz
  'Länder am Umriss': 'Countries by outline',
  'Welches Land ist das?': 'Which country is this?',
  'Frage {n} von {m}': 'Question {n} of {m}',
  '{n} richtig': '{n} correct',
  'Umriss des gesuchten Gebiets': 'Outline of the area in question',
  Weiter: 'Next',
  'Ergebnis anzeigen': 'Show result',

  // Bestenliste
  Bestenliste: 'Leaderboard',
  'Bestenliste nicht eingerichtet.': 'Leaderboard not set up.',
  'Eingetragen.': 'Saved.',
  Name: 'Name',
  'Name für die Bestenliste': 'Name for the leaderboard',
  Eintragen: 'Save',
  'Wird geladen …': 'Loading …',
  'Noch keine Einträge.': 'No entries yet.',
  'Die Bestenliste konnte nicht geladen werden.': 'The leaderboard could not be loaded.',
  'Bitte einen Namen eingeben.': 'Please enter a name.',
  'Der Name darf höchstens 20 Zeichen lang sein.': 'The name can be at most 20 characters long.',
  'Speichern hat nicht geklappt. Bitte später noch einmal versuchen.': 'Saving did not work. Please try again later.',
};
export default EN;
