/**
 * scripts/karten-daten.mjs – bereitet die Geodaten für die Karten-Erkundung auf
 *
 * Aufruf: npm run karten-daten   (nur nötig, wenn sich Quellen oder Vereinfachung ändern)
 *
 * Lädt die Rohdaten nach .quellen/ (nicht im Repository, zusammen ca. 70 MB), vereinfacht sie
 * und schreibt kompakte Dateien nach daten/ (im Repository, werden beim Bauen gelesen):
 *
 *   daten/regionen.topo.json  Bundesländer, Bundesstaaten, Provinzen … aller Staaten
 *                             (Natural Earth 1:10 Mio., gemeinfrei)
 *   daten/de.topo.json        Deutschland: Länder (NUTS 1) und Kreise (NUTS 3), Stand 2024
 *                             (Eurostat GISCO über github.com/eurostat/Nuts2json,
 *                             © EuroGeographics bezüglich der Verwaltungsgrenzen)
 *   daten/orte.json           Städte (Natural Earth, gemeinfrei): Hauptstädte,
 *                             Hauptstädte der Regionen, Großstädte
 *
 * TopoJSON speichert gemeinsame Grenzen nur einmal – nach dem Vereinfachen passen
 * benachbarte Flächen deshalb weiter lückenlos aneinander.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { topology } from 'topojson-server';
import { presimplify, quantile, simplify } from 'topojson-simplify';
import { quantize } from 'topojson-client';
import { geoArea, geoBounds, geoContains } from 'd3-geo';
import { KONTINENTE } from '../lib/geodaten/kontinente.js';

const QUELLEN = '.quellen';
const ZIEL = 'daten';
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const NUTS = 'https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/v2/2024/4326/03M';
const DATEIEN = {
  'admin1.geojson': `${NE}/ne_10m_admin_1_states_provinces.geojson`,
  'orte.geojson': `${NE}/ne_10m_populated_places.geojson`,
  'nuts1.json': `${NUTS}/nutsrg_1.json`,
  'nuts3.json': `${NUTS}/nutsrg_3.json`,
};

// Alle Staaten, die im Quiz vorkommen (Kennungen wie in kontinente.js)
const STAATEN = new Set(KONTINENTE.flatMap((k) => k.laender));
// Natural Earth kennzeichnet einige Gebiete ohne ISO-Kürzel (iso_a2 = "-1") – Zuordnung über adm0_a3
const OHNE_ISO = { KOS: 'XK', CYN: 'CY', SOL: 'SO' };

async function laden(name) {
  const pfad = join(QUELLEN, name);
  if (!existsSync(pfad)) {
    console.log(`Lade ${name} …`);
    const antwort = await fetch(DATEIEN[name]);
    if (!antwort.ok) throw new Error(`${name}: HTTP ${antwort.status}`);
    writeFileSync(pfad, Buffer.from(await antwort.arrayBuffer()));
  }
  return JSON.parse(readFileSync(pfad, 'utf8'));
}

/**
 * Umlaufrichtung für d3: Außenringe im Uhrzeigersinn. GeoJSON nach RFC 7946 (NUTS) läuft andersherum –
 * d3 läse ein solches Polygon als „ganze Erde ohne diese Fläche“ (Fläche > halbe Kugel).
 */
function fuerD3(geometrie) {
  const drehen = (polygon) => {
    const flaeche = geoArea({ type: 'Polygon', coordinates: polygon });
    return flaeche > 2 * Math.PI ? polygon.map((ring) => [...ring].reverse()) : polygon;
  };
  if (geometrie.type === 'Polygon') return { ...geometrie, coordinates: drehen(geometrie.coordinates) };
  if (geometrie.type === 'MultiPolygon') return { ...geometrie, coordinates: geometrie.coordinates.map(drehen) };
  return geometrie;
}

/** Topologie bauen, vereinfachen (Anteil der Punkte, die bleiben) und quantisieren */
function kompakt(objekte, behalten, quantisierung = 1e5) {
  let topo = topology(objekte);
  topo = presimplify(topo);
  topo = simplify(topo, quantile(topo, behalten));
  // presimplify hebt die Quantisierung auf (Kommazahlen + Gewicht je Punkt). Neu quantisieren:
  // Punkte auf ein Raster von 1:100.000, als Differenz zum Vorgänger – kleine ganze Zahlen.
  topo.arcs = topo.arcs.map((bogen) => bogen.map(([x, y]) => [x, y]));
  topo = quantize(topo, quantisierung);
  return topo;
}

/** Kürzt Fließkommazahlen beim Schreiben (Längen/Breiten auf 3 Stellen ≈ 100 m) */
const kurz = (_, wert) => (typeof wert === 'number' && !Number.isInteger(wert) ? Math.round(wert * 1000) / 1000 : wert);

function schreiben(name, daten, runden = false) {
  // Nur Städte runden – die Skalierung einer Topologie (transform) braucht alle Stellen
  const text = JSON.stringify(daten, runden ? kurz : undefined);
  writeFileSync(join(ZIEL, name), text);
  console.log(`${name}: ${(text.length / 1024).toFixed(0)} KB`);
}

// ---------------------------------------------------------------------------------------
// 1. Regionen aller Staaten (Natural Earth admin-1)
// ---------------------------------------------------------------------------------------
async function regionen() {
  const roh = await laden('admin1.geojson');
  const features = [];
  for (const f of roh.features) {
    const p = f.properties;
    const land = p.iso_a2 !== '-1' ? p.iso_a2 : OHNE_ISO[p.adm0_a3];
    if (!STAATEN.has(land) || !f.geometry) continue;
    features.push({
      type: 'Feature',
      geometry: fuerD3(f.geometry),
      properties: {
        id: p.adm1_code,
        land,
        name: p.name_de || p.name || p.name_en || p.name_local || p.adm1_code,
        en: p.name_en || p.name || p.name_de || p.name_local || p.adm1_code,
        typ: p.type_en || '',
      },
    });
  }
  const topo = kompakt({ regionen: { type: 'FeatureCollection', features } }, 0.2);
  schreiben('regionen.topo.json', topo);
  return features;
}

// ---------------------------------------------------------------------------------------
// 2. Deutschland: Länder (NUTS 1) und Kreise (NUTS 3)
// ---------------------------------------------------------------------------------------
const LAENDER_EN = {
  'Baden-Württemberg': 'Baden-Württemberg', Bayern: 'Bavaria', Berlin: 'Berlin', Brandenburg: 'Brandenburg',
  Bremen: 'Bremen', Hamburg: 'Hamburg', Hessen: 'Hesse', 'Mecklenburg-Vorpommern': 'Mecklenburg-Western Pomerania',
  Niedersachsen: 'Lower Saxony', 'Nordrhein-Westfalen': 'North Rhine-Westphalia', 'Rheinland-Pfalz': 'Rhineland-Palatinate',
  Saarland: 'Saarland', Sachsen: 'Saxony', 'Sachsen-Anhalt': 'Saxony-Anhalt', 'Schleswig-Holstein': 'Schleswig-Holstein',
  Thüringen: 'Thuringia',
};

/**
 * Kreisnamen aus NUTS lesbar machen: „Kempten (Allgäu), Kreisfreie Stadt“ → „Kempten (Allgäu)“.
 * Heißen Stadt und umliegender Landkreis gleich (München, Kassel …), wird der Landkreis
 * „Landkreis München“ genannt – so bleibt jede Frage eindeutig.
 */
function kreisNamen(kreise) {
  const STADT = /,\s*(Kreisfreie Stadt|Stadtkreis|Stadt)$/;
  const grund = kreise.map((k) => {
    const stadt = STADT.test(k.na);
    return { ...k, stadt, basis: k.na.replace(STADT, '').replace(/,\s*Landkreis$/, '').trim() };
  });
  const staedte = new Set(grund.filter((k) => k.stadt).map((k) => k.basis));
  return grund.map((k) => {
    const doppelt = !k.stadt && staedte.has(k.basis);
    return {
      ...k,
      name: doppelt ? `Landkreis ${k.basis}` : k.basis,
      en: doppelt ? `${k.basis} (district)` : k.basis,
    };
  });
}

async function deutschland() {
  const n1 = (await laden('nuts1.json')).features.filter((f) => f.properties.id.startsWith('DE'));
  const n3roh = (await laden('nuts3.json')).features.filter((f) => f.properties.id.startsWith('DE'));
  const namen = new Map(kreisNamen(n3roh.map((f) => f.properties)).map((k) => [k.id, k]));
  const laender = n1.map((f) => ({
    type: 'Feature',
    geometry: fuerD3(f.geometry),
    properties: { id: f.properties.id, name: f.properties.na, en: LAENDER_EN[f.properties.na] ?? f.properties.na },
  }));
  const kreise = n3roh.map((f) => {
    const k = namen.get(f.properties.id);
    return {
      type: 'Feature',
      geometry: fuerD3(f.geometry),
      properties: { id: k.id, land: k.id.slice(0, 3), name: k.name, en: k.en, stadt: k.stadt },
    };
  });
  const topo = kompakt(
    { laender: { type: 'FeatureCollection', features: laender }, kreise: { type: 'FeatureCollection', features: kreise } },
    0.35,
  );
  schreiben('de.topo.json', topo);
  return { laender, kreise };
}

// ---------------------------------------------------------------------------------------
// 3. Städte
// ---------------------------------------------------------------------------------------

/** Findet die Fläche, in der ein Punkt liegt (mit Kasten-Vorprüfung, sonst dauert es Minuten) */
function sucher(features) {
  const liste = features.map((f) => ({ f, kasten: geoBounds(f) }));
  return (punkt) => {
    const [x, y] = punkt;
    for (const { f, kasten } of liste) {
      const [[w, s], [o, n]] = kasten;
      const imKasten = y >= s && y <= n && (w <= o ? x >= w && x <= o : x >= w || x <= o);
      if (imKasten && geoContains(f, punkt)) return f.properties.id;
    }
    return null;
  };
}

async function orte(regionenListe, de) {
  const roh = await laden('orte.geojson');
  const inRegion = sucher(regionenListe);
  const inLand = sucher(de.laender);
  const inKreis = sucher(de.kreise);
  const liste = [];
  for (const f of roh.features) {
    const p = f.properties;
    const land = p.ISO_A2 !== '-1' ? p.ISO_A2 : OHNE_ISO[p.ADM0_A3];
    if (!STAATEN.has(land)) continue;
    const art = p.FEATURECLA === 'Admin-0 capital' ? 'h' : p.FEATURECLA === 'Admin-1 capital' ? 'r' : 'o';
    const einwohner = p.POP_MAX ?? 0;
    // Hauptstädte immer, sonst nur Städte ab 50.000 Einwohnern
    if (art !== 'h' && einwohner < 50000) continue;
    const punkt = [p.LONGITUDE, p.LATITUDE];
    const ort = {
      name: p.NAME_DE || p.NAME,
      en: p.NAME_EN || p.NAME,
      land,
      lon: p.LONGITUDE,
      lat: p.LATITUDE,
      ew: einwohner,
      art,
      region: inRegion(punkt),
    };
    if (land === 'DE') {
      ort.nuts1 = inLand(punkt);
      ort.nuts3 = inKreis(punkt);
    }
    liste.push(ort);
  }
  liste.sort((a, b) => b.ew - a.ew);
  schreiben('orte.json', liste, true);
}

mkdirSync(QUELLEN, { recursive: true });
mkdirSync(ZIEL, { recursive: true });
const regionenListe = await regionen();
const de = await deutschland();
await orte(regionenListe, de);
