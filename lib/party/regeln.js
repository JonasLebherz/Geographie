/**
 * lib/party/regeln.js – Spielregeln, Teams und Jubel der Party (gemeinsam für Lobby und Partie)
 */
export const MAX_SPIELER = 8;

/** Standard-Regeln: jeder für sich, 10 Fragen, 3 Joker, Ansicht frei, 10 s Bedenkzeit */
export const STANDARD_REGELN = { teams: 0, fragen: 10, joker: 3, ansicht: 'frei', zeit: 10 };

/** Teams (Farben ohne Grün, Gelb, Rot – die gehören den Antworten) */
export const TEAMS = [
  { name: 'Team Kompass', en: 'Team Compass', farbe: '#5b47a8' },
  { name: 'Team Anker', en: 'Team Anchor', farbe: '#2f7fb5' },
  { name: 'Team Globus', en: 'Team Globe', farbe: '#e07b39' },
  { name: 'Team Leuchtturm', en: 'Team Lighthouse', farbe: '#d94f8c' },
];

/** Jubel-Emotes: Pose der Comic-Figur (components/Avatar.js) mit kurzem Ruf */
export const EMOTES = [
  { art: 'jubel', text: 'Jubel!', en: 'Yay!' },
  { art: 'daumen', text: 'Stark!', en: 'Nice!' },
  { art: 'oh', text: 'Oh nein!', en: 'Oh no!' },
];
