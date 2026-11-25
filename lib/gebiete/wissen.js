/**
 * lib/gebiete/wissen.js – Wissensdaten für die Quizze (läuft nur beim Bauen)
 *
 * Quellen (aufbereitet mit `npm run wissen-daten`, Dateien in daten/wissen/):
 *  - staedte.json             GeoNames cities15000 (CC BY 4.0), deutsche Namen aus Wikidata
 *  - sehenswuerdigkeiten.json Wikidata (CC0), Auswahl nach Bekanntheit (Zahl der Wikipedia-Sprachen)
 *  - stadien.json             Wikidata: Fußballvereine der ersten Ligen mit Stadion
 *  - inseln.json              Wikidata: Inseln mit Fläche
 *  - extrempunkte.json        Wikidata: höchster/tiefster Punkt und Einwohner je Staat bzw. Region
 *  - geburtsorte.json         Wikidata: bekannte Menschen mit Geburtsort
 *  - kennzeichen.json         Wikidata: Kfz-Kennzeichen der deutschen Kreise (NUTS 3 → Kürzel)
 *  - flussnamen.json          Wikidata: deutsche Namen der Flüsse aus Natural Earth
 *  - bilder.json              Wikidata P18 + Commons: Bilddatei, Urheber, Lizenz (nur freie Lizenzen)
 * Handverlesen: lib/gebiete/kuratiert.js (Essen, Rekorde der Kontinente, fehlende Inseln) und
 * lib/gebiete/allgemeinwissen.js (Fragen mit einem Ort als Antwort).
 *
 * Alle Einträge mit Koordinaten bekommen hier ihr Land (und in Deutschland ihr Bundesland),
 * damit jedes Gebiet weiß, was in ihm liegt (imGebiet).
 */
import { inEuropa } from './ural';
import { geoBounds, geoContains } from 'd3-geo';
import staedteRoh from '@/daten/wissen/staedte.json';
import sehenswuerdigkeitenRoh from '@/daten/wissen/sehenswuerdigkeiten.json';
import stadienRoh from '@/daten/wissen/stadien.json';
import inselnRoh from '@/daten/wissen/inseln.json';
import extrempunkteRoh from '@/daten/wissen/extrempunkte.json';
import geburtsorteRoh from '@/daten/wissen/geburtsorte.json';
import kennzeichenRoh from '@/daten/wissen/kennzeichen.json';
import flussnamenRoh from '@/daten/wissen/flussnamen.json';
import bilderRoh from '@/daten/wissen/bilder.json';
import { ESSEN, INSELN_ZUSATZ } from './kuratiert';
import { ALLGEMEINWISSEN } from './allgemeinwissen';
import { deLaender, orte, staaten50 } from './quellen';

const merker = new Map();
function gemerkt(name, berechnen) {
  if (!merker.has(name)) merker.set(name, berechnen());
  return merker.get(name);
}

/** Findet die Fläche, in der ein Punkt liegt (Kasten-Vorprüfung, dann genaue Prüfung) */
export function sucher(features) {
  const liste = features.map((f) => ({ f, kasten: geoBounds(f) }));
  return (punkt) => {
    const [x, y] = punkt;
    for (const { f, kasten } of liste) {
      const [[w, s], [o, n]] = kasten;
      const imKasten = y >= s && y <= n && (w <= o ? x >= w && x <= o : x >= w || x <= o);
      if (imKasten && geoContains(f, punkt)) return f.id ?? f.properties?.id;
    }
    return null;
  };
}

const landSucher = () => gemerkt('land-sucher', () => sucher([...staaten50().values()]));
const bundeslandSucher = () => gemerkt('bundesland-sucher', () => sucher(deLaender()));

/** Land (und Bundesland) zu Einträgen ergänzen, die nur Koordinaten haben */
function verorten(eintraege) {
  return eintraege
    .map((e) => {
      const punkt = [e.lon, e.lat];
      const land = e.land ?? landSucher()(punkt);
      return { ...e, land, nuts1: e.nuts1 ?? (land === 'DE' ? bundeslandSucher()(punkt) : undefined) };
    })
    .filter((e) => e.land);
}

/**
 * Städte: GeoNames (alle ab 15.000 Einwohnern, je Staat die 150 größten), nach Einwohnern sortiert.
 * Hauptstädte, die dort fehlen (Kleinstaaten wie Vaduz oder Palikir), kommen aus Natural Earth dazu.
 */
export const staedte = () =>
  gemerkt('staedte', () => {
    // Chinesische Verwaltungsnamen ohne Zusatz („Chongqing Shi“ → „Chongqing“)
    const kurz = (name) => name?.replace(/ Shi$/, '');
    const liste = staedteRoh.map((s, i) => ({ ...s, name: kurz(s.name), en: kurz(s.en), id: `s${i}` }));
    const mitHauptstadt = new Set(liste.filter((s) => s.art === 'h').map((s) => s.land));
    const dazu = orte()
      .filter((o) => o.art === 'h' && !mitHauptstadt.has(o.land))
      .map((o) => ({ ...o, id: `n${o.id}` }));
    return [...liste, ...dazu].sort((a, b) => b.ew - a.ew);
  });

export const sehenswuerdigkeiten = () => gemerkt('sehenswuerdigkeiten', () => verorten(sehenswuerdigkeitenRoh));
export const stadien = () => gemerkt('stadien', () => verorten(stadienRoh));
export const inseln = () =>
  gemerkt('inseln', () => {
    const namen = new Set(inselnRoh.map((i) => i.name));
    return [...inselnRoh, ...INSELN_ZUSATZ.filter((i) => !namen.has(i.name))];
  });
// Täter von Völkermord und Diktatoren gehören nicht in ein Spiel
const OHNE_PERSONEN = /Hitler|Stalin|Himmler|Goebbels|Göring|Heydrich|Eichmann|Mengele|Pol Pot|Mussolini|Idi Amin|Bin Laden/i;
export const geburtsorte = () =>
  gemerkt('geburtsorte', () => verorten(geburtsorteRoh.filter((g) => !OHNE_PERSONEN.test(`${g.name} ${g.en}`))));
export const essen = () => gemerkt('essen', () => verorten(ESSEN));
export const allgemeinwissen = () => gemerkt('allgemeinwissen', () => verorten(ALLGEMEINWISSEN));
export const extrempunkte = (id) => extrempunkteRoh[id] ?? null;
export const kennzeichen = (nuts3) => kennzeichenRoh[nuts3] ?? null;

/**
 * Bild zu einem Schlüssel (q:<Wikidata-Kennung>, land:<ISO>, hauptstadt:<ISO>, region:<id>,
 * regionshauptstadt:<id>, kreis:<NUTS 3>, gipfel:<id>, essen:<id>) – { d: Datei auf Commons,
 * a: Urheber, l: Lizenz } oder undefined
 */
export const bild = (schluessel) => bilderRoh[schluessel] ?? undefined;

/** Deutscher Flussname (Natural Earth hat nur englische) */
export const flussname = (en) => flussnamenRoh[en] ?? en;

/**
 * Liegt ein Eintrag im Gebiet? Einträge haben land (bzw. laender) und in Deutschland nuts1.
 * knoten: Welt, Kontinent (mit kontinent.laender), Land (land) oder Bundesland (id = NUTS 1)
 */
export function imGebiet(knoten, eintrag) {
  const laender = eintrag.laender ?? [eintrag.land];
  if (knoten.ebene === 'welt') return true;
  if (knoten.ebene === 'kontinent') {
    // Orte nur in Russland: nach Lage zuordnen (westlich des Urals Europa, östlich Asien)
    if (laender.length === 1 && laender[0] === 'RU' && Number.isFinite(eintrag.lon) && ['europa', 'asien'].includes(knoten.id)) {
      return inEuropa(eintrag.lon, eintrag.lat) === (knoten.id === 'europa');
    }
    return laender.some((l) => knoten.kontinent.laender.includes(l));
  }
  if (knoten.ebene === 'land') return laender.includes(knoten.land);
  return eintrag.nuts1 === knoten.id;
}
