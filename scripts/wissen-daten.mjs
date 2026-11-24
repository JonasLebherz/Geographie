/**
 * scripts/wissen-daten.mjs – holt Städte, Sehenswürdigkeiten, Stadien, höchste/tiefste Punkte,
 * Inseln, berühmte Geburtsorte, Autokennzeichen und deutsche Flussnamen
 *
 * Aufruf: npm run wissen-daten   (nur nötig, wenn die Listen erneuert werden sollen)
 *
 * Quellen (alle frei nutzbar):
 *  - GeoNames „cities15000“ (CC BY 4.0): alle Städte ab 15.000 Einwohnern mit Einwohnerzahl
 *  - Wikidata (CC0) über query.wikidata.org: deutsche/englische Namen, Sehenswürdigkeiten,
 *    Fußballvereine der ersten Liga mit Stadion, höchster/tiefster Punkt je Staat und Region,
 *    Inseln, Geburtsorte bekannter Personen, Kfz-Kennzeichen der deutschen Kreise
 *  - Flaggen: Paket „flag-icons“ (MIT), nach public/flaggen/ kopiert
 * Bekanntheit = Zahl der Wikipedia-Sprachversionen (sitelinks) – danach wird ausgewählt.
 *
 * Ergebnis: daten/wissen/*.json (im Repository; beim Bauen gelesen).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { geoBounds, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import { KONTINENTE } from '../lib/geodaten/kontinente.js';

const QUELLEN = '.quellen';
const ZIEL = join('daten', 'wissen');
const KENNUNG = 'geo-quiz-datenaufbereitung/1.0 (Lernspiel; einmalige Abfrage)';
const STAATEN = new Set(KONTINENTE.flatMap((k) => k.laender));
const warten = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------------------------------

async function sparql(abfrage, versuch = 1) {
  const antwort = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { 'User-Agent': KENNUNG, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ query: abfrage }),
    signal: AbortSignal.timeout(90000), // Wikidata bricht selbst nach 60 s ab – hängt eine Antwort, nicht ewig warten
  }).catch((fehler) => ({ ok: false, status: fehler.name, text: async () => fehler.message }));
  if (!antwort.ok) {
    if (versuch < 4) {
      await warten(4000 * versuch);
      return sparql(abfrage, versuch + 1);
    }
    throw new Error(`Wikidata: HTTP ${antwort.status} – ${(await antwort.text()).slice(0, 300)}`);
  }
  // Bricht Wikidata mitten in der Antwort ab (Zeitlimit), ist das JSON kaputt – dann noch einmal
  let daten;
  try {
    daten = JSON.parse(await antwort.text());
  } catch (fehler) {
    if (versuch >= 4) throw fehler;
    await warten(4000 * versuch);
    return sparql(abfrage, versuch + 1);
  }
  return daten.results.bindings.map((zeile) => Object.fromEntries(Object.entries(zeile).map(([k, v]) => [k, v.value])));
}

/** „Point(13.4 52.5)“ → [13.4, 52.5] */
const koordinate = (text) => {
  const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(text ?? '');
  return m ? [Math.round(Number(m[1]) * 1000) / 1000, Math.round(Number(m[2]) * 1000) / 1000] : null;
};
const qid = (uri) => uri?.split('/').pop();
const labels = (variable) => `
  OPTIONAL { ?${variable} rdfs:label ?${variable}De FILTER(LANG(?${variable}De) = "de") }
  OPTIONAL { ?${variable} rdfs:label ?${variable}En FILTER(LANG(?${variable}En) = "en") }`;

function schreiben(name, daten) {
  const text = JSON.stringify(daten);
  writeFileSync(join(ZIEL, name), text);
  console.log(`${name}: ${Array.isArray(daten) ? daten.length : Object.keys(daten).length} Einträge, ${(text.length / 1024).toFixed(0)} KB`);
}

/** ISO-Alpha-2 aller Staaten (für die Zuordnung Wikidata-Land → Kürzel) */
async function landKuerzel() {
  const zeilen = await sparql('SELECT ?land ?code WHERE { ?land wdt:P297 ?code }');
  const karte = new Map(zeilen.map((z) => [qid(z.land), z.code]));
  karte.set('Q1246', 'XK'); // Kosovo
  karte.set('Q219060', 'PS'); // Palästina
  karte.set('Q865', 'TW'); // Taiwan
  return karte;
}

// ---------------------------------------------------------------------------------------
// 1. Städte (GeoNames) mit deutschen Namen (Wikidata über die GeoNames-Kennung)
// ---------------------------------------------------------------------------------------
async function staedte(regionen, deLaender, deKreise) {
  const zip = join(QUELLEN, 'cities15000.zip');
  if (!existsSync(zip)) {
    console.log('Lade GeoNames cities15000 …');
    const antwort = await fetch('https://download.geonames.org/export/dump/cities15000.zip', { headers: { 'User-Agent': KENNUNG } });
    if (!antwort.ok) throw new Error(`GeoNames: HTTP ${antwort.status}`);
    writeFileSync(zip, Buffer.from(await antwort.arrayBuffer()));
  }
  const text = execFileSync('unzip', ['-p', zip, 'cities15000.txt'], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
  const OHNE_ISO = { XK: 'XK' };
  let liste = text
    .split('\n')
    .filter(Boolean)
    .map((zeile) => zeile.split('\t'))
    .map((f) => ({
      gn: f[0], name: f[1], lat: Number(f[4]), lon: Number(f[5]), code: f[7], land: OHNE_ISO[f[8]] ?? f[8], ew: Number(f[14]),
    }))
    .filter((s) => STAATEN.has(s.land) && s.ew >= 15000 && !['PPLX', 'PPLH', 'PPLQ', 'PPLW'].includes(s.code));
  // Je Staat höchstens 150 Städte (die größten) – mehr braucht kein Quiz; Deutschland alle
  const proLand = new Map();
  liste.sort((a, b) => b.ew - a.ew);
  liste = liste.filter((s) => {
    const n = proLand.get(s.land) ?? 0;
    proLand.set(s.land, n + 1);
    return n < (s.land === 'DE' ? 2000 : 150); // Deutschland: alle (für die Städte-Quizze der Bundesländer)
  });

  // Deutsche und englische Namen
  const namen = new Map();
  for (let i = 0; i < liste.length; i += 400) {
    const teil = liste.slice(i, i + 400);
    const zeilen = await sparql(`SELECT ?gn ?ortDe ?ortEn ?links WHERE {
      VALUES ?gn { ${teil.map((s) => `"${s.gn}"`).join(' ')} }
      ?ort wdt:P1566 ?gn; wikibase:sitelinks ?links. ${labels('ort')} }`);
    // Manche Objekte (Krankenhäuser, Bahnhöfe …) tragen fälschlich die Kennung der Stadt –
    // bei mehreren Treffern gilt das bekannteste
    zeilen.sort((a, b) => Number(b.links) - Number(a.links));
    for (const z of zeilen) if (!namen.has(z.gn)) namen.set(z.gn, { de: z.ortDe, en: z.ortEn });
    process.stdout.write(`\rNamen ${Math.min(i + 400, liste.length)}/${liste.length}`);
  }
  console.log();

  const inRegion = sucher(regionen);
  const inLand = sucher(deLaender);
  const inKreis = sucher(deKreise);
  const art = { PPLC: 'h', PPLA: 'r' };
  const ergebnis = liste.map((s) => {
    const n = namen.get(s.gn) ?? {};
    const punkt = [s.lon, s.lat];
    const ort = {
      name: n.de ?? n.en ?? s.name,
      en: n.en ?? s.name,
      land: s.land,
      lon: Math.round(s.lon * 1000) / 1000,
      lat: Math.round(s.lat * 1000) / 1000,
      ew: s.ew,
      art: art[s.code] ?? 'o',
      region: inRegion(punkt),
    };
    if (s.land === 'DE') {
      ort.nuts1 = inLand(punkt);
      ort.nuts3 = inKreis(punkt);
    }
    return ort;
  });
  schreiben('staedte.json', ergebnis);
}

/** Findet die Fläche, in der ein Punkt liegt (mit Kasten-Vorprüfung) */
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

// ---------------------------------------------------------------------------------------
// 2. Sehenswürdigkeiten
// ---------------------------------------------------------------------------------------
// Wikidata-Klasse → Symbol. Abgefragt wird je Klasse einzeln (eine große Abfrage liefe ins Zeitlimit).
const KLASSEN = {
  Q23413: 'burg', Q57821: 'burg', Q1785071: 'burg', // Burg, Festung, Festung (Fort)
  Q16560: 'schloss', Q53536964: 'schloss', // Palast, Schloss
  Q2977: 'kirche', Q16970: 'kirche', Q44613: 'kirche', Q56242215: 'kirche', // Kathedrale, Kirche, Kloster, Basilika
  Q32815: 'moschee', Q44539: 'tempel', Q842402: 'tempel', // Moschee, Tempel, Hindutempel
  Q12518: 'turm', Q11303: 'turm', Q11166728: 'turm', // Turm, Hochhaus, Fernsehturm
  Q12280: 'bruecke', Q39715: 'leuchtturm', Q34038: 'wasserfall',
  Q4989906: 'denkmal', Q179700: 'statue', Q575759: 'denkmal', // Denkmal, Statue, Kriegsdenkmal
  Q839954: 'ruine', Q109607: 'ruine', Q54831: 'arena', Q12516: 'pyramide', // Ausgrabung, Ruine, Amphitheater, Pyramide
  Q33506: 'museum', Q24354: 'theater', Q153562: 'theater', // Museum, Theater, Opernhaus
  Q8502: 'berg', Q46169: 'park', // Berg, Nationalpark (Gebirge wie Eifel oder Harz sind keine Punkte)
};

async function sehenswuerdigkeiten(kuerzel) {
  const alle = new Map();
  for (const [klasse, symbol] of Object.entries(KLASSEN)) {
    const mindest = symbol === 'berg' || symbol === 'museum' || symbol === 'kirche' ? 30 : 18;
    const zeilen = await sparql(`SELECT ?item ?itemDe ?itemEn ?land ?koord ?links WHERE {
      ?item wdt:P31 wd:${klasse}; wikibase:sitelinks ?links. FILTER(?links >= ${mindest})
      ?item wdt:P17 ?land; wdt:P625 ?koord. ${labels('item')} }`);
    for (const z of zeilen) {
      const id = qid(z.item);
      const land = kuerzel.get(qid(z.land));
      const punkt = koordinate(z.koord);
      if (!land || !STAATEN.has(land) || !punkt || !(z.itemDe || z.itemEn)) continue;
      // Gedenkstätten an Verbrechen gehören nicht in ein Spiel
      if (/\bKZ\b|Konzentrationslager|concentration camp|Auschwitz|Gedenkstätte|memorial|genocide|Völkermord/i.test(`${z.itemDe} ${z.itemEn}`)) continue;
      const alt = alle.get(id);
      if (alt && alt.links >= Number(z.links)) continue;
      alle.set(id, { id, name: z.itemDe ?? z.itemEn, en: z.itemEn ?? z.itemDe, land, lon: punkt[0], lat: punkt[1], symbol, links: Number(z.links) });
    }
    process.stdout.write(`\rSehenswürdigkeiten: ${alle.size}`);
    await warten(800);
  }
  console.log();
  // Je Land eine Auswahl nach Bekanntheit; Anzahl wächst mit der Zahl der Kandidaten, Deutschland doppelt
  const nachLand = new Map();
  for (const s of alle.values()) {
    if (!nachLand.has(s.land)) nachLand.set(s.land, []);
    nachLand.get(s.land).push(s);
  }
  const auswahl = [];
  for (const [land, liste] of nachLand) {
    liste.sort((a, b) => b.links - a.links);
    const grund = Math.max(3, Math.min(20, Math.round(4 + 3 * Math.log2(liste.length))));
    auswahl.push(...liste.slice(0, land === 'DE' ? grund * 2 : grund));
  }
  schreiben('sehenswuerdigkeiten.json', auswahl);
}

// ---------------------------------------------------------------------------------------
// 3. Fußball: Vereine der ersten Liga je Land mit Stadion
// ---------------------------------------------------------------------------------------
async function stadien(kuerzel) {
  // Ligastufen sind in Wikidata lückenhaft (die Bundesliga hat keine). Deshalb: Fußballvereine
  // mit Heimstadion, je Land die bekanntesten – das entspricht praktisch der ersten Liga.
  // Frauenteams (Wettbewerbsklasse „women's …“) bleiben draußen, sonst stünde jedes Stadion doppelt.
  const zeilen = await sparql(`SELECT ?verein ?vereinDe ?vereinEn ?stadion ?stadionDe ?stadionEn ?koord ?land ?links WHERE {
    ?verein wdt:P31 wd:Q476028; wikibase:sitelinks ?links. FILTER(?links >= 12)
    ?verein wdt:P115 ?stadion; wdt:P17 ?land. ?stadion wdt:P625 ?koord.
    FILTER NOT EXISTS { ?verein wdt:P2094 ?klasse. ?klasse rdfs:label ?kl FILTER(LANG(?kl) = "en" && CONTAINS(LCASE(?kl), "women")) }
    ${labels('verein')} ${labels('stadion')} }`);
  const vereine = new Map();
  for (const z of zeilen) {
    const land = kuerzel.get(qid(z.land));
    const punkt = koordinate(z.koord);
    const id = qid(z.verein);
    if (!land || !STAATEN.has(land) || !punkt || vereine.has(id) || !(z.vereinDe || z.vereinEn)) continue;
    vereine.set(id, {
      id, name: z.vereinDe ?? z.vereinEn, en: z.vereinEn ?? z.vereinDe,
      stadion: z.stadionDe ?? z.stadionEn ?? '', land, lon: punkt[0], lat: punkt[1], links: Number(z.links),
    });
  }
  // Je Land die bekanntesten 18 (≈ eine erste Liga)
  const nachLand = new Map();
  for (const v of vereine.values()) {
    if (!nachLand.has(v.land)) nachLand.set(v.land, []);
    nachLand.get(v.land).push(v);
  }
  const auswahl = [...nachLand.values()].flatMap((liste) => liste.sort((a, b) => b.links - a.links).slice(0, 18));
  schreiben('stadien.json', auswahl);
}

// ---------------------------------------------------------------------------------------
// 4. Höchster und tiefster Punkt je Staat und Region
// ---------------------------------------------------------------------------------------
async function extrempunkte(kuerzel, regionen) {
  const punktAus = (z, art) => {
    const p = koordinate(z[`${art}K`]);
    return p && { name: z[`${art}De`] ?? z[`${art}En`], en: z[`${art}En`] ?? z[`${art}De`], lon: p[0], lat: p[1], hoehe: z[`${art}H`] ? Math.round(Number(z[`${art}H`])) : null };
  };
  const abfrage = (werte) => `SELECT ?gebiet ?ew ?hoch ?hochDe ?hochEn ?hochK ?hochH ?tief ?tiefDe ?tiefEn ?tiefK ?tiefH WHERE {
    VALUES ?gebiet { ${werte} }
    OPTIONAL { ?gebiet wdt:P1082 ?ew }
    OPTIONAL { ?gebiet wdt:P610 ?hoch. ?hoch wdt:P625 ?hochK. OPTIONAL { ?hoch wdt:P2044 ?hochH } ${labels('hoch')} }
    OPTIONAL { ?gebiet wdt:P1589 ?tief. ?tief wdt:P625 ?tiefK. OPTIONAL { ?tief wdt:P2044 ?tiefH } ${labels('tief')} } }`;
  const ergebnis = {};
  const eintragen = (schluessel, z) => {
    const e = ergebnis[schluessel] ?? {};
    if (!e.hoch && z.hochK) e.hoch = punktAus(z, 'hoch');
    if (!e.tief && z.tiefK) e.tief = punktAus(z, 'tief');
    if (z.ew) e.ew = Math.max(e.ew ?? 0, Math.round(Number(z.ew))); // Einwohner (für „meiste Einwohner“)
    ergebnis[schluessel] = e;
  };
  // Staaten
  const landIds = [...kuerzel].filter(([, code]) => STAATEN.has(code));
  for (let i = 0; i < landIds.length; i += 100) {
    const teil = landIds.slice(i, i + 100);
    const zuCode = new Map(teil);
    for (const z of await sparql(abfrage(teil.map(([q]) => `wd:${q}`).join(' ')))) eintragen(zuCode.get(qid(z.gebiet)), z);
  }
  // Regionen (Natural Earth kennt die Wikidata-Kennung) und deutsche Länder (über NUTS)
  const regionIds = regionen.filter((r) => r.properties.wikidata).map((r) => [r.properties.wikidata, r.properties.id]);
  for (let i = 0; i < regionIds.length; i += 200) {
    const teil = regionIds.slice(i, i + 200);
    const zuId = new Map(teil);
    for (const z of await sparql(abfrage(teil.map(([q]) => `wd:${q}`).join(' ')))) eintragen(zuId.get(qid(z.gebiet)), z);
    process.stdout.write(`\rRegionen ${Math.min(i + 200, regionIds.length)}/${regionIds.length}`);
  }
  console.log();
  const nuts = await sparql(`SELECT ?gebiet ?nuts WHERE { ?gebiet wdt:P605 ?nuts. FILTER(STRLEN(?nuts) = 3 && STRSTARTS(?nuts, "DE")) }`);
  const zuNuts = new Map(nuts.map((z) => [qid(z.gebiet), z.nuts]));
  for (const z of await sparql(abfrage([...zuNuts.keys()].map((q) => `wd:${q}`).join(' ')))) eintragen(zuNuts.get(qid(z.gebiet)), z);
  schreiben('extrempunkte.json', ergebnis);
}

// ---------------------------------------------------------------------------------------
// 5. Inseln, 6. Geburtsorte, 7. Kennzeichen, 8. Flussnamen
// ---------------------------------------------------------------------------------------
// Bekannte deutsche Inseln, die in Wikidata nicht als „Insel“ geführt sind (z. B. Fehmarn als Stadt)
// oder kleiner als 20 km² sind – hier über den deutschen Namen gesucht
const INSELN_ZUSATZ_DE = ['Fehmarn', 'Poel', 'Pellworm', 'Borkum', 'Langeoog', 'Juist', 'Norderney', 'Wangerooge',
  'Spiekeroog', 'Baltrum', 'Helgoland', 'Hiddensee', 'Reichenau', 'Herreninsel', 'Nordstrand', 'Ummanz'];

async function inseln(kuerzel) {
  // Fläche normalisiert (psn → Quadratmeter), damit Angaben in Hektar nicht durchrutschen
  const zeilen = await sparql(`SELECT ?item ?itemDe ?itemEn ?koord ?flaeche ?land ?links WHERE {
    { ?item wdt:P31 wd:Q23442 } UNION { ?item wdt:P31 ?art. ?art wdt:P279 wd:Q23442 }
    ?item wikibase:sitelinks ?links. FILTER(?links >= 12)
    ?item p:P2046/psn:P2046/wikibase:quantityAmount ?flaeche. FILTER(?flaeche >= 20000000)
    ?item wdt:P625 ?koord; wdt:P17 ?land.
    ${labels('item')} }`);
  const zusatz = await sparql(`SELECT ?item ?itemDe ?itemEn ?koord ?land ?links WHERE {
    VALUES ?name { ${INSELN_ZUSATZ_DE.map((n) => `"${n}"@de`).join(' ')} }
    ?item rdfs:label ?name; wdt:P17 wd:Q183; wdt:P625 ?koord; wikibase:sitelinks ?links.
    BIND(wd:Q183 AS ?land) ${labels('item')} }`);
  const alle = new Map();
  const zusatzNamen = new Set();
  for (const z of [...zeilen, ...zusatz.sort((a, b) => Number(b.links) - Number(a.links))]) {
    const land = kuerzel.get(qid(z.land));
    const p = koordinate(z.koord);
    const id = qid(z.item);
    if (!land || !STAATEN.has(land) || !p || !(z.itemDe || z.itemEn)) continue;
    const name = z.itemDe ?? z.itemEn;
    if (!z.flaeche) {
      // Zusatz: je Name nur der bekannteste Treffer (die Insel, nicht gleichnamige Schiffe o. Ä.)
      if (zusatzNamen.has(name)) continue;
      zusatzNamen.add(name);
    }
    const alt = alle.get(id);
    if (alt) {
      if (!alt.laender.includes(land)) alt.laender.push(land); // Usedom: Deutschland und Polen
      continue;
    }
    alle.set(id, {
      id, name, en: z.itemEn ?? z.itemDe, laender: [land], lon: p[0], lat: p[1],
      flaeche: z.flaeche ? Math.round(Number(z.flaeche) / 1e6) : null, links: Number(z.links),
    });
  }
  schreiben('inseln.json', [...alle.values()]);
}

// Berufsgruppen mit Mindest-Bekanntheit (Zahl der Wikipedia-Sprachversionen). Eine Abfrage über
// alle Menschen läuft bei Wikidata ins Zeitlimit – je Beruf einzeln geht es schnell.
const BERUFE = {
  // Reihenfolge = Vorrang: Wer mehrere Berufe hat, bekommt den ersten (Michael Jackson Sänger, nicht Komponist)
  Q82955: ['Politiker', 160], Q4964182: ['Philosoph', 90], Q169470: ['Physiker', 80], Q593644: ['Chemiker', 80],
  Q170790: ['Mathematiker', 80], Q11631: ['Raumfahrer', 60], Q11900058: ['Entdecker', 70], Q937857: ['Fußballspieler', 110],
  Q10833314: ['Tennisspieler', 90], Q10841764: ['Rennfahrer', 70], Q1028181: ['Maler', 80], Q177220: ['Sänger', 110],
  Q36834: ['Komponist', 80], Q2526255: ['Regisseur', 100], Q33999: ['Schauspieler', 120], Q42973: ['Architekt', 70],
  Q205375: ['Erfinder', 70], Q39631: ['Arzt', 80], Q131524: ['Unternehmer', 90], Q36180: ['Schriftsteller', 90],
  Q49757: ['Dichter', 90], Q1930187: ['Journalist', 110], Q901: ['Wissenschaftler', 90],
};

const GEBAEUDE = /hospital|klinik|krankenhaus|spital|medical|center|centre|geburtshaus|birthplace|birth house|manor|palace|palast|schloss|house\b|geburtshaus/i;

async function geburtsorte() {
  // Schritt 1: bekannte Menschen je Beruf (schnell dank runFirst – sonst plant Wikidata falsch herum)
  const personen = new Map();
  for (const [beruf, [name, mindest]] of Object.entries(BERUFE)) {
    try {
      const zeilen = await sparql(`SELECT ?person ?links WHERE { ?person wdt:P106 wd:${beruf}. hint:Prior hint:runFirst true.
        ?person wikibase:sitelinks ?links. FILTER(?links >= ${mindest}) }`);
      for (const z of zeilen) {
        const id = qid(z.person);
        if (!personen.has(id)) personen.set(id, { beruf: name, links: Number(z.links) });
      }
    } catch (fehler) {
      console.log(`\n${name}: übersprungen (${fehler.message.slice(0, 60)})`);
    }
    process.stdout.write(`\rPersonen: ${personen.size}`);
    await warten(500);
  }
  console.log();
  // Schritt 2: Geburtsort mit Koordinaten und Namen – in Päckchen
  const ids = [...personen.keys()];
  const alle = [];
  for (let i = 0; i < ids.length; i += 200) {
    const teil = ids.slice(i, i + 200);
    const zeilen = await sparql(`SELECT ?person ?personDe ?personEn ?ort ?ortDe ?ortEn ?koord ?oberDe ?oberEn WHERE {
      VALUES ?person { ${teil.map((id) => `wd:${id}`).join(' ')} }
      ?person wdt:P31 wd:Q5; wdt:P19 ?ort. ?ort wdt:P625 ?koord. ${labels('person')} ${labels('ort')}
      OPTIONAL { ?ort wdt:P131 ?ober. ${labels('ober')} } }`);
    const gesehen = new Set();
    for (const z of zeilen) {
      const id = qid(z.person);
      const p = koordinate(z.koord);
      if (gesehen.has(id) || !p || !(z.personDe || z.personEn) || !(z.ortDe || z.ortEn)) continue;
      gesehen.add(id);
      const { beruf, links } = personen.get(id);
      // Geboren in einem Krankenhaus, Geburtshaus o. Ä.: der Ort, in dem es liegt
      if (GEBAEUDE.test(`${z.ortDe} ${z.ortEn}`) && (z.oberDe || z.oberEn)) {
        z.ortDe = z.oberDe;
        z.ortEn = z.oberEn;
      }
      alle.push({
        id, name: z.personDe ?? z.personEn, en: z.personEn ?? z.personDe, ort: z.ortDe ?? z.ortEn, ortEn: z.ortEn ?? z.ortDe,
        beruf, lon: p[0], lat: p[1], links,
      });
    }
    process.stdout.write(`\rGeburtsorte ${Math.min(i + 200, ids.length)}/${ids.length}`);
  }
  console.log();
  schreiben('geburtsorte.json', alle.sort((a, b) => b.links - a.links));
}

async function kennzeichen() {
  const zeilen = await sparql(`SELECT ?nuts ?kz ?rang WHERE {
    ?kreis wdt:P605 ?nuts. FILTER(STRLEN(?nuts) = 5 && STRSTARTS(?nuts, "DE"))
    ?kreis p:P395 ?aussage. ?aussage ps:P395 ?kz; wikibase:rank ?rang.
    FILTER NOT EXISTS { ?aussage pq:P582 ?ende } }`);
  // Je Kreis das Hauptkennzeichen: bevorzugter Rang, sonst das kürzeste
  const ergebnis = {};
  const rangWert = (r) => (r.endsWith('PreferredRank') ? 0 : r.endsWith('NormalRank') ? 1 : 2);
  for (const z of zeilen.sort((a, b) => rangWert(a.rang) - rangWert(b.rang) || a.kz.length - b.kz.length)) {
    if (!ergebnis[z.nuts]) ergebnis[z.nuts] = z.kz.trim();
  }
  schreiben('kennzeichen.json', ergebnis);
}

async function flussnamen() {
  const fluesse = JSON.parse(readFileSync(join(QUELLEN, 'ne-rivers_lake_centerlines.geojson'), 'utf8')).features;
  const englisch = [...new Set(fluesse.map((f) => f.properties.name_en || f.properties.name).filter(Boolean))];
  const ergebnis = {};
  for (let i = 0; i < englisch.length; i += 150) {
    const teil = englisch.slice(i, i + 150);
    const zeilen = await sparql(`SELECT ?en ?de ?links WHERE {
      VALUES ?en { ${teil.map((n) => `"${n.replace(/"/g, '')}"@en`).join(' ')} }
      ?fluss rdfs:label ?en; wdt:P31 wd:Q4022; wikibase:sitelinks ?links.
      ?fluss rdfs:label ?de FILTER(LANG(?de) = "de") }`);
    // Bei gleichnamigen Flüssen den bekanntesten nehmen
    for (const z of zeilen.sort((a, b) => Number(b.links) - Number(a.links))) {
      const en = z.en;
      if (!ergebnis[en]) ergebnis[en] = z.de;
    }
    process.stdout.write(`\rFlussnamen ${Math.min(i + 150, englisch.length)}/${englisch.length}`);
  }
  console.log();
  schreiben('flussnamen.json', ergebnis);
}

/** Flaggen aus „flag-icons“ nach public/flaggen/ (nur unsere Staaten) */
function flaggen() {
  const ordner = join('node_modules', 'flag-icons', 'flags', '4x3');
  mkdirSync(join('public', 'flaggen'), { recursive: true });
  let n = 0;
  for (const code of STAATEN) {
    const datei = join(ordner, `${code.toLowerCase()}.svg`);
    if (existsSync(datei)) {
      copyFileSync(datei, join('public', 'flaggen', `${code.toLowerCase()}.svg`));
      n += 1;
    }
  }
  console.log(`Flaggen: ${n} von ${STAATEN.size}`);
}

// ---------------------------------------------------------------------------------------
mkdirSync(QUELLEN, { recursive: true });
mkdirSync(ZIEL, { recursive: true });
const nur = process.argv.slice(2);
const soll = (name) => nur.length === 0 || nur.includes(name);

const regionenTopo = JSON.parse(readFileSync('daten/regionen.topo.json', 'utf8'));
const regionen = feature(regionenTopo, regionenTopo.objects.regionen).features;
const deTopo = JSON.parse(readFileSync('daten/de.topo.json', 'utf8'));
const deLaender = feature(deTopo, deTopo.objects.laender).features;
const deKreise = feature(deTopo, deTopo.objects.kreise).features;

const kuerzel = await landKuerzel();
if (soll('flaggen')) flaggen();
if (soll('staedte')) await staedte(regionen, deLaender, deKreise);
if (soll('sehenswuerdigkeiten')) await sehenswuerdigkeiten(kuerzel);
if (soll('stadien')) await stadien(kuerzel);
if (soll('extrempunkte')) await extrempunkte(kuerzel, regionen);
if (soll('inseln')) await inseln(kuerzel);
if (soll('geburtsorte')) await geburtsorte();
if (soll('kennzeichen')) await kennzeichen();
if (soll('flussnamen')) await flussnamen();
