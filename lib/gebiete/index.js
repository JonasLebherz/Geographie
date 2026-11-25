/**
 * lib/gebiete/index.js – Gebietsbaum der Karten-Erkundung, Karten und Quiz-Sätze je Gebiet
 *
 *   Welt → Kontinent → Land → Region (nur Deutschland: Bundesland → Kreise)
 *
 * Jedes Gebiet (Knoten) hat:
 *  - eine Karte zum Weiterklicken (gebietDaten): die Untergebiete als Flächen
 *  - eine Liste von Quiz-Sätzen (saetze), sortiert nach Sinn: oben, was auf dieser Ebene
 *    am meisten Sinn ergibt (in Europa: Länder), weiter unten feinere Einheiten (Regionen).
 *    Jeder Satz hat eigene Spieldaten (satzDaten): Flächen oder Punkte (Städte).
 *
 * Alles wird beim Bauen berechnet (app/karte-daten/…) und als statische JSON-Datei ausgeliefert.
 * Kennungen der Knoten: 'welt', Kontinent-Slug ('europa'), Staats-Kürzel ('DE'), NUTS-Kennung ('DE2').
 */
import { geoArea, geoBounds, geoCentroid, geoContains, geoDistance } from 'd3-geo';
import { merge } from 'topojson-client';
import { KONTINENTE, bestenlistenName } from '@/lib/geodaten/kontinente';
import { deutscherName, englischerName, kennung } from '@/lib/geodaten/namen';
import {
  antarktis, autobahnen, deKreise, deLaender, gewaesser, regionenVon, staaten110, staaten50, staatenFarben, welt110Topologie,
} from './quellen';
import {
  allgemeinwissen, bild, essen, extrempunkte, flussname, geburtsorte, imGebiet, inseln, kennzeichen, sehenswuerdigkeiten, stadien, staedte, sucher,
} from './wissen';
import { KONTINENT_EXTREME } from './kuratiert';
import {
  BREITE, RANDZONE, einfaerben, randSeitlich, einpassen, flaecheZeichnen, gradnetz, landProjektion, linienZeichnen, mercator, nurImKontinent,
  polygone, projektionsDaten, punktZeichnen, runden1, weiter, zeichnen,
} from './zeichnen';

import { RUNDE_AUSWAHL, RUNDE_GROSS } from './runde';
import { inEuropa, russlandTeil, vereinigen } from './ural';

export { RUNDE_AUSWAHL, RUNDE_GROSS };

// ---------------------------------------------------------------------------------------
// Namen für Einheiten (Mehrzahl, deutsch und englisch)
// ---------------------------------------------------------------------------------------

/** Wie heißen die Regionen eines Landes? Nach dem häufigsten Typ in Natural Earth. */
const TYPEN = {
  State: ['Bundesstaaten', 'States'],
  Province: ['Provinzen', 'Provinces'],
  Region: ['Regionen', 'Regions'],
  County: ['Grafschaften', 'Counties'],
  Canton: ['Kantone', 'Cantons'],
  Department: ['Departements', 'Departments'],
  Oblast: ['Oblaste', 'Oblasts'],
  Prefecture: ['Präfekturen', 'Prefectures'],
  District: ['Distrikte', 'Districts'],
  Municipality: ['Gemeinden', 'Municipalities'],
  Governorate: ['Gouvernements', 'Governorates'],
  Emirate: ['Emirate', 'Emirates'],
  Parish: ['Parishes', 'Parishes'],
};
const BUNDESLAENDER = ['Bundesländer', 'States'];

function regionenWort(land, einheiten) {
  if (land === 'DE' || land === 'AT') return BUNDESLAENDER;
  const zaehler = new Map();
  for (const e of einheiten) zaehler.set(e.properties.typ, (zaehler.get(e.properties.typ) ?? 0) + 1);
  const [haeufigster] = [...zaehler].sort((a, b) => b[1] - a[1])[0] ?? [];
  return TYPEN[haeufigster] ?? ['Regionen', 'Regions'];
}

/**
 * Satz-Beschreibung: Titel in beiden Sprachen, Größe einer Runde, Gruppe in der Leiste.
 *  art:     'flaeche' | 'punkt' | 'linie' | 'distanz' (Klick irgendwohin, gewertet nach km)
 *  gruppe:  'quiz' (Grundlagen) | 'weitere' | 'distanz' („Am nächsten dran“)
 *  wieKarte: Die Einheiten sind genau die Flächen der Gebietskarte – keine eigene Datei nötig.
 *  datei:   Spieldaten eines anderen Satzes nutzen (Flaggen → laender.json)
 *  frage:   wie die Frage aussieht: Name (Standard), 'flagge', 'kennzeichen'
 *  stufen:  wählbare Größen (Städte: die 10, 50, 100 größten)
 *  kulisse: Gebietskarte als Hintergrund, die Einheiten darüber (Inseln)
 */
function satz(id, [titel, titelEn], anzahl, art, bestenliste, extra = {}) {
  return {
    id,
    titel,
    titelEn,
    art,
    anzahl,
    runde: anzahl > RUNDE_GROSS ? RUNDE_AUSWAHL : anzahl,
    bestenliste,
    gruppe: 'quiz',
    wieKarte: false,
    ...extra,
  };
}

// ---------------------------------------------------------------------------------------
// Gebietsbaum
// ---------------------------------------------------------------------------------------

/** URL-Teil aus einem Namen: „Baden-Württemberg“ → „baden-wuerttemberg“ */
export function slug(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

let baumMerker = null;

/**
 * Alle Knoten: Map Kennung → { id, ebene, name, en, slug, eltern, kinder: [Kennungen], ...Zusatz }
 * Länder sind nur dann ein eigenes Gebiet, wenn es dort etwas zu spielen gibt.
 */
export function baum() {
  if (baumMerker) return baumMerker;
  const knoten = new Map();
  const welt = { id: 'welt', ebene: 'welt', name: 'Welt', en: 'World', slug: '', eltern: null, kinder: [] };
  knoten.set('welt', welt);

  for (const k of KONTINENTE) {
    const kontinent = { id: k.slug, ebene: 'kontinent', name: k.name, en: k.en, slug: k.slug, eltern: 'welt', kinder: [], kontinent: k };
    knoten.set(k.slug, kontinent);
    welt.kinder.push(k.slug);
    for (const land of k.laender) {
      if (knoten.has(land)) continue; // Russland: Seite hängt an Europa (in Asien nur als Fläche)
      const regionen = regionenVon(land);
      const orte = staedte().filter((o) => o.land === land);
      if (regionen.length < 2 && orte.length < 3) continue; // z. B. Vatikanstadt: nichts zu spielen
      const name = deutscherName(land);
      knoten.set(land, { id: land, ebene: 'land', name, en: englischerName(land), slug: slug(name), eltern: k.slug, kinder: [], land });
      kontinent.kinder.push(land);
    }
  }

  // Deutschland: Bundesländer mit ihren Kreisen
  for (const l of deLaender()) {
    const { id, name, en } = l.properties;
    knoten.set(id, { id, ebene: 'region', name, en, slug: slug(name), eltern: 'DE', kinder: [], land: 'DE' });
    knoten.get('DE').kinder.push(id);
  }

  baumMerker = knoten;
  return knoten;
}

/** Pfad von der Welt bis zum Knoten: [{ id, slug, name, en }, …] */
export function ahnen(id) {
  const knoten = baum();
  const liste = [];
  for (let k = knoten.get(id); k; k = knoten.get(k.eltern)) liste.unshift({ id: k.id, slug: k.slug, name: k.name, en: k.en });
  return liste;
}

/** URL-Pfad eines Knotens, z. B. ['europa', 'deutschland', 'bayern'] */
export const urlPfad = (id) => ahnen(id).slice(1).map((a) => a.slug);

/** Knoten zu einem URL-Pfad */
export function knotenZuPfad(teile = []) {
  let aktuell = baum().get('welt');
  for (const teil of teile) {
    aktuell = aktuell.kinder.map((k) => baum().get(k)).find((k) => k.slug === teil);
    if (!aktuell) return null;
  }
  return aktuell;
}

// ---------------------------------------------------------------------------------------
// Einheiten je Knoten (was es dort zu spielen gibt)
// ---------------------------------------------------------------------------------------

const staatenVon = (knoten) =>
  knoten.ebene === 'welt' ? [...new Set(KONTINENTE.flatMap((k) => k.laender))] : knoten.ebene === 'kontinent' ? knoten.kontinent.laender : [];

/**
 * Fläche eines Staats in einem Kontinent: Russland nur mit seinem Teil (Europa bis zum Ural,
 * Asien ab dem Ural), alle anderen ganz. quelle: staaten50() oder staaten110()
 */
export function staatImKontinent(id, kontinent, quelle = staaten50()) {
  const f = quelle.get(id);
  if (id !== 'RU' || !f || !['europa', 'asien'].includes(kontinent)) return f;
  return gemerkt(`ru-${kontinent}-${quelle === staaten50() ? 50 : 110}`, () => russlandTeil(f, kontinent));
}

/** Städte im Gebiet (nach Einwohnern sortiert) */
function staedteVon(knoten, filter = () => true) {
  return staedte().filter((s) => imGebiet(knoten, s) && filter(s));
}

/** Die Bekanntesten zuerst, je Ebene höchstens so viele */
const BEKANNTESTE = { welt: 60, kontinent: 45, land: 40, region: 30 };
// Berge und Parks zählen auf Welt- und Kontinentebene weniger – sonst verdrängen sie die Bauwerke
const gewicht = (e) => e.links * (e.symbol === 'berg' || e.symbol === 'park' ? 0.4 : 1);

function bekannteste(knoten, liste) {
  const sortiert = [...liste].sort((a, b) => gewicht(b) - gewicht(a));
  if (knoten.ebene === 'land' || knoten.ebene === 'region') return sortiert.slice(0, BEKANNTESTE[knoten.ebene]);
  // Welt und Kontinente: reihum je Land das Bekannteste – sonst stammt alles aus wenigen Ländern
  const platz = new Map();
  return sortiert
    .map((e) => {
      const n = platz.get(e.land) ?? 0;
      platz.set(e.land, n + 1);
      return { e, n };
    })
    .sort((a, b) => a.n - b.n || gewicht(b.e) - gewicht(a.e))
    .slice(0, BEKANNTESTE[knoten.ebene])
    .map(({ e }) => e);
}

const sehenswuerdigkeitenVon = (knoten) =>
  gemerkt(`sehenswuerdigkeiten-${knoten.id}`, () => bekannteste(knoten, sehenswuerdigkeiten().filter((s) => imGebiet(knoten, s))));
const stadienVon = (knoten) =>
  gemerkt(`stadien-${knoten.id}`, () => bekannteste(knoten, stadien().filter((s) => imGebiet(knoten, s))));
const geburtsorteVon = (knoten) =>
  gemerkt(`geburtsorte-${knoten.id}`, () => bekannteste(knoten, geburtsorte().filter((s) => imGebiet(knoten, s))));
const essenVon = (knoten) => gemerkt(`essen-${knoten.id}`, () => essen().filter((s) => imGebiet(knoten, s)));
const allgemeinwissenVon = (knoten) => gemerkt(`allgemeinwissen-${knoten.id}`, () => allgemeinwissen().filter((s) => imGebiet(knoten, s)));

/** Fläche des Gebiets (zum Prüfen, was darin liegt) */
function gebietsform(knoten) {
  return gemerkt(`form-${knoten.id}`, () => {
    if (knoten.ebene === 'welt') return null;
    if (knoten.ebene === 'kontinent') {
      const gebiete = staaten50();
      return knoten.kontinent.laender.filter((id) => gebiete.has(id)).map((id) => staatImKontinent(id, knoten.id, gebiete));
    }
    if (knoten.ebene === 'land') return regionenVon(knoten.land);
    return deLaender().filter((l) => l.id === knoten.id);
  });
}

/**
 * Linien (Flüsse, Autobahnen) im Gebiet: Länge innerhalb der Karte in Pixeln.
 * Gezählt werden nur Abschnitte, deren beide Enden im Gebiet liegen.
 */
function linienImGebiet(knoten, features, mindestPixel) {
  const r = rahmen(knoten);
  const hoehe = r.hauptHoehe ?? r.hoehe;
  const form = gebietsform(knoten);
  const imForm = form ? sucher(form) : () => true;
  // Nur, was auf der Hauptkarte liegt (nicht in Nebenkarten wie Alaska)
  const drin = (punkt) => {
    const p = r.projektion(punkt);
    return p && p[0] >= 0 && p[0] <= r.breite && p[1] >= 0 && p[1] <= hoehe && imForm(punkt);
  };
  const gruppen = new Map();
  for (const f of features) {
    const linien = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let laenge = 0;
    for (const linie of linien) {
      let vorher = null;
      for (const punkt of linie) {
        const jetzt = drin(punkt) ? r.projektion(punkt) : null;
        if (jetzt && vorher) laenge += Math.hypot(jetzt[0] - vorher[0], jetzt[1] - vorher[1]);
        vorher = jetzt;
      }
    }
    if (!laenge) continue;
    const gruppe = gruppen.get(f.schluessel) ?? { schluessel: f.schluessel, features: [], laenge: 0 };
    gruppe.features.push(f);
    gruppe.laenge += laenge;
    gruppen.set(f.schluessel, gruppe);
  }
  return [...gruppen.values()].filter((g) => g.laenge >= mindestPixel).sort((a, b) => b.laenge - a.laenge);
}

/** Flüsse: so grob wie die Karte der Ebene (gleicher Rang wie die Orientierung), je Name eine Einheit */
const FLUSS_RANG = { welt: 3, kontinent: 5, land: 11, region: 12 };
const FLUSS_ANZAHL = { welt: 30, kontinent: 40, land: 30, region: 20 };
function fluesseVon(knoten) {
  return gemerkt(`fluesse-${knoten.id}`, () => {
    const features = gewaesser()
      .fluesse.filter((f) => f.properties.rang <= FLUSS_RANG[knoten.ebene] && f.properties.name)
      .map((f) => ({ ...f, schluessel: f.properties.name }));
    return linienImGebiet(knoten, features, 45)
      .slice(0, FLUSS_ANZAHL[knoten.ebene])
      .map((g, i) => ({ id: `f${i}`, name: g.features.find((f) => f.properties.de)?.properties.de ?? flussname(g.schluessel), en: g.schluessel, features: g.features, laenge: g.laenge }));
  });
}

/** Autobahnen: Nummer mit Kennbuchstaben des Landes (Natural Earth hat nur die Zahl) */
const AUTOBAHN_VORSATZ = {
  DE: 'A ', AT: 'A', CH: 'A', FR: 'A', IT: 'A', ES: 'A-', PT: 'A', NL: 'A', BE: 'A', PL: 'A', CZ: 'D', SK: 'D', HU: 'M', HR: 'A',
  SI: 'A', GB: 'M', IE: 'M', GR: 'A', US: 'I-',
};
function autobahnenVon(knoten) {
  return gemerkt(`autobahnen-${knoten.id}`, () => {
    const land = knoten.land;
    const vorsatz = AUTOBAHN_VORSATZ[land];
    if (!vorsatz || (knoten.ebene !== 'land' && knoten.ebene !== 'region')) return [];
    const features = autobahnen()
      .filter((f) => /^\d{1,3}$/.test(f.properties.nummer ?? ''))
      .map((f) => ({ ...f, schluessel: f.properties.nummer }));
    return linienImGebiet(knoten, features, knoten.ebene === 'land' ? 40 : 30)
      .slice(0, 40)
      .map((g) => {
        const name = `${vorsatz}${g.schluessel}`;
        return { id: `a${g.schluessel}`, name, en: name, features: g.features, laenge: g.laenge };
      });
  });
}

/**
 * Inseln: Wikidata-Inseln (Punkt und Fläche) werden den Teilflächen der Kartendaten zugeordnet –
 * in Deutschland den Kreisen (NUTS), in anderen Ländern den Regionen, darüber den Staaten.
 * Die Teilfläche muss die Insel enthalten und ungefähr so groß sein wie sie.
 */
const INSELN_ANZAHL = { welt: 40, kontinent: 50, land: 30, region: 20 };
function inselnVon(knoten) {
  return gemerkt(`inseln-${knoten.id}`, () => {
    const quelle =
      knoten.land === 'DE' || knoten.ebene === 'region'
        ? deKreise().filter((k) => knoten.ebene !== 'region' || k.properties.land === knoten.id)
        : knoten.ebene === 'land'
          ? regionenVon(knoten.land)
          : [...staaten50().values()];
    const teile = quelle.flatMap((f) =>
      polygone(f.geometry).map((p) => ({ geometrie: p, kasten: geoBounds(p), flaeche: geoArea(p) * 6371 ** 2, region: f.id })),
    );
    // Auf Kontinentebene zählen auch Inseln der Umgebung (Färöer, Isle of Man, Grönland …)
    const umgebung = new Set(knoten.kontinent?.umgebung ?? []);
    const kandidaten = inseln()
      .filter((i) => knoten.ebene === 'region' || imGebiet(knoten, i) || (knoten.ebene === 'kontinent' && i.laender.some((l) => umgebung.has(l))))
      .sort((a, b) => (b.flaeche ?? 0) - (a.flaeche ?? 0) || b.links - a.links);
    const vergeben = new Set();
    const ergebnis = [];
    for (const insel of kandidaten) {
      const p = [insel.lon, insel.lat];
      // Passende Teilflächen: Kasten enthält den Punkt, Größe stimmt ungefähr (Fläche unbekannt: bis 3.000 km²)
      const passend = teile.filter(({ kasten: [[w, s], [o, n]], flaeche }) => {
        if (p[0] < w - 0.05 || p[0] > o + 0.05 || p[1] < s - 0.05 || p[1] > n + 0.05 || !flaeche) return false;
        const verhaeltnis = insel.flaeche ? flaeche / insel.flaeche : flaeche < 3000 ? 1 : 0;
        return verhaeltnis > 0.3 && verhaeltnis < 3;
      });
      // Am liebsten die Fläche, in der der Punkt liegt – sonst (schmale Inseln wie Sylt) die nächste
      const teil =
        passend.find(({ geometrie }) => geoContains(geometrie, p)) ??
        passend.sort((a, b) => geoDistance(geoCentroid(a.geometrie), p) - geoDistance(geoCentroid(b.geometrie), p))[0];
      if (!teil || vergeben.has(teil)) continue;
      vergeben.add(teil);
      ergebnis.push({
        id: `i${ergebnis.length}`, name: insel.name, en: insel.en, feature: { type: 'Feature', geometry: teil.geometrie },
        zusatz: { bild: bild(`q:${insel.id}`) },
        region: knoten.ebene === 'land' ? teil.region : undefined, // Projektion der Nebenkarte (Kanaren, Hawaii …)
      });
      if (ergebnis.length >= INSELN_ANZAHL[knoten.ebene]) break;
    }
    return ergebnis;
  });
}

/** Kfz-Kennzeichen der Kreise (nur Deutschland) */
const kreiseMitKennzeichen = (knoten) =>
  knoten.land === 'DE' ? deKreise().filter((k) => (knoten.ebene === 'land' || k.properties.land === knoten.id) && kennzeichen(k.id)) : [];

/** Höchste Punkte der Untergebiete: Staaten bzw. Regionen */
function gipfelVon(knoten) {
  return gemerkt(`gipfel-${knoten.id}`, () => {
    const unter =
      knoten.ebene === 'land'
        ? regionenVon(knoten.land).map((r) => ({ id: r.id, name: r.properties.name, en: r.properties.en }))
        : staatenVon(knoten).map((id) => ({ id, name: deutscherName(id), en: englischerName(id) }));
    const gesehen = new Set();
    return unter
      .map((u) => ({ u, hoch: extrempunkte(u.id)?.hoch }))
      .filter(({ hoch }) => hoch && hoch.hoehe > 0 && !gesehen.has(hoch.name) && gesehen.add(hoch.name))
      .map(({ u, hoch }) => ({
        id: `g-${u.id}`, name: hoch.name, en: hoch.en, unter: hoehe(hoch.hoehe), unterEn: hoehe(hoch.hoehe, 'en'),
        loesung: u.name, loesungEn: u.en, lon: hoch.lon, lat: hoch.lat, bild: bild(`gipfel:${u.id}`),
      }));
  });
}

const hoehe = (m, sprache = 'de') => `${Math.round(m).toLocaleString(sprache === 'en' ? 'en-US' : 'de-DE')} m`;
const MEER = /ozean|meer\b|ocean|\bsea\b|golf|gulf|bucht|\bbay\b|see$/i;

/**
 * Rekorde des Gebiets („Am nächsten dran“): höchster und tiefster Punkt, größte Stadt,
 * bevölkerungsreichstes Untergebiet (Klick hinein zählt voll), geografischer Mittelpunkt.
 */
function rekordeVon(knoten) {
  return gemerkt(`rekorde-${knoten.id}`, () => {
    const liste = [];
    const ort = knoten.ebene === 'welt' || knoten.ebene === 'kontinent' ? KONTINENT_EXTREME[knoten.id] : null;
    const extrem = ort
      ? Object.fromEntries(Object.entries(ort).map(([k, [name, en, lon, lat, m]]) => [k, { name, en, lon, lat, hoehe: m }]))
      : { ...extrempunkte(knoten.ebene === 'land' ? knoten.land : knoten.id), ...KORREKTUR_TIEF[knoten.id] };
    const name = { name: knoten.name, en: knoten.en };
    if (extrem?.hoch) {
      liste.push({ id: 'hoch', name: 'Höchster Punkt', en: 'Highest point', loesung: `${extrem.hoch.name} · ${hoehe(extrem.hoch.hoehe)}`,
        loesungEn: `${extrem.hoch.en} · ${hoehe(extrem.hoch.hoehe, 'en')}`, lon: extrem.hoch.lon, lat: extrem.hoch.lat });
    }
    const tief = extrem?.tief;
    if (tief && (tief.hoehe < 0 || !MEER.test(`${tief.name} ${tief.en}`))) {
      liste.push({ id: 'tief', name: 'Tiefster Punkt', en: 'Lowest point', loesung: `${tief.name} · ${hoehe(tief.hoehe)}`,
        loesungEn: `${tief.en} · ${hoehe(tief.hoehe, 'en')}`, lon: tief.lon, lat: tief.lat });
    }
    const groesste = staedteVon(knoten)[0];
    if (groesste) {
      liste.push({ id: 'stadt', name: 'Größte Stadt', en: 'Largest city', loesung: groesste.name, loesungEn: groesste.en, lon: groesste.lon, lat: groesste.lat });
    }
    // Bevölkerungsreichstes Untergebiet: Staat bzw. Region
    const unter = knoten.ebene === 'land' ? regionenVon(knoten.land).map((r) => r.id) : knoten.ebene === 'region' ? [] : staatenVon(knoten);
    const reichstes = unter.map((id) => ({ id, ew: extrempunkte(id)?.ew ?? 0 })).sort((a, b) => b.ew - a.ew)[0];
    if (reichstes?.ew) {
      const feature = knoten.ebene === 'land' ? regionenVon(knoten.land).find((r) => r.id === reichstes.id) : staaten50().get(reichstes.id);
      const [lon, lat] = feature ? geoCentroid(feature) : [];
      const n = knoten.ebene === 'land' ? feature.properties : { name: deutscherName(reichstes.id), en: englischerName(reichstes.id) };
      if (Number.isFinite(lon)) {
        liste.push({
          id: 'einwohner', name: 'Meiste Einwohner', en: 'Most populous', loesung: `${n.name} · ${millionen(reichstes.ew)}`,
          loesungEn: `${n.en} · ${millionen(reichstes.ew, 'en')}`, lon, lat, flaeche: reichstes.id,
        });
      }
    }
    // Mittelpunkt: nur für Länder und Bundesländer (bei Kontinenten und der Welt ohne Sinn)
    if (knoten.ebene === 'land' || knoten.ebene === 'region') {
      const r = rahmen(knoten);
      const form = gebietsform(knoten).filter((f) => r.projektionVon(f.id) === r.projektion);
      const [lon, lat] = geoCentroid({ type: 'FeatureCollection', features: form });
      if (Number.isFinite(lon)) liste.push({ id: 'mitte', name: 'Geografischer Mittelpunkt', en: 'Geographic centre', loesung: name.name, loesungEn: name.en, lon, lat });
    }
    liste.push(...weitereRekorde(knoten));
    return liste;
  });
}

/** Untergebiete eines Knotens mit Fläche (km²) und Einwohnern (falls bekannt) */
function untergebiete(knoten) {
  const flaeche = (f) => geoArea(f) * 6371 ** 2;
  if (knoten.ebene === 'land') {
    return regionenVon(knoten.land).map((r) => ({ id: r.id, name: r.properties.name, en: r.properties.en, feature: r, km2: flaeche(r), ew: extrempunkte(r.id)?.ew }));
  }
  if (knoten.ebene === 'region') {
    return deKreise().filter((k) => k.properties.land === knoten.id).map((k) => ({ id: k.id, name: k.properties.name, en: k.properties.en, feature: k, km2: flaeche(k) }));
  }
  const gebiete = staaten50();
  return staatenVon(knoten)
    .filter((id) => gebiete.has(id))
    .map((id) => ({ id, name: deutscherName(id), en: englischerName(id), feature: gebiete.get(id), km2: flaeche(gebiete.get(id)), ew: extrempunkte(id)?.ew }));
}

/** Wie heißen die Untergebiete – mit passender Endung (das Land, die Region, der Kreis) */
function unterWort(knoten) {
  if (knoten.ebene === 'region') {
    return { gross: ['Größter Kreis', 'Largest district'], klein: ['Kleinster Kreis', 'Smallest district'], wenig: ['Kreis mit den wenigsten Einwohnern', 'Least populous district'] };
  }
  if (knoten.ebene === 'land') {
    const bundesland = knoten.land === 'DE' || knoten.land === 'AT';
    return bundesland
      ? { gross: ['Größtes Bundesland', 'Largest state'], klein: ['Kleinstes Bundesland', 'Smallest state'], wenig: ['Bundesland mit den wenigsten Einwohnern', 'Least populous state'], dicht: ['Am dichtesten besiedeltes Bundesland', 'Most densely populated state'], duenn: ['Am dünnsten besiedeltes Bundesland', 'Least densely populated state'] }
      : { gross: ['Größte Region', 'Largest region'], klein: ['Kleinste Region', 'Smallest region'], wenig: ['Region mit den wenigsten Einwohnern', 'Least populous region'], dicht: ['Am dichtesten besiedelte Region', 'Most densely populated region'], duenn: ['Am dünnsten besiedelte Region', 'Least densely populated region'] };
  }
  return { gross: ['Größtes Land', 'Largest country'], klein: ['Kleinstes Land', 'Smallest country'], wenig: ['Land mit den wenigsten Einwohnern', 'Least populous country'], dicht: ['Am dichtesten besiedeltes Land', 'Most densely populated country'], duenn: ['Am dünnsten besiedeltes Land', 'Least densely populated country'] };
}

const kmText = (km2, sprache = 'de') => `${Math.round(km2).toLocaleString(sprache === 'en' ? 'en-US' : 'de-DE')} km²`;
/** Radius eines Kreises gleicher Fläche: Klicks innerhalb zählen (fast) als Treffer */
const radiusVon = (km2) => Math.round(Math.sqrt(km2 / Math.PI) * 10) / 10;

/** Höchstens 60 Stützpunkte einer Linie (Länge, Breite) für die Entfernung zum Klick */
function linienPunkte(features) {
  const alle = features.flatMap((f) => (f.geometry.type === 'LineString' ? f.geometry.coordinates : f.geometry.coordinates.flat()));
  const schritt = Math.max(1, Math.ceil(alle.length / 60));
  return alle.filter((_, i) => i % schritt === 0).map(([lon, lat]) => [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100]);
}

/**
 * Weitere Rekorde: Flächen und Einwohner der Untergebiete, längster Fluss, größte Insel und
 * größter See, Berühmtestes (Sehenswürdigkeit, Verein, Person), längste Autobahn.
 * Ziele sind Punkte, Flächen (Klick hinein zählt voll, sonst Abstand zum Rand – genähert über
 * einen Kreis gleicher Fläche) oder Linien (Abstand zum nächsten Stützpunkt).
 */
function weitereRekorde(knoten) {
  const liste = [];
  const wort = unterWort(knoten);
  const unter = untergebiete(knoten).filter((u) => u.km2 > 0);
  const flaechenZiel = (u) => {
    const [lon, lat] = geoCentroid(u.feature);
    return { lon, lat, flaeche: u.id, radius: radiusVon(u.km2) };
  };
  if (unter.length >= 3) {
    const nachFlaeche = [...unter].sort((a, b) => b.km2 - a.km2);
    const gross = nachFlaeche[0];
    const klein = nachFlaeche.at(-1);
    liste.push({ id: 'groesste-flaeche', name: wort.gross[0], en: wort.gross[1], loesung: `${gross.name} · ${kmText(gross.km2)}`, loesungEn: `${gross.en} · ${kmText(gross.km2, 'en')}`, ...flaechenZiel(gross) });
    liste.push({ id: 'kleinste-flaeche', name: wort.klein[0], en: wort.klein[1], loesung: `${klein.name} · ${kmText(klein.km2)}`, loesungEn: `${klein.en} · ${kmText(klein.km2, 'en')}`, ...flaechenZiel(klein) });
    const mitEw = unter.filter((u) => u.ew > 0);
    if (mitEw.length >= 3 && wort.wenig) {
      const wenig = [...mitEw].sort((a, b) => a.ew - b.ew)[0];
      liste.push({ id: 'wenigste-einwohner', name: wort.wenig[0], en: wort.wenig[1], loesung: `${wenig.name} · ${millionen(wenig.ew)}`, loesungEn: `${wenig.en} · ${millionen(wenig.ew, 'en')}`, ...flaechenZiel(wenig) });
      const dichte = (u) => u.ew / u.km2;
      const nachDichte = [...mitEw].filter((u) => u.km2 > 50).sort((a, b) => dichte(b) - dichte(a));
      if (wort.dicht && nachDichte.length >= 3) {
        const d = nachDichte[0];
        const n = nachDichte.at(-1);
        const ewKm = (u, sp = 'de') => `${Math.round(dichte(u)).toLocaleString(sp === 'en' ? 'en-US' : 'de-DE')} ${sp === 'en' ? 'per km²' : 'je km²'}`;
        liste.push({ id: 'dichteste', name: wort.dicht[0], en: wort.dicht[1], loesung: `${d.name} · ${ewKm(d)}`, loesungEn: `${d.en} · ${ewKm(d, 'en')}`, ...flaechenZiel(d) });
        liste.push({ id: 'duennste', name: wort.duenn[0], en: wort.duenn[1], loesung: `${n.name} · ${ewKm(n)}`, loesungEn: `${n.en} · ${ewKm(n, 'en')}`, ...flaechenZiel(n) });
      }
    }
  }
  const fluss = fluesseVon(knoten)[0];
  if (fluss) {
    const punkte = linienPunkte(fluss.features);
    const mitte = punkte[Math.floor(punkte.length / 2)];
    liste.push({ id: 'laengster-fluss', name: 'Längster Fluss', en: 'Longest river', loesung: fluss.name, loesungEn: fluss.en, lon: mitte[0], lat: mitte[1], linie: punkte });
  }
  const autobahn = [...autobahnenVon(knoten)].sort((a, b) => b.laenge - a.laenge)[0];
  if (autobahn) {
    const punkte = linienPunkte(autobahn.features);
    const mitte = punkte[Math.floor(punkte.length / 2)];
    liste.push({ id: 'laengste-autobahn', name: 'Längste Autobahn', en: 'Longest motorway', loesung: autobahn.name, loesungEn: autobahn.en, lon: mitte[0], lat: mitte[1], linie: punkte });
  }
  const insel = inselnVon(knoten)[0];
  if (insel) {
    const [lon, lat] = geoCentroid(insel.feature);
    const km2 = geoArea(insel.feature) * 6371 ** 2;
    liste.push({ id: 'groesste-insel', name: 'Größte Insel', en: 'Largest island', loesung: insel.name, loesungEn: insel.en, lon, lat, radius: radiusVon(km2) });
  }
  const form = gebietsform(knoten);
  const imForm = form ? sucher(form) : () => true;
  const see = gewaesser()
    .seen.filter((f) => f.properties.name)
    .map((f) => ({ f, mitte: geoCentroid(f), km2: geoArea(f) * 6371 ** 2 }))
    .filter((x) => imForm(x.mitte))
    .sort((a, b) => b.km2 - a.km2)[0];
  if (see) {
    liste.push({ id: 'groesster-see', name: 'Größter See', en: 'Largest lake', loesung: see.f.properties.name, loesungEn: see.f.properties.en ?? see.f.properties.name, lon: see.mitte[0], lat: see.mitte[1], radius: radiusVon(see.km2) });
  }
  const beruehmt = (liste2) => [...liste2].sort((a, b) => b.links - a.links)[0];
  const sw = beruehmt(sehenswuerdigkeitenVon(knoten));
  if (sw) liste.push({ id: 'beruehmteste-sehenswuerdigkeit', name: 'Berühmteste Sehenswürdigkeit', en: 'Most famous landmark', loesung: sw.name, loesungEn: sw.en, lon: sw.lon, lat: sw.lat });
  const verein = beruehmt(stadienVon(knoten));
  if (verein) liste.push({ id: 'bekanntester-verein', name: 'Stadion des bekanntesten Fußballvereins', en: 'Stadium of the best-known football club', loesung: `${verein.name} · ${verein.stadion}`, loesungEn: `${verein.en} · ${verein.stadion}`, lon: verein.lon, lat: verein.lat });
  const person = beruehmt(geburtsorteVon(knoten));
  if (person) liste.push({ id: 'beruehmteste-person', name: 'Geburtsort der berühmtesten Person', en: 'Birthplace of the most famous person', loesung: `${person.name} · ${person.ort}`, loesungEn: `${person.en} · ${person.ortEn}`, lon: person.lon, lat: person.lat });
  return liste;
}

/** Wikidata kennt für Deutschland nur einen Ort nahe dem tiefsten Punkt (mit Ortshöhe) */
const KORREKTUR_TIEF = {
  DE: { tief: { name: 'Neuendorf-Sachsenbande', en: 'Neuendorf-Sachsenbande', lon: 9.333, lat: 53.963, hoehe: -3.39 } },
};
const millionen = (ew, sprache = 'de') =>
  ew >= 1e6
    ? `${(ew / 1e6).toLocaleString(sprache === 'en' ? 'en-US' : 'de-DE', { maximumFractionDigits: 1 })} ${sprache === 'en' ? 'million' : 'Mio.'}`
    : ew.toLocaleString(sprache === 'en' ? 'en-US' : 'de-DE');

/** Essen und Geburtsorte als Distanz-Einheiten */
const essenEinheiten = (knoten) =>
  essenVon(knoten).map((e) => ({ id: e.id, name: e.name, en: e.en, loesung: e.ort, loesungEn: e.ortEn ?? e.ort, lon: e.lon, lat: e.lat, bild: bild(`essen:${e.id}`) }));
// Ohne Beruf als Zusatz: Wikidata nennt je Person viele Berufe, der erste passt oft nicht (Einstein „Philosoph“)
const geburtsortEinheiten = (knoten) =>
  geburtsorteVon(knoten).map((g) => ({ id: g.id, name: g.name, en: g.en, loesung: g.ort, loesungEn: g.ortEn, lon: g.lon, lat: g.lat, bild: bild(`q:${g.id}`) }));

/** Städte-Quiz: wählbar die 10, 50 oder 100 größten */
const STUFEN = [10, 50, 100];
const DISTANZ_RUNDE = 10;

/** Alle Quiz-Sätze eines Knotens, in drei Gruppen und je Gruppe sortiert nach Sinn. */
export function saetze(knoten) {
  return gemerkt(`saetze-${knoten.id}`, () => saetzeBerechnen(knoten));
}

function saetzeBerechnen(knoten) {
  const liste = [];
  const dazu = (eintrag, mindestens = 3) => {
    if (eintrag.anzahl >= mindestens) liste.push(eintrag);
  };
  const schluessel = (satzId) => `${knoten.id}:${satzId}`;
  const weitere = { gruppe: 'weitere' };
  const distanz = (anzahl) => ({ gruppe: 'distanz', runde: Math.min(anzahl, DISTANZ_RUNDE) });
  const staedteSatz = () => {
    const anzahl = Math.min(staedteVon(knoten).length, STUFEN.at(-1));
    const stufen = STUFEN.filter((n) => n < anzahl);
    dazu(satz('staedte', ['Größte Städte', 'Largest cities'], anzahl, 'punkt', schluessel('staedte'), { stufen: [...stufen, anzahl] }), 5);
  };

  // --- Quizze ---
  if (knoten.ebene === 'welt' || knoten.ebene === 'kontinent') {
    const staaten = staatenVon(knoten);
    const laenderSchluessel = knoten.ebene === 'kontinent' ? bestenlistenName(knoten.id) : schluessel('laender');
    dazu(satz('laender', ['Länder', 'Countries'], staaten.length, 'flaeche', laenderSchluessel, { wieKarte: knoten.ebene === 'kontinent' }));
    dazu(satz('hauptstaedte', ['Hauptstädte', 'Capitals'], staedteVon(knoten, (o) => o.art === 'h').length, 'punkt', schluessel('hauptstaedte')));
    // Kontinente: die sechs mit Ländern und die Antarktis
    if (knoten.ebene === 'welt') dazu(satz('kontinente', ['Kontinente', 'Continents'], KONTINENTE.length + 1, 'flaeche', schluessel('kontinente'), { wieKarte: true }));
    staedteSatz();
    const regionen = staaten.reduce((n, land) => n + regionenVon(land).length, 0);
    dazu(satz('regionen', ['Bundesstaaten und Regionen', 'States and regions'], regionen, 'flaeche', schluessel('regionen')));
  }
  if (knoten.ebene === 'land') {
    const regionen = regionenVon(knoten.land);
    dazu(satz('regionen', regionenWort(knoten.land, regionen), regionen.length, 'flaeche', schluessel('regionen'), { wieKarte: true }), 2);
    const [wort, wortEn] = regionenWort(knoten.land, regionen);
    const hauptstaedte = knoten.land === 'DE' || knoten.land === 'AT'
      ? ['Landeshauptstädte', 'State capitals']
      : [`Hauptstädte der ${wort}`, `Capitals of ${wortEn.toLowerCase()}`];
    dazu(satz('regionshauptstaedte', hauptstaedte, staedteVon(knoten, (o) => o.art !== 'o').length, 'punkt', schluessel('regionshauptstaedte')));
    if (knoten.land === 'DE') dazu(satz('kreise', ['Landkreise und kreisfreie Städte', 'Districts'], deKreise().length, 'flaeche', schluessel('kreise')));
    staedteSatz();
  }
  if (knoten.ebene === 'region') {
    const kreise = deKreise().filter((k) => k.properties.land === knoten.id);
    dazu(satz('kreise', ['Landkreise und kreisfreie Städte', 'Districts'], kreise.length, 'flaeche', schluessel('kreise'), { wieKarte: true }), 2);
    staedteSatz();
  }

  // --- Weitere Quizze ---
  dazu(satz('fluesse', ['Flüsse', 'Rivers'], fluesseVon(knoten).length, 'linie', schluessel('fluesse'), weitere), 4);
  dazu(satz('sehenswuerdigkeiten', ['Sehenswürdigkeiten', 'Landmarks'], sehenswuerdigkeitenVon(knoten).length, 'punkt', schluessel('sehenswuerdigkeiten'), { ...weitere, bilder: 'frage' }), 4);
  dazu(satz('autobahnen', ['Autobahnen', 'Motorways'], autobahnenVon(knoten).length, 'linie', schluessel('autobahnen'), weitere), 5);
  dazu(satz('inseln', ['Inseln', 'Islands'], inselnVon(knoten).length, 'flaeche', schluessel('inseln'), { ...weitere, kulisse: true, bilder: 'joker' }), 4);
  if (knoten.ebene === 'welt' || knoten.ebene === 'kontinent') {
    dazu(satz('flaggen', ['Flaggen', 'Flags'], staatenVon(knoten).length, 'flaeche', schluessel('flaggen'), {
      ...weitere, frage: 'flagge', datei: knoten.ebene === 'kontinent' ? null : 'laender', wieKarte: knoten.ebene === 'kontinent',
    }));
  }
  dazu(satz('stadien', ['Fußballstadien', 'Football stadiums'], stadienVon(knoten).length, 'punkt', schluessel('stadien'), { ...weitere, bilder: 'frage' }), 4);
  const kz = kreiseMitKennzeichen(knoten).length;
  dazu(satz('kennzeichen', ['Autokennzeichen', 'Licence plates'], kz, 'flaeche', schluessel('kennzeichen'), {
    ...weitere, frage: 'kennzeichen', datei: knoten.ebene === 'land' ? 'kreise' : null, wieKarte: knoten.ebene === 'region',
  }));

  // --- Am nächsten dran ---
  const rekorde = rekordeVon(knoten).length;
  dazu(satz('rekorde', ['Rekorde', 'Records'], rekorde, 'distanz', schluessel('rekorde'), distanz(rekorde)));
  const gipfel = knoten.ebene === 'region' ? 0 : gipfelVon(knoten).length;
  dazu(satz('gipfel', ['Höchste Gipfel', 'Highest peaks'], gipfel, 'distanz', schluessel('gipfel'), { ...distanz(gipfel), bilder: 'frage' }), 4);
  const essenZahl = essenVon(knoten).length;
  dazu(satz('essen', ['Wo kommt das Essen her?', 'Where is the food from?'], essenZahl, 'distanz', schluessel('essen'), { ...distanz(essenZahl), bilder: 'frage' }), 4);
  const wissen = allgemeinwissenVon(knoten).length;
  dazu(satz('allgemeinwissen', ['Allgemeinwissen', 'General knowledge'], wissen, 'distanz', schluessel('allgemeinwissen'), distanz(wissen)), 5);
  const geburt = geburtsorteVon(knoten).length;
  dazu(satz('geburtsorte', ['Berühmte Geburtsorte', 'Famous birthplaces'], geburt, 'distanz', schluessel('geburtsorte'), { ...distanz(geburt), bilder: 'frage' }), 5);
  return liste;
}

// ---------------------------------------------------------------------------------------
// Karten
// ---------------------------------------------------------------------------------------

const merker = new Map();
function gemerkt(name, berechnen) {
  if (!merker.has(name)) merker.set(name, berechnen());
  return merker.get(name);
}

/**
 * Weltprojektion (Mercator) – für die Weltkarte und Quizze auf Weltebene.
 * Zugeschnitten auf 83° Nord bis 70° Süd (Nordspitze Grönlands bis zur Küste der Antarktis),
 * Mitte bei 10° Ost, damit die Beringstraße am Rand liegt.
 */
function weltRahmen() {
  return gemerkt('welt-rahmen', () => {
    const projektion = mercator(10);
    const ecken = { type: 'MultiPoint', coordinates: [[-169.99, 83], [189.99, 83], [-169.99, -70], [189.99, -70]] };
    const hoehe = einpassen(projektion, ecken, 0);
    projektion.clipExtent([[0, 0], [BREITE, hoehe]]);
    return { projektion, breite: BREITE, hoehe, nebenkarten: [], projektionVon: () => projektion };
  });
}

/** Kontinentprojektion: auf die gefragten Länder eingepasst (Ausnahmen in kontinente.js) */
function kontinentRahmen(knoten) {
  return gemerkt(`rahmen-${knoten.id}`, () => {
    const { mitte, laender, teile, einpassen: sonder = {}, punkte = {} } = knoten.kontinent;
    const gebiete = staaten50();
    const ohne = new Set(sonder.ohne ?? []);
    const objekt = {
      type: 'GeometryCollection',
      geometries: [
        ...laender.filter((id) => gebiete.has(id) && !ohne.has(id)).map((id) => nurImKontinent(gebiete.get(id).geometry, teile)),
        { type: 'MultiPoint', coordinates: [...Object.values(punkte), ...(sonder.punkte ?? [])] },
      ],
    };
    const projektion = mercator(mitte[0]);
    const hoehe = einpassen(projektion, objekt);
    projektion.clipExtent([[0, 0], [BREITE, hoehe]]);
    return { projektion, breite: BREITE, hoehe, nebenkarten: [], projektionVon: () => projektion };
  });
}

/** Land- bzw. Regionsprojektion: auf die Untereinheiten eingepasst, ferne Teile in Nebenkarten */
function landRahmen(knoten) {
  return gemerkt(`rahmen-${knoten.id}`, () => {
    const einheiten = knoten.ebene === 'land' ? regionenVon(knoten.land) : deKreise().filter((k) => k.properties.land === knoten.id);
    const lp = landProjektion(einheiten, { nebenkartenErlaubt: knoten.ebene === 'land' });
    return { projektion: lp.haupt, breite: BREITE, hoehe: lp.hoehe, hauptHoehe: lp.hauptHoehe, nebenkarten: lp.nebenkarten, projektionVon: lp.projektionVon };
  });
}

function rahmen(knoten) {
  if (knoten.ebene === 'welt') return weltRahmen();
  if (knoten.ebene === 'kontinent') return kontinentRahmen(knoten);
  return landRahmen(knoten);
}

/** Projektion mit Rand für Umgebung, Gradnetz und Gewässer (laufen über den Kartenrand hinaus) */
const weiterProjektion = (r) => weiter(r.projektion, r.hauptHoehe ?? r.hoehe);

/** Graue Umgebung: alles im Ausschnitt, was nicht zu den Einheiten gehört */
function umland(knoten, r, ausser) {
  // Umgebung etwas gröber als die Quiz-Flächen – sie ist nur Hintergrund
  const optionen = { stellen: 1, abstand: knoten.ebene === 'welt' ? 0.8 : 1.1 };
  const staaten = knoten.ebene === 'welt' ? staaten110() : staaten50();
  const projektion = weiterProjektion(r);
  const teile = [];
  for (const [id, gebiet] of staaten) {
    if (ausser.has(id)) {
      // Russland in Europa bzw. Asien: der andere Teil liegt grau daneben
      if (id === 'RU' && knoten.ebene === 'kontinent' && ['europa', 'asien'].includes(knoten.id)) {
        teile.push(zeichnen(projektion, staatImKontinent('RU', knoten.id === 'europa' ? 'asien' : 'europa', staaten110()), optionen)); // gröber: nur Hintergrund
      }
      continue;
    }
    teile.push(zeichnen(projektion, gebiet, optionen));
  }
  // In einem Bundesland: die anderen Bundesländer als Umgebung
  if (knoten.ebene === 'region') {
    for (const l of deLaender()) if (l.id !== knoten.id) teile.push(zeichnen(projektion, l, optionen));
  }
  return teile.join('');
}

/** Feinheit der Gewässer je Ebene. Rang = Natural-Earth-Maßstabsrang (0 = sehr groß). */
const FEINHEIT = {
  welt: { fluss: 2, see: 1, autobahn: -1 },
  kontinent: { fluss: 4, see: 2, autobahn: -1 },
  land: { fluss: 7, see: 6, autobahn: 99 },
  region: { fluss: 10, see: 7, autobahn: 99 },
};

/** Flüsse und Seen für die Karte (je Ebene passend fein) */
function gewaesserVon(knoten, r) {
  const fein = FEINHEIT[knoten.ebene];
  const projektion = weiterProjektion(r);
  const { fluesse, seen } = gewaesser();
  const sammeln = (features, grenze) => ({ type: 'FeatureCollection', features: features.filter((f) => f.properties.rang <= grenze) });
  return {
    fluesse: linienZeichnen(projektion, sammeln(fluesse, fein.fluss)),
    seen: zeichnen(projektion, sammeln(seen, fein.see), { stellen: 1, abstand: 0.8 }),
  };
}

/** Kopf einer Karte: Größe, Gradnetz, Umgebung, Orientierung, Nebenkarten, Kacheldaten */
function kartenKopf(knoten, ausser) {
  const r = rahmen(knoten);
  const hauptHoehe = r.hauptHoehe ?? r.hoehe;
  return {
    breite: r.breite,
    hoehe: r.hoehe,
    netz: gradnetz(weiterProjektion(r)),
    umland: umland(knoten, r, ausser),
    // Auf der Karte immer nur Flüsse und Seen – Wahrzeichen und Autobahnen gibt es als eigene Quizze
    ...gewaesserVon(knoten, r),
    nebenkarten: r.nebenkarten.map(({ x, y, b, h }) => ({ x, y, b, h })),
    // Für Satellitenkacheln: Hauptkarte (mit Rand, damit das Bild über die Kante läuft) und Nebenkarten
    projektionen: [
      projektionsDaten(r.projektion, [-randSeitlich(hauptHoehe), -RANDZONE, BREITE + randSeitlich(hauptHoehe), hauptHoehe + (r.nebenkarten.length ? 0 : RANDZONE)]),
      ...r.nebenkarten.map((n) => projektionsDaten(n.projektion, [n.x, n.y, n.x + n.b, n.y + n.h])),
    ],
  };
}

/**
 * Flächen-Einheiten zeichnen: [{ id, name, en, pfad, punkt, mitte }] – nicht sichtbare fallen weg.
 * Auf der Hauptkarte wird über den Rand hinaus gezeichnet (wie Umgebung und Flüsse).
 * staaten: Einheiten sind Staaten – sie bekommen ihre feste Farbe (staatenFarben).
 */
function flaechenZeichnen(r, einheiten, optionen, { staaten = false } = {}) {
  const weit = weiterProjektion(r);
  return einfaerben(
    einheiten
      .map((e) => {
        const projektion = r.projektionVon(e.region ?? e.id);
        return {
          id: e.id, name: e.name, en: e.en, ...e.zusatz,
          ...flaecheZeichnen(projektion, e.feature, { optionen, punkt: e.punkt, zeichenProjektion: projektion === r.projektion ? weit : projektion }),
        };
      })
      .filter((e) => e.pfad || e.punkt)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      .map(lupenSetzer(r)),
    staaten ? staatenFarben() : null,
  );
}

/**
 * Lupe für winzige Flächen (Kleinstaaten, kleine Inseln): kleiner Ring an der echten Stelle,
 * kurzer Strich, großer Kreis daneben mit der vergrößerten Form – dort lässt sich klicken.
 * Ordentlich und gleichmäßig (Wunsch): Jede Lupe hängt im selben kurzen Abstand an ihrem Land;
 * gewählt wird nur die Richtung (16 Richtungen) – möglichst über dem Meer (Mitte und 8 Randpunkte
 * gegen Länder 1:110 Mio.), bei Gleichstand nach unten rechts. Nur wenn im ersten Ring jede Richtung
 * eine andere Lupe überdecken würde, kommt ein zweiter, ebenso gleichmäßiger Ring.
 * Staaten ohne Fläche in den Daten (Vatikanstadt) bekommen eine Lupe mit Punkt.
 * Maße in Karteneinheiten (Kartenbreite 1000).
 */
const LUPE_RADIUS = 17;
const LUPE_RINGE = [46, 84];
const LUPE_WINKEL = Array.from({ length: 16 }, (_, i) => 45 + i * 22.5);

/** Liegt ein Punkt (Länge, Breite) auf Land? – grob, mit Vorauswahl über die Umrisskästen */
const landKaesten = () =>
  gemerkt('land-kaesten', () => [...staaten110().values()].map((f) => ({ f, k: geoBounds(f) })));
function aufLand(lon, lat) {
  for (const { f, k } of landKaesten()) {
    const [[w, s], [o, n]] = k;
    if (lat < s || lat > n) continue;
    if (w <= o ? lon < w || lon > o : lon < w && lon > o) continue;
    if (geoContains(f, [lon, lat])) return true;
  }
  return false;
}

function lupenSetzer(r) {
  const hoehe = r.hauptHoehe ?? r.hoehe;
  const belegt = [];
  const landAnteil = (x, y) => {
    let n = 0;
    const punkte = [[x, y], ...Array.from({ length: 8 }, (_, i) => [x + Math.cos((i * Math.PI) / 4) * LUPE_RADIUS, y + Math.sin((i * Math.PI) / 4) * LUPE_RADIUS])];
    for (const p of punkte) {
      const geo = r.projektion.invert?.(p);
      if (geo && aufLand(geo[0], geo[1])) n += 1;
    }
    return n;
  };
  return (e) => {
    if (!e.punkt) return e;
    // Mit Fläche nur, wenn sie winzig ist (sonst hat sie keinen Klickpunkt); ohne Fläche immer
    if (e.pfad && (!e.kasten || !e.mitte)) return e;
    const kasten = e.kasten ?? [e.punkt, e.punkt];
    const [[x0, y0], [x1, y1]] = kasten;
    const groesse = Math.max(x1 - x0, y1 - y0, 0.5);
    const mitte = [(x0 + x1) / 2, (y0 + y1) / 2];
    let bester = null;
    for (const abstand of LUPE_RINGE) {
      for (const [i, w] of LUPE_WINKEL.entries()) {
        const a = (w * Math.PI) / 180;
        const x = e.punkt[0] + Math.cos(a) * abstand;
        const y = e.punkt[1] + Math.sin(a) * abstand;
        const drin = x > LUPE_RADIUS && x < r.breite - LUPE_RADIUS && y > LUPE_RADIUS && y < hoehe - LUPE_RADIUS;
        if (!drin || belegt.some(([bx, by]) => Math.hypot(bx - x, by - y) < 2 * LUPE_RADIUS + 6)) continue;
        const wert = landAnteil(x, y) * 10 + i * 0.01; // Land meiden, sonst die erste Richtung (unten rechts)
        if (!bester || wert < bester.wert) bester = { x, y, wert };
      }
      if (bester) break; // im ersten freien Ring bleiben – gleich lange Striche
    }
    if (!bester) return e;
    belegt.push([bester.x, bester.y]);
    const k = e.pfad ? Math.min((LUPE_RADIUS * 1.35) / groesse, 40) : 0;
    return { ...e, lupe: { x: runden1(bester.x), y: runden1(bester.y), r: LUPE_RADIUS, k: runden1(k), m: mitte.map(runden1) } };
  };
}

/** Einheiten „Staaten“ eines Knotens (Welt oder Kontinent) */
function staatenEinheiten(knoten) {
  const gebiete = staaten50();
  const punkte = knoten.ebene === 'kontinent' ? knoten.kontinent.punkte ?? {} : Object.assign({}, ...KONTINENTE.map((k) => k.punkte ?? {}));
  const feature = (id) => (knoten.ebene === 'kontinent' ? staatImKontinent(id, knoten.id, gebiete) : gebiete.get(id));
  return staatenVon(knoten).map((id) => ({ id, name: deutscherName(id), en: englischerName(id), feature: feature(id), punkt: punkte[id], zusatz: { bild: landBild(id) } }));
}

/** Joker-Bild eines Landes: ein Foto des Landes, sonst seiner bekanntesten Sehenswürdigkeit */
function landBild(land) {
  return gemerkt(`landbild-${land}`, () => {
    const direkt = bild(`land:${land}`);
    if (direkt) return direkt;
    const beruehmt = sehenswuerdigkeiten().filter((s) => s.land === land && bild(`q:${s.id}`)).sort((a, b) => b.links - a.links)[0];
    return beruehmt ? bild(`q:${beruehmt.id}`) : undefined;
  });
}

/** Einheiten „Regionen“ eines Knotens */
function regionenEinheiten(knoten) {
  const laender = knoten.ebene === 'land' ? [knoten.land] : staatenVon(knoten);
  // Russland in Europa bzw. Asien: nur die Regionen auf der eigenen Seite des Urals
  const passt = (r) =>
    knoten.ebene !== 'kontinent' || r.properties.land !== 'RU' || !['europa', 'asien'].includes(knoten.id) ||
    inEuropa(...geoCentroid(r)) === (knoten.id === 'europa');
  return laender.flatMap((land) =>
    regionenVon(land).filter(passt).map((r) => ({ id: r.id, name: r.properties.name, en: r.properties.en, feature: r, zusatz: { bild: bild(`region:${r.id}`) } })),
  );
}

/**
 * Ein Kontinent als eine Fläche (Weltkarte, kleiner Umriss in der Quiz-Liste): seine Staaten
 * verschmolzen, Russland nur mit dem Teil, der zum Kontinent gehört (lib/gebiete/ural.js).
 */
function kontinentGeometrie(k, topo, mitUmgebung = true) {
  const ids = new Set([...k.laender, ...(mitUmgebung ? k.umgebung : [])]);
  const ohneRussland = merge(topo, topo.objects.countries.geometries.filter((g) => ids.has(kennung(g)) && kennung(g) !== 'RU'));
  const geometrie = ids.has('RU') ? vereinigen(ohneRussland, staatImKontinent('RU', k.slug, staaten110()).geometry) : ohneRussland;
  return nurImKontinent(geometrie, k.teile);
}

/**
 * Karte zum Weiterklicken: das Gebiet mit seinen Untergebieten als Flächen.
 * flaechen: [{ id, name, en, pfad, punkt, mitte, ziel }] – ziel = Kennung des Untergebiets
 * (null, wenn es dort nichts weiter gibt, z. B. Kreise).
 */
export function gebietDaten(id) {
  const knoten = baum().get(id);
  if (!knoten) return null;
  const r = rahmen(knoten);
  let flaechen;
  let ausser;

  if (knoten.ebene === 'welt') {
    // Kontinente als je eine Fläche (verschmolzen, ohne Ländergrenzen)
    const topo = welt110Topologie();
    ausser = new Set(KONTINENTE.flatMap((k) => [...k.laender, ...k.umgebung]));
    const optionen = { stellen: 1, abstand: 0.8 };
    flaechen = einfaerben([
      ...KONTINENTE.map((k) => {
        const f = { type: 'Feature', geometry: kontinentGeometrie(k, topo) };
        return { id: k.slug, name: k.name, en: k.en, ...flaecheZeichnen(r.projektion, f, { optionen, zeichenProjektion: weiterProjektion(r) }), punkt: null, ziel: k.slug };
      }),
      // Antarktis: auf der Weltkarte sichtbar und im Kontinente-Quiz, aber ohne eigene Karte
      { id: 'antarktis', name: 'Antarktis', en: 'Antarctica', ...flaecheZeichnen(r.projektion, antarktis(), { optionen }), punkt: null, ziel: null },
    ]);
  } else if (knoten.ebene === 'kontinent') {
    ausser = new Set(knoten.kontinent.laender);
    flaechen = flaechenZeichnen(r, staatenEinheiten(knoten), undefined, { staaten: true }).map((f) => ({ ...f, ziel: baum().has(f.id) ? f.id : null }));
  } else if (knoten.ebene === 'land') {
    ausser = new Set([knoten.land]);
    flaechen = flaechenZeichnen(r, regionenEinheiten(knoten)).map((f) => ({ ...f, ziel: baum().has(f.id) ? f.id : null }));
  } else {
    ausser = new Set(['DE']);
    flaechen = flaechenZeichnen(r, kreisEinheiten(knoten)).map((f) => ({ ...f, ziel: null }));
  }

  return {
    knoten: { id: knoten.id, ebene: knoten.ebene, name: knoten.name, en: knoten.en },
    ahnen: ahnen(id),
    kinder: knoten.kinder.map((k) => baum().get(k)).map((k) => ({ id: k.id, slug: k.slug, name: k.name, en: k.en })),
    saetze: saetze(knoten),
    karte: kartenKopf(knoten, ausser),
    flaechen,
  };
}

/**
 * Spieldaten eines Quiz-Satzes. Gleiche Projektion wie die Gebietskarte – beim Start
 * springt also nichts.
 *  art 'flaeche': einheiten = Flächen [{ id, name, en, pfad, punkt, mitte }], dazu ggf. eigene Umgebung
 *  art 'punkt':   einheiten = Orte [{ id, name, en, punkt, mitte, ew?, symbol? }]; Hintergrund: Gebietskarte
 *  art 'linie':   einheiten = Linien [{ id, name, en, pfad, mitte }] (Flüsse, Autobahnen)
 *  art 'distanz': einheiten = Ziele [{ id, name, en, unter?, loesung, lon, lat, punkt, flaeche? }], skala in km
 */
export function satzDaten(id, satzId) {
  const knoten = baum().get(id);
  const eintrag = knoten && saetze(knoten).find((s) => s.id === satzId);
  if (!eintrag || eintrag.datei || eintrag.wieKarte) return null;
  const r = rahmen(knoten);
  const projizieren = (lonLat, region) => {
    // Orte in Nebenkarten (z. B. Honolulu) mit der Projektion ihrer Nebenkarte
    const projektion = r.nebenkarten.length ? r.projektionVon(region ?? regionSucher(knoten)(lonLat)) : r.projektion;
    return punktZeichnen(projektion, lonLat, r.breite, r.hoehe);
  };
  const punkte = (liste, extra = () => ({})) =>
    liste
      .map((o) => {
        const p = projizieren([o.lon, o.lat], o.region);
        return p && { id: o.id, name: o.name, en: o.en, punkt: p, mitte: p, ...extra(o) };
      })
      .filter(Boolean);

  if (eintrag.art === 'punkt') {
    if (satzId === 'sehenswuerdigkeiten') return { art: 'punkt', einheiten: punkte(sehenswuerdigkeitenVon(knoten), (o) => ({ symbol: o.symbol, bild: bild(`q:${o.id}`) })) };
    if (satzId === 'stadien') return { art: 'punkt', einheiten: punkte(stadienVon(knoten), (o) => ({ symbol: 'stadion', bild: bild(`q:${o.id}`) })) };
    const filter = {
      hauptstaedte: (o) => o.art === 'h',
      regionshauptstaedte: (o) => o.art !== 'o',
      staedte: () => true,
    }[satzId];
    const liste = staedteVon(knoten, filter);
    // Städte: nach Größe sortiert, die Leiste wählt die 10, 50 oder 100 größten
    const bildVon = {
      hauptstaedte: (o) => bild(`hauptstadt:${o.land}`),
      regionshauptstaedte: (o) => bild(`regionshauptstadt:${o.nuts1 ?? o.region}`),
      staedte: () => undefined,
    }[satzId];
    return { art: 'punkt', einheiten: punkte(satzId === 'staedte' ? liste.slice(0, eintrag.anzahl) : liste, (o) => ({ ew: o.ew, bild: bildVon(o) })) };
  }

  if (eintrag.art === 'linie') {
    const liste = satzId === 'fluesse' ? fluesseVon(knoten) : autobahnenVon(knoten);
    const einheiten = liste.map((l) => {
      const sammlung = { type: 'FeatureCollection', features: l.features };
      return { id: l.id, name: l.name, en: l.en, pfad: linienZeichnen(r.projektion, sammlung), mitte: linienMitte(r, l.features) };
    });
    return { art: 'linie', einheiten, ohneFluesse: satzId === 'fluesse' };
  }

  if (eintrag.art === 'distanz') {
    const quelle = {
      rekorde: rekordeVon, gipfel: gipfelVon, essen: essenEinheiten, geburtsorte: geburtsortEinheiten,
      allgemeinwissen: (k) => allgemeinwissenVon(k).map(({ id, name, en, loesung, loesungEn, lon, lat }) => ({ id, name, en, loesung, loesungEn, lon, lat })),
    }[satzId](knoten);
    const einheiten = quelle
      .map((e) => {
        const p = projizieren([e.lon, e.lat]);
        return p && { ...e, lon: runden3(e.lon), lat: runden3(e.lat), punkt: p };
      })
      .filter(Boolean);
    // Maßstab der Wertung: ein Zehntel der Kartendiagonale (Welt ~2000 km, Deutschland ~100 km)
    const ecken = [r.projektion.invert([0, 0]), r.projektion.invert([r.breite, r.hauptHoehe ?? r.hoehe])];
    const skala = Math.round((geoDistance(...ecken) * 6371) / 10);
    return { art: 'distanz', einheiten, skala };
  }

  // Flächen
  const optionen = knoten.ebene === 'welt' && satzId === 'regionen' ? { stellen: 0, abstand: 1.2 } : undefined;
  if (satzId === 'laender') {
    const einheiten = flaechenZeichnen(r, staatenEinheiten(knoten), knoten.ebene === 'welt' ? { stellen: 1, abstand: 0.8 } : undefined, { staaten: true });
    const ausser = new Set(staatenVon(knoten));
    return { art: 'flaeche', einheiten, umland: knoten.ebene === 'welt' ? umland(knoten, r, ausser) : undefined };
  }
  if (satzId === 'regionen') {
    const einheiten = flaechenZeichnen(r, regionenEinheiten(knoten), optionen)
      // Auf Welt- und Kontinentebene nur Regionen, deren Mitte auf der Karte liegt (keine Außengebiete am Rand)
      .filter((e) => knoten.ebene === 'land' || (e.mitte && e.mitte[1] <= (r.hauptHoehe ?? r.hoehe)));
    return { art: 'flaeche', einheiten, umland: knoten.ebene === 'land' ? undefined : umlandOhneStaaten(knoten, r) };
  }
  if (satzId === 'kreise') {
    return { art: 'flaeche', einheiten: flaechenZeichnen(r, kreisEinheiten(knoten)) };
  }
  if (satzId === 'inseln') {
    return { art: 'flaeche', einheiten: flaechenZeichnen(r, inselnVon(knoten)), kulisse: true };
  }
  return null;
}

const runden3 = (wert) => Math.round(wert * 1000) / 1000;

/** In welcher Region liegt ein Punkt? (nur für Länder mit Nebenkarten) */
const regionSucher = (knoten) => gemerkt(`region-sucher-${knoten.id}`, () => sucher(regionenVon(knoten.land)));

/** Mitte einer Linie für den Aufdeck-Ring: der Stützpunkt, der dem Schwerpunkt am nächsten liegt */
function linienMitte(r, features) {
  const hoehe = r.hauptHoehe ?? r.hoehe;
  const punkte = features
    .flatMap((f) => (f.geometry.type === 'LineString' ? f.geometry.coordinates : f.geometry.coordinates.flat()))
    .map((p) => r.projektion(p))
    .filter((p) => p && p[0] >= 0 && p[0] <= r.breite && p[1] >= 0 && p[1] <= hoehe);
  if (!punkte.length) return null;
  const mx = punkte.reduce((n, p) => n + p[0], 0) / punkte.length;
  const my = punkte.reduce((n, p) => n + p[1], 0) / punkte.length;
  const naechster = punkte.reduce((best, p) => (Math.hypot(p[0] - mx, p[1] - my) < Math.hypot(best[0] - mx, best[1] - my) ? p : best));
  return naechster.map(runden1);
}

/** Kreise eines Knotens (Deutschland oder Bundesland) mit Kfz-Kennzeichen */
function kreisEinheiten(knoten) {
  const kreise = knoten.ebene === 'land' ? deKreise() : deKreise().filter((k) => k.properties.land === knoten.id);
  return kreise.map((k) => ({ id: k.id, name: k.properties.name, en: k.properties.en, feature: k, zusatz: { kz: kennzeichen(k.id), bild: bild(`kreis:${k.id}`) } }));
}

/** Umgebung ohne die Staaten des Knotens (deren Regionen werden selbst gezeichnet) */
function umlandOhneStaaten(knoten, r) {
  return umland(knoten, r, new Set(staatenVon(knoten)));
}

/** Alle Kennungen (für generateStaticParams) */
export function alleKnoten() {
  return [...baum().keys()];
}

/**
 * Alle Quizze aller Gebiete für die Quiz-Liste links (app/karte/QuizListe.js), in Kartenreihenfolge:
 * Welt, dann je Kontinent der Kontinent und seine Länder (Deutschland mit seinen Bundesländern).
 * Kurz gehalten: [{ id, name, en, ober: Name des übergeordneten Gebiets, saetze: [{ id, titel, titelEn, gruppe, … }] }]
 */
export function quizListe() {
  const knoten = baum();
  const liste = [];
  const dazu = (id) => {
    const k = knoten.get(id);
    const ober = k.eltern && k.eltern !== 'welt' ? knoten.get(k.eltern) : null;
    liste.push({
      id,
      ebene: k.ebene,
      name: k.name,
      en: k.en,
      land: k.land,
      eltern: k.eltern ?? undefined,
      ober: ober ? { name: ober.name, en: ober.en } : undefined,
      form: umrissKlein(k),
      saetze: saetze(k).map(({ bestenliste, wieKarte, datei, kulisse, runde, ...s }) => ({ ...s, runde, bestenliste })),
    });
    const kinder = [...k.kinder].sort((a, b) => knoten.get(a).name.localeCompare(knoten.get(b).name, 'de'));
    if (k.ebene !== 'welt') kinder.forEach(dazu);
  };
  dazu('welt');
  knoten.get('welt').kinder.forEach(dazu);
  return liste;
}

/** Kleiner Umriss (24 × 24) für die Quiz-Liste: Kontinente und Bundesländer (Länder haben Flaggen) */
function umrissKlein(k) {
  let form = null;
  if (k.ebene === 'kontinent') {
    const topo = welt110Topologie();
    form = { type: 'Feature', geometry: kontinentGeometrie(k.kontinent, topo, false) };
  } else if (k.ebene === 'region') {
    form = deLaender().find((l) => l.id === k.id);
  }
  if (!form) return undefined;
  const projektion = mercator(k.kontinent?.mitte[0] ?? 10).fitExtent([[1, 1], [23, 23]], form);
  return zeichnen(projektion, form, { stellen: 1, abstand: 0.6 });
}

/**
 * Kleine bunte Weltkarte für die Kachel „Weltkarte“ auf der Startseite: je Länderfarbe ein Pfad
 * (dieselben Farben wie in der Karte), Mercator von 83° N bis 56° S, 400 Einheiten breit.
 */
export function weltSkizze() {
  const staaten = [...staaten110().values()];
  const farben = staatenFarben();
  const projektion = mercator(10).scale(400 / (2 * Math.PI)).translate([200, 0]);
  const [, oben] = projektion([0, 83]);
  const [, unten] = projektion([0, -56]);
  projektion.translate([200, -oben]);
  const pfade = Array.from({ length: 6 }, (_, farbe) => ({
    farbe,
    d: zeichnen(projektion, { type: 'FeatureCollection', features: staaten.filter((s) => (farben.get(s.id) ?? 0) === farbe) }, { stellen: 0, abstand: 1 }),
  })).filter((p) => p.d);
  return { breite: 400, hoehe: Math.round(unten - oben), pfade };
}

/**
 * Weltkarte mit einzelnen Ländern für die Statistik (/statistik): je Land ein Pfad mit Kennung
 * und Namen, Mercator von 83° N bis 56° S, 1000 Einheiten breit. Dazu die Namen aller Gebiete
 * (für die Quiz-Tabelle) und zu welchem Land ein Gebiet gehört (Bundesländer → DE).
 */
export function statistikKarte() {
  const projektion = mercator(10).scale(1000 / (2 * Math.PI)).translate([500, 0]);
  const [, oben] = projektion([0, 83]);
  const [, unten] = projektion([0, -56]);
  projektion.translate([500, -oben]);
  const laender = [...staaten110().values()]
    .map((s) => ({ id: s.id, name: deutscherName(s.id), en: englischerName(s.id), d: zeichnen(projektion, s, { stellen: 0, abstand: 1.2 }) }))
    .filter((l) => l.d);
  const gebiete = {};
  for (const k of baum().values()) gebiete[k.id] = { name: k.name, en: k.en, ebene: k.ebene, land: k.land ?? null };
  return { breite: 1000, hoehe: Math.round(unten - oben), laender, gebiete };
}
