/**
 * lib/geodaten/namen.js – Kennung und deutscher Name eines Gebiets aus world-atlas
 *
 * world-atlas kennt die Gebiete über ihre ISO-Nummer (z. B. "276" = Deutschland).
 * Wir rechnen sie in das bekanntere Zwei-Buchstaben-Kürzel um ("DE"). Einige
 * Gebiete haben keine ISO-Nummer (Kosovo, Somaliland, Nordzypern …) – die
 * bekommen ihre Kennung über den englischen Namen.
 *
 * Die deutschen und englischen Namen kommen aus „i18n-iso-countries“. Dort stehen teils
 * die amtlichen Langformen („Russische Föderation“). Im Quiz sollen die üblichen
 * Kurzformen stehen, deshalb die Listen KURZFORM und KURZFORM_EN.
 */
import laenderNamen from 'i18n-iso-countries';
import deutsch from 'i18n-iso-countries/langs/de.json';
import englisch from 'i18n-iso-countries/langs/en.json';

laenderNamen.registerLocale(deutsch);
laenderNamen.registerLocale(englisch);

// Gebiete ohne ISO-Nummer: englischer Name in world-atlas → eigene Kennung.
// Somaliland und Nordzypern werden dem Staat zugeschlagen, zu dem sie völkerrechtlich gehören.
const OHNE_NUMMER = {
  Kosovo: 'XK',
  Somaliland: 'SO',
  'N. Cyprus': 'CY',
  'Siachen Glacier': 'X-SIACHEN', // umstrittenes Gletschergebiet (Indien/Pakistan), nur Hintergrund
  'Indian Ocean Ter.': 'X-IOT', // Weihnachtsinsel und Kokosinseln (Australien), nur Hintergrund
};

// Übliche deutsche Kurzformen statt der amtlichen Langform
const KURZFORM = {
  BN: 'Brunei',
  CD: 'Demokratische Republik Kongo',
  CG: 'Republik Kongo',
  CZ: 'Tschechien',
  MD: 'Moldau',
  PS: 'Palästina',
  RU: 'Russland',
  SY: 'Syrien',
  TZ: 'Tansania',
  US: 'Vereinigte Staaten',
  VA: 'Vatikanstadt',
  XK: 'Kosovo',
  TL: 'Osttimor',
  KN: 'St. Kitts und Nevis',
  VC: 'St. Vincent und die Grenadinen',
  TV: 'Tuvalu',
};

const KURZFORM_EN = {
  BN: 'Brunei',
  CD: 'DR Congo',
  CG: 'Republic of the Congo',
  CN: 'China',
  CZ: 'Czechia',
  FM: 'Micronesia',
  GM: 'The Gambia',
  IR: 'Iran',
  LA: 'Laos',
  MD: 'Moldova',
  MK: 'North Macedonia',
  PS: 'Palestine',
  RU: 'Russia',
  SY: 'Syria',
  TW: 'Taiwan',
  TZ: 'Tanzania',
  US: 'United States',
  VA: 'Vatican City',
  XK: 'Kosovo',
  TV: 'Tuvalu',
  KP: 'North Korea',
  KR: 'South Korea',
  BO: 'Bolivia',
  VE: 'Venezuela',
  VN: 'Vietnam',
  CV: 'Cape Verde',
  TL: 'East Timor',
};

/** Kennung (meist ISO-Alpha-2, z. B. "DE") eines world-atlas-Gebiets. */
export function kennung(gebiet) {
  if (gebiet.id) return laenderNamen.numericToAlpha2(gebiet.id) ?? `N-${gebiet.id}`;
  return OHNE_NUMMER[gebiet.properties?.name] ?? `X-${gebiet.properties?.name}`;
}

/** Deutscher Name zu einer Kennung. */
export function deutscherName(kuerzel, ersatz = kuerzel) {
  return KURZFORM[kuerzel] ?? laenderNamen.getName(kuerzel, 'de') ?? ersatz;
}

/** Englischer Name zu einer Kennung. */
export function englischerName(kuerzel, ersatz = kuerzel) {
  return KURZFORM_EN[kuerzel] ?? laenderNamen.getName(kuerzel, 'en') ?? ersatz;
}
