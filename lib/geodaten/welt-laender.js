/**
 * lib/geodaten/welt-laender.js – Umrisse aller Länder der Welt
 *
 * Quelle: „world-atlas“ (Natural Earth, gemeinfrei), Maßstab 1:50 Mio.
 * Deutsche Namen: Paket „i18n-iso-countries“. world-atlas kennt die Länder über
 * ihre ISO-Nummer (z. B. 276 = Deutschland).
 */
import { feature } from 'topojson-client';
import laenderNamen from 'i18n-iso-countries';
import deutsch from 'i18n-iso-countries/langs/de.json';
import welt from 'world-atlas/countries-50m.json';
import { geoArea } from 'd3-geo';
import { umrissPfad } from './umriss';

laenderNamen.registerLocale(deutsch);

// Gebiete ohne eigene Bevölkerung oder als Umriss nicht sinnvoll (ISO-Nummern).
// Die Liste kann jederzeit erweitert werden.
const AUSGESCHLOSSEN = new Set([
  '010', // Antarktis
  '260', // Französische Süd- und Antarktisgebiete
  '334', // Heard und McDonaldinseln
  '086', // Britisches Territorium im Indischen Ozean
  '239', // Südgeorgien und die Südlichen Sandwichinseln
]);

// Sehr kleine Länder und Inseln (z. B. Sint Maarten, Malta) sind in diesem Maßstab
// nur grobe Vielecke und kaum zu erkennen. Grenze: ca. 2.000 km².
// geoArea liefert die Fläche als Anteil der Kugel (Steradiant), Erdradius 6371 km.
const MIN_FLAECHE_KM2 = 2000;
const flaecheKm2 = (gebiet) => geoArea(gebiet) * 6371 ** 2;

/** Alle Länder als Liste { id, name, pfad }. */
export function laden() {
  const { features } = feature(welt, welt.objects.countries);

  return features
    .filter((land) => land.id && !AUSGESCHLOSSEN.has(land.id))
    .filter((land) => flaecheKm2(land) >= MIN_FLAECHE_KM2)
    .map((land) => {
      const kuerzel = laenderNamen.numericToAlpha2(land.id);
      const name = (kuerzel && laenderNamen.getName(kuerzel, 'de')) || land.properties.name;
      return { id: land.id, name, pfad: umrissPfad(land) };
    })
    .filter((land) => land.pfad);
}
