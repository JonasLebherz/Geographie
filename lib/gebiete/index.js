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
import { merge } from 'topojson-client';
import { KONTINENTE, bestenlistenName } from '@/lib/geodaten/kontinente';
import { deutscherName, englischerName, kennung } from '@/lib/geodaten/namen';
import {
  antarktis, autobahnen, deKreise, deLaender, gewaesser, orte, regionenVon, staaten110, staaten50, welt110Topologie,
} from './quellen';
import { WAHRZEICHEN } from './wahrzeichen';
import {
  BREITE, RANDZONE, einfaerben, randSeitlich, einpassen, flaecheZeichnen, gradnetz, landProjektion, linienZeichnen, mercator, nurImKontinent,
  projektionsDaten, punktZeichnen, weiter, zeichnen,
} from './zeichnen';

// Mehr Einheiten als das: Eine Runde besteht aus einer Zufallsauswahl
export const RUNDE_GROSS = 60;
export const RUNDE_AUSWAHL = 30;

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
 * Satz-Beschreibung: Titel in beiden Sprachen, Größe einer Runde.
 * wieKarte: Die Einheiten sind genau die Flächen der Gebietskarte – keine eigene Datei nötig.
 */
function satz(id, [titel, titelEn], anzahl, art, bestenliste, wieKarte = false) {
  return {
    id,
    titel,
    titelEn,
    art, // 'flaeche' | 'punkt'
    anzahl,
    runde: anzahl > RUNDE_GROSS ? RUNDE_AUSWAHL : anzahl,
    bestenliste,
    wieKarte,
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
      const regionen = regionenVon(land);
      const staedte = orte().filter((o) => o.land === land);
      if (regionen.length < 2 && staedte.length < 3) continue; // z. B. Vatikanstadt: nichts zu spielen
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
  knoten.ebene === 'welt' ? KONTINENTE.flatMap((k) => k.laender) : knoten.ebene === 'kontinent' ? knoten.kontinent.laender : [];

function orteVon(knoten, filter) {
  const alle = orte();
  if (knoten.ebene === 'welt') return alle.filter(filter);
  if (knoten.ebene === 'kontinent') {
    const staaten = new Set(knoten.kontinent.laender);
    return alle.filter((o) => staaten.has(o.land) && filter(o));
  }
  if (knoten.ebene === 'land') return alle.filter((o) => o.land === knoten.land && filter(o));
  return alle.filter((o) => o.nuts1 === knoten.id && filter(o)); // Bundesland
}

/** Alle Quiz-Sätze eines Knotens, sortiert nach Sinn. */
export function saetze(knoten) {
  const liste = [];
  const dazu = (eintrag, mindestens = 3) => {
    if (eintrag.anzahl >= mindestens) liste.push(eintrag);
  };
  const schluessel = (satzId) => `${knoten.id}:${satzId}`;

  if (knoten.ebene === 'welt' || knoten.ebene === 'kontinent') {
    const staaten = staatenVon(knoten);
    const laenderSchluessel = knoten.ebene === 'kontinent' ? bestenlistenName(knoten.id) : schluessel('laender');
    dazu(satz('laender', ['Länder', 'Countries'], staaten.length, 'flaeche', laenderSchluessel, knoten.ebene === 'kontinent'));
    dazu(satz('hauptstaedte', ['Hauptstädte', 'Capitals'], orteVon(knoten, (o) => o.art === 'h').length, 'punkt', schluessel('hauptstaedte')));
    // Kontinente: die sechs mit Ländern und die Antarktis
    if (knoten.ebene === 'welt') dazu(satz('kontinente', ['Kontinente', 'Continents'], KONTINENTE.length + 1, 'flaeche', schluessel('kontinente'), true));
    const grenze = knoten.ebene === 'welt' ? 5e6 : 1e6;
    dazu(satz('grossstaedte', ['Großstädte', 'Major cities'], orteVon(knoten, (o) => o.ew >= grenze).length, 'punkt', schluessel('grossstaedte')));
    const regionen = staaten.reduce((n, land) => n + regionenVon(land).length, 0);
    dazu(satz('regionen', ['Bundesstaaten und Regionen', 'States and regions'], regionen, 'flaeche', schluessel('regionen')));
  }

  if (knoten.ebene === 'land') {
    const regionen = regionenVon(knoten.land);
    dazu(satz('regionen', regionenWort(knoten.land, regionen), regionen.length, 'flaeche', schluessel('regionen'), true), 2);
    const [wort, wortEn] = regionenWort(knoten.land, regionen);
    const hauptstaedte = knoten.land === 'DE' || knoten.land === 'AT'
      ? ['Landeshauptstädte', 'State capitals']
      : [`Hauptstädte der ${wort}`, `Capitals of ${wortEn.toLowerCase()}`];
    dazu(satz('regionshauptstaedte', hauptstaedte, orteVon(knoten, (o) => o.art !== 'o').length, 'punkt', schluessel('regionshauptstaedte')));
    if (knoten.land === 'DE') dazu(satz('kreise', ['Landkreise und kreisfreie Städte', 'Districts'], deKreise().length, 'flaeche', schluessel('kreise')));
    dazu(satz('staedte', ['Städte', 'Cities'], orteVon(knoten, () => true).length, 'punkt', schluessel('staedte')));
  }

  if (knoten.ebene === 'region') {
    const kreise = deKreise().filter((k) => k.properties.land === knoten.id);
    dazu(satz('kreise', ['Landkreise und kreisfreie Städte', 'Districts'], kreise.length, 'flaeche', schluessel('kreise'), true), 2);
    dazu(satz('staedte', ['Städte', 'Cities'], orteVon(knoten, () => true).length, 'punkt', schluessel('staedte')));
  }
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
    if (ausser.has(id)) continue;
    teile.push(zeichnen(projektion, gebiet, optionen));
  }
  // In einem Bundesland: die anderen Bundesländer als Umgebung
  if (knoten.ebene === 'region') {
    for (const l of deLaender()) if (l.id !== knoten.id) teile.push(zeichnen(projektion, l, optionen));
  }
  return teile.join('');
}

/**
 * Orientierung: Flüsse, Seen, Autobahnen und Wahrzeichen – je Ebene nur so fein, dass es hilft.
 * Rang = Natural-Earth-Maßstabsrang (0 = sehr groß). Autobahnen erst ab Land.
 */
const FEINHEIT = {
  welt: { fluss: 2, see: 1, autobahn: -1 },
  kontinent: { fluss: 4, see: 2, autobahn: -1 },
  land: { fluss: 7, see: 6, autobahn: 99 },
  region: { fluss: 10, see: 7, autobahn: 99 },
};

function orientierung(knoten, r) {
  const fein = FEINHEIT[knoten.ebene];
  const projektion = weiterProjektion(r);
  const { fluesse, seen } = gewaesser();
  const sammeln = (features, grenze) => ({
    type: 'FeatureCollection',
    features: features.filter((f) => f.properties.rang <= grenze),
  });
  const wahrzeichen = WAHRZEICHEN.filter((w) => knoten.ebene !== 'welt' || w.welt)
    .map((w) => ({ id: w.id, name: w.name, en: w.en, symbol: w.symbol, punkt: punktZeichnen(r.projektion, [w.lon, w.lat], r.breite, r.hauptHoehe ?? r.hoehe) }))
    .filter((w) => w.punkt);
  return {
    fluesse: linienZeichnen(projektion, sammeln(fluesse, fein.fluss)),
    seen: zeichnen(projektion, sammeln(seen, fein.see), { stellen: 1, abstand: 0.8 }),
    autobahnen: fein.autobahn >= 0 ? linienZeichnen(r.projektion, sammeln(autobahnen(), fein.autobahn)) : '',
    wahrzeichen,
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
    ...orientierung(knoten, r),
    nebenkarten: r.nebenkarten.map(({ x, y, b, h }) => ({ x, y, b, h })),
    // Für Satellitenkacheln: Hauptkarte (mit Rand, damit das Bild über die Kante läuft) und Nebenkarten
    projektionen: [
      projektionsDaten(r.projektion, [-randSeitlich(hauptHoehe), -RANDZONE, BREITE + randSeitlich(hauptHoehe), hauptHoehe + (r.nebenkarten.length ? 0 : RANDZONE)]),
      ...r.nebenkarten.map((n) => projektionsDaten(n.projektion, [n.x, n.y, n.x + n.b, n.y + n.h])),
    ],
  };
}

/** Flächen-Einheiten zeichnen: [{ id, name, en, pfad, punkt, mitte }] – nicht sichtbare fallen weg */
function flaechenZeichnen(r, einheiten, optionen) {
  return einfaerben(
    einheiten
      .map((e) => ({ id: e.id, name: e.name, en: e.en, ...flaecheZeichnen(r.projektionVon(e.id), e.feature, { optionen, punkt: e.punkt }) }))
      .filter((e) => e.pfad || e.punkt)
      .sort((a, b) => a.name.localeCompare(b.name, 'de')),
  );
}

/** Einheiten „Staaten“ eines Knotens (Welt oder Kontinent) */
function staatenEinheiten(knoten) {
  const gebiete = staaten50();
  const punkte = knoten.ebene === 'kontinent' ? knoten.kontinent.punkte ?? {} : Object.assign({}, ...KONTINENTE.map((k) => k.punkte ?? {}));
  return staatenVon(knoten).map((id) => ({ id, name: deutscherName(id), en: englischerName(id), feature: gebiete.get(id), punkt: punkte[id] }));
}

/** Einheiten „Regionen“ eines Knotens */
function regionenEinheiten(knoten) {
  const laender = knoten.ebene === 'land' ? [knoten.land] : staatenVon(knoten);
  return laender.flatMap((land) =>
    regionenVon(land).map((r) => ({ id: r.id, name: r.properties.name, en: r.properties.en, feature: r })),
  );
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
        const ids = new Set([...k.laender, ...k.umgebung]);
        const geometrie = nurImKontinent(merge(topo, topo.objects.countries.geometries.filter((g) => ids.has(kennung(g)))), k.teile);
        const f = { type: 'Feature', geometry: geometrie };
        return { id: k.slug, name: k.name, en: k.en, ...flaecheZeichnen(r.projektion, f, { optionen }), punkt: null, ziel: k.slug };
      }),
      // Antarktis: auf der Weltkarte sichtbar und im Kontinente-Quiz, aber ohne eigene Karte
      { id: 'antarktis', name: 'Antarktis', en: 'Antarctica', ...flaecheZeichnen(r.projektion, antarktis(), { optionen }), punkt: null, ziel: null },
    ]);
  } else if (knoten.ebene === 'kontinent') {
    ausser = new Set(knoten.kontinent.laender);
    flaechen = flaechenZeichnen(r, staatenEinheiten(knoten)).map((f) => ({ ...f, ziel: baum().has(f.id) ? f.id : null }));
  } else if (knoten.ebene === 'land') {
    ausser = new Set([knoten.land]);
    flaechen = flaechenZeichnen(r, regionenEinheiten(knoten)).map((f) => ({ ...f, ziel: baum().has(f.id) ? f.id : null }));
  } else {
    ausser = new Set(['DE']);
    const kreise = deKreise().filter((k) => k.properties.land === knoten.id);
    flaechen = flaechenZeichnen(r, kreise.map((k) => ({ id: k.id, name: k.properties.name, en: k.properties.en, feature: k }))).map((f) => ({ ...f, ziel: null }));
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
 *  art 'punkt':   einheiten = Städte [{ id, name, en, punkt, mitte }]; als Hintergrund die Gebietskarte
 */
export function satzDaten(id, satzId) {
  const knoten = baum().get(id);
  const eintrag = knoten && saetze(knoten).find((s) => s.id === satzId);
  if (!eintrag) return null;
  const r = rahmen(knoten);

  if (eintrag.art === 'punkt') {
    const filter = {
      hauptstaedte: (o) => o.art === 'h',
      grossstaedte: (o) => o.ew >= (knoten.ebene === 'welt' ? 5e6 : 1e6),
      regionshauptstaedte: (o) => o.art !== 'o',
      staedte: () => true,
    }[satzId];
    const einheiten = orteVon(knoten, filter)
      .map((o) => {
        // Städte in Nebenkarten (z. B. Honolulu) mit der Projektion ihrer Nebenkarte
        const p = punktZeichnen(r.projektionVon(knoten.ebene === 'land' ? o.region : null), [o.lon, o.lat], r.breite, r.hoehe);
        return p && { id: o.id, name: o.name, en: o.en, punkt: p, mitte: p };
      })
      .filter(Boolean);
    return { art: 'punkt', einheiten };
  }

  // Flächen
  const optionen = knoten.ebene === 'welt' && satzId === 'regionen' ? { stellen: 0, abstand: 1.2 } : undefined;
  if (satzId === 'laender') {
    const einheiten = flaechenZeichnen(r, staatenEinheiten(knoten), knoten.ebene === 'welt' ? { stellen: 1, abstand: 0.8 } : undefined);
    const ausser = new Set(staatenVon(knoten));
    return { art: 'flaeche', einheiten, umland: knoten.ebene === 'welt' ? umland(knoten, r, ausser) : undefined };
  }
  if (satzId === 'kontinente') {
    return { art: 'flaeche', einheiten: gebietDaten(id).flaechen.map(({ ziel, ...f }) => f) };
  }
  if (satzId === 'regionen') {
    const einheiten = flaechenZeichnen(r, regionenEinheiten(knoten), optionen)
      // Auf Welt- und Kontinentebene nur Regionen, deren Mitte auf der Karte liegt (keine Außengebiete am Rand)
      .filter((e) => knoten.ebene === 'land' || (e.mitte && e.mitte[1] <= (r.hauptHoehe ?? r.hoehe)));
    return { art: 'flaeche', einheiten, umland: knoten.ebene === 'land' ? undefined : umlandOhneStaaten(knoten, r) };
  }
  if (satzId === 'kreise') {
    const kreise = knoten.ebene === 'land' ? deKreise() : deKreise().filter((k) => k.properties.land === knoten.id);
    const einheiten = flaechenZeichnen(r, kreise.map((k) => ({ id: k.id, name: k.properties.name, en: k.properties.en, feature: k })));
    return { art: 'flaeche', einheiten };
  }
  return null;
}

/** Umgebung ohne die Staaten des Knotens (deren Regionen werden selbst gezeichnet) */
function umlandOhneStaaten(knoten, r) {
  return umland(knoten, r, new Set(staatenVon(knoten)));
}

/** Alle Kennungen (für generateStaticParams) */
export function alleKnoten() {
  return [...baum().keys()];
}
