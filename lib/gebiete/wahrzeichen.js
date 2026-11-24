/**
 * lib/gebiete/wahrzeichen.js – bekannte Wahrzeichen als Orientierungspunkte auf der Karte
 *
 * Handverlesen (keine freie Datenquelle in guter Qualität). Jedes Wahrzeichen hat ein
 * Symbol (siehe components/karte/KarteEbene.js, SYMBOLE) und erscheint ab einer Ebene:
 * welt = schon auf der Weltkarte, sonst ab Kontinent. Namen erscheinen nur beim
 * Erkunden (Darüberfahren), im Quiz nicht – sie würden Städte verraten.
 *
 * Felder: [Name, Name englisch, Länge, Breite, Symbol, auf der Weltkarte?]
 */
const LISTE = [
  // Europa
  ['Eiffelturm', 'Eiffel Tower', 2.2945, 48.8584, 'turm', true],
  ['Brandenburger Tor', 'Brandenburg Gate', 13.3777, 52.5163, 'tor', false],
  ['Kölner Dom', 'Cologne Cathedral', 6.9583, 50.9413, 'kirche', false],
  ['Schloss Neuschwanstein', 'Neuschwanstein Castle', 10.7498, 47.5576, 'burg', false],
  ['Zugspitze', 'Zugspitze', 10.9863, 47.4211, 'berg', false],
  ['Elbphilharmonie', 'Elbphilharmonie', 9.9841, 53.5413, 'gebaeude', false],
  ['Kolosseum', 'Colosseum', 12.4922, 41.8902, 'arena', true],
  ['Schiefer Turm von Pisa', 'Leaning Tower of Pisa', 10.3966, 43.723, 'turm', false],
  ['Big Ben', 'Big Ben', -0.1246, 51.5007, 'turm', false],
  ['Stonehenge', 'Stonehenge', -1.8262, 51.1789, 'stein', false],
  ['Sagrada Família', 'Sagrada Família', 2.1744, 41.4036, 'kirche', false],
  ['Akropolis', 'Acropolis', 23.7257, 37.9715, 'tempel', false],
  ['Basilius-Kathedrale', "Saint Basil's Cathedral", 37.6231, 55.7525, 'kirche', true],
  ['Atomium', 'Atomium', 4.3417, 50.8949, 'gebaeude', false],
  ['Prager Burg', 'Prague Castle', 14.4005, 50.0911, 'burg', false],
  ['Matterhorn', 'Matterhorn', 7.6586, 45.9763, 'berg', false],
  ['Hagia Sophia', 'Hagia Sophia', 28.98, 41.0086, 'kirche', false],
  ['Alhambra', 'Alhambra', -3.5881, 37.1761, 'burg', false],
  ['Mont-Saint-Michel', 'Mont-Saint-Michel', -1.5115, 48.6361, 'kirche', false],
  ['Kleine Meerjungfrau', 'The Little Mermaid', 12.5993, 55.6929, 'statue', false],
  // Asien
  ['Taj Mahal', 'Taj Mahal', 78.0421, 27.1751, 'tempel', true],
  ['Chinesische Mauer', 'Great Wall of China', 116.5704, 40.4319, 'mauer', true],
  ['Fuji', 'Mount Fuji', 138.7274, 35.3606, 'berg', true],
  ['Mount Everest', 'Mount Everest', 86.925, 27.9881, 'berg', true],
  ['Petra', 'Petra', 35.4444, 30.3285, 'tempel', false],
  ['Burj Khalifa', 'Burj Khalifa', 55.2744, 25.1972, 'turm', false],
  ['Angkor Wat', 'Angkor Wat', 103.867, 13.4125, 'tempel', false],
  ['Petronas Towers', 'Petronas Towers', 101.7117, 3.1579, 'turm', false],
  ['Terrakotta-Armee', 'Terracotta Army', 109.2785, 34.3841, 'statue', false],
  // Afrika
  ['Pyramiden von Gizeh', 'Pyramids of Giza', 31.1342, 29.9792, 'pyramide', true],
  ['Kilimandscharo', 'Kilimanjaro', 37.3556, -3.0674, 'berg', true],
  ['Victoriafälle', 'Victoria Falls', 25.8572, -17.9243, 'wasserfall', false],
  ['Tafelberg', 'Table Mountain', 18.4037, -33.9628, 'berg', false],
  ['Abu Simbel', 'Abu Simbel', 31.6258, 22.3372, 'tempel', false],
  // Nordamerika
  ['Freiheitsstatue', 'Statue of Liberty', -74.0445, 40.6892, 'statue', true],
  ['Golden Gate Bridge', 'Golden Gate Bridge', -122.4783, 37.8199, 'bruecke', true],
  ['Grand Canyon', 'Grand Canyon', -112.1129, 36.1069, 'berg', false],
  ['Mount Rushmore', 'Mount Rushmore', -103.4591, 43.8791, 'statue', false],
  ['Niagarafälle', 'Niagara Falls', -79.0742, 43.0896, 'wasserfall', false],
  ['Chichén Itzá', 'Chichén Itzá', -88.5678, 20.6843, 'pyramide', true],
  // Südamerika
  ['Christusstatue', 'Christ the Redeemer', -43.2105, -22.9519, 'statue', true],
  ['Machu Picchu', 'Machu Picchu', -72.545, -13.1631, 'tempel', true],
  ['Iguazú-Fälle', 'Iguazu Falls', -54.4367, -25.6953, 'wasserfall', false],
  ['Aconcagua', 'Aconcagua', -70.0109, -32.6532, 'berg', false],
  // Ozeanien
  ['Opernhaus Sydney', 'Sydney Opera House', 151.2153, -33.8568, 'gebaeude', true],
  ['Uluru', 'Uluru', 131.0369, -25.3444, 'berg', true],
];

export const WAHRZEICHEN = LISTE.map(([name, en, lon, lat, symbol, welt], i) => ({
  id: `w${i}`,
  name,
  en,
  lon,
  lat,
  symbol,
  welt,
}));
